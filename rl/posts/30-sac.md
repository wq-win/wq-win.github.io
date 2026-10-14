# 第 30 天｜SAC：随机性进入目标，而不仅是探索噪声

[系列首页](README.md) · [上一篇](29-rainbow.md) · [下一篇](31-td3.md)

**原论文与版本**：Haarnoja 等，*Soft Actor-Critic: Off-Policy Maximum Entropy Deep Reinforcement Learning with a Stochastic Actor*，2018。[正文](https://arxiv.org/html/1801.01290v2)。

### 先接住前作的问题

[DDPG](17-ddpg.md)通过带噪行为采数据，但其目标仍追求确定性动作的高Q。SAC沿平行的离策略Actor–Critic路线，把策略熵写进未来回报，因此连价值目标也必须改变。

## 一、问题设定：随机性怎样成为要优化的收益而非临时探索噪声

如果训练只奖励Q，外加噪声只是采样手段，最终优化仍可能压成单一动作。SAC让保留多种选择本身具有目标价值。于是Actor、Q和V必须使用同一熵约定，有界连续动作的log概率也必须按真实输出分布计算。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | off-policy、无模型、最大熵随机 Actor–Critic |
| 状态／观测 | 连续控制状态 |
| 动作 | 可重参数化的随机连续动作 |
| 奖励或学习信号 | 环境奖励加熵的训练目标 |
| 终止／边界 | 终止截断按任务处理 |

## 二、从最大熵目标得到soft价值与策略改进

SAC首先改变优化目标：在未来回报中计入策略熵，而不是只在执行动作上额外加探索噪声。soft价值因此同时评价奖励与保留多种行动的收益；Actor与Critic必须使用相同的熵约定，否则学习的不是同一个目标。

对固定Q，优化 $\mathbb E_\pi[Q-\alpha\log\pi]$ 的理想策略满足 $\pi^*(a|s)\propto\exp(Q(s,a)/\alpha)$。把Actor投向这个Boltzmann分布，相当于最小化KL；配分函数不依赖Actor参数，可从梯度中去掉。连续动作时用重参数化采样，通过动作路径对Q求导，减少似然比估计的方差。

本篇固定2018 v2：独立V与目标V、双Q取min、固定温度/奖励尺度。后来无独立V和自动温度的实现不能倒写为此版。tanh压缩动作后还要修正log概率的雅可比；漏掉它会同时扭曲熵与Actor损失。

### 让V目标与Actor损失使用同一有界动作密度

$$V(s)\approx E_{a\sim\pi}[\min_iQ_i(s,a)-\alpha\log\pi(a|s)],\quad y_Q=r+\gamma(1-d)V_{\bar\psi}(s').$$
$$L_\pi=E[\alpha\log\pi_\theta(a|s)-\min_iQ_i(s,a)].$$
重参数化 a=fθ(ε,s) 让动作路径可微；tanh 压缩后 log 概率必须包含雅可比修正。

雅可比修正不是一个额外奖励项。令未压缩动作 $u=\mu_\theta(s)+\sigma_\theta(s)\odot\epsilon,\ \epsilon\sim\mathcal N(0,I)$，$a=\tanh u$；[原文附录C，式(20)—(21)](https://arxiv.org/html/1801.01290v2#A3)由概率质量不变得到

$$\log\pi_\theta(a\mid s)=\log p_\theta(u\mid s)-\sum_i\log(1-\tanh^2u_i).$$

每个维度被压缩的比例为 $1-\tanh^2u_i$，故密度要除以这些比例的乘积，取log后成为减号。Actor损失和V目标里的log概率都应使用同一个有界动作密度；不能采样压缩后的动作，却仍把未压缩高斯的log概率当作策略熵。

### 动作压缩为何在边界附近改变密度更大

tanh的导数在 $|u|$ 很大时接近零：一段较宽的未压缩区间被挤到狭窄动作区间，因此密度要升高。log雅可比修正描述这项坐标变化，不是额外奖励或鼓励动作碰边。

### 看奖励尺度怎样改变两动作概率

以下是可手算的教学构造，不是论文实验。

两动作Q=(2,0)，α=1，理想概率为$(e^2/(e^2+1),1/(e^2+1))\approx(0.881,0.119)$。α降至0.5则约(0.982,0.018)，更集中。

若把奖励和Q都放大2倍却保持α不变，概率也变得更集中。这说明奖励尺度与温度共同决定折中；“最大熵”不意味着越随机越好。

## 三、重参数化采样并修正tanh后的密度

`stop_gradient` 表示停止向目标量传播梯度。

```text
初始化随机Actor、两个Q、V与目标V、replay
循环：
  从 Actor 采样动作与环境交互
  抽 replay batch
  停止梯度构造 yQ=r+γ*(1-done)*目标V(s_next)
  更新两个 Q
  从当前 Actor 重采动作
  用 stop_gradient(minQ-αlogπ) 回归 V
  冻结 Q 参数，重参数化更新 Actor 的 αlogπ-minQ 损失
  软更新目标 V
输出：随机策略
注：此版固定 α／奖励尺度，不含后来自动温度目标
```

**实现要点**：熵系数改变任务折中，原始版本不自动调温度。

## 四、读均值策略测试与奖励尺度敏感性

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | §5 六种连续控制，包括高维 humanoid |
| 数据来源与规模 | 在线经验回放 |
| 对比基线 | 原文随机／确定控制基线 |
| 训练预算与资源 | 每1000步评价；各任务总交互预算见曲线 |
| 指标及其含义 | 回报与样本效率 |
| 随机性与不确定性 | 5种子；部分图阴影是最小—最大，不是95%CI |
| 实际验证的假设 | 最大熵 off-policy 是否改善效率和稳健性 |

**实验解读（本文分析）**：§5[图1](#rl-30-figure-1)使用5种子，每1000环境步评估一次，阴影为最小—最大范围而非95%置信区间。SAC评价用均值动作，与训练随机策略不同；原文SQL评价保留随机性。[图3](#rl-30-figure-3)奖励尺度敏感性说明原版仍需调参，不能引用后来的自动调温度解释此版稳定性。

### 阴影是五次运行的最小最大范围

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-30-figure-1 -->
<span id="rl-30-figure-1"></span>

<p class="figure-source-links">原引用定位：<a href="https://arxiv.org/html/1801.01290#S4.F1" target="_blank" rel="noopener noreferrer">原文</a>。</p>
<!-- figure-ref-v6:end:rl-30-figure-1 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/30-sac-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/30-sac-figure-1.png" width="1800" height="900" alt="SAC与多种控制算法在六项MuJoCo任务中的回报学习曲线" loading="lazy"></a><figcaption>原论文图形摘引；Haarnoja等，2018，Figure 1；原HTML图形。<a href="https://arxiv.org/html/1801.01290v2#S4.F1" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>


<!-- inline-evidence-v2:end -->


[图1](#rl-30-figure-1)按六个连续控制任务画训练进展：横轴为百万环境步、纵轴为平均回报。Hopper只画到约100万步，而Humanoid画到约1000万步，不能把同样靠右的位置当作相同预算；[图2](#rl-30-figure-2)特别比较Humanoid中的随机与确定性变体，支持随机策略可改善所测配置的跨种子稳定性。[图3](#rl-30-figure-3)把评估动作选择、奖励尺度和目标平滑分开：均值动作评估改变实际执行策略，奖励尺度又改变熵与回报的相对权重。故这些敏感性曲线恰好说明原版不是无需调参，也不能据此替后续自动温度版背书。 [查看原文](https://arxiv.org/html/1801.01290)。

<!-- figure-ref-v6:start:rl-30-figure-3 -->
<span id="rl-30-figure-3"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/30-sac-figure-3-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/30-sac-figure-3-full.png" width="1800" height="440" alt="原论文Figure 3：三列依次为(a)评估动作选择、(b)奖励尺度、(c)目标平滑系数。横轴均为环境步；只在同一列内比较控制变量，不能把奖励尺度实验解释为自动调温度。" loading="lazy"></a><figcaption>完整原图摘引｜Haarnoja等，2018，Figure 3；1801.01290v2，HTML S5.F3。<a href="https://arxiv.org/html/1801.01290v2#S5.F3" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1801.01290#S5.F3" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：三列依次为(a)评估动作选择、(b)奖励尺度、(c)目标平滑系数。横轴均为环境步；只在同一列内比较控制变量，不能把奖励尺度实验解释为自动调温度。
<!-- figure-ref-v6:end:rl-30-figure-3 -->

<!-- figure-ref-v6:start:rl-30-figure-2 -->
<span id="rl-30-figure-2"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/30-sac-figure-2-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/30-sac-figure-2-full.png" width="1800" height="1350" alt="原论文Figure 2：Humanoid中的随机与确定性策略：浅线保留各次运行，粗线呈现总体趋势；应比较跨种子分散程度，不能把某一条红线的最高点当作稳定收益。" loading="lazy"></a><figcaption>完整原图摘引｜Haarnoja等，2018，Figure 2；1801.01290v2，HTML S5.F2。<a href="https://arxiv.org/html/1801.01290v2#S5.F2" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1801.01290#S5.F2" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：Humanoid中的随机与确定性策略：浅线保留各次运行，粗线呈现总体趋势；应比较跨种子分散程度，不能把某一条红线的最高点当作稳定收益。
<!-- figure-ref-v6:end:rl-30-figure-2 -->

## 五、分清熵温度、奖励尺度与版本改动

高熵可能牺牲精确动作任务的即时收益；reward scale与α的相对尺度决定折中，2018 v2并不自动调温度。测试使用均值动作还是随机采样，会改变被评价的策略，比较时必须统一口径。

### 五个前置概念

1. **最大熵目标**：奖励之外还偏好多样行为。
2. **温度 α**：控制熵与环境收益的权衡。
3. **Soft value**：包含未来熵收益的价值。
4. **重参数化**：把随机动作写成可微函数与独立噪声。
5. **雅可比修正**：变量变换后修正概率密度。

## 六、继续追问：动作密度、温度与评价策略

<details>
<summary>1. 奖励整体乘10但 α 不变会怎样？</summary>

目标为回报加 $\alpha$ 倍熵时，奖励乘10而 $\alpha$ 不变，相当于相对原奖励把熵权重降到十分之一，最优折中一般更趋利用。若希望保持同一理想目标的相对权重，应同步放大 $\alpha$；但优化器步长、Q尺度和近似误差仍会改变训练动态。原版的奖励尺度调节因此不只是数值归一化。

</details>

<details>
<summary>2. 为什么评估用均值动作可能改变结论？</summary>

训练优化随机策略的熵正则目标，评估却可改用均值动作，二者是不同执行策略。对于经过 tanh 的高斯，tanh 均值参数通常也不等于动作分布的精确均值；多峰价值或边界饱和时，确定性动作可能更好或更差。比较必须统一是否采样、温度和测试次数，并分别报告随机执行和指定确定性执行。

</details>

<details>
<summary>3. 原始 SAC 与自动温度版有哪些训练对象不同？</summary>

2018早期 SAC 具有显式状态价值 V 网络和固定熵温度/奖励尺度设置；常用后续版本直接以目标 Q 和下一动作的 log-prob 构造目标，省去独立 V，并把温度作为满足目标熵约束的可学习变量。网络数量、目标更新、温度损失和超参数都不同。引用或复现时必须标明版本，不能把后续代码当原论文算法逐行对应。

</details>

## 七、比较同期双Q与后续技能学习组合

- **同期平行与模块联系**：[TD3](31-td3.md)。两者都使用双Q最小目标管理估值误差，但确定性延迟更新与最大熵目标不同。
- **目标模块组合**：[DIAYN](33-diayn.md)。无任务奖励的技能学习可把可区分性奖励与最大熵控制组合，仍需检查技能的下游用途。

- [原论文与图表入口](https://arxiv.org/html/1801.01290)。soft策略改进；重参数化式11—13；双Q说明；§5[图1](#rl-30-figure-1)、[图2](#rl-30-figure-2)、[图3](#rl-30-figure-3)。

- 教学阅读：[Policy Gradient Algorithms](https://lilianweng.github.io/posts/2018-04-08-policy-gradient/)。仅借用本节的解释顺序与接口视角；具体算法、版本和实验以本篇原论文为准。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：SAC 与“确定性策略加探索噪声”有什么本质区别？

**参考答案**：SAC 把策略熵写入优化目标：

$$
\mathbb E\sum_t\gamma^t[r_t+\alpha H(\pi(\cdot|s_t))]
$$

随机性本身参与价值评价与策略改进。执行时加噪声主要改变采样行为，不一定改变被优化的回报目标。

**问题 2**：熵系数越大，探索是否越好？

**参考答案**：更大熵系数鼓励分散动作，但可能让策略为了随机性牺牲任务回报；太小则可能过早集中。原始 SAC 与后续自动温度调整版本也应区分：自动调整是一种控制机制，不意味着温度选择从此没有假设和代价。

[系列首页](README.md) · [上一篇](29-rainbow.md) · [下一篇](31-td3.md)
