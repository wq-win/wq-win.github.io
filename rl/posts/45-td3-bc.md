# 第 45 天｜TD3+BC：离线学习中，一项模仿损失能走多远

[系列首页](README.md) · [上一篇](44-decision-transformer.md) · [下一篇](46-iql.md)

**原论文与版本**：*A Minimalist Approach to Offline Reinforcement Learning*，2021。[原论文](https://arxiv.org/abs/2106.06860)。

### 先接住前作的问题

[第31天 TD3](31-td3.md)处理连续控制中的估值与更新稳定性，但离线时Actor仍可能追逐数据外高Q。TD3+BC直接沿用这一Critic框架，把数据动作距离加入Actor目标；这是明确的算法承接。[第37天 BCQ](37-bcq.md)则以候选生成约束支持，留下可比较的问题：一项简单的距离损失，能替代多少复杂离线机制？

## 一、问题设定：一个简单BC项能解决多少离线问题

本篇同时处理控制问题和实验问题。控制上，只有固定连续动作数据，策略不能靠新交互纠正外推高值；实验上，网络、输入规范化和调参差异可能掩盖所谓算法提升。

因此作者保留TD3的大部分配方，以Actor的行为克隆项和状态规范化建立可检查的简洁基线。要判断它是否足够，既应看Q收益与动作距离的尺度，也应检查“同一任务”的数据版本和最后一次评估到底有多大波动。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 离线、连续动作、TD3加行为约束 |
| 状态／观测 | 按数据统计规范化的状态 |
| 动作 | 连续策略动作 |
| 奖励或学习信号 | 固定数据奖励 |
| 终止／边界 | 数据终止语义 |

## 二、沿Actor动作求导：高Q推动与数据动作回拉

$\lambda=\alpha/\mathbb E_D|Q(s,a)|$ 用Q的批量尺度归一化价值项，并停止这个系数的梯度。

### Q梯度与BC回拉怎样在动作上相遇

$$\max_\theta E[\lambda Q(s,\pi_\theta(s))-\|\pi_\theta(s)-a\|^2],\quad\lambda=\alpha/E|Q(s,a)|.$$
实际分母需数值保护并停止梯度。α仍决定价值优化与模仿折中。

**沿Actor动作求导看两股力**：把Critic参数和 $\lambda$ 暂时固定，单样本目标对动作的导数是 $\lambda\nabla_aQ(s,a)|_{a=\pi_\theta(s)}-2(\pi_\theta(s)-a_{data})$，再乘策略网络的参数雅可比。前项把动作推向高Q方向，后项拉回这条数据动作；这正是下文一维例子的来源。$\alpha$ 是需选择的相对强度，批量 $\mathbb E|Q|$ 只是把价值量级归一化，不会消除动作维数、单位或奖励平移影响。见[原文§5式3—5](https://arxiv.org/html/2106.06860v2#S5)。

### 乘法缩放与加法平移为何影响不同

固定同一批数据与Critic，若全部Q乘正数c，则平均绝对Q也乘c，λ相应除以c，价值项的动作梯度保持原尺度。若全部Q加常数b，动作导数不变，分母却通常改变，Q与BC的相对强度仍会变。这个比较解释了归一化能抵消的尺度变化；它不声称重新训练Critic后仍得到同一Q。

### 一维最优动作与多峰均值的反例

以下是可手算的教学构造，不是论文实验。

单状态数据动作a=0，假设局部Q(a)=a，λ=2。Actor最大化$2a-a^2$，导数2−2a=0，最优a=1。λ=0.2时最优a=0.1，行为约束更强。

若同一状态数据动作是−1和1各半，BC项平均为$a^2+1$，单独最小化会输出0，而0未必是好动作。这个多峰例子说明距离正则与概率支持约束有差别。

## 三、统一状态尺度并在延迟更新步加入BC

`stop_gradient` 表示停止向目标量传播梯度。

```text
固定D，计算状态均值与标准差
规范化训练与评估观测
循环：
  按TD3更新双Critic
  到延迟Actor更新步时：
    λ←α/stop_gradient(mean(abs(Q(s,a))))
    Actor最小化 -λQ(s,π(s))+||π(s)-a||²
    更新目标网络
输出：带相同状态规范化的策略
```

## 四、先读实现删减图，再比较版本与评价波动

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | D4RL locomotion多质量数据 |
| 数据来源与规模 | 固定离线数据 |
| 对比基线 | CQL、BCQ等原文基线与简化版本 |
| 训练预算与资源 | 完整梯度预算见原文；不新增训练交互 |
| 指标及其含义 | 归一化回报、跨回合／跨检查点评价波动 |
| 随机性与不确定性 | 主表5种子、最后10次评估；独立训练与单策略回合波动分开 |
| 实际验证的假设 | 少量修改能否达到竞争结果 |

### 图1：删去实现调整后的相对变化

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-45-figure-1 -->
<span id="rl-45-figure-1"></span>

<p class="figure-source-links">原引用定位：<a href="https://arxiv.org/html/2106.06860#S4.F1" target="_blank" rel="noopener noreferrer">原文</a>。</p>
<!-- figure-ref-v6:end:rl-45-figure-1 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/45-td3-bc-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/45-td3-bc-figure-1.png" width="1600" height="800" alt="CQL和Fisher-BRC简化实现后各离线数据任务的性能百分比变化" loading="lazy"></a><figcaption>原论文图形摘引；Fujimoto与Gu，2021，Figure 1；原HTML图形。<a href="https://arxiv.org/html/2106.06860v2#S4.F1" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>


这张柱状图是在诊断其他离线方法的实现调整，不是TD3+BC与它们的成绩差。横轴缩写由任务与数据质量组合：HC为HalfCheetah、Hop为Hopper、W为Walker；r/m/mr/me/e分别表示随机、中等、中等回放、中等加专家和专家数据。每根柱只比较同一组合中“删去调整”相对原实现的变化；跨数据集把负百分比直接相加，没有统一任务含义。

<!-- inline-evidence-v2:end -->


[图1](#rl-45-figure-1)移除若干实现调整后比较CQL和Fisher-BRC的离线成绩，纵轴是相对原实现的百分比变化：0是持平，向下是退化，并非负的任务回报。多数设置下降，也有正向条形，表明“极简”对照仍须逐设置锁定实现细节，不能声称每项调整处处必需。[图2](#rl-45-figure-2)考察最后一次评估中十个回合的最差偏差，[图3](#rl-45-figure-3)考察最后十次评估中的最差偏差：两者分别是单检查点回合波动与时间波动，不能统一写成训练种子方差。主实验再检验TD3+BC在D4RL的竞争力。 [查看原文](https://arxiv.org/html/2106.06860)。

<!-- figure-ref-v6:start:rl-45-figure-2 -->
<span id="rl-45-figure-2"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/45-td3-bc-figure-2-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/45-td3-bc-figure-2-full.png" width="1800" height="450" alt="原论文Figure 2：这张图比较同一最终评估中十个回合的最差回合偏差。横轴同时编码环境与数据类型，负柱表示评估内的不稳定，不能与跨检查点波动混淆。" loading="lazy"></a><figcaption>完整原图摘引｜Fujimoto与Gu，2021，Figure 2；2106.06860v2，HTML S4.F2。<a href="https://arxiv.org/html/2106.06860v2#S4.F2" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2106.06860#S4.F2" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：这张图比较同一最终评估中十个回合的最差回合偏差。横轴同时编码环境与数据类型，负柱表示评估内的不稳定，不能与跨检查点波动混淆。
<!-- figure-ref-v6:end:rl-45-figure-2 -->

<!-- figure-ref-v6:start:rl-45-figure-3 -->
<span id="rl-45-figure-3"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/45-td3-bc-figure-3-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/45-td3-bc-figure-3-full.png" width="1800" height="450" alt="原论文Figure 3：这张图改为最后十次评估中的最差检查点偏差。它与前图分别测量时间上的波动和单次评估内部的波动，二者不能相加当作统一误差条。" loading="lazy"></a><figcaption>完整原图摘引｜Fujimoto与Gu，2021，Figure 3；2106.06860v2，HTML S4.F3。<a href="https://arxiv.org/html/2106.06860v2#S4.F3" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2106.06860#S4.F3" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：这张图改为最后十次评估中的最差检查点偏差。它与前图分别测量时间上的波动和单次评估内部的波动，二者不能相加当作统一误差条。
<!-- figure-ref-v6:end:rl-45-figure-3 -->

### 数据版本、AntMaze例外与两类评估波动

附录明确D4RL-v0与-v2差异会使DT对比失真，因此另在v2重跑；不能跨版本拼排行榜。AntMaze中状态规范化反而有害并被去掉，较大迷宫成绩很低。主表最后10次评估、5种子统计还要与单策略回合波动分开，简单基线也有明确适用范围。

## 五、平方距离与尺度归一化分别留下什么缺口

平方误差BC在多峰行为中可能输出从未出现的中间动作，也会限制改进上限。Q尺度归一化不消除所有奖励平移影响，α和评估选择仍有成本。D4RL强基线结果不能证明MSE足以替代所有支持约束。

### 五个前置概念

1. **行为克隆正则**：惩罚偏离数据动作。
2. **状态规范化**：统一输入尺度。
3. **延迟Actor**：继承TD3的更新频率。
4. **评价方差**：同一策略多次执行也可波动。
5. **极简基线**：用较少机制检验复杂方法必要性。

## 六、三个值得继续追问的问题与参考答案

<details>
<summary>1. 多峰动作分布为何会使MSE危险？</summary>

MSE 最优预测是条件均值；左右绕行等多峰动作的均值可能落在不可行或未见区域。TD3+BC 的Q项有机会推离该均值，但离线Critic也可能外推出错。应检验动作分布、模态覆盖和真实约束违规，并对比分布式行为模型或多候选方法，不能把BC距离小等同于动作位于数据支持内。

</details>

<details>
<summary>2. 奖励平移与缩放对λ有什么不同影响？</summary>

若所有Q被正数 $c$ 等比缩放，$\lambda=\alpha/\mathbb E|Q|$ 大致缩小为原来的 $1/c$，使 $\lambda Q$ 的尺度近似抵消。奖励平移则给Q加上与时域/终止相关的偏移，改变 $\mathbb E|Q|$ 却不一定相同比例改变动作梯度，因而BC与Q的相对权重会变。有限数据、终止差异和函数逼近又会破坏理想缩放关系。

</details>

<details>
<summary>3. 最佳检查点与末段平均会产生多大差异？</summary>

差异取决于检查次数、回报波动和选择方式，不能给通用数值。最佳点受向上选择偏差影响，末段平均描述稳定水平；同一策略的多回合波动与不同训练种子的波动也应分开。应按预定窗口对所有方法重算，并公开逐检查点轨迹；原文波动图不能直接转述成某个未计算的最终均值差。

</details>

## 七、沿未解决的问题继续读

- [IQL](46-iql.md)：若Actor已被BC约束，Q的后继目标是否仍需要查询Actor动作？IQL把这一步换成数据内V聚合，是后续价值学习改动，而不是继续给Actor加罚项。（后续替代路线）

- [Decision Transformer](44-decision-transformer.md)：完全不使用TD的条件序列模型，在统一数据版本后还有多少优势？Decision Transformer是同期平行对照，需把版本差异和RTG选择一并控制。（同期并行路线）

### 原文核对与路线出处

- [原论文与图表入口](https://arxiv.org/html/2106.06860)。目标与Q尺度式3—5；附录C.1—C.3数据版本及AntMaze。
- **本篇承接**：[TD3](31-td3.md)。Critic大体沿用，Actor加入BC且增加状态规范化。
- **并行路线**：[BCQ](37-bcq.md)。动作距离拉回与生成候选支持限制具有不同几何。
- **并行路线**：[Decision Transformer](44-decision-transformer.md)。同年代离线替代路线，比较需统一数据版本。


## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：Actor 同时最大化 Q 和拟合数据动作，有什么意义？

**参考答案**：最大化 Q 推动策略改进，行为克隆项限制它远离数据支持。两者共同作用，使策略既不完全照抄旧行为，也不任意追逐外推高值。它是一个简单但有明确作用的离线控制约束。

**问题 2**：为什么相同的损失权重在不同任务上可能含义不同？

**参考答案**：Q 值尺度受奖励影响，行为克隆误差受动作尺度影响。若一项量级远大于另一项，同一个系数会产生完全不同的约束强度。因此归一化、奖励与动作范围都是理解训练效果的重要条件。

[系列首页](README.md) · [上一篇](44-decision-transformer.md) · [下一篇](46-iql.md)
