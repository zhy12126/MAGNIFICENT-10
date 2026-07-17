"""Backfill five years of valuation history from EOD prices and SEC filings.

SEC Company Facts provides official, point-in-time quarterly financials. Stooq
is the primary historical EOD-price source, with a Yahoo Finance fallback when
Stooq returns no rows.  Every valuation point uses only the four quarters that
had already been filed on that trading date; no analyst estimates are used.
"""
import csv
import io
import json
import os
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SEC_USER_AGENT = os.environ.get("SEC_EDGAR_USER_AGENT", "").strip()
EODHD_API_KEY = os.environ.get("EODHD_API_KEY", "").strip()
HISTORICAL_PRICE_SOURCE = os.environ.get("HISTORICAL_PRICE_SOURCE", "auto").strip().lower()
if not SEC_USER_AGENT or "@" not in SEC_USER_AGENT:
    raise SystemExit("Missing SEC_EDGAR_USER_AGENT. Use a descriptive value with a contact email in .env.")
if HISTORICAL_PRICE_SOURCE not in {"auto", "stooq", "eodhd"}:
    raise SystemExit("HISTORICAL_PRICE_SOURCE must be auto, stooq, or eodhd.")

COMPANIES = {
    "NVDA": {"cik": "0001045810", "stooq": "nvda.us"},
    "AAPL": {"cik": "0000320193", "stooq": "aapl.us"},
    "MSFT": {"cik": "0000789019", "stooq": "msft.us"},
    "GOOGL": {"cik": "0001652044", "stooq": "googl.us"},
    "AMZN": {"cik": "0001018724", "stooq": "amzn.us"},
    "META": {"cik": "0001326801", "stooq": "meta.us"},
    "TSLA": {"cik": "0001318605", "stooq": "tsla.us"},
    "TSM": {"cik": "0001046179", "stooq": "tsm.us"},
    "MU": {"cik": "0000723125", "stooq": "mu.us"},
    "AVGO": {"cik": "0001730168", "stooq": "avgo.us"},
    "ORCL": {"cik": "0001341439", "stooq": "orcl.us"},
    "PLTR": {"cik": "0001321655", "stooq": "pltr.us"},
}

REVENUE_TAGS = ("RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet", "Revenues")
NET_INCOME_TAGS = ("NetIncomeLoss",)
CFO_TAGS = ("NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations")
SHARES_TAGS = ("WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfSharesOutstandingDiluted")


def parsed_date(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def number(value):
    try:
        value = float(value)
        return value if value == value else None
    except (TypeError, ValueError):
        return None


def fetch_sec(cik):
    request = Request(
        f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json",
        # Do not request gzip: urllib does not transparently decompress it,
        # and SEC otherwise returns normal JSON that json.load can parse.
        headers={"User-Agent": SEC_USER_AGENT},
    )
    with urlopen(request, timeout=45) as response:
        return json.load(response)


def fetch_eodhd(ticker, start, end):
    """Fetch licensed daily EOD closes when an EODHD key is configured."""
    query = urlencode({
        "from": start.isoformat(), "to": end.isoformat(),
        "api_token": EODHD_API_KEY, "fmt": "json",
    })
    request = Request(
        f"https://eodhd.com/api/eod/{ticker}.US?{query}",
        headers={"User-Agent": "Market10 research dashboard"},
    )
    with urlopen(request, timeout=45) as response:
        payload = json.load(response)
    rows = []
    for item in payload if isinstance(payload, list) else []:
        trade_date, close = parsed_date(item.get("date")), number(item.get("adjusted_close") or item.get("close"))
        if trade_date and close and close > 0:
            rows.append((trade_date, close))
    if not rows:
        raise RuntimeError("EODHD returned no historical EOD prices")
    return sorted(rows)


def fetch_stooq(symbol, start, end):
    def download(params):
        query = urlencode(params)
        request = Request(f"https://stooq.com/q/d/l/?{query}", headers={"User-Agent": "Market10 research dashboard"})
        with urlopen(request, timeout=45) as response:
            text = response.read().decode("utf-8-sig")
        rows = []
        for row in csv.DictReader(io.StringIO(text)):
            trade_date, close = parsed_date(row.get("Date")), number(row.get("Close"))
            if trade_date and close and close > 0:
                rows.append((trade_date, close))
        return rows

    # Stooq occasionally rejects date-bounded requests while accepting the
    # same symbol without bounds. Fall back to the full CSV, then filter it
    # locally to preserve the requested five-year range.
    rows = download({"s": symbol, "i": "d", "d1": start.strftime("%Y%m%d"), "d2": end.strftime("%Y%m%d")})
    if not rows:
        rows = download({"s": symbol, "i": "d"})
    rows = [(trade_date, close) for trade_date, close in rows if start <= trade_date <= end]
    if rows:
        return sorted(rows), "Stooq"
    return fetch_yahoo(symbol.removesuffix(".us").upper(), start, end), "Yahoo Finance fallback"


def fetch_prices(ticker, symbol, start, end):
    if HISTORICAL_PRICE_SOURCE == "stooq":
        return fetch_stooq(symbol, start, end)
    if HISTORICAL_PRICE_SOURCE == "eodhd" and not EODHD_API_KEY:
        raise RuntimeError("EODHD was selected but EODHD_API_KEY is not configured")
    if EODHD_API_KEY:
        try:
            return fetch_eodhd(ticker, start, end), "EODHD adjusted EOD"
        except Exception as exc:
            # Preserve the no-key path as a local, low-cost fallback.  The
            # source recorded in history.json makes this visible to the UI.
            print(f"{ticker}: EODHD unavailable ({exc}); trying free fallback")
    return fetch_stooq(symbol, start, end)


def fetch_yahoo(ticker, start, end):
    """No-key fallback when Stooq returns an empty CSV for a valid US symbol.

    Yahoo's chart endpoint is not a licensed market-data API; it is used only
    for this low-frequency, local historical backfill and is clearly recorded
    in history.json as a fallback source.
    """
    period1 = int(datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc).timestamp())
    period2 = int(datetime.combine(end + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc).timestamp())
    query = urlencode({"period1": period1, "period2": period2, "interval": "1d", "events": "history"})
    request = Request(f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?{query}", headers={"User-Agent": "Mozilla/5.0 Market10 research dashboard"})
    with urlopen(request, timeout=45) as response:
        payload = json.load(response)
    result = (payload.get("chart", {}).get("result") or [None])[0]
    if not result:
        raise RuntimeError("Stooq returned no prices and Yahoo Finance fallback returned no data")
    timestamps = result.get("timestamp") or []
    closes = ((result.get("indicators", {}).get("quote") or [{}])[0]).get("close") or []
    rows = []
    for timestamp, close in zip(timestamps, closes):
        trade_date, price = datetime.fromtimestamp(timestamp, timezone.utc).date(), number(close)
        if start <= trade_date <= end and price and price > 0:
            rows.append((trade_date, price))
    if not rows:
        raise RuntimeError("Stooq returned no prices and Yahoo Finance fallback returned no usable EOD prices")
    return sorted(rows)


def fact_entries(facts, tags, unit):
    taxonomy = facts.get("facts", {}).get("us-gaap", {})
    # Issuers sometimes migrate an item from one GAAP tag to another. Taking
    # only the first tag that exists can freeze a series years ago while prices
    # continue to advance. Combine compatible tags; select_by_end() resolves
    # duplicate periods by their first public filing date.
    merged = []
    for tag in tags:
        units = taxonomy.get(tag, {}).get("units", {})
        if units.get(unit):
            merged.extend(units[unit])
    return merged


def select_by_end(entries, minimum_days, maximum_days):
    values = {}
    for entry in entries:
        if entry.get("form") not in {"10-K", "20-F", "40-F"}:
            # 10-Q contains the first three quarters; 10-K provides Q4 via
            # the full-year total after the first three quarters are known.
            if entry.get("form") != "10-Q":
                continue
        end, filed, value = parsed_date(entry.get("end")), parsed_date(entry.get("filed")), number(entry.get("val"))
        if not end or not filed or value is None:
            continue
        start = parsed_date(entry.get("start"))
        if not start or not minimum_days <= (end - start).days <= maximum_days:
            continue
        old = values.get(end)
        # Use the first public filing for that fiscal year; amendments do not
        # retroactively change what the market knew on earlier dates.
        if old is None or filed < old["filed"]:
            values[end] = {"value": value, "filed": filed}
    return values


def quarterly_flow(facts, tags):
    entries = fact_entries(facts, tags, "USD")
    individual = select_by_end(entries, 60, 120)
    half_year = select_by_end(entries, 150, 220)
    nine_month = select_by_end(entries, 230, 300)
    annual = select_by_end(entries, 300, 400)

    # Some companies report Q2/Q3 as year-to-date values only. Convert those
    # cumulative figures to standalone quarters whenever the prior period is
    # available. Q4 is annual total minus Q1-Q3.
    for end, row in half_year.items():
        prior = [d for d in individual if 55 <= (end - d).days <= 130]
        if prior:
            previous = individual[max(prior)]
            individual.setdefault(end, {"value": row["value"] - previous["value"], "filed": row["filed"]})
    for end, row in nine_month.items():
        prior = [d for d in half_year if 55 <= (end - d).days <= 130]
        if prior:
            previous = half_year[max(prior)]
            individual.setdefault(end, {"value": row["value"] - previous["value"], "filed": row["filed"]})
    for end, row in annual.items():
        # The three immediate 10-Q quarters are typically about 90, 180 and
        # 270 days before the fiscal year end.  Subtract all three from the
        # annual flow to derive standalone Q4.  The previous 240-day lower
        # bound accidentally retained only Q1, so Q4 was often absent from
        # the rolling TTM denominator.
        prior_dates = sorted((d for d in individual if 55 <= (end - d).days <= 310), reverse=True)[:3]
        if len(prior_dates) == 3:
            individual.setdefault(end, {"value": row["value"] - sum(individual[d]["value"] for d in prior_dates), "filed": row["filed"]})
    return individual


def quarterly_shares(facts):
    entries = fact_entries(facts, SHARES_TAGS, "shares")
    values = select_by_end(entries, 60, 120)
    values.update({end: row for end, row in select_by_end(entries, 300, 400).items() if end not in values})
    return values


def quarterly_ttm_periods(company_facts):
    revenue = quarterly_flow(company_facts, REVENUE_TAGS)
    net_income = quarterly_flow(company_facts, NET_INCOME_TAGS)
    operating_cashflow = quarterly_flow(company_facts, CFO_TAGS)
    shares = quarterly_shares(company_facts)
    periods = []
    common_ends = sorted(set(revenue) & set(net_income) & set(operating_cashflow))
    for index, end in enumerate(common_ends):
        recent = common_ends[max(0, index - 3):index + 1]
        if len(recent) != 4 or (recent[-1] - recent[0]).days > 430:
            continue
        # TTM earnings/revenue/cash flow are sums of four quarterly flows.
        # Their per-share denominators must therefore use the average of the
        # four corresponding quarterly weighted-average diluted share counts,
        # not just the latest quarter's share count.  The latter can materially
        # distort P/E after repurchases, issuances, or stock splits.
        share_rows = [shares.get(d) for d in recent]
        if any(row is None or row["value"] <= 0 for row in share_rows):
            continue
        average_shares = sum(row["value"] for row in share_rows) / 4
        revenue_ttm = sum(revenue[d]["value"] for d in recent)
        income_ttm = sum(net_income[d]["value"] for d in recent)
        cfo_ttm = sum(operating_cashflow[d]["value"] for d in recent)
        if revenue_ttm <= 0 or average_shares <= 0:
            continue
        periods.append({
            "available": max(
                *(revenue[d]["filed"] for d in recent),
                *(net_income[d]["filed"] for d in recent),
                *(operating_cashflow[d]["filed"] for d in recent),
                *(row["filed"] for row in share_rows),
            ),
            "periodEnd": end,
            "eps": income_ttm / average_shares if income_ttm > 0 else None,
            "cashPerShare": cfo_ttm / average_shares if cfo_ttm > 0 else None,
            "salesPerShare": revenue_ttm / average_shares,
        })
    return periods


def history_for_ticker(ticker, config, start, end):
    if not config["cik"]:
        raise RuntimeError("no SEC CIK configured for this US ticker")
    periods = quarterly_ttm_periods(fetch_sec(config["cik"]))
    if not periods:
        raise RuntimeError("no comparable quarterly SEC financial facts")
    periods.sort(key=lambda item: item["available"])
    newest_period = periods[-1]
    if (end - newest_period["periodEnd"]).days > 550:
        raise RuntimeError(
            f"latest comparable TTM period is stale ({newest_period['periodEnd']}); "
            "history was not overwritten"
        )
    prices, price_source = fetch_prices(ticker, config["stooq"], start, end)
    active, rows = None, []
    for trade_date, close in prices:
        for period in periods:
            if period["available"] <= trade_date:
                active = period
            else:
                break
        if not active:
            continue
        rows.append({
            "date": trade_date.isoformat(),
            "price": round(close, 4),
            "pe": round(close / active["eps"], 4) if active["eps"] else None,
            "pcf": round(close / active["cashPerShare"], 4) if active["cashPerShare"] else None,
            "ps": round(close / active["salesPerShare"], 4) if active["salesPerShare"] else None,
            # Audit metadata: this is the latest SEC TTM period that was
            # public on `date`, rather than a value revised with hindsight.
            "ttmPeriodEnd": active["periodEnd"].isoformat(),
            "ttmAvailableFrom": active["available"].isoformat(),
        })
    if not rows:
        raise RuntimeError("no valuation rows after matching filing dates to prices")
    return rows, price_source


def main():
    end = date.today()
    start = end - timedelta(days=5 * 366)
    target = Path("outputs/data/history.json")
    history = {"source": "Alpha Vantage + SEC EDGAR + Stooq", "stocks": {}}
    if target.exists():
        history = json.loads(target.read_text(encoding="utf-8"))
    results, errors, price_sources = {}, {}, {}
    for ticker, config in COMPANIES.items():
        try:
            results[ticker], source = history_for_ticker(ticker, config, start, end)
            price_sources[ticker] = source
            print(f"{ticker}: {len(results[ticker])} historical valuation rows ({source})")
        except Exception as exc:
            errors[ticker] = str(exc)
            print(f"{ticker}: skipped ({exc})")
        time.sleep(0.12)
    if not results:
        raise SystemExit("No usable free historical valuation data; history.json was left unchanged.")
    cutoff = start.isoformat()
    for ticker, rows in results.items():
        combined = {row["date"]: row for row in history.setdefault("stocks", {}).get(ticker, [])}
        combined.update({row["date"]: row for row in rows})
        history["stocks"][ticker] = [combined[key] for key in sorted(combined) if key >= cutoff]
    history["source"] = f"SEC EDGAR point-in-time quarterly TTM financial facts + daily EOD prices ({HISTORICAL_PRICE_SOURCE} selection; EODHD, Stooq, and Yahoo fallback where applicable)"
    history["methodology"] = "For each trading date: EOD close divided by the latest already-filed rolling-four-quarter EPS, operating cash flow per share, and revenue per share. Per-share denominators use the average diluted weighted shares of the same four quarters."
    history["priceSources"] = price_sources
    history["backfillUpdatedAt"] = end.isoformat()
    history["backfillErrors"] = errors
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
