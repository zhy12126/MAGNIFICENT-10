"""Build SKHY history without changing the common US-stock backfill.

Before the Nasdaq listing, prices are an explicitly labelled ADS-equivalent
proxy derived from SK hynix ordinary shares (000660.KS).  From the listing on,
real SKHY closes are used.  Valuation denominators come from SK hynix's KRW
consolidated statements exposed for the Korean primary listing.
"""
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

import yfinance as yf

from skhy_financial_data import ttm_periods

TARGET = Path("outputs/data/history.json")
ORDINARY = "000660.KS"
ADR = "SKHY"
ADS_PER_COMMON = 10.0
LISTING_DATE = date(2026, 7, 10)
START = date.today() - timedelta(days=5 * 366)


def value(frame, label, column):
    try:
        result = float(frame.loc[label, column])
        return result if result == result else None
    except (KeyError, TypeError, ValueError):
        return None


def annual_periods(ticker):
    income, cash = ticker.income_stmt, ticker.cashflow
    periods = []
    for column in sorted(set(income.columns) & set(cash.columns)):
        revenue = value(income, "Total Revenue", column)
        net_income = value(income, "Net Income Common Stockholders", column)
        shares = value(income, "Diluted Average Shares", column)
        cfo = value(cash, "Operating Cash Flow", column)
        if not all(item is not None for item in (revenue, shares, cfo)) or shares <= 0:
            continue
        fiscal_end = column.date()
        periods.append({
            "available": date(fiscal_end.year + 1, 3, 31),
            "periodEnd": fiscal_end,
            "eps": net_income / shares if net_income is not None and net_income > 0 else None,
            "revenuePerShare": revenue / shares,
            "cashPerShare": cfo / shares if cfo > 0 else None,
            "basis": "annual K-IFRS consolidated statements; conservative Mar-31 availability",
        })
    return periods


def quarterly_periods(ticker):
    return [{
        "available": ttm["available"], "periodEnd": ttm["periodEnd"],
        "eps": ttm["netIncome"] / ttm["averageShares"] if ttm["netIncome"] > 0 else None,
        "revenuePerShare": ttm["revenue"] / ttm["averageShares"],
        "cashPerShare": ttm["operatingCashflow"] / ttm["averageShares"],
        "basis": "quarterly K-IFRS consolidated statements; rolling four quarters; latest quarter from official filing",
    } for ttm in ttm_periods(ticker)]


def price_map(symbol, start):
    frame = yf.download(symbol, start=start.isoformat(), auto_adjust=False, progress=False)
    series = frame["Close"]
    if getattr(series, "ndim", 1) > 1:
        series = series.iloc[:, 0]
    return {stamp.date(): float(close) for stamp, close in series.dropna().items() if float(close) > 0}


def yahoo_chart_price_map(symbol, start):
    headers = {"User-Agent": "Mozilla/5.0 HY-Market10/1.0", "Accept-Language": "en-US,en;q=0.8"}
    period1 = int(datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc).timestamp())
    period2 = int(datetime.now(timezone.utc).timestamp())
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?period1={period1}&period2={period2}&interval=1d"
    with urlopen(Request(url, headers=headers), timeout=30) as response:
        payload = json.load(response)
    chart = payload.get("chart", {}).get("result", [])
    if not chart:
        raise RuntimeError("Yahoo Finance chart returned no data")
    series = chart[0]
    timestamps = series.get("timestamp", [])
    closes = series.get("indicators", {}).get("quote", [{}])[0].get("close", [])
    if not timestamps or not closes or len(timestamps) != len(closes):
        raise RuntimeError("Yahoo Finance chart missing timestamp/close data")
    return {
        datetime.fromtimestamp(int(ts), timezone.utc).date(): float(close)
        for ts, close in zip(timestamps, closes)
        if close is not None and float(close) > 0
    }


def latest_on_or_before(rows, target):
    result = None
    for row_date in sorted(rows):
        if row_date > target:
            break
        result = rows[row_date]
    return result


def main():
    company = yf.Ticker(ORDINARY)
    periods = annual_periods(company)
    periods.extend(quarterly_periods(company))
    periods.sort(key=lambda item: item["available"])
    ordinary = price_map(ORDINARY, START)
    try:
        adr = yahoo_chart_price_map(ADR, LISTING_DATE)
    except Exception:
        adr = price_map(ADR, LISTING_DATE)
    fx = price_map("KRW=X", START)  # KRW per USD
    active = None
    rows = []
    pre_listing = {trade_date: price for trade_date, price in ordinary.items() if trade_date < LISTING_DATE}
    post_listing = {trade_date: price for trade_date, price in adr.items() if trade_date >= LISTING_DATE}

    for trade_date, ordinary_close in sorted(pre_listing.items()):
        for period in periods:
            if period["available"] <= trade_date:
                active = period
            else:
                break
        krw_per_usd = latest_on_or_before(fx, trade_date)
        display_price = ordinary_close / ADS_PER_COMMON / krw_per_usd if krw_per_usd else None
        price_source = "Yahoo Finance 000660.KS close converted to ADS-equivalent USD"
        price_kind = "underlying-ads-equivalent-proxy"
        common_equivalent_price = ordinary_close
        if display_price is None:
            continue
        row = {
            "date": trade_date.isoformat(), "price": round(display_price, 4),
            "priceCurrency": "USD", "priceSource": price_source, "priceKind": price_kind,
        }
        if active and common_equivalent_price:
            row.update({
                "pe": round(common_equivalent_price / active["eps"], 4) if active["eps"] else None,
                "pcf": round(common_equivalent_price / active["cashPerShare"], 4) if active["cashPerShare"] else None,
                "ps": round(common_equivalent_price / active["revenuePerShare"], 4),
                "ttmPeriodEnd": active["periodEnd"].isoformat(),
                "ttmAvailableFrom": active["available"].isoformat(),
                "valuationMethod": active["basis"] + "; 1 common share = 10 ADSs",
            })
        rows.append(row)

    for trade_date, actual_adr in sorted(post_listing.items()):
        for period in periods:
            if period["available"] <= trade_date:
                active = period
            else:
                break
        krw_per_usd = latest_on_or_before(fx, trade_date)
        display_price = actual_adr
        price_source = "Yahoo Finance SKHY close"
        price_kind = "actual-adr"
        common_equivalent_price = actual_adr * ADS_PER_COMMON * krw_per_usd if krw_per_usd else None
        if display_price is None:
            continue
        row = {
            "date": trade_date.isoformat(), "price": round(display_price, 4),
            "priceCurrency": "USD", "priceSource": price_source, "priceKind": price_kind,
        }
        if active and common_equivalent_price:
            row.update({
                "pe": round(common_equivalent_price / active["eps"], 4) if active["eps"] else None,
                "pcf": round(common_equivalent_price / active["cashPerShare"], 4) if active["cashPerShare"] else None,
                "ps": round(common_equivalent_price / active["revenuePerShare"], 4),
                "ttmPeriodEnd": active["periodEnd"].isoformat(),
                "ttmAvailableFrom": active["available"].isoformat(),
                "valuationMethod": active["basis"] + "; 1 common share = 10 ADSs",
            })
        rows.append(row)
    if not rows:
        raise SystemExit("No SKHY/000660.KS price history returned; history.json was left unchanged.")
    history = json.loads(TARGET.read_text(encoding="utf-8"))
    history.setdefault("stocks", {})[ADR] = rows
    history["skhyHistoryUpdatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    history["skhyHistoryMethod"] = "Dedicated SKHY series: actual Nasdaq closes from listing; earlier observations are labelled 000660.KS ADS-equivalent proxies. Financial denominators use SK hynix KRW consolidated statements."
    history["selectedHistoryMethod"] = "AMD and TSM use dedicated verified rebuilds. SKHY uses its separate K-IFRS/ADS history path, including clearly labelled pre-listing underlying-share proxies."
    TARGET.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SKHY: {len(rows)} rows; {sum('pe' in row for row in rows)} valuation rows")


if __name__ == "__main__":
    main()
