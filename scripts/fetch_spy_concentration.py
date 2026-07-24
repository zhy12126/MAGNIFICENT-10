"""Build concentration metrics from State Street's daily SPY holdings file.

The figures are deliberately labelled as shares of the S&P 500 proxy, rather
than shares of all US equities.  SPY publishes a daily holdings workbook, which
makes the basket and its weights independently auditable without a paid index
constituent feed.
"""
from __future__ import annotations

import io
import json
import os
import re
import zipfile
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET


SPY_HOLDINGS_URL = (
    "https://www.ssga.com/us/en/individual/etfs/library-content/products/"
    "fund-data/etfs/us/holdings-daily-us-en-spy.xlsx"
)
OUTPUT = Path("outputs/data/concentration.json")

MAG7 = {"NVDA", "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "TSLA"}

# AI compute-hardware value chain. This is a transparent thematic basket, not
# an official benchmark index. Only symbols actually held by SPY are included,
# keeping the numerator comparable with the SPY (S&P 500 proxy) denominator.
AI_COMPUTE_HARDWARE = {
    # Chips
    "NVDA", "AMD", "AVGO", "MRVL", "MU", "INTC", "MPWR", "ADI", "TXN",
    # Semiconductor equipment
    "AMAT", "LRCX", "KLAC", "TER",
    # EDA
    "SNPS", "CDNS",
    # Servers
    "DELL", "HPE",
    # Networking
    "ANET", "CSCO",
    # Physical infrastructure
    "VRT", "ETN", "PH", "JCI", "TT",
}

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def column_index(reference: str) -> int:
    letters = "".join(char for char in reference if char.isalpha())
    result = 0
    for char in letters:
        result = result * 26 + ord(char.upper()) - 64
    return result - 1


def xlsx_rows(payload: bytes):
    """Small dependency-free reader for the simple SPY holdings workbook."""
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(item.itertext()) for item in root.findall(f"{NS}si")]
        sheet_names = sorted(name for name in archive.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", name))
        if not sheet_names:
            raise ValueError("SPY workbook contains no readable worksheet")
        root = ET.fromstring(archive.read(sheet_names[0]))
        for row in root.findall(f".//{NS}row"):
            cells = {}
            for cell in row.findall(f"{NS}c"):
                index = column_index(cell.get("r", "A1"))
                kind = cell.get("t")
                value_node = cell.find(f"{NS}v")
                if kind == "inlineStr":
                    value = "".join(cell.itertext())
                elif value_node is None:
                    value = ""
                else:
                    value = value_node.text or ""
                    if kind == "s":
                        value = shared[int(value)]
                cells[index] = value.strip() if isinstance(value, str) else value
            if cells:
                yield [cells.get(index, "") for index in range(max(cells) + 1)]


def parse_as_of_date(value: object) -> str | None:
    """Normalize workbook dates, including Excel's numeric serial format."""
    text = str(value).strip()
    for pattern in ("%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, pattern).strftime("%Y-%m-%d")
        except ValueError:
            pass
    try:
        serial = float(text)
        if 40_000 <= serial <= 60_000:
            return (datetime(1899, 12, 30) + timedelta(days=serial)).strftime("%Y-%m-%d")
    except ValueError:
        pass
    return None


def parse_holdings(payload: bytes):
    header = ticker_index = weight_index = market_value_index = None
    weights = {}
    market_values = {}
    as_of = None
    preamble_dates = []
    for row in xlsx_rows(payload):
        text = " | ".join(str(value) for value in row)
        if as_of is None:
            match = re.search(r"(?:As\s*of|As\s*Of)\s*(?:Date)?\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})", text)
            if match:
                as_of = parse_as_of_date(match.group(1))
            else:
                normalized_row = [str(value).strip().lower() for value in row]
                for index, label in enumerate(normalized_row):
                    if "as of" not in label and "as-of" not in label:
                        continue
                    for candidate in row[index + 1:]:
                        as_of = parse_as_of_date(candidate)
                        if as_of:
                            break
                    if as_of:
                        break
        normalized = [str(value).strip().lower() for value in row]
        # Some State Street workbook versions omit an "As of" label but put a
        # plain Excel date in the preamble above the holdings header.
        if header is None:
            preamble_dates.extend(parsed for parsed in (parse_as_of_date(value) for value in row) if parsed)
        if header is None and any(value == "ticker" for value in normalized):
            ticker_index = normalized.index("ticker")
            weight_candidates = [index for index, value in enumerate(normalized) if "weight" in value and "market" not in value]
            if not weight_candidates:
                continue
            weight_index = weight_candidates[-1]
            market_value_candidates = [index for index, value in enumerate(normalized) if "market value" in value]
            market_value_index = market_value_candidates[-1] if market_value_candidates else None
            header = True
            continue
        if header is None or ticker_index >= len(row) or weight_index >= len(row):
            continue
        ticker = str(row[ticker_index]).strip().upper()
        raw_weight = str(row[weight_index]).replace("%", "").replace(",", "").strip()
        if not re.fullmatch(r"[A-Z.\-]{1,8}", ticker):
            continue
        try:
            weight = float(raw_weight)
        except ValueError:
            continue
        weights[ticker] = weight
        if market_value_index is not None and market_value_index < len(row):
            raw_market_value = re.sub(r"[^0-9.\-]", "", str(row[market_value_index]))
            try:
                market_value = float(raw_market_value)
            except ValueError:
                market_value = None
            if market_value is not None and market_value >= 0:
                market_values[ticker] = market_value
    if not weights:
        raise ValueError("Could not find Ticker and Weight columns in SPY workbook")
    if as_of is None and preamble_dates:
        as_of = max(preamble_dates)
    # State Street normally exports percentage points (for example 7.63 for
    # a 7.63% holding).  Some spreadsheet exporters instead expose every
    # percentage as fractions, so decide once from the complete portfolio —
    # never per security.  Per-row conversion was inflating all sub-1% names
    # by 100x while leaving mega-cap holdings apparently correct.
    total_weight = sum(weights.values())
    if 0.95 <= total_weight <= 1.05:
        weights = {ticker: weight * 100 for ticker, weight in weights.items()}
    elif not 95 <= total_weight <= 105:
        raise ValueError(f"Unexpected SPY holding-weight total: {total_weight:.4f}")
    return weights, market_values, as_of


def http_last_modified_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, IndexError):
        return None


def basket(weights: dict[str, float], market_values: dict[str, float], symbols: set[str], spy_unit_price: float | None = None):
    included = {symbol: round(weights[symbol], 4) for symbol in sorted(symbols & weights.keys())}
    missing = sorted(symbols - weights.keys())
    included_market_values = {symbol: market_values[symbol] for symbol in sorted(symbols & market_values.keys())}
    return {
        "share": round(sum(included.values()), 4),
        "holdings": included,
        "spyHoldingMarketValue": round(sum(included_market_values.values()), 2) if included_market_values else None,
        # A per-SPY-share basket value avoids changes caused by ETF creations
        # and redemptions.  SPY's market price is a close public proxy for NAV.
        "spyBasketUnitValue": round(sum(included.values()) / 100 * spy_unit_price, 4) if spy_unit_price else None,
        "notInSpy": missing,
    }


def fetch_spy_unit_price() -> float | None:
    """Fetch SPY's end-of-day price when this script runs standalone."""
    api_key = os.environ.get("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        return None
    query = urlencode({"function": "GLOBAL_QUOTE", "symbol": "SPY", "apikey": api_key})
    request = Request(f"https://www.alphavantage.co/query?{query}")
    with urlopen(request, timeout=30) as response:
        quote = json.load(response).get("Global Quote", {})
    try:
        return float(quote.get("05. price"))
    except (TypeError, ValueError):
        return None


def main(spy_unit_price: float | None = None):
    request = Request(SPY_HOLDINGS_URL, headers={"User-Agent": "HY-Market10/1.0 research contact@example.com"})
    with urlopen(request, timeout=60) as response:
        workbook_last_modified = http_last_modified_date(response.headers.get("Last-Modified"))
        weights, market_values, as_of = parse_holdings(response.read())
    now = datetime.now(timezone.utc)
    previous = {}
    if OUTPUT.exists():
        previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
    if spy_unit_price is None:
        spy_unit_price = fetch_spy_unit_price()
    mag7 = basket(weights, market_values, MAG7, spy_unit_price)
    ai_hardware = basket(weights, market_values, AI_COMPUTE_HARDWARE, spy_unit_price)
    # Keep only the latest snapshot for each data date.  This also repairs
    # legacy files where the same date was written more than once.
    history_by_date = {}
    for item in previous.get("history", []):
        date = item.get("date")
        if date:
            history_by_date[str(date)] = item
    history = [history_by_date[date] for date in sorted(history_by_date)]
    run_date = now.strftime("%Y-%m-%d")
    # The State Street workbook can still show the prior US trading day when
    # this job runs in Asia.  Never turn that same file into a new daily point.
    snapshot_date = as_of or workbook_last_modified or run_date
    if as_of is None and workbook_last_modified is None:
        print(f"Warning: SPY workbook as-of date and Last-Modified header were unreadable; using run date {run_date}.")
    elif as_of is None:
        print(f"Info: SPY workbook as-of date came from HTTP Last-Modified: {snapshot_date}.")
    # Compare with the latest prior trading-day snapshot rather than a second
    # run on the same calendar day.
    prior_candidates = [item for item in history if str(item.get("date", "")) < snapshot_date]
    prior = max(prior_candidates, key=lambda item: item["date"], default={})
    for key, metric in (("mag7", mag7), ("aiHardware", ai_hardware)):
        old_share = prior.get(key)
        metric["dailyChangePp"] = None if old_share is None else round(metric["share"] - float(old_share), 4)
        old_market_value = prior.get(f"{key}SpyHoldingMarketValue")
        current_market_value = metric["spyHoldingMarketValue"]
        metric["dailyMarketValueChangePct"] = (
            None
            if not current_market_value or not old_market_value
            else round((current_market_value / float(old_market_value) - 1) * 100, 4)
        )
        old_unit_value = prior.get(f"{key}SpyBasketUnitValue")
        current_unit_value = metric["spyBasketUnitValue"]
        metric["dailyBasketUnitValueChangePct"] = (
            None
            if not current_unit_value or not old_unit_value
            else round((current_unit_value / float(old_unit_value) - 1) * 100, 4)
        )
    history = [item for item in history if item.get("date") != snapshot_date]
    history.append({
        "date": snapshot_date,
        "mag7": mag7["share"],
        "aiHardware": ai_hardware["share"],
        "mag7SpyHoldingMarketValue": mag7["spyHoldingMarketValue"],
        "aiHardwareSpyHoldingMarketValue": ai_hardware["spyHoldingMarketValue"],
        "mag7SpyBasketUnitValue": mag7["spyBasketUnitValue"],
        "aiHardwareSpyBasketUnitValue": ai_hardware["spyBasketUnitValue"],
    })
    output = {
        "source": "State Street SPY daily fund holdings",
        "sourceUrl": SPY_HOLDINGS_URL,
        "methodology": "SPY daily fund-holdings weights, used as an S&P 500 proxy. Basket unit value equals basket weight times SPY's end-of-day market price per share, which avoids changes caused by SPY fund creations and redemptions. It is not the total market capitalization of all listed shares. AI compute-hardware basket: chips, semiconductor equipment, EDA, servers, networking and physical infrastructure.",
        "updatedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "asOf": snapshot_date,
        "spyUnitPrice": spy_unit_price,
        "metrics": {"mag7": mag7, "aiHardware": ai_hardware},
        "history": history[-400:],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    unit_value_message = f"SPY per-share price ${spy_unit_price:.2f}" if spy_unit_price else "SPY per-share value unavailable (set ALPHA_VANTAGE_API_KEY)"
    print(f"Updated SPY concentration metrics as of {output['asOf']}: MAG7 {mag7['share']:.2f}%, AI compute hardware {ai_hardware['share']:.2f}%; {unit_value_message}")


if __name__ == "__main__":
    main()
