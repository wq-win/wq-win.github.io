# 065｜Minimum Snap：把四旋翼轨迹变成可求解的平滑曲线

[返回总览](00-发展时间线总览.md) · [上一篇：KinectFusion](064-kinfu.md) · [下一篇：DBoW](066-dbow.md)

**论文**：Daniel Mellinger、Vijay Kumar，*Minimum Snap Trajectory Generation and Control for Quadrotors*，ICRA 2011，2520—2525。[出版记录](https://doi.org/10.1109/ICRA.2011.5980409) · [六页原文文本存档](https://doczz.net/doc/3223260/minimum-snap-trajectory-generation-and-control-for-quadro...) · [PDF 存档入口](https://github.com/ardyadipta/quadrotor_autonomy/blob/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf)。

### 先接住前作的问题

[轨迹优化](059-chomp.md)强调平滑与避障，四旋翼还需要把位置高阶导数映到姿态和输入。本篇利用平坦性设计minimum-snap轨迹；[TOPP-RA](093-toppra.md)可对照理解时间分配为何是另一个问题。

## 一、问题设定：穿过航点的四旋翼轨迹怎样同时照顾姿态和输入

让无人机依次穿过几个圆环，不能只连几条直线：在折点瞬间改变速度方向，需要无限大的加速度。即便让位置曲线看起来圆滑，姿态和电机输入仍可能变化过猛。

### 2.1 为什么不能独立指定所有姿态

普通四旋翼的总推力沿机体特定轴。要水平加速，就必须倾斜机身；横滚、俯仰和位置加速度并非可以随意独立选择。

论文状态包括位置、速度、姿态、角速度，控制量是总推力与三轴力矩。规划输入则压缩为位置和偏航角关键帧，以及走廊、时间和导数条件。跟踪器根据当前状态与参考轨迹产生实际指令。

这里没有奖励函数或回合学习。轨迹生成以优化条件结束，实际飞行以到达关键位置或完成循环任务评价。规划成功也不意味着感知、通信与执行全部成功。

### 2.2 模型假设是能力边界的一部分

§II 认为电机动态相对于刚体运动足够快，控制建模中可以忽略其滞后。质量、惯量、推力系数等用于从轨迹还原控制量。

这有利于形成简洁可解问题，但高速气动、输入饱和、负载变化和状态估计延迟仍可能破坏预测。论文使用外部动作捕捉，因此不能把结果介绍成纯机载感知的未知环境自主飞行。

## 二、用微分平坦性连接位置导数与minimum-snap目标

### 3.1 平坦输出如何决定推力方向

选择 $\sigma=[x,y,z,\psi]^\top$。在理想平动模型中：

$$
m\ddot r=-mg e_3+u_1b_3,
\qquad b_3=\frac{\ddot r+ge_3}{\|\ddot r+ge_3\|}.
$$

$r$ 是位置，$b_3$ 为机体推力轴，$u_1$ 为总推力。给定加速度及偏航参考，可以构造期望姿态；继续求导可获得角速度、角加速度与力矩需求。

“平坦”不是无人机只能在平面飞，而是状态和输入能够由少量输出及有限阶导数代数恢复。该恢复存在奇异情形，例如所需推力向量趋于零，不能把公式分母视为永不出问题。

### 3.2 最小 snap 不是最小能耗

目标的教学表达为：

$$
J=\int_0^{T}\left(\mu_r\|r^{(4)}(t)\|^2+
\mu_\psi[\ddot\psi(t)]^2\right)dt.
$$

位置四阶导数与偏航二阶导数来自论文 §V 的选择。它们和输入的代数关系使这一目标有控制意义，但不意味着最小化电池能量、电机热量或所有输入峰值。

一个简单反例是悬停：位置各阶导数为零，snap 成本为零，但电机仍要持续产生重力补偿推力并消耗电能。优化目标不能与没有测量的物理量直接等同。

### 3.3 为什么固定时间后能写成 QP

每段用 $r(t)=\sum_k c_kt^k$ 表示。求导对系数是线性操作，导数平方积分于是成为 $c^\top Qc$。指定航点、起终点导数、段间连续性，以及指定时刻的线性位置范围，都可组织为线性约束。

因此，在固定分段时间与相应线性约束下，系数优化是凸二次规划。若把全部分段时间一起作为变量，矩阵也随时间变化，就不再能用“一个凸 QP”概括整个问题。

论文并未证明任意真实电机约束、任意障碍形状都自动变为线性约束。最终仍需通过平坦映射检查所需控制量，识别模型和可执行性的限制。

### 3.4 走廊与时间分配

§V.B 在航点连线周围约束横向偏离，并在有限中间时间点加入线性不等式。这能让曲线朝安全区域收缩，但有限点约束不构成任意连续时刻的通用安全证明；实际应用还要考虑机体外形、插值越界和跟踪余量。

§V.C 保持总时间不变，调整各段分到的时间，每次重新求解系数优化。这样能把时间从容易的直行段分给困难转弯段。外层采用数值方向导数与回溯搜索，不能把单个实例的收敛称作全局最优时间分配证明。

存档对段数符号和方向向量分母的呈现容易混淆。独立教学写法是：若共有 $S$ 段，给一段增加 $h$，其余 $S-1$ 段各减少 $h/(S-1)$，总时间恰好不变；还需保证所有段时间为正。这里不据解析文本断言原印刷公式有误。

### 3.6 控制实现与稳定性证明必须分开

§IV 用位置、速度误差构造期望合力，并将它投影到实际推力轴；姿态误差采用旋转矩阵表达。

作者引用了相近控制器的稳定性结果，但同时指出那些证明需要额外前馈、补偿项、特定增益与模型假设，自己的实现并不完全满足。因而本篇把“非线性控制器的实测跟踪效果”作为实验结论，不写成“该实现已经得到无条件全局稳定性证明”。

### 多给一倍时间，为什么snap代价会降128倍

设固定空间形状为 $\bar p(s)$，归一化时间 $s=t/T\in[0,1]$，实际轨迹 $p(t)=\bar p(t/T)$。四阶导数满足 $p^{(4)}(t)=T^{-4}\bar p^{(4)}(s)$，所以 $\int_0^T\|p^{(4)}(t)\|^2dt=T^{-7}\int_0^1\|\bar p^{(4)}(s)\|^2ds$。**教学例**时长翻倍，代价变为原来的 $1/128$；速度和加速度却只分别缩为一半、四分之一。

因此若自由选择总时长却不加时间代价或约束，单纯“最小snap”会偏向无限慢，固定段时间的凸系数优化与段时间分配必须分开。平滑也不自动保证推力、姿态或走廊约束，仍需通过平坦性映射检查输入。

本篇与[CHOMP](059-chomp.md)是平滑轨迹优化的平行路线；[TOPP-RA](093-toppra.md)则在已给几何路径上改变时间规律，是教学对照。[原论文第V–VI节PDF](https://raw.githubusercontent.com/ardyadipta/quadrotor_autonomy/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf)将固定总时间的段分配与Vicon辅助穿环共同验证，故实机成功证明的是这条整体链在所测设置的效果，不能单独证明snap是普遍最优能耗指标。

位置导数映到姿态和输入，段时长因而是动力学问题的一部分。下面检查多项式连接与时间参数，再读真实圆环飞行所用条件。

## 三、求分段多项式，检查时间分配与连接条件

### 3.5 教学伪代码

```text
输入：位置/偏航关键帧，安全走廊，总时长，模型参数
初始化每段持续时间
重复外层时间分配，直到预算或改进阈值：
    根据当前各段时间构造多项式 snap 成本矩阵
    加入航点、边界导数和段间连续性条件
    在指定中间时刻加入走廊限制
    解系数二次规划，得到参考曲线
    若优化时间分配：估计保持总时间的成本变化方向
    以回溯搜索更新正的段时间
用平坦映射计算推力、姿态及其导数需求
检查模型内输入限制、连续轨迹余量及预期跟踪误差
飞行时：读取状态，计算位置/速度与姿态误差，反馈跟踪
输出：参考轨迹和实际执行记录
```

伪代码中的输入限制、连续轨迹余量及预期跟踪误差检查，是工程化教学补充，不代表原论文已提供完整鲁棒安全验证工具。

### 自构、未运行的小例子

两段路径总共四秒：第一段长而直，第二段短却要急转。只按距离分配时间，可能给第二段太少时间，导致姿态变化激烈。适当减少第一段时间、增加第二段时间，有可能降低整体 snap，即使总完成时间不变。

这个例子说明优化器关注的是导数变化，不是机械地让每米耗时相同。是否真的改善飞行，还应检查推力峰值和实际跟踪。

### 五个前置概念

1. **微分平坦性**：用一组输出及其有限阶导数恢复状态和输入。
2. **Jerk 与 snap**：分别是位置三阶和四阶时间导数。
3. **二次规划**：二次目标配合线性约束的优化形式。
4. **时间参数化**：规定沿路径各位置什么时候到达。
5. **前馈与反馈**：前馈利用参考及模型，反馈利用实际误差修正。

## 四、读静态圆环和抛出圆环飞行实验

<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/065-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/065-evidence.png" width="662" height="393" alt="Fig. 6：左侧是同一轨迹的不同空间投影，右侧上下比较不同运动时间的跟踪误差" loading="lazy"></a><figcaption>原论文结果图／表摘引：Daniel Mellinger、Vijay Kumar（2011），Fig. 6，PDF 第 6 页；<a href="https://raw.githubusercontent.com/ardyadipta/quadrotor_autonomy/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：左侧是同一轨迹的不同空间投影，右侧上下比较不同运动时间的跟踪误差。更短运动时间会放大执行困难，几何路径相似不表示动态跟踪同样精确。

### 实验设置

最小 snap 的参考走廊约束与真实飞行跟踪误差来自不同实验条件；后续博士论文新增结果不归入这篇会议文。

以下来自 §VI，区分轨迹参考约束与实际飞行误差。

| 项目 | 设置或证据范围 |
|---|---|
| 平台 | Ascending Technologies Hummingbird |
| 状态来源 | Vicon 测位置、姿态、速度，机载陀螺仪提供角速度 |
| 动态任务 | 预测抛出圆环的轨迹，快速生成穿环参考 |
| 静态任务 | 连续穿过三个固定圆环，六个关键帧 |
| 动态任务时间 | 0.9 秒参考轨迹；圆环运动使用二次空气阻力模型预测 |
| 静态速度对照 | 同一路线分别按 8 秒与 4 秒执行，[图 6](#rc-65-figure-6) 展示 24 秒记录 |
| 评价指标 | 各轴位置跟踪误差、速度与姿态变化、实际穿环演示 |
| 预算与重复 | 未报告统一求解耗时表、独立任务次数、公开种子或成功率置信区间 |

<!-- figure-ref-v6:start:rc-65-figure-6 -->
<figure class="reading-evidence-figure" id="rc-65-figure-6"><a href="/robot-classic/assets/figure-refs-v6/065-fig-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/065-fig-6.png" width="485" height="324" alt="四旋翼轨迹及8秒和4秒飞行的误差四面板" loading="lazy"></a><figcaption>Daniel Mellinger、Vijay Kumar（2011），图 6，PDF 第 6 页；<a href="https://raw.githubusercontent.com/ardyadipta/quadrotor_autonomy/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：右侧两个时间设置的误差幅度不同，比较时需要同时读取飞行周期标签；左侧给出了同一空间轨迹的两个投影。
<!-- figure-ref-v6:end:rc-65-figure-6 -->

这些实验检验模型化轨迹能否被真实设备跟踪。没有和大量不同规划器在等算力、等调参预算下比较，所以不能据此声称普遍优于所有其他无人机规划方法。

### 5.1 [图 2](#rc-65-figure-2)：加入走廊改变曲线

<!-- figure-ref-v6:start:rc-65-figure-2 -->
<figure class="reading-evidence-figure" id="rc-65-figure-2"><a href="/robot-classic/assets/figure-refs-v6/065-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/065-fig-2.png" width="640" height="334" alt="原论文图2：最小snap穿越四个航点的两种路径约束示例" loading="lazy"></a><figcaption>Daniel Mellinger、Vijay Kumar（2011），图 2，PDF 第 5 页；<a href="https://raw.githubusercontent.com/ardyadipta/quadrotor_autonomy/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：左图只规定航点，右图额外限制中间通道；约束改变了整条曲线形状。
<!-- figure-ref-v6:end:rc-65-figure-2 -->

正文例子采用 0.05 米走廊参数与八个中间约束点。它展示约束如何改变无约束的最小 snap 曲线，支持优化器能够表达这种局部空间要求。

它不是复杂地图中连续碰撞检测的统计证明，也没有证明八个采样点对所有轨迹次数和障碍厚度都足够。

### 5.2 [图 3](#rc-65-figure-3)：时间分配可以降低成本

<!-- figure-ref-v6:start:rc-65-figure-3 -->
<figure class="reading-evidence-figure" id="rc-65-figure-3"><a href="/robot-classic/assets/figure-refs-v6/065-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/065-fig-3.png" width="640" height="317" alt="原论文图3：迭代分配时间后的路径和总目标值" loading="lazy"></a><figcaption>Daniel Mellinger、Vijay Kumar（2011），图 3，PDF 第 5 页；<a href="https://raw.githubusercontent.com/ardyadipta/quadrotor_autonomy/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：右图按迭代次数记录目标变化，不能把该次数当作飞行时间。
<!-- figure-ref-v6:end:rc-65-figure-3 -->

同样航点和总时间，重新分配各段时间后，展示实例在七次迭代后得到较低目标。它支持外层时间调整有实用价值，却不能证明目标就是最短飞行时间，或外层搜索总能得到全局最优。

### 5.3 [图 4](#rc-65-figure-4)、5：快速穿过抛出的圆环

<!-- figure-ref-v6:start:rc-65-figure-4 -->
<figure class="reading-evidence-figure" id="rc-65-figure-4"><a href="/robot-classic/assets/figure-refs-v6/065-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/065-fig-4.png" width="640" height="193" alt="原论文图4：四旋翼位置跟踪误差和期望、实测速度曲线" loading="lazy"></a><figcaption>Daniel Mellinger、Vijay Kumar（2011），图 4，PDF 第 5 页；<a href="https://raw.githubusercontent.com/ardyadipta/quadrotor_autonomy/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：位置误差与速度响应分两幅给出，需按各自单位读数。
<!-- figure-ref-v6:end:rc-65-figure-4 -->

<!-- figure-ref-v6:start:rc-65-figure-5 -->
<figure class="reading-evidence-figure" id="rc-65-figure-5"><a href="/robot-classic/assets/figure-refs-v6/065-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/065-fig-5.png" width="640" height="278" alt="原论文图5：四旋翼沿规划路径飞行的叠加照片" loading="lazy"></a><figcaption>Daniel Mellinger、Vijay Kumar（2011），图 5，PDF 第 6 页；<a href="https://raw.githubusercontent.com/ardyadipta/quadrotor_autonomy/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：重叠机身显示同一次运动的连续姿态，不能据此读出多次重复试验成功率。
<!-- figure-ref-v6:end:rc-65-figure-5 -->

§VI.A 描述所展示最远拦截位置下，各方向误差小于 8 厘米，速度达 3.6 米/秒，俯仰达到 60°。这些数字说明超出小姿态悬停附近的实际能力。

“最坏位置”指作者指定拦截区域中的条件，不是所有扰动和所有飞行的最坏情况上界。未给独立试验总数，不能从这段话计算可靠成功率。

### 5.4 [图 6](#rc-65-figure-6)、7：速度与精度存在权衡

<!-- figure-ref-v6:start:rc-65-figure-7 -->
<figure class="reading-evidence-figure" id="rc-65-figure-7"><a href="/robot-classic/assets/figure-refs-v6/065-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/065-fig-7.png" width="640" height="282" alt="原论文图7：四旋翼穿越圆环的叠加飞行照片" loading="lazy"></a><figcaption>Daniel Mellinger、Vijay Kumar（2011），图 7，PDF 第 6 页；<a href="https://raw.githubusercontent.com/ardyadipta/quadrotor_autonomy/master/papers/05%20-%20Minimum%20Snap%20Trajectory%20Generation%20and%20Control%20for%20Quadrotors%20.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：圆环给出了场景约束；照片是该次实机穿越展示。
<!-- figure-ref-v6:end:rc-65-figure-7 -->

静态穿环的快版本速度最高约 2.6 米/秒、横滚和俯仰可达 40°。正文将快慢对照解释为速度与精度权衡，周期误差展示重复动作中的相似行为。

穿环段参考走廊为 1 厘米，并不意味着真实无人机的误差小于 1 厘米。参考曲线约束、实际跟踪误差及圆环物理余量是三个不同量。

## 五、保留执行能力、连续安全与模型误差

**作者贡献**是把平坦性、最小 snap 轨迹、走廊约束、时间缩放和非线性跟踪组织成可用于敏捷飞行的流程。

**实验支持**是在动作捕捉与指定场景下能够执行快速穿环，并展示时间缩放带来的精度权衡。**本文分析**认为，迁移到机载定位时应重新测量延迟、失锁、地图误差与输入饱和，不能只复用原文速度数字。

时间放慢会按不同阶数降低导数，例如时间扩大两倍，速度减半、加速度变四分之一、snap 变为十六分之一。这有助于降低动态需求，但“足够慢满足所有安全约束”过于宽泛：它不能修复穿墙几何、错误地图、不可持续悬停的电机或电池不足。

最小 snap 的长期价值是一种可解释且方便优化的轨迹表示。它不代替任务级路线搜索、可靠感知或接触与碰撞安全检查。

## 六、追问：若两段路径形状固定，总时长应该怎样分给两段才降低snap代价？

<details>
<summary>若两段路径形状固定，总时长应该怎样分给两段才降低snap代价？</summary>

**参考答案**：先作一个可手算的受限教学问题：两段可独立缩放的归一化形状固定、端点导数条件相容，只优化正时长 $T_1+T_2=T$。由正文尺度律，代价为 $C_1T_1^{-7}+C_2T_2^{-7}$，其中 $C_i>0$ 是各归一化形状的四阶导数平方积分。对 $T_1$ 求导，驻点满足 $C_1/T_1^8=C_2/T_2^8$，即 $T_1/T_2=(C_1/C_2)^{1/8}$。若 $C_1=256C_2$，就应按2∶1分配，而非均分；代价的二阶导数为正，故这个简化问题的驻点是最小值。[Modern Robotics的路径—时间分离](https://modernrobotics.northwestern.edu/nu-gm-book-resource/9-4-time-optimal-time-scaling-part-1-of-3/)帮助确定哪些量固定。原论文外层还会重新求系数并受连接和约束影响，上式不是其一般闭式解。

</details>

## 七、把几何轨迹与时间安排分开求解

- **教学联系**：[TOPP-RA：先算哪里还能刹住，再决定哪里可以加速](093-toppra.md)。把固定路径的时间分配单独作为受约束问题。

## 八、自测与参考答案

### 问题 1：为什么最小 snap 不是最小能耗？

**答案**：它压低位置四阶导数平方，和力矩需求有关，却没有直接积分电功率。悬停的 snap 为零但仍耗电，已足以说明两个目标不同。

### 问题 2：固定分段时间时是凸 QP，为什么整个时间优化不能也叫凸 QP？

**答案**：系数子问题的矩阵在给定时间后固定；改变分段时间时，成本与约束矩阵也随之变化。外层需反复调用子问题并搜索配时，子问题的凸性不自动传递到整个嵌套问题。

### 问题 3：1 厘米走廊与 8 厘米跟踪误差是否矛盾？

**答案**：它们来自不同实验条件，而且分别描述参考曲线约束与真实执行误差。即使同一实验也应分别考虑：安全余量必须覆盖机体外形、参考偏差、定位误差和跟踪误差，不能把规划器的数值约束当作真实系统误差上界。
