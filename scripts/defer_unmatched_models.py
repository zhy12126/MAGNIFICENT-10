"""Hold back company models that the valuation history cannot match yet.

Alpha Vantage can publish a quarter from the earnings release before the 10-Q
reaches SEC EDGAR, so the history backfill cannot rebuild that quarter yet.
Rather than fail the whole filing run, keep the last committed model for those
companies; a later run fetches the quarter again once SEC has the filing.
"""
import json
import subprocess
from datetime import date
from pathlib import Path

FUNDAMENTALS = Path("outputs/data/fundamentals.json")
STOCKS = Path("outputs/data/stocks.json")
HISTORY = Path("outputs/data/history.json")


def quarter(value):
    try:
        parsed = date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    return parsed.year, (parsed.month - 1) // 3 + 1


def committed(path):
    result = subprocess.run(["git", "show", f"HEAD:{path.as_posix()}"], capture_output=True, check=True)
    return json.loads(result.stdout.decode("utf-8"))


def main():
    fundamentals = json.loads(FUNDAMENTALS.read_text(encoding="utf-8"))
    stocks = json.loads(STOCKS.read_text(encoding="utf-8"))
    history = json.loads(HISTORY.read_text(encoding="utf-8")).get("stocks", {})
    deferred = []
    for ticker, model in fundamentals.get("companies", {}).items():
        model_quarter = quarter(model.get("fiscalPeriodEnd"))
        history_quarter = max((quarter(row["ttmPeriodEnd"]) for row in history.get(ticker, []) if row.get("ttmPeriodEnd")), default=None)
        if model_quarter and history_quarter and history_quarter < model_quarter:
            deferred.append(ticker)
    if not deferred:
        print("Valuation history matches every company model.")
        return
    previous_models = committed(FUNDAMENTALS).get("companies", {})
    previous_stocks = {stock["ticker"]: stock for stock in committed(STOCKS).get("stocks", [])}
    for ticker in deferred:
        if ticker in previous_models:
            fundamentals["companies"][ticker] = previous_models[ticker]
        for stock in stocks.get("stocks", []):
            if stock.get("ticker") == ticker and ticker in previous_stocks:
                stock["valuationModel"] = previous_stocks[ticker].get("valuationModel")
                stock["implied"] = previous_stocks[ticker].get("implied")
    FUNDAMENTALS.write_text(json.dumps(fundamentals, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    STOCKS.write_text(json.dumps(stocks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Deferred company models until valuation history reaches their quarter: {', '.join(deferred)}")


if __name__ == "__main__":
    main()
