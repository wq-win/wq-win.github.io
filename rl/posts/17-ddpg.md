# 第 17 天｜DDPG：把确定性策略梯度放进深度网络

[系列首页](README.md) · [上一篇](16-dqn.md) · [下一篇](18-double-dqn.md)

**原论文与版本**：Lillicrap 等，*Continuous control with deep reinforcement learning*，2015／2016。[正文](https://arxiv.org/html/1509.02971v6)。

### 先接住前作的问题

[DPG](13-dpg.md)给出确定性Actor沿动作价值导数更新的接口，[DQN](16-dqn.md)则提供回放与慢变化目标的训练配方。DDPG明确组合两条路线：连续动作不能方便枚举最大值，Actor近似寻找高Q动作；共享网络与旧数据又要求稳定化。它不是只把DQN的离散输出层改大。

## 一、问题设定：连续动作Actor怎样与深度回放Critic共同训练

Critic需要一个后继动作来构造目标，Actor又需要Critic告诉它动作向哪里改。两个估计器相互依赖，若都快速追逐对方，就可能把虚假的高价值不断放大。DDPG通过目标Actor、目标Critic与回放组织这个循环，但仍要面对价值误差。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 在线收集、off-policy、连续动作、无模型 Actor–Critic |
| 状态／观测 | 低维状态或堆叠图像 |
| 动作 | 连续关节／控制指令 |
| 奖励或学习信号 | 任务回报 |
| 终止／边界 | 环境终止与固定时间长度分开 |

## 二、让Actor近似选动作并区分两种冻结

DDPG把两条路线拼在一起：DPG提供连续动作Actor的链式梯度，DQN提供回放和慢变化目标。连续动作无法方便地枚举argmax，所以Actor承担“找一个高Q动作”的近似优化角色。

Critic目标必须由目标Actor和目标Critic共同构造；Actor更新则通过在线Critic对动作求导。训练Actor时冻结Critic参数，但不能切断Q对动作的导数，否则Actor收不到学习信号。两种“冻结”含义需要分清。

软更新 $\bar\theta\leftarrow(1-\tau)\bar\theta+\tau\theta$ 是指数平滑。小τ让目标更稳定，也更滞后；没有哪个τ能保证Critic估计正确。OU噪声与batch normalization是原文实践组件，不是DPG定理所必需，探索噪声也不等于SAC在目标中奖励熵。

### 保留Actor到动作的梯度并冻结Critic参数

$$y=r+\gamma(1-d)Q_{\bar\phi}(s',\mu_{\bar\theta}(s')),\quad L_Q=E(Q_\phi-y)^2,\quad L_\mu=-E Q_\phi(s,\mu_\theta(s)).$$
软更新 $\bar\theta\leftarrow\tau\theta+(1-\tau)\bar\theta$，Critic 同理。τ 是跟随速度，不是奖励折扣。

$\theta$ 控制Actor，$\phi$ 控制Critic，上横线表示目标副本，$d$ 是真终止标志；这里的小批量状态来自replay。固定 $\phi$ 后，Actor损失的链式导数为

$$
\nabla_\theta L_\mu=-\mathbb E_{s\sim D}\!\left[J_{\mu_\theta}(s)^\top\nabla_aQ_\phi(s,a)\big|_{a=\mu_\theta(s)}\right].
$$

负号使梯度下降对应提高Q；$J_{\mu_\theta}$ 是动作对参数的Jacobian。Critic更新时 $y$ 应停止梯度，Actor更新时却要保留上式的动作导数。这是[原文§3、式(6)](https://arxiv.org/html/1509.02971v6#S3)的采样实现思路，replay加近似Critic并不恢复DPG理想条件下的全部保证。

### 对照两种软更新参数写法

本文 $\tau$ 是新在线参数的权重；若代码写成 $\bar\theta\leftarrow\rho\bar\theta+(1-\rho)\theta$，则 $\rho=1-\tau$。把通常接近1的ρ直接填进本文τ位置，会把慢目标变成几乎立即复制。

### 算清软更新并非定期完整复制

以下是可手算的教学构造，不是论文实验。

在线Actor某参数为10，目标参数为0，τ=0.1。连续三次软更新且在线参数不再改变，目标为1、1.9、2.71，一般第k次为$10(1-0.9^k)$。

因此“τ=0.1”并非每10步完整复制，也不是每步保留10%的旧目标。若Actor不断追逐Critic虚假峰值，缓慢目标只推迟反馈，无法根治高估。

## 三、用目标双网络造标签并做软更新


```text
初始化 Actor、Critic、两者目标副本与 replay
收集 a=μ(s)+探索噪声 的真实转移
循环抽 replay minibatch：
  用两个目标网络构建 y，终止时 y=r
  最小化 Critic TD 损失
  固定 Critic 参数但保留其对动作的导数
  最小化 -Q(s,μ(s)) 更新 Actor
  软更新目标 Actor 和目标 Critic
评价时去掉探索噪声
输出：连续控制策略
```

**实现要点**：仍易受价值高估、尺度和超参数影响。

## 四、读目标网络、归一化与平均运行表现

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | MuJoCo 多种连续控制 |
| 数据来源与规模 | 在线状态／视觉经验 |
| 对比基线 | 原文相关控制方法与组件移除 |
| 训练预算与资源 | 像素设定含64×64×9输入；完整预算本文未逐项核实 |
| 指标及其含义 | 任务累计回报与学习曲线 |
| 随机性与不确定性 | 表1给5次运行的平均与最佳；全部图的离散度未逐项复核 |
| 实际验证的假设 | 稳定化能否让深度 DPG 实际可训练 |

**实验解读（本文分析）**：[图2](#rl-17-figure-2)将目标网络与归一化拆开比较；表1每个任务至多250万步，并分别列5次运行的平均和最佳结果。最佳一轮的像素控制成功不能替代平均稳定性。[图3](#rl-17-figure-3)还显示复杂任务Q数值不够准确但策略可用，说明应同时检验价值误差与行为表现。

<!-- figure-ref-v6:start:rl-17-figure-3 -->
<figure class="reading-evidence-figure" id="rl-17-figure-3"><a href="/rl/assets/reference-v6/17-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/17-figure-3.png" width="1609" height="414" alt="三列比较Pendulum、Cartpole和Cheetah的预测Q与测试回报，来自5个重复训练实例；对角线表示一致。Cheetah明显偏离对角线但策略仍可有效，说明精确校准与正确行动排序是不同要求。" loading="lazy"></a><figcaption>原论文图形摘引｜Lillicrap等，2015，图3（完整面板）。<a href="https://arxiv.org/html/1509.02971v6#S4.F3" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留；多面板仅重新排版，未改数据。</figcaption></figure>

三列比较Pendulum、Cartpole和Cheetah的预测Q与测试回报，来自5个重复训练实例；对角线表示一致。Cheetah明显偏离对角线但策略仍可有效，说明精确校准与正确行动排序是不同要求。
<!-- figure-ref-v6:end:rl-17-figure-3 -->

### 分开平均、最佳运行与价值误差

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-17-figure-2 -->
<span id="rl-17-figure-2"></span>
<!-- figure-ref-v6:end:anchor-rl-17-figure-2 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/17-ddpg-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/17-ddpg-figure-2.png" width="1600" height="505" alt="DDPG目标网络与批归一化消融在十项控制任务上的归一化奖励" loading="lazy"></a><figcaption>原论文图形摘引；Lillicrap等，2015/2016，Figure 2；原HTML图形。<a href="https://arxiv.org/html/1509.02971v6#S4.F2" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

横轴以百万环境步计，纵轴将随机策略定为0、iLQG规划器定为1，超过1并非超过某个普遍最优上界。[原文图注](https://arxiv.org/html/1509.02971v6#S4.F2)中浅灰是带batch normalization的原DPG变体，深灰加入目标网络，绿线同时用目标网络与归一化，蓝线则从像素输入学习。像素蓝线还改变了输入条件，故蓝绿差距不能仅归因于归一化；图中并非所有任务都呈相同排名。


<!-- inline-evidence-v2:end -->


[图2](#rl-17-figure-2)直接比较原DPG变体、目标网络、batch normalization及像素输入配置，不同颜色对应不同组合；它支持目标网络等组件在所测环境的稳定化作用，并不证明每项都在所有环境必需。[图3](#rl-17-figure-3)另把估计Q与测试回报配对，虚线表示两者相等；偏离虚线说明能学出可用策略与价值估计准确是两回事。算法1的两个目标网络应据此理解为缓慢自举机制，而非高估的完全解法。 [查看原文](https://arxiv.org/html/1509.02971)。

## 五、追逐更高Q为何也可能钻估计漏洞

慢目标只是延缓错误反馈，不能保证Critic的峰值真实。DDPG仍受价值高估、奖励尺度和超参数影响；OU噪声是原文实践选择，不是所有连续任务的最优探索方式。

### 五个前置概念

1. **确定性 Actor**：直接输出连续动作。
2. **目标 Actor**：为下一状态提供较稳定动作。
3. **软更新**：目标参数逐渐跟随在线参数。
4. **OU 噪声**：具有时间相关性的探索噪声。
5. **动作导数**：指导 Actor 修改动作的信号。

## 六、继续追问：动作梯度、探索和目标滞后

<details>
<summary>1. 为什么目标 Critic 不能单独解决高估？</summary>

目标网络减缓目标变化，却仍通过 Actor 或最大化选择高估动作；“慢一些的错误”依然是错误。若 Critic 在某区域偏高，Actor 会反复把动作推向该处，再让目标网络迟早继承偏差。Double Q 式交叉评价、双 Critic 的保守目标以及目标动作平滑分别针对不同误差来源，不能从有目标网络推导出估值无偏。

</details>

<details>
<summary>2. batch normalization 的训练／评价统计如何影响结果？</summary>

训练时的 minibatch 均值方差与评估时的运行统计不同，回放数据分布又随策略变化；若混用模式、把评测数据写进统计，或目标网络统计不同步，执行策略就可能改变。复现应固定 train/eval 切换、统计更新频率及目标网络是否复制相关缓冲量，并用独立评测轨迹验证，不能只比较网络权重。

</details>

<details>
<summary>3. 更强的 Actor 优化为何有时反而变差？</summary>

Actor 的优化目标是近似 $Q$，不是可直接访问的真实回报。更充分的最大化会更精确地找到 Critic 的外推漏洞，尤其在低覆盖动作区域，从而同时提高预测 Q、降低真实收益。应观察真实评估回报与 Q 的差距、动作覆盖和双估计分歧，限制 Actor 更新速度；Critic 误差存在时，“优化更强”不是无条件优点。

</details>

## 七、沿连续控制的估值误差继续修补

- **直接方法修补**：[TD3](31-td3.md)。Actor利用Critic误差留下的反馈问题，促成双Critic、延迟更新和目标动作平滑的组合。
- **平行连续控制目标**：[SAC](30-sac.md)。把随机性写入优化目标是另一条路线，与给确定性Actor加OU探索噪声不同。

- [原论文与图表入口](https://arxiv.org/html/1509.02971)。Algorithm 1；§4[图2](#rl-17-figure-2)、[图3](#rl-17-figure-3)与表1。

- 教学阅读：[Deep Deterministic Policy Gradient](https://spinningup.openai.com/en/latest/algorithms/ddpg.html)。仅借用本节的解释顺序与接口视角；具体算法、版本和实验以本篇原论文为准。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：DDPG 为什么需要 Actor，而 DQN 通常不需要单独的 Actor？

**参考答案**：DQN 可以枚举有限动作比较 Q；连续动作空间无法直接逐个枚举。DDPG 训练 Actor 近似执行动作优化，直接输出连续动作，再让 Critic 评价并指导改进。Actor 相当于学会了怎样寻找高 Q 动作。

**问题 2**：更新 Actor 时，为什么冻结 Critic 参数，但不能把整个 Q 输出 detach？

**参考答案**：冻结 Critic 参数，是避免 Actor 靠修改评分器来提高分数；保留 Q 对动作的梯度，才能知道动作应如何改变。若把 Q 输出整体停止梯度，Q→动作→Actor 参数的学习链就被切断。

[系列首页](README.md) · [上一篇](16-dqn.md) · [下一篇](18-double-dqn.md)
