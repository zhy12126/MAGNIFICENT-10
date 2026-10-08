"""Build policy-rate step histories: PBOC 7-day reverse repo and BIS US/JP.

China's BIS series is LPR, so it must not be used for this chart. Reviewed
historical PBOC changes seed its series; recent official operation notices
extend it. Any source or coverage failure leaves the previous snapshot intact.
"""
from __future__ import annotations

import csv
import io
import json
import math
import os
import re
import ssl
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

OUTPUT = Path('outputs/data/policy-rates.json')
CHINA_SOURCE = Path('outputs/data/china-policy-rate-source.json')
HISTORY_START = '2021-01-01'
BIS_URL = 'https://stats.bis.org/api/v1/data/WS_CBPOL/D.US+JP?startPeriod=2021-01-01&format=csv'
PBOC_INDEX = 'https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125431/125475/index.html'


def fetch(url: str) -> str:
    try:
        import certifi
        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        context = ssl.create_default_context()
    request = Request(url, headers={'User-Agent': 'HY-Tools/1.0 (public policy-rate research)'})
    with urlopen(request, timeout=40, context=context) as response:
        return response.read().decode('utf-8-sig')


class OfficialHTML(HTMLParser):
    """Extract dated article links and table cells without browser dependencies."""
    def __init__(self, html: str):
        super().__init__()
        self.links = []
        self.rows = []
        self.text = []
        self.row_stack = []
        self.cell_stack = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == 'a' and 'istitle' in attributes and attributes.get('href'):
            self.links.append(urljoin(PBOC_INDEX, attributes['href']))
        if tag == 'tr':
            self.row_stack.append([])
        if tag in {'td', 'th'}:
            self.cell_stack.append([])

    def handle_data(self, data):
        self.text.append(data)
        for cell in self.cell_stack:
            cell.append(data)

    def handle_endtag(self, tag):
        if tag in {'td', 'th'} and self.cell_stack:
            cell = re.sub(r'\s+', '', ''.join(self.cell_stack.pop()))
            if self.row_stack:
                self.row_stack[-1].append(cell)
        if tag == 'tr' and self.row_stack:
            self.rows.append(self.row_stack.pop())


def validate_points(points: list[dict], as_of: str) -> None:
    date.fromisoformat(as_of)
    if not points or points[0]['date'] > HISTORY_START:
        raise ValueError('Policy-rate history has no opening observation')
    previous = ''
    for point in points:
        date.fromisoformat(point['date'])
        value = point['value']
        if point['date'] <= previous or point['date'] > as_of or not isinstance(value, (float, int)) or not math.isfinite(value) or not -1 <= value <= 20:
            raise ValueError('Invalid or unordered policy-rate observation')
        previous = point['date']


def parse_bis(raw: str) -> list[dict]:
    groups = {'US': {}, 'JP': {}}
    metadata = {}
    for row in csv.DictReader(io.StringIO(raw)):
        area = row.get('REF_AREA')
        if area not in groups or row.get('FREQ') != 'D' or not row.get('OBS_VALUE', '').strip():
            continue
        day = row['TIME_PERIOD']
        date.fromisoformat(day)
        if day < HISTORY_START or day > date.today().isoformat():
            continue
        if row.get('UNIT_MEASURE') != '368' or row.get('UNIT_MULT') != '0':
            raise ValueError('Unexpected BIS policy-rate units')
        value = float(row['OBS_VALUE'])
        if not math.isfinite(value) or not -1 <= value <= 20:
            raise ValueError('Invalid BIS policy rate')
        if day in groups[area] and groups[area][day] != value:
            raise ValueError('Conflicting BIS policy-rate observations')
        groups[area][day] = value
        metadata[area] = row.get('COMPILATION', '')
    definitions = {
        'US': ('us', '联邦基金目标区间中点', '联邦基金目标区间中点（不是实际有效联邦基金利率）'),
        'JP': ('jp', '短期政策利率', '日本央行短期政策利率；0—0.1%目标区间时期以中点0.05%表示'),
    }
    result = []
    for area, observations in groups.items():
        if len(observations) < 1000 or min(observations) != HISTORY_START:
            raise ValueError(f'Incomplete BIS {area} policy-rate history')
        if area == 'US' and 'mid-point' not in metadata[area]:
            raise ValueError('BIS US policy-rate definition changed')
        if area == 'JP' and 'short-term' not in metadata[area].lower():
            raise ValueError('BIS Japan policy-rate definition changed')
        points = []
        for day, value in sorted(observations.items()):
            if not points or points[-1]['value'] != value:
                points.append({'date': day, 'value': value})
        identifier, label, measure = definitions[area]
        as_of = max(observations)
        validate_points(points, as_of)
        result.append({'id': identifier, 'shortMeasure': label, 'measure': measure,
                       'provider': 'BIS（央行原始数据）',
                       'sourceUrl': f'https://data.bis.org/topics/CBPOL/BIS,WS_CBPOL,1.0/D.{area}',
                       'asOf': as_of, 'points': points, 'sourceDefinition': metadata[area]})
    return result


def parse_operation(url: str, raw: str) -> tuple[str, float | None, str]:
    parsed = OfficialHTML(raw)
    match = re.search(r'\b(20\d{2}-\d{2}-\d{2})\b', ' '.join(parsed.text))
    if not match:
        raise ValueError(f'PBOC operation date unavailable: {url}')
    day = match.group(1)
    date.fromisoformat(day)
    for row in parsed.rows:
        if row and row[0] in {'7天', '7天期'}:
            rates = [cell for cell in row[1:] if re.fullmatch(r'\d+(?:\.\d+)?%', cell)]
            if len(rates) == 1:
                return day, float(rates[0][:-1]), url
    # Zero-volume operations have no interest-rate quote. Never treat zero
    # operation volume as a zero interest rate, or mix in 14-day/overnight rates.
    compact = re.sub(r'\s+', '', ' '.join(parsed.text))
    if '7天期逆回购操作量为零' in compact or '7天期逆回购操作量为0' in compact:
        return day, None, url
    if '7天' not in compact and ('14天期逆回购' in compact or '隔夜逆回购' in compact):
        return day, None, url
    if '7天' not in compact and '央行票据' in compact:
        return day, None, url
    raise ValueError(f'PBOC 7-day operation table unavailable: {url}')


def build_china(index: str, get=fetch) -> dict:
    source = json.loads(CHINA_SOURCE.read_text(encoding='utf-8'))
    series = {'id': 'cn', 'shortMeasure': '7天逆回购利率',
              'measure': '人民银行公开市场7天期逆回购操作利率',
              'provider': '中国人民银行', 'sourceUrl': source['latestSourceUrl'],
              'asOf': source['asOf'], 'points': source['points']}
    validate_points(series['points'], series['asOf'])
    if OUTPUT.exists():
        previous = json.loads(OUTPUT.read_text(encoding='utf-8'))
        cached = next((item for item in previous.get('series', []) if item.get('id') == 'cn'), None)
        if cached and cached['asOf'] > series['asOf']:
            validate_points(cached['points'], cached['asOf'])
            if cached['points'][:len(source['points'])] != source['points']:
                raise ValueError('Cached China history conflicts with reviewed source')
            series.update(points=cached['points'], asOf=cached['asOf'], sourceUrl=cached['sourceUrl'])
    links = list(dict.fromkeys(OfficialHTML(index).links))
    if not links or any(urlparse(url).hostname != 'www.pbc.gov.cn' or '/125475/' not in url for url in links):
        raise ValueError('Invalid PBOC operation index')
    with ThreadPoolExecutor(max_workers=5) as executor:
        observations = list(executor.map(lambda url: parse_operation(url, get(url)), links))
    if min(day for day, _, _ in observations) > series['asOf']:
        raise ValueError('China history has an unreviewed gap; review missed official operations before updating')
    for day, value, url in sorted(observations, key=lambda observation: observation[0]):
        if day > date.today().isoformat():
            raise ValueError('PBOC operation is dated in the future')
        if day <= series['asOf'] or value is None:
            continue
        if value != series['points'][-1]['value']:
            series['points'].append({'date': day, 'value': value, 'sourceUrl': url})
        series.update(asOf=day, sourceUrl=url)
    validate_points(series['points'], series['asOf'])
    return series


def main():
    with ThreadPoolExecutor(max_workers=2) as executor:
        bis_future = executor.submit(fetch, BIS_URL)
        index_future = executor.submit(fetch, PBOC_INDEX)
        us_jp = parse_bis(bis_future.result())
        china = build_china(index_future.result())
    series = [china, *us_jp]
    payload = {'schemaVersion': 1, 'generatedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
               'unit': 'percentPerAnnum', 'historyStart': HISTORY_START,
               'latestCommonDate': min(item['asOf'] for item in series), 'series': series}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    os.replace(temporary, OUTPUT)
    print(f'Wrote {OUTPUT}; common coverage through {payload["latestCommonDate"]}')


if __name__ == '__main__':
    main()
