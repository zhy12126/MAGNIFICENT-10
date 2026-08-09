"""Add SEC-sourced net-cash adjustments to reverse-valuation inputs."""
import json
import os
from datetime import date, timedelta
from pathlib import Path
from urllib.request import Request, urlopen

TARGET = Path("outputs/data/fundamentals.json")
USER_AGENT = os.environ.get("SEC_EDGAR_USER_AGENT", "").strip()
CIKS = {
    "NVDA": "0001045810", "AAPL": "0000320193", "MSFT": "0000789019",
    "GOOGL": "0001652044", "AMZN": "0001018724", "META": "0001326801",
    "TSLA": "0001318605", "MU": "0000723125", "AVGO": "0001730168",
    "AMD": "0000002488",
}
CASH_TAGS = (
    "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    "CashAndCashEquivalentsAtCarryingValue",
)
INVESTMENT_TAGS = ("ShortTermInvestments", "MarketableSecuritiesCurrent")
TOTAL_DEBT_TAGS = ("LongTermDebtAndFinanceLeaseObligationsCurrent", "LongTermDebtCurrent")
LONG_DEBT_TAGS = ("LongTermDebtAndFinanceLeaseObligationsNoncurrent", "LongTermDebtNoncurrent")


def facts(cik):
    request = Request(
        f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json",
        headers={"User-Agent": USER_AGENT},
    )
    with urlopen(request, timeout=45) as response:
        return json.load(response).get("facts", {}).get("us-gaap", {})


def latest_value(payload, tags, not_after):
    candidates = []
    for tag in tags:
        for row in payload.get(tag, {}).get("units", {}).get("USD", []):
            try:
                end = date.fromisoformat(row.get("end", ""))
                filed = date.fromisoformat(row.get("filed", ""))
                value = float(row["val"])
            except (KeyError, TypeError, ValueError):
                continue
            if end <= not_after and row.get("form") in {"10-Q", "10-K"}:
                candidates.append((end, filed, value))
    return max(candidates, default=(None, None, None))


def main():
    if not USER_AGENT or "@" not in USER_AGENT:
        raise SystemExit("Missing SEC_EDGAR_USER_AGENT with contact email.")
    data = json.loads(TARGET.read_text(encoding="utf-8"))
    for ticker, cik in CIKS.items():
        model = data.get("companies", {}).get(ticker)
        if not model or model.get("status") != "ready":
            continue
        # Some providers normalize 52/53-week fiscal periods to month-end.
        # A seven-day tolerance still selects the same quarter while allowing
        # the issuer's actual weekend fiscal close (for example Broadcom).
        period = date.fromisoformat(model["fiscalPeriodEnd"]) + timedelta(days=7)
        payload = facts(cik)
        cash = latest_value(payload, CASH_TAGS, period)
        investments = latest_value(payload, INVESTMENT_TAGS, period)
        current_debt = latest_value(payload, TOTAL_DEBT_TAGS, period)
        long_debt = latest_value(payload, LONG_DEBT_TAGS, period)
        if cash[2] is None:
            print(f"{ticker}: no auditable SEC cash balance; adjustment omitted")
            continue
        cash_and_investments = cash[2] + (investments[2] or 0)
        debt = (current_debt[2] or 0) + (long_debt[2] or 0)
        model.update({
            "cashAndShortTermInvestmentsUsd": cash_and_investments,
            "totalDebtUsd": debt,
            "equityValueAdjustmentUsd": cash_and_investments - debt,
            "balanceSheetPeriodEnd": cash[0].isoformat(),
            "balanceSheetAdjustmentSource": "SEC Company Facts: cash + current marketable securities - debt",
        })
        print(f"{ticker}: net-cash adjustment {(cash_and_investments - debt) / 1e9:.1f}B USD")
    TARGET.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
