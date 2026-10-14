# 039｜AWAC：示范预热后的在线策略改进

[系列首页](README.md) · [上一篇](038-cql.md) · [下一篇](040-transporter.md)

**原论文**：*AWAC: Accelerating Online Reinforcement Learning with Offline Datasets*，Ashvin Nair 等，首次公开于2020；本文核对2021年的 arXiv v6。[论文](https://arxiv.org/abs/2006.09359)。

### 先接住前作的问题

[DAPG](023-dapg.md)以衰减专家梯度辅助在线学习，但真实日志不只有专家轨迹，也含不同质量的旧尝试。AWAC按估计优势给每个数据动作加权，追问怎样从离线起点平稳接到新交互，而不被固定模仿约束困住。

## 一、问题设定：旧示范和新尝试怎样共同支持在线改进

机器人已经有一些示范和旧尝试，最实用的目标往往不是永远离线，而是先用旧数据建立起点，再通过少量新交互改善。普通强化学习可能在刚开始微调时把已有能力弄坏；过强的离线约束又可能使策略一直模仿旧数据。

离线阶段不能采集新数据，分布外高估容易累积。在线阶段重新允许探索，又不能让策略被旧行为分布永久束缚。AWAC 针对这两个阶段的衔接，而不是只追求离线最终分数。

旧数据可以包括示范、模仿策略产生的次优轨迹或随机探索。它们对学习的价值不同：成功示范帮助探索到奖励，失败轨迹帮助判断哪些动作无效。算法不要求每条轨迹都最优，但也不能从完全无覆盖的数据中凭空获得技能。

机器人实验横跨灵巧手、三指阀门操作和带钩末端的抽屉操作。它们主要使用状态输入，并有自动重置设施。因此“少量在线训练”背后包含可测状态、已配置奖励和重复回合条件。

与 DAPG 相比，AWAC 不只给策略梯度增加固定示范鼓励，而是通过离策略 critic 给经验动作动态打分。与 AWR 相比，其关键是 TD 学习当前策略的 Q，提高数据复用。与 CQL 相比，它主要修改 actor 的学习方式，而不是增加保守 Q 正则。

## 二、用TD评价动作再做优势加权回归

AWAC 用价值函数判断数据动作相对当前策略好不好，再按优势加权做动作最大似然学习。critic 用 TD 反复利用经验，actor 的更新则保持在数据动作附近。随着新经验进入池子，策略也能逐渐学习新的好动作。

### 1. critic 仍通过 Bellman 自举学习

$$
y=r+\gamma(1-d)\mathbb E_{a'\sim\pi(\cdot\mid s')}
Q_{\mathrm{target}}(s',a'),
\qquad
L_Q=\mathbb E_D[(Q(s,a)-y)^2].
$$

这里 $D$ 在离线阶段固定，在在线阶段持续加入新记录。数据动作并不需要来自当前策略，但下一状态价值按当前策略估计。

这使 AWAC 能重复利用同一批旧转移，而不是每更新一次就丢弃旧轨迹。它仍存在自举误差，所以 actor 不能毫无约束地追逐任意高 Q 动作。

### 2. 优势衡量“比当前通常动作好多少”

$$
A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s),\qquad
V^\pi(s)=\mathbb E_{a'\sim\pi}Q^\pi(s,a').
$$

同一个回报值在不同状态中意义不同。简单状态里得到五分可能普通，困难状态里得到五分却可能比当前策略好很多。优势提供相对参照。

实践中 $V^\pi$ 可用策略动作采样估计，不一定需要另训一个独立 V 网络。权重计算通常应与 actor 参数更新分开，避免 actor 通过改变用于打分的权重而绕开拟合数据动作的目标。

### 3. 从受约束改进得到权重

先考虑理想优化：最大化优势，同时限制新策略偏离数据行为分布。其非参数解具有：

$$
\pi^*(a\mid s)\propto
\pi_\beta(a\mid s)\exp(A^\pi(s,a)/\lambda).
$$

$\lambda$ 是温度。小温度突出少数高优势动作，大温度更接近普通模仿。

再把这个理想分布投影到参数化策略，得到核心更新：

$$
L_\pi(\theta)=
-\mathbb E_{(s,a)\sim D}
[w(s,a)\log\pi_\theta(a\mid s)],
\qquad
w=\exp(A^\pi(s,a)/\lambda).
$$

因为期望可以通过数据采样实现，不需要单独拟合 $\pi_\beta$ 的密度。这个设计在经验池不断变化时尤其有用：新数据一进入采样池，就能参与 actor 更新，不必先等待另一个行为模型追上分布。

但是推导里的精确按状态归一化分布，与有限批次上的加权回归存在近似。不能据此宣称实际神经网络每次更新都严格满足最初 KL 约束。

### 4. 为什么它不是“只模仿成功示范”

失败轨迹中的某个动作，也可能比当前策略更好；成功轨迹中某些动作则可能冗余。AWAC 依靠估计优势给每个状态动作加权，而非给整条轨迹贴上专家标签后永久全盘模仿。

随着在线策略探索出更好的动作，这些动作进入经验池，便成为新的学习对象。所以数据分布提供隐式约束，但其支持范围不是永远固定在初始示范。

温度、权重截断或归一化、经验采样比例应以对应实现版本为准。教学流程保留最关键区别：无需突然切换为另一套完全不同的优化目标。

对同一状态两个数据动作，若优势分别为0和2、温度 $\lambda=1$，理想相对权重为1与 $e^2$，归一化后约0.119和0.881。将该状态的全部Q加同一常数不改优势；但不同状态若使用未归一化权重，优势基线和批次组成仍会改变各状态贡献，有限样本回归不能简单等同逐状态精确KL投影。

更重要的是actor保守并未让critic只查询数据动作：其TD目标仍用当前策略下一动作。这是与后来IQL的实质差别。离线阶段曲线好、在线一开始骤降时，应检查价值自举与新旧数据比例，而不只重新训练行为密度模型。[原文离线到在线问题与策略约束](https://arxiv.org/html/2006.09359v6)

### 帮助建立理解

**自构例子，未运行**：抽屉旧数据里有慢而成功的拉动，也有快速但脱钩的尝试。若当前策略经常脱钩，成功慢拉动作可能获得较高优势，因此先被模仿。在线阶段找到更快又不脱钩的动作后，其优势更高，策略再逐渐转向它。

这说明 AWAC 不必永久保持示范速度，也不要求直接离开所有旧数据约束去盲目探索。可改进的范围随新经验增长。

## 三、先离线加权回归，再让新经验进入回放

Actor步应把已算好的优势权重当作监督权重。若$w=\exp(A/\lambda)$，更新$-w\log\pi_\theta(a\mid s)$时不把梯度穿回计算$A$的路径，否则会多出$-(\nabla_\theta w)\log\pi_\theta$，不再是这里推导的固定权重最大似然。Critic仍在它自己的TD步骤更新；“权重动态变化”指不同更新步重算，不是一次Actor反传中任意移动标签。

~~~text
输入旧数据 D；初始化经验池 B = D
初始化 actor、critic 与目标网络

离线预训练若干轮：
    从 B 抽转移
    用当前策略下一动作构造 TD 目标并更新 critic
    估计数据动作优势 A
    计算固定权重 exp(A / 温度)
    用加权动作对数似然更新 actor

在线阶段重复：
    执行 actor，收集真实反馈并加入 B
    从包含新旧数据的 B 采样
    继续相同的 critic 和 actor 更新
    以独立评估回合检查改善
~~~

## 四、分开离线预热成绩与新增交互收益

**原图怎么读：** [图3，原论文图注与图像](#paper-039-awac-figure-3)。时间零点之前已经做了离线训练；零点之后才开始在线交互。初期掉点与恢复速度应从这个交界处读，不能把较高起点理解成无需训练。


<!-- figure-ref-v6:start:b9c20881072a-anchor -->
<a id="paper-039-awac-figure-3"></a>
<!-- figure-ref-v6:end:b9c20881072a-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/039-awac-s3-f3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/039-awac-s3-f3.png" width="1804" height="1685" alt="AWAC: Accelerating Online Reinforcement Learning with Offline Datasets，图3：时间零点之前已经做了离线训练；零点之后才开始在线交互。初期掉点与恢复速度应从这个交界处读，不能把较高起点理解成无需训练。" loading="lazy"></a><figcaption>实验图原图摘引：Ashvin Nair 等，首次公开于2020，HTML S3.F3，图3。原图面板重新排版，数据未改。<a href="https://arxiv.org/html/2006.09359v6#S3.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 实验 | 数据与配置 | 希望验证 |
|---|---|---|
| HalfCheetah诊断 | 示范与模仿策略旧轨迹 | 预训练后微调为何掉点 |
| 仿真灵巧手 | 少量人类示范加更多次优轨迹 | 稀疏奖励下能否快速提升 |
| 随机推物数据 | 随机过程收集的旧轨迹 | 是否只能依赖专家数据 |
| 三指阀门 | 示范、旧模仿数据、在线交互 | 精细操作的真实可行性 |
| 抽屉与四指手 | 状态输入和自动重置 | 不同机器人上能否复用方法 |

原文仿真灵巧手使用二十五条人类示范，还增加五百条模仿策略轨迹。不能只报告“二十五条示范学会”而隐藏后面这批数据。三种真实任务的先验数据量不同，应该逐任务读取。

图中的在线零步已经完成离线预训练；因此零步性能不是未经训练的随机初始化。横轴若只算在线数据，还没有包含示范采集、旧策略产生记录及预训练计算。

主文与附录对某些真实任务的奖励符号写成成功条件下负一，这与最大化任务完成的直觉存在口径疑问。本文保留为需查对应代码的细节，不自行把正负号改成猜测值；四指手任务则明确使用距离类密集奖励，不能把三种硬件实验全部称作纯稀疏奖励。

### 结果：改善发生在哪里

依据[原文图3—7及附录](#paper-039-awac-figure-3)。

<!-- figure-ref-v6:start:d2cc3d78867d -->
<a id="paper-039-awac-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/039-awac-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/039-awac-v6-figure-5.png" width="2132" height="1907" alt="AWAC: Accelerating Online Reinforcement Learning with Offline Datasets，图5：三幅模拟画面分别展示手内转笔、开门和物体重定位任务；它们说明灵巧操作的不同接触需求，性能比较仍需看对应学习曲线。" loading="lazy"></a><figcaption>原图摘引：Ashvin Nair 等，首次公开于2020，HTML S6.F5，图5。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2006.09359v6#S6.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。三幅模拟画面分别展示手内转笔、开门和物体重定位任务；它们说明灵巧操作的不同接触需求，性能比较仍需看对应学习曲线。<a href="https://arxiv.org/html/2006.09359" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:d2cc3d78867d -->


1. **[图3](#paper-039-awac-figure-3)，微调诊断**：普通 SAC 类变体可能在初期掉点，部分受约束方法又进步慢，支持两阶段衔接确有独立困难；不能推出所有此类算法永远如此。
2. **[图4](#paper-039-awac-figure-4)，仿真灵巧操作**：AWAC 在给定旧数据上较快改善。文中的分钟数是仿真交互等效时间，不是实际硬件训练用时。
3. **[图6](#paper-039-awac-figure-6)，三个真实平台**：预训练后继续交互能提高任务回报，支持真实可行性；不能从回报曲线直接虚构统一成功率。
4. **[图7](#paper-039-awac-figure-7)，随机数据推物**：支持旧数据不必全部来自专家，但实验仍限于相应任务与覆盖范围。
5. **附录[图11](#paper-039-awac-figure-11)，D4RL微调**：HalfCheetah随机数据设置从离线归一化分 2.2 到在线后 52.9，增加 50.7 分；这个变化包含额外在线交互，不能作为纯离线胜出证据。

<!-- figure-ref-v6:start:70e575e660b1 -->
<a id="paper-039-awac-figure-4"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/039-awac-v6-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/039-awac-v6-figure-4.png" width="2132" height="1570" alt="AWAC: Accelerating Online Reinforcement Learning with Offline Datasets，图4：AWAC 在给定旧数据上较快改善。文中的分钟数是仿真交互等效时间，不是实际硬件训练用时。" loading="lazy"></a><figcaption>原图摘引：Ashvin Nair 等，首次公开于2020，HTML S4.F4，图4。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2006.09359v6#S4.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。AWAC 在给定旧数据上较快改善。文中的分钟数是仿真交互等效时间，不是实际硬件训练用时。<a href="https://arxiv.org/html/2006.09359" target="_blank" rel="noopener noreferrer">原引用入口2</a></figcaption></figure>
<!-- figure-ref-v6:end:70e575e660b1 -->
<!-- figure-ref-v6:start:693aa505973e -->
<a id="paper-039-awac-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/039-awac-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/039-awac-v6-figure-6.png" width="2132" height="2011" alt="AWAC: Accelerating Online Reinforcement Learning with Offline Datasets，图6：预训练后继续交互能提高任务回报，支持真实可行性；不能从回报曲线直接虚构统一成功率。" loading="lazy"></a><figcaption>原图摘引：Ashvin Nair 等，首次公开于2020，HTML S6.F6，图6。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2006.09359v6#S6.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。预训练后继续交互能提高任务回报，支持真实可行性；不能从回报曲线直接虚构统一成功率。<a href="https://arxiv.org/html/2006.09359" target="_blank" rel="noopener noreferrer">原引用入口2</a></figcaption></figure>
<!-- figure-ref-v6:end:693aa505973e -->
<!-- figure-ref-v6:start:bf83589f34a4 -->
<a id="paper-039-awac-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/039-awac-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/039-awac-v6-figure-7.png" width="2132" height="1180" alt="AWAC: Accelerating Online Reinforcement Learning with Offline Datasets，图7：支持旧数据不必全部来自专家，但实验仍限于相应任务与覆盖范围。" loading="lazy"></a><figcaption>原图摘引：Ashvin Nair 等，首次公开于2020，HTML S6.F7，图7。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2006.09359v6#S6.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。支持旧数据不必全部来自专家，但实验仍限于相应任务与覆盖范围。<a href="https://arxiv.org/html/2006.09359" target="_blank" rel="noopener noreferrer">原引用入口2</a></figcaption></figure>
<!-- figure-ref-v6:end:bf83589f34a4 -->
<!-- figure-ref-v6:start:e65e72954a58 -->
<a id="paper-039-awac-figure-11"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/039-awac-v6-figure-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/039-awac-v6-figure-11.png" width="1040" height="1012" alt="AWAC: Accelerating Online Reinforcement Learning with Offline Datasets，图11：HalfCheetah随机数据设置从离线归一化分 2.2 到在线后 52.9，增加 50.7 分；这个变化包含额外在线交互，不能作为纯离线胜出证据。" loading="lazy"></a><figcaption>原图摘引：Ashvin Nair 等，首次公开于2020，PDF第16页，图11。<a href="https://arxiv.org/pdf/2006.09359v6#page=16" target="_blank" rel="noopener noreferrer">核对原文</a>。HalfCheetah随机数据设置从离线归一化分 2.2 到在线后 52.9，增加 50.7 分；这个变化包含额外在线交互，不能作为纯离线胜出证据。<a href="https://arxiv.org/html/2006.09359v6#A1.F11" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:e65e72954a58 -->


同一附录中，HalfCheetah medium-expert 的在线结果仍低于列出的 BEAR 离线参考。因此应把主张限定为整体上能有效微调，而不是任何数据集最终都获第一。

关于随机种子和误差带，本文没有把全部图表逐一核实为同一统计口径，故不统一标注标准差或置信区间。精确比较需要回到相应图注与发布结果。

## 五、温度和优势误差决定哪些动作被保留

作者指出温度或约束强度选择仍困难，也把跨实验室、跨机器人数据学习留作未来方向。本文的多个硬件任务证明方法可复用，不等于已经训练一个跨所有机器人共享的通用策略。

本文分析：若 critic 在稀疏奖励下无法可靠区分动作，指数权重会放大错误。温度过小尤其可能把噪声当成强监督；温度过大则接近普通 BC。在线数据提供纠错机会，但需要起点足以探索到有用反馈。

### 五个前置概念

五个前置概念：

- **优势函数**：动作比当前策略平均选择好多少。
- **加权最大似然**：不同训练样本对拟合目标贡献不同。
- **离线到在线**：先固定数据预训练，再允许新环境交互。
- **行为分布**：经验池中动作的来源分布。
- **隐式约束**：通过更新形式限制行为，而非显式拟合并惩罚一个分布距离。

<details>
<summary>进阶追问与参考答案（3题）</summary>

**进阶问题1：如何自动调节优势权重温度？**

参考答案：可以把目标有效样本量或策略更新幅度作为调节信号：权重过于集中时增大温度，几乎均匀时才考虑减小。但优势的尺度和误差也会影响该信号。先固定critic与数据做温度对照，再允许自适应，记录有效样本量、KL变化和回报；这是一种可测试设计，不是原文已经验证的自动规则。

**进阶问题2：新旧数据应该怎样采样？**

参考答案：旧数据保留成功行为，新数据覆盖当前策略偏移，两者比例应与来源质量和状态覆盖一起决定。可固定每步更新量，对比均匀回放、固定新旧配额及逐步提高在线比例，并按数据来源记录TD误差和成功轨迹占比。只按数据年龄丢弃旧样本，可能过早丢掉稀少的成功监督。

**进阶问题3：初期掉点来自actor还是critic的分布转变？**

参考答案：做短期冻结对照：一组只更新critic，一组只更新actor，一组两者都更新，保持新增交互与回放比例一致。再比较在线状态上的Q校准、优势权重分布和动作偏移。若冻结critic减轻掉点且校准误差上升，更支持价值端问题；若固定可信critic后仍掉点，则应检查策略更新与覆盖，不能仅从一条回报曲线归因。

这些回答给出机制分析与待检验设计，不是已经运行的新实验结果。

</details>

## 六、沿机制关系继续读

AWAC与[DAPG](023-dapg.md)是平行示范利用方法；后来的[IQL](047-iql.md)保留优势加权提取策略的思路，同时改变价值学习以避免分布外动作查询，这是有边界的历史延续。

## 七、自测三题与参考答案

**问题1：AWAC 的 actor 看起来像监督学习，为什么仍属于强化学习？**

答：监督目标的权重由回报驱动的 critic 决定，而且 critic 通过 Bellman 自举学习当前策略价值。它不是无差别复制动作，而是按任务收益进行策略改进。

**问题2：既然 actor 只拟合数据动作，如何超过初始示范？**

答：它可以更重视旧数据中的好片段；在线阶段还会产生新动作并加入经验池。数据支持范围因此扩展。纯离线时的改进空间则更受旧数据限制。

**问题3：在线曲线从零步就很高，说明算法不需要训练吗？**

答：不说明。零点通常是离线预训练结束、在线微调开始。判断成本必须同时记录旧数据、预训练计算以及后来新增的在线交互。
