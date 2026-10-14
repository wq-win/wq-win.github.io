# 009｜构型空间：把有体积的机器人变成空间中的一个点

[系列首页](README.md) · [上一篇](008-lucas-kanade.md) · [下一篇](010-featherstone.md)

**原论文**：Tomás Lozano-Pérez，*Spatial Planning: A Configuration Space Approach*，1983，IEEE Transactions on Computers C-32(2):108–120。[作者保存全文](https://lis.csail.mit.edu/pubs/tlp/spatial-planning.pdf)。相关MIT技术报告早于期刊版；本文使用1983年期刊的章节、定理与图号。

### 先接住前作的问题

[A*](003-astar.md)只能优化已给定图，若图忽略机器人尺寸，最短路也可能撞墙。本篇把刚体几何吸收到构型禁区中。

## 一、问题设定：机身尺寸与姿态怎样变成搜索的禁区

机器人中心点没有碰墙，不代表机器人本体没有碰墙。规划时若一直让复杂形状在障碍物之间运动，碰撞关系很难直接搜索。构型空间把机器人每一个完整姿态表示成一个点，再把会导致碰撞的姿态收集成“构型空间障碍物”。

### 工作空间与构型空间有什么不同

工作空间是物体所在的二维或三维环境。构型空间的每个坐标描述一个独立自由度。平面刚体可以平移和转动，通常需要$(x,y,\theta)$；固定朝向时只需要$(x,y)$。机械臂则通常使用关节变量作为构型坐标。

| 概念 | 含义 |
|---|---|
| Findspace | 找到一个能安全放置物体的构型 |
| Findpath | 找到起终构型之间连续安全的构型序列 |
| C-obstacle | 所有使机器人与某障碍物相交的构型集合 |
| C-free | 允许的构型集合，需同时满足工作区域等限制 |
| 输入与输出 | 输入几何和约束；输出可行构型或路径 |

原文考虑固定凸多边形／多面体障碍物，并允许用凸部分的并集表示运动对象。非凸形状、旋转和高维扩展有各自处理，不能把二维固定朝向公式直接当成六自由度空间的全部算法。

## 二、从刚体放置推导反射与Minkowski和

### 关键公式：为什么要反射机器人的形状

固定朝向，只允许平移。设A是机器人相对参考点的形状，B是障碍物，平移为q。发生碰撞意味着存在$a\in A,b\in B$，满足$q+a=b$，因此$q=b-a$。

于是：

$$
C_{obs}=B\oplus(-A)=\{b-a\mid b\in B,a\in A\}.
$$

$\oplus$是Minkowski和，$-A$把机器人形状关于参考原点反射。原文§II Theorem 1用集合差表述这个关系。这里的减号不是从障碍物里删掉机器人，而是构造所有导致重叠的参考点位置。

如果A是圆盘，反射后不变，结果看起来像把障碍物向外加粗一个半径。但对偏置或不对称机器人，简单统一加粗不足以表达精确几何。参考点放在哪里也会平移C-obstacle，因此实现中必须与机器人位姿定义一致。

一个不对称的一维例子能立刻检验反射方向。令机器人的参考点在左端，形状 $A=[0,2]$，障碍物 $B=[5,6]$。则 $-A=[-2,0]$，禁区为 $[3,6]$。取参考点 $q=4$ 时，机器人占据 $[4,6]$，确实与障碍相交；误用 $B\oplus A=[5,8]$ 则会把这个碰撞漏掉。这里把接触也计为碰撞，若允许恰好接触，需要另行规定边界是开集还是闭集。

朝向改变后，应写 $C_{obs}(\theta)=B\oplus[-R(\theta)A]$，并把各切片堆入 $(x,y,\theta)$ 空间。原创窄门检查：机器人长0.8米、宽0.3米，长边与通行方向夹角为 $\theta$，横向投影宽度为 $0.8|\sin\theta|+0.3|\cos\theta|$。0度时宽0.3米，可通过0.5米门；45度时约0.778米，便不可通过。端点朝向可行不意味着中间朝向可行。

### 几何结构为什么带来算法收益

对两个按边界顺序存储的凸多边形，Minkowski和的边可以按方向合并。原文Theorem 2给出与两者顶点数之和线性相关的构造复杂度。收益来自凸性和有序边界结构，不是任意非凸几何都同样容易。

在二维固定朝向场景，可以构造可见图：连接起点、终点和构型障碍物的可见顶点，然后搜索图上的最短路。原文同时指出，这种最短路线贴近障碍边界，对几何误差非常敏感；并明确不能直接把三维情况归结为同样的顶点连接最优性。

因此“把碰撞变成点问题”只是表示层简化，搜索空间仍可能高维且拓扑复杂。采样规划后来选择按需查询碰撞，而不是先精确画出全部C-obstacle，也可以理解为对显式表示成本的回应。

反射与集合相加改变的是禁止的完整构型，不是机器人的物理尺寸。下面把这个查询放到门口转身例子中，检查仅验证中心点会漏掉什么碰撞。

## 三、实现构型碰撞查询，用门口旋转检验表示

```text
输入：固定朝向机器人多边形A，障碍物集合B，起终参考点
把A转换为相对机器人参考点的坐标
构造反射形状-A
对每个障碍物Bj：
    计算Bj与-A的Minkowski和，得到对应禁区
合并禁区并加入工作区域边界约束
在允许区域构造搜索结构
搜索起点到终点的点路径
把点路径解释为机器人参考点运动，并检查连续碰撞
输出路径或不存在可行路径的结论
```

伪代码针对固定朝向的教学情形。允许旋转时，对每个角度都有不同的平移禁区，形成更高维障碍物；不能只在起点姿态膨胀一次，然后允许机器人任意旋转。

### 教学例子：门够宽，为什么仍过不去

设圆形机器人半径0.3米，门宽0.5米。若只看中心点，门中间似乎有路；构型空间将两侧墙各扩张0.3米，禁区重叠，中心点没有通路。这正确表达了机器人直径0.6米大于门宽。

改成细长矩形机器人，长0.8米、宽0.3米。朝向与门平行时可能无法穿过，转到适当角度后可能可行。二维位置地图无法表达这种差别，需要把朝向放进构型。即使起点和终点都安全，也必须检查整个转动过程，长角可能扫到墙。

这些都是自构例子。它们展示表示必要性，不是原论文测得的硬件通过率。实际还应为定位误差与控制偏差留裕量，否则几何上刚好可通的门可能在执行时碰撞。

## 四、核对原文几何构造与教学示意的覆盖范围

<!-- figure-ref-v6:start:rc-9-figure-4-anchor -->
<span id="rc-9-figure-4"></span>
<!-- figure-ref-v6:end:rc-9-figure-4-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/009-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/009-evidence.png" width="797" height="450" alt="Fig. 4：图里移动的是整个物体 A，但碰撞检验被改写为参考点是否进入扩大后的禁区" loading="lazy"></a><figcaption>原论文方法图摘引：Tomás Lozano-Pérez（1983），Fig. 4，PDF 第 4 页；<a href="https://lis.csail.mit.edu/pubs/tlp/spatial-planning.pdf#page=4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：图里移动的是整个物体 A，但碰撞检验被改写为参考点是否进入扩大后的禁区。这里保持朝向不变，不能省略旋转自由度后仍声称覆盖任意刚体运动。

### 原文证据地图

**§I、[图 1](#rc-9-figure-1)–[图 3](#rc-9-figure-3)。** 放置、找路与点化表示；两类空间任务可统一表述；未知地图或动力学可行性。

<!-- figure-ref-v6:start:rc-9-figure-1 -->
<figure class="reading-evidence-figure" id="rc-9-figure-1"><a href="/robot-classic/assets/figure-refs-v6/009-fig-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/009-fig-1.png" width="542" height="499" alt="Lozano-Pérez（1983）图1：放置问题与找路问题的二维几何示例" loading="lazy"></a><figcaption>Tomás Lozano-Pérez（1983），图 1，PDF 第 2 页；<a href="https://lis.csail.mit.edu/pubs/tlp/spatial-planning.pdf#page=2" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上下面板分别要求找到一个合法放置位置与一条连续无碰撞路径，二者的任务不同。
<!-- figure-ref-v6:end:rc-9-figure-1 -->

<!-- figure-ref-v6:start:rc-9-figure-2 -->
<figure class="reading-evidence-figure" id="rc-9-figure-2"><a href="/robot-classic/assets/figure-refs-v6/009-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/009-fig-2.png" width="586" height="251" alt="Lozano-Pérez（1983）图2：固定姿态物体A相对障碍B的构型障碍区域" loading="lazy"></a><figcaption>Tomás Lozano-Pérez（1983），图 2，PDF 第 3 页；<a href="https://lis.csail.mit.edu/pubs/tlp/spatial-planning.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：阴影区域表示参考点不能进入的区域，已把移动物体的尺寸计入。
<!-- figure-ref-v6:end:rc-9-figure-2 -->

<!-- figure-ref-v6:start:rc-9-figure-3 -->
<figure class="reading-evidence-figure" id="rc-9-figure-3"><a href="/robot-classic/assets/figure-refs-v6/009-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/009-fig-3.png" width="571" height="234" alt="Lozano-Pérez（1983）图3：原空间找路和构型障碍中的参考点路径" loading="lazy"></a><figcaption>Tomás Lozano-Pérez（1983），图 3，PDF 第 3 页；<a href="https://lis.csail.mit.edu/pubs/tlp/spatial-planning.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：路径绕过扩张后的构型障碍，而不是只检验一个忽略形状的点是否碰到原障碍。
<!-- figure-ref-v6:end:rc-9-figure-3 -->

**§II、Theorem 1、[图 4](#rc-9-figure-4)。** 固定朝向的集合关系；碰撞禁区可由形状差构造；不能据此推出：任意旋转无需额外维度。

**§II、Theorem 2、[图 7](#rc-9-figure-7)。** 凸多边形边合并；特定几何下的线性构造复杂度；不能据此推出：任意非凸物体同样线性。

<!-- figure-ref-v6:start:rc-9-figure-7 -->
<figure class="reading-evidence-figure" id="rc-9-figure-7"><a href="/robot-classic/assets/figure-refs-v6/009-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/009-fig-7.png" width="600" height="311" alt="Lozano-Pérez（1983）图7：凸多边形按边法向顺序合并构造形状差" loading="lazy"></a><figcaption>Tomás Lozano-Pérez（1983），图 7，PDF 第 5 页；<a href="https://lis.csail.mit.edu/pubs/tlp/spatial-planning.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：图中的边法向次序对应凸多边形的合并步骤，线性复杂度依赖凸性条件。
<!-- figure-ref-v6:end:rc-9-figure-7 -->

**§III—V。** 旋转与三维多面体扩展；说明更一般构型障碍的结构；不能据此推出：低成本解决所有高维规划。

**§VI—VII。** 切片投影近似与工业机器人扩展；显式讨论表示成本和扩展；不能据此推出：近似路径自动满足全部真实约束。

这篇论文主要用几何定义、证明和构造算法建立论证，不是以大规模机器人训练实验为核心。训练预算与随机种子在这种证明设定中不适用。若实现近似切片，应评价近似方向是否保守、是否漏掉可行通路，以及计算成本，而非只展示一张成功路径图。

## 五、区分无碰撞构型、动力学可执行性与表示规模

汽车的非完整约束限制瞬时运动方向。构型路径即使不碰障碍，仍可能要求汽车横移。需要在规划中加入运动模型；时间参数化还要满足速度、加速度和驱动力限制。

动态障碍则使同一位置在不同时间具有不同安全性，可能需要将时间纳入状态。地图不确定性也不能由确定性的C-obstacle公式直接覆盖；常用安全膨胀只是近似，过度膨胀又可能排除所有路径。

五个前置概念是：自由度决定构型维数；工作空间描述真实环境；Minkowski和构造几何组合；凸性带来可利用结构；连续路径要求中间运动全部满足约束。

## 六、追问：若只预计算一个朝向的障碍膨胀，能否用于任意转向的机器人？

<details>
<summary>若只预计算一个朝向的障碍膨胀，能否用于任意转向的机器人？</summary>

**参考答案**：只能在固定朝向或另有保守包络条件下使用。旋转改变机器人形状相对障碍的占据范围，因而改变构型禁区。正文门口例子应在多个朝向分别检查，而不能用同一二维膨胀结果证明转弯过程无碰撞；引入朝向状态会增加构型表示与查询的成本。

</details>

## 七、按需查询距离，再采样高维自由空间

- **模块组合**：[GJK：不枚举所有表面，也能求物体距离](022-gilbert-distance.md)。用凸体距离查询支撑按需碰撞判断，不必显式列出整个构型禁区。
- **模块组合**：[PRM：先把自由空间修成路网，再回答运动查询](035-prm.md)。在高维自由构型中采样并连接道路图。

## 八、自测与参考答案

**问题1：为什么是$B\oplus(-A)$，而不是简单的$B\oplus A$？**

参考答案：碰撞条件是$q+a=b$，所以参考点$q=b-a$。只有A关于原点对称时，反射前后形状相同，才会看起来不需要负号。

**问题2：机器人变成一个点后，尺寸信息去了哪里？**

参考答案：进入C-obstacle的形状。不同尺寸和参考点会产生不同禁区；使用原始障碍物配合点机器人会丢失必要信息。

**问题3：起点和终点不碰撞，为什么直线插值仍可能撞？**

参考答案：自由空间一般非凸，两个安全构型之间可能隔着禁区。还可能在姿态插值时扫过障碍，必须检查完整运动而非仅检查端点。
