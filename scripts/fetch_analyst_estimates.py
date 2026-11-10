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


def revenue_at(anchors, years):
    """Log-linear revenue between consensus anchors; None beyond the last one."""
    for (start, low), (end, high) in zip(anchors, anchors[1:]):
        if start <= years <= end:
            return low * (high / low) ** ((years - start) / (end - start))
    return None


def parse_consensus(ticker, payload, model):
    rows = payload.get("annualEarningsEstimates") or payload.get("annualEstimates") or payload.get("estimates") or []
    # The endpoint mixes fiscal-year and fiscal-quarter rows in one list.
    # Quarterly revenue must never be read as a full-year consensus.
    if any("horizon" in row for row in rows):
        rows = [row for row in rows if "year" in str(row.get("horizon", "")).lower()]
    fiscal_end = date.fromisoformat(model["fiscalPeriodEnd"])
    # Alpha Vantage reports estimates in the filing currency (TWD for TSM),
    # while revenueTTM in the company model is already converted to USD.
    fx_to_usd = number(model.get("fxRateToUsd")) or 1.0
    parsed = []
    for row in rows:
        raw_date = first(row, "fiscalDateEnding", "date", "fiscal_date_ending")
        revenue = number(first(row, "revenueEstimateAverage", "revenue_estimate_average", "estimatedRevenueAvg", "estimatedRevenueAverage"))
        analysts = number(first(row, "revenueEstimateAnalystCount", "revenue_estimate_analyst_count", "numberAnalysts", "number_analysts"))
        try:
            period = date.fromisoformat(str(raw_date))
        except ValueError:
            continue
        # A fiscal year ending within a few weeks of the latest filing is that
        # same reported year under a 52/53-week calendar, not a forecast.
        if (period - fiscal_end).days > 45 and revenue and revenue > 0:
            parsed.append({"periodEnd": period.isoformat(), "revenue": revenue * fx_to_usd, "analystCount": int(analysts) if analysts is not None else None})
    parsed.sort(key=lambda row: row["periodEnd"])
    parsed = parsed[:3]
    revenue_ttm = number(model.get("revenueTTM"))
    if not parsed or not revenue_ttm or revenue_ttm <= 0:
        return None
    anchors = [(0.0, revenue_ttm)] + [((date.fromisoformat(row["periodEnd"]) - fiscal_end).days / 365.25, row["revenue"]) for row in parsed]
    growth_path = []
    for year in (1, 2, 3):
        current, previous = revenue_at(anchors, year), revenue_at(anchors, year - 1)
        if current is None or previous is None:
            break
        growth_path.append(current / previous - 1)
    if not growth_path:
        return None
    next_12_month_growth = growth_path[0]
    growth_path = [max(-.30, min(1.00, growth)) for growth in growth_path]
    # A provider row that repeats the just-reported fiscal year under next
    # year's label shows up as "flat, then a jump". Keep it out of the display.
    suspect_label = (
        len(parsed) > 1 and anchors[1][0] >= .9
        and abs(anchors[1][1] / revenue_ttm - 1) < .01
        and anchors[2][1] / anchors[1][1] - 1 > .15
    )
    consensus_years = len(growth_path)
    year4, year5 = FAR_GROWTH[ticker]
    while len(growth_path) < 3:
        last = growth_path[-1]
        steps_left = 4 - len(growth_path)
        growth_path.append(last + (year4 - last) / steps_left)
    growth_path.extend((year4, year5))
    total_years, last_revenue = anchors[-1]
    cagr = (last_revenue / revenue_ttm) ** (1 / total_years) - 1
    counts = [row["analystCount"] for row in parsed if row["analystCount"] is not None]
    return {
        "source": "Alpha Vantage EARNINGS_ESTIMATES",
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "basisPeriodEnd": fiscal_end.isoformat(),
        "revenueCagr": cagr,
        "next12MonthGrowth": next_12_month_growth,
        "suspectFiscalYearLabel": suspect_label,
        "growthPath": growth_path,
        "consensusYears": consensus_years,
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
