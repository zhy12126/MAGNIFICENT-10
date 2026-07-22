"""Refresh company-specific reverse-DCF inputs from Alpha Vantage financial statements.

This job is intentionally separate from the daily snapshot.  It makes 24 calls
(income statement + cash flow for each company) and should run on a Saturday,
when the 22-call weekday market job is not running.
"""
import json
import os
import re
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY")
if not API_KEY:
    raise SystemExit("Missing ALPHA_VANTAGE_API_KEY GitHub secret.")

# The weights are company-specific judgements, not sector defaults.  They only
# decide how much recent reported FCF versus a three-year reported median is
# used to normalize a company's own cash conversion.
COMPANIES = {
    "NVDA": ("NVIDIA", .60, "AI 数据中心利润率出现结构性抬升；保留 40% 三年中位数以避免只外推峰值。"),
    "AAPL": ("Apple", .50, "硬件与服务组合成熟，TTM 与三年现金转化各占一半。"),
    "MSFT": ("Microsoft", .70, "AI 基础设施资本开支已显著上升，较多采用当前现金流率。"),
    "GOOGL": ("Alphabet", .75, "数据中心投资快速增加，当前现金流率比过去轻资本年份更具代表性。"),
    "AMZN": ("Amazon", .75, "AWS 与物流网络均在加大投入，当前现金转化优先。"),
    "META": ("Meta", .75, "AI 资本开支处于高投入阶段，避免用旧年高 FCF 率高估。"),
    "TSLA": ("Tesla", .40, "交付、库存和营运资本波动较大，以三年中位数为主。"),
    "TSM": ("TSMC", .45, "晶圆厂资本开支与景气周期显著，三年中位数为主。"),
    "MU": ("Micron", .35, "存储价格周期显著，三年中位数为主以降低周期高低点影响。"),
    "AVGO": ("Broadcom", .60, "基础设施软件整合与半导体业务并行，当前现金转化权重略高。"),
    "AMD": ("AMD", .45, "数据中心与客户端业务均具周期性，采用三年中位数以避免只外推单一景气阶段。"),
    "SNDK": ("Sandisk", .35, "NAND 存储价格与资本开支周期显著，采用三年中位数降低周期高低点影响。"),
}
RISK_FREE_RATE = .0425       # US 10Y reference, refreshed with each methodology review
EQUITY_RISK_PREMIUM = .0500  # long-run mature-market ERP assumption
TERMINAL_GROWTH = .025

# Alpha Vantage returns TSMC's primary financial statements in TWD, while the
# TSM ADR market capitalization is quoted in USD.  Amounts must therefore be
# normalized before the reverse-FCFE model compares cash flow with equity value.
# The model uses a transparent rounded spot proxy; margins are unaffected by
# this conversion, and the rate can be refreshed during the methodology review.
TSM_TWD_PER_USD = 30.0

def call(function, symbol):
    query = urlencode({"function": function, "symbol": symbol, "apikey": API_KEY})
    with urlopen(f"https://www.alphavantage.co/query?{query}", timeout=30) as response:
        data = json.load(response)
    if "Note" in data or "Information" in data or "Error Message" in data:
        message = data.get("Note") or data.get("Information") or data.get("Error Message") or "request rejected"
        message = re.sub(r"API key as\s+[A-Za-z0-9_-]+", "API key", message, flags=re.I)
        raise RuntimeError(f"Alpha Vantage {symbol}/{function} rejected the request: {message}")
    return data

def num(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def report_value(report, *keys):
    for key in keys:
        value = num(report.get(key))
        if value is not None:
            return value
    return None

def fcf_margin(income_report, cash_report):
    revenue = report_value(income_report, "totalRevenue")
    cfo = report_value(cash_report, "operatingCashflow")
    capex = report_value(cash_report, "capitalExpenditures", "capitalExpenditure")
    if not revenue or cfo is None or capex is None:
        return None, None, None
    fcf = cfo - abs(capex)
    return revenue, fcf, fcf / revenue

def latest_ttm(income, cash):
    incomes = income.get("quarterlyReports", [])[:4]
    cashflows = cash.get("quarterlyReports", [])[:4]
    if len(incomes) < 4 or len(cashflows) < 4:
        return None
    # Pair by fiscal end date; missing/duplicated period data is rejected.
    income_by_date = {r.get("fiscalDateEnding"): r for r in incomes}
    pairs = [(income_by_date.get(r.get("fiscalDateEnding")), r) for r in cashflows]
    if len(pairs) < 4 or any(a is None for a, _ in pairs):
        return None
    rows = [fcf_margin(a, b) for a, b in pairs]
    if any(r[0] is None for r in rows):
        return None
    revenue = sum(r[0] for r in rows)
    fcf = sum(r[1] for r in rows)
    operating_cashflow = sum(report_value(cash_report, "operatingCashflow") or 0 for _, cash_report in pairs)
    return revenue, operating_cashflow, fcf, fcf / revenue, max(income_report.get("fiscalDateEnding", "") for income_report, _ in pairs)

def annual_margins(income, cash):
    income_by_year = {r.get("fiscalDateEnding"): r for r in income.get("annualReports", [])}
    results = []
    for cash_report in cash.get("annualReports", []):
        income_report = income_by_year.get(cash_report.get("fiscalDateEnding"))
        if income_report:
            _, _, margin = fcf_margin(income_report, cash_report)
            if margin is not None:
                results.append(margin)
    return results[:3]

def main():
    companies = {}
    for index, (ticker, (name, ttm_weight, rationale)) in enumerate(COMPANIES.items()):
        try:
            income = call("INCOME_STATEMENT", ticker)
            time.sleep(13)
            cash = call("CASH_FLOW", ticker)
            if index < len(COMPANIES) - 1:
                time.sleep(13)
            ttm = latest_ttm(income, cash)
            margins = annual_margins(income, cash)
            if not ttm or len(margins) < 3 or ttm_weight == 0:
                companies[ticker] = {"status": "insufficient", "company": name, "reason": "公开财报不足四个季度或三年可比现金流，暂不计算隐含增长率。", "rationale": rationale}
                continue
            revenue, operating_cashflow, fcf, ttm_margin, fiscal_end = ttm
            median_margin = statistics.median(margins)
            normalized = ttm_weight * ttm_margin + (1 - ttm_weight) * median_margin
            reporting_currency = "USD"
            fx_rate_to_usd = 1.0
            if ticker == "TSM":
                revenue /= TSM_TWD_PER_USD
                operating_cashflow /= TSM_TWD_PER_USD
                fcf /= TSM_TWD_PER_USD
                reporting_currency = "TWD"
                fx_rate_to_usd = 1 / TSM_TWD_PER_USD
            # Alpha OVERVIEW beta is refreshed by the daily job.  Use a neutral
            # temporary beta here; fetch_market_data replaces it when available.
            companies[ticker] = {
                "status": "ready", "company": name, "fiscalPeriodEnd": fiscal_end,
                "revenueTTM": revenue, "operatingCashflowTTM": operating_cashflow,
                "fcfTTM": fcf, "fcfMarginTTM": ttm_margin,
                "fcfMargin3yMedian": median_margin, "normalizedFcfMargin": normalized,
                "ttmWeight": ttm_weight, "terminalGrowth": TERMINAL_GROWTH,
                "riskFreeRate": RISK_FREE_RATE, "equityRiskPremium": EQUITY_RISK_PREMIUM,
                "reportingCurrency": reporting_currency, "modelCurrency": "USD", "fxRateToUsd": fx_rate_to_usd,
                "rationale": rationale, "source": "Alpha Vantage INCOME_STATEMENT + CASH_FLOW（公司申报财报）" + (f"；TSMC 金额按 1 USD = {TSM_TWD_PER_USD:.1f} TWD 换算" if ticker == "TSM" else ""),
            }
        except Exception as exc:
            companies[ticker] = {"status": "unavailable", "company": name, "reason": str(exc), "rationale": rationale}
    # A rate-limit response for every symbol is not a successful refresh. In
    # that situation keep the last known file intact and return a non-zero
    # exit code so the PowerShell wrapper and GitHub Action cannot report a
    # misleading success.
    ready_count = sum(company.get("status") == "ready" for company in companies.values())
    if ready_count == 0:
        raise SystemExit(
            "No usable fundamentals were returned. Alpha Vantage likely hit its "
            "daily limit; fundamentals.json was left unchanged."
        )

    target = Path("outputs/data/fundamentals.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "companies": companies}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
