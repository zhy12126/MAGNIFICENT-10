"""Copy refreshed company-model inputs into the static page snapshot.

This intentionally makes no network request.  The fundamentals workflow has
already fetched the filings; this step lets the detail page use them right
away instead of waiting for the next market-data run.
"""

from __future__ import annotations

import json
import math
from pathlib import Path


STOCKS_PATH = Path("outputs/data/stocks.json")
FUNDAMENTALS_PATH = Path("outputs/data/fundamentals.json")
MIN_RELIABLE_NORMALIZED_FCF_MARGIN = 0.03


def market_cap(value: object) -> float | None:
    text = str(value or "").strip().replace("$", "").replace(",", "")
    if not text or text == "—":
        return None
    multiplier = 1e12 if text.upper().endswith("T") else 1e9 if text.upper().endswith("B") else 1
    try:
        return float(text[:-1] if multiplier != 1 else text) * multiplier
    except ValueError:
        return None


def number(value: object) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def implied_growth(market_capitalization: float | None, model: dict) -> tuple[str, str, str | None]:
    """Same reverse-FCFE calculation as the daily job, without its API setup."""
    if not market_capitalization or market_capitalization <= 0 or not model:
        return "—", "unavailable", "缺少市值或公司级财报模型输入。"
    revenue = number(model.get("revenueTTM"))
    current_margin = number(model.get("fcfMarginTTM"))
    target_margin = number(model.get("normalizedFcfMargin"))
    cost_of_equity = number(model.get("costOfEquity"))
    terminal_growth = number(model.get("terminalGrowth"))
    adjustment = number(model.get("equityValueAdjustmentUsd")) or 0
    if not all(value is not None for value in (revenue, current_margin, target_margin, cost_of_equity, terminal_growth)):
        return "—", "unavailable", "模型输入不完整，暂不反推隐含增长率。"
    if revenue <= 0 or cost_of_equity <= terminal_growth:
        return "—", "unavailable", "收入或折现参数不满足模型计算条件。"
    if target_margin <= 0:
        return "—", "unavailable", "归一化自由现金流率为负，终值模型没有经济上有效的解。"
    if target_margin < MIN_RELIABLE_NORMALIZED_FCF_MARGIN:
        return "—", "high_uncertainty", f"归一化自由现金流率仅为 {target_margin * 100:.1f}%，受大额资本开支影响，暂不将反推结果作为常规增长率展示。"

    operating_equity_value = market_capitalization - adjustment
    if operating_equity_value <= 0:
        return "—", "unavailable", "净现金及非经营资产调整超过当前市值。"

    def equity_value(growth: float) -> float:
        value = 0.0
        for year in range(1, 6):
            margin = current_margin + (target_margin - current_margin) * year / 5
            value += revenue * (1 + growth) ** year * margin / (1 + cost_of_equity) ** year
        terminal_fcfe = revenue * (1 + growth) ** 5 * target_margin * (1 + terminal_growth)
        return value + terminal_fcfe / (cost_of_equity - terminal_growth) / (1 + cost_of_equity) ** 5

    low, high = -0.30, 1.50
    for _ in range(60):
        middle = (low + high) / 2
        if equity_value(middle) < operating_equity_value:
            low = middle
        else:
            high = middle
    if not math.isfinite(equity_value(high)) or equity_value(high) < operating_equity_value:
        return ">150%", "ready", None
    return f"{max(-30, min(150, high * 100)):.0f}%", "ready", None


def main() -> None:
    fundamentals = json.loads(FUNDAMENTALS_PATH.read_text(encoding="utf-8"))
    payload = json.loads(STOCKS_PATH.read_text(encoding="utf-8"))
    companies = fundamentals.get("companies", {})
    changed = 0

    for stock in payload.get("stocks", []):
        fresh = companies.get(stock.get("ticker"))
        if not fresh:
            continue
        # Beta and the latest market cap are market-data fields, so retain the
        # cached versions while replacing all filing-derived inputs.
        model = {**(stock.get("valuationModel") or {}), **fresh}
        provider_date, actual_date = fresh.get("fiscalPeriodEnd"), stock.get("ttmPeriodEnd")
        provider_quarter = str(provider_date or "")[:7]
        actual_quarter = str(actual_date or "")[:7]
        if provider_date and actual_date and (
            provider_quarter == actual_quarter
            or (str(provider_date)[:4] == str(actual_date)[:4]
                and (int(str(provider_date)[5:7]) - 1) // 3 == (int(str(actual_date)[5:7]) - 1) // 3)
        ):
            model["providerFiscalPeriodEnd"] = provider_date
            model["fiscalPeriodEndActual"] = actual_date
            model["fiscalPeriodEnd"] = actual_date
        beta = model.get("beta")
        if model.get("status") == "ready" and beta is not None:
            try:
                model["costOfEquity"] = float(model["riskFreeRate"]) + float(beta) * float(model["equityRiskPremium"])
            except (KeyError, TypeError, ValueError):
                pass
        implied, status, note = implied_growth(market_cap(stock.get("cap")), model)
        model["impliedGrowthStatus"] = status
        model["impliedGrowthNote"] = note
        stock["valuationModel"] = model
        stock["implied"] = implied
        changed += 1

    payload["fundamentalsUpdatedAt"] = fundamentals.get("updatedAt")
    STOCKS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Synced refreshed filing inputs into {changed} stock records.")


if __name__ == "__main__":
    main()
