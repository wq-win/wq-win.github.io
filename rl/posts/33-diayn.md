# 第 33 天｜DIAYN：没有任务奖励，能否先学会一组不同技能

[系列首页](README.md) · [上一篇](32-impala.md) · [下一篇](34-qmix.md)

**原论文与版本**：*Diversity is All You Need: Learning Skills without a Reward Function*，2018。[原论文](https://arxiv.org/abs/1802.06070)。

### 先接住前作的问题

[Options](07-options.md)组织给定技能，却不自动发现技能；[SAC](30-sac.md)提供最大熵策略优化器，也还需要奖励。DIAYN组合一个新的自监督奖励来源：抽取技能标签，要求行为到达的状态能让判别器猜回标签。

## 一、问题设定：没有任务奖励，怎样先学到可区分的行为

先不给“走路”或“跳跃”的人工标签，而给策略一个随机抽到的技能编号。不同编号应产生可区分状态，同一编号又应保留行动多样性。关键不只是让判别器准确，而是避免技能采样坍缩，并检查这些可区分行为是否对下游任务有用。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 无监督技能发现、目标为技能变量z的最大熵RL |
| 状态／观测 | 环境状态s与技能ID z |
| 动作 | 条件随机策略π(a|s,z) |
| 奖励或学习信号 | log判别概率减log技能先验 |
| 终止／边界 | 通常一个回合固定技能；环境终止另处理 |

## 二、以技能后验相对先验的信息构造奖励

DIAYN把技能z当成自采样的隐标签。固定先验抽z，策略在环境中行动，判别器从状态猜回z；策略得到log q(z|s)−log p(z)奖励。它鼓励不同技能产生可区分的状态分布，而不是让人手工命名“走路”“跳跃”。

信息论直觉是提高状态与技能的互信息，同时保留动作熵。只追求可辨识会偏好很确定的动作；熵则让同一技能保有多种实现。先验固定可避免容易学会的技能被越抽越多、其他技能失去训练机会。

可辨识性也取决于判别器看哪些状态分量。若只看身体朝向，它可能学到原地转向而非远距离移动；改变输入其实加入了任务偏好。因此无外部奖励不等于完全无设计，也不保证技能对所有下游目标有用。

### 由互信息下界得到两个对数之差

$$r_z(s)=\log q_\phi(z|s)-\log p(z).$$
策略最大化该伪奖励与动作熵；判别器最大化正确技能标签的log概率。z来自自采样，所以无需人工技能标签。

**为什么是两个对数之差**：互信息可写成 $I(S;Z)=\mathbb E[\log p(z\mid s)-\log p(z)]$：看过状态后，对技能的判断应比先验更有把握。真实后验算不出，用可训练判别器 $q_\phi$ 替换它；二者期望之差是非负的后验KL，所以得到互信息下界，而不是任意发明的奖励。$\phi$ 只表示判别器参数；技能策略还另加条件动作熵。固定均匀先验使 $-\log p(z)$ 成为常数，但保留它可看出奖励是在衡量相对先验的信息增益。见[原文§3.1—3.2](https://arxiv.org/html/1802.06070v6#S3.SS1)。

### 判别器奖励衡量相对先验的改善

若某技能先验本来为0.8，看到状态后仍猜0.8，两个log之差就是0；只有后验判断超过先验才产生正信息奖励。高分类置信度本身不等于从状态学到了新信息。

### 比较四技能先验与判别后验的奖励

以下是可手算的教学构造，不是论文实验。

四个技能均匀先验p(z)=0.25。某状态判别器给实际技能概率0.8，伪奖励为$\log(0.8/0.25)=\log3.2\approx1.163$；若只猜到0.25，奖励0。

假如四个技能都学会相同姿势，判别器再复杂也不能可靠区分，期望奖励不会凭空变大。反之，只靠位置编码差异可区分，也未必形成我们想要的运动技能。

## 三、固定技能先验并联合训练判别器与策略


```text
固定技能先验p(z)
每回合抽z，并以π(a|s,z)交互
保存(s,a,s_next,z)到replay
抽batch：
  判别器拟合从s预测z
  计算r_z=logq(z|s)-logp(z)
  用最大熵Actor–Critic更新条件策略
评价：看技能覆盖，并单独测试下游任务
输出：技能库，不是已完成所有任务的单一策略
```

**实现要点**：可辨识不等于有用，技能选择与实际任务还需额外学习。

## 四、读有效技能数与下游失败案例

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | 导航、MuJoCo技能、迁移／层级用途 |
| 数据来源与规模 | 无任务奖励在线经验 |
| 对比基线 | 不同技能先验／熵等配置与原文方法 |
| 训练预算与资源 | 完整任务训练步数本文未逐项核实 |
| 指标及其含义 | 技能可区分性、多样行为、下游回报 |
| 随机性与不确定性 | 附录部分任务5种子，不能推广到全篇所有图 |
| 实际验证的假设 | 可辨识性与熵能否产生多样技能 |

**实验解读（本文分析）**：[图4](#rl-33-figure-4)用exp(H[Z])衡量有效采样技能数，比较固定与可学习先验，支持避免采样坍缩的设计。下游“DIAYN+prior”让判别器仅看特定状态函数，属于额外先验，应单独标注。[图9](#rl-33-figure-9)还展示手倒立模仿失败，提醒读者多样技能库并非覆盖任意行为。

### 把固定先验收益与人工状态选择分开

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-33-figure-4 -->
<span id="rl-33-figure-4"></span>

<p class="figure-source-links">原引用定位：<a href="https://arxiv.org/html/1802.06070#S4.F4" target="_blank" rel="noopener noreferrer">原文</a>。</p>
<!-- figure-ref-v6:end:rl-33-figure-4 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/33-diayn-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/33-diayn-figure-4.png" width="1800" height="768" alt="DIAYN固定技能先验与VIC在HalfCheetah上保持的技能数量" loading="lazy"></a><figcaption>原论文图形摘引；Eysenbach等，2018/2019，Figure 4；原HTML图形。<a href="https://arxiv.org/html/1802.06070v6#S4.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>


图4横轴是训练墙钟小时，纵轴是由先验熵计算的有效技能数 $\exp(H[Z])$，使用对数刻度。五条蓝线代表VIC的五次随机运行，橙虚线对应DIAYN固定先验；这里不是五种不同技能的成功率。先验熵降低意味着训练越来越少抽到某些技能，不能据曲线独自判断保留下来的动作在物理上有多不同。

<!-- inline-evidence-v2:end -->


[图1](#rl-33-figure-1)是判别器与技能策略交替更新的算法，[图2](#rl-33-figure-2)和[图3](#rl-33-figure-3)展示导航轨迹与运动技能，提供多样性线索但不替代覆盖统计。[图4](#rl-33-figure-4)对比固定和可学习先验，关注训练是否仍采样全部技能；橙色虚线维持全部技能的采样，蓝色五次运行显示可学习先验减少采样的技能数；维持先验数量是采样协议的性质，不能单凭它证明每项技能都有效且不同。它支持防止技能塌缩的动机，不证明均匀先验在任何下游任务都最高效。[图9](#rl-33-figure-9)的专家模仿还包括失败的handstand，说明可辨识技能并不保证覆盖所有所需动作。 [查看原文](https://arxiv.org/html/1802.06070)。

<!-- figure-ref-v6:start:rl-33-figure-9 -->
<span id="rl-33-figure-9"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/33-diayn-figure-9-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/33-diayn-figure-9-full.png" width="1187" height="390" alt="原论文Figure 9：上排专家动作与下排技能模仿逐列对应，最后一列红框是倒立失败；不能只保留前三列成功例子。" loading="lazy"></a><figcaption>完整原图摘引｜Eysenbach等，2018/2019，Figure 9；1802.06070v6，HTML S4.F9。<a href="https://arxiv.org/html/1802.06070v6#S4.F9" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1802.06070#S4.F9" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：上排专家动作与下排技能模仿逐列对应，最后一列红框是倒立失败；不能只保留前三列成功例子。
<!-- figure-ref-v6:end:rl-33-figure-9 -->

<!-- figure-ref-v6:start:rl-33-figure-1 -->
<span id="rl-33-figure-1"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/33-diayn-figure-1-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/33-diayn-figure-1-full.png" width="1596" height="460" alt="原论文Figure 1：左侧是技能、环境与判别器的信息流，右侧保留同图中的完整Algorithm 1。固定先验抽样与判别器奖励分别对应防坍缩和可区分性。" loading="lazy"></a><figcaption>完整原图摘引｜Eysenbach等，2018/2019，Figure 1；1802.06070v6，PDF第3页。<a href="https://arxiv.org/pdf/1802.06070v6#page=3" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1802.06070#S3.F1" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：左侧是技能、环境与判别器的信息流，右侧保留同图中的完整Algorithm 1。固定先验抽样与判别器奖励分别对应防坍缩和可区分性。
<!-- figure-ref-v6:end:rl-33-figure-1 -->

<!-- figure-ref-v6:start:rl-33-figure-2 -->
<span id="rl-33-figure-2"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/33-diayn-figure-2-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/33-diayn-figure-2-full.png" width="1800" height="586" alt="原论文Figure 2：从左到右依次为(a)二维导航、(b)可在之后区分的重叠技能、(c)训练中的奖励分布。轨迹颜色表示技能身份，右列奖励分布才随训练变化。" loading="lazy"></a><figcaption>完整原图摘引｜Eysenbach等，2018/2019，Figure 2；1802.06070v6，HTML S4.F2。<a href="https://arxiv.org/html/1802.06070v6#S4.F2" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1802.06070#S4.F2" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：从左到右依次为(a)二维导航、(b)可在之后区分的重叠技能、(c)训练中的奖励分布。轨迹颜色表示技能身份，右列奖励分布才随训练变化。
<!-- figure-ref-v6:end:rl-33-figure-2 -->

<!-- figure-ref-v6:start:rl-33-figure-3 -->
<span id="rl-33-figure-3"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/33-diayn-figure-3-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/33-diayn-figure-3-full.png" width="2000" height="949" alt="原论文Figure 3：同一行中的连续姿态展示运动技能的时间变化；这些无任务奖励学出的行为是定性样例，不能由姿态数量反推任务覆盖率。" loading="lazy"></a><figcaption>完整原图摘引｜Eysenbach等，2018/2019，Figure 3；1802.06070v6，HTML S4.F3。<a href="https://arxiv.org/html/1802.06070v6#S4.F3" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1802.06070#S4.F3" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：同一行中的连续姿态展示运动技能的时间变化；这些无任务奖励学出的行为是定性样例，不能由姿态数量反推任务覆盖率。
<!-- figure-ref-v6:end:rl-33-figure-3 -->

## 五、可辨识技能不一定是有用技能

可辨识性受判别器输入设计影响，可能只形成无用的位置差异。下游仍需训练技能选择器，它的数据与计算预算必须另计；多样技能示例不等于任意任务的现成控制器。

### 五个前置概念

1. **技能变量**：索引一类条件行为的隐变量。
2. **互信息**：两个变量可预测彼此的程度。
3. **判别器**：从状态识别执行的技能。
4. **先验**：技能采样频率分布。
5. **技能坍缩**：多个技能变成相同或只剩少数有效技能。

## 六、继续追问：先验、状态特征与下游选择

<details>
<summary>1. 只观察位置和观察全状态会发现不同技能吗？</summary>

会。判别器只能奖励它看得见的技能差别：只看位置会鼓励到达不同区域，而忽略姿态或动作节律；看全状态可能按速度、姿态等容易区分的维度分化，而不产生空间覆盖。应明确判别器与策略各自观测的变量，比较状态覆盖和下游任务可用性；“互信息更高”始终相对于所选表示而言。

</details>

<details>
<summary>2. 如何测量技能对未知任务的真实帮助？</summary>

预先留出未参与技能发现的下游奖励和环境变化，固定技能预训练预算，再比较随机初始化、其他预训练和技能初始化/层级选择的学习曲线。把预训练成本计入总成本，并检验失败任务，才能判断真实迁移。只展示几段多样视频或从大量技能里挑一个高分者，会漏掉技能选择成本和选择偏差。

</details>

<details>
<summary>3. 固定均匀先验是否浪费困难技能的预算？</summary>

固定均匀先验防止训练把概率集中到少数容易区分技能，保护多样性，但确实可能把预算分给暂时无用或难学技能。是否浪费取决于下游任务分布与希望覆盖的行为类。可在不让技能概率塌缩的下限约束下尝试课程调度，并比较有效技能数、覆盖、下游收益与总样本；不能单凭当前任务回报决定无监督技能的价值。

</details>

## 七、把学得技能接回层级控制条件

- **层级控制的教学联系**：[Options](07-options.md)。潜变量技能可作为素材，但还要定义调用集合、终止与上层选择，才能成为完整option。
- **优化模块组合**：[SAC](30-sac.md)。最大熵算法训练技能策略，判别器提供任务替代奖励，两种目标的尺度仍需一致。

- [原论文与图表入口](https://arxiv.org/html/1802.06070)。信息目标与伪奖励；§4[图4](#rl-33-figure-4)、下游先验及[图9](#rl-33-figure-9)。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：没有任务奖励，技能之间怎么产生差异？

**参考答案**：技能变量作为策略条件，判别器尝试从访问状态识别技能。策略获得“让自己的技能容易被辨认”的奖励，同时保留一定动作随机性。不同技能因而倾向访问不同状态区域。

**问题 2**：能辨认出技能，是否就说明技能有用？

**参考答案**：不一定。两个技能可能只是分别在房间左右原地晃动，容易区分，却不能完成开门任务。技能的可辨识性与下游用途是不同目标，还需要技能选择、组合或任务微调来建立联系。

[系列首页](README.md) · [上一篇](32-impala.md) · [下一篇](34-qmix.md)
