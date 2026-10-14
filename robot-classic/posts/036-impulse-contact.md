# 036｜Stewart–Trinkle：不要追逐无限大的接触力，直接计算冲量

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](035-prm.md) · [下一篇](037-visual-servo.md)

**论文**：David E. Stewart、Jeffrey C. Trinkle，*An Implicit Time-Stepping Scheme for Rigid Body Dynamics with Inelastic Collisions and Coulomb Friction*，1996，International Journal for Numerical Methods in Engineering 39(15)：2673–2691。[出版记录](https://iro.uiowa.edu/esploro/outputs/journalArticle/AN-IMPLICIT-TIME-STEPPING-SCHEME-FOR-RIGID/9984240862302771) · [作者原稿](https://www.cse.lehigh.edu/~trink/Papers/STijnme96.pdf)。

### 先接住前作的问题

[刚体动力学](005-newton-euler.md)在光滑运动中好用，碰撞却会带来冲量和模式切换。本篇在时间区间上求接触作用；[Posa接触轨迹优化](075-contact-trajopt.md)承接该建模思想，把接触作用一起作为决策变量。

## 一、问题设定：碰撞瞬间的速度突变怎样进入有限时间步模拟

一根杆落到桌面，接触瞬间速度可以突变。若坚持用有限且光滑的力描述这个瞬间，就需要引入很硬的弹簧与很小的时间步，计算会变得僵硬；若逐个精确定位碰撞时刻，多点接触与连续碰撞又会让事件处理复杂化。

### 问题定义：力、冲量和接触模式

设广义位置为 $q$、速度为 $v$、质量矩阵为 $M(q)$。法向间隙 $\phi(q)$ 大于零表示分离，等于零表示接触，小于零表示穿透。接触是单边约束：桌面可以向上推物体，但不能隔空把物体拉下来。

普通力在时间上积分得到冲量 $p=\int f(t)dt$，其单位是牛顿秒。碰撞时间趋近零时，力可能不再是有界的普通函数，而冲量与速度变化仍然有限。这也是用冲量更新动量而不是强行估计一个巨大瞬时力的原因。

库仑摩擦还包含模式切换。静止接触时，切向作用可以在摩擦锥内部平衡外力；滑动时，摩擦位于边界并阻碍相对运动。模式由动力学和约束共同决定，不能在更新前随意指定所有接触点“都静止”或“都滑动”。

原文 §2 从允许构型集合开始建立模型；§3 再把它离散化。这个顺序很重要：模拟器求解的是一个明确的理想刚体与非弹性接触模型，不是对真实材料压缩、回弹、迟滞和温度效应的完整描述。机器人足底、抓手、推物体等任务常有这些接触机制，但其参数还需要独立辨识。

## 二、把法向互补与摩擦写成冲量约束

### 方法：把下一步位置和接触冲量一起求出来

在一个接触的教学简化中，离散动量方程可以写成

$$M_k(v_{k+1}-v_k)=h f_k+J_n^T p_n+J_t^T p_t,$$

$$q_{k+1}=q_k+h v_{k+1}.$$

这里 $h$ 是步长，$f_k$ 包含连续外力，$J_n,J_t$ 把广义速度映射到法向与切向相对速度；$p_n,p_t$ 是接触冲量。这个符号版本用于讲解机制，不逐字照搬原文关于质量矩阵和外力取值位置的记号。

关键约束是

$$0\le p_n\ \perp\ \phi(q_{k+1})\ge0.$$

符号 $a\perp b$ 表示 $a b=0$。若下一步仍有正间隙，则不能出现法向接触冲量；若出现正冲量，则下一步应处于接触边界。它没有规定每个几何上接触的点都必须承受正压力，零压力的接触也允许。

若将几何局部线性化，间隙用 $\phi(q_k)+hJ_n v_{k+1}$ 近似，法向条件就成为速度与冲量之间的互补关系。原文 p.7 式 (14)–(15) 联合给出位置更新、动量更新和摩擦互补式；p.8 说明其线性化形式可消元为线性互补问题，即 LCP。

切向摩擦圆锥用有限多个方向近似。令 $D$ 收集切向基方向，非负系数 $\beta$ 表示切向冲量 $D\beta$，并约束总量不超过 $\mu p_n$。摩擦互补条件选择与滑动方向相对的作用。原文 p.8 的分析表明，对给定法向冲量，这个选择在相应摩擦集合中满足所讨论的耗散原则；不能脱离前提把它改述成整个多接触系统所有物理量的全局最小化。

### 把接触开关写成可手算的互补系统

考虑无摩擦竖直质点，地面在 $q=0$，向上为正，质量 $m$。一步冲量更新为 $v^+=v^- -hg+p/m$、$q^+=q+hv^+$，这里 $h$是步长，$g$是重力加速度，$v^-,v^+$分别是步前、步后速度，$p$是向上的法向冲量；同时要求 $0\le q^+\perp p\ge0$。若无接触预测 $q+h(v^--hg)\ge0$，就取 $p=0$；若预测穿地，则取 $q^+=0$ 并解所需冲量。两种情况来自同一个互补条件，不需先猜完整碰撞时刻序列。

**教学例**令 $m=1,q=0.01,v^-=-1,h=0.02,g=10$，自由预测位置为−0.014米，故接触分支给 $v^+=-0.5$米/秒、$p=0.7$牛·秒。离散终点不穿透，但终点速度仍向下：这提醒我们位置级时间步进不是瞬时碰撞恢复系数公式，有限步长的状态需要连同离散定义解释。

[MuJoCo](071-mujoco.md)采用另一套接触求解设计，是平行数值模型；[接触轨迹优化](075-contact-trajopt.md)把同类互补关系放入优化约束，是模块组合。原稿数值实验检验步长缩小时的行为，不能由一次“不爆炸”推断接触力峰值或弹性碰撞波形准确。[原作者稿第7–8页](https://www.cse.lehigh.edu/~trink/Papers/STijnme96.pdf)

### 为什么位置层面的非穿透很重要

只约束下一步法向速度，未必能修复已有间隙误差。位置条件把时间步内推进的距离一起考虑，让冲量与下一时刻允许的位置相协调。不过几何曲率会带来另一个问题：满足当前切平面的条件，不一定满足真实弯曲边界。

原文 p.13 §3.6 明确讨论了这一风险。若接触法向和几何随姿态变化，连续使用线性化约束可能破坏耗散性，产生过大的、不物理的速度。作者因此提出以真实 $\phi(q_{k+1})$ 为基础的非线性互补条件，并通过一系列线性互补问题处理。

这里有三个不同层次：数学上求满足动量与互补关系的离散解；机制上将冲击和持续接触统一处理；实验上观察位置、速度和随步长变化的误差。求解器返回一个数值解，并不自动证明它对真实接触模型准确，也不自动证明每一时间步都能用很少计算完成。

互补条件把分离与接触放进同一步求解，冲量却不能直接当峰值力。下面先检查步长换算与动量变化，再读旋转杆和多球例子的收敛证据。

## 三、联合推进位置与速度，用冲量和平均力查单位

```text
输入：q, v，质量/几何模型，摩擦系数，步长 h
在预测位置附近建立可能激活的接触集合
构建各接触间隙、法向、切向方向和质量矩阵
把摩擦锥离散为若干切向方向
组装动量更新、位置更新及互补条件
求解速度和接触冲量
检查下一步位置是否违反其他接触约束
若有遗漏约束：加入接触集合并重新求解
若非线性几何需要修正：更新线性化并迭代
返回下一步 q、v、接触冲量及残差
```

这是教学流程。原文 §4 使用基于显式表与字典序退化处理的 Lemke 算法，初始考虑上一时刻活动约束和预测位置违反的约束，得到解后再查可行性。它仍需要几何接触检测；不逐个定位冲击时刻不等于“不用检测碰撞”。

### 小例子：同样的冲量，不同的平均力

**自构例子，未运行。** 1 kg 小块以 1 m/s 垂直向下运动，恰在一个时间步开始时接触水平地面，忽略该步重力并采用完全非弹性法向碰撞。若下一步速度为零，所需向上冲量为 1 N·s。用 0.01 s 步长解释其平均作用力得到 100 N；用 0.001 s 得到 1000 N。两者动量变化相同，因此不能只看“接触力峰值随细化增大”就认定积分发散。

五个前置概念是：冲量表示力的时间积分；单边约束只允许推而不允许拉；互补条件表达两个非负量不能同时为正；摩擦锥限制切向与法向作用的比例；数值收敛讨论步长细化后的模型解，而非直接讨论真实世界精度。

## 四、读杆落桌与多球实验，检查步长收敛口径


<!-- figure-ref-v6:start:rc-36-figure-4-anchor -->
<span id="rc-36-figure-4"></span>
<!-- figure-ref-v6:end:rc-36-figure-4-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/036-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/036-evidence.png" width="1267" height="1082" alt="Fig. 4：首次撞击附近不同步长出现不同尖峰，随后曲线又接近" loading="lazy"></a><figcaption>原论文结果图／表摘引：David E. Stewart、Jeffrey C. Trinkle（1996），Fig. 4，PDF 第 17 页；<a href="https://www.cse.lehigh.edu/~trink/Papers/STijnme96.pdf#page=17" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：首次撞击附近不同步长出现不同尖峰，随后曲线又接近。应把接触瞬间单独读：整体走势相似不能掩盖粗步长造成的瞬时数值误差。

### 实验和证明如何分工

杆和四球图来自作者 21 页稿；它们检验时间离散与接触序列，不能把细步长参考解当成真实世界的独立测量。

| 项目 | 原文设置 |
|---|---|
| 二维例子 | 有圆弧端部的杆落向水平桌面，不是完全无厚度的理想线段 |
| 杆参数 | p.14：中段长 0.5 m，质量 1 kg，半宽与端半径 0.05 m，惯量 0.002 kg·m²，摩擦系数 0.6 |
| 杆初值 | 与水平面夹角 30°，初始平移速度为零，角速度 4 rad/s |
| 三维例子 | 多球与桌面接触；四球问题检验多接触与摩擦耦合 |
| 摩擦近似 | 球实验使用八个切向方向近似摩擦圆锥 |
| 数值实现 | C 语言，Meschach 库，Lemke 型 LCP 求解 |
| 对照 | 同一模型下改变时间步长，比较速度、位置和速度变差 |
| 证据性质 | 数值算例与特定条件下的数学分析；不是带随机种子的机器人任务排行榜 |

该实验的“真值”也要仔细看。四球误差表以更细的 $h=0.00125$ 解作为参考，而非解析精确解或实验室动作捕捉。速度误差采用时间积分意义的差异，位置误差采用最大范数；不能将两个列直接当成同单位的可替代指标。

### 五处证据：哪些稳定性已经被观察到

**1．p.7 [Fig. 1](#rc-36-figure-1) 与式 (14)–(15)。** 图展示圆摩擦锥与多面体近似，方程展示几何、冲量和摩擦的联合约束。它说明有限方向近似如何让问题可计算，但也表明摩擦方向存在离散误差。

<!-- figure-ref-v6:start:rc-36-figure-1 -->
<figure class="reading-evidence-figure" id="rc-36-figure-1"><a href="/robot-classic/assets/figure-refs-v6/036-fig-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/036-fig-1.png" width="1050" height="757" alt="图1：连续摩擦圆锥与八个切向方向形成的多面体近似" loading="lazy"></a><figcaption>David E. Stewart、Jeffrey C. Trinkle（1996），图 1，PDF 第 7 页；<a href="https://www.cse.lehigh.edu/~trink/Papers/STijnme96.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/036-fig-1.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：圆形截面与内接多边形对应连续摩擦方向和离散基方向；更多方向可减小几何近似误差，同时增大计算问题规模。
<!-- figure-ref-v6:end:rc-36-figure-1 -->

**2．p.13 §3.6。** 作者主动指出线性化几何会造成非物理速度增长，并讨论非线性版本。它反驳了“隐式方法天然无条件物理正确”的笼统理解。

**3．p.15 [Fig. 2](#rc-36-figure-2)。** 杆在 $h=0.0025$ 下先自由下落、第一次撞击后继续转动、随后另一端碰桌。图上数字是时间标签，不是角度误差或计算耗时。它展示接触序列，并没有证明所有模型参数下都不会出现数值问题。

<!-- figure-ref-v6:start:rc-36-figure-2 -->
<figure class="reading-evidence-figure" id="rc-36-figure-2"><a href="/robot-classic/assets/figure-refs-v6/036-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/036-fig-2.png" width="647" height="868" alt="图2：下落并旋转的杆在步长0.0025下的连续构型" loading="lazy"></a><figcaption>David E. Stewart、Jeffrey C. Trinkle（1996），图 2，PDF 第 15 页；<a href="https://www.cse.lehigh.edu/~trink/Papers/STijnme96.pdf#page=15" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/036-fig-2.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：数字标注对应模拟时刻，杆先后发生接触并最终平躺；这是离散时间求解的几何结果，不是独立实验真值。
<!-- figure-ref-v6:end:rc-36-figure-2 -->

**4．p.16–17 [Fig. 3](#rc-36-figure-3)–[图 4](#rc-36-figure-4)。** 不同 $h$ 的竖直速度与角速度曲线在步长减小时趋于接近。原文 p.14 同时承认首次接触附近存在与位置式步进有关的角速度尖峰。细时间步改善观察结果，不能因此把粗步长尖峰忽略不计。

<!-- figure-ref-v6:start:rc-36-figure-3 -->
<figure class="reading-evidence-figure" id="rc-36-figure-3"><a href="/robot-classic/assets/figure-refs-v6/036-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/036-fig-3.png" width="1034" height="850" alt="图3：不同时间步长下旋转下落杆的垂直速度曲线及完整图例" loading="lazy"></a><figcaption>David E. Stewart、Jeffrey C. Trinkle（1996），图 3，PDF 第 16 页；<a href="https://www.cse.lehigh.edu/~trink/Papers/STijnme96.pdf#page=16" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/036-fig-3.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：各曲线在接触时刻出现跳变，步长减小时事件附近的差异缩小；应比较状态轨迹，而非把有限步长的跳变斜率解释为真实接触力。
<!-- figure-ref-v6:end:rc-36-figure-3 -->

<!-- figure-ref-v6:start:rc-36-links-119 -->
本页定位：[图 4内嵌图](#rc-36-figure-4)。
<!-- figure-ref-v6:end:rc-36-links-119 -->

**5．p.19 Table 1。** 四球问题中，步长从 0.02 减到 0.0025 时，速度误差由 0.5050 降到 0.0700，位置误差由 0.2505 降到 0.0298；参考步长为 0.00125。它支持这个例子的数值趋近趋势，但不构成所有接触系统统一收敛阶的实验验证。

<!-- figure-ref-v6:start:rc-36-table-1 -->
<figure class="reading-evidence-figure" id="rc-36-table-1"><a href="/robot-classic/assets/figure-refs-v6/036-table-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/036-table-1.png" width="759" height="205" alt="表1：四球数值解随步长变化的速度误差、位置误差和速度总变差" loading="lazy"></a><figcaption>David E. Stewart、Jeffrey C. Trinkle（1996），表 1，PDF 第 19 页；<a href="https://www.cse.lehigh.edu/~trink/Papers/STijnme96.pdf#page=19" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/036-table-1.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：参考行使用更细步长0.00125；两种误差量的定义不同，随步长下降只能支持该模型的数值趋近，不能代替现实精度验证。
<!-- figure-ref-v6:end:rc-36-table-1 -->

论文 p.17 说明四球问题可能产生 70×70 的 LCP，来源包括七个接触、每接触八个摩擦方向及其他变量。这个量级提醒我们：接触数和摩擦锥精度直接进入求解规模，不能只按物体数量估计计算量。

## 五、区分数值误差、接触模型与真实物理验证

代价有三类。第一，互补问题比一次显式欧拉更新复杂，退化、数值容差和接触筛选都影响实现。第二，多面体摩擦锥、时间离散和几何线性化是不同误差源，需要分别控制。第三，刚体非弹性模型忽略材料变形和某些恢复效应，即使数值解收敛，也可能收敛到与真实装置不一致的模型解。

作者承认的局限包括线性化几何的耗散问题和接触附近的数值尖峰。本文进一步分析：用于机器人学习时，策略可能利用固定步长、低分辨率摩擦方向或错误接触参数形成模拟器特有的动作。因此物理引擎“可以稳定运行”只是训练基础，不能代替对接触残差与真实动作的检验。

## 六、追问：接触步只更新速度、不校验下一位置，会遗漏什么约束？

<details>
<summary>接触步只更新速度、不校验下一位置，会遗漏什么约束？</summary>

**参考答案**：冲量修正了动量，但位置更新还可能使几何间隙为负。应该在同一个时间步中核对下一速度、下一位置与接触间隙，而非只观察速度是否被制动。这里借用[Tedrake接触章节把阶段演化与切换分开的讲法](https://underactuated.mit.edu/contact.html)，解释本文位置层非穿透的职责；并不将混合事件求解和本篇时间步进视为同一算法。

</details>

## 七、把接触模型接入优化和仿真组件

- **直接继承**：[接触隐式轨迹优化：不先规定哪只脚何时落地](075-contact-trajopt.md)。把互补接触作用纳入轨迹优化的决策变量。
- **平行路线**：[MuJoCo：让物理仿真成为控制优化的内循环](071-mujoco.md)。用另一套接触求解设计换取可计算性，需比较不同模型假设。

## 八、自测与参考答案

**问题 1：为什么 $p_n\ge0$、$\phi\ge0$ 还不够，必须加入 $p_n\phi=0$？**

**参考答案：**前两个条件仍允许物体悬空时受到地面的正冲量。乘积为零排除了“有间隙又有接触推力”。它允许接触时压力为零，所以不会强迫每个碰巧贴合的接触都受力。

**问题 2：时间步缩小后碰撞力峰值增大，为什么不一定是坏事？**

**参考答案：**刚体冲击关注有限动量跳变，而平均力近似等于冲量除以步长。冲量稳定、速度跳变趋近而力峰增大，可能正是冲击被压缩进更短时间区间的表现。应检查冲量、状态和残差，而不是把有限峰值当作刚体模型必须满足的条件。

**问题 3：误差表随步长减小而改善，能否证明模拟器能准确预测真实抓取？**

**参考答案：**不能。该表主要比较同一模型的粗细时间离散，参考也只是更细数值解。真实抓取还依赖摩擦系数、接触形状、顺应性和执行器模型。必须分别检验离散收敛与模型对现实的有效性；二者都好，预测才可能可靠。
