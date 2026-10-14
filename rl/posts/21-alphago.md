# 第 21 天｜AlphaGo：策略、价值与树搜索如何分工

[系列首页](README.md) · [上一篇](20-dueling-dqn.md) · [下一篇](22-a3c.md)

**原论文与版本**：*Mastering the game of Go with deep neural networks and tree search*，2016。[原论文](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf)。

### 先接住前作的问题

[REINFORCE](05-reinforce.md)可以用胜负更新策略，[价值学习](04-q-learning.md)可以评价未来，但围棋还需要在落子时比较许多长分支。

## 一、问题设定：策略会落子之后，搜索还需要学会什么

一个擅长预测人类落子的策略，未必已经知道复杂局面的胜率，也未必给搜索提供最好的候选多样性。原版AlphaGo的问题是怎样让多个学习组件为搜索服务，并让搜索反过来利用终局模拟，而不是用单一分类准确率代表棋力。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 双人零和棋类、自我对弈与已知规则模型规划 |
| 状态／观测 | 棋盘及合法落子相关历史 |
| 动作 | 合法落子或停着 |
| 奖励或学习信号 | 最终胜负 |
| 终止／边界 | 终局规则决定胜负 |

## 二、把候选先验、叶子评价与回传分工

原版AlphaGo是一条多阶段系统，不是一张端到端网络包办全部任务。监督策略学习人类落子分布，强化策略通过自我对弈改善胜负回报，价值网络学习局面胜率，快速rollout策略则为搜索提供便宜的终局样本。

搜索时先验决定哪些分支值得先试，Q累积模拟评价，访问计数调节探索。到达叶子后，价值网络和rollout给出互补评估，再沿路径回传。原文搜索先验使用监督策略，而不是直接用更强的RL策略替代：搜索需要候选多样性，单独落子胜率更高不等于先验最好。

价值训练的数据去相关也很关键。一盘棋相邻局面几乎一样，却共享同一胜负标签，容易记忆整盘结果。原文为价值网络生成大量独立自我对弈棋局，每局只采一个位置。这里“学价值”和“搜价值”使用的数据预算与计算预算完全不同。

### 用价值预测与rollout共同评价叶子

教学搜索规则 $a=\arg\max_a[Q(s,a)+u(s,a)]$；u 随先验概率增大、随访问次数减少。叶子评价混合价值预测与rollout结果。不同组件损失分别是棋谱似然、胜负策略梯度与胜负价值回归。

混合叶子评价可以直接写为[原文PDF第3页](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf#page=3)的

$$V_{\mathrm{leaf}}(s_L)=(1-\lambda)v_\theta(s_L)+\lambda z_L.$$

$v_\theta$ 是价值网络的终局结果预测，$z_L$ 是快速rollout实际走到终局的结果，$\lambda$ 控制两种评估的混合。一次模拟把这一评价回传到经过边的累计结果和访问计数，$Q$ 再由相应平均得到；所有结果须使用一致的执棋方视角。策略先验影响“先搜哪里”，混合评价影响“这条分支值多少”，所以不能用更准确的落子分类损失代替搜索价值证据。

### 累计回传值需要统一胜负视角

叶子胜负和价值预测必须先换到被更新边所采用的执棋方视角。同一终局对黑方是胜，对白方就是负；若直接把原符号沿所有层相加，搜索可能在对手节点替自己选择有利动作，破坏博弈评价。

### 检验低先验分支怎样凭评价获选

以下是可手算的教学构造，不是论文实验。

根节点两步棋先验分别0.8和0.2。假设目前Q为0.4和0.7，访问次数80和5，教学探索项取$u=P/(1+N)$。两分支得分约0.4099和0.7333，因此搜索可改选先验较低的第二步。

这不是原文完整搜索公式的复刻，而是说明先验不是最终答案。增加模拟后，估计Q与计数一起变化；不能只从策略预测准确率推断最终搜索棋力。

## 三、分别训练组件并在每次模拟中更新统计


```text
先用人类棋谱训练监督策略
从监督初始化策略，做自我对弈强化学习
用自我对弈局面与终局结果训练价值网络
对每个实战局面：
  多次沿 Q+探索项选择树路径
  扩展叶节点，计算策略先验
  用价值网络及快速rollout评价叶子
  将评价回传到访问计数和平均价值
  根据根节点统计选择落子
输出：搜索后的落子
```

**实现要点**：不是AlphaGo Zero，训练使用人类棋谱与大量搜索资源。

## 四、从组件误差读到完整系统对局

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | 围棋程序比较与樊麾对局 |
| 数据来源与规模 | 监督策略使用KGS的约3000万局面；价值网络使用自我对弈的约3000万不同对局各抽一个局面 |
| 对比基线 | 原文其他围棋程序与不同组件配置 |
| 训练预算与资源 | 单机搜索48CPU与8GPU；分布式版1202CPU与176GPU。[图4](#rl-21-figure-4)程序比赛约5秒每步；其他对局时间规则另计 |
| 指标及其含义 | 胜率、棋力、搜索性能 |
| 随机性与不确定性 | [图4](#rl-21-figure-4)包含95%置信区间；五局人类比赛不是五个独立训练种子 |
| 实际验证的假设 | 学习到的先验与价值能否使搜索达到高棋力 |

**实验解读（本文分析）**：正文与Methods说明监督策略使用3000万棋盘位置，而价值网络的数据为超过3000万、各来自不同棋局的位置；二者不是同一份训练集。[图2](#rl-21-figure-2)检验策略准确率和价值误差，[图4](#rl-21-figure-4)才看完整系统、组件和搜索资源。论文对樊麾的5:0也不能被写成后来李世石比赛的结果。

<!-- figure-ref-v6:start:rl-21-figure-2 -->
<figure class="reading-evidence-figure" id="rl-21-figure-2"><a href="/rl/assets/reference-v6/21-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/21-figure-2.png" width="1143" height="306" alt="a图将棋谱预测准确率与对抗胜率分开，准确率接近的网络也可能有不同棋力；b图比较不同局面步数上的价值均方误差。不能由单个监督准确率替代整套搜索的对局强度。" loading="lazy"></a><figcaption>原论文图形摘引｜Silver等，2016，图2，PDF第2页。<a href="https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf#page=2" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

a图将棋谱预测准确率与对抗胜率分开，准确率接近的网络也可能有不同棋力；b图比较不同局面步数上的价值均方误差。不能由单个监督准确率替代整套搜索的对局强度。
<!-- figure-ref-v6:end:rl-21-figure-2 -->

### 区分图2组件测量与图4完整系统

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-21-figure-4 -->
<span id="rl-21-figure-4"></span>
<!-- figure-ref-v6:end:anchor-rl-21-figure-4 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/21-alphago-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/21-alphago-figure-4.png" width="1395" height="492" alt="AlphaGo的对战Elo、搜索组件消融和硬件搜索规模对比" loading="lazy"></a><figcaption>原论文图形摘引；Silver等，2016，Figure 4, PDF第4页；仅图形区域。<a href="https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf#page=4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

三个面板纵轴都是Elo评分，越高表示在相应对战评估中棋力更强，并非直接胜率。a面板比较程序与人类参照；b面板下方黑/灰圆点标记是否使用rollout、价值网络和策略网络，要按同一列的组件组合读；c面板横轴列出搜索线程与GPU配置，不是训练步数。a/b与c还使用不同每步思考时间，因此不能只按柱高跨面板做等预算因果比较。


<!-- inline-evidence-v2:end -->


[图1](#rl-21-figure-1)和[图3](#rl-21-figure-3)分别说明网络训练数据流与搜索的选择—扩展—评价—回传；它们解释系统组成而不是棋力证据。[图2](#rl-21-figure-2)把落子预测准确率、对战强度和价值误差分别展示，强调准确预测人类动作不等于最强控制。[图4](#rl-21-figure-4)才比较程序对战、组件组合与搜索规模，应按各面板的时间控制阅读；[图5](#rl-21-figure-5)的橙圈展示具体局面的最大统计量，只能说明搜索可能改变先验，不能从单局推断普遍收益。 [查看原文](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf)。

<!-- figure-ref-v6:start:rl-21-figure-5 -->
<figure class="reading-evidence-figure" id="rl-21-figure-5"><a href="/rl/assets/reference-v6/21-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/21-figure-5.png" width="1056" height="747" alt="六个面板对同一棋盘分别展示价值、树内评价、rollout、先验、访问比例与主变化。红圈选点在这些视角下并非总是局部最高，这正是搜索整合证据而非只照策略网络落子的例子。" loading="lazy"></a><figcaption>原论文图形摘引｜Silver等，2016，图5，PDF第4页。<a href="https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf#page=4" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

六个面板对同一棋盘分别展示价值、树内评价、rollout、先验、访问比例与主变化。红圈选点在这些视角下并非总是局部最高，这正是搜索整合证据而非只照策略网络落子的例子。
<!-- figure-ref-v6:end:rl-21-figure-5 -->

<!-- figure-ref-v6:start:rl-21-figure-3 -->
<figure class="reading-evidence-figure" id="rl-21-figure-3"><a href="/rl/assets/reference-v6/21-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/21-figure-3.png" width="1395" height="444" alt="按a到d读一次搜索：选择、扩展、结合价值网络与rollout进行评价，再把结果沿路径回传。图中的Q和先验P在树内承担不同角色，价值网络本身不等于完整搜索。" loading="lazy"></a><figcaption>原论文图形摘引｜Silver等，2016，图3，PDF第3页。<a href="https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf#page=3" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

按a到d读一次搜索：选择、扩展、结合价值网络与rollout进行评价，再把结果沿路径回传。图中的Q和先验P在树内承担不同角色，价值网络本身不等于完整搜索。
<!-- figure-ref-v6:end:rl-21-figure-3 -->

<!-- figure-ref-v6:start:rl-21-figure-1 -->
<figure class="reading-evidence-figure" id="rl-21-figure-1"><a href="/rl/assets/reference-v6/21-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/21-figure-1.png" width="1401" height="504" alt="左侧把人类棋谱监督训练、策略梯度自我对弈和价值回归分开；右侧区分输出落子分布的策略网络与输出胜负估计的价值网络。自我对弈数据和人类棋谱并不是同一训练目标。" loading="lazy"></a><figcaption>原论文图形摘引｜Silver等，2016，图1，PDF第2页。<a href="https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf#page=2" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

左侧把人类棋谱监督训练、策略梯度自我对弈和价值回归分开；右侧区分输出落子分布的策略网络与输出胜负估计的价值网络。自我对弈数据和人类棋谱并不是同一训练目标。
<!-- figure-ref-v6:end:rl-21-figure-1 -->

## 五、分清训练数据、搜索资源与版本边界

正文报告RL策略不搜索时对Pachi胜率85%；完整系统另加入搜索，并在[图4](#rl-21-figure-4)比较组件与计算扩展。这些数字不能与对人比赛合成一个胜率。围棋可精确模拟、奖励清晰且部署允许搜索，这些权限也限制了对真实世界任务的外推。

### 五个前置概念

1. **MCTS**：用多次模拟分配搜索预算。
2. **策略先验**：提前估计值得探索的动作。
3. **价值网络**：估计局面的胜负前景。
4. **自我对弈**：模型与自身或历史版本比赛生成数据。
5. **Rollout**：快速走到终局来估计结果。

## 六、继续追问：搜索先验、价值数据与算力

<details>
<summary>1. 已知棋规给搜索提供了什么额外优势？</summary>

已知棋规提供准确状态转移、合法动作和终局判定，搜索可以在不消耗真实比赛的情况下试验分支，而且不会积累学习动力学的模型误差。这项条件在机器人或网页工具环境常不成立。AlphaGo 仍需学习策略与价值，因为精确枚举整棵博弈树不可行；“规则已知”与“最佳动作已知”不是一回事，模拟数量也必须算入决策成本。

</details>

<details>
<summary>2. 如何分别计量策略网络和搜索的收益？</summary>

冻结同一策略/价值网络，比较不搜索、相同模拟预算搜索和不同预算搜索；再固定搜索配置替换或移除策略先验、价值网络与 rollout。报告每步时间、硬件和对手池，避免把训练更强网络与扩大搜索同时改变。原文无搜索 RL 策略对 Pachi 的85%胜率，只回答那个网络与对手条件，不能直接与完整系统对其他对手的胜率相减。

</details>

<details>
<summary>3. AlphaGo与AlphaGo Zero的数据条件为何不同？</summary>

2016 AlphaGo 先使用人类棋谱监督学习策略，再自我对弈强化学习，并构造数据训练价值网络；AlphaGo Zero 的核心起点是规则和自我对弈，不使用人类棋谱作该监督阶段。二者训练流程、网络与搜索细节、算力也改变了。因此“都靠自我对弈”不足以视为相同数据条件，不能把 Zero 的无棋谱结论倒写到2016论文。

</details>

## 七、从已知规则搜索走向学到的动力学

- **后续搜索路线**：[MuZero](41-muzero.md)。本篇搜索依赖已知游戏规则，MuZero进一步研究怎样在学到的潜在动力学中搜索，继承的是学习与搜索的分工问题。
- **策略训练模块回看**：[REINFORCE](05-reinforce.md)。胜负加权概率更新只是多阶段系统的一环，不能单独说明搜索棋力。

- [原论文与图表入口](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf)。多阶段训练、价值网络数据构造、MCTS正文及Methods。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：策略网络、价值网络和搜索分别做什么？

**参考答案**：策略网络缩小值得探索的落子范围；价值网络预测局面结果；树搜索比较候选后续变化。原始 AlphaGo 还使用快速 rollout 辅助评价。网络提供经验化判断，搜索则在当前局面上投入额外计算。

**问题 2**：能否把原始 AlphaGo 的成功解释为“完全不需要人类知识”？

**参考答案**：不能。原始系统使用人类棋谱进行监督策略训练，还包含特定搜索与工程设计。应区分 AlphaGo 与后来的 AlphaGo Zero、AlphaZero；训练数据和先验不同，不能把后者的设定回填到前者。

[系列首页](README.md) · [上一篇](20-dueling-dqn.md) · [下一篇](22-a3c.md)
