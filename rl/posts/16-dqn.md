# 第 16 天｜DQN：让 Q-learning 从像素中学习，先要稳住自举目标

[系列首页](README.md) · [上一篇](15-gae.md) · [下一篇](17-ddpg.md)

**原论文与版本**：Mnih 等，*Human-level control through deep reinforcement learning*，2015。[原文](https://www.nature.com/articles/nature14236)；[可读 PDF](https://web.stanford.edu/class/psych209/Readings/MnihEtAlHassibis15NatureControlDeepRL.pdf)。

以前篇 2013 版为背景，本节以 2015 版为准。

### 先接住前作的问题

[Q-learning](04-q-learning.md)的表格证明依赖逐坐标更新，不能直接覆盖共享参数的视觉网络。DQN继承Bellman最优目标，面对的是相关画面、不断变化的数据和网络生成的自举标签；它与前一篇[GAE](15-gae.md)属于不同路线，后者处理优势估计而不是Q网络稳定化。

## 一、问题设定：把Q表换成神经网络后，怎样稳住自举学习

输入从可枚举状态变成像素后，一次梯度更新会同时改变许多状态动作值，下一步训练目标还依赖这些值。历史经验能否重复利用、目标能否暂时不动，成为从价值更新走到可用视觉控制系统的关键问题。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 在线采样、off-policy、无模型、离散动作 |
| 状态／观测 | 预处理84×84灰度图像堆叠4帧 |
| 动作 | 游戏离散控制指令 |
| 奖励或学习信号 | 训练奖励裁剪；评价用游戏分数 |
| 终止／边界 | 游戏终止及训练协议中的边界需核对 |

## 二、分别缓和样本相关性与目标追逐

将Q表换成卷积网络并不只是增加表达能力。现在一次梯度更新会同时改变许多状态的价值，而TD目标又依赖这个函数；数据由当前行为产生，彼此相关，分布也持续变化。函数逼近、自举与离策略数据的相互作用，才是需要稳定化的核心。

回放和目标网络处理不同环节。Replay重新安排历史经验的采样顺序，增加重用并缓解相邻帧相关性；目标网络把bootstrap端暂时固定，让在线网络在一段时间内追逐相对稳定的目标。目标仍然是估计值，固定它不会自动变成正确标签。

反向传播只穿过 $Q_\theta(s,a)$。若让梯度穿过目标，便从半梯度TD变成另一个残差优化问题。原版的帧堆叠、奖励裁剪与动作重复也塑造了实际MDP及尺度，不能把网络结构之外的配方全省略。

### 用冻结副本构造停止梯度的Bellman标签

$$y=r+\gamma(1-d)\max_aQ_{\bar\theta}(s',a),\quad L=E(Q_\theta(s,a)-\operatorname{sg}(y))^2.$$
θ 是被训练网络，barθ 是冻结目标；d 只代表相应任务语义下的终止。梯度裁剪／稳健损失等细节按原版核对，平方式是核心教学形式。

### 回放与目标网络分别冻结了什么

回放保存的是已经发生的转移，并不冻结当前的训练标签；同一条旧转移在目标网络复制后仍会得到新标签。目标网络冻结的是标签所用的估值参数，二者作用在数据流的不同位置。

### 比较固定4.6与同步漂移的6.4

以下是可手算的教学构造，不是论文实验。

冻结目标网络给后继动作值(2,4)，奖励1、γ=0.9，则y=4.6。在线网络当前预测2，第一次更新后预测3；只要目标网络没复制，第二次仍追4.6。

若目标来自同步变化的在线网络，它可能在第二次变为(3,6)，目标变6.4，误差并没有按“固定监督标签”的直觉缩小。目标网络缓和这个追逐，但下一次复制时仍可能发生跳变。

## 三、抽取回放并只对在线Q反向传播


```text
初始化在线 Qθ、目标 Qbarθ←Qθ、replay D
每个环境步：
  a ← ε-greedy(Qθ,叠帧观测)
  执行动作，保存 (s,a,r,s_next,done) 到 D
  若样本足够：
    均匀抽取 minibatch
    y ← r + γ*(1-done)*max_a Qbarθ(s_next,a)
    停止 y 的梯度，更新 Qθ(s,a) 的 TD 损失
  每 C 次指定更新：barθ ← θ
输出：argmax_a Qθ(s,a)
```

**实现要点**：每个游戏单独训练，结果不等于通用模型或所有任务超人。

## 四、读人类归一化游戏表现与组件消融

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | 49款 Atari，各自训练 |
| 数据来源与规模 | 在线游戏帧、经验池 |
| 对比基线 | 当时学习方法与人类／随机基准 |
| 训练预算与资源 | 精确 frame 与 agent step 换算本文未核实，不能混写 |
| 指标及其含义 | 原始分数、人类归一化成绩 |
| 随机性与不确定性 | [图3](#rl-16-figure-3)误差条为30评估回合标准差；全部独立训练种子未逐项复核 |
| 实际验证的假设 | 统一架构能否跨多种任务被分别训练成功 |

**实验解读（本文分析）**：[图3](#rl-16-figure-3)人类归一化为(智能体−随机)/(人类−随机)，不是智能体分数直接除人类分数。误差条来自30个评估回合的标准差，不能误读成30次独立训练的不确定性。[图2](#rl-16-figure-2)预测Q使用裁剪奖励尺度，不能与原始游戏分数直接对齐；扩展表3、4才用于检查回放、目标与网络组件。

<!-- figure-ref-v6:start:rl-16-figure-3 -->
<figure class="reading-evidence-figure" id="rl-16-figure-3"><a href="/rl/assets/reference-v6/16-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/16-figure-3.png" width="1134" height="1389" alt="每行是一款游戏，蓝色DQN与灰色线性基线在同一行比较。100%是人类基准，横轴上方两款游戏带断轴，不能按柱长直接比较跨游戏的绝对分数。" loading="lazy"></a><figcaption>原论文图形摘引｜Mnih等，2015，图3，PDF第3页。<a href="https://storage.googleapis.com/deepmind-media/dqn/DQNNaturePaper.pdf#page=3" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

每行是一款游戏，蓝色DQN与灰色线性基线在同一行比较。100%是人类基准，横轴上方两款游戏带断轴，不能按柱长直接比较跨游戏的绝对分数。
<!-- figure-ref-v6:end:rl-16-figure-3 -->

### 区分评估回合误差条与独立训练波动

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-16-figure-2 -->
<span id="rl-16-figure-2"></span>
<!-- figure-ref-v6:end:anchor-rl-16-figure-2 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/16-dqn-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/16-dqn-figure-2.png" width="987" height="708" alt="DQN在Space Invaders和Seaquest上的评估分数与预测Q值随训练变化" loading="lazy"></a><figcaption>原论文图形摘引；Mnih等，2015，Figure 2, PDF第2页；仅图形区域。<a href="https://storage.googleapis.com/deepmind-media/dqn/DQNNaturePaper.pdf#page=2" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

按列读：左列Space Invaders，右列Seaquest；按行读：上排是实际评估的每回合平均分，下排是在保留状态集上计算的平均Q。横轴标为training epochs，不能直接当回合数或百万环境步。下排更平滑并不证明策略表现也同样稳定：Q使用裁剪奖励的累计尺度，上排仍会波动，且两排都没有提供“去掉目标网络”的对照。


<!-- inline-evidence-v2:end -->


[图1](#rl-16-figure-1)交代像素堆叠到离散Q输出的网络；[图2](#rl-16-figure-2)把游戏实际分数与保留状态上的预测价值分开画，提醒Q尺度不是原始游戏分数。[图3](#rl-16-figure-3)按随机和人类基线归一化逐游戏比较，49个独立训练任务中有强结果也有失败。回放、目标网络及相关网络选择的扩展表对照用于支撑稳定化解释，不能把架构图或平均成绩当作所有模块独立有效的证据。 [查看原文](https://storage.googleapis.com/deepmind-media/dqn/DQNNaturePaper.pdf)。

<!-- figure-ref-v6:start:rl-16-figure-1 -->
<figure class="reading-evidence-figure" id="rl-16-figure-1"><a href="/rl/assets/reference-v6/16-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/16-figure-1.png" width="1146" height="672" alt="像素输入经卷积和全连接层后，同时输出各离散动作的Q值，控制器再选择动作。图示的是信息流；实际层数、滤波器和训练配置仍以Methods为准。" loading="lazy"></a><figcaption>原论文图形摘引｜Mnih等，2015，图1，PDF第2页。<a href="https://storage.googleapis.com/deepmind-media/dqn/DQNNaturePaper.pdf#page=2" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

像素输入经卷积和全连接层后，同时输出各离散动作的Q值，控制器再选择动作。图示的是信息流；实际层数、滤波器和训练配置仍以Methods为准。
<!-- figure-ref-v6:end:rl-16-figure-1 -->

## 五、保持目标稳定仍不等于目标正确

2015论文在49款Atari中有43款超过当时对比方法、29款超过75%人类归一化表现，但每个游戏单独训练，并非一个通用模型。目标最大化仍会放大估值噪声；奖励裁剪改变奖励大小关系，而游戏中廉价的失败重置不代表机器人也能承担相同探索成本。

### 五个前置概念

1. **卷积网络**：从图像提取可共享的局部特征。
2. **经验回放**：储存并重新采样过去经验。
3. **目标网络**：延迟更新的自举评价网络。
4. **奖励裁剪**：限制训练奖励尺度。
5. **帧堆叠**：用短历史提供运动信息。

## 六、继续追问：回放分布、终止与目标复制

<details>
<summary>1. 为什么只打乱样本还不足以稳定训练？</summary>

回放主要降低相邻样本相关性并复用数据，却没有消除自举目标也随当前网络变化的问题；同一网络同时决定预测与目标会形成强反馈。目标网络通过延迟复制减慢目标移动，仍不能保证函数逼近下收敛，也不能消除 max 高估。应分别对照回放、目标网络及两者组合，并报告交互预算与梯度更新次数，而非把所有稳定收益归给打乱。

</details>

<details>
<summary>2. 人类归一化的平均数为何容易受极高分游戏影响？</summary>

人类归一化通常以人类与随机策略分数差为尺度，某些游戏能得到非常高的倍数；算术平均会被这些长尾值主导。中位数能描述典型游戏，但也会隐藏极端失败。宜同时报告逐游戏分数、均值、中位数或稳健汇总及跨游戏不确定性，说明奖励协议和分母；“均值超过人类”不意味着多数游戏超过人类。

</details>

<details>
<summary>3. 动作连续后 max Q 怎样计算？</summary>

有限离散动作可枚举 $\max_a Q(s,a)$，连续动作则需要内部优化器、候选采样或显式 Actor 近似 argmax。内部优化增加计算，并可能追逐 Critic 的尖锐错误峰；简单网格又会随维度爆炸。DDPG/TD3 等把动作搜索交给可微 Actor，但引入新的优化与估值偏差，不能把 DQN 输出层换成连续数就完成推广。

</details>

## 七、继续修正目标偏差和回放分配

- **直接目标修正**：[Double DQN](18-double-dqn.md)。目标网络仍在同一估计上挑最大并打分，下一步可把这两个角色分开以缓解高估。
- **回放模块组合**：[优先回放](19-per.md)。稳定缓存不说明每条经验应被读同样多次，后者重新分配更新预算并处理抽样偏差。

- [原论文与图表入口](https://storage.googleapis.com/deepmind-media/dqn/DQNNaturePaper.pdf)。正文更新、[图1](#rl-16-figure-1)、[图2](#rl-16-figure-2)、[图3](#rl-16-figure-3)及图注、扩展实验说明。

- 教学阅读：[Deep Deterministic Policy Gradient](https://spinningup.openai.com/en/latest/algorithms/ddpg.html) · [Kinds of RL Algorithms](https://spinningup.openai.com/en/latest/spinningup/rl_intro2.html)。仅借用本节的解释顺序与接口视角；具体算法、版本和实验以本篇原论文为准。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：经验回放和目标网络分别解决什么问题？

**参考答案**：经验回放打散相邻样本的相关性，并重复利用旧数据。目标网络让 TD 目标在一段时间内变化较慢，减弱“网络刚更新，自己追赶的目标也立刻变化”的反馈。两者分别改善采样与自举目标的稳定性。

**问题 2**：DQN 的 TD 损失下降，为什么真实游戏分数仍可能变差？

**参考答案**：TD 目标本身是估计值，彼此一致不代表接近真实回报。网络还可能高估未充分探索的动作；奖励裁剪也会改变训练价值的尺度。因此应在独立评估中看实际任务表现，不能只用损失判断策略质量。

[系列首页](README.md) · [上一篇](15-gae.md) · [下一篇](17-ddpg.md)
