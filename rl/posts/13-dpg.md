# 第 13 天｜DPG：沿价值对动作的梯度，训练连续策略

[系列首页](README.md) · [上一篇](12-gps.md) · [下一篇](14-trpo.md)

**原论文与版本**：Silver 等，*Deterministic Policy Gradient Algorithms*，2014。[原文](https://proceedings.mlr.press/v32/silver14.pdf)。

### 先接住前作的问题

[策略梯度定理](08-policy-gradient-theorem.md)把随机策略更新写成价值加权的概率导数。连续动作维度增加时，对动作分布的采样估计可能昂贵；DPG直接研究确定性动作映射的梯度。

## 一、问题设定：连续动作无法枚举，能否沿价值的动作导数改进

一个确定性Actor在每个状态只输出一个动作，但仍需要知道把这个动作稍微向左或向右改会怎样影响长期回报。如果Critic能提供动作方向的局部导数，Actor就可以再用自身的Jacobian把它变成参数方向；难点在于这个导数及访问分布是否可信。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 确定性策略、连续动作、单智能体 Actor–Critic |
| 状态／观测 | 环境状态 s |
| 动作 | 连续向量 μθ(s) |
| 奖励或学习信号 | 环境累计收益 |
| 终止／边界 | 任务终止或折扣继续过程 |

## 二、把价值对动作的导数接到Actor参数

随机策略梯度需要对动作分布求期望，动作维度很大时估计成本会增长。DPG考虑确定性映射 $a=\mu_\theta(s)$：先看动作微小变化怎样影响Q，再看参数怎样改变动作，以链式法则得到策略更新方向。

但这不只是把任意Q网络接在Actor后面求导。定理中的Q是当前目标策略的真实价值，状态按该策略的访问分布加权；推导已把长期状态变化组织进这个分布。用行为策略采样可实现探索，但把 $\rho^\mu$ 换成 $\rho^\beta$ 涉及另一个离策略目标或近似，不能静默保留原定理结论。

确定性策略也不意味着数据没有随机性。Actor可以确定，采样行为可以加噪声；Critic靠这些动作周围的数据学习局部斜率。如果它在未见动作处制造虚假的上坡，Actor就会沿错误梯度利用这个漏洞。

### 明确链式梯度中的价值与访问权重

$$\nabla J=\mathbb E_{s\sim\rho^\mu}[\nabla_\theta\mu_\theta(s)\nabla_aQ^\mu(s,a)|_{a=\mu_\theta(s)}].$$
ρ 是策略访问分布。用行为分布替代它涉及 off-policy 目标或近似，不能默认为同一个真梯度。

这里沿用[原文§2.1与Theorem 1](https://proceedings.mlr.press/v32/silver14.pdf#page=2)的约定：$\rho^\mu$ 是折扣访问权重，不一定归一化成概率分布。若改用 $d^\mu=(1-\gamma)\rho^\mu$，右边相应需要 $1/(1-\gamma)$ 因子。动作梯度给出“动作向哪边改”，Actor的Jacobian再把它变为参数方向；把两者相乘不需要对真实转移求导，但不能省略当前策略价值与访问权重的条件。

### 动作维度与参数维度怎样连接

若动作m维、参数d维，Actor的Jacobian为m×d，动作价值梯度为m维；采用列梯度约定时用 $J_\mu^\top\nabla_aQ$ 得到d维参数方向。文中连乘式的转置随向量约定变化，不能把动作梯度直接当参数梯度。

### 让正确和错误Critic分别指挥一次更新

以下是可手算的教学构造，不是论文实验。

一状态任务真Q为 $Q(a)=-(a-2)^2$，Actor输出 $a=\theta$。在θ=0时，$\partial Q/\partial a=4$，一次步长0.1的梯度上升得到θ=0.4，Q从−4变成−2.56。

若学到的Critic却是 $\hat Q(a)=-(a+2)^2$，同样代码把θ推到−0.4，真实Q变为−5.76。环境可不可微并非这里的障碍，Critic导数是否可信才是。

## 三、用探索数据学习Critic并保留动作梯度


```text
初始化确定性 Actor μ 和 Critic Q
循环：
  用带探索的行为策略收集转移
  以 r+γQ(s_next,μ(s_next)) 为目标学习 Critic
  x ← 当前样本状态
  a ← μθ(x)
  g_action ← ∂Q(x,a)/∂a
  g_actor ← (∂μθ(x)/∂θ)ᵀ*g_action
  θ ← θ+α*g_actor
输出：确定性策略
注：这是核心 Actor–Critic 示意，未添加 DDPG 的目标网络配方
```

**实现要点**：Critic 梯度错误可直接误导 Actor，off-policy 实现与理想定理有差别。

## 四、分开读取高维bandit与连续控制结果

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | §5 连续二次 bandit、经典控制、章鱼臂 |
| 数据来源与规模 | 行为策略采样 |
| 对比基线 | 随机 Actor–Critic 等；文中 SAC 缩写不是 2018 Soft AC |
| 训练预算与资源 | bandit 动作维度 10、25、50；其余完整预算本文未核实 |
| 指标及其含义 | 回报与随采样增长的学习速度 |
| 随机性与不确定性 | 连续bandit平均5次；控制任务30次；误差定义未全部复核 |
| 实际验证的假设 | 避免动作积分是否改善连续动作优化 |

**实验解读（本文分析）**：连续bandit[图1](#rl-13-figure-1)比较10、25、50维动作，选取参数扫描中表现最好的配置并平均5次运行，每批2m步再更新Actor。其横轴是环境步，评估使用均值动作而不惩罚探索噪声。这个受控实验支持高维动作梯度的效率动机，不能直接证明所有动力学任务都更优；控制任务另有30次运行。

<!-- figure-ref-v6:start:rl-13-figure-1 -->
<figure class="reading-evidence-figure" id="rl-13-figure-1"><a href="/rl/assets/reference-v6/13-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/13-figure-1.png" width="1479" height="402" alt="三列将连续动作维数从10增到25和50，横纵轴都用对数尺度；红色COPDAC-B在高维时较快压低成本。这是bandit构造中梯度估计的比较，不是所有连续控制任务的统一性能结论。" loading="lazy"></a><figcaption>原论文图形摘引｜Silver等，2014，图1，PDF第7页。<a href="https://proceedings.mlr.press/v32/silver14.pdf#page=7" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

三列将连续动作维数从10增到25和50，横纵轴都用对数尺度；红色COPDAC-B在高维时较快压低成本。这是bandit构造中梯度估计的比较，不是所有连续控制任务的统一性能结论。
<!-- figure-ref-v6:end:rl-13-figure-1 -->

### 控制图中的SAC并非后来的Soft Actor-Critic

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-13-figure-2 -->
<span id="rl-13-figure-2"></span>
<!-- figure-ref-v6:end:anchor-rl-13-figure-2 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/13-dpg-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/13-dpg-figure-2.png" width="1458" height="396" alt="确定性COPDAC-Q与随机Actor-Critic在Mountain Car、Pendulum和Puddle World的回报" loading="lazy"></a><figcaption>原论文图形摘引；Silver等，2014，Figure 2, PDF第7页；仅图形区域。<a href="https://proceedings.mlr.press/v32/silver14.pdf#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

这张图是连续控制的图2，不是前面讨论动作维数的bandit图1。三个面板横轴为时间步（刻度乘 $10^4$），纵轴为每回合总奖励（刻度乘 $10^3$），越高越好；不同任务纵轴范围不同。红线COPDAC-Q与蓝线OffPAC-TD的比较更接近“同为离策略、改变确定/随机Actor”，绿线SAC还同时改变了采样方式。曲线评价的是均值策略，不能把训练噪声造成的即时损失直接读入这些测试分数。


<!-- inline-evidence-v2:end -->


确定性梯度定理给出通过动作导数更新Actor的依据，实验则检验这一接口在高维动作中是否有优势。[图1](#rl-13-figure-1)分别比较10、25、50维连续bandit，用随机与确定性Actor-Critic测试维度效应；这里图例中的SAC是该文的stochastic actor-critic，不是2018 Soft Actor-Critic。[图2](#rl-13-figure-2)的连续控制比较与[图3](#rl-13-figure-3)的章鱼臂任务扩大了范围，但不能证明所有环境均适合确定性策略。 [查看原文](https://proceedings.mlr.press/v32/silver14.pdf)。

<!-- figure-ref-v6:start:rl-13-figure-3 -->
<figure class="reading-evidence-figure" id="rl-13-figure-3"><a href="/rl/assets/reference-v6/13-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/13-figure-3.png" width="552" height="429" alt="上图看每回合回报，下图看到达目标的步数；灰线为10次运行，红线汇总其趋势。两种指标方向相反但结论相容，不能只展示回报而隐藏到达时间的离散性。" loading="lazy"></a><figcaption>原论文图形摘引｜Silver等，2014，图3，PDF第8页。<a href="https://proceedings.mlr.press/v32/silver14.pdf#page=8" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

上图看每回合回报，下图看到达目标的步数；灰线为10次运行，红线汇总其趋势。两种指标方向相反但结论相容，不能只展示回报而隐藏到达时间的离散性。
<!-- figure-ref-v6:end:rl-13-figure-3 -->

## 五、检查局部斜率与访问分布的误差

Actor会利用Critic的真实局部高点，也会利用错误高点；探索不足时，动作导数只是数据外推。行为访问分布替代目标分布的条件与神经Critic误差都需单独检查，不能因链式求导可执行就认为获得了理想定理中的真梯度。

### 五个前置概念

1. **确定性策略**：给定状态直接输出动作。
2. **链式法则**：组合函数的导数可分段相乘。
3. **动作梯度**：Q 随动作微小改变的变化。
4. **行为策略**：负责实际探索的数据生成器。
5. **访问分布**：训练状态的概率权重。

## 六、继续追问：探索覆盖与离策略近似

<details>
<summary>1. 确定性策略怎样保证探索？</summary>

确定性目标策略本身没有采样熵，训练时可使用带动作噪声的行为策略、参数噪声或独立探索控制器收集数据。梯度公式并不保证这些行为访问到有价值的状态动作，离策略更新仍依赖覆盖和 Critic 精度。应记录噪声分布、边界处理及训练/评估差异；在多峰任务中，只靠小幅局部噪声可能长期停留在同一行为区域。

</details>

<details>
<summary>2. 动作有硬边界时梯度如何处理？</summary>

常见做法是用 tanh 等可微映射把输出放到动作区间，再按链式法则求导；饱和区的导数会很小。直接在环境前硬裁剪会造成越界区梯度为零或与实际执行动作不一致，应明确训练时 Critic 看到的是哪个动作。边界最优解还涉及约束最优化的单边或投影条件，不能不加说明地套用无约束内点驻点分析。

</details>

<details>
<summary>3. 为什么不需要对真实环境求导？</summary>

策略梯度定理把环境未来影响汇入 $Q^\mu(s,a)$，更新使用 $\nabla_\theta\mu(s)\nabla_a Q^\mu(s,a)$，因此无需显式求真实转移函数的导数。实践中用可微 Critic 近似动作梯度，而其训练目标来自交互样本。免于环境求导不等于免于环境信息或模型误差：Critic 的梯度偏差会直接传给 Actor。

</details>

## 七、把确定性梯度接入深度回放系统

- **直接方法承接**：[DDPG](17-ddpg.md)。高维深网训练还会面对相关样本和追逐目标，DDPG把确定性梯度与经验回放、目标副本组合。
- **理论回看**：[策略梯度定理](08-policy-gradient-theorem.md)。使用近似Critic和不同状态权重时，仍要重新核查梯度成立的条件。

- [原论文与图表入口](https://proceedings.mlr.press/v32/silver14.pdf)。§3—4定理与离策略解释；§5.1—5.3实验设置。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：确定性策略没有动作概率，梯度从哪里来？

**参考答案**：沿 Q 对动作的变化方向更新策略：

$$
\nabla_\theta J
=
\mathbb E[
\nabla_\theta\mu_\theta(s)
\nabla_aQ^\mu(s,a)|_{a=\mu_\theta(s)}
]
$$

Critic 提供“动作往哪里变化更好”，Actor 的导数再把动作方向转换为参数方向。

**问题 2**：为什么 Q 数值预测准确，仍可能不足以训练好 Actor？

**参考答案**：Actor 使用的是 Q 对动作的导数。一个函数可以在数据点上的数值很准，却在点之间产生错误斜率。Actor 可能顺着这些错误斜率选择缺少数据支持的动作，所以还要关注局部梯度与覆盖范围。

[系列首页](README.md) · [上一篇](12-gps.md) · [下一篇](14-trpo.md)
