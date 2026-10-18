# MyLog

[![中文](https://img.shields.io/badge/中文-当前语言-2563eb?style=for-the-badge)](README.zh-CN.md)
[![English](https://img.shields.io/badge/English-Read_in_English-64748b?style=for-the-badge)](README.md)

**wq-win** 的论文精读笔记、算法交互演示与浏览器小游戏。

[访问网站](https://wq-win.github.io/) · [演示与游戏](https://wq-win.github.io/game/) · [RSS 订阅](https://wq-win.github.io/rss.xml) · [反馈问题](https://github.com/wq-win/wq-win.github.io/issues)

网站使用 HTML、CSS 和 JavaScript 构建，部署在 GitHub Pages。文章和游戏界面以中文为主；上方两个按钮用于切换 README 的中英文版本。

## 内容导览

### 论文精读系列

| 系列 | 论文数量 | 主要内容 |
| --- | ---: | --- |
| [强化学习](https://wq-win.github.io/rl/) | 60 | 价值估计、策略、世界模型与语言模型强化学习 |
| [大语言模型](https://wq-win.github.io/llm/) | 100 | 表示、预训练、检索、对齐与推理 |
| [机器人学习](https://wq-win.github.io/robot-learn/) | 100 | 示范、交互、运动基元与视觉语言动作模型 |
| [机器人经典基础](https://wq-win.github.io/robot-classic/) | 100 | 几何、估计、规划、控制与 SLAM |

每个系列从 Day 0 入门导读开始，另有发展时间线与收尾总览。笔记尽量区分论文主张、原文证据，以及为了理解方法而补充的教学推演。

- 跨系列搜索，按研究阶段浏览
- 基于 Markdown 的文章，支持公式、图表与上一篇／下一篇导航
- 通过[概念图](https://wq-win.github.io/map.html)、[术语表](https://wq-win.github.io/glossary.html)和关联论文连接不同系列
- 当前段落目录与符号提示、中英首现旁注，以及移动端术语弹层
- 共用 104 个概念词条和 70 个带语境的符号条目，可搜索中英文和用途
- 明暗主题与响应式布局；右上角外观菜单可选静态、浮光、极光、星尘，并调节强度、速度或暂停

### 算法交互演示

[演示入口](https://wq-win.github.io/game/)目前包含 17 个算法演示：

- 强化学习：Q-learning、价值迭代、REINFORCE、SARSA 与 Q-learning 对比
- 大语言模型：注意力、位置编码、Softmax 温度、BPE
- 机器人经典基础：A*、RRT、Kalman 滤波、人工势场、PID、ICP
- 机器人学习：DMP、DAgger、域随机化

### 浏览器小游戏

- [迷你塔防](https://wq-win.github.io/game/tower-defense.html)：建造、升级箭塔、魔法塔和炮塔，挑战二十个难度递增的关卡，每关十五波进攻，支持暂停与加速。
- [接线谜题](https://wq-win.github.io/game/net.html)：旋转线路连接电源与终点；共 20 关，棋盘从 5×5 逐步扩大至 14×15，支持重置、提示与键盘操作。

- [跑得快](https://wq-win.github.io/game/paodekuai.html)：与两位电脑牌友对局，每人十六张。支持点选／横滑选牌、合法出牌提示轮换、无牌可压时自动不出，以及基于公开信息的记牌器。记牌器扣除自己的手牌和已出牌，不展示任何一位对手的具体手牌。
- [斗地主残局](https://wq-win.github.io/game/doudizhu.html)：11 关一对一明牌残局，提供策略提示、重开确认、通关进度保存，以及明确的重试／下一关操作。提示只选牌，不自动出牌；搜索达到上限时，会标明提示仅为合法参考，不保证获胜。
- [蜘蛛纸牌](https://wq-win.github.io/game/spider.html)、[数独](https://wq-win.github.io/game/sudoku.html)、[江湖 Slay](https://wq-win.github.io/game/jianghu-slay.html)

跑得快与斗地主残局使用统一的蓝金牌桌风格、原创人物画像和 J／Q／K 宫廷牌面。素材来源见[素材说明](game/assets/paodekuai/README.md)。

## 本地运行

需要 Git 和 Python 3。只有运行游戏回归测试时才需要 Node.js。

```sh
git clone https://github.com/wq-win/wq-win.github.io.git
cd wq-win.github.io
python3 -m http.server 8000 --bind 127.0.0.1
```

在浏览器打开 <http://localhost:8000/>。请从仓库根目录启动 HTTP 服务，让根路径资源和搜索索引加载正常。预览已提交的网站不需要安装依赖或执行构建；部分文章渲染库从 CDN 加载，需要联网。

## 项目结构

```text
wq-win.github.io/
├── index.html                 # 网站首页
├── README.md                  # 英文说明
├── README.zh-CN.md             # 中文说明
├── rl/                        # 强化学习系列
├── llm/                       # 大语言模型系列
├── robot-learn/               # 机器人学习系列
├── robot-classic/             # 机器人经典基础系列
│   └── （各系列均含 HTML 页面、posts/ 和 js/catalog.js）
├── game/                      # 小游戏与分类算法演示
│   └── assets/paodekuai/       # 共享牌桌素材
├── css/                       # 网站与游戏样式
├── fonts/                     # 本地图标字体
├── js/                        # 网站脚本、渲染器与游戏引擎
├── data/search-index.json     # 生成的跨系列搜索索引
├── scripts/                   # 论文系列生成脚本
├── tools/                     # 站点数据构建与回归测试
├── map.html                   # 跨系列概念图
├── glossary.html              # 术语表
├── rss.xml                    # RSS 订阅源
└── sitemap.xml                # 站点地图
```

## 维护网站

### 文章与导航

1. Markdown 源文件放在对应系列的 `posts/` 目录中。
2. 同步更新该系列的对应 HTML 页面及 `js/catalog.js`。文章页面内嵌了 Markdown，单独修改 `.md` 源文件不会更新线上文章。
3. 如需批量生成，先检查 `scripts/build-rl.py` 和 `scripts/build-paper-series.py`。它们目前使用作者本机的源文件路径，在其他环境运行前需要调整。
4. 修改页面与目录后，重新生成搜索索引、关联论文数据、站点地图、RSS 和 robots 文件：

```sh
python3 tools/build-site-data.py
```

站点信息与导航配置在 `js/site-config.js`。公共样式位于 `css/style.css`，各 HTML 页面也有 Tailwind 配置。棋牌游戏的样式与控制逻辑分别放在 `css/` 和 `js/` 下的独立文件中。

### 游戏检查

在仓库根目录使用 Node.js 运行：

```sh
node tools/paodekuai-ui-test.js
node tools/doudizhu-ui-test.js
git diff --check
```

这些测试不需要额外安装依赖，通过模拟 DOM 检查游戏逻辑与控制流程，不能替代真实浏览器中的布局、触控、图片加载及无障碍检查。详见[跑得快检查清单](tools/paodekuai-qa.md)与[斗地主残局检查清单](tools/doudizhu-qa.md)。

### 阅读层检查

360 篇论文与四篇 Day 0 已包含静态正文及本地 KaTeX 公式，关闭 JavaScript 仍可阅读；共享脚本再添加阅读工具。源码保留检查、重新生成命令及既有 LSTM 公式的原文问题，见[阅读层构建与验收说明](tools/reading-qa.md)。

### GitHub Pages

仓库内已提交的文件组成静态网站，可直接从仓库根目录提供服务。如果 fork 本项目，请修改 `js/site-config.js` 和 `tools/build-site-data.py` 中的站点地址，重新生成站点数据，并为自己的仓库配置 GitHub Pages。资源使用的根相对路径默认网站部署在域名根目录。

## 依赖与致谢

- HTML、CSS 与原生 JavaScript
- Tailwind CSS v3、Font Awesome：样式与图标
- AOS：滚动动画
- Marked、KaTeX、Mermaid：文章渲染
- 最初的博客设计参考：Lilian Weng 的博客
- 牌桌素材：[创作与复用说明](game/assets/paodekuai/README.md)

## 许可证

沿用原 README 中的 MIT 声明。本仓库目前尚未包含独立的 `LICENSE` 文件。第三方依赖各自遵循其原有许可证。
