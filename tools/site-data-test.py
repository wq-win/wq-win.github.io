#!/usr/bin/env python3
"""RSS coverage, stable subscriber identity, and XML regression checks."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('site_data', ROOT / 'tools/build-site-data.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class RssTests(unittest.TestCase):
    def render(self, items):
        with tempfile.TemporaryDirectory() as directory:
            original = builder.ROOT
            try:
                builder.ROOT = Path(directory)
                builder.write_rss(items)
                return (builder.ROOT / 'rss.xml').read_bytes()
            finally:
                builder.ROOT = original

    def test_complete_catalog_and_stable_guids(self):
        items = builder.collect_items()
        papers = [item for item in items if item['kind'] == 'paper']
        content = self.render(items)
        entries = ET.fromstring(content).findall('./channel/item')
        expected = [builder.ORIGIN + '/' + paper['url'] for paper in papers]
        self.assertGreater(len(papers), 80)
        self.assertEqual([item.findtext('guid') for item in entries], expected)
        self.assertEqual([item.findtext('link') for item in entries], expected)
        self.assertEqual(len(set(expected)), len(expected))
        for series in builder.SERIES:
            self.assertTrue(any(p['series'] == series['id'] for p in papers))
        # Existing GUIDs remain canonical URLs, so subscribers can deduplicate.
        # The historical first 80 entries retain their IDs and relative order.
        self.assertEqual([e.findtext('guid') for e in entries[:80]], expected[:80])
        self.assertEqual(content, self.render(items))
        self.assertEqual(content, (ROOT / 'rss.xml').read_bytes())
        self.assertFalse(ET.fromstring(content).findall('.//pubDate'))
        self.assertLess(len(content), 1024 * 1024)

    def test_xml_escaping_and_nonpaper_exclusion(self):
        paper = dict(kind='paper', seriesLabel='学习 & 实践', cardTitle='<标题> "测试"',
                     url='rl/example.html', excerpt='A < B & C > D', question='fallback')
        content = self.render([dict(paper, kind='guide'), paper])
        entries = ET.fromstring(content).findall('./channel/item')
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].findtext('title'), '学习 & 实践｜<标题> "测试"')
        self.assertEqual(entries[0].findtext('description'), paper['excerpt'])
        self.assertEqual(len(ET.fromstring(self.render([])).findall('./channel/item')), 0)


if __name__ == '__main__':
    unittest.main()
