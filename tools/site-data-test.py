#!/usr/bin/env python3
"""Regression checks for search, sitemap, and RSS."""
from html.parser import HTMLParser
import importlib.util
import json
import json
from pathlib import Path
import tempfile
import unittest
from urllib.parse import urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('site_data', ROOT / 'tools/build-site-data.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class LobbyCards(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag != 'a' or 'article-card' not in attrs.get('class', '').split():
            return
        url = urlsplit(urljoin(builder.ORIGIN + '/game/index.html', attrs['href']))
        if f'{url.scheme}://{url.netloc}' == builder.ORIGIN and url.path.startswith('/game/'):
            self.paths.add(url.path.lstrip('/'))


class LobbyDiscoveryTests(unittest.TestCase):
    def test_public_lobby_cards_are_discoverable(self):
        lobby = LobbyCards()
        lobby.feed((ROOT / 'game/index.html').read_text())
        self.assertTrue(lobby.paths, 'No public destination cards found in the game lobby')
        search = {item['url']: item for item in json.loads((ROOT / 'data/search-index.json').read_text())}
        sitemap = {loc.text for loc in ET.parse(ROOT / 'sitemap.xml').findall('.//{*}loc')}
        items = builder.collect_items()
        game_urls = {item['url'] for item in items if item['series'] == 'game'}
        related = builder.build_related(items)
        for url in sorted(lobby.paths):
            with self.subTest(url=url):
                target = ROOT / (url + 'index.html' if url.endswith('/') else url)
                self.assertTrue(target.is_file())
                self.assertIn(url, game_urls)
                self.assertIn(url, search)
                self.assertIn(builder.ORIGIN + '/' + url, sitemap)
                entry = search[url]
                self.assertEqual(entry['kind'], 'page')
                self.assertTrue(entry['title'] and entry['excerpt'])
                self.assertNotIn(entry['id'], related)


class RelatedLabelTests(unittest.TestCase):
    def test_labels_reflect_each_destination(self):
        items = builder.collect_items()
        related = builder.build_related(items)

        def find(source, target):
            return next(entry for entry in related[source] if entry["id"] == target)

        self.assertEqual(find("rl:13-dpg", "robot-learn:013-naf")["reason"], "跨系列相关方法")
        self.assertEqual(find("rl:13-dpg", "rl:17-ddpg")["reason"], "同系列相关方法")
        self.assertEqual(find("rl:27-ppo", "game:rl-ppo")["reason"], "对照阅读")
        for source, destination, label in [
            ("00-reading-guide", "00-reading-guide", "跨系列导读"),
            ("00-timeline", "00-timeline", "跨系列总览"),
            ("61-epilogue", "101-epilogue", "跨系列结语"),
        ]:
            with self.subTest(label=label):
                self.assertEqual(find(f"rl:{source}", f"llm:{destination}")["reason"], label)

        prefix = "window.RELATED_PAPERS = "
        script = (ROOT / "js/related-data.js").read_text()
        self.assertTrue(script.startswith(prefix) and script.endswith(";\n"))
        self.assertEqual(json.loads(script[len(prefix):-2]), related)
        self.assertFalse(any("同一方法" in entry["reason"] for entries in related.values() for entry in entries))


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

    def test_series_hubs_in_search_and_sitemap(self):
        items = builder.collect_items()
        search = json.loads((ROOT / 'data/search-index.json').read_text())
        urls = [item['url'] for item in search]
        self.assertEqual(len(urls), len(set(urls)))
        self.assertEqual(len(items), len(search))
        self.assertEqual(len({item['id'] for item in items}), len(items))
        related = builder.build_related(items)
        sitemap = ET.parse(ROOT / 'sitemap.xml')
        locations = [loc.text for loc in sitemap.findall('.//{*}loc')]
        self.assertEqual(len(locations), len(set(locations)))
        for series in builder.SERIES:
            url = f"{series['dir']}/index.html"
            hub = next(item for item in search if item['url'] == url)
            self.assertEqual(hub['kind'], 'page')
            self.assertTrue((ROOT / url).is_file())
            self.assertEqual(urls.count(url), 1)
            self.assertEqual(locations.count(builder.ORIGIN + '/' + url), 1)
            self.assertNotIn(hub['id'], related)
            count = sum(item['series'] == series['id'] and item['kind'] == 'paper' for item in items)
            self.assertIn(str(count), hub['question'])
        with tempfile.TemporaryDirectory() as directory:
            original = builder.ROOT
            try:
                builder.ROOT = Path(directory)
                builder.write_sitemap(items)
                first = (builder.ROOT / 'sitemap.xml').read_bytes()
                builder.write_sitemap(items)
                self.assertEqual(first, (builder.ROOT / 'sitemap.xml').read_bytes())
                self.assertEqual(first, (ROOT / 'sitemap.xml').read_bytes())
            finally:
                builder.ROOT = original

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
