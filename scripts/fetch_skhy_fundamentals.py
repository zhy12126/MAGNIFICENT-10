"""Refresh only SKHY's company model from the Korean primary listing."""
import json
import statistics
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf

from sync_fundamentals_to_stocks import implied_growth, market_cap
from skhy_financial_data import latest_ttm

FUNDAMENTALS = Path("outputs/data/fundamentals.json")
STOCKS = Path("outputs/data/stocks.json")
RISK_FREE_RATE = .0425
EQUITY_RISK_PREMIUM = .0500
TERMINAL_GROWTH = .025
TTM_WEIGHT = .35


def value(frame, label, column):
    try:
        result = float(frame.loc[label, column])
        return result if result == result else None
    except (KeyError, TypeError, ValueError):
        return None


def main():
    ticker = yf.Ticker("000660.KS")
    ttm = latest_ttm(ticker)
    if not ttm:
        raise SystemExit("SK hynix does not have four comparable quarterly statements; files were left unchanged.")
    revenue, net_income = ttm["revenue"], ttm["netIncome"]
    cfo, capex = ttm["operatingCashflow"], ttm["capitalExpenditure"]
    if min(revenue, cfo, capex) <= 0:
        raise SystemExit("SK hynix quarterly cash-flow inputs are incomplete; files were left unchanged.")
    fcf = cfo - capex

    annual_income, annual_cash = ticker.income_stmt, ticker.cashflow
    margins = []
    for col in sorted(set(annual_income.columns) & set(annual_cash.columns), reverse=True):
        annual_revenue = value(annual_income, "Total Revenue", col)
        annual_cfo = value(annual_cash, "Operating Cash Flow", col)
        annual_capex = value(annual_cash, "Capital Expenditure", col)
        if annual_revenue and annual_cfo is not None and annual_capex is not None:
            margins.append((annual_cfo - abs(annual_capex)) / annual_revenue)
    if len(margins) < 3:
        raise SystemExit("SK hynix does not have three comparable annual cash-flow statements; files were left unchanged.")
    median_margin = statistics.median(margins[:3])
    ttm_margin = fcf / revenue
    normalized_margin = TTM_WEIGHT * ttm_margin + (1 - TTM_WEIGHT) * median_margin

    beta = float(ticker.info.get("beta"))

    fx_history = yf.download("KRW=X", period="5d", progress=False, auto_adjust=False)["Close"]
    if getattr(fx_history, "ndim", 1) > 1:
        fx_history = fx_history.iloc[:, 0]
    krw_per_usd = float(fx_history.dropna().iloc[-1])
    model = {
        "status": "ready", "company": "SK hynix", "fiscalPeriodEnd": ttm["periodEnd"].isoformat(),
        "revenueTTM": revenue / krw_per_usd, "operatingCashflowTTM": cfo / krw_per_usd,
        "fcfTTM": fcf / krw_per_usd, "netIncomeTTM": net_income / krw_per_usd,
        "fcfMarginTTM": ttm_margin, "fcfMargin3yMedian": median_margin,
        "normalizedFcfMargin": normalized_margin, "ttmWeight": TTM_WEIGHT,
        "terminalGrowth": TERMINAL_GROWTH, "riskFreeRate": RISK_FREE_RATE,
        "equityRiskPremium": EQUITY_RISK_PREMIUM, "reportingCurrency": "KRW",
        "modelCurrency": "USD", "fxRateToUsd": 1 / krw_per_usd,
        "beta": beta, "costOfEquity": RISK_FREE_RATE + beta * EQUITY_RISK_PREMIUM,
        "rationale": "DRAM 与 NAND 周期显著，TTM 权重 35%，三年中位数权重 65%。",
        "source": ttm["source"] + "; KRW translated at latest KRW/USD",
        "sourceUrl": ttm.get("sourceUrl"), "availableFrom": ttm["available"].isoformat(),
    }
    payload = json.loads(FUNDAMENTALS.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload.setdefault("companies", {})["SKHY"] = model
    payload["updatedAt"] = now
    FUNDAMENTALS.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    stocks = json.loads(STOCKS.read_text(encoding="utf-8"))
    for stock in stocks.get("stocks", []):
        if stock.get("ticker") != "SKHY":
            continue
        merged = {**(stock.get("valuationModel") or {}), **model}
        merged.pop("reason", None)
        beta = merged.get("beta")
        if beta is not None:
            merged["costOfEquity"] = RISK_FREE_RATE + float(beta) * EQUITY_RISK_PREMIUM
        implied, status, note = implied_growth(market_cap(stock.get("cap")), merged)
        merged["impliedGrowthStatus"], merged["impliedGrowthNote"] = status, note
        stock["valuationModel"], stock["implied"] = merged, implied
        break
    stocks["fundamentalsUpdatedAt"] = now
    STOCKS.write_text(json.dumps(stocks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"SKHY fundamentals ready through {model['fiscalPeriodEnd']}; other companies preserved")


if __name__ == "__main__":
    main()
