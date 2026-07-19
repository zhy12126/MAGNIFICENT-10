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

# US semiconductor value chain.  The calculation only includes symbols which
# actually appear in SPY's published daily holdings; this keeps the numerator
# consistent with the S&P 500 denominator.  SNDK is retained for when it is an
# eligible constituent, while TSM is intentionally excluded (a Taiwan issuer).
SEMICONDUCTOR_VALUE_CHAIN = {
    "NVDA", "AVGO", "AMD", "QCOM", "TXN", "AMAT", "LRCX", "KLAC", "ADI",
    "MU", "MCHP", "MRVL", "ON", "MPWR", "TER", "WDC", "SNDK", "SWKS",
    "NXPI", "ENTG", "COHR", "CRDO", "RMBS", "INTC",
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


def parse_weights(payload: bytes):
    header = ticker_index = weight_index = None
    weights = {}
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
    return weights, as_of


def basket(weights: dict[str, float], symbols: set[str]):
    included = {symbol: round(weights[symbol], 4) for symbol in sorted(symbols & weights.keys())}
    missing = sorted(symbols - weights.keys())
    return {"share": round(sum(included.values()), 4), "holdings": included, "notInSpy": missing}


def main():
    request = Request(SPY_HOLDINGS_URL, headers={"User-Agent": "HY-Market10/1.0 research contact@example.com"})
    with urlopen(request, timeout=60) as response:
        weights, as_of = parse_weights(response.read())
    now = datetime.now(timezone.utc)
    previous = {}
    if OUTPUT.exists():
        previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
    mag7 = basket(weights, MAG7)
    semis = basket(weights, SEMICONDUCTOR_VALUE_CHAIN)
    history = previous.get("history", [])
    today = now.strftime("%Y-%m-%d")
    # Compare with the latest prior trading-day snapshot rather than a second
    # run on the same calendar day.
    prior = next((item for item in reversed(history) if item.get("date") != today), {})
    for key, metric in (("mag7", mag7), ("semiconductors", semis)):
        old_share = prior.get(key)
        metric["dailyChangePp"] = None if old_share is None else round(metric["share"] - float(old_share), 4)
    history = [item for item in history if item.get("date") != today]
    history.append({"date": today, "mag7": mag7["share"], "semiconductors": semis["share"]})
    output = {
        "source": "State Street SPY daily fund holdings",
        "sourceUrl": SPY_HOLDINGS_URL,
        "methodology": "SPY daily fund-holdings weights, used as an S&P 500 proxy. TSM is excluded from the US semiconductor basket.",
        "updatedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "asOf": as_of or today,
        "metrics": {"mag7": mag7, "semiconductors": semis},
        "history": history[-400:],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated SPY concentration metrics as of {output['asOf']}: MAG7 {mag7['share']:.2f}%, semiconductors {semis['share']:.2f}%")


if __name__ == "__main__":
    main()
