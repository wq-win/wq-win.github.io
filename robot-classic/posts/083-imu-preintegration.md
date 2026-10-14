# 083｜IMU 预积分：把高频惯性测量压缩成可以反复优化的约束

[返回总览](00-发展时间线总览.md) · [上一篇：ORB-SLAM](082-orbslam.md) · [下一篇：ElasticFusion](084-elasticfusion.md)

**论文**：Christian Forster、Luca Carlone、Frank Dellaert、Davide Scaramuzza，*IMU Preintegration on Manifold for Efficient Visual-Inertial Maximum-a-Posteriori Estimation*，RSS 2015。[会议原文](https://www.roboticsproceedings.org/rss11/p06.pdf) · [正式入口](https://doi.org/10.15607/RSS.2015.XI.006)。

### 先接住前作的问题

[iSAM2](068-isam2.md)让后端能反复修正历史状态，高频 IMU 却会让朴素重积分变贵；本篇提供可缓存且带相关不确定性的惯性因子，与增量后端属于模块组合。

## 一、问题设定：关键帧状态被修改时怎样避免反复重放全部IMU

相机两帧之间可能已经收到几十条惯性测量。直接处理有两个麻烦：为每个 IMU 时刻建立状态，优化问题太大；把测量积分成下一时刻位姿，又会依赖起始位姿和偏置，一旦优化器修改它们，旧积分可能需要重做。

### 问题定义：IMU 测到的不是位置

这是状态估计问题，不是强化学习。没有策略、奖励或训练回合。状态可写成 $x_i=(R_i,p_i,v_i,b_i^g,b_i^a)$：姿态、位置、速度、陀螺仪偏置和加速度计偏置。相机提供地标观测，IMU 提供角速度和比力。

比力尤其容易误解。静止放在桌面上的加速度计并非必然输出零；重力必须结合姿态和坐标约定处理。速度也不是把原始加速度读数直接累加就能可靠得到的。

过去方案并非“不会融合相机与 IMU”，而是融合方式影响计算和线性化误差。滤波法通常及时压缩历史；优化法可以反复修正历史状态，却要处理大量测量和重线性化的代价。本文选择关键帧优化，利用 IMU 在视觉帧之间提供运动约束。

第 V 节假设相机与 IMU 已同步，并在两个关键帧之间把偏置视为常量；跨关键帧再建立偏置演化模型。时间偏移、相机内参、相机—IMU 外参都不是可以随意省略的工程细节。视觉惯性系统仍有全局位置、绕重力方向的整体航向等规范自由度；引入 IMU 不等于获得 GPS 式绝对位置。

## 二、在局部坐标预积分，并传播相关噪声和偏置导数

### 1. 三种增量分别消除了什么

采用 $R_i$ 将机体向量变换到世界系的约定，核心关系为：

$$
\Delta R_{ij}=R_i^TR_j,
\qquad
\Delta v_{ij}=R_i^T(v_j-v_i-g\Delta t),
$$

$$
\Delta p_{ij}=R_i^T(p_j-p_i-v_i\Delta t-\tfrac12g\Delta t^2).
$$

这是第 V 节测量模型的解释性写法，省略测量噪声记号。旋转增量描述相对朝向；速度增量扣除了重力影响；位置增量还扣除了初速度造成的位移。三者都在起始局部坐标系中表达。

缓存的预积分值由 IMU 数据和参考偏置产生。优化器调整 $R_i,p_i,v_i$ 时，重新计算这些状态关系与缓存测量之间的残差即可，不必重新遍历每条原始读数。

### 2. 为什么旋转不能像位置一样相加

三维旋转具有顺序性：先绕横轴转、再绕纵轴转，通常不等于反过来。因此旋转更新使用 $\operatorname{Exp}(\omega\Delta t)$ 与矩阵乘法，误差用对数映射回到三维切空间。这样避免把欧拉角当成普通欧氏向量所带来的坐标奇异和不自然的噪声处理。

但“在流形上”不表示完全没有近似。论文仍对小噪声、偏置变化和优化增量做局部线性化。几何表示正确与非线性求解全局正确，是两个不同命题。

### 3. 偏置改变以后怎么办

对速度和位置增量，可以用教学简式说明：

$$
\Delta\tilde v(b+\delta b)\approx\Delta\tilde v(b)+J_v\delta b,
\qquad
\Delta\tilde p(b+\delta b)\approx\Delta\tilde p(b)+J_p\delta b.
$$

旋转修正则通过指数映射组合，而非直接加到旋转矩阵。$J$ 是预积分对偏置的敏感度。它把“再积分所有样本”变成较小的矩阵运算；这是近似修正，不是任意大偏置变化下的恒等式。

### 速度和位置误差为什么不能各算各的

预积分把许多读数压成一个因子，也把**共享读数造成的相关性**保留下来。第 V-B 节给出旋转、速度、位置误差共同的九维协方差；把它改成三个互不相干的权重，通常已改变统计模型。

**原创一维教学例。** 固定姿态、忽略偏置与重力误差，取两个长为 $h$ 的积分步；每步加速度噪声 $n_0,n_1$ 独立、均值零、方差 $\sigma^2$，步内采用常加速度。按先更新位置再更新速度的递推，累计误差为

$$\delta v=h(n_0+n_1),\qquad \delta p=h^2(\tfrac32 n_0+\tfrac12 n_1).$$

第一步噪声不仅影响该步位移，还经速度带入第二步，因此它在位置里的系数是 $3/2$。直接计算得到

$$\operatorname{Var}(\delta v)=2h^2\sigma^2,\quad \operatorname{Var}(\delta p)=\tfrac52h^4\sigma^2,\quad \operatorname{Cov}(\delta v,\delta p)=2h^3\sigma^2.$$

取 $h=1,\sigma^2=1$ 作为归一化数值，协方差矩阵为 $\begin{bmatrix}2&2\\2&2.5\end{bmatrix}$，相关系数约 0.894。即使原始噪声独立，积分后两类误差也高度相关；完整三维情形还会由姿态误差把陀螺仪噪声传到速度和位置。这个例子解释协方差结构，不是论文 Monte Carlo 数据；[图 10](#rc-83-figure-10) 的偏置实验检验的是另一件事，即一阶偏置修正与重新积分的差别。依据[原文 V-B、V-C 与图10](#rc-83-figure-10)。

### 4. 概率目标与无结构视觉因子

系统优化的是带先验、IMU、偏置和视觉约束的最大后验估计，常写成加权残差平方和。权重来自协方差，而不是人为让某个传感器永远占上风。

第 VI 节还在线性化后消去地标增量，只保留它对观察这些地标的位姿的约束。“无结构”不表示图像里不需要三维几何，也不表示没有三角化，而是最终线性求解不显式保留所有地标变量。非线性 MAP 问题仍可能有局部极小；消元保留当前线性化子问题的信息，不构成全局最优证明。

旋转增量、速度增量和位置增量共享噪声，缓存时必须保留其相关性。下面检查偏置修正如何进入因子，再对照计算节约与误差。

## 三、缓存区间增量，检查一阶偏置修正

### 5. 伪代码：区分测量积累与优化更新

```text
输入：已标定、已同步的图像与 IMU 流；初始状态和偏置
创建关键帧 i，保存参考偏置 b_ref
初始化局部 ΔR、Δv、Δp、协方差和偏置雅可比
每收到一条 IMU：
    使用该条读数与 b_ref 更新局部增量
    同步传播协方差和对偏置的雅可比
每收到图像：
    视觉前端跟踪，判断是否创建关键帧 j
    若创建：加入连接 i、j 的预积分因子和偏置因子
            加入由特征轨迹形成的视觉约束
            在增量后端优化关键帧状态
            计算残差时，用雅可比修正参考偏置与当前偏置之差
            令 i=j，重置下一区间的预积分缓存
输出：关键帧姿态、位置、速度和偏置估计
```

这是教学流程，不是完整复现程序；异常值处理、规范固定和重新积分策略仍需实现。目标是 MAP 误差，机制是压缩与复用，测量指标才是轨迹误差和耗时，三者不能混为一个“损失下降所以定位更准”的结论。

### 用一个小例子建立直觉

**自构教学例子，未运行实验。** 假设相机 20 Hz、IMU 800 Hz，通常相邻相机帧之间有约 40 条惯性读数。后端反复调整起始世界位置，并不会改变这 40 条读数描述的局部运动，因此局部预积分可复用。如果陀螺仪偏置也变了，才用保存的雅可比近似修正。这里“40”由频率相除得到，不表示论文始终每个相机帧都创建关键帧。

五个前置概念：

1. **比力**：加速度计的读数与世界加速度不同，需要姿态和重力模型连接。
2. **SO(3)**：描述三维旋转的集合，组合操作是矩阵乘法。
3. **雅可比**：输入小变化引起输出变化的一阶敏感度。
4. **因子图**：用局部概率约束连接待估计状态的图表示。
5. **边缘化或消元**：消去部分变量并保留其对其他变量的约束，不等于直接丢弃测量。

## 四、读误差与计算时间，核对惯性和视觉输入

<!-- figure-ref-v6:start:rc-83-figure-10-anchor -->
<span id="rc-83-figure-10"></span>
<!-- figure-ref-v6:end:rc-83-figure-10-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/083-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/083-evidence.png" width="845" height="279" alt="Fig. 10：按纵轴从左到右读位置、速度和旋转的一阶偏置修正误差，横轴扩大偏置扰动" loading="lazy"></a><figcaption>原论文结果图／表摘引：Christian Forster、Luca Carlone、Frank Dellaert、Davide Scaramuzza（2015），Fig. 10，PDF 第 8 页；<a href="https://www.roboticsproceedings.org/rss11/p06.pdf#page=8" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：按纵轴从左到右读位置、速度和旋转的一阶偏置修正误差，横轴扩大偏置扰动。误差随扰动上升提醒我们修正是局部近似，不能把小扰动下的小误差当作永不重新积分的保证。

### 实验怎样安排

这里是 RSS 2015 版；室外路线图注与正文的数值不一致已在结果处保留，不能用后来的期刊版数字无声补齐。

| 项目 | 原文设置与要验证的问题 |
|---|---|
| 室内精度 | VI-Sensor，使用左相机；相机 20 Hz、IMU 800 Hz，Vicon 真值；比较所测轨迹上的相对漂移 |
| 对比方法 | ASLAM 与 MSCKF 的结果来自相关作者；比较的是完整系统，前端和实现也可能影响结果 |
| 实时性 | Intel i7 2.4 GHz 笔记本；后端 iSAM2 每次采用 10 次优化迭代；前后端分线程 |
| 室外与楼层 | 与刚性连接的 Tango 设备共同运动，以返回起点的终点误差评价；不等于全程真值误差 |
| 偏置修正 | 每段 100 条 IMU 测量，偏置扰动幅度 0.04–0.2，1000 次 Monte Carlo；比较一阶修正与重新积分 |
| 数据和预算边界 | 不涉及学习训练步数；真实轨迹独立重复次数、统一调参预算未报告；不能把模拟重复数用于真实轨迹置信度 |

### 哪些结论有证据，哪些不能推出

**[图 7](#rc-83-figure-7)：相对漂移。** 在 360 m 轨迹片段尺度，正文报告平均平移漂移约 0.3 m，而两项基线约 0.7 m。按这些舍入数计算下降约 57%，但它不是所有轨迹平均的榜单提升，也不等于终点误差。该比较支持系统级精度优势，不能单独证明流形表示或某个模块贡献了全部改善。

<!-- figure-ref-v6:start:rc-83-figure-7 -->
<figure class="reading-evidence-figure" id="rc-83-figure-7"><a href="/robot-classic/assets/figure-refs-v6/083-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/083-fig-7.png" width="640" height="537" alt="原论文图7：三种视觉惯性方法随行进距离变化的平移、偏航和倾斜误差箱线图" loading="lazy"></a><figcaption>Christian Forster、Luca Carlone、Frank Dellaert、Davide Scaramuzza（2015），图 7，PDF 第 7 页；<a href="https://www.roboticsproceedings.org/rss11/p06.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：三个纵轴对应不同误差量，箱体与离群点展示分布；不能把最小一条中位数当成所有指标都占优。
<!-- figure-ref-v6:end:rc-83-figure-7 -->

**[图 8](#rc-83-figure-8)：后端耗时。** 作者报告平均后端更新约 10 ms，前端每帧约 3 ms。关键帧后端和相机帧前端的运行频率不同，不能简单宣布整个系统以 $1/(10+3)$ 秒的固定频率运行。平均值也不是最坏延迟保证；原图存在峰值。ASLAM 对应耗时未报告，因此不能据此计算两者加速比。

<!-- figure-ref-v6:start:rc-83-figure-8 -->
<figure class="reading-evidence-figure" id="rc-83-figure-8"><a href="/robot-classic/assets/figure-refs-v6/083-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/083-fig-8.png" width="640" height="168" alt="原论文图8：增量视觉惯性估计的每关键帧处理耗时曲线" loading="lazy"></a><figcaption>Christian Forster、Luca Carlone、Frank Dellaert、Davide Scaramuzza（2015），图 8，PDF 第 7 页；<a href="https://www.roboticsproceedings.org/rss11/p06.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：横轴是关键帧编号，尖峰与常态耗时分开读；均值不能替代实时系统对最坏延迟的要求。
<!-- figure-ref-v6:end:rc-83-figure-8 -->

**[图 9](#rc-83-figure-9) 与第 VIII 节：一个必须保留的数值疑点。** 室外约 300 m 路线，本方法终点误差在图注为 **1.0 m**，正文为 **1.5 m**；Tango 均为 **2.2 m**。不能自行挑选较好数字，也不适合给出确定的百分比提升。作者还明确提醒两系统传感器不同，比较属于有限的系统级参照。

<!-- figure-ref-v6:start:rc-83-figure-9 -->
<figure class="reading-evidence-figure" id="rc-83-figure-9"><a href="/robot-classic/assets/figure-refs-v6/083-fig-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/083-fig-9.png" width="560" height="352" alt="原论文图9：闭合室外轨迹上所提方法和Tango的估计路径" loading="lazy"></a><figcaption>Christian Forster、Luca Carlone、Frank Dellaert、Davide Scaramuzza（2015），图 9，PDF 第 8 页；<a href="https://www.roboticsproceedings.org/rss11/p06.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：路径起终点设在同一坐标处；轨迹看起来接近不等于每个位置都有真值误差保证。
<!-- figure-ref-v6:end:rc-83-figure-9 -->

**[图 1](#rc-83-figure-1)：跨楼层。** 约 160 m 路线返回起点，报告本方法 0.5 m、Tango 1.4 m。它支持这条路线上的低终点漂移，但小终点误差可能掩盖中间路径误差，不能替代完整 ATE。

<!-- figure-ref-v6:start:rc-83-figure-1 -->
<figure class="reading-evidence-figure" id="rc-83-figure-1"><a href="/robot-classic/assets/figure-refs-v6/083-fig-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/083-fig-1.png" width="640" height="336" alt="原论文图1：楼梯场景下所提方法与Tango三维轨迹的两个投影视图" loading="lazy"></a><figcaption>Christian Forster、Luca Carlone、Frank Dellaert、Davide Scaramuzza（2015），图 1，PDF 第 1 页；<a href="https://www.roboticsproceedings.org/rss11/p06.pdf#page=1" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：两个投影呈现同一段上下楼运动；要同时比较平面位移和高度变化，避免只凭单个视图判断漂移。
<!-- figure-ref-v6:end:rc-83-figure-1 -->

**[图 10](#rc-83-figure-10)：偏置修正。** 一阶修正与重新积分在所测扰动下差异很小，支持局部近似的实用性；实验没有证明任意温漂、任意长积分区间都无需重新积分。图与正文说明的是误差量级，不应从图上估出很多位小数冒充原始数据。

上述证据见[原文第 VIII 节及图 1、7–10](#rc-83-figure-1)。

## 五、保留短区间模型、标定和初始化限制

作者给出了有限真实轨迹和数值验证；“在极低纹理、高振动、极端偏置变化下也可靠”不在这些实验的证明范围。我的分析是，区间长度同时影响计算和近似：关键帧过密会增加后端规模，过稀又可能放大偏置常量假设和线性近似误差。这个权衡需要专门实验，不能从一次平均耗时中决定。

## 六、追问：预积分的旋转、速度和位置误差为什么不能各自独立加权？

<details>
<summary>预积分的旋转、速度和位置误差为什么不能各自独立加权？</summary>

**参考答案**：同一段惯性噪声通过积分同时进入多个增量。用线性教学形式写作 $e_v=A n$、$e_p=B n$，其交叉协方差为 $A\Sigma_nB^\top$，一般非零。分别取三个方差会丢掉共享噪声的方向关系。把它们作为一个带联合协方差的因子，是[Dellaert因子与噪声模型讲法](https://gtsam.org/tutorials/intro.html)在本文的具体应用，不是新增独立传感信息。

</details>

## 七、把惯性因子接入完整估计系统

- **直接继承**：[VINS-Mono：让单目视觉与 IMU 组成可以长期运行的定位系统](092-vinsmono.md)。用预积分组织完整视觉惯性估计，增加启动与失效处理。
- **模块组合**：[LIO-SAM：让激光、惯性、GPS 与回环共同解释运动](097-liosam.md)。让惯性区间约束进入激光因子图。

## 八、自测与参考答案

**问题 1：既然预积分结果不依赖起始位姿，为什么残差还出现 $R_i$？**

**答案：** 缓存的是局部测量，不依赖世界系起点；残差要把两个世界状态预测的相对运动与这个局部测量比较，所以必须使用 $R_i^T$ 变换坐标。测量可复用与残差依赖待估状态并不矛盾。

**问题 2：偏置修正能否永远代替重新积分？怎样验证？**

**答案：** 不能，它是一阶近似。应固定同一批原始 IMU，逐步扩大偏置扰动和积分区间，比较修正结果与重新积分的旋转、速度、位置误差，并记录误差进入最终轨迹的影响。[图 10](#rc-83-figure-10) 只覆盖其报告的范围。

**问题 3：终点误差更小，能否证明预积分方法更准确？**

**答案：** 不能单凭这一项。需要同传感器、同前端、相近预算的消融和全程真值，才能较好隔离方法作用；闭合路线上的误差可能相互抵消。这里室外数值还有图注与正文不一致，比较结论必须进一步收窄。
