# 094｜Cheetah 凸 MPC：用简化模型提前安排四足机器人的支撑力

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](093-toppra.md) · [下一篇](095-legoloam.md)

**论文**：Jared Di Carlo、Patrick M. Wensing、Benjamin Katz、Gerardo Bledt、Sangbae Kim，*Dynamic Locomotion in the MIT Cheetah 3 Through Convex Model-Predictive Control*，IROS 2018。[论文 DOI](https://doi.org/10.1109/IROS.2018.8594448) · [MIT 作者稿](https://dspace.mit.edu/bitstream/handle/1721.1/138000/convex_mpc_2fix.pdf) · [实验室代码](https://github.com/mit-biomimetics/Cheetah-Software)。

### 先接住前作的问题

[质心动力学规划](080-wholebody-qp.md)保留全身运动学一致性，但在线高频求解仍昂贵；Cheetah 凸 MPC 选择固定接触计划和参考几何，以更简化的单刚体预测换取快速反馈。它与[接触隐式优化](072-contact-implicit.md)是不同取舍的平行路线，后者探索接触而本篇把接触时序交给上层。

## 一、问题设定：未来腾空阶段怎样提前影响当前接触力

四足机器人腾空时，不能继续用地面支撑力纠正机身。若控制器只盯着眼前姿态，它可能等到脚都离地才发现来不及调整。

### 问题定义：优化地面反力，不学习一套策略

输入包括机身状态、足点位置、接触时序和期望速度；MPC 输出未来各足地面反力，底层再转成关节力矩。这是模型驱动控制，不是强化学习训练。

预测状态可概括为机身位置、姿态、线速度和角速度。论文实现增加重力辅助状态，便于写成统一线性状态方程。这里“12 维机身运动状态”不应与机器人的 12 个驱动关节混为一谈。

任务不是自主选择“现在应该用哪种步态”。本文步态由人工设计，接触序列和速度参考来自上层命令；足点也使用启发式规划。接触检测能处理提前或延后触地，但不等于 QP 联合搜索任意接触顺序。

## 二、固定接触计划，以简化刚体模型建立凸QP

### 模型为什么要简化

完整机器人有浮动基座、腿部惯性、关节约束和接触切换。把所有这些都放入长时域非线性优化会增加计算负担，还可能产生局部最优与数值问题。

单刚体近似保留最关键的力学关系。用本文统一的重力向量约定：

$$
m\ddot p=\sum_i f_i+mg,\qquad
I\dot\omega+\omega\times(I\omega)=\sum_i r_i\times f_i.
$$

$r_i$ 是质心到足点的向量，$f_i$ 是接触力。相同大小的力作用在不同足点，对机身产生的转矩不同；保留这个三维关系，是它比纯平面控制更有表达力的原因。

论文进一步近似横滚、俯仰较小情况下的姿态关系，忽略相应旋转耦合项，并由参考轨迹预先确定预测时域中的偏航与足点关系。这样得到：

$$
x_{k+1}=A_kx_k+B_ku_k.
$$

**最关键的条件**是 $A_k,B_k$ 在本次求解时已给定。若把足点与姿态也作为自由变量，$r_i\times f_i$ 等项会重新引入非线性，不能继续宣称同一个问题仍是凸 QP。

作者认为在平台上忽略腿部动力学是可用的近似；这不是证明轻腿以外的所有四足平台都能采用同样模型。

### 优化问题：提前看见将来哪些脚不能用

教学形式如下：

$$
\min_{x,u}\sum_{k=0}^{H-1}
\|x_{k+1}-x^{\rm ref}_{k+1}\|_{Q_k}^2+
\|u_k\|_{R_k}^2,
$$

约束包括离散动力学、支撑足法向力范围、线性化摩擦约束，以及摆动足的力必须为零。

对于一只支撑足，文中使用的形式包括：

$$
f_{\min}\le f_z\le f_{\max},\qquad
|f_x|\le\mu f_z,\quad |f_y|\le\mu f_z.
$$

这是方锥形式的摩擦近似。不能不加辨别地称其为精确圆锥：若两个切向分量同时达到 $\mu f_z$，切向合力会达到 $\sqrt2\mu f_z$。实际摩擦系数的设定和保守程度必须考虑这一几何差异。这段是由约束直接得到的分析，不是论文做过的打滑消融。

数学目标优化状态跟踪和力的代价；算法变化是滚动预测和凸化；硬件指标则是能运行的步态、速度、姿态行为与耗时。小目标值不自动等于最小能耗，也不自动等于长期稳定性证明。

### 3.1 凝聚形式为什么更快

将未来状态展开为 $X=\mathcal A x_0+\mathcal B U$，代回目标后，只优化接触力序列 $U$。再去掉已经被规定为零的摆动足变量，可以缩小问题。

此时求解器找到的是给定简化模型、权重与接触序列下的凸问题最优解。它不是机器人全部可能步态中的全局最优，更不是没有模型误差的稳定保证。

把凝聚过程展开两步，就能看见凸性依赖哪些量固定。由 $x_1=A_0x_0+B_0u_0$、$x_2=A_1x_1+B_1u_1$，得到

$$\begin{bmatrix}x_1\\x_2\end{bmatrix}=\begin{bmatrix}A_0\\A_1A_0\end{bmatrix}x_0+\begin{bmatrix}B_0&0\\A_1B_0&B_1\end{bmatrix}\begin{bmatrix}u_0\\u_1\end{bmatrix}.$$

令堆叠参考为 $X_r$、跟踪权重为块对角矩阵 $Q\succeq0$、力权重为 $R\succ0$，凝聚目标的 Hessian 是 $H=2(\mathcal B^TQ\mathcal B+R)\succ0$。因此给定接触计划且约束可行时，有唯一最优力序列；若只要求 $R\succeq0$，仍可凸，却不一定唯一。这个结论不证明跨下一次重规划的闭环稳定性。

**原创腾空前手算。** 只考虑竖直运动，质量 $m=10$ kg、重力大小 $g=10\,\mathrm{m/s^2}$，初速度为零；接下来先支撑 $0.1$ s，再腾空 $0.1$ s。支撑总力为常数 $F$，腾空力为零，则最终速度为 $v_2=0.1(F/10-10)-1=0.01F-2$。希望腾空段结束时竖直速度为零，需要支撑阶段先给 $F=200$ N；只看当前静止状态而给平衡力 100 N，终点速度会是 $-1$ m/s。若力上限只有 150 N，则这一参考本来就无法精确跟踪，优化只能在约束内折中。

例子不模拟完整步态，却明确说明“预见未来零接触力”改变了当前力。凝聚结构对应[原稿IV-D式(27)–(32)](https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control)；原实验按步态选定一个周期的预测时域，不能把这里的两步和人为参数称为论文配置。

### 3.2 从接触力到关节力矩

支撑阶段通过坐标变换和足端雅可比转置将期望力映射成力矩。摆腿阶段则有位置/速度反馈与动力学前馈。原文式 1–4 描述这些环节。

因此“直接使用 MPC 力”不等于没有底层控制、状态估计或摆腿控制器。复现时若只实现 QP，机器人仍缺少完成运动所需的其他环节。

凸力规划依赖已给定接触和几何，在线反馈通过每周期重解实现。下面检查腾空区间的零支撑与摆腿接口，再读实机动作。

## 三、滚动更新支撑力并连接摆腿控制

```text
输入：估计状态、关节状态、期望速度、人工步态与接触检测
高速循环：
    更新状态估计和真实接触状态
    若到 MPC 更新时刻：
        生成短时参考轨迹与预测足点
        固定本次时域的接触计划和近似动力学矩阵
        凝聚状态，构造跟踪代价、力界和摩擦约束
        求解接触力 QP，保存第一段力
    对每条腿：
        支撑腿：将期望接触力映射到关节力矩
        摆动腿：跟踪足端轨迹，并处理提前触地
    更新电机力矩/电流指令
下一次 MPC 到来时根据新状态重新规划
```

### 一个自构例子

**自构例子，未运行**：假设下一段所有脚都会离地。只优化当前时刻的控制器可能等离地后才发现机身俯仰角速度过大；MPC 会在当前仍能施力时，通过前后足力差提前改变角动量。腾空阶段在模型中令接触力为零，不能凭空用地面力消除误差。

若把落脚时刻改晚，最优的当前支撑力通常也会变化。这说明预测的价值来自未来接触限制，而不是仅仅在代价里多加几个时间点。

五个前置概念：

1. **欠驱动**：当前可施加的控制不能独立调整所有运动方向。
2. **单刚体模型**：用机身整体质量与惯量近似复杂机器人。
3. **滚动时域**：规划一段未来，只执行开头，再根据新状态重算。
4. **摩擦锥**：限制接触力方向以描述不滑动的条件。
5. **凝聚 QP**：消去预测状态，仅以控制序列为主要变量。

## 四、读多步态、扰动与奔跑实机证据

<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/094-teaching.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/094-teaching.png" width="1100" height="650" alt="四足 MPC：在还能施力时，为腾空阶段做准备；这是本文自构的接触时序示意，不是 Cheetah 3 原实验" loading="lazy"></a><figcaption>原创教学图：本文手算与几何示意；<a href="https://doi.org/10.1109/IROS.2018.8594448" target="_blank" rel="noopener noreferrer">核对相关原文</a>。非原论文图，非实验数据。</figcaption></figure>

读图：这是本文自构的接触时序示意，不是 Cheetah 3 原实验。黄色阶段没有地面控制力，预测的价值在于提前改变支撑期的角动量；原论文求解时间、扰动与高速实验图仍未补入。

### 实验设计：一个平台，多种动态行为

控制系统部分的图 2，以及第 V 节的图 4、5、7–10，可通过[公开正文和图注转录](https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control)核对说明。本轮尚未取得可可靠查看的原图或核实 PDF 页序，因此这个入口只算文字来源，不算已验证的原图入口；下文不新增曲线读数。

<!-- figure-ref-v6:start:rc-94-figure-gaps -->
<span id="rc-94-figure-2"></span><span id="rc-94-figure-4"></span><span id="rc-94-figure-5"></span><span id="rc-94-figure-7"></span><span id="rc-94-figure-8"></span><span id="rc-94-figure-9"></span><span id="rc-94-figure-10"></span><p class="figure-reference-note">原图暂缺：<a href="https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control" target="_blank" rel="noopener noreferrer">图 2</a>、<a href="https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control" target="_blank" rel="noopener noreferrer">图 4</a>、<a href="https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control" target="_blank" rel="noopener noreferrer">图 5</a>、<a href="https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control" target="_blank" rel="noopener noreferrer">图 7</a>、<a href="https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control" target="_blank" rel="noopener noreferrer">图 8</a>、<a href="https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control" target="_blank" rel="noopener noreferrer">图 9</a>、<a href="https://www.scribd.com/document/891748727/Dynamic-Locomotion-in-the-MIT-Cheetah-3-Through-Convex-Model-Predictive-Control" target="_blank" rel="noopener noreferrer">图 10</a>尚未取得；官方作者稿下载仍受限，现有原创教学图不计作原图。<a href="https://dspace.mit.edu/entities/publication/bc8c7e1e-5830-443f-a879-787947111fcf" target="_blank" rel="noopener noreferrer">官方作者稿与许可信息</a>。</p>
<!-- figure-ref-v6:end:rc-94-figure-gaps -->

MIT 存档本轮读取失败，结果可回看原稿全文镜像的图注；无法可靠查看的曲线不新增读数，Mini Cheetah 的后续结果不归入 Cheetah 3。

| 项目 | 原文设置与位置 | 想验证什么 | 解释限制 |
|---|---|---|---|
| 平台与输入 | Cheetah 3；IMU、关节编码器及电流控制；第 II、V 节 | 本体传感下的动态控制 | 不是视觉地形规划 |
| 时间预算 | 第 V-A 节；约一个步态周期的预测时域 | 在线计算能否跟上控制 | 优化频率不同于底层执行频率 |
| 多步态 | 站立、对角小跑、腾空小跑、侧对步、跳跃、前后跳及奔跑等 | 同一控制框架是否能适配不同接触安排 | 步态仍人工指定 |
| 扰动 | 踢击和非平整地面，第 V-C 节 | 能否恢复机身状态 | 未给出统一扰动力扫描 |
| 楼梯 | 四级台阶及散落木块，第 V-C 节 | 接触时机变化下的系统表现 | 有人工命令、摆腿高度修改和失败情况 |
| 高速 | 跑步机、机载计算，第 V-E/F 节 | 速度极限与跟踪能力 | 同时受机械、摆腿和场地限制 |

没有学习数据或环境采样预算。正文以实体演示和时间序列为主，没有覆盖各步态的随机种子、统一重复次数和置信区间表，也没有在同平台对全部现代控制器进行公平排行榜比较。

摘要与正文对更新频率给出不同范围：摘要写 20–30 Hz，第 V-A 节按步态写 25–50 Hz。本文保留这一差异，不把两处强行合成单一精确配置。底层状态估计、摆腿和阻抗控制以更高频率执行。

### 结果与证据强度

**图 2。** 各控制模块和频率；MPC 是完整控制链的一部分；不能据此推出：仅靠 QP 即能运动。

**图 4。** 奔跑时求解时间分布；简化优化具有低延迟实现潜力；不能据此推出：所有硬件或所有时域均小于 1 ms。

**图 5。** 转向与加减速跟踪；可控制三维方向运动；未知环境自主导航。

**图 7。** 踢击后的速度和姿态；本次扰动后恢复；不能据此推出：任意幅度扰动均可恢复。

**图 8–10。** 2.5 m/s 足部与力数据、到 3 m/s 的速度跟踪；在该平台实现动态奔跑；不能据此推出：长时间无失败可靠性。

最高 3 m/s 是硬件结果；第 V-F 节提到的 6 m/s 来自提高腿速后的全多体仿真，两者不能合并成“机器人跑到 6 m/s”。高速度失败还受到摆腿速度、跑步机宽度和机械问题影响。

楼梯部分尤其值得细读：三次尝试包含操作命令失误、脚踏出台阶、膝关节反向以及碰到电源开关等事件，只有第二次完整上下来回成功；第三次还发生恢复后继续尝试。原文没有提供能将这些过程统一归为某种成功率的正式协议。因此应报告试验经过，而不是简写“连续三次成功爬楼梯”。

## 五、保留接触计划、状态估计和旋转近似

贡献是找到模型表达力和计算速度之间可用的平衡：保留三维机身动力学与接触力限制，将足点、接触时序和部分姿态量放到优化之外，使支撑力问题快速可解。

作者将成功部分归因于频繁更新当前动力学、降低计算延迟。这是作者根据系统表现提出的解释，论文没有用完整消融证明“任何时候低延迟都比模型精确更重要”。

人工步态、启发式足点、近似摩擦、忽略腿部惯性和高速度摆腿限制构成适用边界。若携带会大幅改变惯量的负载、执行大姿态翻转，或需要在未知石块上选择足点，应重新检查模型与规划分工。

**本文分析**：凸 QP 保证的是数值优化问题的性质。真实闭环稳定还依赖模型误差、接触实现、状态估计、参考生成及递归可行性。不要把“每一步算到了最优”直接翻译成“整段运动一定不会摔倒”。

## 六、追问：把落脚时刻也开放为决策变量，为什么不能继续直接宣称原问题仍为同一凸QP？

<details>
<summary>把落脚时刻也开放为决策变量，为什么不能继续直接宣称原问题仍为同一凸QP？</summary>

**参考答案**：原线性化与约束组织以给定接触状态为前提，接触时刻变化会改变力可作用的区间和模型结构。应重新分析变量耦合与可行域，不能只在现有向量中追加一个变量。本文快速在线结果针对其明确的固定计划近似。

教学参照：[Underactuated Robotics: Trajectory Optimization](https://underactuated.mit.edu/trajopt.html)。这里借用其分开变量、离散约束与求解预算的讲法。

</details>

## 七、重新开放接触决策，或保留全身一致性

- **平行路线**：[手部 CIO：把何时接触、在哪里施力一起优化](072-contact-implicit.md)。探索接触活动与动作，承担更复杂的非凸求解。
- **平行路线**：[质心动力学与全身运动学：怎样少算方程而不丢掉身体](080-wholebody-qp.md)。保留更多全身运动学一致性，使用不同计算预算。

## 八、自测与参考答案

### 问题一：为什么本篇能求凸问题，却不能说四足运动规划本身是凸的？

**答案**：本篇在每次求解前固定接触时序、预测足点和近似动力学矩阵，只优化接触力。若同时优化接触选择、足点与完整姿态，离散切换及状态和力的乘积会重新带来非凸性。凸性来自明确的问题简化。

### 问题二：求解只花不到毫秒，为什么不等于整个控制系统都按千赫兹更新 MPC？

**答案**：求解时间是一次优化的计算延迟，更新频率是系统调度选择，还涉及模型准备、通信和其他模块。论文的 MPC 以几十赫兹更新，而底层控制更快；低延迟让新计划及时可用，不意味着所有模块频率相同。

### 问题三：为什么“硬件 3 m/s、仿真 6 m/s”不能写成该算法实现 6 m/s 实机奔跑？

**答案**：仿真提高了腿部速度条件，改变了执行器能力。实机高速限制涉及摆腿跟踪、机械与场地。两个结果回答不同问题：前者是现实平台已演示能力，后者是改变模型条件后的潜力分析。
