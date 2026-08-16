"""Refresh Alpha Vantage annual revenue consensus without exposing API credentials."""
from __future__ import annotations

import json
import os
import re
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

FUNDAMENTALS = Path("outputs/data/fundamentals.json")
STOCKS = Path("outputs/data/stocks.json")
API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY", "").strip()
REQUESTED = [ticker.strip().upper() for ticker in os.environ.get("ESTIMATE_TICKERS", "").split(",") if ticker.strip()]

# Explicit years 4-5 revenue assumptions. These are company-specific model
# inputs, not analyst consensus and not sector averages.
FAR_GROWTH = {
    "NVDA": (.18, .14), "AAPL": (.06, .05), "MSFT": (.14, .12),
    "GOOGL": (.12, .10), "AMZN": (.12, .10), "META": (.12, .10),
    "TSLA": (.14, .11), "TSM": (.13, .10), "MU": (.07, .05),
    "AVGO": (.15, .12), "AMD": (.17, .13), "SKHY": (.08, .06),
    "NFLX": (.10, .08), "MCD": (.05, .04), "PLTR": (.23, .19),
    "LLY": (.18, .14), "ORCL": (.17, .13),
}


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def first(row, *keys):
    for key in keys:
        if key in row and row[key] not in (None, "", "None"):
            return row[key]
    return None


def fetch(symbol):
    query = urlencode({"function": "EARNINGS_ESTIMATES", "symbol": symbol, "apikey": API_KEY})
    with urlopen(f"https://www.alphavantage.co/query?{query}", timeout=45) as response:
        payload = json.load(response)
    if any(key in payload for key in ("Note", "Information", "Error Message")):
        message = payload.get("Note") or payload.get("Information") or payload.get("Error Message")
        message = re.sub(r"API key as\s+[A-Za-z0-9_-]+", "API key", str(message), flags=re.I)
        raise RuntimeError(message)
    return payload


def parse_consensus(ticker, payload, model):
    rows = payload.get("annualEarningsEstimates") or payload.get("annualEstimates") or payload.get("estimates") or []
    fiscal_end = date.fromisoformat(model["fiscalPeriodEnd"])
    parsed = []
    for row in rows:
        raw_date = first(row, "fiscalDateEnding", "date", "fiscal_date_ending")
        revenue = number(first(row, "revenueEstimateAverage", "revenue_estimate_average", "estimatedRevenueAvg", "estimatedRevenueAverage"))
        analysts = number(first(row, "revenueEstimateAnalystCount", "revenue_estimate_analyst_count", "numberAnalysts", "number_analysts"))
        try:
            period = date.fromisoformat(str(raw_date))
        except ValueError:
            continue
        if period > fiscal_end and revenue and revenue > 0:
            parsed.append({"periodEnd": period.isoformat(), "revenue": revenue, "analystCount": int(analysts) if analysts is not None else None})
    parsed.sort(key=lambda row: row["periodEnd"])
    parsed = parsed[:3]
    if not parsed:
        return None
    previous_revenue = number(model.get("revenueTTM"))
    previous_date = fiscal_end
    growth_path = []
    for row in parsed:
        period = date.fromisoformat(row["periodEnd"])
        years = max((period - previous_date).days / 365.25, .5)
        growth = (row["revenue"] / previous_revenue) ** (1 / years) - 1
        growth_path.append(max(-.30, min(1.00, growth)))
        previous_revenue, previous_date = row["revenue"], period
    year4, year5 = FAR_GROWTH[ticker]
    while len(growth_path) < 3:
        last = growth_path[-1]
        steps_left = 4 - len(growth_path)
        growth_path.append(last + (year4 - last) / steps_left)
    growth_path.extend((year4, year5))
    total_years = max((date.fromisoformat(parsed[-1]["periodEnd"]) - fiscal_end).days / 365.25, .5)
    cagr = (parsed[-1]["revenue"] / number(model["revenueTTM"])) ** (1 / total_years) - 1
    counts = [row["analystCount"] for row in parsed if row["analystCount"] is not None]
    return {
        "source": "Alpha Vantage EARNINGS_ESTIMATES",
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "revenueCagr": cagr,
        "growthPath": growth_path,
        "consensusYears": min(len(parsed), 3),
        "farGrowth": {"year4": year4, "year5": year5, "basis": "company-specific"},
        "analystCount": min(counts) if counts else None,
        "estimates": parsed,
    }


def main():
    if not API_KEY:
        raise SystemExit("Missing ALPHA_VANTAGE_API_KEY.")
    if not REQUESTED:
        raise SystemExit("ESTIMATE_TICKERS is empty.")
    fundamentals = json.loads(FUNDAMENTALS.read_text(encoding="utf-8"))
    stocks_payload = json.loads(STOCKS.read_text(encoding="utf-8"))
    stocks = {row["ticker"]: row for row in stocks_payload.get("stocks", [])}
    updated = 0
    for index, ticker in enumerate(REQUESTED):
        model = fundamentals.get("companies", {}).get(ticker)
        if not model or model.get("status") != "ready":
            continue
        try:
            consensus = parse_consensus(ticker, fetch(ticker), model)
            if consensus:
                model["analystConsensus"] = consensus
                if ticker in stocks:
                    stocks[ticker].setdefault("valuationModel", {})["analystConsensus"] = consensus
                updated += 1
                print(f"{ticker}: revenue consensus CAGR {consensus['revenueCagr'] * 100:.1f}%")
        except Exception as exc:
            print(f"{ticker}: consensus refresh skipped: {exc}")
        if index < len(REQUESTED) - 1:
            time.sleep(13)
    if not updated:
        raise SystemExit("No analyst revenue consensus was refreshed; existing data was preserved.")
    fundamentals["analystEstimatesUpdatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    stocks_payload["analystEstimatesUpdatedAt"] = fundamentals["analystEstimatesUpdatedAt"]
    FUNDAMENTALS.write_text(json.dumps(fundamentals, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    STOCKS.write_text(json.dumps(stocks_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
