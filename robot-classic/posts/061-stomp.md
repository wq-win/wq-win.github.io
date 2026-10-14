# 061｜STOMP：用平滑随机试探优化机器人轨迹

[返回总览](00-发展时间线总览.md) · [上一篇：ORB](060-orb.md) · [下一篇：RRT*](062-rrtstar.md)

**论文**：Mrinal Kalakrishnan、Sachin Chitta、Evangelos Theodorou、Peter Pastor、Stefan Schaal，*STOMP: Stochastic Trajectory Optimization for Motion Planning*，ICRA 2011。[论文全文](https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf) · [出版记录](https://doi.org/10.1109/ICRA.2011.5980280)。

### 先接住前作的问题

[CHOMP](059-chomp.md)需要代价梯度，不光滑约束或黑盒代价可能难处理。STOMP用有时间结构的随机试探找改进；[TrajOpt](073-trajopt.md)则用凸子问题处理另一种局部近似。

## 一、问题设定：只能评价轨迹而难求梯度时怎样继续局部改进

假设机械臂已经知道起点和终点，但直接插值得到的轨迹穿过了柜板。轨迹优化要把这条曲线推到障碍物外，同时让动作平滑、杯子不倾斜、电机负担不过大。

### 2.1 优化的是整条曲线

这里的变量是一段固定时长、固定离散点数的关节轨迹。端点已知并保持不变，中间各时刻的关节位置组成参数。机器人几何、障碍物地图及需要时的动力学模型用于评价这些参数。

这是模型已知条件下的运动规划，不适合强行套成在线 RL 的状态—动作—奖励循环。若作类比，轨迹参数是待优化决策，负代价类似回报；但论文没有学习动作价值函数，也没有利用环境交互训练跨任务策略。

从算法角度看，停止条件是代价收敛或计算预算耗尽；从执行角度看，到达目标还不够，必须满足碰撞和任务约束。低代价与可执行性不能画等号。

### 2.2 为什么无梯度有价值

机器人代价可能包含距离查询、接触判断、姿态容差、逆动力学输出，甚至外部黑箱评分。若每换一个评价模块都要推导其对所有轨迹点的导数，工程负担很大。

无梯度并不意味着不需要有信息的代价。设一个成本函数对全部碰撞轨迹都返回 1，对其他轨迹返回 0。如果随机候选全都碰撞，它们没有优劣区别，更新便缺少方向。距离场提供“离障碍有多深”的连续信息，仍有助于随机搜索。

## 二、生成时间相关扰动，再按代价加权更新

### 3.1 目标、机制与指标分开看

目标可概括为状态相关成本与平滑成本之和：

$$
J(\theta)=\sum_i q(\theta_i)+\frac12\theta^\top R\theta,
\qquad R=A^\top A.
$$

$\theta$ 是离散轨迹，$A$ 是有限差分算子；当它计算加速度时，二次项衡量加速度平方累积。多关节轨迹对各维度组织相应参数。边界项需要按固定起终点处理，不能直接对一个有零空间的任意差分矩阵求逆。

**目标**规定什么叫好轨迹；**机制**规定如何从候选成本得到更新；**指标**则是规划成功率、耗时或所需力矩。某机制减少更新次数，不自动意味着耗时更少。

### 3.2 为什么噪声协方差选择 $R^{-1}$

独立噪声会让相邻点一会儿向左、一会儿向右，产生锯齿。相关噪声倾向于让邻近点一起移动，生成更像可执行动作的整体弯曲。

一个教学解释是把 $R$ 分解为特征方向：平滑代价大的高频方向具有较大特征值，取逆后该方向的扰动方差更小；低代价方向获得更多探索。这把优化问题本身的几何结构放进了采样分布。

不要据此认为平滑样本就安全：它仍可能穿过障碍物，也可能违反力矩或姿态约束。平滑只解决动作变化方式，不代替碰撞检查。

### 3.3 好样本怎样形成更新

对同一时刻的各个候选，以成本指数变换生成归一化权重：

$$
p_{k,i}\propto\exp\left[-h\frac{S_{k,i}-S_{\min,i}}
{S_{\max,i}-S_{\min,i}}\right],\qquad
\widetilde{\delta\theta}_i=\sum_kp_{k,i}\epsilon_{k,i}.
$$

$k$ 是候选编号，$i$ 是时间点，$\epsilon$ 是实际使用的扰动。随后以由逆平滑矩阵构造的 $M$ 平滑更新，再修改均值轨迹。原算法[表 I](https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf#page=3) 使用局部时刻代价，不是把未来成本累加回当前时刻的策略梯度算法。

如果所有成本相同，分母为零。实现需要显式处理，例如赋予相同权重；这是数值防护建议，不是宣称论文报告过某种具体处理。

末尾的明确失败输出是工程化教学写法。不能把一个达到迭代上限、尚有碰撞的低成本解当成成功轨迹。

### 3.5 约束作为成本的边界

关节范围可以在候选生成时限制；末端姿态和碰撞则通过成本推动改善。一般的非凸可行域不因“候选加权平均”而封闭。例如，两条分别绕过圆障碍物左侧和右侧的安全路径，其平均路径可能穿过圆心。

因此，作者关于稳定更新、探索范围和平均成本的解释，不应扩展成对所有硬约束的安全定理。§III.B 的平均成本非增说明依赖密集采样等假设，不是有限候选下每一步必然下降的承诺。

### 随机扰动为什么必须带时间相关性

若相邻路点独立加噪，轨迹二阶差分会把高频抖动放大。用加速度差分矩阵 $D$构造平滑代价 $q^TD^TDq$，再以其正定约束子空间上的逆作为噪声协方差，就让常见扰动沿较平滑方向展开；端点固定和奇异模态处理是定义逆矩阵的前提。

**教学权重例**：两次扰动在某路点分别为+0.2与−0.1，归一化代价分别0与1，温度系数取1，则指数权重约0.731、0.269，平均扰动约+0.1193。它倾向低成本试探，却不是必然下降的解析梯度；完整算法还有时间维平滑及接受判断，不能把这个两样本片段当全部STOMP。

本篇明确以[CHOMP](059-chomp.md)的解析梯度限制为出发点，采用无需代价导数的随机估计；与[iLQG](051-id-iLQR.md)是局部优化的平行方法。[原文方法部分](https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf)给出 $D^TD$结构与指数加权。实验应把采样数、总碰撞检查和成功率共同报告，单轮变快不意味着同预算解更好。

候选代价通过权重形成更新，时间相关噪声决定更新是否保持整段平滑。下面把一次采样批次展开，再分开报告评价次数与最终质量。

## 三、执行随机试探，用平滑噪声检查整段运动

### 3.4 教学伪代码

```text
输入：固定起终点、初始关节轨迹 θ、机器人模型、地图、成本函数
根据时间离散构造平滑矩阵 R，构造平滑更新矩阵 M
重复，直到成本收敛或预算耗尽：
    生成 K 个具有时间相关性的扰动 ε
    候选轨迹 = θ + ε，保持端点不变
    将候选限制在关节取值范围内，记录处理后的实际扰动
    对每个候选计算各时刻的障碍、任务约束与力矩成本
    对每个时刻：
        把候选成本转换为归一化权重
        求权重乘扰动之和
    用 M 平滑更新，并更新 θ
    重新评价完整轨迹的成本与可行性
输出：通过可行性检查的轨迹；否则报告当前预算下失败
```

### 一个自构、未运行的小例子

让二维末端从圆障碍物左边到右边，初始直线穿过圆心。生成三个平滑候选：向上绕行、向下绕行、几乎不动。若向上路线成本最低，它在障碍附近获得更大权重，均值逐渐向上弯曲。

若上下两条路线成本完全相同，平均更新可能互相抵消。这个例子揭示随机加权并非魔法：采样尺度、初始化和成本形状仍影响能否离开对称坏状态。它也解释为什么应保存和检查最好的可行候选，而不能仅相信均值看起来平滑。

### 五个前置概念

1. **配置空间**：把机器人所有关节位置组成一个点，整条动作就是这个空间的曲线。
2. **有限差分**：用相邻离散位置近似速度和加速度。
3. **协方差**：描述各个扰动分量怎样共同变化，而不只是各自大小。
4. **距离场**：为位置提供到障碍边界的距离，帮助衡量碰撞深度和余量。
5. **软约束**：违反条件会增加成本，但是否最终严格满足仍需检查。

## 四、读代价选择与机器人轨迹实验

<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/061-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/061-evidence.png" width="772" height="317" alt="Fig. 5：左图是多次运行的平均成本与一个标准差，右图比较有无力矩优化时各关节绝对力矩之和" loading="lazy"></a><figcaption>原论文结果图／表摘引：Mrinal Kalakrishnan、Sachin Chitta、Evangelos Theodorou、Peter Pastor、Stefan Schaal（2011），Fig. 5，PDF 第 6 页；<a href="https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：左图是多次运行的平均成本与一个标准差，右图比较有无力矩优化时各关节绝对力矩之和。均值下降不代表每次随机更新都下降，力矩指标减少也不直接等于电池能耗同幅度减少。

### 实验怎样验证

成功率、成功案例的计算时间与平均迭代数要分别看；更少迭代不能忽略每轮需要评价多条带噪轨迹。

以下设置与数字来自 §V、[表 II](https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf#page=5)；[图 5](#rc-61-figure-5) 是单独的重复实验。

<!-- figure-ref-v6:start:rc-61-figure-5 -->
<figure class="reading-evidence-figure" id="rc-61-figure-5"><a href="/robot-classic/assets/figure-refs-v6/061-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/061-fig-5.png" width="601" height="255" alt="STOMP图5的轨迹成本和关节力矩完整双面板" loading="lazy"></a><figcaption>Mrinal Kalakrishnan、Sachin Chitta、Evangelos Theodorou、Peter Pastor、Stefan Schaal（2011），图 5，PDF 第 6 页；<a href="https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：左图是十次运行的平均成本及标准差，右图是有无力矩优化的时间曲线；面板标记现已完整保留。
<!-- figure-ref-v6:end:rc-61-figure-5 -->

| 项目 | 设置与解释 |
|---|---|
| 环境 | PR2 七自由度机械臂，货架中的七个可达柜格 |
| 任务规模 | 柜格间双向组合共 42 个规划问题，各重复 5 次 |
| 初始轨迹 | 关节空间直线，时长 5 秒，100 个时间步 |
| 基线 | 标准梯度更新 CHOMP；没有把其 HMC 变体计作主要对照 |
| 预算 | 两方法均至多 500 次迭代；STOMP 每次生成 5 个新候选并复用 5 个历史好候选 |
| 姿态条件 | 约束设置要求夹爪横滚、俯仰在 ±0.2 弧度内 |
| 调参 | 两方法分别调整探索量或步长；没有报告相等调参工时 |
| 不确定性 | 表中给出时间及迭代数的均值与离散程度；[图 5a](#rc-61-figure-5) 明确显示标准差 |
| 实机证据 | PR2 执行演示；没有提供与仿真同规模的实机成功率统计 |

相同迭代上限并不等于相同成本查询预算：一次 STOMP 更新评价多条候选，而一次 CHOMP 更新需要计算梯度。因此应一起阅读成功率与实际耗时。

### 5.1 [表 II](https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf#page=5)：成功率提高，但成功耗时并未降低

无任务姿态约束时，STOMP 为 210/210，CHOMP 为 149/210。按这些计数计算，成功率差约为 **29.0 个百分点**。成功规划平均耗时分别为 0.88 与 0.71 秒：不能把较少迭代写成“运行更快”。带姿态约束的 STOMP 成功 196/210。

这支持在该货架、初始化和参数条件下，随机轨迹更新比所比较的标准梯度版本更容易找到可行解。它没有证明适用于所有狭窄通道，更没有证明全局最优。

### 5.2 [图 3](#rc-61-figure-3)：同时绕障与保持姿态

<!-- figure-ref-v6:start:rc-61-figure-3 -->
<figure class="reading-evidence-figure" id="rc-61-figure-3"><a href="/robot-classic/assets/figure-refs-v6/061-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/061-fig-3.png" width="640" height="270" alt="原论文图3：STOMP机械臂绕开不同障碍的三组轨迹渲染" loading="lazy"></a><figcaption>Mrinal Kalakrishnan、Sachin Chitta、Evangelos Theodorou、Peter Pastor、Stefan Schaal（2011），图 3，PDF 第 4 页；<a href="https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：三个场景的可行轨迹展示任务差异，不能将图像本身当成成功率统计。
<!-- figure-ref-v6:end:rc-61-figure-3 -->

图像展示轨迹从碰撞初始化变为满足指定任务条件的路径。它帮助理解成本的作用，但单幅结果图不能代替全部试验的统计，也不能说明未知环境中的感知误差已被处理。

### 5.3 [图 4](#rc-61-figure-4)、5b：改变动作姿态以降低力矩

<!-- figure-ref-v6:start:rc-61-figure-4 -->
<figure class="reading-evidence-figure" id="rc-61-figure-4"><a href="/robot-classic/assets/figure-refs-v6/061-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/061-fig-4.png" width="640" height="270" alt="原论文图4：STOMP机械臂在约束任务中的三组运动轨迹" loading="lazy"></a><figcaption>Mrinal Kalakrishnan、Sachin Chitta、Evangelos Theodorou、Peter Pastor、Stefan Schaal（2011），图 4，PDF 第 5 页；<a href="https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：并排姿态显示约束场景下的整条运动，需结合正文给定任务读图。
<!-- figure-ref-v6:end:rc-61-figure-4 -->

该对照隔离了是否加入力矩成本。物理直觉是收肘或降低手臂，减小重力补偿的负担。图中力矩曲线改善支持这个特定目标；没有报告电池耗电量，因此不能直接写成相同百分比的节能。

### 5.4 [图 5a](#rc-61-figure-5)：平均曲线不等于每次都单调

十次重复的均值与标准差有助于观察优化过程。但一条下降的均值曲线不意味着每次随机更新都下降，也不证明密集采样假设在有限候选实验中严格成立。

## 五、检查候选评价开销与局部最优

**作者的贡献**是把结构化轨迹扰动、局部成本加权和光滑更新组织成无需解析成本梯度的优化器。它保留了优化式规划中“可以直接从不安全初始化开始修正”的实用特点。

**实验支持的范围**集中在机械臂货架规划、姿态条件和一个力矩优化对照；实机执行说明系统能够落地，但没有提供普遍部署可靠性的统计保证。

**本文分析的代价**包括重复成本评价、噪声幅度选择、非凸障碍导致的局部最优，以及离散点检查与连续执行之间的间隙。动力学模型不准时，计算力矩降低也可能无法准确预测真实电流或温升。

作者在 §V 已明确指出它是局部优化方法。对于需要先大幅绕行、才能进入另一条通道的问题，借助全局规划初值可能更合适；这是一种方法组合建议，不是论文已完成的全面对照。

## 六、追问：比较不同采样扰动时，为什么应固定候选评价次数而不只固定迭代轮数？

<details>
<summary>比较不同采样扰动时，为什么应固定候选评价次数而不只固定迭代轮数？</summary>

**参考答案**：每轮候选数不同会改变总计算预算和发现低代价方向的机会。应同时固定或报告轨迹评价次数、噪声相关结构与单次评价成本，再比较最终质量。否则采样更多带来的收益可能被误记为更新机制更有效。

</details>

## 七、比较逐次凸化的局部优化路线

- **平行路线**：[TrajOpt：用局部凸问题修复整条碰撞轨迹](073-trajopt.md)。用凸子问题处理局部轨迹近似，代价与约束的处理不同。

## 八、自测与参考答案

### 问题 1：STOMP 没有梯度，为什么还偏好距离场而不是只有碰撞/不碰撞？

**答案**：采样优化也需要区分候选。若所有碰撞候选评分相同，权重缺少方向；距离和穿透深度提供更细的优劣信息。无需解析梯度与无需信息丰富的成本是两回事。

### 问题 2：把两条安全轨迹取平均，是否一定安全？这对理解更新意味着什么？

**答案**：不一定。非凸障碍两侧的安全路径可以平均成穿障路径。因此加权与平滑更新之后仍需重新检查可行性，不能把关于更新稳定性的说明理解成普遍的碰撞安全证明。

### 问题 3：STOMP 在[表 II](https://whiteoak.umd.edu/roswiki/attachments/Papers%282f%29ICRA2011_Kalakrishnan/kalakrishnan_icra2011.pdf#page=5) 中迭代更少，为什么不能称其更快？

**答案**：每次迭代的工作量不同。STOMP 评价多条候选，而 CHOMP 计算梯度；无约束对照中成功规划时间是 0.88 对 0.71 秒。该实验最明确的优势是成功率，速度要根据墙钟时间和失败处理共同评价。
