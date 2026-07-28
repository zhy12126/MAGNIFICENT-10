"""Fetch a daily, static valuation snapshot from Alpha Vantage and Yahoo Finance.

SKHY uses Yahoo Finance because Alpha Vantage's free OVERVIEW endpoint does not
publish fundamental fields for that new US ADR.  The remaining 11 stocks plus
SPY consume 23 Alpha Vantage requests/day.  Data is end-of-day, not real-time.
"""
import json
import math
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY")
if not API_KEY:
    raise SystemExit("Missing ALPHA_VANTAGE_API_KEY GitHub secret.")

COMPANIES = [
    ("NVIDIA", "NVDA", "N", "#d5f4b4", "#55a62f"),
    ("Apple", "AAPL", "●", "#111", "#fff"),
    ("Microsoft", "MSFT", "▦", "#e9f2ff", "#1676d2"),
    ("Alphabet", "GOOGL", "G", "#fff5e7", "#4285f4"),
    ("Amazon", "AMZN", "a", "#fff0dc", "#111"),
    ("Meta", "META", "∞", "#eaf1ff", "#1768df"),
    ("Tesla", "TSLA", "T", "#ffe8e8", "#d93232"),
    ("TSMC", "TSM", "◌", "#eaf8fb", "#20899b"),
    ("Micron", "MU", "μ", "#e8f7ed", "#16834c"),
    ("Broadcom", "AVGO", "B", "#fff0ea", "#d34b28"),
    ("AMD", "AMD", "A", "#fff2eb", "#d34b28"),
    ("SK hynix", "SKHY", "H", "#fff0ea", "#d04d34"),
]
MIN_RELIABLE_NORMALIZED_FCF_MARGIN = .03

def call(function, symbol):
    query = urlencode({"function": function, "symbol": symbol, "apikey": API_KEY})
    with urlopen(f"https://www.alphavantage.co/query?{query}", timeout=30) as response:
        payload = json.load(response)
    if "Note" in payload or "Information" in payload or "Error Message" in payload:
        message = payload.get("Note") or payload.get("Information") or payload.get("Error Message") or "request rejected"
        message = re.sub(r"API key as\s+[A-Za-z0-9_-]+", "API key", message, flags=re.I)
        raise RuntimeError(f"Alpha Vantage {symbol}/{function} rejected the request: {message}")
    return payload

def yahoo_value(value):
    """Yahoo quoteSummary returns most values as {raw, fmt}; accept either."""
    return value.get("raw") if isinstance(value, dict) else value

def yahoo_skhY_snapshot():
    """Return SKHY fields mapped to the Alpha Vantage-shaped keys used below."""
    modules = "price,summaryDetail,defaultKeyStatistics,financialData"
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/SKHY?modules={modules}"
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 HY-Market10/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.load(response)
        result = payload.get("quoteSummary", {}).get("result", [])
        if not result:
            raise RuntimeError("Yahoo Finance returned no SKHY quoteSummary result")
        data = result[0]
        price_data = data.get("price", {})
        summary = data.get("summaryDetail", {})
        statistics = data.get("defaultKeyStatistics", {})
        financial = data.get("financialData", {})
        price = yahoo_value(price_data.get("regularMarketPrice"))
        change = yahoo_value(price_data.get("regularMarketChangePercent"))
        overview = {
            "MarketCapitalization": yahoo_value(price_data.get("marketCap")),
            "PERatio": yahoo_value(summary.get("trailingPE")),
            "ForwardPE": yahoo_value(summary.get("forwardPE")),
            "PEGRatio": yahoo_value(statistics.get("pegRatio")),
            "PriceToSalesRatioTTM": yahoo_value(summary.get("priceToSalesTrailing12Months")),
            "EVToEBITDA": yahoo_value(statistics.get("enterpriseToEbitda")),
            "QuarterlyRevenueGrowthYOY": yahoo_value(financial.get("revenueGrowth")),
            "QuarterlyEarningsGrowthYOY": yahoo_value(financial.get("earningsGrowth")),
            "Beta": yahoo_value(statistics.get("beta")),
        }
        quote = {
            "05. price": price,
            "10. change percent": "—" if change is None else f"{float(change) * 100:.4f}%",
        }
        return overview, quote
    except Exception as exc:
        # Some Yahoo regions expose the compact quote endpoint while blocking
        # quoteSummary's crumb-protected route. It carries the same core
        # valuation fields, so try it before falling back to price-only chart.
        try:
            quote_url = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=SKHY"
            with urlopen(Request(quote_url, headers={"User-Agent": "Mozilla/5.0 HY-Market10/1.0"}), timeout=30) as response:
                result = json.load(response).get("quoteResponse", {}).get("result", [])
            if not result:
                raise RuntimeError("Yahoo Finance quote returned no SKHY result")
            row = result[0]
            overview = {
                "MarketCapitalization": row.get("marketCap"),
                "PERatio": row.get("trailingPE"),
                "ForwardPE": row.get("forwardPE"),
                "PEGRatio": row.get("pegRatio"),
                "PriceToSalesRatioTTM": row.get("priceToSalesTrailing12Months"),
                "EVToEBITDA": row.get("enterpriseToEbitda"),
                "QuarterlyRevenueGrowthYOY": row.get("revenueGrowth"),
                "QuarterlyEarningsGrowthYOY": row.get("earningsGrowth"),
                "Beta": row.get("beta"),
            }
            quote = {
                "05. price": row.get("regularMarketPrice"),
                "10. change percent": "—" if row.get("regularMarketChangePercent") is None else f"{float(row['regularMarketChangePercent']) * 100:.4f}%",
            }
            return overview, quote
        except Exception as quote_exc:
            quote_error = quote_exc
        # Yahoo's chart endpoint has a broader public availability and at
        # least preserves a fresh ADR quote if valuation routes are rate-limited.
        # Fundamental values then fall back to the prior successful snapshot.
        chart_url = "https://query1.finance.yahoo.com/v8/finance/chart/SKHY?range=5d&interval=1d"
        try:
            with urlopen(Request(chart_url, headers={"User-Agent": "Mozilla/5.0 HY-Market10/1.0"}), timeout=30) as response:
                chart = json.load(response).get("chart", {}).get("result", [])[0]
            closes = [value for value in chart.get("indicators", {}).get("quote", [{}])[0].get("close", []) if value is not None]
            if not closes:
                raise RuntimeError("Yahoo Finance chart returned no SKHY closes")
            price = closes[-1]
            previous = closes[-2] if len(closes) > 1 else None
            change = "—" if not previous else f"{(price / previous - 1) * 100:.4f}%"
            return {}, {"05. price": price, "10. change percent": change}
        except Exception as chart_exc:
            raise RuntimeError(f"Yahoo Finance SKHY snapshot failed: {exc}; quote fallback failed: {quote_error}; chart fallback failed: {chart_exc}") from chart_exc

def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

def ratio(value):
    return "—" if value is None else f"{value:.1f}"

def money(value):
    if value is None:
        return "—"
    return f"{value / 1e12:.2f}T" if value >= 1e12 else f"{value / 1e9:.0f}B"

def implied_growth(market_cap, model):
    """Company-specific reverse FCFE model, using cached reported fundamentals."""
    if market_cap is None or market_cap <= 0 or not model:
        return "—", "unavailable", "缺少市值或公司级财报模型输入。"
    revenue = number(model.get("revenueTTM"))
    current_margin = number(model.get("fcfMarginTTM"))
    target_margin = number(model.get("normalizedFcfMargin"))
    cost_of_equity = number(model.get("costOfEquity"))
    terminal = number(model.get("terminalGrowth"))
    if not all(x is not None for x in (revenue, current_margin, target_margin, cost_of_equity, terminal)):
        return "—", "unavailable", "模型输入不完整，暂不反推隐含增长率。"
    if revenue <= 0 or cost_of_equity <= terminal:
        return "—", "unavailable", "收入或折现参数不满足模型计算条件。"
    if target_margin <= 0:
        return "—", "unavailable", "归一化自由现金流率为负，终值模型没有经济上有效的解。"
    if target_margin < MIN_RELIABLE_NORMALIZED_FCF_MARGIN:
        return "—", "high_uncertainty", f"归一化自由现金流率仅为 {target_margin * 100:.1f}%，受大额资本开支影响，暂不将反推结果作为常规增长率展示。"

    def equity_value(growth):
        pv = 0
        for year in range(1, 6):
            margin = current_margin + (target_margin - current_margin) * year / 5
            fcfe = revenue * (1 + growth) ** year * margin
            pv += fcfe / (1 + cost_of_equity) ** year
        terminal_fcfe = revenue * (1 + growth) ** 5 * target_margin * (1 + terminal)
        terminal_value = terminal_fcfe / (cost_of_equity - terminal)
        return pv + terminal_value / (1 + cost_of_equity) ** 5
    low, high = -.30, 1.50
    for _ in range(60):
        mid = (low + high) / 2
        if equity_value(mid) < market_cap:
            low = mid
        else:
            high = mid
    if equity_value(high) < market_cap:
        return ">150%", "ready", None
    return f"{max(-30, min(150, high * 100)):.0f}%", "ready", None

def main():
    fundamentals_path = Path("outputs/data/fundamentals.json")
    fundamentals = {}
    if fundamentals_path.exists():
        fundamentals = json.loads(fundamentals_path.read_text(encoding="utf-8")).get("companies", {})
    # A temporary Alpha Vantage OVERVIEW omission must not erase the last
    # successful fundamental snapshot. Quotes are independent and may still be
    # fresh, so we retain the prior ratios/model and update only price/change.
    target = Path("outputs/data/stocks.json")
    previous_stocks = {}
    if target.exists():
        previous_stocks = {
            stock.get("ticker"): stock
            for stock in json.loads(target.read_text(encoding="utf-8")).get("stocks", [])
            if stock.get("ticker")
        }
    stocks = []
    for i, (name, ticker, logo, color, ink) in enumerate(COMPANIES):
        if ticker == "SKHY":
            overview, quote = yahoo_skhY_snapshot()
        else:
            overview = call("OVERVIEW", ticker)
            time.sleep(13)  # stay below the free-tier minute rate limit
            quote = call("GLOBAL_QUOTE", ticker).get("Global Quote", {})
            if i < len(COMPANIES) - 2:
                time.sleep(13)
        market_cap = number(overview.get("MarketCapitalization"))
        ps = number(overview.get("PriceToSalesRatioTTM"))
        revenue_growth = number(overview.get("QuarterlyRevenueGrowthYOY"))
        eps_growth = number(overview.get("QuarterlyEarningsGrowthYOY"))
        price = number(quote.get("05. price"))
        change = quote.get("10. change percent", "—")
        prior = previous_stocks.get(ticker, {})
        # Market cap is required for every displayed valuation ratio. If it is
        # absent, OVERVIEW did not return a usable fundamental record (common
        # when the free endpoint is throttled for one symbol).
        if market_cap is None and prior.get("cap") not in (None, "—"):
            retained = dict(prior)
            retained.update({
                "name": name, "ticker": ticker, "logo": logo, "color": color, "ink": ink,
                "price": "—" if price is None else f"${price:,.2f}", "change": change,
            })
            retained["fundamentalsStatus"] = "沿用最近一次有效基本面快照；当日 Alpha Vantage OVERVIEW 未返回该公司数据。"
            stocks.append(retained)
            continue
        model = dict(fundamentals.get(ticker, {}))
        operating_cashflow = number(model.get("operatingCashflowTTM"))
        pcf = market_cap / operating_cashflow if market_cap and operating_cashflow and operating_cashflow > 0 else None
        beta = number(overview.get("Beta"))
        if model.get("status") == "ready":
            if beta is None:
                model["status"] = "unavailable"
                model["reason"] = "缺少可用 Beta，暂不计算权益成本。"
            else:
                model["beta"] = beta
                model["costOfEquity"] = model["riskFreeRate"] + beta * model["equityRiskPremium"]
        implied, implied_status, implied_note = implied_growth(market_cap, model)
        if model:
            model["impliedGrowthStatus"] = implied_status
            model["impliedGrowthNote"] = implied_note
        stocks.append({
            "name": name, "ticker": ticker, "logo": logo, "color": color, "ink": ink,
            "cap": money(market_cap), "pe": ratio(number(overview.get("PERatio"))),
            "fpe": ratio(number(overview.get("ForwardPE"))), "peg": ratio(number(overview.get("PEGRatio"))),
            "ps": ratio(ps), "pcf": ratio(pcf), "evEbitda": ratio(number(overview.get("EVToEBITDA"))),
            "implied": implied,
            # These are most-recent reported-quarter growth rates, not forecasts.
            # Future EPS growth is derived in the browser from trailing and
            # forward PE. Alpha Vantage's free OVERVIEW endpoint does not expose
            # a reliable company-level forward revenue consensus, so we leave
            # that field absent rather than presenting a proxy as an estimate.
            "growth": "—" if revenue_growth is None else f"{revenue_growth * 100:.0f}%",
            "revenueGrowthCurrent": "—" if revenue_growth is None else f"{revenue_growth * 100:.0f}%",
            "epsGrowthCurrent": "—" if eps_growth is None else f"{eps_growth * 100:.0f}%",
            "price": "—" if price is None else f"${price:,.2f}", "change": change,
            "valuationModel": model,
            "note": "数据口径：行情与部分基本面来自 Yahoo Finance（SKHY 美国 ADR）" if ticker == "SKHY" else "数据口径：行情与部分基本面来自 Alpha Vantage；历史估值以 SEC EDGAR 财报 TTM 和历史收盘价计算。隐含增长率为公司级 FCFE 反推，不是分析师预测或投行评级。"
        })
    now = datetime.now(timezone.utc)
    output = {"source": "Alpha Vantage + Yahoo Finance (SKHY)", "updatedAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "stocks": stocks}
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    history_target = Path("outputs/data/history.json")
    history = {"source": "Alpha Vantage", "stocks": {}}
    if history_target.exists():
        history = json.loads(history_target.read_text(encoding="utf-8"))
    day = now.strftime("%Y-%m-%d")
    for stock in stocks:
        rows = history.setdefault("stocks", {}).setdefault(stock["ticker"], [])
        snapshot = {"date": day, "price": number(str(stock.get("price", "")).replace("$", "").replace(",", "")), "pe": number(stock["pe"]), "pcf": number(stock["pcf"]), "ps": number(stock["ps"])}
        if rows and rows[-1]["date"] == day:
            rows[-1] = snapshot
        else:
            rows.append(snapshot)
        history["stocks"][stock["ticker"]] = [row for row in rows if row["date"] >= f"{now.year - 10}-01-01"]
    history["updatedAt"] = output["updatedAt"]
    history_target.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
if __name__ == "__main__":
    main()
