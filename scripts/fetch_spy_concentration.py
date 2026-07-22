"""Build concentration metrics from State Street's daily SPY holdings file.

The figures are deliberately labelled as shares of the S&P 500 proxy, rather
than shares of all US equities.  SPY publishes a daily holdings workbook, which
makes the basket and its weights independently auditable without a paid index
constituent feed.
"""
from __future__ import annotations

import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
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


def parse_holdings(payload: bytes):
    header = ticker_index = weight_index = market_value_index = None
    weights = {}
    market_values = {}
    as_of = None
    for row in xlsx_rows(payload):
        text = " | ".join(str(value) for value in row)
        if as_of is None:
            match = re.search(r"(?:As of|As Of)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)
            if match:
                as_of = match.group(1)
        normalized = [str(value).strip().lower() for value in row]
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


def basket(weights: dict[str, float], market_values: dict[str, float], symbols: set[str]):
    included = {symbol: round(weights[symbol], 4) for symbol in sorted(symbols & weights.keys())}
    missing = sorted(symbols - weights.keys())
    included_market_values = {symbol: market_values[symbol] for symbol in sorted(symbols & market_values.keys())}
    return {
        "share": round(sum(included.values()), 4),
        "holdings": included,
        "spyHoldingMarketValue": round(sum(included_market_values.values()), 2) if included_market_values else None,
        "notInSpy": missing,
    }


def main():
    request = Request(SPY_HOLDINGS_URL, headers={"User-Agent": "HY-Market10/1.0 research contact@example.com"})
    with urlopen(request, timeout=60) as response:
        weights, market_values, as_of = parse_holdings(response.read())
    now = datetime.now(timezone.utc)
    previous = {}
    if OUTPUT.exists():
        previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
    mag7 = basket(weights, market_values, MAG7)
    ai_hardware = basket(weights, market_values, AI_COMPUTE_HARDWARE)
    history = previous.get("history", [])
    today = now.strftime("%Y-%m-%d")
    # Compare with the latest prior trading-day snapshot rather than a second
    # run on the same calendar day.
    prior = next((item for item in reversed(history) if item.get("date") != today), {})
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
    history = [item for item in history if item.get("date") != today]
    history.append({
        "date": today,
        "mag7": mag7["share"],
        "aiHardware": ai_hardware["share"],
        "mag7SpyHoldingMarketValue": mag7["spyHoldingMarketValue"],
        "aiHardwareSpyHoldingMarketValue": ai_hardware["spyHoldingMarketValue"],
    })
    output = {
        "source": "State Street SPY daily fund holdings",
        "sourceUrl": SPY_HOLDINGS_URL,
        "methodology": "SPY daily fund-holdings weights, used as an S&P 500 proxy. The market-value change is the daily change in the basket's disclosed SPY holding market value, not a change in the total market capitalization of all listed shares. AI compute-hardware basket: chips, semiconductor equipment, EDA, servers, networking and physical infrastructure.",
        "updatedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "asOf": as_of or today,
        "metrics": {"mag7": mag7, "aiHardware": ai_hardware},
        "history": history[-400:],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated SPY concentration metrics as of {output['asOf']}: MAG7 {mag7['share']:.2f}%, AI compute hardware {ai_hardware['share']:.2f}%")


if __name__ == "__main__":
    main()
