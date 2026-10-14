# 第 46 天｜IQL：不查询数据外动作，也能向更好价值学习

[系列首页](README.md) · [上一篇](45-td3-bc.md) · [下一篇](47-instructgpt.md)

**原论文与版本**：Kostrikov、Nair、Levine，*Offline Reinforcement Learning with Implicit Q-Learning*，2021／2022。[正文](https://arxiv.org/html/2110.06169v1)。

### 先接住前作的问题

[第42天 CQL](42-cql.md)压低数据外的乐观Q，[第45天 TD3+BC](45-td3-bc.md)限制Actor远离数据，但价值目标仍可能需要评价新动作。IQL把问题推进到目标内部：不查询这些动作，能否仍向数据中更好的行为传播价值？它还与[AWAC](43-awac.md)共享优势加权提取接口；这是模块层面的联系，不能据此认定两者的Critic相同。

## 一、问题设定：不查询数据外动作怎样继续改进价值

离线数据已经给出了状态、动作、奖励和后继状态。我们希望在这些证据内改进策略，同时避免通过max或Actor生成一个没有数据支持的动作，再让Q为它背书。

IQL将“找较好的数据动作价值”与“生成可执行动作”拆开：前者由expectile价值回归和TD完成，后者随后通过加权行为回归提取。这里能否组合数据中的好片段，是比训练误差下降更关键的检验；部署Actor是否留在支持内则是另一个问题。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 离线、隐式价值改进，可接在线微调 |
| 状态／观测 | 离线状态 |
| 动作 | 训练Q只使用数据动作；策略另提取 |
| 奖励或学习信号 | 数据奖励 |
| 终止／边界 | 终止后V项为零 |

## 二、先聚合动作Q，再传播V，最后提取策略

IQL将离线改进拆成三个互相咬合的回归问题。先固定目标Q，在同一状态的数据动作分布下拟合高expectile的V：正残差 $Q-V>0$ 的平方误差乘以τ，负残差乘以1−τ。令导数为零，可得 $\tau E[(Q-V)_+]=(1-\tau)E[(V-Q)_+]$；τ增大意味着V向高Q动作偏移，而非把环境转移的好运气当成可选动作。

第二步仍对真实转移取期望：Q回归到 $r+\gamma V(s')$，其中s′来自数据。关键顺序是先在动作价值之间做非对称聚合，再做普通Bellman回归；若直接对随机样本回报做高expectile，就会把不可控制的结果噪声一起乐观化。整个价值训练不需要让Actor提出数据外动作供Q打分。

第三步才提取Actor，以 $\exp(\beta[Q(s,a)-V(s)])$ 加权数据动作的对数似然。τ控制隐式价值改进，β控制模仿权重的集中程度，两者不是同一个温度。

### expectile的对象必须是动作Q

$$L_V=E[|\tau-\mathbf1_{u<0}|u^2],\ u=Q_{target}(s,a)-V(s);\quad L_Q=E(Q-[r+\gamma V(s')])^2.$$
Actor最小化 $-E[e^{\beta(Q-V)}\log\pi(a|s)]$。Expectile是不对称平方损失，不是quantile分位数损失。

### 所有数据动作Q相同时，τ不能创造改进空间

若同一状态的所有数据动作Q都等于c，任意0<τ<1的expectile最优值仍是c。调大τ只能偏向已有Q差异，不能从相同估值里创造更好的动作；这是检查V回归实现的一个退化输入。

### 两个动作的expectile与幸运回报反例

以下是可手算的教学构造，不是论文实验。

同一状态等概率记录两个动作，目标Q分别为1、3，取τ=0.8。平衡式为0.8(3−V)=0.2(V−1)，故V=2.6，而不是均值2或80%分位数3。

若β=1，两个数据动作的权重为 $e^{-1.6}$ 与 $e^{0.4}$，比例为 $e^2$，归一化后好动作约占88.1%。V在这个单状态的归一化比值中抵消，但会影响下一轮Q的TD目标和跨状态权重尺度。

再看只有一个动作、随机得到0或10的状态。该动作期望价值是5，不存在可选择的“总能得10”动作；对即时回报直接取高expectile会给出8。这个反例说明IQL为何把expectile放在Q的动作差异上，而不是任意回报样本上。

## 三、冻结回归目标并把三个更新接口分开

`stop_gradient` 表示停止向目标量传播梯度。

```text
从固定D抽转移
用数据动作的目标Q拟合V的expectile损失
用r+γ*(1-done)*V(s_next)构造冻结Q目标
更新Q并软更新目标Q
提取策略：
  A←stop_gradient(Q_target(s,a)-V(s))
  weight←受数值保护／截断的exp(βA)
  最大化weight*logπ(a|s)
价值学习与策略提取可分阶段或并行
输出：隐式改进后的策略
```

## 四、读AntMaze的τ消融：价值如何沿数据路径传播

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | D4RL运动、迷宫、操作与在线微调 |
| 数据来源与规模 | 固定不同质量数据；微调额外在线经验 |
| 对比基线 | CQL等离线方法、BC／相关策略提取 |
| 训练预算与资源 | 具体预算见§5，本文未逐项核实 |
| 指标及其含义 | 归一化回报与微调曲线 |
| 随机性与不确定性 | 完整种子及区间本文未核实 |
| 实际验证的假设 | 避免OOD价值查询是否仍能组合数据内好行为 |

### 图3：τ改变的是离线更新表现

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-46-figure-3 -->
<span id="rl-46-figure-3"></span>
<!-- figure-ref-v6:end:rl-46-figure-3 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/46-iql-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/46-iql-figure-3.png" width="1600" height="1197" alt="IQL改变expectile系数τ后在四项AntMaze任务中的回报" loading="lazy"></a><figcaption>原论文图形摘引；Kostrikov、Nair与Levine，2021/2022，Figure 3；原HTML图形。<a href="https://arxiv.org/html/2110.06169v1#S5.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>


四个面板把迷宫大小（medium/large）与数据类型（play/diverse）交叉展开，纵轴在图中标为Episode Return，横轴Gradient Steps以百万次更新为单位。因此蓝线较高回答的是相同离线更新进度下的控制表现，不能说它用这些步数新采集了成功路径。三种颜色只改变所测 $\tau$；本文前面的 $\beta$ 是Actor提取参数，不能把这张图当作两者联合调参结果。

<!-- inline-evidence-v2:end -->

[图1](#rl-46-figure-1)将非对称平方损失与expectile位置对应。上面的图3中τ=0.9蓝线高于τ=0.5/0.7，但大迷宫回报仍较低：这一消融支持所测数据上的偏向作用，不是τ越接近1越好。

<!-- figure-ref-v6:start:rl-46-figure-1 -->
<span id="rl-46-figure-1"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/46-iql-figure-1-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/46-iql-figure-1-full.png" width="1800" height="586" alt="原论文Figure 1：从左到右为非对称平方损失、正态分布的expectile和条件expectile拟合。提高τ增大正残差权重，不等于取分位数或精确最大值。" loading="lazy"></a><figcaption>完整原图摘引｜Kostrikov、Nair与Levine，2021/2022，Figure 1；2110.06169v1，HTML S4.F1。<a href="https://arxiv.org/html/2110.06169v1#S4.F1" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/2110.06169v1#S4.F1" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：从左到右为非对称平方损失、正态分布的expectile和条件expectile拟合。提高τ增大正残差权重，不等于取分位数或精确最大值。
<!-- figure-ref-v6:end:rl-46-figure-1 -->

### toy maze的拼接证据与在线微调预算

§5的toy maze[图2](#rl-46-figure-2)比较价值传播：仅一次策略评价在次优数据上迅速衰减，较高τ的IQL能沿数据覆盖的路径传播较优价值。这检验的是多步组合能力，不是对未覆盖路径的发现。D4RL离线结果与后续在线微调应分开读，微调曲线已经使用新增交互；本文未逐个复核所有任务的种子和预算。

<!-- figure-ref-v6:start:rl-46-figure-2 -->
<span id="rl-46-figure-2"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/46-iql-figure-2-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/46-iql-figure-2-full.png" width="1800" height="1629" alt="原论文Figure 2：四块从左到右、从上到下是(a)迷宫、(b)真实最优价值、(c)单步策略评价、(d)IQL。共用色标表示价值；IQL更好传播高价值不意味着数据之外动作得到可靠评价。" loading="lazy"></a><figcaption>完整原图摘引｜Kostrikov、Nair与Levine，2021/2022，Figure 2；2110.06169v1，HTML S5.F2。<a href="https://arxiv.org/html/2110.06169v1#S5.F2" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/2110.06169v1#S5.F2" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：四块从左到右、从上到下是(a)迷宫、(b)真实最优价值、(c)单步策略评价、(d)IQL。共用色标表示价值；IQL更好传播高价值不意味着数据之外动作得到可靠评价。
<!-- figure-ref-v6:end:rl-46-figure-2 -->

## 五、支持内价值改进不等于支持内动作输出

理想价值阶段的数据支持条件不能保证连续Actor部署时不插值到支持之外。τ过高可能放大错误Q，β过高会让少数样本支配策略；完全缺失的行为也无法恢复。本篇Implicit Q-Learning与多智能体Independent Q-Learning同缩写而不同方法。

### 五个前置概念

1. **Expectile**：不对称平方回归的最优点。
2. **Quantile**：由概率质量定义的分位数。
3. **隐式改进**：不显式枚举新动作进行max。
4. **策略提取**：从学到价值形成可执行策略。
5. **支持内最优**：只在数据允许范围内谈最优。

## 六、三个值得继续追问的问题与参考答案

<details>
<summary>1. 为什么expectile必须放在动作Q而非任意随机回报上？</summary>

IQL 要在给定状态下偏向数据支持内价值较高的动作，故对经过期望评价的 $Q(s,a)$ 做 expectile。若直接对包含转移噪声的单次回报取高expectile，就可能偏向同一动作的幸运结果，把环境随机性当成可选行动优势。关键并非任何回报都不能做expectile，而是其统计对象决定优化的是动作选择还是风险偏好，不能混同原IQL保证。

</details>

<details>
<summary>2. τ和β分别控制哪个环节？</summary>

$\tau$ 决定V对数据动作Q的上侧偏重程度，影响价值传播与数据内改进；Actor的指数优势温度决定如何从这些价值提取策略。若权重写成 $e^{\beta A}$，较大 $\beta$ 更偏向高优势；若写成 $e^{A/\beta}$，方向相反，必须先核对记号。二者作用环节不同，不能把同时调节造成的收益归给单一“更贪心”。

</details>

<details>
<summary>3. 不查OOD动作为什么不等于绝不输出OOD动作？</summary>

评价阶段只查数据动作避免了某类自举外推，但Actor仍是函数逼近模型，对有限样本做加权回归后可能在训练状态之间或新状态输出未见动作，连续动作的均值也可能落在模态间。IQL没有逐动作硬支持投影。应区分“Critic目标不查询OOD动作”与“部署策略绝不生成OOD动作”，并另测策略覆盖和真实表现。

</details>

## 七、沿未解决的问题继续读

- [Decision Transformer](44-decision-transformer.md)：没有完整好轨迹时，数据片段怎样连接？回看Decision Transformer的条件序列路线，可与IQL的Bellman传播对照；它更早出现，并不是IQL的后继。（早期平行路线回看）

- [AWAC](43-awac.md)：加入在线经验后，收益来自价值目标还是新分布的Actor拟合？回看AWAC可锁定共同的优势加权接口，再比较不同Critic，是模块对照而非历史后继。（早期模块对照）

- [系列收尾](61-系列收尾.md)：价值训练避开陌生动作后，部署策略外推还应怎样单独验证？收尾篇继续用信息权限、支持与评价账本整理这一缺口，是教学收束，不声称已有直接后继算法。

### 原文核对与路线出处

- [原论文与图表入口](https://arxiv.org/html/2110.06169v1)。方法中的expectile三步更新、理论条件及§5[图2](#rl-46-figure-2) toy maze解释。
- **并行路线**：[CQL](42-cql.md)。CQL惩罚数据外高估，IQL从价值更新中避开这一类动作查询。
- **并行路线**：[TD3+BC](45-td3-bc.md)。都用数据约束Actor，但IQL不让Actor参与Q的下一动作目标。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：不对数据外动作取最大值，IQL 怎样找到更好的行为？

**参考答案**：先用非对称平方损失做 expectile 回归，让 V 偏向数据动作中较高的 Q；再以实际下一状态的 V 构造 Q 目标；最后通过优势加权行为克隆提取策略。改进主要发生在数据支持的行为之间。

**问题 2**：IQL 是否保证部署动作一定来自数据集？

**参考答案**：不保证。价值训练避免某类数据外动作查询，不等于参数化 Actor 的输出受硬支持约束。函数拟合可能插值到数据之外，也可能丢失多峰结构。完全没有好行为的数据，仍然限制可获得的策略。

[系列首页](README.md) · [上一篇](45-td3-bc.md) · [下一篇](47-instructgpt.md)
