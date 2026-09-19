#!/usr/bin/env python3
"""Generate search index, related-paper map, sitemap, RSS, and robots.txt."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://wq-win.github.io"

SERIES = [
    {
        "id": "rl",
        "dir": "rl",
        "label": "强化学习",
        "catalog": "rl/js/catalog.js",
        "marker": "window.RL_POSTS",
    },
    {
        "id": "llm",
        "dir": "llm",
        "label": "大语言模型",
        "catalog": "llm/js/catalog.js",
        "marker": "window.SERIES_POSTS",
    },
    {
        "id": "robot-learn",
        "dir": "robot-learn",
        "label": "机器人学习",
        "catalog": "robot-learn/js/catalog.js",
        "marker": "window.SERIES_POSTS",
    },
    {
        "id": "robot-classic",
        "dir": "robot-classic",
        "label": "机器人经典基础",
        "catalog": "robot-classic/js/catalog.js",
        "marker": "window.SERIES_POSTS",
    },
]

ALIASES = {
    "ppo": ["ppo"],
    "trpo": ["trpo"],
    "gae": ["gae"],
    "reinforce": ["reinforce"],
    "q-learning": ["q-learning", "double-q", "double-dqn", "dqn", "dueling-dqn"],
    "dqn": ["dqn", "double-dqn", "dueling-dqn", "rainbow", "per", "c51"],
    "ddpg": ["dpg", "ddpg", "td3", "naf"],
    "sac": ["sac"],
    "her": ["her"],
    "gps": ["gps"],
    "gail": ["gail"],
    "dagger": ["dagger"],
    "dreamer": ["dreamer", "dreamerv3", "daydreamer"],
    "mbpo": ["mbpo"],
    "pets": ["pets"],
    "cql": ["cql"],
    "awac": ["awac"],
    "iql": ["iql"],
    "dpo": ["dpo", "mbdpo", "ipo", "kto"],
    "instructgpt": ["instructgpt", "rlaif"],
    "grpo": ["grpo", "dr-grpo"],
    "r1": ["r1"],
    "dapo": ["dapo"],
    "transformer": ["transformer", "transformer-xl"],
    "attention": ["attention", "flashattention", "gqa"],
    "bert": ["bert", "roberta", "albert", "electra"],
    "gpt": ["gpt", "gpt2", "gpt3", "gpt4"],
    "lora": ["lora", "qlora", "adapters", "prefix-tuning", "prompt-tuning"],
    "rag": ["rag", "self-rag", "dpr", "realm", "fid", "graphrag"],
    "clip": ["clip", "clipport", "blip2", "flamingo", "llava"],
    "moe": ["sparse-moe", "switch", "gshard", "mixtral"],
    "mamba": ["mamba", "mamba2"],
    "llama": ["llama", "llama2"],
    "astar": ["astar", "dstar", "dstar-lite", "anytime-dstar"],
    "rrt": ["rrt", "rrt-connect", "rrtstar", "informed-rrtstar", "bitstar"],
    "slam": ["graphslam", "fastslam", "orbslam", "orbslam2", "orbslam3", "lsdslam", "svo", "dso", "ptam"],
    "kalman": ["kalman", "isam", "isam2", "g2o", "se-sync"],
    "icp": ["icp", "kissicp", "loam", "legoloam", "liosam", "fastlio2"],
    "occupancy": ["occupancy", "octomap"],
    "dmp": ["dmp", "promp"],
    "diffusion": ["diffusion-policy", "diffuser", "dp3", "diffusion-rl", "rdt"],
    "vla": ["rt1", "rt2", "openvla", "openvla-oft", "pi0", "pi05", "smolvla", "groot", "octo"],
    "saycan": ["saycan", "palm-e", "voxposer"],
    "worldmodel": ["dreamer", "dreamerv3", "daydreamer", "worldsample", "tdmpc", "tdmpc2"],
}

EXTRA_EDGES = [
    ("rl:27-ppo", "llm:054-instructgpt"),
    ("rl:47-instructgpt", "llm:054-instructgpt"),
    ("rl:49-dpo", "llm:075-dpo"),
    ("rl:52-grpo", "llm:086-deepseekmath"),
    ("rl:52-grpo", "llm:094-r1"),
    ("rl:53-r1", "llm:094-r1"),
    ("rl:54-dapo", "llm:097-dapo"),
    ("rl:12-gps", "robot-learn:009-gps"),
    ("rl:23-gail", "robot-learn:015-gail"),
    ("rl:26-her", "robot-learn:022-her"),
    ("rl:17-ddpg", "robot-learn:011-ddpg"),
    ("rl:30-sac", "robot-learn:025-sac"),
    ("rl:31-td3", "robot-learn:026-td3"),
    ("rl:35-pets", "robot-learn:029-pets"),
    ("rl:39-mbpo", "robot-learn:033-mbpo"),
    ("rl:40-dreamer", "robot-learn:037-dreamer"),
    ("rl:42-cql", "robot-learn:038-cql"),
    ("rl:43-awac", "robot-learn:039-awac"),
    ("rl:46-iql", "robot-learn:047-iql"),
    ("rl:56-mbdpo", "robot-learn:097-mbdpo"),
    ("rl:57-worldsample", "robot-learn:099-worldsample"),
    ("llm:043-clip", "robot-learn:046-clipport"),
    ("llm:043-clip", "robot-learn:065-rt2"),
    ("llm:060-react", "robot-learn:051-saycan"),
    ("llm:071-llava", "robot-learn:082-openvla"),
    ("robot-learn:001-dmp", "robot-classic:065-min-snap"),
    ("robot-learn:014-hand-eye", "robot-classic:024-hand-eye"),
    ("robot-classic:003-astar", "robot-classic:040-rrt"),
    ("robot-classic:002-kalman", "robot-classic:041-mcl"),
    ("rl:04-q-learning", "game:rl-q-learning"),
    ("llm:007-attention", "game:llm-attention"),
    ("llm:015-transformer", "game:llm-attention"),
    ("robot-classic:003-astar", "game:classic-astar"),
    ("robot-classic:040-rrt", "game:classic-rrt"),
    ("robot-learn:001-dmp", "game:learn-dmp"),
    ("rl:05-reinforce", "game:rl-pg"),
    ("rl:02-td-lambda", "game:rl-value"),
    ("llm:015-transformer", "game:llm-pe"),
    ("llm:017-gpt", "game:llm-softmax"),
    ("robot-classic:002-kalman", "game:classic-kalman"),
    ("robot-classic:014-potential-field", "game:classic-potential"),
    ("robot-learn:006-dagger", "game:learn-dagger"),
    ("rl:06-sarsa", "game:rl-cliff"),
    ("llm:011-bpe", "game:llm-bpe"),
    ("robot-classic:013-impedance", "game:classic-pid"),
    ("robot-classic:028-icp", "game:classic-icp"),
    ("robot-learn:018-domain-randomization", "game:learn-dr"),
]

STATIC_PAGES = [
    {
        "url": "index.html",
        "title": "MyLog 首页",
        "cardTitle": "首页",
        "question": "论文精读",
        "excerpt": "强化学习、大语言模型、机器人学习与机器人经典基础论文精读。",
        "series": "site",
        "seriesLabel": "站点",
        "year": 2026,
    },
    {
        "url": "glossary.html",
        "title": "关键概念名词表",
        "cardTitle": "名词表",
        "question": "术语解释",
        "excerpt": "精读里反复出现的概念：价值、策略、注意力、规划、SLAM、VLA。",
        "series": "site",
        "seriesLabel": "站点",
        "year": 2026,
    },
    {
        "url": "map.html",
        "title": "跨系列概念图",
        "cardTitle": "概念图",
        "question": "相关篇跳转",
        "excerpt": "把四套精读里互相引用的方法放在同一张图上。",
        "series": "site",
        "seriesLabel": "站点",
        "year": 2026,
    },
    {
        "url": "game/index.html",
        "title": "演示与游戏",
        "cardTitle": "演示与游戏",
        "question": "交互演示",
        "excerpt": "数独、江湖 Slay，以及四套精读对应的算法演示。",
        "series": "game",
        "seriesLabel": "演示",
        "year": 2026,
    },
    {
        "url": "game/sudoku.html",
        "title": "Sudoku",
        "cardTitle": "Sudoku",
        "question": "数独",
        "excerpt": "可在线游玩的数独。",
        "series": "game",
        "seriesLabel": "演示",
        "year": 2026,
    },
    {
        "url": "game/jianghu-slay.html",
        "title": "江湖 Slay",
        "cardTitle": "江湖 Slay",
        "question": "卡牌对战",
        "excerpt": "可在线游玩的江湖 Slay，支持人机和房间对战。",
        "series": "game",
        "seriesLabel": "演示",
        "year": 2026,
    },
    {
        "url": "game/rl/q-learning.html",
        "title": "Q-learning 迷宫",
        "cardTitle": "Q-learning 迷宫",
        "question": "价值学习",
        "excerpt": "必须绕行的迷宫里，Q-learning 如何更新动作价值。",
        "series": "game",
        "seriesLabel": "强化学习演示",
        "year": 2026,
        "id": "game:rl-q-learning",
    },
    {
        "url": "game/llm/attention.html",
        "title": "注意力可视化",
        "cardTitle": "注意力可视化",
        "question": "注意力",
        "excerpt": "相同词和动宾互相对齐，而不是位置编码的对角线。",
        "series": "game",
        "seriesLabel": "大语言模型演示",
        "year": 2026,
        "id": "game:llm-attention",
    },
    {
        "url": "game/robot-classic/astar.html",
        "title": "A* 寻路",
        "cardTitle": "A* 寻路",
        "question": "图搜索",
        "excerpt": "在网格上比较启发式搜索如何绕开障碍到达目标。",
        "series": "game",
        "seriesLabel": "机器人经典演示",
        "year": 2026,
        "id": "game:classic-astar",
    },
    {
        "url": "game/robot-classic/rrt.html",
        "title": "RRT 路径树",
        "cardTitle": "RRT 路径树",
        "question": "采样规划",
        "excerpt": "观察随机树如何在连续空间里生长并连向目标。",
        "series": "game",
        "seriesLabel": "机器人经典演示",
        "year": 2026,
        "id": "game:classic-rrt",
    },
    {
        "url": "game/robot-learn/dmp.html",
        "title": "DMP 运动基元",
        "cardTitle": "DMP 运动基元",
        "question": "运动表示",
        "excerpt": "把一条示范轨迹写成可改目标的动力系统。",
        "series": "game",
        "seriesLabel": "机器人学习演示",
        "year": 2026,
        "id": "game:learn-dmp",
    },
    {
        "url": "game/rl/value-iteration.html",
        "title": "价值迭代",
        "cardTitle": "价值迭代",
        "question": "贝尔曼最优",
        "excerpt": "从终点把价值备份扩散到迷宫。",
        "series": "game",
        "seriesLabel": "强化学习演示",
        "year": 2026,
        "id": "game:rl-value",
    },
    {
        "url": "game/rl/policy-gradient.html",
        "title": "REINFORCE 倒立摆",
        "cardTitle": "REINFORCE 倒立摆",
        "question": "策略梯度",
        "excerpt": "用回合回报更新倒立摆左右推力的概率。",
        "series": "game",
        "seriesLabel": "强化学习演示",
        "year": 2026,
        "id": "game:rl-pg",
    },
    {
        "url": "game/llm/positional.html",
        "title": "正弦位置编码",
        "cardTitle": "正弦位置编码",
        "question": "位置编码",
        "excerpt": "不同频率的 sin/cos，邻近位置更相似。",
        "series": "game",
        "seriesLabel": "大语言模型演示",
        "year": 2026,
        "id": "game:llm-pe",
    },
    {
        "url": "game/llm/softmax.html",
        "title": "Softmax 与温度",
        "cardTitle": "Softmax 与温度",
        "question": "采样",
        "excerpt": "温度如何把 logit 变成词表分布。",
        "series": "game",
        "seriesLabel": "大语言模型演示",
        "year": 2026,
        "id": "game:llm-softmax",
    },
    {
        "url": "game/robot-classic/kalman.html",
        "title": "Kalman 跟踪",
        "cardTitle": "Kalman 跟踪",
        "question": "状态估计",
        "excerpt": "噪声观测、滤波估计和协方差椭圆。",
        "series": "game",
        "seriesLabel": "机器人经典演示",
        "year": 2026,
        "id": "game:classic-kalman",
    },
    {
        "url": "game/robot-classic/potential.html",
        "title": "人工势场",
        "cardTitle": "人工势场",
        "question": "势场规划",
        "excerpt": "吸引、排斥和局部最小。",
        "series": "game",
        "seriesLabel": "机器人经典演示",
        "year": 2026,
        "id": "game:classic-potential",
    },
    {
        "url": "game/robot-learn/dagger.html",
        "title": "行为克隆 vs DAgger",
        "cardTitle": "行为克隆 vs DAgger",
        "question": "模仿学习",
        "excerpt": "只克隆专家会冲出弯道；DAgger 在学习者状态上问专家。",
        "series": "game",
        "seriesLabel": "机器人学习演示",
        "year": 2026,
        "id": "game:learn-dagger",
    },
    {
        "url": "game/rl/cliff.html",
        "title": "悬崖：SARSA vs Q-learning",
        "cardTitle": "悬崖：SARSA vs Q",
        "question": "on-policy",
        "excerpt": "Q-learning 贴着悬崖抄近路；SARSA 把探索掉下去的风险算进价值，选择绕远。",
        "series": "game",
        "seriesLabel": "强化学习演示",
        "year": 2026,
        "id": "game:rl-cliff",
    },
    {
        "url": "game/llm/bpe.html",
        "title": "BPE 分词",
        "cardTitle": "BPE 分词",
        "question": "子词",
        "excerpt": "从字符开始反复合并最高频相邻对。",
        "series": "game",
        "seriesLabel": "大语言模型演示",
        "year": 2026,
        "id": "game:llm-bpe",
    },
    {
        "url": "game/robot-classic/pid.html",
        "title": "PID 跟踪",
        "cardTitle": "PID 跟踪",
        "question": "反馈控制",
        "excerpt": "比例、积分、微分如何把带阻尼的质点拉向目标。",
        "series": "game",
        "seriesLabel": "机器人经典演示",
        "year": 2026,
        "id": "game:classic-pid",
    },
    {
        "url": "game/robot-classic/icp.html",
        "title": "ICP 点云配准",
        "cardTitle": "ICP 点云配准",
        "question": "配准",
        "excerpt": "最近邻对应后，用刚体变换把扫描对齐到目标形状。",
        "series": "game",
        "seriesLabel": "机器人经典演示",
        "year": 2026,
        "id": "game:classic-icp",
    },
    {
        "url": "game/robot-learn/domain-rand.html",
        "title": "域随机化",
        "cardTitle": "域随机化",
        "question": "sim-to-real",
        "excerpt": "只在单一质量和风力下克隆会失败；训练时随机动力学更稳。",
        "series": "game",
        "seriesLabel": "机器人学习演示",
        "year": 2026,
        "id": "game:learn-dr",
    },
]

TOKEN_RE = re.compile(r"^\d+-")


def extract_json_array(text: str, marker: str):
    idx = text.find(marker)
    if idx < 0:
        raise ValueError(f"marker not found: {marker}")
    start = text.find("[", idx)
    depth = 0
    for i, ch in enumerate(text[start:], start):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("unbalanced array")


def token_of(slug: str) -> str:
    return TOKEN_RE.sub("", str(slug or "")).lower()


def alias_group(token: str) -> str:
    for group, members in ALIASES.items():
        if token in members or group == token:
            return group
    return token


def normalize_kind(post: dict) -> str:
    if post.get("kind"):
        return post["kind"]
    slug = str(post.get("slug") or "")
    if "timeline" in slug:
        return "overview"
    if "epilogue" in slug:
        return "epilogue"
    return "paper"


def collect_items():
    items = []
    for series in SERIES:
        posts = extract_json_array((ROOT / series["catalog"]).read_text(), series["marker"])
        for post in posts:
            slug = post["slug"]
            items.append(
                {
                    "id": f"{series['id']}:{slug}",
                    "series": series["id"],
                    "seriesLabel": series["label"],
                    "slug": slug,
                    "url": f"{series['dir']}/{slug}.html",
                    "title": post.get("title") or post.get("cardTitle") or slug,
                    "cardTitle": post.get("cardTitle") or post.get("shortTitle") or post.get("title") or slug,
                    "question": post.get("question") or "",
                    "excerpt": re.sub(r"\*\*", "", str(post.get("excerpt") or ""))[:280],
                    "year": post.get("year"),
                    "era": post.get("eraLabel") or "",
                    "kind": normalize_kind(post),
                    "token": token_of(slug),
                }
            )
    for page in STATIC_PAGES:
        items.append(
            {
                "id": page.get("id") or f"site:{page['url']}",
                "series": page["series"],
                "seriesLabel": page["seriesLabel"],
                "slug": page["url"],
                "url": page["url"],
                "title": page["title"],
                "cardTitle": page["cardTitle"],
                "question": page["question"],
                "excerpt": page["excerpt"],
                "year": page.get("year"),
                "era": "",
                "kind": "page",
                "token": "",
            }
        )
    return items


def build_related(items):
    by_id = {item["id"]: item for item in items}
    groups = {}
    for item in items:
        if item["kind"] == "page":
            continue
        group = alias_group(item["token"])
        if not group:
            continue
        groups.setdefault(group, []).append(item["id"])

    related = {}

    def add(src, dst, reason):
        if not src or not dst or src == dst or dst not in by_id:
            return
        related.setdefault(src, [])
        if any(entry["id"] == dst for entry in related[src]):
            return
        related[src].append({"id": dst, "reason": reason})

    for ids in groups.values():
        if len(ids) < 2:
            continue
        series_set = {item_id.split(":")[0] for item_id in ids}
        reason = "跨系列同一方法" if len(series_set) > 1 else "同系列相关方法"
        for src in ids:
            for dst in ids:
                add(src, dst, reason)

    for src, dst in EXTRA_EDGES:
        add(src, dst, "对照阅读")
        add(dst, src, "对照阅读")

    packed = {}
    for item in items:
        if item["kind"] == "page":
            continue
        entries = related.get(item["id"], [])
        entries.sort(key=lambda entry: 0 if entry["id"].split(":")[0] != item["series"] else 1)
        packed[item["id"]] = []
        for entry in entries[:8]:
            target = by_id[entry["id"]]
            packed[item["id"]].append(
                {
                    "id": target["id"],
                    "url": target["url"],
                    "title": target["cardTitle"],
                    "seriesLabel": target["seriesLabel"],
                    "reason": entry["reason"],
                    "kind": target["kind"],
                }
            )
    return packed


def xml_escape(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def write_sitemap(items):
    urls = "\n".join(f"  <url><loc>{ORIGIN}/{item['url']}</loc></url>" for item in items)
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n</urlset>\n"
    )


def write_rss(items):
    papers = [item for item in items if item["kind"] == "paper"][:80]
    entries = []
    for item in papers:
        entries.append(
            f"""
    <item>
      <title>{xml_escape(item['seriesLabel'] + '｜' + item['cardTitle'])}</title>
      <link>{ORIGIN}/{item['url']}</link>
      <guid>{ORIGIN}/{item['url']}</guid>
      <description>{xml_escape(item['excerpt'] or item['question'])}</description>
    </item>"""
        )
    (ROOT / "rss.xml").write_text(
        f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>MyLog 论文精读</title>
    <link>{ORIGIN}/</link>
    <description>强化学习、大语言模型、机器人学习与机器人经典基础论文精读。</description>
    <language>zh-CN</language>
    {''.join(entries)}
  </channel>
</rss>
"""
    )


def main():
    items = collect_items()
    related = build_related(items)
    search = [
        {
            "id": item["id"],
            "url": item["url"],
            "title": item["title"],
            "cardTitle": item["cardTitle"],
            "question": item["question"],
            "excerpt": item["excerpt"],
            "series": item["series"],
            "seriesLabel": item["seriesLabel"],
            "year": item["year"],
            "era": item["era"],
            "kind": item["kind"],
        }
        for item in items
    ]
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data/search-index.json").write_text(json.dumps(search, ensure_ascii=False, indent=2))
    (ROOT / "js/related-data.js").write_text(
        "window.RELATED_PAPERS = " + json.dumps(related, ensure_ascii=False) + ";\n"
    )
    write_sitemap(items)
    write_rss(items)
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {ORIGIN}/sitemap.xml\n")
    print(f"Indexed {len(search)} entries; {len(related)} related maps")


if __name__ == "__main__":
    main()
