"""Regression checks for policy-rate source confusion and safe updates."""
import csv
import io
import json
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

import fetch_policy_rates as rates


def notice(body, day='2026-10-08'):
    return f'<p>{day} 09:20:30</p>{body}'


class PolicyRatesTests(unittest.TestCase):
    def test_current_table_uses_seven_day_rate_not_volume_or_fourteen_day_rate(self):
        html = notice('<table><tr><td>7<span>天</span></td><td>1.<span>40</span>%</td><td>515亿元</td></tr><tr><td>14天</td><td>1.65%</td></tr></table>')
        self.assertEqual(rates.parse_operation('https://www.pbc.gov.cn/example', html)[1], 1.4)

    def test_historical_column_order(self):
        html = notice('<table><tr><td>7天</td><td>1000亿元</td><td>2.10%</td></tr></table>', '2022-01-17')
        self.assertEqual(rates.parse_operation('https://www.pbc.gov.cn/example', html)[:2], ('2022-01-17', 2.1))

    def test_zero_operation_is_not_zero_interest(self):
        html = notice('<p>7天期逆回购操作量为零</p><table><tr><td>7天</td><td>0亿元</td><td>0亿元</td></tr></table>')
        self.assertIsNone(rates.parse_operation('https://www.pbc.gov.cn/example', html)[1])

    def test_unrelated_instruments_are_excluded(self):
        for body in ['<p>开展14天期逆回购操作</p><table><tr><td>14天</td><td>1.65%</td></tr></table>', '<p>发行央行票据</p><table><tr><td>6个月</td><td>1.37%</td></tr></table>']:
            with self.subTest(body=body):
                self.assertIsNone(rates.parse_operation('https://www.pbc.gov.cn/example', notice(body))[1])

    def test_unrecognised_table_fails_instead_of_inventing_rate(self):
        with self.assertRaises(ValueError):
            rates.parse_operation('https://www.pbc.gov.cn/example', notice('<p>7天逆回购</p><td>格式已调整</td>'))

    def test_bis_keeps_effective_day_and_ignores_lpr(self):
        fields = ['FREQ', 'REF_AREA', 'UNIT_MEASURE', 'UNIT_MULT', 'TIME_PERIOD', 'OBS_VALUE', 'COMPILATION']
        buffer = io.StringIO(); writer = csv.DictWriter(buffer, fieldnames=fields); writer.writeheader()
        for area, value, definition in [('US', .125, 'mid-point of target range'), ('JP', -.1, 'Short-term policy interest rate'), ('CN', 3.85, 'Loan Prime Rate')]:
            for offset in range(1001):
                day = date(2021, 1, 1) + timedelta(days=offset)
                writer.writerow(dict(FREQ='D', REF_AREA=area, UNIT_MEASURE='368', UNIT_MULT='0', TIME_PERIOD=day.isoformat(), OBS_VALUE=value if offset < 500 else value + .25, COMPILATION=definition))
        result = rates.parse_bis(buffer.getvalue())
        self.assertEqual({item['id'] for item in result}, {'us', 'jp'})
        for item in result:
            self.assertEqual(len(item['points']), 2)
            self.assertEqual(item['points'][1]['date'], (date(2021, 1, 1) + timedelta(days=500)).isoformat())

    def test_china_handles_same_day_bill_and_rate_and_keeps_first_changed_day(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.json'
            source.write_text(json.dumps({'asOf': '2026-10-06', 'latestSourceUrl': 'https://www.pbc.gov.cn/old', 'points': [{'date': '2021-01-01', 'value': 1.4}]}), encoding='utf-8')
            urls = ['https://www.pbc.gov.cn/125475/one', 'https://www.pbc.gov.cn/125475/two', 'https://www.pbc.gov.cn/125475/three']
            index = ''.join(f'<a istitle="true" href="{url}">公告</a>' for url in urls)
            html = {urls[0]: notice('<p>发行央行票据</p>', '2026-10-07'), urls[1]: notice('<table><tr><td>7天</td><td>1.30%</td></tr></table>', '2026-10-07'), urls[2]: notice('<p>7天期逆回购操作量为零</p>', '2026-10-06')}
            with patch.object(rates, 'CHINA_SOURCE', source), patch.object(rates, 'OUTPUT', Path(directory) / 'output.json'):
                result = rates.build_china(index, get=html.__getitem__)
            self.assertEqual(result['points'][-1]['date'], '2026-10-07')
            self.assertEqual(result['points'][-1]['value'], 1.3)
            self.assertEqual(result['asOf'], '2026-10-07')

    def test_unreviewed_china_gap_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.json'
            source.write_text(json.dumps({'asOf': '2026-09-01', 'latestSourceUrl': 'https://www.pbc.gov.cn/old', 'points': [{'date': '2021-01-01', 'value': 1.4}]}), encoding='utf-8')
            index = '<a istitle="true" href="https://www.pbc.gov.cn/125475/new">公告</a>'
            with patch.object(rates, 'CHINA_SOURCE', source), patch.object(rates, 'OUTPUT', Path(directory) / 'output.json'):
                with self.assertRaisesRegex(ValueError, 'unreviewed gap'):
                    rates.build_china(index, get=lambda _: notice('<table><tr><td>7天</td><td>1.30%</td></tr></table>'))

    def test_network_failure_preserves_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'output.json'; output.write_text('previous snapshot', encoding='utf-8')
            with patch.object(rates, 'OUTPUT', output), patch.object(rates, 'fetch', side_effect=OSError('network unavailable')):
                with self.assertRaises(OSError):
                    rates.main()
            self.assertEqual(output.read_text(encoding='utf-8'), 'previous snapshot')


if __name__ == '__main__':
    unittest.main()
