"""Build auditable CNY/JPY history and USD-leg attribution.

ECB daily reference rates are the only approved source. They publish USD, JPY
and CNY against EUR in one same-time table, from which the USD legs are derived.
The output is replaced atomically, so a network or validation failure never
overwrites the last successful snapshot.
"""
from __future__ import annotations

import json
import math
import os
import ssl
import xml.etree.ElementTree as ET
from bisect import bisect_left
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen

try:
    import certifi
except ImportError:  # pragma: no cover
    certifi = None

OUTPUT = Path("outputs/data/yen-rates.json")
ECB_XML = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.xml"
PERIODS = {"30": 30, "180": 180, "365": 365, "1095": 1095, "1825": 1825}
MAX_CHART_POINTS = 240


def ssl_context() -> ssl.SSLContext:
    if certifi is not None:
        return ssl.create_default_context(cafile=certifi.where())
    return ssl.create_default_context()


def fetch_ecb(start: date) -> tuple[dict[str, float], dict[str, float]]:
    request = Request(ECB_XML, headers={"User-Agent": "HY-Tools/1.0 (daily public-data fetch)"})
    with urlopen(request, context=ssl_context(), timeout=45) as response:
        payload = response.read()
    return parse_ecb_xml(payload, start)


def parse_ecb_xml(payload: bytes, start: date) -> tuple[dict[str, float], dict[str, float]]:
    """Parse same-day EUR reference rates from the ECB history XML."""
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as error:
        preview = payload[:120].decode("utf-8", errors="replace").replace("\n", " ")
        raise ValueError(f"ECB returned invalid XML starting with {preview!r}") from error

    eur_rates_by_date: dict[str, dict[str, float]] = {}
    for element in root.iter():
        raw_date = element.attrib.get("time")
        if not raw_date:
            continue
        try:
            observation_date = date.fromisoformat(raw_date)
        except ValueError:
            continue
        if observation_date < start:
            continue
        rates: dict[str, float] = {}
        for child in element:
            currency = child.attrib.get("currency", "").upper()
            raw_rate = child.attrib.get("rate", "")
            if currency not in {"USD", "JPY", "CNY"}:
                continue
            try:
                rate = float(raw_rate)
            except ValueError:
                continue
            if math.isfinite(rate) and rate > 0:
                rates[currency] = rate
        if rates:
            eur_rates_by_date[raw_date] = rates

    usdjpy: dict[str, float] = {}
    usdcny: dict[str, float] = {}
    for raw_date, rates in eur_rates_by_date.items():
        if {"USD", "JPY", "CNY"}.issubset(rates):
            usdjpy[raw_date] = rates["JPY"] / rates["USD"]
            usdcny[raw_date] = rates["CNY"] / rates["USD"]
    if len(usdjpy) < 200:
        currencies = sorted({currency for rates in eur_rates_by_date.values() for currency in rates})
        raise ValueError(
            f"ECB XML returned only {len(usdjpy)} valid shared observations "
            f"with requested currencies {currencies}"
        )
    return usdjpy, usdcny


def sample(points: list[dict], maximum: int = MAX_CHART_POINTS) -> list[dict]:
    if len(points) <= maximum:
        return points
    indexes = {round(index * (len(points) - 1) / (maximum - 1)) for index in range(maximum)}
    return [points[index] for index in sorted(indexes)]


def period_slice(points: list[dict], days: int) -> list[dict]:
    end = date.fromisoformat(points[-1]["date"])
    target = (end - timedelta(days=days)).isoformat()
    dates = [point["date"] for point in points]
    index = min(bisect_left(dates, target), len(points) - 2)
    return points[index:]


def ordinary_change(points: list[dict]) -> float:
    return (points[-1]["value"] / points[0]["value"] - 1) * 100


def build_payload(usdjpy: dict[str, float], usdcny: dict[str, float], source: dict | None = None) -> dict:
    shared_dates = sorted(set(usdjpy) & set(usdcny))
    if len(shared_dates) < 200:
        raise ValueError("Too few same-date USD/JPY and USD/CNY observations")

    series = {
        "usdjpy": [{"date": day, "value": round(usdjpy[day], 6)} for day in shared_dates],
        "usdcny": [{"date": day, "value": round(usdcny[day], 6)} for day in shared_dates],
        "cnyjpy": [
            {"date": day, "value": round(usdjpy[day] / usdcny[day], 8)}
            for day in shared_dates
        ],
    }

    chart_periods: dict[str, dict] = {key: {} for key in series}
    attribution: dict[str, dict] = {}
    for period_key, days in PERIODS.items():
        slices = {key: period_slice(points, days) for key, points in series.items()}
        for key, points in slices.items():
            chart_periods[key][period_key] = {
                "change": round(ordinary_change(points), 4),
                "points": sample(points),
            }

        jpy_start, jpy_end = slices["usdjpy"][0]["value"], slices["usdjpy"][-1]["value"]
        cny_start, cny_end = slices["usdcny"][0]["value"], slices["usdcny"][-1]["value"]
        jpy_contribution = math.log(jpy_end / jpy_start) * 100
        cny_contribution = -math.log(cny_end / cny_start) * 100
        total = jpy_contribution + cny_contribution
        dominance_gap = abs(abs(jpy_contribution) - abs(cny_contribution))
        threshold = max(abs(total) * 0.15, 0.15)
        dominant = "mixed" if dominance_gap < threshold else ("jpy" if abs(jpy_contribution) > abs(cny_contribution) else "cny")
        attribution[period_key] = {
            "startDate": slices["cnyjpy"][0]["date"],
            "endDate": slices["cnyjpy"][-1]["date"],
            "jpyContribution": round(jpy_contribution, 4),
            "cnyContribution": round(cny_contribution, 4),
            "totalLogChange": round(total, 4),
            "ordinaryChange": round(ordinary_change(slices["cnyjpy"]), 4),
            "dominant": dominant,
        }

    latest = {key: points[-1]["value"] for key, points in series.items()}
    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "latestCommonDate": shared_dates[-1],
        "source": source or {
            "provider": "Federal Reserve Bank of St. Louis (FRED)",
            "url": "https://fred.stlouisfed.org/",
            "series": {"usdjpy": "DEXJPUS", "usdcny": "DEXCHUS"},
            "frequency": "daily business days",
        },
        "latest": latest,
        "periods": chart_periods,
        "attribution": attribution,
    }


def write_atomic(payload: dict) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, OUTPUT)


def main() -> None:
    start = date.today() - timedelta(days=6 * 366)
    usdjpy, usdcny = fetch_ecb(start)
    source = {
        "provider": "European Central Bank (ECB)",
        "url": "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/",
        "series": {"base": "EUR", "currencies": ["USD", "JPY", "CNY"]},
        "frequency": "daily working days",
        "note": "Reference rates for information purposes; USD legs are derived from same-date EUR rates.",
    }
    payload = build_payload(usdjpy, usdcny, source)
    write_atomic(payload)
    print(f"Wrote {OUTPUT} through {payload['latestCommonDate']} from {payload['source']['provider']}")


if __name__ == "__main__":
    main()
