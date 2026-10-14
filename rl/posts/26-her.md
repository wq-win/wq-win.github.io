# 第 26 天｜HER：失败轨迹也能成为另一个目标的成功经验

[系列首页](README.md) · [上一篇](25-maddpg.md) · [下一篇](27-ppo.md)

**原论文与版本**：*Hindsight Experience Replay*，2017。[原论文](https://arxiv.org/abs/1707.01495)。

### 先接住前作的问题

[DDPG](17-ddpg.md)能复用旧转移，[PER](19-per.md)能重新分配重读次数，但稀疏目标任务中反复读失败奖励仍可能缺少信号。HER改变的是经验按哪个目标解释：同一转移若在另一目标下成功，就重新计算对应奖励并训练目标条件策略。

## 一、问题设定：没到原目标的轨迹，能否支持另一个真实训练问题

机械臂没把物体推到指定位置，却确实推到了另一个位置。只要目标不改变物理转移，这次经历就能回答“怎样到达那个已达到的位置”。HER的价值来自真实转移的新任务解释，而不是把失败事实改成原任务成功。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 目标条件、off-policy、机器人控制 |
| 状态／观测 | 状态s与期望目标g，另记录已达目标 |
| 动作 | 机械臂连续动作 |
| 奖励或学习信号 | 根据实际到达位置与目标重算稀疏奖励 |
| 终止／边界 | 终止逻辑若依赖目标也需同步重算 |

## 二、保持物理转移并一致重标目标相关量

目标条件价值写成Q(s,a,g)。如果目标g只改变奖励与成功判定，不改变物理转移，那么同一条(s,a,s′)也能用于别的g′。HER据此重标目标并重新计算奖励，让“没有到达原目标”变成“确实到达另一个目标”的有效训练事实。

重标的不只是一个成功标签。Actor和Critic的目标输入、奖励函数，以及任务定义中受目标影响的终止逻辑都要一致。future策略从本回合之后达到的状态取目标，形成与当前能力接近的练习分布；太多重标经验也可能挤掉真正任务分布。

这里还有因果条件：若g会改变环境动力学，原转移不再适用；若随机结果被事后挑选作为目标，条件化可能带来选择偏差。HER在确定性机器人任务上的好结果，不能直接推出所有随机目标MDP中的无偏性。

### 让新目标进入奖励、终止和全部网络输入

$$g'\leftarrow achieved(s_k),\quad r'=r(s,a,s',g'),\quad Q(s,a,g')\gets TD\ update.$$
只替换g不替换r会产生错误数据；策略与Critic输入都应包含g。

以文中的目标条件DDPG为例，重标后一次完整目标应写成

$$y_{g'}=r'+\gamma(1-d')Q_{\bar\phi}\!\left(s',\mu_{\bar\theta}(s',g'),g'\right),\qquad L_Q=\left(Q_\phi(s,a,g')-\operatorname{sg}(y_{g'})\right)^2.$$

$g'$ 同时进入当前Q、后继Actor和后继Q；$r'$ 与依任务而定的 $d'$ 也须对应新目标。上横线是慢更新目标网络，sg表示停止梯度。由[HER Algorithm 1](https://arxiv.org/pdf/1707.01495#page=3)的重标接口接到底层TD更新，就能看出只改输入目标、漏改任何一个目标相关量为何会产生互相矛盾的训练信号。

### 重标改变条件任务而不改变转移事实

在合法重标条件下，同一 $(s,a,s')$ 被配上不同g，形成不同条件输入。它们不是新的独立物理试验，统计不确定性不能把每个重标目标都当新增环境样本。

### 检验只改目标却保留旧奖励的矛盾

以下是可手算的教学构造，不是论文实验。

原目标g=5，转移位置2→3，奖励定义为达到目标得0，否则−1。原经验奖励−1；取g′=3后，同一转移奖励变0。若只把输入目标改成3却保留−1，便教模型“达到3也失败”，数据自相矛盾。

重标仍不能证明智能体会到达5。它只是先学会从2到3的目标条件行为，再靠覆盖与泛化帮助其他目标。

## 三、从回合未来状态选目标并重算TD标签


```text
输入：目标条件Actor／Critic与目标奖励函数
每回合按目标g收集完整轨迹
对每个真实转移：
  保存原(s,a,r,s_next,g)
  从本轨迹未来状态选择若干已达目标g_prime
  对每个g_prime：
    r_prime←重新计算奖励
    done_prime←若终止依赖目标则重算
    保存重标转移
从混合replay训练底层off-policy算法
评价时使用原始指定目标
```

**实现要点**：必须能合法重算目标奖励，随机环境重标可能引入偏差。

## 四、一起读成功率、重标数量与真实试验规模

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | bit-flipping与机器人推／滑／抓取 |
| 数据来源与规模 | 真实交互轨迹及重标副本 |
| 对比基线 | DDPG无HER、稀疏／稠密奖励与重标策略 |
| 训练预算与资源 | 重标增加训练样本但不增加真实环境步数 |
| 指标及其含义 | 原指定目标成功率 |
| 随机性与不确定性 | [图3](#rl-26-figure-3)为5种子均值±1标准差；真机5次试验，不能推成可靠性保证 |
| 实际验证的假设 | 重用失败是否提高稀疏目标学习 |

**实验解读（本文分析）**：[图3](#rl-26-figure-3)平均5种子，阴影为1个标准差；每epoch为800回合、每回合50步。[图6](#rl-26-figure-6)同时给最佳epoch和全训练平均成功率，future的4或8个额外目标表现较好，更多不总更好。真机仅5次试验的5/5是小样本演示，不能写成已证明100%可靠。

<!-- figure-ref-v6:start:rl-26-figure-6 -->
<figure class="reading-evidence-figure" id="rl-26-figure-6"><a href="/rl/assets/reference-v6/26-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/26-figure-6.png" width="990" height="708" alt="上排是训练中最高成功率，下排是整个训练期平均成功率；横轴是每条转移附加的目标数。future在不少设置更好，但k增大并非严格单调改善，不能只看峰值行。" loading="lazy"></a><figcaption>原论文图形摘引｜Andrychowicz等，2017，图6，PDF第9页。<a href="https://arxiv.org/pdf/1707.01495v3#page=9" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

上排是训练中最高成功率，下排是整个训练期平均成功率；横轴是每条转移附加的目标数。future在不少设置更好，但k增大并非严格单调改善，不能只看峰值行。
<!-- figure-ref-v6:end:rl-26-figure-6 -->

### 比较最佳epoch与全程平均成功率

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-26-figure-3 -->
<span id="rl-26-figure-3"></span>
<!-- figure-ref-v6:end:anchor-rl-26-figure-3 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/26-her-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/26-her-figure-3.png" width="1032" height="384" alt="HER多目标任务在pushing、sliding和pick-and-place中的成功率学习曲线" loading="lazy"></a><figcaption>原论文图形摘引；Andrychowicz等，2017，Figure 3, PDF第7页；仅图形区域。<a href="https://arxiv.org/pdf/1707.01495#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

横轴为训练epoch，图注明确每个epoch对应800个、各50步的回合；纵轴是预先指定目标的成功率，越高越好。蓝线是DDPG+HER，红线是§4.5中改进重标设置的版本，绿线是计数探索对照，虚线为DDPG。红蓝差异属于HER内部采样配置，不能全算成“有HER对无HER”的收益；也不能用训练重标后天然成功的比例代替这个测试成功率。


<!-- inline-evidence-v2:end -->


[图3](#rl-26-figure-3)给出多目标机器人任务学习曲线，成功按物体与目标终点距离判定；[图4](#rl-26-figure-4)才是§4.3的单目标实验，不能把两者混写。[图6](#rl-26-figure-6)上排取训练期最高成功率、下排取训练期平均成功率，对比future等重标策略时应看同一排，并保留额外目标个数。原始奖励和终止能够合法重算是这些经验可复用的前提，真机[图7](#rl-26-figure-7)演示不构成任意目标或随机环境都无偏的证明。 [查看原文](https://arxiv.org/pdf/1707.01495)。

<!-- figure-ref-v6:start:rl-26-figure-7 -->
<figure class="reading-evidence-figure" id="rl-26-figure-7"><a href="/rl/assets/reference-v6/26-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/26-figure-7.png" width="1413" height="204" alt="四帧显示策略在真实机械臂上的抓放过程，是部署演示而非成功率曲线；它本身没有提供重复试验次数、置信区间或跨物体泛化证据。" loading="lazy"></a><figcaption>原论文图形摘引｜Andrychowicz等，2017，图7，PDF第10页。<a href="https://arxiv.org/pdf/1707.01495v3#page=10" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

四帧显示策略在真实机械臂上的抓放过程，是部署演示而非成功率曲线；它本身没有提供重复试验次数、置信区间或跨物体泛化证据。
<!-- figure-ref-v6:end:rl-26-figure-7 -->

<!-- figure-ref-v6:start:rl-26-figure-4 -->
<figure class="reading-evidence-figure" id="rl-26-figure-4"><a href="/rl/assets/reference-v6/26-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/26-figure-4.png" width="990" height="396" alt="三列仍是推、滑和抓放，但每个任务只有一个关心的目标。蓝色HER与绿色计数探索、红色DDPG在相同epoch轴上比较；滑动任务并未因此接近完全成功。" loading="lazy"></a><figcaption>原论文图形摘引｜Andrychowicz等，2017，图4，PDF第8页。<a href="https://arxiv.org/pdf/1707.01495v3#page=8" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

三列仍是推、滑和抓放，但每个任务只有一个关心的目标。蓝色HER与绿色计数探索、红色DDPG在相同epoch轴上比较；滑动任务并未因此接近完全成功。
<!-- figure-ref-v6:end:rl-26-figure-4 -->

## 五、重标成功不能替代原任务覆盖

future重标在随机动力学中可能把偶然达到的结果当成可控目标，不可逆任务也可能不适合这种复用。评估必须回到原目标分布，不能用重标后的成功率证明原任务能力。

### 五个前置概念

1. **目标条件策略**：动作还依赖期望目标。
2. **已达目标**：从实际状态提取的结果。
3. **重标**：为同一经验换训练条件。
4. **稀疏奖励**：大多数转移没有区分性反馈。
5. **Off-policy复用**：学习目标可不同于采样时行为。

### 继续追问：动力学、随机性与目标比例

<details>
<summary>1. 目标改变会改变终止或动力学时怎么办？</summary>

HER 要求记录转移在新目标下仍合法，且可重新计算奖励与终止。如果目标只改奖励，可以从原状态和动作重算；若目标改变动力学或约束，原转移一般不能直接重标。若目标改变终止，必须处理本应提前结束的轨迹、吸收状态和自举掩码，不能把原目标下的未来状态当成新目标下合法续集。

</details>

<details>
<summary>2. 为什么随机环境中的重标会带来选择偏差？</summary>

用实际到达的未来状态作目标，会把“碰巧发生了某个随机结果”作为选样条件；给定重标目标后，转移噪声分布不再等于真实环境在预先指定该目标时的分布。算法可能高估难以控制的偶然成功。确定性动力学弱化了这类选择偏差，但不解决所有覆盖问题；随机任务需显式校正或使用独立于结果的目标采样来验证。

</details>

<details>
<summary>3. 原目标成功率与重标成功率为何必须分开？</summary>

重标目标是依据已经发生的结果选择的，成功比例可以因选择规则而很高，却不表示策略能完成事先指定的任务。训练日志应记录重标池的目标分布与原始目标数据，最终以独立抽取、事先固定的目标评价成功率。否则把“我做到了什么”改写成“我本来想做什么”会让指标机械上升，而没有真实控制改进。

</details>

## 六、把重标语义与回放频率分别设计

- **回放模块组合**：[PER](19-per.md)。重标定义经验含义，优先级决定它被读多少次；组合时先保证标签一致，再讨论非均匀抽样偏差。
- **目标条件学习器**：[DDPG](17-ddpg.md)。HER把新经验交给离策略更新器，并没有替代Critic目标、慢网络和连续动作优化。

- [原论文与图表入口](https://arxiv.org/pdf/1707.01495)。Algorithm 1；§4.2多目标[图3](#rl-26-figure-3)、§4.3单目标[图4](#rl-26-figure-4)；§4.5[图6](#rl-26-figure-6)；§4.6真机试验。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：一次失败如何变成有用经验？

**参考答案**：把原目标替换为轨迹实际达到的目标，再依据新目标重新计算奖励。状态转移和动作可以重用，但任务条件与奖励发生变化。它使“没完成原目标”的经验仍能教会策略达到其他目标。

**问题 2**：为什么在随机环境中，目标重标可能引入偏差？

**参考答案**：重标目标来自已观察到的结果，相当于根据结果筛选样本。若达到某状态部分源于偶然噪声，训练可能过度相信动作可以稳定实现它。还要求目标变化不会破坏原转移的合法性，并能够正确重算奖励。

[系列首页](README.md) · [上一篇](25-maddpg.md) · [下一篇](27-ppo.md)
