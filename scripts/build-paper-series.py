#!/usr/bin/env python3
"""Generate llm / robot-learn / robot-classic modules from the desktop corpus."""

from __future__ import annotations

import json
import re
import shutil
from html import escape
from pathlib import Path

ROOT = Path("/Users/wangqiang/Downloads/VScode/wq-win.github.io")
SRC_ROOT = Path("/Users/wangqiang/Desktop/LLM与机器人300篇论文精读合集")

LLM_ERAS = [
    (2016, "early", "1997–2016", "序列与词表示"),
    (2019, "pretrain", "2017–2019", "Transformer 与预训练"),
    (2021, "scale", "2020–2021", "规模、检索与指令"),
    (2023, "align", "2022–2023", "推理、对齐与开源"),
    (9999, "system", "2024–2026", "推理系统与 Agent"),
]


def llm_era(year: int) -> tuple[str, str, str]:
    for max_year, era_id, years, label in LLM_ERAS:
        if year <= max_year:
            return era_id, years, label
    return LLM_ERAS[-1][1:]


def first_paragraph(md: str) -> str:
    skip = True
    for block in re.split(r"\n\s*\n", md):
        text = block.strip()
        if not text:
            continue
        if skip and text.startswith("#"):
            continue
        if skip and text.startswith("[") and "](" in text:
            continue
        if skip and text.startswith("**"):
            skip = False
            continue
        skip = False
        if text.startswith("#") or text.startswith("|") or text.startswith("```"):
            continue
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
        text = re.sub(r"[*_`]", "", text)
        return text[:180]
    return ""


def heading_title(md: str) -> str:
    match = re.search(r"^#\s+(.+)$", md, re.M)
    return match.group(1).strip() if match else ""


def card_title(title: str) -> str:
    title = re.sub(r"^第\s*\d+\s*天｜", "", title)
    title = re.sub(r"^\d{3}｜", "", title)
    return title.strip()


def slug_for(name: str) -> str:
    stem = Path(name).stem
    if stem.startswith("00-"):
        return "00-timeline"
    if stem.startswith("101-"):
        return "101-epilogue"
    return stem


def parse_llm_readme(text: str) -> dict[str, dict]:
    rows = {}
    for line in text.splitlines():
        match = re.match(
            r"\|\s*(\d{3})\s*\|\s*(\d{4})\s*\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|\s*([^|]+)\|",
            line,
        )
        if match:
            rows[match.group(4)] = {
                "day": int(match.group(1)),
                "year": int(match.group(2)),
                "paper": match.group(3).strip(),
                "theme": match.group(5).strip(),
            }
    return rows


def parse_rlearn_readme(text: str) -> dict[str, dict]:
    rows = {}
    for line in text.splitlines():
        match = re.match(
            r"\|\s*(\d+)\s*\|\s*(\d{4})\s*\|\s*\[([^\]]+)\]\(([^)]+\.md)\)\s*\|\s*([^|]+)\|",
            line,
        )
        if match:
            rows[match.group(4)] = {
                "day": int(match.group(1)),
                "year": int(match.group(2)),
                "paper": match.group(3).strip(),
                "theme": match.group(5).strip(),
            }
    return rows


def parse_classic_readme(text: str) -> dict[str, dict]:
    rows = {}
    for line in text.splitlines():
        match = re.match(
            r"\|\s*\[(\d{3})[^\]]*\]\(([^)]+\.md)\)\s*\|\s*(\d{4})\s*\|\s*([^|]+)\|",
            line,
        )
        if match:
            rows[match.group(2)] = {
                "day": int(match.group(1)),
                "year": int(match.group(3)),
                "paper": Path(match.group(2)).stem.split("-", 1)[-1],
                "theme": match.group(4).strip(),
            }
    return rows


def extract_mermaid(md: str) -> str:
    match = re.search(r"```mermaid\n([\s\S]+?)```", md)
    return match.group(1).strip() if match else ""


def theme_id(theme: str) -> str:
    return re.sub(r"[^\w\u4e00-\u9fff]+", "-", theme).strip("-") or "other"


ARTICLE_HTML = """<!DOCTYPE html>
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
                <a href="index.html" class="text-primary hover:underline">{series}</a>
                <span class="text-gray-400">/</span>
                <span class="text-gray-500">{crumb}</span>
            </div>
            <div id="article-nav" class="flex flex-wrap gap-2 mb-6"></div>
            <div id="article-body" class="bg-white rounded-xl shadow-card p-6 md:p-10"></div>
            <div id="article-pager" class="flex justify-between gap-4 mt-8"></div>
        </article>
    </main>
    <div id="site-footer"></div>
    <textarea id="md-source" class="hidden" readonly>@@MARKDOWN@@</textarea>
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <script src="js/catalog.js"></script>
    <script src="../js/site-chrome.js"></script>
    <script src="../js/md-render.js"></script>
    <script src="../js/series-article.js"></script>
    <script>
        SeriesArticle.boot({{
            posts: SERIES_POSTS,
            slugMap: SERIES_SLUG_MAP,
            slug: {slug_js},
            active: {active_js},
            seriesLabel: {series_js},
            root: '../'
        }});
    </script>
</body>
</html>
"""

HUB_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | MyLog</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
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
                    }},
                    boxShadow: {{
                        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    }}
                }}
            }}
        }}
    </script>
</head>
<body class="bg-gray-50 text-gray-800">
    <div id="site-header"></div>
    <main class="container mx-auto px-4 py-10 max-w-5xl">
        <section class="mb-12" data-aos="fade-up">
            <a href="../index.html#articles-section" class="back-to-home">
                <i class="fa fa-arrow-left"></i> 返回 Articles
            </a>
            <div class="flex flex-wrap items-center gap-2 mb-4">
                <span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">{badge}</span>
                <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">100 篇精读</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold mb-4 text-gray-800">{title}</h1>
            <p class="text-lg text-gray-600 mb-6">{blurb}</p>
            <div class="flex flex-wrap gap-3">
                <a href="00-timeline.html" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-all-300">先看时间线总览</a>
                <a href="{first_slug}.html" class="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-md hover:border-primary hover:text-primary transition-all-300">从第 1 篇开始</a>
                <a href="101-epilogue.html" class="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-md hover:border-primary hover:text-primary transition-all-300">系列总结</a>
            </div>
        </section>

        <section class="mb-12 bg-white rounded-lg shadow-card p-6" data-aos="fade-up">
            <h2 class="text-2xl font-bold mb-3">每篇文章怎么读</h2>
            <ol class="list-decimal pl-5 text-gray-700 space-y-2">
                {reading}
            </ol>
        </section>

        <section class="mb-12" data-aos="fade-up">
            <h2 class="text-2xl font-bold mb-4">全系列架构</h2>
            <p class="text-gray-600 mb-4">{arch_note}</p>
            <div class="mermaid bg-white rounded-lg shadow-card p-4 overflow-x-auto">
{mermaid}
            </div>
        </section>

        <section class="mb-8" data-aos="fade-up">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 class="text-2xl font-bold">100 篇目录</h2>
                <input id="series-search" type="text" placeholder="搜索论文、主题或年份…"
                    class="search-input w-full md:w-72 pl-4 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-primary">
            </div>
            <div id="series-era-filters" class="flex flex-wrap gap-2 mb-6"></div>
            <p class="text-sm text-gray-500 mb-4"><span id="series-count"></span></p>
            <div id="series-catalog" class="space-y-8"></div>
        </section>

        <section class="mb-8 bg-indigo-50 rounded-lg p-6" data-aos="fade-up">
            <h2 class="text-xl font-bold mb-2">最小阅读路线</h2>
            <p class="text-gray-700">{route}</p>
        </section>
    </main>
    <div id="site-footer"></div>
    <script src="js/catalog.js"></script>
    <script src="../js/site-chrome.js"></script>
    <script src="../js/series-hub.js"></script>
    <script>
        SeriesHub.init({{
            posts: SERIES_POSTS,
            eras: {eras_js},
            root: '../',
            active: {active_js},
            seriesLabel: {series_js}
        }});
    </script>
</body>
</html>
"""


def write_catalog(out_dir: Path, posts: list[dict]) -> None:
    slug_map = {}
    for post in posts:
        slug_map[post["file"]] = post["slug"]
        slug_map[Path(post["file"]).stem] = post["slug"]
    js = (
        "window.SERIES_POSTS = "
        + json.dumps(posts, ensure_ascii=False, indent=2)
        + ";\nwindow.SERIES_SLUG_MAP = "
        + json.dumps(slug_map, ensure_ascii=False, indent=2)
        + ";\n"
    )
    (out_dir / "js").mkdir(parents=True, exist_ok=True)
    (out_dir / "js" / "catalog.js").write_text(js, encoding="utf-8")


def build_posts(src: Path, meta: dict[str, dict], era_mode: str) -> list[dict]:
    posts = []
    files = sorted(src.glob("*.md"))
    for path in files:
        if path.name == "README.md":
            continue
        md = path.read_text(encoding="utf-8")
        title = heading_title(md)
        info = meta.get(path.name, {})
        slug = slug_for(path.name)
        if path.name.startswith("00-"):
            post = {
                "slug": slug,
                "file": path.name,
                "kind": "overview",
                "day": 0,
                "year": None,
                "title": title,
                "cardTitle": "发展时间线总览",
                "question": "各阶段的问题、方法与继承关系",
                "excerpt": first_paragraph(md),
                "eraId": "overview",
                "eraYears": "",
                "eraLabel": "总览",
            }
        elif path.name.startswith("101-"):
            post = {
                "slug": slug,
                "file": path.name,
                "kind": "epilogue",
                "day": 101,
                "year": None,
                "title": title,
                "cardTitle": "系列总结",
                "question": "跨论文比较与实验阅读方法",
                "excerpt": first_paragraph(md),
                "eraId": "epilogue",
                "eraYears": "",
                "eraLabel": "收尾",
            }
        else:
            year = info.get("year")
            theme = info.get("theme") or ""
            if era_mode == "year":
                era_id, era_years, era_label = llm_era(year or 0)
            else:
                era_id = theme_id(theme)
                era_years = ""
                era_label = theme
            post = {
                "slug": slug,
                "file": path.name,
                "kind": "paper",
                "day": info.get("day") or int(path.name[:3]),
                "year": year,
                "title": title,
                "cardTitle": card_title(title),
                "question": theme,
                "excerpt": first_paragraph(md),
                "eraId": era_id,
                "eraYears": era_years,
                "eraLabel": era_label,
            }
        posts.append(post)

    def sort_key(item: dict) -> tuple:
        if item["kind"] == "overview":
            return (0, 0)
        if item["kind"] == "epilogue":
            return (2, 0)
        return (1, item["day"])

    posts.sort(key=sort_key)
    return posts


def era_chips(posts: list[dict], era_mode: str) -> list[dict]:
    chips = [{"id": "all", "label": "全部"}]
    if era_mode == "year":
        seen = []
        for era_id, years, label in [(e[1], e[2], e[3]) for e in LLM_ERAS]:
            if any(p["eraId"] == era_id for p in posts if p["kind"] == "paper"):
                chips.append({"id": era_id, "label": f"{years} {label}"})
                seen.append(era_id)
        return chips
    seen = []
    for post in posts:
        if post["kind"] != "paper":
            continue
        if post["eraId"] not in seen:
            seen.append(post["eraId"])
            chips.append({"id": post["eraId"], "label": post["eraLabel"]})
    return chips


def build_module(cfg: dict) -> None:
    src: Path = cfg["src"]
    dest: Path = ROOT / cfg["id"]
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    posts_dir = dest / "posts"
    posts_dir.mkdir()
    for path in src.glob("*.md"):
        shutil.copy2(path, posts_dir / path.name)

    readme = (src / "README.md").read_text(encoding="utf-8")
    meta = cfg["parse"](readme)
    posts = build_posts(src, meta, cfg["era_mode"])
    write_catalog(dest, posts)

    timeline = next(src.glob("00-*.md")).read_text(encoding="utf-8")
    mermaid = extract_mermaid(timeline)
    first_paper = next(p for p in posts if p["kind"] == "paper")
    eras = era_chips(posts, cfg["era_mode"])
    hub = HUB_HTML.format(
        title=cfg["title"],
        badge=cfg["badge"],
        blurb=cfg["blurb"],
        first_slug=first_paper["slug"],
        reading="\n".join(f"<li>{item}</li>" for item in cfg["reading"]),
        arch_note=cfg["arch_note"],
        mermaid=mermaid,
        route=cfg["route"],
        eras_js=json.dumps(eras, ensure_ascii=False),
        active_js=json.dumps(cfg["id"]),
        series_js=json.dumps(cfg["short"]),
    )
    (dest / "index.html").write_text(hub, encoding="utf-8")

    for post in posts:
        md = (posts_dir / post["file"]).read_text(encoding="utf-8")
        if "</textarea>" in md.lower():
            raise SystemExit(f"textarea closer in {post['file']}")
        html = ARTICLE_HTML.format(
            title=escape(post["title"]),
            series=escape(cfg["short"]),
            crumb=escape(post["cardTitle"]),
            slug_js=json.dumps(post["slug"]),
            active_js=json.dumps(cfg["id"]),
            series_js=json.dumps(cfg["short"]),
        ).replace("@@MARKDOWN@@", md)
        (dest / f"{post['slug']}.html").write_text(html, encoding="utf-8")

    papers = [p for p in posts if p["kind"] == "paper"]
    print(f"{cfg['id']}: {len(papers)} papers, {len(posts)} pages")


MODULES = [
    {
        "id": "llm",
        "src": SRC_ROOT / "LLM100篇论文精读",
        "parse": parse_llm_readme,
        "era_mode": "year",
        "title": "大语言模型 100 篇：从词表示到推理系统",
        "short": "大语言模型",
        "badge": "Large Language Models",
        "blurb": "语言模型的发展，既是表示能力的变化，也是数据、计算与评价方式的变化。本系列以 100 篇论文为线索，从 LSTM、注意力和预训练读到检索、工具、对齐与测试时计算。",
        "reading": [
            "<strong>问题与背景</strong>：它真正修改的对象是表示、优化、数据还是推理时系统。",
            "<strong>方法与公式</strong>：关键机制用便于比较的记号写出，而不是复述接口。",
            "<strong>算法流程</strong>：教学伪代码帮助看清信息从哪里来、更新什么。",
            "<strong>实验设计</strong>：任务、数据、基线、预算和评价协议要分开核对。",
            "<strong>证据强度</strong>：结果支持什么，不能证明什么。",
            "<strong>贡献与代价</strong>：新能力来自哪个环节，以及引入了什么成本。",
            "<strong>自测</strong>：用机制题和边界题检查是否真的读懂。",
        ],
        "arch_note": "注意力、Transformer 与 LLM 不是同一层概念。MoE、LoRA 和 RAG 分别改变激活、微调和知识访问，可以同时出现在一个系统里。",
        "route": "先读 Transformer、BERT、GPT-3，建立预训练与上下文学习；再读 LoRA、InstructGPT、DPO，区分参数适配与偏好优化；最后把 RAG、ReAct 与测试时计算放在一起，理解模型之外的系统。",
    },
    {
        "id": "robot-learn",
        "src": SRC_ROOT / "机器人学习100篇论文精读",
        "parse": parse_rlearn_readme,
        "era_mode": "theme",
        "title": "机器人学习 100 篇：从运动基元到视觉语言动作",
        "short": "机器人学习",
        "badge": "Robot Learning",
        "blurb": "机器人学习研究怎样从示范、交互和已有数据中形成可执行的行为。算法不仅要预测正确，还必须在有延迟、有接触、有执行误差的物理系统里持续工作。",
        "reading": [
            "<strong>机器人设定</strong>：观测、动作、接触和重置条件先固定下来。",
            "<strong>学习信号</strong>：示范、奖励、离线数据还是模型想象，来源不同结论不能混用。",
            "<strong>方法机制</strong>：沿数据、模型、动作和反馈追踪一次执行。",
            "<strong>公式与伪代码</strong>：看清更新的是轨迹、策略还是世界模型。",
            "<strong>实验证据</strong>：仿真、真机、数据来源和评价协议要分开读。",
            "<strong>边界</strong>：迁移、实时性和长任务失败往往来自未声明的系统条件。",
            "<strong>自测</strong>：解释一个核心机制，再处理一个反例。",
        ],
        "arch_note": "运动表示、奖励推断、深度控制、世界模型和 VLA 面对的瓶颈不同，也经常组合在同一系统中。这张图是问题分解，不是互斥分类。",
        "route": "可先读 DMP、DAgger、DDPG／SAC、Diffusion Policy 与 OpenVLA，分别建立动作表示、模仿纠偏、连续控制、生成动作和视觉语言动作这条主线，再进入仿真迁移、离线学习或真机强化学习。",
    },
    {
        "id": "robot-classic",
        "src": SRC_ROOT / "机器人经典基础100篇论文精读",
        "parse": parse_classic_readme,
        "era_mode": "theme",
        "title": "机器人经典基础 100 篇：从几何表示到完整系统",
        "short": "机器人经典基础",
        "badge": "Robotics Foundations",
        "blurb": "机器人必须把不完整的观测转化为可执行的运动，并在接触、噪声与算力限制下保持可靠。本系列围绕位置、估计、动力学、规划、反馈与系统评价展开。",
        "reading": [
            "<strong>输入与输出</strong>：先回答输入是什么、输出是什么、哪一个假设使问题可解。",
            "<strong>表示</strong>：坐标系、状态定义和噪声模型一旦不一致，后续优化只会更快求出错误答案。",
            "<strong>方法与公式</strong>：推导采用便于教学的统一记号，不能据此推断原代码接口。",
            "<strong>误差传播</strong>：第二遍追踪代价、约束和误差如何进入下一模块。",
            "<strong>证据</strong>：区分数学结论、特定平台观察和向其他任务推广的推断。",
            "<strong>系统视角</strong>：单独提高某个模块指标，不必然改善完整任务成功率。",
            "<strong>自测</strong>：用机制与边界问答检查理解，不必逐字记忆定义。",
        ],
        "arch_note": "位置表示、状态估计、规划和控制长期并行发展。箭头是信息依赖：SLAM 的位姿误差会改变碰撞距离，规划轨迹又会影响未来可见的特征。",
        "route": "可先读 D-H、Kalman、A*、RRT 与 ORB-SLAM，建立几何、估计、搜索规划和同时定位与建图；再按控制、接触、腿足或视觉专题深入。",
    },
]


def main() -> None:
    for cfg in MODULES:
        build_module(cfg)


if __name__ == "__main__":
    main()
