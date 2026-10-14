# 007｜混合位置／力控制：沿桌面移动，同时保持接触压力

[系列首页](README.md) · [上一篇](006-ransac.md) · [下一篇](008-lucas-kanade.md)

**原论文**：M. H. Raibert、J. J. Craig，*Hybrid Position/Force Control of Manipulators*，1981。[原文PDF](https://fab.cba.mit.edu/classes/865.15/classes/measurement/hybrid-position-force.pdf)。本文依据任务约束、控制架构及实验段落；PDF页码从1起计。文中的现代紧凑公式用于解释分工，不代替原文具体实现。

### 先接住前作的问题

[任务速度控制](004-resolved-rate.md)简化了自由空间协调，接触后却不能同时任意指定同方向的位置和力。本篇在约束坐标系中分配两类反馈。

## 一、问题设定：擦拭任务怎样分别指定切向运动和法向力

机器人擦桌子时，沿桌面的方向希望按轨迹移动，垂直桌面则希望保持适当压力。若两个方向都严格追踪位置，桌面高度的几毫米误差就可能产生很大接触力；若都控制力，又难保证擦拭路线。

### 自然约束和人为目标

桌面不允许工具穿透，因此法向位置受到环境约束。理想无摩擦表面不能沿切向产生任意接触力，因此切向力也有自然限制。控制器应在这些物理约束允许的剩余方向指定任务，而非提出互相矛盾的目标。

原文[图 1](#rc-7-figure-1)用转动曲柄与螺丝刀示意自然约束与人工约束。人工约束指任务规定的运动和力要求，不表示用软件就可以违反真实接触规律。

<!-- figure-ref-v6:start:rc-7-figure-1 -->
<figure class="reading-evidence-figure" id="rc-7-figure-1"><a href="/robot-classic/assets/figure-refs-v6/007-fig-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/007-fig-1.png" width="603" height="580" alt="Raibert与Craig（1981）图1：转曲柄与拧螺丝两种任务的约束坐标、自然约束和人工约束" loading="lazy"></a><figcaption>M. H. Raibert、J. J. Craig（1981），图 1，PDF 第 2 页；<a href="https://fab.cba.mit.edu/classes/865.15/classes/measurement/hybrid-position-force.pdf#page=2" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：两个面板的允许运动与作用力不同，约束方向取决于接触任务。
<!-- figure-ref-v6:end:rc-7-figure-1 -->

| 要素 | 论文与教学设定 |
|---|---|
| 测量 | 关节位置和腕部力传感器 |
| 任务输入 | 任务坐标中的位置／姿态轨迹与力／力矩轨迹 |
| 关键中间量 | 坐标变换、选择矩阵、两类误差 |
| 控制输出 | 共同作用于机械臂的驱动量 |
| 先验条件 | 有效的接触约束方向由任务设定提供 |

原文明确指出，选择约束集合的方法仍需进一步研究；论文主要解决给定约束之后的低层架构问题。不能把它解读为自动理解任意装配任务的完整系统。

## 二、统一任务坐标，再选择互补的力与位置误差

### 方法：先统一坐标，再选择误差

设S选择力控制方向，I−S选择位置方向。在一个简单的正交任务坐标示意中：

$$
u_{task}=S\,C_f(f_d-f)+(I-S)\,C_x(x_d-x).
$$

$C_f,C_x$分别表示适当的反馈补偿，不要求一定是同一种PID。若用任务力旋量表示合成控制作用，可再通过相应雅可比转置映射到关节。真实实现还需要处理速度、动力学及单位，不能把位置误差和牛顿数直接相加。

原文把S中为1的方向定义为力控制；其他资料可能采用相反定义，阅读代码时必须核对。选择矩阵作用在任务方向，而不是直接作用在关节编号上。

力旋量的变换包含力矩参考点变化：同一把力在不同原点下有不同力矩。只旋转三个力分量而忽略力臂，会在工具偏置较大时产生错误反馈。

选方向并不一定意味着在世界坐标里删掉几行。对平面上的无摩擦接触，设单位法向 $n$，则世界坐标中的法向力投影为 $P_f=nn^\top$，切向运动投影为 $P_v=I-nn^\top$。它们满足 $P_f^2=P_f$、$P_v^2=P_v$、$P_fP_v=0$，所以理想法向力与允许切向速度满足 $f^\top v=0$。这是接触约束的功率正交关系，并不表示两个关节各负责一个方向。

原创倾斜面例：$n=(1,1)^\top/\sqrt2$，则 $P_f=\tfrac12\begin{bmatrix}1&1\\1&1\end{bmatrix}$。世界坐标速度要求 $(0.2,0)$ 投影到切向后是 $(0.1,-0.1)$；5 N法向力对应世界坐标 $(5/\sqrt2,5/\sqrt2)$。若沿用水平桌面的 $S=\operatorname{diag}(0,1)$，同一命令便会误向斜面内部运动。先确定约束系，再选择方向，是算法机制而非排版习惯。

以上投影只针对同单位的平移子空间。扩展到六维力旋量时，力与速度按对偶坐标变换，平移和转动也不能无尺度地共用欧氏长度。[Resolved-rate](004-resolved-rate.md)提供局部速度接口，[操作空间控制](018-operational-space.md)进一步处理任务惯性，均可与约束分工组合；[阻抗控制](013-impedance.md)选择规定力与运动的动态关系，是另一种接触设计思路，不能把它直接改名为混合控制。

选择矩阵只有在统一任务坐标中才表示力位分工。下面用桌面高出模型两毫米的例子检查：法向反馈是否仍追逐错误位置，切向运动是否保留。

## 三、实现两路反馈，检查桌面高度误差的后果

```text
输入：期望位置xd、期望接触力fd、任务坐标与选择矩阵S
每个控制周期：
    测量关节位置q和腕部力旋量f_sensor
    用运动学得到任务坐标下的末端位置x
    把力旋量从传感器坐标变换到任务坐标
    计算位置误差与力误差
    用I-S和S选择各自负责的方向
    经过相应补偿与坐标映射，合成关节驱动量
    执行并继续反馈
输出：符合任务约束的运动与接触力
```

### 教学例子：桌面位置估错时会怎样

设工具希望施加5 N法向力，桌面实际比模型高2毫米。纯位置控制仍试图压到模型高度，接触力由环境刚度决定，可能远超5 N。混合控制在法向使用力误差，达到期望力后不再执着于错误的法向位置。

与此同时，切向位置仍沿预设轨迹变化，因此工具可以边压边擦。如果把法向位置和法向力同时当作独立硬目标，在刚性接触下通常会出现矛盾：环境已经决定了接触位置，控制器不能独立指定任意位置和任意力。

这个构造例没有包含摩擦变化。真实擦拭中切向摩擦会影响动力学，任务坐标方向也可能随曲面变化。必须通过额外模型、估计或适应性控制处理，不能只用一张固定S矩阵覆盖所有表面。

## 四、把平面接触实验、扰动与图中响应对应起来

<!-- figure-ref-v6:start:rc-7-figure-7-anchor -->
<span id="rc-7-figure-7"></span>
<!-- figure-ref-v6:end:rc-7-figure-7-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/007-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/007-evidence.png" width="798" height="704" alt="Fig. 7：下方实线对应 1、5、10 N 力阶跃，5 N 的虚线是仿真；上方位置曲线只记录了 10 N 阶跃时的位置保持" loading="lazy"></a><figcaption>原论文结果图／表摘引：M. H. Raibert、J. J. Craig（1981），Fig. 7，PDF 第 6 页；<a href="https://fab.cba.mit.edu/classes/865.15/classes/measurement/hybrid-position-force.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：下方实线对应 1、5、10 N 力阶跃，5 N 的虚线是仿真；上方位置曲线只记录了 10 N 阶跃时的位置保持。把这两种来源和设置分清，才不会把一条位置轨迹误读成所有目标力下的共同结果。

原实验使用Scheinman机械臂的两个关节，在一个平面内与数控X-Y台接触。腕部装有力传感器，台面能够产生可控的位置扰动。该布局让作者分别检验法向力与切向位置的调节，而不是直接展示所有六自由度装配任务。

**[图 2](#rc-7-figure-2)、The Hybrid Controller。** 两种反馈先变换、再共同控制机构；架构中的任务方向分工；不能据此推出：任意反馈增益都稳定。

<!-- figure-ref-v6:start:rc-7-figure-2 -->
<figure class="reading-evidence-figure" id="rc-7-figure-2"><a href="/robot-classic/assets/figure-refs-v6/007-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/007-fig-2.png" width="580" height="656" alt="Raibert与Craig（1981）图2：位置反馈、力反馈、坐标变换及共同驱动机械臂的混合控制结构" loading="lazy"></a><figcaption>M. H. Raibert、J. J. Craig（1981），图 2，PDF 第 3 页；<a href="https://fab.cba.mit.edu/classes/865.15/classes/measurement/hybrid-position-force.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：两路误差经过各自坐标变换和控制器，最后作用于同一台机械臂。
<!-- figure-ref-v6:end:rc-7-figure-2 -->

**[图 3–4](#rc-7-figure-3)、Experiments。** 平面机械臂、腕力传感器与X-Y台；物理实验设置可追溯；不能据此推出：完整复杂装配的泛化。

<!-- figure-ref-v6:start:rc-7-figure-3 -->
<figure class="reading-evidence-figure" id="rc-7-figure-3"><a href="/robot-classic/assets/figure-refs-v6/007-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/007-fig-3.png" width="581" height="432" alt="Raibert与Craig（1981）图3：Scheinman机械臂两个关节与数控X-Y反作用台的平面实验布局" loading="lazy"></a><figcaption>M. H. Raibert、J. J. Craig（1981），图 3，PDF 第 4 页；<a href="https://fab.cba.mit.edu/classes/865.15/classes/measurement/hybrid-position-force.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：图中反作用表面的位置与手部接触方向说明了力和位置实验各自受控的方向。
<!-- figure-ref-v6:end:rc-7-figure-3 -->

<!-- figure-ref-v6:start:rc-7-figure-4 -->
<figure class="reading-evidence-figure" id="rc-7-figure-4"><a href="/robot-classic/assets/figure-refs-v6/007-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/007-fig-4.png" width="610" height="379" alt="Raibert与Craig（1981）图4：机械臂和腕部Maltese Cross力传感器的结构" loading="lazy"></a><figcaption>M. H. Raibert、J. J. Craig（1981），图 4，PDF 第 4 页；<a href="https://fab.cba.mit.edu/classes/865.15/classes/measurement/hybrid-position-force.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：右侧放大图标出应变片位置；此处展示传感器结构，并非控制响应曲线。
<!-- figure-ref-v6:end:rc-7-figure-4 -->

**[图 7](#rc-7-figure-7)、Results and Discussion。** 1、5、10 N力阶跃；在该配置下可调节力并保持位置；不能据此推出：所有环境刚度下都具有同样响应。

**[图 8](#rc-7-figure-8)。** 台面以0.65 cm/s退让时维持接触力；能应对所测试的表面位移扰动；未知快速冲击下的保证。

<!-- figure-ref-v6:start:rc-7-figure-8 -->
<figure class="reading-evidence-figure" id="rc-7-figure-8"><a href="/robot-classic/assets/figure-refs-v6/007-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/007-fig-8.png" width="588" height="485" alt="Raibert与Craig（1981）图8：台面退让扰动下的X方向力、Y方向位置和X方向台面位移三条时间曲线" loading="lazy"></a><figcaption>M. H. Raibert、J. J. Craig（1981），图 8，PDF 第 6 页；<a href="https://fab.cba.mit.edu/classes/865.15/classes/measurement/hybrid-position-force.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：从下方台面位移上升的区间，对照上方力和位置响应，才能读出退让扰动的影响。
<!-- figure-ref-v6:end:rc-7-figure-8 -->

**附录A及实现讨论。** 增益经验选择、存在限幅；实验依赖具体调节；不能据此推出：自动最优或无需调参。

作者报告[图 7](#rc-7-figure-7)上升时间约0.15秒、稳态最大力误差小于1 N，并讨论积分项与库仑摩擦相关的微小极限环。它们是该台设备和增益下的观察，不能当成混合控制的普遍性能常数。

原文还说明实验没有补偿机械臂完整的非线性时变动力学，也未修正手部加速惯性力。这个信息解释了实验的适用范围：较温和任务中的可行性，不是对任意快速运动的动态解耦证明。

## 五、约束接触几何、反馈延迟与动态范围

几何正交与物理对偶需要谨慎区分。速度和力旋量通过功率配对，跨坐标或含平移／转动混合时，不能把普通欧氏投影直觉无条件应用。后续文献讨论过运动学稳定性与正确分解问题，这进一步说明原始成功实验并非所有形式的统一保证。

复现还需要传感器零点、负载重力补偿和时间同步。力反馈延迟与硬环境可能使高增益振荡；接触刚建立或突然失去时，积分累积与模式切换也会产生问题。以更慢速度成功，不能证明高速任务同样可靠。

五个前置概念是：任务坐标让约束简单；自然约束来自物理接触；人工约束定义可选目标；选择矩阵分配反馈方向；力旋量同时包含力和力矩。

## 六、追问：任务坐标系随曲面法向转动时，固定选择矩阵为什么不够？

<details>
<summary>任务坐标系随曲面法向转动时，固定选择矩阵为什么不够？</summary>

**参考答案**：选择矩阵的含义依赖表达坐标。若仍在旧坐标中选择法向力和切向位置，机器人控制的方向就不再符合当前接触几何。应连同位置、力及相应映射一起更新坐标关系，并重新检查模型与反馈延迟；仅旋转一组数值而不统一其余量，会破坏原先的互补分工。

教学参照：[Modern Robotics 11.6 Hybrid Motion-Force Control](https://modernrobotics.northwestern.edu/nu-gm-book-resource/11-6-hybrid-motion-force-control/)。这里借用其先定约束方向再定控制分工的讲法。

</details>

## 七、继续设计交互关系与任务动力学

- **平行路线**：[阻抗控制：接触任务需要控制一种关系](013-impedance.md)。把交互目标写成力与运动的动态关系，而非仅按方向划分两类反馈。
- **模块组合**：[操作空间：直接设计夹爪的动力学行为](018-operational-space.md)。用任务动力学实现运动与力控制，仍需明确接触与坐标条件。

## 八、自测与参考答案

**问题1：能否让关节1只做力控、关节2只做位置控，得到同样效果？**

参考答案：通常不能。一个关节对多个任务方向都有贡献，任务方向也通常依赖多个关节。必须先在任务空间定义控制分工，再通过运动学映射协调执行器。

**问题2：同一方向能否任意指定位置和接触力？**

参考答案：一般不能独立指定。环境的刚度和接触关系把两者联系起来，特别是理想刚性表面已经约束位置。任务目标必须与自然约束一致。

**问题3：原实验稳定，为什么不能直接证明新的机械臂也稳定？**

参考答案：新设备的惯性、摩擦、传感器延迟、接触刚度和控制带宽都可能改变闭环动力学。需要重新分析和调节，架构可移植不等于参数和稳定性结论可直接复制。
