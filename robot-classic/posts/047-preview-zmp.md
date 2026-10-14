# 047｜ZMP 预瞄控制：下一步还没落地，身体就要开始准备

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](046-dstar-lite.md) · [下一篇](048-sift.md)

**论文**：Shuuji Kajita、Fumio Kanehiro、Kenji Kaneko、Kiyoshi Fujiwara、Kensuke Harada、Kazuhito Yokoi、Hirohisa Hirukawa，*Biped Walking Pattern Generation by Using Preview Control of Zero-Moment Point*，ICRA 2003，1620–1626。[原稿](https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf) · [DOI](https://doi.org/10.1109/ROBOT.2003.1241826)。

### 先接住前作的问题

[LIPM](027-lipm.md)易于求解，但若靠移动落脚点调平衡，就难走指定踏石。本篇由未来ZMP参考反求质心运动；[Capture Point](054-capture-point.md)在同类模型上另问受扰后何处能停。

## 一、问题设定：未来支撑参考怎样提前改变当前质心运动

人走上下一块石头时，不会等脚已经换过去才开始移动身体。稳定动态行走需要预先调整质心。机器人如果只根据此刻的支撑位置反应，往往来不及形成合适的速度。

### 背景：为什么只调整落脚点不够

一些简化倒立摆方法通过改变脚落在哪里保持平衡，但踏脚石或台阶的允许区域固定，不能为了稳定随意落脚。另一类精细动力学方法能满足指定 ZMP，却需要批处理整段轨迹或处理分段连接。

论文要在两者之间建立一个连续生成接口：由足步计划给出 ZMP 参考，在线递推简化质心轨迹，再映射为机器人关节运动。输入包含脚位、支撑时序、质心高度参数和机器人模型；输出质心、骨盆或关节参考。没有通过奖励训练策略，也没有从相机中自动识别楼梯。

ZMP 是接触平面上使合力矩水平分量为零的位置。适当的平面接触假设下，它与压力中心有关，但不等于质心的竖直投影。动态运动中加速度产生的惯性作用使两者分开。

## 二、由倒立摆写出ZMP模型，拆解三项控制作用

### 从倒立摆到桌面小车模型

对于高度参数为 $z_c$、忽略相关角动量效应的简化模型，水平一维满足

$$p=x-\frac{z_c}{g}\ddot x,$$

其中 $x$ 是质心水平位置，$p$ 是 ZMP，$g$ 是重力加速度。左右方向有同形方程。论文第 2 节通过倒立摆和桌面小车两种图示解释它：小车即使偏离桌脚中心，也可在适当加速度下使支撑力矩平衡。

已知 $x$ 求 $p$ 很简单，给定未来 $p$ 求平滑且合适的 $x$ 则是逆问题。若在 ZMP 突然换脚时才开始移动，质心的速度和位置准备已经迟了。预瞄利用的是**规划好的未来输入**，并不违反因果性，也没有假设能提前测到未知外力。

令 jerk $u=\dddot x$，状态 $X=[x,\dot x,\ddot x]^T$。采样周期 $T$ 下，原文式（13）可写成

$$X_{k+1}=AX_k+Bu_k,\qquad p_k=CX_k,$$
$$A=\begin{bmatrix}1&T&T^2/2\\0&1&T\\0&0&1\end{bmatrix},\quad B=\begin{bmatrix}T^3/6\\T^2/2\\T\end{bmatrix},\quad C=[1\;0\;-z_c/g].$$

这里 $u$ 是轨迹生成器中的 jerk，不是电机力矩。后续仍要通过运动学与控制器实现质心轨迹，不能把 $u$ 直接发给某个关节。

### 优化目标与三项控制作用

原文式（14）同时惩罚 ZMP 跟踪误差、状态变化和输入变化：

$$J=\sum_{i=k}^{\infty}\left[Q_e e_i^2+\Delta X_i^TQ_x\Delta X_i+R(\Delta u_i)^2\right],\qquad e_i=p_i-p_i^{ref}.$$

注意惩罚的是 $\Delta u$，不能悄悄改写成 $u^2$ 再称为原式。$Q_e,R>0$，$Q_x$ 半正定。不同权重改变跟踪与平滑之间的取舍。

采用文中预瞄伺服设计，控制由误差积分、状态反馈与未来参考的加权和组成。用累积误差状态 $E_k$ 避免原式求和指标的歧义，教学写成

$$E_k=E_{k-1}+e_k,\qquad u_k=-G_iE_k-G_xX_k-\sum_{j=1}^{N_L}G_p(j)p_{k+j}^{ref}.$$

积分处理累计跟踪偏差，状态反馈约束自身运动，预瞄项提前响应即将发生的支撑变化。增益由离散最优控制问题计算，不能随手把三个负号换成经验比例系数后声称是同一控制器。

预瞄时域越长，使用的未来参考越多，但远期增益通常衰减。衰减速度取决于参数与权重；原图中两秒后很小，只是那组设置的现象，不是所有机器人统一两秒就足够。

### ZMP先向后，质心才可能向前加速

由 $p=x-z_c\ddot x/g$ 看，质心位置 $x$ 不动时，要向前产生正加速度，就需要ZMP $p$在质心后方。**教学例**取 $z_c=0.8$米、$g=9.8$米/秒²、$x=0$，令 $p=-0.04$米，得到 $\ddot x=0.49$米/秒²。若ZMP误以为必须跟质心重合，模型反而给零加速度。

对常值jerk $u=\dddot x$、采样周期 $h$，位置一步更新为 $x^+=x+h\dot x+h^2\ddot x/2+h^3u/6$；加速度更新为 $\ddot x^+=\ddot x+hu$。预瞄未来支撑切换，就是提前通过这些积分状态调整ZMP输出，而非在换脚瞬间硬改质心位置。

本篇承接[LIPM](027-lipm.md)易算的水平动力学，解决已指定踏石落脚位置时的运动生成；后续[Capture Point](054-capture-point.md)从捕获条件研究受扰恢复，是相关模型上的不同目标。[原稿第1–3节](https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf)明确踏石限制及小车桌面模型；其模型生成与多体修正实验，不应等价成实时避障或任意接触安全保证。

### 从脚位到关节参考的教学流程

这份流程没有自动优化脚位，也没有提供摩擦锥、关节力矩或碰撞约束的完整求解。初始参考应与支撑区域匹配；最终轨迹还要检验机器人是否真正能实现。

未来ZMP参考进入预瞄项，详细动力学偏差则进入补偿层。下面按脚位到关节参考的顺序检查两层接口，再比较预瞄长度的实验结果。

## 三、从脚位生成关节参考，并检查模型偏差补偿

```text
输入：足步位置与时序、模型高度、机器人几何和惯性参数
根据单支撑与双支撑阶段生成未来 ZMP 参考
离线求解预瞄伺服增益 Gi、Gx、Gp
每个轨迹生成周期：
    从缓冲读取未来 NL 步参考
    更新 ZMP 跟踪误差积分
    计算状态反馈与预瞄项，得到 jerk
    递推质心位置、速度和加速度
    联合脚部参考，通过逆运动学生成机器人姿态
    用精细多刚体模型计算预期 ZMP
    若采用补偿层：将预测模型偏差放入缓冲并生成修正
输出：经过动力学检查的运动参考
```

### 自构例子与五个前置概念

假设一秒后支撑从左脚换到右脚。如果控制器只看当前 ZMP 参考，直到一秒时才开始把身体横移，可能来不及形成合适速度。预瞄项在此前已经看见未来参考，逐渐调整质心，使换脚时状态更接近所需轨迹。

若机器人突然被推，这个未来参考并不包含推力。状态反馈可以作出响应，但补偿能力受模型和控制权限限制。预瞄已知计划与预测未知事件，是两个不同的问题。

五个前置概念：**质心**描述整体质量平均位置；**ZMP**描述接触合力矩的特定零点；**jerk**是加速度变化率；**最优伺服**兼顾跟踪与控制代价；**预瞄**利用已知未来参考提前行动。

## 四、对照预瞄长度、误差补偿与行走实验

<!-- figure-ref-v6:start:rc-47-figure-11-anchor -->
<span id="rc-47-figure-11"></span>
<!-- figure-ref-v6:end:rc-47-figure-11-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/047-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/047-evidence.png" width="671" height="595" alt="Fig. 11：补偿后的多刚体 ZMP 与简化模型参考轨迹放在一起，观察拐点附近仍存在的差异" loading="lazy"></a><figcaption>原论文结果图／表摘引：Kajita 等（2003），Fig. 11，PDF 第 6 页；<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：补偿后的多刚体 ZMP 与简化模型参考轨迹放在一起，观察拐点附近仍存在的差异。改善来自该模型和轨迹下的误差补偿，不是实机上绝对不变的厘米级精度。

HRP-2P 楼梯行走是动力学仿真。预瞄参考已知不等于提前知道未知扰动，ZMP 跟踪图也不独自证明全身接触可行。

| 原文项目 | 设置与目的 | 不能外推的内容 |
|---|---|---|
| [Fig. 6](#rc-47-figure-6) 增益 | $T=5$ ms、$z_c=0.814$ m、$Q_e=1$、$Q_x=0$、$R=10^{-6}$ | 这是一组控制设计，不是神经网络训练预算 |
| [Fig. 7–8](#rc-47-figure-7) | 比较 1.6 s 与 0.8 s 预瞄，三步向前运动 | 时间不足时跟踪变差，不是所有模型统一的最短预瞄长度 |
| [Fig. 9](https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=5)–[图 11](#rc-47-figure-11) | HRP-2P 物理参数，身高 154 cm、质量 58 kg；简化与多刚体 ZMP 比较 | 机器人照片不代表后面曲线均来自实机测量 |
| 补偿层 | 0.75 s 预瞄，预测模型误差后修正轨迹 | 使用精细模型信息并有缓冲安排，不是未知扰动的即时抵消 |
| [Fig. 12](#rc-47-figure-12)–[图 13](https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=7) | OpenHRP 中旋转楼梯行走 | 动力学仿真，不是实机泛化成功率 |
| 统计范围 | 展示轨迹与最大误差，无多随机环境成功率表 | 有效演示不等于各种摩擦和载荷下的鲁棒验证 |

<!-- figure-ref-v6:start:rc-47-final-source-gap-note -->
<span id="rc-47-figure-9"></span><span id="rc-47-figure-13"></span><p class="figure-reference-note">尚未内嵌：<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=5" target="_blank" rel="noopener noreferrer">图 9</a>、<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=7" target="_blank" rel="noopener noreferrer">图 13</a>。已展示旋转楼梯的 ZMP/质心技术投影和预瞄控制定量结果；剩余机器人照片与连续楼梯动作渲染对当前稳定性评论没有新增定量检验，暂不继续扩展演示影像集合。</p>
<!-- figure-ref-v6:end:rc-47-final-source-gap-note -->





<!-- figure-ref-v6:start:rc-47-figure-12-reviewed -->
<figure class="reading-evidence-figure" id="rc-47-figure-12"><a href="/robot-classic/assets/figure-refs-v6/047-fig-12-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/047-fig-12-reviewed.png" width="640" height="471" alt="旋转楼梯上预瞄规划的ZMP与质心投影" loading="lazy"></a><figcaption>原论文图摘引：Shuuji Kajita、Fumio Kanehiro、Kenji Kaneko、Kiyoshi Fujiwara、Kensuke Harada、Kazuhito Yokoi、Hirohisa Hirukawa，Biped Walking Pattern Generation by Using Preview Control of Zero-Moment Point，ICRA 2003，1620–1626，图 12，PDF 第 6 页；<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。点击图片可放大。</figcaption></figure>

读图：阶梯状支撑区域和两条投影轨迹对应同一已知楼梯几何；它是规划/仿真设置，不能解读为实机成功率。
<!-- figure-ref-v6:end:rc-47-figure-12-reviewed -->


**第一处：[Fig. 5](#rc-47-figure-5)，第 1622 页。** 支撑切换前质心已开始移动，用一个时间关系说明预瞄的必要性。它不是算法加速图，而是逆问题的物理解释。

<!-- figure-ref-v6:start:rc-47-figure-5 -->
<figure class="reading-evidence-figure" id="rc-47-figure-5"><a href="/robot-classic/assets/figure-refs-v6/047-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/047-figure-5.png" width="520" height="272" alt="原论文 Figure 5：ZMP阶跃目标与质心提前移动" loading="lazy"></a><figcaption>原论文图摘引：Kajita 等（2003），Figure 5，PDF 第 3 页；<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=3" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：左图的质心曲线在ZMP参考跳变前开始变化，右图以小车桌模型解释运动方向；这是预瞄控制的因果输入设置。
<!-- figure-ref-v6:end:rc-47-figure-5 -->

**第二处：[Fig. 6–8](#rc-47-figure-6)，第 1623–1624 页。** 远期增益衰减，1.6 秒参考给出较好的跟踪，0.8 秒产生欠调或过调。作者指出短预瞄下状态反馈仍可保持所讨论系统稳定；跟踪准确与内部稳定不是同一指标。

<!-- figure-ref-v6:start:rc-47-figure-6 -->
<figure class="reading-evidence-figure" id="rc-47-figure-6"><a href="/robot-classic/assets/figure-refs-v6/047-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/047-figure-6.png" width="534" height="224" alt="原论文 Figure 6：预瞄增益随未来时间衰减" loading="lazy"></a><figcaption>原论文图摘引：Kajita 等（2003），Figure 6，PDF 第 4 页；<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=4" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：横轴是向前看的时间，纵轴为预瞄增益；较近的未来目标影响更大，曲线并不是机器人执行后的跟踪误差。
<!-- figure-ref-v6:end:rc-47-figure-6 -->

<!-- figure-ref-v6:start:rc-47-figure-7 -->
<figure class="reading-evidence-figure" id="rc-47-figure-7"><a href="/robot-classic/assets/figure-refs-v6/047-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/047-figure-7.png" width="507" height="395" alt="原论文 Figure 7：较长预瞄时间的前向和侧向轨迹" loading="lazy"></a><figcaption>原论文图摘引：Kajita 等（2003），Figure 7，PDF 第 5 页；<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：上、下图分别看x与y，ZMP实线紧跟参考的分段变化，而质心轨迹平滑跨越步间切换。
<!-- figure-ref-v6:end:rc-47-figure-7 -->

<!-- figure-ref-v6:start:rc-47-figure-8 -->
<figure class="reading-evidence-figure" id="rc-47-figure-8"><a href="/robot-classic/assets/figure-refs-v6/047-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/047-figure-8.png" width="507" height="399" alt="原论文 Figure 8：缩短预瞄时间后的前向和侧向轨迹" loading="lazy"></a><figcaption>原论文图摘引：Kajita 等（2003），Figure 8，PDF 第 5 页；<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：与图7使用相同轴比较，参考跳变附近出现更明显的ZMP偏差；不能只看最终位置相近就断定中途稳定性相同。
<!-- figure-ref-v6:end:rc-47-figure-8 -->

**第三处：[Fig. 10](#rc-47-figure-10)–[图 11](#rc-47-figure-11)，第 1624–1625 页。** 多刚体模型相对简化轨迹的最大 ZMP 误差，从 x 方向 2.3 厘米、y 方向 1.6 厘米降到 1.2 厘米和 0.4 厘米。这支持该模型和轨迹上的补偿效果，不能称为实机绝对精度。若自行计算，相对下降分别约 47.8% 与 75%，分母为各自补偿前最大误差。

<!-- figure-ref-v6:start:rc-47-figure-10 -->
<figure class="reading-evidence-figure" id="rc-47-figure-10"><a href="/robot-classic/assets/figure-refs-v6/047-figure-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/047-figure-10.png" width="507" height="395" alt="原论文 Figure 10：小车桌模型与多体模型的ZMP差异" loading="lazy"></a><figcaption>原论文图摘引：Kajita 等（2003），Figure 10，PDF 第 5 页；<a href="https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：图例区分多体模型ZMP、小车桌ZMP和质心；同一动作在多体模型下出现额外偏差，形成随后图11修正的动机。
<!-- figure-ref-v6:end:rc-47-figure-10 -->

**第四处：[Fig. 12](#rc-47-figure-12)–[图 13](https://people.csail.mit.edu/katiebyl/kb/DW2008/papers_of_tangential_interest/kajita03.pdf#page=7)，第 1625–1626 页。** 楼梯台阶高 0.1 米、每步旋转 24 度、内外半径 0.7 与 1.3 米。足步和约束面由楼梯几何给定，所有高度截距参数需相同；不是任意未知不规则地形输入后自动生成安全路线。

**第五处：第 5 节结论，第 1625 页。** 作者明确将真实机器人实现列为下一目标。这个声明限定了论文证据，不影响步态生成思想的价值，但阻止把仿真推广成已经完成的实机结果。

## 五、保留落脚可行性、模型精度与预知范围

贡献是将既有最优预瞄理论用于 ZMP 步态逆问题，并利用同一机制补偿简化模型与多刚体模型的差异。预瞄控制本身早于本文，作者第 3.2 节明确回顾其发展，不能把整套预瞄思想都归为机器人论文首次提出。

若未来脚位突然改变，已经生成的质心状态未必能立即适应新参考；若摩擦不足，ZMP 落在支撑区域也不保证不打滑。低脚宽、大速度和力矩饱和会进一步限制可行轨迹。把 ZMP 参考设在脚中心，只规定一个平衡相关量，并没有自动满足所有接触和执行器条件。

补偿使用精细模型，意味着简化模型没有取代完整模型，而是充当高效的轨迹生成核心。模型参数错误、接触冲击与柔性会令预测误差与真实误差不同，仍需要反馈和实验检验。

## 六、追问：比较两种预瞄长度时，为什么必须保持未来ZMP参考和补偿层一致？

<details>
<summary>比较两种预瞄长度时，为什么必须保持未来ZMP参考和补偿层一致？</summary>

**参考答案**：改变参考轨迹或补偿方式也会改变跟踪难度和模型误差，无法再单独解释预瞄长度的影响。应固定落脚与时序，分别记录主轨迹和补偿量的结果。正文两层预瞄承担的信号不同，某层可缩短不证明另一层也可同样缩短。

</details>

## 七、从计划步态转向受扰停止与滚动控制

- **教学联系**：[Capture Point：被推之后，脚要落在哪里才能停下来](054-capture-point.md)。在同类低维模型上转而分析受扰后的可停止性。
- **模块组合**：[Cheetah 凸 MPC：用简化模型提前安排四足机器人的支撑力](094-cheetah-mpc.md)。用滚动优化选择未来接触作用，还须满足接触约束。

## 八、自测与参考答案

**问题 1：控制器使用未来输入，为什么没有违反因果性？**

**参考答案**：未来输入是已经规划的 ZMP 参考，可以预先存入缓冲；它不是未来传感器观测或未知推力。控制器根据当前已知的计划行动，和驾驶员提前看见弯道相同。

**问题 2：ZMP 跟踪得好，是否足以证明机器人不会摔倒？**

**参考答案**：不够。还要满足支撑和摩擦条件、关节及力矩限制、足部接触和跟踪能力；模型计算出的 ZMP 也可能与真实接触不同。它是重要的平衡相关量，不是包含全部物理限制的单一证书。

**问题 3：为什么补偿层可以用比主轨迹更短的预瞄时间，却不说明主层也能随意缩短？**

**参考答案**：两层处理的参考幅值和频率结构不同，论文中的补偿量较小，0.75 秒已对该误差有效。主层需要完成支撑切换的较大运动，短时域实验已显示跟踪变差。参数是否足够应由对应模型与任务验证。


