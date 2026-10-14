# 022｜GJK：不枚举所有表面，也能求物体距离

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](021-horn.md) · [下一篇](023-harris.md)

**论文**：Elmer G. Gilbert、Daniel W. Johnson、S. Sathiya Keerthi，*A Fast Procedure for Computing the Distance Between Complex Objects in Three-Dimensional Space*，1988，IEEE JRA 4(2):193–203。[大学托管原稿](https://graphics.stanford.edu/courses/cs448b-00-winter/papers/gilbert.pdf) · [DOI](https://doi.org/10.1109/56.2083)。

补充来源：[同版原稿转录](https://doczz.net/doc/7598072/a-fast-procedure-for-computing-the-distance-between-complex)。

### 先接住前作的问题

[构型空间](009-configuration-space.md)中的形状差把碰撞变成集合问题，但显式枚举差集可能很大。GJK利用凸集支持点和小单纯形按需求距离。

## 一、问题设定：两个凸物体怎样不用枚举全部面就求最近距离

机械臂避障不仅需要知道有没有碰撞，还想知道距离多远、最近点在哪里。复杂物体有很多面，逐面对照的成本很高。GJK 利用凸几何，通过少量方向上的最远点查询，逐步逼近距离。

### 问题定义：距离与碰撞并不完全等价

对紧集 $A,B$，欧氏距离 $d(A,B)=\min_{a\in A,b\in B}\|a-b\|$。相离时距离为正，相交或接触时为零。仅靠这个距离，不能区分轻微接触和深度穿透。

核心算法处理凸集。一个非凸物体可拆成多个凸部件，再求各部件对的最小距离；原文第 II 节还讨论球形扩张，用来构造圆角几何或安全外壳。这些都是几何建模步骤，不应计作凸核算法自动理解非凸结构。

机器人应用中，几何随关节角改变。输入包括局部形状与刚体变换，输出可以是距离及两物体上的最近点。没有训练数据、奖励或策略网络；其“优化”是数值几何问题。

## 二、利用支持点查询在Minkowski差中逼近原点

### 方法：差集、支持点与最短向量

定义 $C=A-B=\{a-b\}$。则 $d(A,B)=\min_{c\in C}\|c\|$；若原点属于 $C$，两个凸物体就相交。显式构造 $C$ 可能昂贵，但其支持点可以分解：

$$s_C(v)=s_A(v)-s_B(-v),\qquad s_A(v)\in\arg\max_{a\in A}v^Ta.$$

对顶点表示的凸多面体，支持查询只需寻找点积最大的顶点。迭代维护 $C$ 内的小单纯形 $S$，求原点到 $\operatorname{conv}(S)$ 的最近点 $p$。再沿 $-p$ 查询新支持点，检查是否能进一步接近原点。

为什么只保留少数点？因为三维凸组合中的一个点可由至多四个点表达，最近点通常还位于某个更低维面上。原文的距离子算法正是负责找出有效面及其凸组合系数；这不是一个可以随意跳过的实现细节。

用教学记号，令 $w=s_C(-p)$，间隙 $g=\|p\|^2-p^Tw$。它衡量当前点是否满足原点投影的最优条件。若 $g=0$，凸集在方向 $p$ 上不能再提供改善；数值实现则采用与尺度匹配的容差。

每个差集顶点同时保存原物体点 $a,b$，就能利用相同凸组合权重恢复最近点对。距离核由此可以为优化器提供更丰富信息，而不仅返回真或假。

停止条件可以解释成一对距离界。记真实距离为 $d_*\ge0$，当前单纯形最近点为 $p\ne0$，支持点 $w=s_C(-p)$。因为 $p\in C$，有上界 $d_*\le\|p\|$；又因所有 $c\in C$ 都满足 $p^\top c\ge p^\top w$，得到

$$\max\{0,p^\top w/\|p\|\}\le d_*\le\|p\|.$$

所以“支持点没有继续改进”与优化误差界相连，而不是仅仅两次距离显示相同小数。上文的 $g=\|p\|^2-p^\top w$ 量纲是长度平方，不能与以米定义的停止阈值不加转换地比较。接近原点时除以 $\|p\|$ 不稳定，须转入接触/相交判据和相应容差分支。

原创二维轨迹取 $C$ 为连接 $(2,1)$ 与 $(2,-1)$ 的线段。初始 $p=(2,1)$，沿 $-p$ 查询得到 $w=(2,-1)$，此时 $g=5-3=2$。二点单纯形上的点为 $(2,1-2\alpha)$，$0\le\alpha\le1$；最小化平方模得到 $\alpha=1/2$，新 $p=(2,0)$。下一次无论选哪端，$p^\top w=4=\|p\|^2$，上下界合为2，算法结束。最近点位于边内部，任何只比较顶点距离的做法都会错误给出 $\sqrt5$。

支持查询避免列出完整差集，但查询的几何对象必须符合凸性条件。下面用凹形被填平的例子检查输入含义，再读多面体上的实际迭代效率。

## 三、迭代小单纯形，用非凸形状检验适用范围

```text
输入：A、B 的支持点查询，容差，初始单纯形
S ← 初始差集支持点
循环：
    p、权重 ← 求原点到 conv(S) 的最近点
    若 p 足够接近原点：返回零距离与接触候选
    w ← support_A(-p) - support_B(p)
    gap ← p点乘p - p点乘w
    若 gap 满足停止容差：返回 norm(p) 与最近点
    从 S 删除不参与最近点凸组合的顶点
    将 w 加入 S
    检查重复顶点、退化和数值停滞
```

### 自构例子：为什么非凸形状会被“填平”

设一个 U 形物体包围着自由空隙，小球位于 U 中央且没有接触。若只将 U 形全部顶点交给支持函数，得到的是它的凸包；凸包把空隙填上，算法可能判断小球与这个替代模型相交。

这不是 GJK 出错，而是输入模型已经改变。将 U 拆为三条凸条状部件后，分别检查与小球的距离，才能恢复真实空隙。

再考虑两个分离立方体。第一次可能只找到一个差集顶点，随后边或面上的凸组合给出更近位置。最近点不必是原始顶点：它可能落在面内部，这正是不能只比较所有顶点间距离的原因。

## 四、读6000多面体测试与教学差集图


<!-- figure-ref-v6:start:rc-22-figure-6-anchor -->
<span id="rc-22-figure-6"></span>
<!-- figure-ref-v6:end:rc-22-figure-6-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/022-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/022-evidence.png" width="745" height="488" alt="Fig. 6：沿横轴的运动进程比较物体间距离，距离降至零的位置标出接触可能发生的区间" loading="lazy"></a><figcaption>原论文结果图／表摘引：Elmer G. Gilbert、Daniel W. Johnson、S. Sathiya Keerthi（1988），Fig. 6，PDF 第 9 页；<a href="https://graphics.stanford.edu/courses/cs448b-00-winter/papers/gilbert.pdf#page=9" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：沿横轴的运动进程比较物体间距离，距离降至零的位置标出接触可能发生的区间。这里按离散路径参数计算，不能把采样点之间未检查的位置自动算作无碰撞。

本篇求非负集合距离；距离为零不足以给出穿透深度，布尔碰撞简化与 EPA 都是另外的算法问题。

**第 III–IV 节。** 凸集距离化为原点投影；支持点迭代有理论基础；不能直接用于任意非凸边界。

**第 V–VI 节。** 单纯形距离、备用数值处理；浮点实现需处理退化；不能只保留理想伪代码。

**第 VII 节，[图 4](#rc-22-figure-4)。** 12 类多面体选 20 对，每类状态 100 个例子；覆盖相离、刚接触、相交，共 6000 个；不等于真实机器人场景统计分布。在这些测试中，计算成本随总顶点数近似线性，属于经验观察，不能推广为任意输入的最坏情况界。

<!-- figure-ref-v6:start:rc-22-figure-4 -->
<figure class="reading-evidence-figure" id="rc-22-figure-4"><a href="/robot-classic/assets/figure-refs-v6/022-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/022-fig-4.png" width="453" height="491" alt="图4：顶点总数与计算量、CPU时间关系，含碰撞、刚接触和接近三类点" loading="lazy"></a><figcaption>Elmer G. Gilbert、Daniel W. Johnson、S. Sathiya Keerthi（1988），图 4，PDF 第 8 页；<a href="https://graphics.stanford.edu/courses/cs448b-00-winter/papers/gilbert.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/022-fig-4.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：横轴是顶点总数M，左轴为等效运算量、右轴为CPU时间；三类样本的分散程度说明平均趋势不等于最坏情况界。
<!-- figure-ref-v6:end:rc-22-figure-4 -->

**第 VIII 节，[图 5](#rc-22-figure-5)、6。** 运动物体经过固定障碍；距离随路径变化可用于碰撞检查；离散采样精度限制碰撞时刻。

<!-- figure-ref-v6:start:rc-22-figure-5 -->
<figure class="reading-evidence-figure" id="rc-22-figure-5"><a href="/robot-classic/assets/figure-refs-v6/022-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/022-fig-5.png" width="549" height="258" alt="图5：移动多面体K4与五个固定障碍物的碰撞检测场景" loading="lazy"></a><figcaption>Elmer G. Gilbert、Daniel W. Johnson、S. Sathiya Keerthi（1988），图 5，PDF 第 9 页；<a href="https://graphics.stanford.edu/courses/cs448b-00-winter/papers/gilbert.pdf#page=9" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/022-fig-5.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：把运动起点与终点和K1至K5固定障碍物对应起来，再读图6的各条距离曲线；几何图本身不显示碰撞时间。
<!-- figure-ref-v6:end:rc-22-figure-5 -->

<!-- figure-ref-v6:start:rc-22-links-89 -->
本页定位：[图 6内嵌图](#rc-22-figure-6)。
<!-- figure-ref-v6:end:rc-22-links-89 -->

**表 I。** 单点初始化与复用前一步信息；连续运动可利用时间连续性加速；与从零求解不是相同初始化条件。

<!-- figure-ref-v6:start:rc-22-table-i -->
<figure class="reading-evidence-figure" id="rc-22-table-i"><a href="/robot-classic/assets/figure-refs-v6/022-table-I.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/022-table-I.png" width="606" height="229" alt="表I：不同轨迹采样数下单点初始化与专用初始化的CPU时间" loading="lazy"></a><figcaption>Elmer G. Gilbert、Daniel W. Johnson、S. Sathiya Keerthi（1988），表 I，PDF 第 9 页；<a href="https://graphics.stanford.edu/courses/cs448b-00-winter/papers/gilbert.pdf#page=9" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/022-table-I.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：逐行比较相同采样数下的两种初始化；采样更密时复用已有近邻关系的相对收益增大，表内时间仍依赖原硬件。
<!-- figure-ref-v6:end:rc-22-table-i -->

表 I 在 Harris 800 上、路径划分 1000 区间时报告 19.81 秒与 6.32 秒，对应约 3.1 倍比值。它比较同一示例的初始化策略，不是 GJK 相对所有碰撞检测算法的通用加速比。

<!-- figure-ref-v6:start:rc-22-links-93 -->
本页定位：[表 I内嵌图](#rc-22-table-i)。
<!-- figure-ref-v6:end:rc-22-links-93 -->

原文还列出其他机器上的另一算法耗时，但硬件及输出问题不同，不能直接用数字相除宣称公平胜负。随机姿态测试的具体种子没有核实；容差数字的转录存在损坏，也不据此给出复现常数。

[图 6](#rc-22-figure-6) 中的碰撞位置只在路径网格分辨率内定位。离散姿态距离检查与连续碰撞检测是两个问题，不能把高频调用距离核说成严格覆盖所有中间时刻。

<!-- figure-ref-v6:start:rc-22-links-97 -->
本页定位：[图 6内嵌图](#rc-22-figure-6)。
<!-- figure-ref-v6:end:rc-22-links-97 -->

## 五、区分经验效率、容差退化与非凸分解

成本随支持查询实现变化。遍历全部顶点、利用邻接爬山或采用解析形状查询，性能会不同。因此不能单凭“调用次数少”推断整体耗时小。

退化三角形、几乎接触、尺度悬殊和浮点精度都会影响停止判断。安全裕度应与几何误差和数值容差联合选择。一个距离为极小正数的结果，不能在毫米级模型误差下被解释为真实安全间隙。

原文讨论了穿透相关界，但不等于精确负距离求解。后续算法可以在 GJK 基础上估计穿透深度，必须作为额外步骤引用。把零距离直接写成可靠接触法向，在深度重叠时尤其容易出错。

五个前置概念：**凸集**包含任意两点连线；**Minkowski 差**把双物体问题化为单集合问题；**支持点**是在指定方向最远的点；**单纯形**是少量仿射独立点的凸包；**热启动**复用临近问题的信息。

## 六、追问：若支持点查询返回近似最远点，原来的停止判断还能无条件沿用吗？

<details>
<summary>若支持点查询返回近似最远点，原来的停止判断还能无条件沿用吗？</summary>

**参考答案**：不能默认沿用。算法的距离更新与界判断依赖支持查询提供的几何信息，近似查询引入额外误差。至少需要把查询精度与停止容差一起说明，并对退化及接近接触的输入验证；原文特定多面体实验不能证明任意近似查询实现仍有同一性质。

</details>

## 七、把凸体距离接入轨迹碰撞约束

- **模块组合**：[TrajOpt：用局部凸问题修复整条碰撞轨迹](073-trajopt.md)。将凸体距离用于轨迹碰撞代价，运动段的连续碰撞检查仍需额外机制。

## 八、自测与参考答案

**1．为什么只看物体顶点之间的距离不够？**

最近点可能位于边或面的内部。GJK 的凸组合子问题允许这种情况；简单顶点对最小距离会高估真实距离。

**2．GJK 返回零距离，是否知道穿透了多少？**

不知道。非负集合距离在所有重叠情况下都为零。精确穿透深度或稳定接触法向需要额外问题定义和算法。

**3．每隔一毫秒检查无碰撞，能否保证两次检查之间也无碰撞？**

不能仅凭采样频率保证。要结合运动速度、几何尺度和安全距离，或使用连续碰撞方法；快速运动的细长部件可能穿过障碍又离开。
