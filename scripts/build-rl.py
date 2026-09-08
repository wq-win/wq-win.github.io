#!/usr/bin/env python3
"""Build static HTML pages for the reinforcement learning series."""

from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path("/Users/wangqiang/Desktop/强化学习60篇博客")
ROOT = Path("/Users/wangqiang/Downloads/VScode/wq-win.github.io")
OUT = ROOT / "rl"
POSTS = OUT / "posts"

SPECIAL_SLUGS = {
    "00-强化学习发展时间线总览.md": "00-timeline",
    "61-系列收尾.md": "61-epilogue",
}

ERA_BY_DAY = [
    (1, 11, "classic", "1983—2010", "经典基础"),
    (12, 22, "deep", "2013—2016", "深度强化学习突破"),
    (23, 36, "scale", "2016—2018", "稳定性、探索与规模化"),
    (37, 46, "offline", "2018—2021", "离线学习与世界模型"),
    (47, 55, "llm", "2022—2025", "语言模型强化学习"),
    (56, 60, "agent", "2026", "近期研究与 Agent"),
]


def slug_for(filename: str) -> str:
    if filename in SPECIAL_SLUGS:
        return SPECIAL_SLUGS[filename]
    return filename.replace(".md", "")


def era_for_day(day: int | None) -> tuple[str, str, str]:
    if day is None:
        return ("overview", "", "总览")
    for start, end, era_id, years, label in ERA_BY_DAY:
        if start <= day <= end:
            return (era_id, years, label)
    return ("overview", "", "总览")


def parse_readme_catalog(text: str) -> dict[str, dict]:
    catalog = {}
    row = re.compile(
        r"\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+)\|"
    )
    for match in row.finditer(text):
        day, year, short_title, filename, question = match.groups()
        catalog[filename] = {
            "day": int(day),
            "year": int(year),
            "shortTitle": short_title.strip(),
            "question": question.strip(),
        }
    return catalog


def first_paragraph(text: str) -> str:
    lines = []
    started = False
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("#"):
            continue
        if line.startswith("[") or line.startswith("**原论文"):
            continue
        if not line:
            if started:
                break
            continue
        started = True
        lines.append(line)
        if len("".join(lines)) > 80:
            break
    excerpt = re.sub(r"\s+", " ", " ".join(lines)).strip()
    excerpt = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", excerpt)
    return excerpt[:180]


ARTICLE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | MyLog</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <script>
        tailwind.config = {{
            theme: {{
                extend: {{
                    colors: {{
                        primary: '#3b82f6',
                        secondary: '#64748b',
                        accent: '#f59e0b',
                        dark: '#1e293b',
                        light: '#f8fafc'
                    }},
                    fontFamily: {{
                        sans: ['Inter', 'system-ui', 'sans-serif']
                    }}
                }}
            }}
        }}
    </script>
</head>
<body class="bg-gray-50 text-gray-800">
    <div id="site-header"></div>
    <main class="container mx-auto px-4 py-8">
        <article class="article-content rl-body">
            <div class="flex flex-wrap items-center gap-2 mb-6 text-sm">
                <a href="../index.html" class="text-primary hover:underline">Home</a>
                <span class="text-gray-400">/</span>
                <a href="index.html" class="text-primary hover:underline">强化学习</a>
                <span class="text-gray-400">/</span>
                <span class="text-gray-500">{crumb}</span>
            </div>
            <div id="article-nav" class="flex flex-wrap gap-2 mb-6"></div>
            <div id="article-body" class="bg-white rounded-xl shadow-card p-6 md:p-10"></div>
            <div id="article-pager" class="flex justify-between gap-4 mt-8"></div>
        </article>
    </main>
    <div id="site-footer"></div>
    <textarea id="md-source" class="hidden" readonly>{markdown}</textarea>
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <script src="js/catalog.js"></script>
    <script src="js/common.js"></script>
    <script src="js/render.js"></script>
    <script>
        mermaid.initialize({{ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' }});
        RLChrome.mountChrome({{ root: '../' }});
        const currentSlug = {slug_json};
        const source = document.getElementById('md-source').value;
        RLRender.mountMarkdown(document.getElementById('article-body'), source, {{
            slugMap: window.RL_SLUG_MAP
        }});

        const posts = RL_POSTS;
        const index = posts.findIndex((item) => item.slug === currentSlug);
        const current = posts[index];
        const prev = index > 0 ? posts[index - 1] : null;
        const next = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;

        const nav = document.getElementById('article-nav');
        const chips = [
            `<a class="rl-nav-chip" href="index.html"><i class="fa fa-list"></i> 系列目录</a>`
        ];
        if (current && current.year) {{
            chips.push(`<span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">${{current.year}}</span>`);
        }}
        if (current && current.eraLabel) {{
            chips.push(`<span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">${{current.eraLabel}}</span>`);
        }}
        nav.innerHTML = chips.join('');

        const pager = document.getElementById('article-pager');
        pager.innerHTML = `
            ${{prev ? `<a class="flex-1 bg-white rounded-lg shadow-card p-4 hover:shadow-card-hover" href="${{prev.slug}}.html"><div class="text-xs text-gray-400 mb-1">上一篇</div><div class="font-medium text-gray-800">${{prev.cardTitle}}</div></a>` : '<div class="flex-1"></div>'}}
            ${{next ? `<a class="flex-1 bg-white rounded-lg shadow-card p-4 hover:shadow-card-hover text-right" href="${{next.slug}}.html"><div class="text-xs text-gray-400 mb-1">下一篇</div><div class="font-medium text-gray-800">${{next.cardTitle}}</div></a>` : '<div class="flex-1"></div>'}}
        `;
    </script>
</body>
</html>
"""


def main() -> None:
    POSTS.mkdir(parents=True, exist_ok=True)
    (OUT / "js").mkdir(parents=True, exist_ok=True)

    readme = (SRC / "README.md").read_text(encoding="utf-8")
    catalog_meta = parse_readme_catalog(readme)

    posts = []
    slug_map = {}

    md_files = sorted(path for path in SRC.glob("*.md") if path.name != "README.md")
    for path in md_files:
        text = path.read_text(encoding="utf-8")
        (POSTS / path.name).write_text(text, encoding="utf-8")
        slug = slug_for(path.name)
        slug_map[path.name] = slug

        heading = re.search(r"^#\s+(.+)$", text, re.M)
        title = heading.group(1).strip() if heading else path.stem
        meta = catalog_meta.get(path.name, {})
        day = meta.get("day")
        era_id, era_years, era_label = era_for_day(day)
        card_title = meta.get("shortTitle") or re.sub(r"^第\s*\d+\s*天｜", "", title)
        if path.name.startswith("00-"):
            card_title = "发展时间线总览"
            era_id, era_years, era_label = "overview", "", "总览"
            day = 0
        if path.name.startswith("61-"):
            card_title = "系列收尾"
            era_id, era_years, era_label = "epilogue", "", "收尾"
            day = 61

        posts.append(
            {
                "slug": slug,
                "file": path.name,
                "title": title,
                "cardTitle": card_title,
                "day": day,
                "year": meta.get("year"),
                "question": meta.get("question", ""),
                "excerpt": first_paragraph(text),
                "eraId": era_id,
                "eraYears": era_years,
                "eraLabel": era_label,
            }
        )

        crumb = card_title
        html = ARTICLE_TEMPLATE.format(
            title=title.replace("&", "&amp;"),
            crumb=crumb,
            markdown=text.replace("</textarea>", "&lt;/textarea&gt;"),
            slug_json=json.dumps(slug, ensure_ascii=False),
        )
        (OUT / f"{slug}.html").write_text(html, encoding="utf-8")

    posts.sort(key=lambda item: (item["day"] if item["day"] is not None else -1, item["slug"]))
    catalog_js = (
        "window.RL_POSTS = "
        + json.dumps(posts, ensure_ascii=False, indent=2)
        + ";\nwindow.RL_SLUG_MAP = "
        + json.dumps(slug_map, ensure_ascii=False, indent=2)
        + ";\n"
    )
    (OUT / "js" / "catalog.js").write_text(catalog_js, encoding="utf-8")
    print(f"Wrote {len(posts)} articles to {OUT}")


if __name__ == "__main__":
    main()
