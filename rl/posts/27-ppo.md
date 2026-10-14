# 第 27 天｜PPO：裁剪替代目标到底限制了什么

[系列首页](README.md) · [上一篇](26-her.md) · [下一篇](28-c51.md)

**原论文与版本**：Schulman 等，*Proximal Policy Optimization Algorithms*，2017。[PDF](https://arxiv.org/pdf/1707.06347v2)。

### 先接住前作的问题

[TRPO](14-trpo.md)用概率比替代目标和KL限制控制策略变化，但求自然方向与回溯的实现成本较高。PPO直接延续这一保守更新动机，改变样本替代目标的形状，以便做多轮小批量一阶优化。[GAE](15-gae.md)可以提供优势权重，二者是估计器与优化器的组合。

## 一、问题设定：不解信赖域子问题，怎样抑制旧数据上的过度更新

同一批旧策略样本多训练几轮，可以提高利用率，却也可能越来越偏离产生它们的策略。PPO-Clip希望让已经朝有利方向改动过多的样本不再提供额外奖励；关键问题是目标在哪一侧被截平，以及这是否真能禁止概率比越界。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | on-policy 采样、随机策略优化，通常搭配 Actor–Critic |
| 状态／观测 | 控制状态或视觉观测 |
| 动作 | 连续或离散动作 |
| 奖励或学习信号 | 环境奖励；应用到LLM时需另定义 |
| 终止／边界 | 环境终止与采样截断 |

## 二、按优势正负展开裁剪替代目标

旧策略采样后冻结优势，使用 $r_t=\pi_\theta(a_t|s_t)/\pi_{old}(a_t|s_t)$ 衡量新策略对已见动作的改变。

必须分正负优势：当A>0，目标为 $A\min(r,1+\epsilon)$，只截平“继续提高好动作概率”的收益；当A<0，目标为 $A\max(r,1-\epsilon)$，只截平“继续降低坏动作概率”的收益。朝坏方向移动仍受惩罚。min并非装饰，去掉它会改变算法。

π_old必须固定到下一轮重新采样，而不是每个小批次更新成当前策略，否则比率的分母不再对应实际生成分布。

### 分清概率比、clip操作和外层min

$$L^{clip}=E[\min(\rho A,\operatorname{clip}(\rho,1-\epsilon,1+\epsilon)A)].$$
ρ 是新旧概率比，A 是冻结优势。Actor 最大化它，完整训练通常另有价值回归和熵项；原论文也研究自适应 KL 惩罚版本。

### 换成log概率坐标，看哪一项真的停止推动

固定旧概率与优势，令 $\ell=\log\pi_\theta(a\mid s)$，则 $\rho=\exp(\ell-\ell_{old})$，所以未裁剪分支对 $\ell$ 的导数是 $\rho A$。远离折点时，单样本裁剪目标满足

$$\frac{\partial L^{clip}}{\partial\ell}=\begin{cases}0,&A>0,\ \rho>1+\epsilon,\\0,&A<0,\ \rho<1-\epsilon,\\\rho A,&\text{其余未截平区域}.\end{cases}$$

这是对一个样本贡献的导数；总参数梯度还要乘 $\nabla_\theta\log\pi_\theta(a\mid s)$ 并累加其他样本；这里的score是log概率对参数的梯度，不是奖励评分。这样既能看见“有利方向走够后不再奖励”，也能定位为什么共享参数仍可能改变它的概率。折点处由实现选择次梯度。

分正负优势阅读的顺序参考[Spinning Up PPO讲解](https://spinningup.openai.com/en/latest/algorithms/ppo.html)，共享网络的影响结合[Lilian Weng策略梯度综述](https://lilianweng.github.io/posts/2018-04-08-policy-gradient/#ppo)；分段导数是对[原论文式(7)](https://arxiv.org/pdf/1707.06347v2#page=3)的教学展开。

### 分别验算好方向截平与坏方向惩罚

以下是可手算的教学构造，不是论文实验。

ε=0.2。A=2、r=1.4时，未裁剪项2.8，裁剪项2.4，取2.4，继续增加r不再奖励。A=−2、r=0.6时，两项−1.2和−1.6，取−1.6，继续降低r不再获益。

反方向也要算：A=−2、r=1.4时取−2.8而非−2.4，坏动作变常见仍被惩罚。概率比已经是1.4这件事本身没有被禁止，足以反驳“clip把概率比硬锁在0.8到1.2”。

## 三、固定旧概率与优势再做多轮小批量更新


```text
重复：
  π_old ← 当前策略冻结副本
  用 π_old 收集 rollout 并保存 old_logprob
  计算优势 A 与价值目标，停止其梯度
  for epoch in 1..K：
    打乱 minibatch
    ρ ← exp(logπθ(a|s)-old_logprob)
    surrogate ← min(ρ*A,clip(ρ,1-ε,1+ε)*A)
    最小化 -mean(surrogate)+价值损失-熵奖励
  丢弃本轮 on-policy 数据，重新采样
输出：策略与价值网络
```

**实现要点**：π_old 不是 RLHF 的参考 π_ref。代码省略原文具体价值权重与调参表。

## 四、读目标对照与不同控制预算

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | §6 MuJoCo、Roboschool、Atari |
| 数据来源与规模 | on-policy trajectories |
| 对比基线 | 不同替代目标、A2C/ACER/TRPO等按实验分别比较 |
| 训练预算与资源 | 部分 MuJoCo 曲线为1百万步；各平台预算并不相同 |
| 指标及其含义 | 回报、采样效率与训练便利性 |
| 随机性与不确定性 | §6.1为7环境×3种子共21次归一汇总；其他图按自身协议 |
| 实际验证的假设 | 简化优化是否保持实用性能 |

**实验解读（本文分析）**：§6.1每个设置运行7环境×3种子，归一化后汇总21次结果；表1比较clip、固定KL、自适应KL及无惩罚目标。它使用独立价值网络且不加熵，不应把后来某库全部默认技巧归为这张表的原因。[图3](#rl-27-figure-3)控制任务预算100万步，Humanoid展示另用更大预算，不能与前图按同一训练成本比较。

### 不要把后来代码库技巧倒写入表1

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-27-figure-3 -->
<span id="rl-27-figure-3"></span>
<!-- figure-ref-v6:end:anchor-rl-27-figure-3 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/27-ppo-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/27-ppo-figure-3.png" width="1374" height="576" alt="PPO及多种策略优化方法在七项MuJoCo任务上一百万步的学习曲线" loading="lazy"></a><figcaption>原论文图形摘引；Schulman等，2017，Figure 3, PDF第7页；仅图形区域。<a href="https://arxiv.org/pdf/1707.06347v2#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

七个任务面板横轴都到一百万环境时间步，纵轴是该任务回报，越高越好；Reacher的负分也按“较不负更好”读。紫线是PPO-Clip，青线是TRPO，其他颜色对应不同基线。比较应先看同任务的早期速度与后期表现：例如有的任务很快饱和，有的仍有明显波动，不能因PPO在若干面板较高就推成每个任务始终领先。


<!-- inline-evidence-v2:end -->


[图1](#rl-27-figure-1)画单样本裁剪目标：横轴是新旧概率比，左右面板分别为正负优势，平坦区的方向并不相同。[图2](#rl-27-figure-2)沿一次更新方向插值比较替代目标，展示它是优化诱导而不是硬KL投影。Atari部分另在§6.4，不能把连续和离散任务的汇总当作同一训练模型。

<!-- figure-ref-v6:start:rl-27-figure-2 -->
<figure class="reading-evidence-figure" id="rl-27-figure-2"><a href="/rl/assets/reference-v6/27-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/27-figure-2.png" width="1095" height="402" alt="横轴沿一次实际策略更新的方向线性插值，1对应这次更新后的参数。红色裁剪目标在附近转折而KL仍继续增加，说明这是局部优化形状的示例，不能读作全局KL约束。" loading="lazy"></a><figcaption>原论文图形摘引｜Schulman等，2017，图2，PDF第4页。<a href="https://arxiv.org/pdf/1707.06347v2#page=4" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

横轴沿一次实际策略更新的方向线性插值，1对应这次更新后的参数。红色裁剪目标在附近转折而KL仍继续增加，说明这是局部优化形状的示例，不能读作全局KL约束。
<!-- figure-ref-v6:end:rl-27-figure-2 -->

<!-- figure-ref-v6:start:rl-27-figure-1 -->
<figure class="reading-evidence-figure" id="rl-27-figure-1"><a href="/rl/assets/reference-v6/27-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/27-figure-1.png" width="987" height="459" alt="优势为正时，过度增大动作概率后目标变平；优势为负时，过度减小概率后目标变平。两侧仍保留不利方向的惩罚，所以裁剪目标并不是把概率比硬限制在区间内。" loading="lazy"></a><figcaption>原论文图形摘引｜Schulman等，2017，图1，PDF第3页。<a href="https://arxiv.org/pdf/1707.06347v2#page=3" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

优势为正时，过度增大动作概率后目标变平；优势为负时，过度减小概率后目标变平。两侧仍保留不利方向的惩罚，所以裁剪目标并不是把概率比硬限制在区间内。
<!-- figure-ref-v6:end:rl-27-figure-1 -->

## 五、裁剪单样本收益没有形成全局硬约束

共享参数、未采样动作及价值或熵损失都可能推动已截平样本的概率，因此ε没有给全局KL硬上限。学习率、epoch数、优势处理和终止逻辑共同决定漂移，实际KL与clip fraction仍需监测。

### 五个前置概念

1. **概率比**：新旧策略对同一动作的相对倾向。
2. **裁剪替代目标**：限制某些方向的目标增益。
3. **旧策略**：本轮样本的实际生成策略。
4. **价值目标**：训练 Critic 的回归量。
5. **熵**：动作分布的不确定程度。

## 六、继续追问：共享参数、KL与优势噪声

<details>
<summary>1. 为何 ratio 超出区间后仍可能有梯度？</summary>

裁剪只去掉使目标过度乐观的方向：正优势且 ratio 超上界、负优势且 ratio 低于下界时，对该样本的裁剪分支可平坦；相反方向仍有梯度。共享参数、其他样本以及价值/熵损失也会改变该动作概率。因此 ratio 超界不代表所有梯度为零，PPO 也没有把每个动作概率投影回硬区间。

</details>

<details>
<summary>2. 多轮更新时如何检测策略漂移？</summary>

每轮测当前策略相对采样旧策略的经验 KL、ratio 分位数、clip fraction、熵及替代目标，并关注按状态或提示分组的尾部。可预先设 KL early stopping 与最大 epoch；这只是经验防护，样本外状态仍可能漂移。必须保留同一批数据收集时的旧 log-prob，不能每轮覆盖分母而掩盖累计变化。

</details>

<details>
<summary>3. 为什么换终止处理可比换优化器影响更大？</summary>

终止处理决定价值目标：真正终止应置零，时间截断若任务继续则应自举，同时不能跨重置递推 GAE。错误处理会系统性改写许多样本的回报和优势，尤其长时域、正值尾部明显时，比替换优化器造成的局部更新差异更大。比较算法前应统一环境包装器、time-limit mask、最后观测和奖励尺度，再做优化器消融。

</details>

## 七、从固定优势走向语言模型的组内基线

- **优势模块回看**：[GAE](15-gae.md)。裁剪只改变怎样使用优势，价值误差与尾部处理仍由估计器负责。
- **后作模块承接**：[GRPO](52-grpo.md)。语言模型继续使用裁剪概率比，但把优势基线改为同题采样组，采样单位与归一化会带来新的问题。

- [原论文与图表入口](https://arxiv.org/pdf/1707.06347v2)。§2—4目标；§6.1表1；§6.2[图3](#rl-27-figure-3)；§6.3预算。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：优势为正和为负时，裁剪分别限制什么？

**参考答案**：对正优势动作，概率比高于 $1+\epsilon$ 后，不再从该样本获得继续提高概率的直接收益；对负优势动作，概率比低于 $1-\epsilon$ 后，不再从继续降低概率获得直接收益。裁剪抑制的是过度朝“有利方向”更新的激励。

**问题 2**：为什么 PPO 仍可能出现很大的 KL？

**参考答案**：裁剪没有把参数或概率比投影回合法区间。不同样本共享参数，一次更新会同时改变许多动作概率；未采样动作也不受直接约束。因此它不是硬 KL 保证，实践中仍需监测 KL、步长和更新次数。

[系列首页](README.md) · [上一篇](26-her.md) · [下一篇](28-c51.md)
