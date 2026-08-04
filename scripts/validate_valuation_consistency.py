"""Audit (and optionally normalize) snapshot/history valuation consistency."""
import argparse
import json
from datetime import date
from pathlib import Path

HISTORY = Path("outputs/data/history.json")
STOCKS = Path("outputs/data/stocks.json")
METRICS = ("pe", "pcf", "ps")


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fix", action="store_true")
    args = parser.parse_args()
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    stocks_payload = json.loads(STOCKS.read_text(encoding="utf-8"))
    stocks = {row["ticker"]: row for row in stocks_payload.get("stocks", [])}
    issues = []

    if args.fix:
        history["stocks"] = {ticker: rows for ticker, rows in history.get("stocks", {}).items() if ticker in stocks}
        for ticker, rows in history["stocks"].items():
            cleaned = {}
            for row in rows:
                try:
                    weekend = date.fromisoformat(row["date"]).weekday() >= 5
                except (KeyError, ValueError):
                    weekend = True
                if weekend:
                    continue
                if any(row.get(metric) is not None for metric in METRICS) and not row.get("ttmPeriodEnd"):
                    row = {key: value for key, value in row.items() if key not in METRICS}
                if len(row) > 1:
                    cleaned[row["date"]] = row
            history["stocks"][ticker] = [cleaned[key] for key in sorted(cleaned)]
        HISTORY.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for ticker, stock in stocks.items():
        rows = history.get("stocks", {}).get(ticker, [])
        as_of = stock.get("valuationAsOf")
        matching = next((row for row in reversed(rows) if row.get("date") == as_of), None)
        if not as_of or not matching:
            issues.append(f"{ticker}: no history row matching snapshot valuationAsOf={as_of}")
            continue
        if matching.get("ttmPeriodEnd") != stock.get("ttmPeriodEnd"):
            issues.append(f"{ticker}: TTM period mismatch snapshot={stock.get('ttmPeriodEnd')} history={matching.get('ttmPeriodEnd')}")
        for metric in METRICS:
            snapshot_value, history_value = number(stock.get(metric)), number(matching.get(metric))
            if snapshot_value is None and history_value is None:
                continue
            if snapshot_value is None or history_value in (None, 0):
                issues.append(f"{ticker}: {metric} missing on one side")
                continue
            if round(snapshot_value, 1) != round(history_value, 1):
                difference = abs(snapshot_value / history_value - 1)
                issues.append(f"{ticker}: {metric} differs by {difference * 100:.2f}%")
        if len([row for row in rows if row.get("ttmPeriodEnd")]) < 1000 and ticker not in {"SKHY"}:
            issues.append(f"{ticker}: fewer than 1000 auditable five-year valuation rows")

    weekend_rows = [
        f"{ticker}:{row['date']}" for ticker, rows in history.get("stocks", {}).items() for row in rows
        if date.fromisoformat(row["date"]).weekday() >= 5
    ]
    if weekend_rows:
        issues.append(f"non-trading weekend rows remain: {', '.join(weekend_rows[:8])}")
    unaudited = [
        f"{ticker}:{row['date']}" for ticker, rows in history.get("stocks", {}).items() for row in rows
        if any(row.get(metric) is not None for metric in METRICS) and not row.get("ttmPeriodEnd")
    ]
    if unaudited:
        issues.append(f"valuation rows without TTM metadata remain: {', '.join(unaudited[:8])}")
    if issues:
        print("\n".join(issues))
        raise SystemExit(1)
    print(f"Consistency check passed for {len(stocks)} stocks.")


if __name__ == "__main__":
    main()
