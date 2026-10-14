# 012｜可操作度：能到达的位置，不一定容易运动

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](011-brockett.md) · [下一篇](013-impedance.md)

**论文**：Tsuneo Yoshikawa，*Manipulability of Robotic Mechanisms*，IJRR，1985，4(2):3–9。[出版页](https://doi.org/10.1177/027836498500400201) · [作者保存的论文](https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf)。

### 先接住前作的问题

[速度逆控制](004-resolved-rate.md)能算出指令，却还需要知道某姿态在哪些方向特别吃力。本篇把速度球经雅可比映成椭球。

## 一、问题设定：同一末端位置附近哪些运动方向更困难

把手臂完全伸直时，你仍能把手沿某些方向移动，但沿手臂轴线的瞬时运动会很困难。关节不是坏了，问题在于多个关节贡献的运动方向发生了重合。单纯知道“末端位于工作空间内”，不足以描述这种差别。

### 问题定义：需要先说清“容易”是什么

设机器人有 $n$ 个关节，任务用 $m\le n$ 个变量 $x=f(q)$ 表示，局部速度关系为 $\dot x=J(q)\dot q$。这里的任务可以只关心位置，也可以包含姿态。若任务变量选择不同，同一机械臂得到的雅可比与指标也会不同。

“容易”在这里采用关节速度的欧氏范数，而不是能耗、驱动力矩或碰撞风险。这个限定非常关键：轻轻转一个重关节与转一个轻关节，速度相同但成本未必相同。若把运动学可操作度直接解释成动力学能力，就跨越了论文所用问题定义。

没有环境交互训练和奖励。实际应用可在设计阶段比较连杆长度，也可在控制阶段比较同一末端目标对应的冗余姿态。作者引言明确将机构设计与工作姿态选择作为动机；后面的优化控制策略需要额外设计。

## 二、把关节速度球映成椭球，再解释体积指标

Yoshikawa 用雅可比映射衡量机构的局部运动能力。原文结论说明指标在 1983 年已提出，这篇 1985 年文章扩展其性质和较佳姿态分析。把关节速度限制在单位球内，所有可能的末端速度形成一个椭球；椭球越扁，某些方向越难运动。可操作度用这个椭球的体积比例压缩表示整体能力。

### 从速度球推导椭球

约束 $\|\dot q\|_2\le1$。当 $J$ 满行秩时，能够实现给定末端速度的最小范数关节速度为 $J^\dagger\dot x$，因此可实现速度满足

$$
\dot x^T(JJ^T)^{-1}\dot x\le1,\qquad
w(q)=\sqrt{\det(JJ^T)}.
$$

对雅可比做奇异值分解 $J=U\Sigma V^T$，得到 $w=\prod_{i=1}^{m}\sigma_i$。$U$ 的列给出椭球方向，各 $\sigma_i$ 给出对应半轴长度。椭球体积等于单位球体积乘以 $w$，所以无需真的绘制椭球也能算体积比例。

为什么冗余机器人仍然可以这样计算？因为关节速度中落在 $J$ 零空间的部分不会产生末端速度，只会消耗速度范数预算。用最小范数解排除这部分后，边界恰好由上式描述。冗余意味着还有姿态调整余地，不意味着所有额外关节都直接扩大每个方向的能力。

当任意任务方向对应的奇异值变成零，$w=0$，椭球退化。这里的“零”是选定任务的局部降秩，不一定意味着整个机器人完全不能动。一个只能在平面运动的机构，若强行用六维末端任务评价，得到退化结果完全符合任务不匹配的事实。

椭球还可以回答“沿指定方向最快多快”，这个问题比总体体积更贴近任务。令 $A=JJ^\top$，指定单位方向 $a$，要求末端速度严格等于 $sa$，代入椭球得

$$s_{\max}=\frac1{\sqrt{a^\top A^{-1}a}}.$$

而最大化投影 $a^\top\dot x$ 得到 $\sqrt{a^\top A a}$，二者不相同：后者允许速度同时偏向别的方向。原创教学例取 $J=\operatorname{diag}(2,1)$，$a=(1,1)/\sqrt2$，严格沿对角线的最大速率为 $\sqrt{8/5}\approx1.265$，最大对角线投影却为 $\sqrt{5/2}\approx1.581$。把椭球的支持函数误当径向能力，会高估按指定直线运动的能力。

若关节速度预算写作 $\dot q^\top Q\dot q\le1$，令 $y=Q^{1/2}\dot q$，再对 $JQ^{-1/2}$ 做同样推导，任务椭球矩阵就变为 $JQ^{-1}J^\top$。取 $Q=\operatorname{diag}(1,4)$，上例半轴变成 $(2,0.5)$，体积比例从2降为1。改变的是第二关节的允许速度尺度，不是物理连杆长度。原文第4–5页的归一化讨论应在这种尺度意义下理解。

椭球的方向与轴长都来自雅可比，体积只是最后一步压缩。两连杆例子先保留方向信息，才能解释相同位置附近为什么有些运动特别困难。

## 三、计算奇异方向，用二连杆构型作对照

```text
输入：关节姿态 q、任务映射 f、关节与任务变量尺度
J ← 计算 f 在 q 处的雅可比
按事先规定的尺度规范化 J
U, sigma, V ← 奇异值分解(J)
w ← 所有任务奇异值的乘积
最弱方向 ← U 中对应最小奇异值的一列
输出：w、最小奇异值、椭球各轴
```

伪代码额外输出最弱方向，是教学与诊断建议。原论文的指标定义不自动包含“最大化 $w$ 的控制器”。若以 $w$ 为目标做梯度上升，还必须保持主要任务、关节限位和碰撞约束，避免让辅助指标取代实际任务。

### 自构例子：二连杆手臂为何不宜伸直

设平面二连杆长度 $l_1,l_2$，任务只取末端二维位置。正运动学为 $x=l_1\cos q_1+l_2\cos(q_1+q_2)$、$y=l_1\sin q_1+l_2\sin(q_1+q_2)$。直接对关节角求导并计算行列式可得

$$w=|\det J|=|l_1l_2\sin q_2|.$$

于是 $q_2=0$ 时退化，$q_2=\pi/2$ 时达到该指标的最大值；$q_1$ 不改变体积，只把能力方向整体旋转。这与原文第 3.1 节二连杆例题一致；下面的半轴与单位换算是额外教学构造。

但设任务是穿过狭窄缝隙，伸直姿态可能反而必要。可操作度最大不等于任务最好。再比较半轴 $(10,0.1)$ 与 $(1,1)$，两者乘积同为 1，可第一个姿态在最弱方向明显更差。这解释了为什么工程中常同时看最小奇异值、条件数或指定方向能力。

若把长度单位从米改成毫米，两行位置雅可比都放大一千倍，二维 $w$ 就放大一百万倍。机器人实际没有变强。因此跨机器人比较前必须统一单位；混合位置和角度时，还需要明确特征长度等尺度约定。

## 四、区分机构例题与普遍任务成功率

<!-- figure-ref-v6:start:rc-12-figure-9-anchor -->
<span id="rc-12-figure-9"></span>
<!-- figure-ref-v6:end:rc-12-figure-9-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/012-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/012-evidence.png" width="1553" height="758" alt="Figs. 8–9：左图把最大可操作度随指尖位置的变化画成等值结构，右图对比两连杆的最佳姿态" loading="lazy"></a><figcaption>原论文方法图摘引：Tsuneo Yoshikawa（1985），Figs. 8–9，PDF 第 7 页；<a href="https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：左图把最大可操作度随指尖位置的变化画成等值结构，右图对比两连杆的最佳姿态。读图时应同时追踪位置与机构参数，不能把一个标量当成所有方向上的性能。

### 理论与机构例题提供了哪些证据

机械臂和手指图展示的是几何指标及最优姿态；它们没有提供实机闭环控制成功率。

| 原文位置 | 具体内容 | 支持范围 |
|---|---|---|
| 第 4 页，式（9）–（12） | 奇异值乘积、椭球体积比例及方阵绝对行列式 | 指标的数学含义；不等于指定方向性能 |
| 第 4–5 页，式（14）–（21） | 关节最大速度与任务速度尺度的归一化 | 作者已经考虑不同量纲与能力尺度，不能说原文完全忽视这个问题 |
| 第 5 页，第 3.1 节、[Fig. 1](#rc-12-figure-1)、式（23） | 二连杆的 $w=l_1l_2|\sin\theta_2|$ | 在该指标下直角肘较佳、固定总长时等长较佳；不代表所有操作任务的最佳设计 |
| 第 6–7 页，[Fig. 2](#rc-12-figure-2)–[图 4](#rc-12-figure-4) | SCARA、PUMA 的机构分析 | PUMA 考虑第一轴影响后，最佳肘角可小于直角，不能将平面例题机械推广 |
| 第 8–9 页，[Fig. 6](#rc-12-figure-6)–[图 9](#rc-12-figure-9) | 四关节手指最优姿态、位置与 w 等高线、条件数对照 | 体积与方向均匀性会给出不同最佳姿态 |

<!-- figure-ref-v6:start:rc-12-figure-1 -->
<figure class="reading-evidence-figure" id="rc-12-figure-1"><a href="/robot-classic/assets/figure-refs-v6/012-fig-1-redraw.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/012-fig-1-redraw.png" width="841" height="820" alt="据二连杆正运动学独立绘制的关节和末端几何图" loading="lazy"></a><figcaption>Tsuneo Yoshikawa（1985），对应图 1 的独立理论重绘（非原图转载），公式与模型见 PDF 第 3 页；<a href="https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>。</figcaption></figure>

读图：这是图1所用二转动关节模型的几何重绘，连杆姿态仅为示意；长度和角度进入同一正运动学，操纵度为两长度乘积再乘肘角正弦的绝对值。
<!-- figure-ref-v6:end:rc-12-figure-1 -->

<!-- figure-ref-v6:start:rc-12-figure-2 -->
<figure class="reading-evidence-figure" id="rc-12-figure-2"><a href="/robot-classic/assets/figure-refs-v6/012-fig-2-redraw.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/012-fig-2-redraw.png" width="829" height="812" alt="原创运动学重绘：SCARA: R–R–P–R structure" loading="lazy"></a><figcaption>Tsuneo Yoshikawa（1985），对应图 2 的独立理论重绘（非原图转载），公式与模型见 PDF 第 4 页；<a href="https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。</figcaption></figure>

读图：独立重绘保留了图2的两个平面转动关节、竖直移动关节和末端旋转关节结构；竖直移动与末端旋转不改变该模型中平面两杆决定的操纵度因子。
<!-- figure-ref-v6:end:rc-12-figure-2 -->

<!-- figure-ref-v6:start:rc-12-figure-3 -->
<figure class="reading-evidence-figure" id="rc-12-figure-3"><a href="/robot-classic/assets/figure-refs-v6/012-fig-3-redraw.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/012-fig-3-redraw.png" width="828" height="815" alt="原创运动学重绘：PUMA: first three joints" loading="lazy"></a><figcaption>Tsuneo Yoshikawa（1985），对应图 3 的独立理论重绘（非原图转载），公式与模型见 PDF 第 4 页；<a href="https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。</figcaption></figure>

读图：独立重绘对应图3忽略腕部尺寸后的前三个转动关节模型；第一轴改变整条手臂绕竖直轴的方位，末端到该轴的距离会进入操纵度。
<!-- figure-ref-v6:end:rc-12-figure-3 -->

<!-- figure-ref-v6:start:rc-12-figure-4 -->
<figure class="reading-evidence-figure" id="rc-12-figure-4"><a href="/robot-classic/assets/figure-refs-v6/012-fig-4-redraw.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/012-fig-4-redraw.png" width="1711" height="629" alt="由式29独立计算的三种PUMA连杆比例及最优肘角" loading="lazy"></a><figcaption>Tsuneo Yoshikawa（1985），对应图 4 的独立理论重绘（非原图转载），公式与模型见 PDF 第 5 页；<a href="https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。</figcaption></figure>

读图：按原文公式重算，三种连杆比的最优肘角均小于90度；不同于仅考虑平面二连杆面积，第一轴的力臂也影响此处最优姿态。
<!-- figure-ref-v6:end:rc-12-figure-4 -->

<!-- figure-ref-v6:start:rc-12-figure-6 -->
<figure class="reading-evidence-figure" id="rc-12-figure-6"><a href="/robot-classic/assets/figure-refs-v6/012-fig-6-redraw.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/012-fig-6-redraw.png" width="1131" height="813" alt="按式31至33独立重算的四关节手指平面子问题最大操纵度曲线" loading="lazy"></a><figcaption>Tsuneo Yoshikawa（1985），对应图 6 的独立理论重绘（非原图转载），公式与模型见 PDF 第 6 页；<a href="https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。</figcaption></figure>

读图：这条曲线由原文连杆长度和雅可比公式独立重算，不是原图描摹或实验数据；在接近完全伸直的1.1长度边界，平面子问题退化使该指标降为零。
<!-- figure-ref-v6:end:rc-12-figure-6 -->

<!-- figure-ref-v6:start:rc-12-figure-7 -->
<figure class="reading-evidence-figure" id="rc-12-figure-7"><a href="/robot-classic/assets/figure-refs-v6/012-fig-7-redraw.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/012-fig-7-redraw.png" width="2241" height="1272" alt="给定十种末端距离后独立优化得到的手指关节姿态" loading="lazy"></a><figcaption>Tsuneo Yoshikawa（1985），对应图 7 的独立理论重绘（非原图转载），公式与模型见 PDF 第 6 页；<a href="https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。</figcaption></figure>

读图：每小图对应一个固定末端距离，三段连杆长度完全相同；姿态由同一理论优化得到，镜像等价解可能不同于原图朝向，不能据此当作真实手指运动测量。
<!-- figure-ref-v6:end:rc-12-figure-7 -->

<!-- figure-ref-v6:start:rc-12-figure-8 -->
<figure class="reading-evidence-figure" id="rc-12-figure-8"><a href="/robot-classic/assets/figure-refs-v6/012-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/012-fig-8.png" width="596" height="384" alt="Yoshikawa图8完整等值线及坐标边界" loading="lazy"></a><figcaption>Tsuneo Yoshikawa（1985），图 8，PDF 第 7 页；<a href="https://tsuneo-yoshikawa.my.coocan.jp/PDF-of-Papers/1985-EP2.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：补齐旧合图中被截的下方等值线和1.1坐标边界；这是原文在指尖位置平面上给出的最大操纵度，不能把等值线高度当成关节角。
<!-- figure-ref-v6:end:rc-12-figure-8 -->

| 分析要素 | 原文设定的含义 |
|---|---|
| 对象 | 指定几何机构的局部速度映射 |
| 变量 | 关节角、部分连杆长度与坐标尺度 |
| 对照指标 | 可操作度与条件数考察不同侧面 |
| 证据形式 | 公式、机构图、数值姿态与等高线 |
| 实机训练或成功率 | 不适用；论文不是以策略学习或真实任务重复执行为主的实验 |

第 8 页正文指出，条件数关注方向均匀性，而 w 衡量另一侧面。[Fig. 9](#rc-12-figure-9) 的较佳姿态不同，正好说明两个指标不能互相替代。原文将手指例子与人的姿态作联系，这仍不是人体通过同一标量控制运动的生物机制证明；肌肉力矩、舒适度和关节限位也可能产生相似姿态。

## 五、检查坐标尺度和单一标量丢失的方向信息

该指标不考虑摩擦、惯性、驱动器饱和、动态障碍物以及长期路径。某一时刻的椭球很大，也可能紧贴障碍物而无处可走。其局部性质意味着不能从当前位置的 $w$ 推断整段轨迹是否容易执行。

五个前置概念：**雅可比**把关节速度映射成任务速度；**奇异值**衡量映射在各独立方向的伸缩；**伪逆**提供最小范数解；**零空间**描述不改变任务的关节运动；**度量尺度**规定不同变量的一单位意味着什么。

## 六、追问：速度椭球短轴方向，为什么在同一关节力矩预算下可能更能施力？

<details>
<summary>速度椭球短轴方向，为什么在同一关节力矩预算下可能更能施力？</summary>

**参考答案**：这是一个补充静力教学推导，沿用[Modern Robotics §5.4的速度—力对偶讲法](https://modernrobotics.northwestern.edu/nu-gm-book-resource/5-4-manipulability/)，不作为1985论文新增实验。在同一任务坐标和量纲下，虚功关系给出 $\tau=J^\top F$。若关节力矩预算为 $\tau^\top\tau\le1$，代入得 $F^\top JJ^\top F\le1$；当 $J$ 满行秩，力椭球与速度椭球方向相同，半轴分别为 $1/\sigma_i$ 与 $\sigma_i$。例如 $J=\operatorname{diag}(2,0.5)$ 时，速度半轴为 $(2,0.5)$，力半轴为 $(0.5,2)$。这不表示奇异点能产生无限真实力：到降秩处上述有限椭球解释已失效，实际强度、摩擦和执行器限制也未进入这个理想预算。

</details>

## 七、从方向能力诊断走向阻尼与惯性

- **模块组合**：[奇异鲁棒逆解：允许一点偏差，换取可执行的关节运动](016-damped-ik.md)。针对小奇异值方向限制逆增益，将能力诊断转为动作折中。
- **教学联系**：[操作空间：直接设计夹爪的动力学行为](018-operational-space.md)。把纯速度尺度的椭球与含惯性的任务响应分开比较。

## 八、自测与参考答案

**1．两个姿态的 $w$ 相同，完成同一任务是否一样容易？**

不一定。奇异值乘积相同仍可能有不同的最弱方向。若任务恰好沿短轴运动，所需关节速度会更大；必须结合目标运动方向看椭球。

**2．$w=0$ 是否代表所有关节速度都不能让末端移动？**

不是。它说明至少一个所选任务方向缺失。其余非零奇异值方向仍可运动。只有雅可比整体为零，才会没有一阶末端运动。

**3．能否把最大化可操作度直接作为机器人唯一控制目标？**

通常不能。它可能使末端偏离目标，或把关节带入碰撞区域。应把主要任务和物理约束显式保留，再用冗余自由度改善可操作性；任务优先关系是额外设计，不由体积公式自动提供。
