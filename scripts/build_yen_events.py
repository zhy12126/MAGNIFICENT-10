"""Build the reviewed upcoming-event calendar used by the yen analysis page.

Official schedules are deliberately reviewed in yen-events-source.json before
publication. This builder validates sources, removes expired entries, limits
the public file to the configured window, and replaces output atomically.
"""
from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

SOURCE = Path("outputs/data/yen-events-source.json")
OUTPUT = Path("outputs/data/yen-events.json")
WINDOW_DAYS = 30
OFFICIAL_DOMAINS = {
    "boj.or.jp",
    "federalreserve.gov",
    "stats.gov.cn",
    "pbc.gov.cn",
    "safe.gov.cn",
    "customs.gov.cn",
    "bls.gov",
    "stat.go.jp",
    "mof.go.jp",
}
REQUIRED = {"id", "datetime", "timeLabel", "country", "title", "summary", "impact", "sourceUrl"}


def parse_day(value: str) -> date:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError as error:
        raise ValueError(f"Invalid event datetime: {value!r}") from error


def validate_event(event: dict, seen: set[str]) -> None:
    missing = REQUIRED - set(event)
    if missing:
        raise ValueError(f"Event is missing {sorted(missing)}: {event.get('id', 'unknown')}")
    if event["id"] in seen:
        raise ValueError(f"Duplicate event id: {event['id']}")
    seen.add(event["id"])
    host = (urlparse(event["sourceUrl"]).hostname or "").lower()
    if not any(host == domain or host.endswith(f".{domain}") for domain in OFFICIAL_DOMAINS):
        raise ValueError(f"Event source is not an approved official domain: {host}")
    if event["country"] not in {"cn", "jp", "us"}:
        raise ValueError(f"Unsupported event country: {event['country']}")
    parse_day(event["datetime"])


def main() -> None:
    raw = json.loads(SOURCE.read_text(encoding="utf-8"))
    today = date.today()
    end = today + timedelta(days=WINDOW_DAYS)
    seen: set[str] = set()
    selected = []
    for event in raw.get("events", []):
        validate_event(event, seen)
        event_day = parse_day(event["datetime"])
        if today <= event_day <= end:
            selected.append(event)
    selected.sort(key=lambda event: event["datetime"])
    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "timezone": "Asia/Shanghai",
        "windowDays": WINDOW_DAYS,
        "reviewedThrough": raw.get("reviewedThrough"),
        "events": selected,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(f"Wrote {OUTPUT} with {len(selected)} reviewed official events through {end}")


if __name__ == "__main__":
    main()
