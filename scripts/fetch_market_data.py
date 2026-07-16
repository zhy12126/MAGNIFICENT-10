"""Fetch a daily, static valuation snapshot from Alpha Vantage.

The job makes 20 calls (OVERVIEW + GLOBAL_QUOTE for 10 tickers), which is
within Alpha Vantage's 25 requests/day free allowance.  It intentionally uses
end-of-day data; it is not a real-time market-data service.
"""
import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

API_KEY = os.environ.get("ALPHA_VANTAGE_API_KEY")
if not API_KEY:
    raise SystemExit("Missing ALPHA_VANTAGE_API_KEY GitHub secret.")

COMPANIES = [
    ("NVIDIA", "NVDA", "N", "#d5f4b4", "#55a62f", .27),
    ("Apple", "AAPL", "●", "#111", "#fff", .25),
    ("Microsoft", "MSFT", "▦", "#e9f2ff", "#1676d2", .30),
    ("Alphabet", "GOOGL", "G", "#fff5e7", "#4285f4", .27),
    ("Amazon", "AMZN", "a", "#fff0dc", "#111", .22),
    ("Meta", "META", "∞", "#eaf1ff", "#1768df", .31),
    ("Tesla", "TSLA", "T", "#ffe8e8", "#d93232", .16),
    ("SpaceX", "SPCX", "✦", "#e9eef9", "#182c50", .24),
    ("TSMC", "TSM", "◌", "#eaf8fb", "#20899b", .29),
    ("Micron", "MU", "μ", "#e8f7ed", "#16834c", .22),
]

def call(function, symbol):
    query = urlencode({"function": function, "symbol": symbol, "apikey": API_KEY})
    with urlopen(f"https://www.alphavantage.co/query?{query}", timeout=30) as response:
        payload = json.load(response)
    if "Note" in payload or "Information" in payload or "Error Message" in payload:
        raise RuntimeError(f"Alpha Vantage {symbol}/{function}: {payload}")
    return payload

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

def implied_growth(ps, margin):
    """Reverse-DCF 5y revenue CAGR; WACC=9%, terminal growth=3%."""
    if ps is None or ps <= 0:
        return "—"
    wacc, terminal = .09, .03
    def multiple(growth):
        flows = sum(margin * (1 + growth) ** year / (1 + wacc) ** year for year in range(1, 6))
        terminal_value = margin * (1 + growth) ** 5 * (1 + terminal) / (wacc - terminal)
        return flows + terminal_value / (1 + wacc) ** 5
    low, high = -.30, 1.50
    for _ in range(60):
        mid = (low + high) / 2
        if multiple(mid) < ps:
            low = mid
        else:
            high = mid
    return f"{max(-30, min(150, high * 100)):.0f}%"

def main():
    stocks = []
    for i, (name, ticker, logo, color, ink, margin) in enumerate(COMPANIES):
        overview = call("OVERVIEW", ticker)
        time.sleep(13)  # stay below the free-tier minute rate limit
        quote = call("GLOBAL_QUOTE", ticker).get("Global Quote", {})
        if i < len(COMPANIES) - 1:
            time.sleep(13)
        market_cap = number(overview.get("MarketCapitalization"))
        ps = number(overview.get("PriceToSalesRatioTTM"))
        growth = number(overview.get("QuarterlyRevenueGrowthYOY"))
        price = number(quote.get("05. price"))
        stocks.append({
            "name": name, "ticker": ticker, "logo": logo, "color": color, "ink": ink,
            "cap": money(market_cap), "pe": ratio(number(overview.get("PERatio"))),
            "fpe": ratio(number(overview.get("ForwardPE"))), "peg": ratio(number(overview.get("PEGRatio"))),
            "ps": ratio(ps), "pcf": "—", "implied": implied_growth(ps, margin),
            "growth": "—" if growth is None else f"{growth * 100:.0f}%",
            "price": "—" if price is None else f"${price:,.2f}",
            "note": "数据来源：Alpha Vantage。隐含增长率为反向 DCF 模型推算值，并非分析师预测。"
        })
    output = {"source": "Alpha Vantage", "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "stocks": stocks}
    target = Path("outputs/data/stocks.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
