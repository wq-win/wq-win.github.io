# 第 20 天｜Dueling DQN：先判断处境，再判断动作差别

[系列首页](README.md) · [上一篇](19-per.md) · [下一篇](21-alphago.md)

**原论文与版本**：*Dueling Network Architectures for Deep Reinforcement Learning*，2015。[原论文](https://arxiv.org/abs/1511.06581)。

### 先接住前作的问题

[DQN](16-dqn.md)为每个动作输出Q值，[Double DQN](18-double-dqn.md)改目标，[PER](19-per.md)改抽样。Dueling切入第三个维度：不同动作可能共享同一个状态前景，能否把公共信息与相对差异分开表达？它与前两种改进是模块组合关系，双流表示也不是双估计去偏。

## 一、问题设定：动作差别很小时，怎样共享同一处境的价值信息

在一条没有障碍的直路上，许多动作的长期结果可能差不多。每次只看到一个动作的转移，却希望学到整个处境的共同价值。Dueling让状态流与动作差异流共同产生Q；问题是怎样固定这种分解，使共享训练有清楚的含义。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 无模型、基于价值的离散动作网络 |
| 状态／观测 | 视觉或状态特征 |
| 动作 | 离散动作 |
| 奖励或学习信号 | 任务奖励 |
| 终止／边界 | 沿用DQN终止 |

## 二、减去动作均值以固定V与A的分解

一个状态可能明显有利，而当前几个动作差别很小。若每个动作完全独立输出Q，网络需要反复从不同动作样本学到同一状态背景。Dueling把共同部分交给V流，把相对差异交给A流，两者共享早期表示。

直接写Q=V+A有不可辨识性：V加c、所有A减c，输出不变。减去动作平均A后，输出的平均恰好等于V。注意这是均匀动作平均，不是按当前策略概率加权，因此网络V头不能被无条件命名为严格的 $V^\pi$。

从梯度也能看出共享：被选动作Q对自己的A导数为$1-1/m$，对其他A为$-1/m$，对V为1。一次TD更新同时校准共同前景与动作差异。它改变表示和泛化，不单独规定on-policy/off-policy或探索规则。

### 用均值中心化聚合动作价值

$$Q(s,a)=V(s)+A(s,a)-\frac1{|\mathcal A|}\sum_b A(s,b).$$
减均值固定一种分解约定；两个流仍通过同一个TD目标联合训练。

### 均值中心化使哪个量可以被识别

固定状态后，把各动作Q求均值，A项恰好抵消，得到 $\frac1m\sum_aQ(s,a)=V(s)$。这由聚合结构决定，不需要额外V标签；若行为策略不均匀，这个均值也不是其策略价值。

### 检查给全部优势加常数为何输出不变

以下是可手算的教学构造，不是论文实验。

V=5，A=(2,0,−1)，均值为1/3，Q=(20/3,14/3,11/3)。把所有A加100，Q完全不变；贪心动作仍是第一个。

若一次目标要求第一个Q增加，梯度会提高V，并调整所有A的相对关系。不是给V头一个独立的“状态真值标签”再给A头另一份标签。

## 三、用同一个TD目标联合训练两个流


```text
输入观测 s
共享编码 h ← encoder(s)
V ← value_head(h)，标量
A ← advantage_head(h)，动作维向量
Q ← V+A-mean(A)
用 Q 选动作并收集经验
replay 抽样后按 DQN／Double DQN 构造目标
用对应动作的 Q 与目标做 TD 更新
输出：全部动作 Q
```

## 四、在冗余动作走廊中检验表示收益

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | 走廊中的冗余动作、Atari |
| 数据来源与规模 | 环境交互 |
| 对比基线 | 单流与双流网络；结合相同训练算法比较 |
| 训练预算与资源 | 完整训练与参数匹配细节见实验节，本文未完整核实 |
| 指标及其含义 | 预测误差、归一化游戏分数 |
| 随机性与不确定性 | 各图重复与区间本文未完整核实 |
| 实际验证的假设 | 动作差异小或冗余动作多时共享状态价值是否有利 |

**实验解读（本文分析）**：走廊[图3](#rl-20-figure-3)专门固定策略，用Expected SARSA式目标评价Q，并添加no-op得到5、10、20动作版本。这样减少了探索与策略改进的混淆，平方误差可与精确Q比较。它支持冗余动作下表示共享的假设；Enduro显著图只是解释线索，不能当作两个流已被因果识别。

<!-- figure-ref-v6:start:rl-20-figure-3 -->
<figure class="reading-evidence-figure" id="rl-20-figure-3"><a href="/rl/assets/reference-v6/20-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/20-figure-3.png" width="2200" height="2079" alt="a给出走廊任务，b到d把动作数由5增至10和20；纵轴SE与横轴迭代都取对数。绿色Duel在动作冗余增多时更早降低误差，是受控策略评价实验，不是更多动作带来更多奖励。" loading="lazy"></a><figcaption>原论文图形摘引｜Wang等，2015，图3（完整面板）。<a href="https://arxiv.org/html/1511.06581v3#S4.F3" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留；多面板仅重新排版，未改数据。</figcaption></figure>

a给出走廊任务，b到d把动作数由5增至10和20；纵轴SE与横轴迭代都取对数。绿色Duel在动作冗余增多时更早降低误差，是受控策略评价实验，不是更多动作带来更多奖励。
<!-- figure-ref-v6:end:rl-20-figure-3 -->

### 固定策略评价隔离冗余动作的影响

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-20-figure-4 -->
<span id="rl-20-figure-4"></span>
<!-- figure-ref-v6:end:anchor-rl-20-figure-4 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/20-dueling-dqn-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/20-dueling-dqn-figure-4.png" width="1600" height="1552" alt="Dueling网络相对单流Double DQN的逐Atari游戏分数改变量" loading="lazy"></a><figcaption>原论文图形摘引；Wang等，2015/2016，Figure 4；原HTML图形。<a href="https://arxiv.org/html/1511.06581v3#S4.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

每行是一个游戏，条形从零向右/左分别表示相对Single基线改善/退步；横轴百分数不是直接用分差除以基线分数。[原文式(10)](https://arxiv.org/html/1511.06581v3#S4)采用

$$100\%\times\frac{S_{\mathrm{agent}}-S_{\mathrm{base}}}{\max(S_{\mathrm{human}},S_{\mathrm{base}})-S_{\mathrm{random}}}.$$

分母同时使用人类、基线与随机成绩，目的是避免很差的基线让小分差显成巨大比例。图4用Single作参照；隔离参数量与梯度裁剪还需正文的Single Clip对照，因此不能把所有条形净差都归为双流结构本身。


<!-- inline-evidence-v2:end -->


[图1](#rl-20-figure-1)明确V/A两流如何聚合成每个动作的Q；[图2](#rl-20-figure-2)的Enduro显著性覆盖展示两个分量关注区域不同，但不是干预式因果解释。[图3](#rl-20-figure-3)在5、10、20动作走廊中改变冗余动作数量，更直接检验共享状态评价是否有利。Atari的[图4](#rl-20-figure-4)和[图5](#rl-20-figure-5)把收益画成相对单流基线的横向条形，右侧表示改善；应区分Double DQN与优先回放基线，避免将不同对照的收益相加。 [查看原文](https://arxiv.org/html/1511.06581)。

<!-- figure-ref-v6:start:rl-20-figure-5 -->
<figure class="reading-evidence-figure" id="rl-20-figure-5"><a href="/rl/assets/reference-v6/20-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/20-figure-5.png" width="1477" height="1433" alt="这里的比较基线已换成带优先回放的DDQN。零线左右同时存在改善和退步，Kangaroo等负向项目提醒两种改进叠加并不保证每个游戏都获益。" loading="lazy"></a><figcaption>原论文图形摘引｜Wang等，2015，图5（完整面板）。<a href="https://arxiv.org/html/1511.06581v3#S4.F5" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留；多面板仅重新排版，未改数据。</figcaption></figure>

这里的比较基线已换成带优先回放的DDQN。零线左右同时存在改善和退步，Kangaroo等负向项目提醒两种改进叠加并不保证每个游戏都获益。
<!-- figure-ref-v6:end:rl-20-figure-5 -->

<!-- figure-ref-v6:start:rl-20-figure-2 -->
<figure class="reading-evidence-figure" id="rl-20-figure-2"><a href="/rl/assets/reference-v6/20-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/20-figure-2.png" width="660" height="950" alt="每一行左列是Value、右列是Advantage的显著性图。注意价值分支关注前方道路，而优势分支在接近车辆时更突出；这是两个局面的解释性可视化，不能单独证明所有状态的因果机制。" loading="lazy"></a><figcaption>原论文图形摘引｜Wang等，2015，图2（完整面板）。<a href="https://arxiv.org/html/1511.06581v3#S1.F2" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留；多面板仅重新排版，未改数据。</figcaption></figure>

每一行左列是Value、右列是Advantage的显著性图。注意价值分支关注前方道路，而优势分支在接近车辆时更突出；这是两个局面的解释性可视化，不能单独证明所有状态的因果机制。
<!-- figure-ref-v6:end:rl-20-figure-2 -->

<!-- figure-ref-v6:start:rl-20-figure-1 -->
<figure class="reading-evidence-figure" id="rl-20-figure-1"><a href="/rl/assets/reference-v6/20-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/20-figure-1.png" width="1200" height="900" alt="上方单流网络直接输出各动作Q，下方分出状态价值与动作优势后再合成Q。分支不是两个独立控制器，合成中的中心化约束才使价值与优势的分工可解释。" loading="lazy"></a><figcaption>原论文图形摘引｜Wang等，2015，图1（完整面板）。<a href="https://arxiv.org/html/1511.06581v3#S1.F1" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留；多面板仅重新排版，未改数据。</figcaption></figure>

上方单流网络直接输出各动作Q，下方分出状态价值与动作优势后再合成Q。分支不是两个独立控制器，合成中的中心化约束才使价值与优势的分工可解释。
<!-- figure-ref-v6:end:rl-20-figure-1 -->

## 五、共享前景不能替代探索与目标去偏

双流改变共享表示，不改变奖励，也不单独解决探索或自举偏差。若大量动作都具有关键差异，状态共性的收益可能减弱；把双流称作双Q还会混淆表示结构与估计去偏。

### 五个前置概念

1. **状态价值流**：学习动作间共享的前景。
2. **优势流**：学习动作相对差异。
3. **可辨识性**：同一输出是否对应唯一分解。
4. **共享编码**：多输出使用同一特征。
5. **显著性图**：展示输入对输出的敏感性。

### 继续追问：不可辨识性与梯度共享

<details>
<summary>1. 这里的V为什么不一定等于Vπ？</summary>

采用 $Q=V+A-\frac1{|\mathcal A|}\sum_a A$ 时，结构中的 $V$ 等于动作均匀平均的 Q，而 $V^\pi=\sum_a\pi(a|s)Q(s,a)$ 一般按策略概率加权。两者仅在对应条件下相同；这里的 V 是可辨识化后的网络分量，不能直接当作任意行为策略的真实状态价值。解释显著性图时也应保留这一结构含义。

</details>

<details>
<summary>2. 网络参数量变化会否解释部分提升？</summary>

可能。双流改变参数量、层宽和梯度路径，若单流基线容量较小，部分收益可能来自容量或优化条件。公平消融需匹配参数量、训练预算、初始化与调参机会，并比较冗余动作数量变化下的收益。如果只在动作冗余增加时优势更明显，才更直接支持共享状态评价这一机制，但仍不等于唯一原因。

</details>

<details>
<summary>3. 双流结构和Double DQN能否组合，为什么？</summary>

可以。Dueling 决定 Q 如何由状态流与优势流表示；Double DQN 决定目标中的动作由谁选择、由谁评价。前者是网络参数化，后者是自举目标，两者处于不同接口。组合后仍需检验训练稳定性与交互效应，不能把单独收益直接相加，也不能据双流架构断言已消除 max 高估。

</details>

## 六、将表示改动与目标及抽样模块组合

- **目标模块组合**：[Double DQN](18-double-dqn.md)。双流输出仍是各动作Q，因此可以同时采用分离选择与评价的目标。
- **系统组合检验**：[Rainbow](29-rainbow.md)。表示、抽样和分布价值放在一起后，需重新做组件消融，不能把单项增益简单相加。

- [原论文与图表入口](https://arxiv.org/html/1511.06581)。聚合式(9)、§4.1走廊实验、[图3](#rl-20-figure-3)。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：为什么分开学习状态价值和动作优势有用？

**参考答案**：很多状态的好坏主要由局面决定，动作之间差异较小。单独学习状态价值，可以让不同动作共享“这个局面总体如何”的信息；优势分支集中表达动作差别，减少每个动作都重新学习共同信息的需要。

**问题 2**：为什么不能只写 $Q=V+A$ 就结束？

**参考答案**：因为给 V 加常数、给所有 A 减相同常数，Q 完全不变，分解不唯一。常用形式是：

$$
Q(s,a)=V(s)+A(s,a)-\frac1{|\mathcal A|}\sum_bA(s,b)
$$

它固定优势的平均基准。这里的两个分支共同构成 Q 网络，并不是 Actor 与 Critic。

[系列首页](README.md) · [上一篇](19-per.md) · [下一篇](21-alphago.md)
