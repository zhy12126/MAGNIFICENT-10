"""Fail CI when refreshed company-model inputs are incomplete or inconsistent."""
import json
from datetime import date, datetime, timezone
from pathlib import Path

TARGET = Path("outputs/data/fundamentals.json")
EXPECTED = {"NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "TSM", "MU", "AVGO", "AMD", "SKHY"}
US_WITH_SEC_BALANCE = EXPECTED - {"TSM", "SKHY"}
MODEL_FIELDS = (
    "fiscalPeriodEnd", "revenueTTM", "operatingCashflowTTM", "fcfTTM",
    "netIncomeTTM", "fcfMarginTTM", "fcfMargin3yMedian",
    "normalizedFcfMargin", "ttmWeight", "terminalGrowth",
    "riskFreeRate", "equityRiskPremium",
)


def parsed_date(value):
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def main():
    payload = json.loads(TARGET.read_text(encoding="utf-8"))
    companies = payload.get("companies", {})
    issues = []
    missing = EXPECTED - set(companies)
    extra = set(companies) - EXPECTED
    if missing:
        issues.append(f"missing companies: {', '.join(sorted(missing))}")
    if extra:
        issues.append(f"unexpected companies: {', '.join(sorted(extra))}")
    try:
        updated = datetime.fromisoformat(payload["updatedAt"].replace("Z", "+00:00"))
        age_hours = (datetime.now(timezone.utc) - updated).total_seconds() / 3600
        if age_hours < -1 or age_hours > 48:
            issues.append(f"updatedAt is not from this refresh: {payload['updatedAt']}")
    except (KeyError, TypeError, ValueError):
        issues.append("updatedAt is missing or invalid")

    for ticker in sorted(EXPECTED & set(companies)):
        model = companies[ticker]
        if model.get("status") != "ready":
            issues.append(f"{ticker}: model status={model.get('status')}")
            continue
        absent = [field for field in MODEL_FIELDS if model.get(field) is None]
        if absent:
            issues.append(f"{ticker}: missing model fields {', '.join(absent)}")
        fiscal_end = parsed_date(model.get("fiscalPeriodEnd"))
        if not fiscal_end or fiscal_end > date.today():
            issues.append(f"{ticker}: invalid fiscalPeriodEnd={model.get('fiscalPeriodEnd')}")
        if ticker in US_WITH_SEC_BALANCE:
            balance_end = parsed_date(model.get("balanceSheetPeriodEnd"))
            if model.get("equityValueAdjustmentUsd") is None or not balance_end:
                issues.append(f"{ticker}: missing SEC balance-sheet adjustment")
            # SEC Company Facts can lag a just-filed 10-Q. Allow the immediately
            # preceding quarter, but reject older or future balance sheets.
            elif fiscal_end and not (-110 <= (balance_end - fiscal_end).days <= 14):
                issues.append(
                    f"{ticker}: balance-sheet period {balance_end} does not match filing {fiscal_end}"
                )
        if ticker == "TSM" and not (0 < float(model.get("fxRateToUsd") or 0) < 0.1):
            issues.append("TSM: invalid TWD/USD conversion")

    if issues:
        raise SystemExit("\n".join(issues))
    print(f"Fundamentals validation passed for {len(EXPECTED)} companies.")


if __name__ == "__main__":
    main()
