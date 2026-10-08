"""Official nominal government yield curves; retain dates and missing quotes.

ChinaBond: Treasury bond maturity yield curve (not its spot/zero curve).
US Treasury: par curve. Japan MOF: benchmark JGB interest rates.
The measures are related but their estimation methods are not identical.
"""
from __future__ import annotations

import csv
import io
import json
import math
import os
import ssl
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OUTPUT = Path('outputs/data/bond-yields.json')
START = '2016-01-01'
MATURITIES = [1, 2, 3, 5, 7, 10, 20, 30]
CN_ID = '2c9081e50a2f9606010a3068cae70001'
CN_BASE = 'https://yield.chinabond.com.cn/cbweb-mn/yc/'
US_BASE = 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/'
JP_BASE = 'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/'


def fetch(url, post=False):
    try:
        import certifi
        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        context = ssl.create_default_context()
    for attempt in range(2):
        try:
            request = Request(url, data=b'' if post else None, headers={
                'User-Agent': 'HY-Tools/1.0 (public government yield research)'})
            with urlopen(request, timeout=60, context=context) as response:
                # MOF's English current-month CSV still has Shift-JIS footnotes.
                encoding = 'cp932' if url.startswith(JP_BASE) else 'utf-8-sig'
                return response.read().decode(encoding)
        except Exception:
            if attempt:
                raise
            time.sleep(1)


def quote(raw):
    if raw is None or str(raw).strip() in {'', '-', '－', '.', 'N/A', 'null'}:
        return None
    value = float(raw)
    if not math.isfinite(value) or not -5 <= value <= 30:
        raise ValueError('Invalid government yield')
    return value


def parse_us(raw):
    reader = csv.DictReader(io.StringIO(raw))
    if not reader.fieldnames or not {'Date', '10 Yr', '2 Yr'}.issubset(reader.fieldnames):
        raise ValueError('Unexpected Treasury CSV headers')
    result = {}
    for row in reader:
        day = datetime.strptime(row['Date'], '%m/%d/%Y').date().isoformat()
        result[day] = [quote(row.get(f'{m} Yr')) for m in MATURITIES]
    return result


def parse_jp(raw):
    lines = raw.splitlines()
    if len(lines) < 2 or 'Unit : %' not in lines[0]:
        raise ValueError('Unexpected MOF yield units')
    reader = csv.DictReader(lines[1:])
    if not reader.fieldnames or not {'Date', '10Y', '2Y'}.issubset(reader.fieldnames):
        raise ValueError('Unexpected MOF CSV headers')
    result = {}
    for row in reader:
        if not row.get('Date') or not row['Date'][0].isdigit():
            continue
        day = datetime.strptime(row['Date'], '%Y/%m/%d').date().isoformat()
        result[day] = [quote(row.get(f'{m}Y')) for m in MATURITIES]
    return result


def parse_cn(raw):
    rows = json.loads(raw)
    if not isinstance(rows, list) or len(rows) != len(MATURITIES):
        raise ValueError('Incomplete ChinaBond maturity series')
    result = {}
    seen = set()
    for row in rows:
        identifier = row['ycDefId']
        if not identifier.startswith(CN_ID):
            raise ValueError('Unexpected ChinaBond curve identity')
        term = float(identifier[len(CN_ID):])
        if term not in MATURITIES or term in seen or '(到期)' not in row['ycDefName']:
            raise ValueError('Unexpected ChinaBond maturity or measure')
        seen.add(term)
        index = MATURITIES.index(term)
        days = set()
        for stamp, value in row['seriesData']:
            # ChinaBond returns local midnight in milliseconds: UTC is the day before.
            day = datetime.fromtimestamp(stamp / 1000, timezone(timedelta(hours=8))).date().isoformat()
            if day in days:
                raise ValueError('Duplicate ChinaBond date')
            days.add(day)
            result.setdefault(day, [None] * len(MATURITIES))[index] = quote(value)
    if not result:
        raise ValueError('Empty ChinaBond year')
    return result


def cn_url(year, today):
    # Request only eight published key maturities, avoiding the large dense curve grid.
    return CN_BASE + 'queryYz?' + urlencode({
        'bjlx': 'no', 'dcq': ''.join(f'{float(m)},{m}y;' for m in MATURITIES),
        'startTime': f'{year}-01-01',
        'endTime': min(f'{year}-12-31', today.isoformat()),
        'qxlx': '0,', 'yqqxN': 'N', 'yqqxK': 'K', 'par': '',
        'ycDefIds': CN_ID, 'locale': 'zh_CN'})


def us_url(year):
    return US_BASE + f'daily-treasury-rates.csv/{year}/all?' + urlencode({
        'type': 'daily_treasury_yield_curve', 'field_tdr_date_value': year,
        'page': '', '_format': 'csv'})


def load_sources(today):
    # Verify the live curve definition, so an ID change cannot silently switch measures.
    tree = json.loads(fetch(CN_BASE + 'queryTree?locale=zh_CN', post=True))
    if not any(r['id'] == CN_ID and r['name'] == '中债国债收益率曲线' for r in tree):
        raise ValueError('ChinaBond Treasury curve definition changed')
    jobs = [('jp', 'all', JP_BASE + 'historical/jgbcme_all.csv', parse_jp, False),
            ('jp', 'current', JP_BASE + 'jgbcme.csv', parse_jp, False)]
    for year in range(int(START[:4]), today.year + 1):
        jobs.extend([('cn', year, cn_url(year, today), parse_cn, True),
                     ('us', year, us_url(year), parse_us, False)])

    def run(job):
        country, period, url, parser, post = job
        rows = parser(fetch(url, post))
        if country == 'jp' and period == 'all' and any(
                sum(day.startswith(str(year)) for day in rows) < 150 for year in range(int(START[:4]), today.year)):
            raise ValueError('Incomplete MOF historical archive')
        if isinstance(period, int):
            minimum = 150 if period < today.year else max(1, ((today - date(today.year, 1, 1)).days - 21) // 3)
            if sum(day.startswith(str(period)) for day in rows) < minimum:
                raise ValueError(f'Incomplete {country} history for {period}')
        return country, rows

    result = {'cn': {}, 'us': {}, 'jp': {}}
    with ThreadPoolExecutor(max_workers=3) as pool:
        for country, rows in pool.map(run, jobs):
            result[country].update(rows)
    return result


def build_payload(sources, today):
    filtered = {}
    for country in ('cn', 'us', 'jp'):
        rows = {day: values for day, values in sorted(sources[country].items()) if START <= day <= today.isoformat()}
        if not rows or next(iter(rows)) > '2016-01-15':
            raise ValueError(f'Missing opening history for {country}')
        for day, values in rows.items():
            date.fromisoformat(day)
            if len(values) != len(MATURITIES):
                raise ValueError('Unexpected maturity count')
            for value in values:
                quote(value)
        if (today - date.fromisoformat(max(rows))).days > 21:
            raise ValueError(f'Stale {country} data')
        filtered[country] = rows
    # Only exact same-day, complete curves are selectable for cross-country comparison.
    common = sorted(set.intersection(*[
        {day for day, values in rows.items() if all(v is not None for v in values)}
        for rows in filtered.values()]))
    if not common or (today - date.fromisoformat(common[-1])).days > 21:
        raise ValueError('No recent common yield-curve date')
    metadata = {
        'cn': ('中国', '中债国债收益率曲线（到期收益率）', '中债 / 中央结算公司',
               'https://yield.chinabond.com.cn/cbweb-mn/'),
        'us': ('美国', '美国国债平价收益率曲线（Par）', '美国财政部',
               US_BASE + 'TextView?type=daily_treasury_yield_curve'),
        'jp': ('日本', '日本国债基准利率（JGB）', '日本财务省', JP_BASE + 'index.htm')}
    return {'schemaVersion': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'historyStart': START, 'latestCommonDate': common[-1], 'unit': '%',
            'maturities': MATURITIES, 'commonDates': common,
            'series': [{'id': key, 'name': meta[0], 'measure': meta[1],
                        'source': {'provider': meta[2], 'url': meta[3]},
                        'asOf': max(filtered[key]),
                        'curves': [{'date': day, 'values': values} for day, values in filtered[key].items()]}
                       for key, meta in metadata.items()]}


def update(output=OUTPUT, today=None, loader=load_sources):
    today = today or date.today()
    payload = build_payload(loader(today), today)
    if output.exists():
        previous = json.loads(output.read_text(encoding='utf-8'))
        if payload['latestCommonDate'] < previous.get('latestCommonDate', ''):
            raise ValueError('Refusing regressed yield snapshot')
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix('.json.tmp')
    try:
        temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        os.replace(temporary, output)
    finally:
        if temporary.exists():
            temporary.unlink()
    return payload


if __name__ == '__main__':
    snapshot = update()
    print('Government yield curves: common date', snapshot['latestCommonDate'])
    for series in snapshot['series']:
        print(series['id'], len(series['curves']), 'observations; source date', series['asOf'])
