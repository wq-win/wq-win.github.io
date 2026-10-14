# 第 18 天｜Double DQN：不用加一整套网络，也能分开选动作与打分

[系列首页](README.md) · [上一篇](17-ddpg.md) · [下一篇](19-per.md)

**原论文与版本**：*Deep Reinforcement Learning with Double Q-learning*，2015。[原论文](https://arxiv.org/abs/1509.06461)。

### 先接住前作的问题

[DQN](16-dqn.md)已有在线与目标网络，却在目标网络上同时选最大动作并评价它。[Double Q-learning](11-double-q.md)指出同一噪声被用于选择和打分会制造偏差。

## 一、问题设定：DQN已有两个网络，为何目标仍可能高估

网络数量不是核心问题。只要构造目标时仍由同一个估计器决定谁最好、最好值多少，最大化偏差就还在。现在要尽量保持DQN系统不变，仅替换目标的选择与评价来源，才能较清楚地检验这一个改动。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 无模型、off-policy、视觉离散控制 |
| 状态／观测 | Atari叠帧 |
| 动作 | 离散游戏动作 |
| 奖励或学习信号 | 裁剪训练奖励与原始评价分数 |
| 终止／边界 | 按原文游戏协议 |

## 二、把在线argmax交给目标网络评分

DQN已经有在线网络与目标网络，但原目标在同一个目标网络上既选动作又评价它，因此仍有最大化偏差。Double DQN不是“再加一个网络”，而是把在线网络的argmax交给目标网络评分。

这保留了DQN的输入、回放和更新频率，只改TD目标，因而便于形成较受控的实验。可是两个网络通过周期复制相联系，不能当作Double Q理论中独立样本训练的两张表。复制刚结束时它们完全相同，选择与评价的分离暂时没有效果。

它也没有对所有动作取双网络最小值。若在线网络选错动作，目标网络对这个次优动作的准确评分仍可能低于最优值。减少高估是一种误差管理，不是价值无偏的普遍保证。

### 先由在线网络选动作，再读取目标分数

$$a^*=\arg\max_a Q_\theta(s',a),\quad y=r+\gamma(1-d)Q_{\bar\theta}(s',a^*).$$
与 DQN 的差别在 argmax 内是 θ，而评价使用 barθ。argmax 不反向传播。

### 两个网络相等时应恢复什么目标

目标刚复制且两网络相等时，在线选出的动作也是目标网络的最大动作，Double DQN标签退回DQN标签。这个极限检查不证明长期性能，却能验证argmax和取值是否索引了同一个动作。

### 比较同一组网络输出得到的9.1与5.5

以下是可手算的教学构造，不是论文实验。

后继在线Q=(8,7)，目标Q=(5,9)，r=1、γ=0.9。DQN从目标网络选第二个动作，y=9.1；Double DQN先由在线网络选第一个动作，再读取目标值5，y=5.5。

不能把这算成$1+0.9\min(8,5)$并推广为逐动作取min。此处5来自“被在线网络选中的动作的目标评分”，逻辑顺序才是算法。

## 三、保持回放流程并替换TD目标来源


```text
沿用 DQN 数据收集与 replay
每批转移：
  a_star ← argmax_a 在线Q(s_next,a)
  y ← r+γ*(1-done)*目标Q(s_next,a_star)
  停止 y 的梯度
  用 TD 损失更新在线 Q
  定期将在线参数复制给目标网络
评价：按指定 no-op／human-start 协议
输出：贪心 Q 策略
```

**实现要点**：共享训练历史仍造成估计相关，减轻高估不等于消除。

## 四、并排读取估值偏差和游戏得分

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | 49游戏核心比较，另有57游戏扩展 |
| 数据来源与规模 | 各游戏独立训练 |
| 对比基线 | DQN；区分原超参数与扩展设置 |
| 训练预算与资源 | 表1每回合最多5分钟仿真，100回合评价 |
| 指标及其含义 | 人类归一化均值／中位数；价值误差 |
| 随机性与不确定性 | [图3](#rl-18-figure-3)六训练种子，阴影为文中分位汇总 |
| 实际验证的假设 | 只替换目标是否改变高估与控制表现 |

**实验解读（本文分析）**：表1的93.5%→114.7%来自49游戏、no-op起始协议、至多5分钟模拟时间与100次评估回合，二者采用相同超参数。[图3](#rl-18-figure-3)高估和掉分在若干游戏共现，但Pong可在轻微高估下仍有最优行为，原文明确承认这一点；不应把所有性能波动都归因于高估。

### 不要把高估与掉分的共现当成充分解释

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-18-figure-3 -->
<span id="rl-18-figure-3"></span>
<!-- figure-ref-v6:end:anchor-rl-18-figure-3 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/18-double-dqn-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/18-double-dqn-figure-3.png" width="1800" height="1272" alt="六项Atari任务中DQN与Double DQN的估值偏差及两项游戏实际分数" loading="lazy"></a><figcaption>原论文图形摘引；van Hasselt、Guez与Silver，2015/2016，Figure 3；原HTML图形。<a href="https://arxiv.org/html/1509.06461v3#Sx4.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

橙色是DQN、蓝色是Double DQN，横轴为百万训练步。上排水平线是训练结束后运行相应策略得到的折扣回报，应与曲线最右端比较，不能当作每个早期策略的真实价值。中排两图的估值纵轴采用对数刻度，下排是同两款游戏的原始分数；“估值突然变大”与“分数掉落”必须分行读。阴影按[原图注](https://arxiv.org/html/1509.06461v3#Sx4.F3)为种子分位范围，既不是Q的置信上界，也不是逐步TD误差。


<!-- inline-evidence-v2:end -->


[图1](#rl-18-figure-1)和[图2](#rl-18-figure-2)先用可控制的估计误差解释max偏差，不能当作实际Atari成绩。[图3](#rl-18-figure-3)将多个游戏的Q估计、经验回报与分数并列：深色曲线为六种子中位数，阴影按原图定义的分位范围读取，不能一律称为标准差。表1才是在同一49游戏协议下的汇总，支持中位数93.5→114.7；另一57游戏human-start汇总不应与它直接相减。 [查看原文](https://arxiv.org/html/1509.06461)。

<!-- figure-ref-v6:start:rl-18-figure-2 -->
<figure class="reading-evidence-figure" id="rl-18-figure-2"><a href="/rl/assets/reference-v6/18-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/18-figure-2.png" width="2160" height="756" alt="每行改变真值函数或拟合容量，左列显示一个动作的拟合，中列对十个动作取最大，右列显示偏差。即使真动作值完全相同，近似误差的最大值仍可系统性抬高估计；蓝色双估计减弱了这一选择偏差。" loading="lazy"></a><figcaption>原论文图形摘引｜van Hasselt、Guez与Silver，2015，图2（完整面板）。<a href="https://arxiv.org/html/1509.06461v3#Sx2.F2" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留；多面板仅重新排版，未改数据。</figcaption></figure>

每行改变真值函数或拟合容量，左列显示一个动作的拟合，中列对十个动作取最大，右列显示偏差。即使真动作值完全相同，近似误差的最大值仍可系统性抬高估计；蓝色双估计减弱了这一选择偏差。
<!-- figure-ref-v6:end:rl-18-figure-2 -->

<!-- figure-ref-v6:start:rl-18-figure-1 -->
<figure class="reading-evidence-figure" id="rl-18-figure-1"><a href="/rl/assets/reference-v6/18-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/18-figure-1.png" width="1080" height="389" alt="横轴是动作数，橙色最大值选择的偏差随候选数增大，蓝色独立估值接近零。此处误差是独立高斯构造、每柱100次重复，不可把偏差大小直接当成Atari网络的实测误差。" loading="lazy"></a><figcaption>原论文图形摘引｜van Hasselt、Guez与Silver，2015，图1（完整面板）。<a href="https://arxiv.org/html/1509.06461v3#Sx2.F1" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留；多面板仅重新排版，未改数据。</figcaption></figure>

横轴是动作数，橙色最大值选择的偏差随候选数增大，蓝色独立估值接近零。此处误差是独立高斯构造、每柱100次重复，不可把偏差大小直接当成Atari网络的实测误差。
<!-- figure-ref-v6:end:rl-18-figure-1 -->

## 五、网络相关与目标滞后仍会影响分离

中位数93.5%到114.7%的绝对差为21.2个百分点，相对提升约22.7%，计算为(114.7−93.5)/93.5；不代表每个游戏提升相同幅度。目标复制过频会减弱选择评价分离，过慢又造成滞后；Pong说明一定高估也可与好策略并存。

### 五个前置概念

1. **在线网络**：当前被梯度更新的Q。
2. **目标网络**：延迟的评价副本。
3. **Argmax**：返回最高估值的动作索引。
4. **归一化分数**：以随机与人类成绩定义尺度。
5. **评估起点**：no-op和human starts改变任务覆盖。

### 继续追问：复制周期、偏差与动作选择

<details>
<summary>1. 目标复制频率如何影响估计相关性？</summary>

频繁复制使在线和目标网络更相似，选动作与评价动作的误差也往往更相关，双估计的分离作用可能减弱；复制过慢又导致过时目标和适应滞后。这不是单调的最佳间隔问题。应固定更新预算，对照复制频率，测估计相关、目标延迟与真实收益；神经网络共享数据意味着即使权重不同，也不能假设误差独立。

</details>

<details>
<summary>2. 价值更准确为什么未必动作更好？</summary>

控制依赖动作排序与关键状态差值，而整体均方误差平均了许多与决策无关的状态动作。一个估计器可以减少共同偏移却仍选错最关键动作；另一个带统一偏移但排序正确。应把估值偏差、动作优势误差和回报分开测量，并保留探索和评估协议；图中 Q 更接近回报并不构成每次行动都更好的证明。

</details>

<details>
<summary>3. 为何49与57游戏汇总不可直接相减？</summary>

游戏集合改变会改变样本构成，中位数尤其不能按新增游戏进行简单线性调整；起始方式、随机动作、训练帧数和评估次数也可能不同。只能在共同游戏、同一归一化基准和同协议下逐项比较再汇总。49 游戏表的百分点差不能拿去减57游戏的另一汇总，更不能解读为算法净因果收益。

</details>

## 六、把目标修正放入组合系统再检验

- **组合系统检验**：[Rainbow](29-rainbow.md)。选择与评价分离可和分布价值等模块组合，但组件在组合中的贡献需要消融，不能搬用单独结果。
- **平行去偏机制**：[TD3](31-td3.md)。连续动作场景采用双Critic最小目标，还需处理Actor主动利用估值误差的问题。

- [原论文与图表入口](https://arxiv.org/html/1509.06461)。目标公式；[图3](#rl-18-figure-3)讨论；表1与评估协议。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：DQN 已有两个网络，Double DQN 到底改了什么？

**参考答案**：它改变目标的计算分工：

$$
y=r+\gamma Q_{\text{target}}
\bigl(s',\arg\max_aQ_{\text{online}}(s',a)\bigr)
$$

在线网络选动作，目标网络打分。普通 DQN 通常由目标网络同时完成这两件事，因此仍存在选择与高估绑定的问题。

**问题 2**：为什么 Double DQN 仍可能高估？

**参考答案**：两个网络通过周期复制保持联系，误差并不独立；共享训练数据和函数结构也可能让它们同时高估某些动作。它减弱一种高估机制，但没有消除数据覆盖不足和函数逼近错误。

[系列首页](README.md) · [上一篇](17-ddpg.md) · [下一篇](19-per.md)
