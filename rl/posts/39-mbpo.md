# 第 39 天｜MBPO：不要在错误模型里想象太久

[系列首页](README.md) · [上一篇](38-bear.md) · [下一篇](40-dreamer.md)

**原论文与版本**：*When to Trust Your Model: Model-Based Policy Optimization*，2019。[原论文](https://arxiv.org/abs/1906.08253)。

### 先接住前作的问题

[Dyna](03-dyna.md)让模型经验与真实经验共用学习器，却留下模型误差反复传播的问题。[PETS](35-pets.md)用集成和重规划管理这种误差，执行时仍需搜索。MBPO直接承接Dyna式训练数据生成，并组合概率模型与[SAC](30-sac.md)，把关键决策放在真实状态起点、短展开和混合比例上。

## 一、问题设定：模型能预测很远，为什么训练策略只想象很短

模型连续展开会把自己的预测当作下一步输入，局部误差随之改变后续分布。MBPO不要求想象贯穿整项任务，而从真实回放状态分叉短轨迹，将更长收益交给价值自举。这样仍需决定模型经验占多少梯度，不能只把展开步数调小就宣布模型可信。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 在线模型驱动数据增强，通常搭配SAC |
| 状态／观测 | 真实状态与短期模拟状态 |
| 动作 | 随机连续策略动作 |
| 奖励或学习信号 | 环境／模型预测奖励 |
| 终止／边界 | 真实终止与模型rollout截断不同 |

## 二、从真实状态分叉短轨迹并交给离策略学习

长模型rollout既偏离真实状态分布，又把每一步预测误差传给下一步。MBPO从真实回放中的状态分叉，只做短想象，生成合成经验供off-policy策略学习。于是想象长度不再等于整项任务长度，长程收益可交给价值bootstrap处理。

与PETS不同，模型主要用于训练数据增强，执行时直接用Actor；与只提高每样本梯度次数不同，它生成新的预测转移。真实数据训练模型、模型数据训练策略的比例与更新频率，决定模型误差进入价值学习的强度。

原文理论有一个值得保留的转折：朴素最坏情形下界按字面最优可能是k=0，即完全不用模型。作者随后利用经验泛化分析讨论为何实际短rollout仍有益。不能把标题“When to Trust”解读为存在一个可精确判定模型绝对可信的通用阈值。

### 把混合池期望拆成真实与模型权重

教学目标 $L_Q=E_{D_{real}\cup D_{model}}(Q-y)^2$。模型训练最小化真实转移预测损失，策略训练使用soft Bellman目标。rollout长度k与真实环境交互预算是不同参数。

**混合数据不是把两个集合无权相加**：$D_{real}$ 来自环境，$D_{model}$ 来自模型；期望由实际采样比例决定。若真实样本概率为 $\eta$，上式可教学地展开为 $\eta\mathbb E_{D_{real}}(Q-y)^2+(1-\eta)\mathbb E_{D_{model}}(Q-y)^2$。两类样本使用同一个SAC学习器，但模型样本中的后继状态（及采用模型预测的奖励）也含模型误差。短 $k$ 限制每条分支连续积累多少误差，$1-\eta$ 则决定这些误差在梯度里占多大权重；二者不能互相替代。软目标中的下一动作来自策略，并带熵项，沿用[原文Algorithm 1的SAC更新接口](https://arxiv.org/html/1906.08253v3#S5)。

### 从真实状态分叉只重置了哪部分误差

每条短分支的起点来自真实数据，因此不会继承前一条想象末端的状态漂移；分支内每一步仍用模型。短分叉切断跨分支的连续累积，并不让这几步预测成为无误差真样本。

### 验算局部误差怎样在长展开中放大

以下是可手算的教学构造，不是论文实验。

一条真实状态s已有准确局部模型。用模型产生1步后继并bootstrap价值，只经过一次动力学误差；若连续想象100步，每次状态误差都可能改变后续输入，不能简单当成100个独立、均值为零的小噪声。

教学地假设每步误差满足$e_{t+1}\le1.1e_t+0.01,e_0=0$，则$e_k\le0.1(1.1^k-1)$。k=1为0.01，k=10约0.159，说明局部小误差可能被不稳定动力学放大。

## 三、分别维护真实池、模型池与采样比例


```text
收集真实转移到D_real
定期用D_real训练概率模型集成
反复：
  从D_real抽起始状态
  用当前策略在模型里生成k步短轨迹
  将合成转移写入D_model
  按设定比例混合真实／合成数据
  对SAC执行若干梯度更新
  继续收集真实经验修正模型
输出：直接执行的策略
```

**实现要点**：模型误差、合成比例和模型训练成本仍需计量。

## 四、用无模型多更新对照检验收益来源

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | MuJoCo连续控制 |
| 数据来源与规模 | 真实在线经验＋模型短rollout |
| 对比基线 | SAC、其他模型驱动方法 |
| 训练预算与资源 | [图2](#rl-39-figure-2) Ant约300k真实步达到所比SAC约3M步表现 |
| 指标及其含义 | 回报与真实交互量；另计训练时间 |
| 随机性与不确定性 | 5次试验均值，阴影为标准差 |
| 实际验证的假设 | 短分支是否比长模型模拟更可靠 |

**实验解读（本文分析）**：[图3](#rl-39-figure-3)的no-model消融把SAC每真实步的更新次数调到类似范围，帮助区分模型数据与单纯多训练的作用。Hopper上rollout从1增到15最好，但固定1仍很强；200步可预测不代表最适合策略优化，500步已太不准。[图4](#rl-39-figure-4)长轨迹是误差诊断，不是训练必须用450步想象。

### 区分训练消融与长轨迹误差诊断

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-39-figure-3 -->
<span id="rl-39-figure-3"></span>

<p class="figure-source-links">原引用定位：<a href="https://arxiv.org/html/1906.08253#S6.F3" target="_blank" rel="noopener noreferrer">原文</a>。</p>
<!-- figure-ref-v6:end:rl-39-figure-3 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/39-mbpo-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/39-mbpo-figure-3.png" width="1600" height="560" alt="MBPO在Hopper上比较无模型额外更新、模型展开长度与价值扩展" loading="lazy"></a><figcaption>原论文图形摘引；Janner等，2019，Figure 3；原HTML图形。<a href="https://arxiv.org/html/1906.08253v3#S6.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>


图3三面板都在Hopper上，以真实环境步为横轴、平均回报为纵轴，蓝色MBPO和绿色SAC是共同参照。左面板改每环境步梯度次数 $G$，检验“只多训练”；中面板改模型展开长度 $k$，检验误差累积；右面板改价值展开长度 $H$，比较把模型放进价值目标的另一种用法。$G$、$k$、$H$ 的曲线标签属于不同干预，不能把三张图统一读成“模型越短越好”。

<!-- inline-evidence-v2:end -->


[图1](#rl-39-figure-1)在固定模型训练分布下改变策略KL，说明模型误差依赖当前策略偏离，而不只依赖训练误差。[图2](#rl-39-figure-2)比较回报对真实环境步的曲线，均值来自五次试验、阴影为标准差，不能读成墙钟加速。[图3](#rl-39-figure-3)固定更新比检验“只多做梯度更新”与短rollout的解释；[图4](#rl-39-figure-4)将同一动作序列的真实与模型轨迹及累计回报对照，展示长时误差累积和该例中未明显利用模型，并非所有未来策略的保证。 [查看原文](https://arxiv.org/html/1906.08253)。

<!-- figure-ref-v6:start:rl-39-figure-2 -->
<span id="rl-39-figure-2"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/39-mbpo-figure-2-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/39-mbpo-figure-2-full.png" width="850" height="540" alt="原论文Figure 2：六项任务均保留环境步横轴和算法图例。蓝色MBPO应与同任务、同预算的基线比较；虚线的渐近参照不能被当作同预算采样曲线。" loading="lazy"></a><figcaption>完整原图摘引｜Janner等，2019，Figure 2；1906.08253v3，HTML S5.F2。<a href="https://arxiv.org/html/1906.08253v3#S5.F2" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1906.08253#S5.F2" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：六项任务均保留环境步横轴和算法图例。蓝色MBPO应与同任务、同预算的基线比较；虚线的渐近参照不能被当作同预算采样曲线。
<!-- figure-ref-v6:end:rl-39-figure-2 -->

<!-- figure-ref-v6:start:rl-39-figure-4 -->
<span id="rl-39-figure-4"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/39-mbpo-figure-4-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/39-mbpo-figure-4-full.png" width="1800" height="964" alt="原论文Figure 4：(a)真实运动、(b)同一动作序列的模型展开、(c)累积回报都在图中。姿态不确定性随展开积累，但回报趋势仍可能近似；两者不能相互替代。" loading="lazy"></a><figcaption>完整原图摘引｜Janner等，2019，Figure 4；1906.08253v3，HTML S6.F4。<a href="https://arxiv.org/html/1906.08253v3#S6.F4" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1906.08253#S6.F4" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：(a)真实运动、(b)同一动作序列的模型展开、(c)累积回报都在图中。姿态不确定性随展开积累，但回报趋势仍可能近似；两者不能相互替代。
<!-- figure-ref-v6:end:rl-39-figure-4 -->

<!-- figure-ref-v6:start:rl-39-figure-1 -->
<span id="rl-39-figure-1"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/39-mbpo-figure-1-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/39-mbpo-figure-1-full.png" width="1873" height="1107" alt="原论文Figure 1：上排横轴为策略偏移、纵轴为模型误差，颜色是训练集规模；下排检查误差对偏移的敏感程度。更多数据降低误差与扩大可相信的策略范围，是相关但不同的判断。" loading="lazy"></a><figcaption>完整原图摘引｜Janner等，2019，Figure 1；1906.08253v3，HTML S4.F1。<a href="https://arxiv.org/html/1906.08253v3#S4.F1" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1906.08253#S4.F1" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：上排横轴为策略偏移、纵轴为模型误差，颜色是训练集规模；下排检查误差对偏移的敏感程度。更多数据降低误差与扩大可相信的策略范围，是相关但不同的判断。
<!-- figure-ref-v6:end:rl-39-figure-1 -->

## 五、短展开与低模型权重不能互相替代

[图2](#rl-39-figure-2)等结果支持所测短展开的样本效率，仍需计入模型拟合成本与合成比例。多次合成更新会反复学习同一模型偏差，合成样本数量不能当作新增真实信息量。

### 五个前置概念

1. **分支rollout**：从真实样本状态开始想象。
2. **模型偏差**：预测规律偏离环境。
3. **合成replay**：保存模型生成转移。
4. **数据混合比例**：真实与合成样本的训练权重。
5. **分布漂移**：新策略访问不同区域。

## 六、继续追问：误差放大、比例与适用预算

<details>
<summary>1. 同样GPU时间下MBPO是否仍占优？</summary>

不能由环境步数曲线确定。MBPO增加模型训练、合成 rollout 和策略更新，真实交互昂贵时可能节省总时间，环境便宜时也可能更慢。应测同硬件端到端时间、模型/策略开销、并行程度以及达到同回报的成本，并保留同交互预算结果。论文样本效率结论不能直接改写成同GPU时间排名。

</details>

<details>
<summary>2. 模型长度与合成比例如何联合调节？</summary>

更长 rollout 累积模型误差，更高合成比例则放大模型数据对训练分布的支配；两者需一起调。可先保持短分支并随真实验证误差和覆盖改善逐渐加长，同时限制合成占比，比较固定真实预算下的二维消融。模型一步误差小不保证长时误差小，也不保证在Actor挑中的动作上准确。

</details>

<details>
<summary>3. 如何发现Actor正在利用模型漏洞？</summary>

观察模型预测回报提升但真实回报停滞或下降，尤其新策略访问区域的保留真实预测误差、约束违规和不确定性上升。用真实环境检验同一候选动作序列的短期后果，比较不同模型种子的策略表现，能更直接发现漏洞。训练集拟合误差下降不能排除此问题，因为策略主动改变了被查询的数据分布。

</details>

## 七、比较显式合成数据与潜在想象学习

- **平行模型策略路线**：[Dreamer](40-dreamer.md)。同样利用模型训练策略，Dreamer改在潜空间通过动态导数优化行为，模型误差进入梯度的方式随之变化。
- **控制用途对照**：[PETS](35-pets.md)。短训练分支与行动时MPC各有计算位置，比较样本收益时还需计入执行成本。

- [原论文与图表入口](https://arxiv.org/html/1906.08253)。§4模型界；分叉rollout算法；§6.2[图3](#rl-39-figure-3)、[图4](#rl-39-figure-4)。

- 教学阅读：[Model-Based Reinforcement Learning: Theory and Practice](https://bair.berkeley.edu/blog/2019/12/12/mbpo/)。仅借用本节的解释顺序与接口视角；具体算法、版本和实验以本篇原论文为准。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：为什么从真实状态出发做短模型 rollout？

**参考答案**：真实状态提供较可靠的起点，短分支限制连续模型预测的误差累积。同时可以生成更多局部转移，交给无模型学习器提高数据利用率。它把模型用于有限扩充，而不是完全替代环境。

**问题 2**：短 rollout 为什么仍然会带偏策略？

**参考答案**：一步预测也可能有系统偏差，奖励模型也可能错误；大量合成数据还可能压过真实数据。缩短长度只控制一类误差累积，不能替代模型质量、合成比例和总计算成本的检查。

[系列首页](README.md) · [上一篇](38-bear.md) · [下一篇](40-dreamer.md)
