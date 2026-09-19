#!/usr/bin/env python3
"""Inject theme boot, RSS link, and shared chrome into HTML pages."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THEME = '<script>try{if(localStorage.getItem(\'mylog-theme\')===\'dark\')document.documentElement.classList.add(\'dark\')}catch(e){}</script>'
CHROME = '<script src="../js/site-chrome.js"></script>'

def depth_of(path: Path) -> int:
    return len(path.relative_to(ROOT).parts) - 1

def rss_href(path: Path) -> str:
    depth = depth_of(path)
    return '../' * depth + 'rss.xml'

def patch(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    original = text
    if 'mylog-theme' not in text:
        if '<head>' in text:
            text = text.replace('<head>', '<head>\n    ' + THEME, 1)
        elif '<head ' in text:
            text = text.replace('<head', '<head>\n    ' + THEME + '\n<head_unused', 1)
    if 'application/rss+xml' not in text and '</head>' in text:
        href = rss_href(path)
        text = text.replace(
            '</head>',
            f'    <link rel="alternate" type="application/rss+xml" title="MyLog RSS" href="{href}">\n</head>',
            1,
        )
    rel = str(path.relative_to(ROOT))
    if rel.startswith('rl/') and 'js/common.js' in text and 'js/site-chrome.js' not in text:
        text = text.replace(
            '<script src="js/common.js"></script>',
            CHROME + '\n    <script src="js/common.js"></script>',
        )
    if text != original:
        path.write_text(text, encoding='utf-8')
        return True
    return False

def main():
    changed = 0
    for path in ROOT.rglob('*.html'):
        if 'article-pages' in path.parts:
            continue
        if patch(path):
            changed += 1
    print(f'patched {changed} html files')

if __name__ == '__main__':
    main()
