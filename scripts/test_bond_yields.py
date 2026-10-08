import json
import tempfile
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import fetch_bond_yields as bonds


def fixture():
    return {key: {'2016-01-04': [1.] * 8, '2026-09-29': [2.] * 8,
                  '2026-09-30': [3.] * 8} for key in ('cn', 'us', 'jp')}


class BondYieldTests(unittest.TestCase):
    def test_us_uses_dates_and_percent_quotes_without_forward_fill(self):
        raw = 'Date,1 Yr,2 Yr,3 Yr,5 Yr,7 Yr,10 Yr,20 Yr,30 Yr\n09/30/2026,1,2,3,4,5,.,7,8\n09/29/2026,1,2,3,4,5,6,7,8\n'
        rows = bonds.parse_us(raw)
        self.assertIsNone(rows['2026-09-30'][5])
        self.assertEqual(rows['2026-09-29'][5], 6)
        self.assertNotIn('2026-09-28', rows)

    def test_japan_header_and_negative_yields(self):
        raw = 'Interest Rate,,,,,,,,(Unit : %)\nDate,1Y,2Y,3Y,5Y,7Y,10Y,20Y,30Y\n2021/1/4,-0.1,-,0,0,0,0.05,1,2\n,,,,,,,,\n"  ※If you cannot download the latest csv data, clear the cache.",,,,,,,,\n'
        row = bonds.parse_jp(raw)['2021-01-04']
        self.assertEqual(row[0], -.1)
        self.assertIsNone(row[1])
        self.assertEqual(row[5], .05)

    def test_china_selects_exact_maturity_and_keeps_actual_weekend_date(self):
        stamp = datetime(2026, 9, 20, tzinfo=timezone(timedelta(hours=8))).timestamp() * 1000
        values = {1: 1.2, 10: 1.68}
        rows = [{'ycDefId': bonds.CN_ID + str(float(m)), 'ycDefName': f'中债国债收益率曲线(到期)({m}y)',
                 'seriesData': [[stamp, values.get(m)]]} for m in reversed(bonds.MATURITIES)]
        raw = json.dumps(rows)
        rows = bonds.parse_cn(raw)
        self.assertEqual(rows['2026-09-20'][5], 1.68)
        self.assertEqual(rows['2026-09-20'][0], 1.2)
        self.assertIsNone(rows['2026-09-20'][1])
        self.assertIsNone(rows['2026-09-20'][2])

    def test_china_rejects_wrong_measure_and_duplicate_dates(self):
        rows = [{'ycDefId': bonds.CN_ID + str(float(m)), 'ycDefName': '(到期)',
                 'seriesData': [[1790697600000, 1.7]]} for m in bonds.MATURITIES]
        rows[0]['ycDefName'] = '(即期)'
        with self.assertRaises(ValueError): bonds.parse_cn(json.dumps(rows))
        rows[0]['ycDefName'] = '(到期)'
        rows[0]['seriesData'].append(rows[0]['seriesData'][0])
        with self.assertRaises(ValueError): bonds.parse_cn(json.dumps(rows))

    def test_common_day_requires_exact_complete_curves(self):
        sources = fixture()
        sources['us']['2026-09-30'][2] = None
        sources['jp']['2026-10-01'] = [4.] * 8
        payload = bonds.build_payload(sources, date(2026, 10, 8))
        self.assertEqual(payload['latestCommonDate'], '2026-09-29')
        self.assertEqual(payload['series'][2]['asOf'], '2026-10-01')
        self.assertIsNone(payload['series'][1]['curves'][-1]['values'][2])

    def test_rejects_infinity_stale_sources_and_future_observations(self):
        with self.assertRaises(ValueError): bonds.quote('NaN')
        with self.assertRaises(ValueError): bonds.quote('inf')
        sources = fixture()
        with self.assertRaises(ValueError): bonds.build_payload(sources, date(2026, 11, 1))
        sources['cn']['2026-10-09'] = [4.] * 8
        payload = bonds.build_payload(sources, date(2026, 10, 8))
        self.assertEqual(payload['series'][0]['asOf'], '2026-09-30')

    def test_failed_fetch_validation_or_replace_preserves_previous_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'yields.json'
            target.write_text('{"latestCommonDate":"2026-09-30"}', encoding='utf8')
            original = target.read_bytes()
            def fail(_): raise OSError('Source unavailable')
            with self.assertRaises(OSError): bonds.update(target, date(2026, 10, 8), fail)
            self.assertEqual(target.read_bytes(), original)
            invalid = fixture(); invalid['cn']['2026-09-30'][0] = float('nan')
            with self.assertRaises(ValueError): bonds.update(target, date(2026, 10, 8), lambda _: invalid)
            self.assertEqual(target.read_bytes(), original)
            with patch.object(bonds.os, 'replace', side_effect=OSError('Cannot replace')):
                with self.assertRaises(OSError): bonds.update(target, date(2026, 10, 8), lambda _: fixture())
            self.assertEqual(target.read_bytes(), original)
            self.assertFalse(target.with_suffix('.json.tmp').exists())

    def test_rejects_regression_and_successfully_updates(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'yields.json'
            target.write_text('{"latestCommonDate":"2026-10-01"}', encoding='utf8')
            with self.assertRaises(ValueError): bonds.update(target, date(2026, 10, 8), lambda _: fixture())
            target.write_text('{"latestCommonDate":"2026-09-29"}', encoding='utf8')
            payload = bonds.update(target, date(2026, 10, 8), lambda _: fixture())
            self.assertEqual(json.loads(target.read_text(encoding='utf8')), payload)


if __name__ == '__main__': unittest.main()
