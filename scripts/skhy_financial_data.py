"""SK hynix-specific financial overrides from newly released official filings."""
from datetime import date, timedelta


# Yahoo Finance commonly lags a newly announced Korean quarter. Keep official
# overrides here so the SKHY-only jobs can use the filing immediately. Amounts
# are KRW; cash-flow and capex figures are rounded to KRW billions in the IR deck.
OFFICIAL_QUARTERS = {
    date(2026, 6, 30): {
        "available": date(2026, 7, 29),
        "revenue": 79_318_746_000_000,
        "netIncomeCommon": 93_820_236_000_000,
        "dilutedEps": 131_478,
        "dilutedShares": 93_820_236_000_000 / 131_478,
        "operatingCashflow": 65_710_000_000_000,
        "capitalExpenditure": 10_671_000_000_000,
        "source": "SK hynix 2Q26 official K-IFRS results (SEC 6-K + earnings presentation)",
        "sourceUrl": "https://www.sec.gov/Archives/edgar/data/2120882/000119312526321989/d115239d6k.htm",
    }
}


def number(frame, label, column):
    try:
        result = float(frame.loc[label, column])
        return result if result == result else None
    except (KeyError, TypeError, ValueError):
        return None


def ttm_periods(ticker):
    income, cash = ticker.quarterly_income_stmt, ticker.quarterly_cashflow
    quarters = {}
    for column in set(income.columns) & set(cash.columns):
        period_end = column.date()
        quarters[period_end] = {
            "available": period_end + timedelta(days=45),
            "revenue": number(income, "Total Revenue", column),
            "netIncomeCommon": number(income, "Net Income Common Stockholders", column),
            "dilutedShares": number(income, "Diluted Average Shares", column),
            "operatingCashflow": number(cash, "Operating Cash Flow", column),
            "capitalExpenditure": abs(number(cash, "Capital Expenditure", column) or 0),
            "source": "Yahoo Finance 000660.KS K-IFRS statements",
        }
    quarters.update(OFFICIAL_QUARTERS)
    results = []
    all_ends = sorted(quarters)
    required = ("revenue", "netIncomeCommon", "operatingCashflow", "capitalExpenditure")
    for index in range(3, len(all_ends)):
        ends = all_ends[index - 3:index + 1]
        rows = [quarters[end] for end in ends]
        if (ends[-1] - ends[0]).days > 380 or any(row.get(key) is None for row in rows for key in required):
            continue
        shares = [row.get("dilutedShares") for row in rows if row.get("dilutedShares")]
        if not shares:
            continue
        latest = rows[-1]
        results.append({
            "available": latest["available"], "periodEnd": ends[-1],
            "revenue": sum(row["revenue"] for row in rows),
            "netIncome": sum(row["netIncomeCommon"] for row in rows),
            "operatingCashflow": sum(row["operatingCashflow"] for row in rows),
            "capitalExpenditure": sum(row["capitalExpenditure"] for row in rows),
            "averageShares": sum(shares) / len(shares),
            "source": latest["source"], "sourceUrl": latest.get("sourceUrl"),
        })
    return results


def latest_ttm(ticker):
    periods = ttm_periods(ticker)
    return periods[-1] if periods else None
