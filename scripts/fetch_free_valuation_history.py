"""Backfill five years of valuation history from EOD prices and SEC filings.

SEC Company Facts provides official, point-in-time quarterly financials. Stooq
is the primary historical EOD-price source, with a Yahoo Finance fallback when
Stooq returns no rows.  Every valuation point uses only the four quarters that
had already been filed on that trading date; no analyst estimates are used.
"""
import csv
import html
import io
import json
import os
import re
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
    "AMD": {"cik": "0000002488", "stooq": "amd.us"},
    # SK hynix is a foreign issuer; do not fabricate a SEC-derived valuation line.
    "SKHY": {"cik": None, "stooq": "skhy.us"},
}
TARGET_TICKERS = {ticker.strip().upper() for ticker in os.environ.get("HISTORY_TICKERS", "").split(",") if ticker.strip()}

REVENUE_TAGS = (
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueNet",
    "Revenues",
)
# Broadcom changed its current filing tag from NetIncomeLoss to ProfitLoss.
# Keep both because Company Facts can contain years of either taxonomy.
NET_INCOME_TAGS = ("NetIncomeLoss", "ProfitLoss")
CFO_TAGS = ("NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations")
SHARES_TAGS = ("WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfSharesOutstandingDiluted")
EPS_TAGS = ("EarningsPerShareDiluted",)


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


def fetch_sec_json(url):
    with urlopen(Request(url, headers={"User-Agent": SEC_USER_AGENT}), timeout=45) as response:
        return json.load(response)


def augment_latest_inline_filing(cik, company_facts):
    """Merge a just-filed 10-Q before Company Facts finishes indexing it."""
    submissions = fetch_sec_json(f"https://data.sec.gov/submissions/CIK{cik}.json")
    recent = submissions.get("filings", {}).get("recent", {})
    latest = None
    for index, form in enumerate(recent.get("form", [])):
        if form == "10-Q":
            latest = {
                "filed": parsed_date(recent["filingDate"][index]),
                "report": parsed_date(recent["reportDate"][index]),
                "accession": recent["accessionNumber"][index].replace("-", ""),
                "document": recent["primaryDocument"][index],
            }
            break
    if not latest or not latest["report"] or not latest["filed"]:
        return company_facts
    newest_fact_end = max(
        (parsed_date(entry.get("end")) for tag in REVENUE_TAGS for entry in fact_entries(company_facts, (tag,), "USD")),
        default=None,
    )
    if newest_fact_end and newest_fact_end >= latest["report"]:
        return company_facts
    url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{latest['accession']}/{latest['document']}"
    request = Request(url, headers={"User-Agent": SEC_USER_AGENT})
    with urlopen(request, timeout=45) as response:
        document = response.read().decode("utf-8", errors="replace")
    contexts = {}
    for match in re.finditer(r'<(?:xbrli:)?context\b[^>]*\bid=["\']([^"\']+)["\'][^>]*>(.*?)</(?:xbrli:)?context>', document, re.I | re.S):
        body = match.group(2)
        start = re.search(r'<(?:xbrli:)?startdate[^>]*>([^<]+)', body, re.I)
        end = re.search(r'<(?:xbrli:)?enddate[^>]*>([^<]+)', body, re.I)
        if start and end:
            contexts[match.group(1)] = (parsed_date(start.group(1)), parsed_date(end.group(1)))
    wanted = set(REVENUE_TAGS + NET_INCOME_TAGS + CFO_TAGS + SHARES_TAGS)
    taxonomy = company_facts.setdefault("facts", {}).setdefault("us-gaap", {})
    pattern = re.compile(r'<ix:nonfraction\b([^>]*)>(.*?)</ix:nonfraction>', re.I | re.S)
    added = 0
    for match in pattern.finditer(document):
        attrs, raw = match.groups()
        name = re.search(r'\bname=["\'](?:us-gaap:)?([^"\']+)["\']', attrs, re.I)
        context = re.search(r'\bcontextref=["\']([^"\']+)["\']', attrs, re.I)
        if not name or not context or name.group(1) not in wanted or context.group(1) not in contexts:
            continue
        start, end = contexts[context.group(1)]
        if not start or not end or end != latest["report"]:
            continue
        text = html.unescape(re.sub(r"<[^>]+>", "", raw)).replace(",", "").replace("$", "").strip()
        negative = text.startswith("(") and text.endswith(")")
        text = text.strip("() ")
        try:
            value = float(text)
        except ValueError:
            continue
        scale = re.search(r'\bscale=["\'](-?\d+)["\']', attrs, re.I)
        value *= 10 ** int(scale.group(1)) if scale else 1
        if negative or re.search(r'\bsign=["\']-["\']', attrs, re.I):
            value = -value
        unit = "shares" if name.group(1) in SHARES_TAGS else "USD"
        units = taxonomy.setdefault(name.group(1), {}).setdefault("units", {}).setdefault(unit, [])
        units.append({
            "start": start.isoformat(), "end": end.isoformat(), "val": value,
            "filed": latest["filed"].isoformat(), "form": "10-Q", "source": "inline-xbrl-fallback",
        })
        added += 1
    if added:
        print(f"CIK {cik}: merged {added} latest Inline XBRL facts from {latest['document']}")
    return company_facts


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
    yahoo_rows = []
    # A non-empty response can still contain only a newly listed/re-keyed
    # fragment. Compare coverage and choose Yahoo when it is materially longer.
    if not rows or (rows[-1][0] - rows[0][0]).days < (end - start).days * .8:
        yahoo_rows = fetch_yahoo(symbol.removesuffix(".us").upper(), start, end)
    if yahoo_rows and len(yahoo_rows) > len(rows):
        return yahoo_rows, "Yahoo Finance fallback (longer coverage than Stooq)"
    if rows:
        return sorted(rows), "Stooq"
    return yahoo_rows, "Yahoo Finance fallback"


def fetch_prices(ticker, symbol, start, end):
    if HISTORICAL_PRICE_SOURCE == "stooq":
        return fetch_stooq(symbol, start, end)
    if HISTORICAL_PRICE_SOURCE == "eodhd" and not EODHD_API_KEY:
        raise RuntimeError("EODHD was selected but EODHD_API_KEY is not configured")
    if EODHD_API_KEY:
        try:
            licensed = fetch_eodhd(ticker, start, end)
            if (licensed[-1][0] - licensed[0][0]).days >= (end - start).days * .8:
                return licensed, "EODHD adjusted EOD"
            free_rows, free_source = fetch_stooq(symbol, start, end)
            if len(free_rows) > len(licensed):
                return free_rows, f"{free_source} (longer coverage than EODHD plan)"
            return licensed, "EODHD adjusted EOD (limited configured-plan coverage)"
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


def select_by_end(entries, minimum_days, maximum_days, prefer_latest=False):
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
        if old is None or (filed > old["filed"] if prefer_latest else filed < old["filed"]):
            values[end] = {"value": value, "filed": filed}
    return values


def quarterly_flow(facts, tags, unit="USD", prefer_latest=False):
    entries = fact_entries(facts, tags, unit)
    individual = select_by_end(entries, 60, 120, prefer_latest)
    half_year = select_by_end(entries, 150, 220, prefer_latest)
    nine_month = select_by_end(entries, 230, 300, prefer_latest)
    annual = select_by_end(entries, 300, 400, prefer_latest)

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
    # Broadcom's more recent filings do not consistently expose the diluted
    # weighted-average share tag in Company Facts.  The SEC DEI cover-page
    # outstanding-share fact is still reported with every 10-Q/10-K.  Use it
    # only as a fallback so a missing EPS-denominator tag cannot freeze the
    # full P/E, P/CF and P/S history at an obsolete fiscal period.
    dei_entries = (
        facts.get("facts", {})
        .get("dei", {})
        .get("EntityCommonStockSharesOutstanding", {})
        .get("units", {})
        .get("shares", [])
    )
    for entry in dei_entries:
        if entry.get("form") not in {"10-Q", "10-K", "20-F", "40-F"}:
            continue
        end, filed, value = parsed_date(entry.get("end")), parsed_date(entry.get("filed")), number(entry.get("val"))
        if not end or not filed or not value or value <= 0:
            continue
        # Prefer an actual weighted-average share fact whenever available.
        # Cover-page outstanding shares are a fallback only.
        if end not in values:
            values[end] = {"value": value, "filed": filed, "source": "dei-outstanding"}
    return values


def shares_for_period(shares, period_end):
    """Return the diluted-share fact reported for a fiscal quarter.

    Some issuers (notably Broadcom after fiscal-calendar changes) tag the
    weighted-average share fact one or a few calendar days away from the flow
    statement's period end.  Exact-date intersection then freezes a complete
    TTM series at the last pre-change quarter.  Prefer an exact match, then a
    very close date, and only finally the latest prior quarter within 120 days.
    """
    exact = shares.get(period_end)
    if exact:
        return exact
    nearby = [
        (abs((end - period_end).days), end, row)
        for end, row in shares.items()
        if abs((end - period_end).days) <= 7
    ]
    if nearby:
        return min(nearby, key=lambda item: item[0])[2]
    cover_page = [
        (abs((end - period_end).days), end, row)
        for end, row in shares.items()
        if row.get("source") == "dei-outstanding" and abs((end - period_end).days) <= 120
    ]
    if cover_page:
        return min(cover_page, key=lambda item: item[0])[2]
    prior = [(end, row) for end, row in shares.items() if 0 < (period_end - end).days <= 120]
    return max(prior, key=lambda item: item[0])[1] if prior else None


def quarterly_ttm_periods(company_facts):
    revenue = quarterly_flow(company_facts, REVENUE_TAGS)
    net_income = quarterly_flow(company_facts, NET_INCOME_TAGS)
    operating_cashflow = quarterly_flow(company_facts, CFO_TAGS)
    shares = quarterly_shares(company_facts)
    # Alphabet and a few reorganized issuers stopped exposing weighted-average
    # shares for older comparative periods after a split. Infer the split-
    # adjusted denominator from net income / the latest restated diluted EPS,
    # while retaining the original income filing date as market availability.
    diluted_eps = quarterly_flow(company_facts, EPS_TAGS, "USD/shares", prefer_latest=True)
    inferred_ends = []
    for end, income_row in net_income.items():
        eps_row = diluted_eps.get(end)
        stale_share_fact = end in shares and (shares[end]["filed"] - income_row["filed"]).days > 180
        if (end not in shares or stale_share_fact) and eps_row and eps_row["value"] not in (None, 0):
            inferred = income_row["value"] / eps_row["value"]
            if inferred > 0:
                shares[end] = {"value": inferred, "filed": income_row["filed"], "source": "net-income/restated-diluted-eps"}
                inferred_ends.append(end)
    direct_values = [row["value"] for row in shares.values() if row.get("source") != "net-income/restated-diluted-eps" and row["value"] > 0]
    if direct_values:
        reference = sorted(direct_values)[len(direct_values) // 2]
        for end in inferred_ends:
            value = shares[end]["value"]
            ratio = reference / value
            split = min((2, 3, 4, 5, 10, 20, 40), key=lambda candidate: abs(candidate - ratio))
            if split >= 2 and abs(split - ratio) / split <= .30:
                shares[end]["value"] *= split
                shares[end]["source"] += f"; split-adjusted-x{split}"
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
        share_rows = [shares_for_period(shares, d) for d in recent]
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


def ttm_series_diagnostic(company_facts):
    """Compact field-level dates for a safe, actionable skip message."""
    series = {
        "revenue": quarterly_flow(company_facts, REVENUE_TAGS),
        "netIncome": quarterly_flow(company_facts, NET_INCOME_TAGS),
        "operatingCashflow": quarterly_flow(company_facts, CFO_TAGS),
        "shares": quarterly_shares(company_facts),
    }
    return ", ".join(
        f"{name}={max(values).isoformat() if values else 'none'}"
        for name, values in series.items()
    )


def history_for_ticker(ticker, config, start, end):
    if not config["cik"]:
        raise RuntimeError("no SEC CIK configured for this US ticker")
    company_facts = augment_latest_inline_filing(config["cik"], fetch_sec(config["cik"]))
    periods = quarterly_ttm_periods(company_facts)
    if not periods:
        raise RuntimeError("no comparable quarterly SEC financial facts")
    periods.sort(key=lambda item: item["available"])
    newest_period = periods[-1]
    if (end - newest_period["periodEnd"]).days > 550:
        raise RuntimeError(
            f"latest comparable TTM period is stale ({newest_period['periodEnd']}); "
            f"history was not overwritten; field ends: {ttm_series_diagnostic(company_facts)}"
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
        if TARGET_TICKERS and ticker not in TARGET_TICKERS:
            continue
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
