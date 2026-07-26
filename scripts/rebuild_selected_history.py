"""Rebuild price and valuation history for AMD, TSM and SKHY only.

All three prices use their actual US Yahoo Finance symbols.  AMD and TSM use
five available years; SKHY begins on its US ADR listing date.  TTM valuation
multiples are rebuilt only when four quarterly reports are available.  No
Korean-share price is used for SKHY and no synthetic pre-listing line is made.
"""
import json
import os
import re
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY", "").strip()
if not API_KEY:
    raise SystemExit("Missing ALPHA_VANTAGE_API_KEY.")

START = date.today() - timedelta(days=5 * 366)
LISTING_START = {"SKHY": date(2026, 7, 10)}
CONFIG = {
    "AMD": {"currency": "USD", "adsPerCommon": 1, "fx": None},
    # Alpha Vantage EARNINGS reports TSM's EPS in USD per ADS already. Its
    # income/cash-flow amounts remain TWD, so only those per-share values need
    # the 5 common shares per ADS and USD/TWD conversion.
    "TSM": {"currency": "TWD", "adsPerCommon": 5, "fx": "TWD=X", "epsIsAdsUsd": True, "commonShares": 25_930_000_000},
    "SKHY": {"currency": "KRW", "adsPerCommon": 0.1, "fx": "KRW=X"},
}
DISCLOSURE_LAG_DAYS = 45
TARGET_TICKERS = {ticker.strip().upper() for ticker in os.environ.get("REBUILD_TICKERS", "").split(",") if ticker.strip()}


def number(value):
    try:
        value = float(value)
        return value if value == value else None
    except (TypeError, ValueError):
        return None


def parsed_date(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def yahoo(symbol, start):
    end = date.today()
    query = urlencode({
        "period1": int(datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc).timestamp()),
        "period2": int(datetime.combine(end + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc).timestamp()),
        "interval": "1d", "events": "history",
    })
    request = Request(f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?{query}", headers={"User-Agent": "Mozilla/5.0 HY valuation dashboard"})
    with urlopen(request, timeout=45) as response:
        payload = json.load(response)
    result = (payload.get("chart", {}).get("result") or [None])[0]
    if not result:
        raise RuntimeError(f"Yahoo Finance returned no data for {symbol}")
    closes = ((result.get("indicators", {}).get("quote") or [{}])[0]).get("close") or []
    rows = []
    for stamp, close in zip(result.get("timestamp") or [], closes):
        trade_date, price = datetime.fromtimestamp(stamp, timezone.utc).date(), number(close)
        if trade_date >= start and price and price > 0:
            rows.append((trade_date, price))
    if not rows:
        raise RuntimeError(f"Yahoo Finance returned no usable closes for {symbol}")
    return sorted(rows)


def alpha(function, symbol):
    with urlopen(f"https://www.alphavantage.co/query?{urlencode({'function': function, 'symbol': symbol, 'apikey': API_KEY})}", timeout=45) as response:
        payload = json.load(response)
    message = payload.get("Note") or payload.get("Information") or payload.get("Error Message")
    if message:
        raise RuntimeError(re.sub(r"API key as\s+[A-Za-z0-9_-]+", "API key", message, flags=re.I))
    return payload


def ttm_periods(income, cash, earnings, config):
    income_by_date = {parsed_date(row.get("fiscalDateEnding")): row for row in income.get("quarterlyReports", [])}
    cash_by_date = {parsed_date(row.get("fiscalDateEnding")): row for row in cash.get("quarterlyReports", [])}
    earnings_by_date = {parsed_date(row.get("fiscalDateEnding")): row for row in earnings.get("quarterlyEarnings", [])}
    ends = sorted(value for value in set(income_by_date) & set(cash_by_date) & set(earnings_by_date) if value)
    result = []
    for index, fiscal_end in enumerate(ends):
        dates = ends[max(0, index - 3):index + 1]
        if len(dates) != 4 or (dates[-1] - dates[0]).days > 430:
            continue
        incomes, cashflows = [income_by_date[value] for value in dates], [cash_by_date[value] for value in dates]
        earnings_rows = [earnings_by_date[value] for value in dates]
        revenue = sum(number(row.get("totalRevenue")) or 0 for row in incomes)
        cfo = sum(number(row.get("operatingCashflow")) or 0 for row in cashflows)
        eps = sum(number(row.get("reportedEPS")) or 0 for row in earnings_rows)
        shares = []
        reported_dates = []
        for income_row, earnings_row in zip(incomes, earnings_rows):
            net_income, quarter_eps = number(income_row.get("netIncome")), number(earnings_row.get("reportedEPS"))
            if net_income is not None and quarter_eps and quarter_eps > 0:
                shares.append(net_income / quarter_eps)
            reported_date = parsed_date(earnings_row.get("reportedDate"))
            if reported_date:
                reported_dates.append(reported_date)
        if config.get("commonShares"):
            shares = [config["commonShares"]]
        if revenue <= 0 or cfo <= 0 or not shares:
            continue
        result.append({
            "available": max(reported_dates) if len(reported_dates) == 4 else fiscal_end + timedelta(days=DISCLOSURE_LAG_DAYS),
            "periodEnd": fiscal_end,
            "eps": eps if eps > 0 else None,
            "revenuePerShare": revenue / (sum(shares) / len(shares)),
            "cashPerShare": cfo / (sum(shares) / len(shares)),
        })
    return result


def latest_fx(rows, trade_date):
    value = None
    for fx_date, fx in rows:
        if fx_date > trade_date:
            break
        value = fx
    return value


def merge_ticker(ticker, price_rows, periods, fx_rows):
    config, active, rows = CONFIG[ticker], None, []
    periods = sorted(periods, key=lambda row: row["available"])
    for trade_date, close in price_rows:
        for period in periods:
            if period["available"] <= trade_date:
                active = period
            else:
                break
        row = {"date": trade_date.isoformat(), "price": round(close, 4), "priceCurrency": "USD", "priceSource": "Yahoo Finance"}
        if active:
            fx = latest_fx(fx_rows, trade_date) if config["fx"] else 1.0
            if fx and fx > 0:
                unit = config["adsPerCommon"] / fx
                eps = active["eps"] if config.get("epsIsAdsUsd") else (active["eps"] * unit if active["eps"] else None)
                cash_per_share, revenue_per_share = active["cashPerShare"] * unit, active["revenuePerShare"] * unit
                row.update({
                    "pe": round(close / eps, 4) if eps and eps > 0 else None,
                    "pcf": round(close / cash_per_share, 4) if cash_per_share > 0 else None,
                    "ps": round(close / revenue_per_share, 4) if revenue_per_share > 0 else None,
                    "ttmPeriodEnd": active["periodEnd"].isoformat(),
                    "ttmAvailableFrom": active["available"].isoformat(),
                    "valuationMethod": "TSMC ADS EPS + TWD financials converted with disclosed ADS ratio" if ticker == "TSM" else "quarterly TTM using Alpha Vantage EARNINGS reported dates",
                })
        rows.append(row)
    return rows


def main():
    target = Path("outputs/data/history.json")
    history = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {"stocks": {}}
    rebuilt, errors = {}, {}
    for index, ticker in enumerate(CONFIG):
        if TARGET_TICKERS and ticker not in TARGET_TICKERS:
            continue
        try:
            start = max(START, LISTING_START.get(ticker, START))
            prices = yahoo(ticker, start)
            periods, fx = [], []
            try:
                income = alpha("INCOME_STATEMENT", ticker)
                time.sleep(13)
                cash = alpha("CASH_FLOW", ticker)
                time.sleep(13)
                earnings = alpha("EARNINGS", ticker)
                periods = ttm_periods(income, cash, earnings, CONFIG[ticker])
                fx = yahoo(CONFIG[ticker]["fx"], START) if CONFIG[ticker]["fx"] else []
                if index < len(CONFIG) - 1:
                    time.sleep(13)
            except Exception as exc:
                errors[ticker] = f"financial statements unavailable; price history retained: {exc}"
                print(f"{ticker}: financial statements unavailable ({exc}); rebuilding price only")
            rebuilt[ticker] = merge_ticker(ticker, prices, periods, fx)
            valuation_rows = sum(1 for row in rebuilt[ticker] if any(row.get(key) is not None for key in ("pe", "pcf", "ps")))
            print(f"{ticker}: {len(rebuilt[ticker])} price rows rebuilt; {valuation_rows} valuation rows")
        except Exception as exc:
            errors[ticker] = str(exc)
            print(f"{ticker}: skipped ({exc})")
    if not rebuilt:
        raise SystemExit("No selected history was rebuilt; history.json was left unchanged.")
    history.setdefault("stocks", {}).pop("SNDK", None)
    history["stocks"].update(rebuilt)
    history["source"] = "Selected US EOD prices from Yahoo Finance + Alpha Vantage quarterly financial statements"
    history["selectedHistoryUpdatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    history["selectedHistoryErrors"] = errors
    history["selectedHistoryMethod"] = "AMD and TSM use five available years. SKHY uses only actual US ADR dates from 2026-07-10 onward; no synthetic pre-listing price or valuation is generated."
    target.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
