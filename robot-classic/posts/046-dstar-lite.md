# 046｜D* Lite：地图变了，只修复受到影响的搜索结果

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](045-fastslam.md) · [下一篇](047-preview-zmp.md)

**论文**：Sven Koenig、Maxim Likhachev，*D\* Lite*，AAAI 2002，476–483。[八页会议原文](https://cdn.aaai.org/AAAI/2002/AAAI02-072.pdf) · [作者主页及勘误](https://idm-lab.org/bib/abstracts/Koen02e.html)。

### 先接住前作的问题

[D*](032-dstar.md)证明重规划可以复用旧信息，但算法结构不易维护。本篇从LPA*构造另一套局部一致性修复。

## 一、问题设定：起点移动和边代价改变时怎样修复局部一致性

机器人刚算好去目标的路，走两步发现前面不能通过。重新运行 A* 可以找到新路，但会重复做很多没有变化的计算。D* Lite 保存上次搜索的距离信息，只传播因地图变化而失效、同时又影响当前路径的部分。

### 问题设定：未知地形怎样变成边成本变化

图为 $G=(V,E)$，边成本满足 $0<c(u,v)\le\infty$。无穷表示不可通行。原文动机使用八连通网格，未观察格子先假设可通过，机器人看到障碍后把对应边成本调为无穷。算法本身还支持成本下降，并不限于只在机器人附近发生变化。

输入是当前起点、固定目标、图结构、边成本变化及启发式；输出当前图中最短路径的下一步或不可达结论。它不估计位姿，不学习障碍概率，没有强化学习奖励。感知、地图维护和低层控制在算法之外。

未知区域按空闲处理是本文导航策略的一部分，不是现实环境一定安全的论断。机器人需要在执行不可逆移动之前获得足够感知；有制动距离和动态障碍时，应由更完整的状态空间或安全控制处理。

## 二、用g与rhs区分已存代价和一步前瞻

### 为什么移动起点不必重新整理整堆节点

机器人移动后，$h(s_{start},s)$ 会变化。直接给队列每个节点重新计算优先级，需要遍历整个队列。D* Lite 利用启发式的三角不等式，让旧键保持新键的适当下界，只有节点被取出时才检查是否需要重新入队。

在检测到成本变化并准备重规划时，原文更新

$$k_m\leftarrow k_m+h(s_{last},s_{start}),\qquad s_{last}\leftarrow s_{start}.$$

这种延迟处理要求启发式对任意相关节点对保持可采纳性和相应三角不等式。随意放大一个不一致的启发式，可能破坏这里的排序论证；不能只保留伪代码、丢掉前提。

### 教学伪代码：使用基本版，避免混入优化版停止条件

下面对应 [Figure 3](#rc-46-figure-3) 的基本形式。它比 [Figure 4](#rc-46-figure-4) 的优化版更容易读，关键是每个节点变化后更新其前驱，因为这些节点到目标的路线可能依赖它。

<!-- figure-ref-v6:start:rc-46-figure-3 -->
<figure class="reading-evidence-figure" id="rc-46-figure-3"><a href="/robot-classic/assets/figure-refs-v6/046-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/046-figure-3.png" width="544" height="721" alt="原论文 Figure 3：D星Lite基础版完整伪代码" loading="lazy"></a><figcaption>原论文图摘引：Koenig、Likhachev（2002），Figure 3，PDF 第 4 页；<a href="https://cdn.aaai.org/AAAI/2002/AAAI02-072.pdf#page=4" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：把CalculateKey、UpdateVertex和ComputeShortestPath连起来看：不一致顶点进入队列，主循环在边代价变化后修复已有搜索结果。
<!-- figure-ref-v6:end:rc-46-figure-3 -->

<!-- figure-ref-v6:start:rc-46-figure-4 -->
<figure class="reading-evidence-figure" id="rc-46-figure-4"><a href="/robot-classic/assets/figure-refs-v6/046-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/046-figure-4.png" width="546" height="943" alt="原论文 Figure 4：D星Lite优化版完整伪代码" loading="lazy"></a><figcaption>原论文图摘引：Koenig、Likhachev（2002），Figure 4，PDF 第 5 页；<a href="https://cdn.aaai.org/AAAI/2002/AAAI02-072.pdf#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：与基础版相比，更新分支区分旧代价与新代价，移动起点时累积km；这些细节改变更新工作量，不改变任务的最短路目标。
<!-- figure-ref-v6:end:rc-46-figure-4 -->

输入到输出的关键环节是“新地图 → 受影响节点的 rhs → 队列 → 距离修复 → 下一步”。不是看到一个障碍就把整张 $g$ 表清空。图为有向时，前驱与后继的方向尤其不能互换。

### 一个正式勘误揭示了版本差异

作者主页指出：[Figure 4](#rc-46-figure-4) 优化版第 33 行注释应检查 $rhs(s_{start})=\infty$，而不是 $g(s_{start})=\infty$。原因是优化版允许起点仍处于某种局部不一致状态时提前结束，保存的 $g$ 可能尚未降低，而 $rhs$ 已含有正确可行代价。

基本版要求起点一致，所以上面使用 $g$ 没有同一问题。把优化版循环条件与基本版的不可达判断随意拼接，才会产生难以发现的误判。这个例子说明伪代码中的“少处理一个节点”也会改变返回时可以假设的不变量。

g与rhs不一致分成两种方向，键修正和停止条件必须使用同一算法版本。下面保留基本版完整循环，用小图检查什么时候起点路线已经可信。

## 三、执行基本版队列循环，检查键修正与停止条件

```text
初始化：所有 g、rhs = infinity；rhs(goal) = 0
km = 0；将 goal 以当前 key 放进队列 U

UpdateVertex(u):
    若 u != goal：rhs(u) = min_{v in Succ(u)} [c(u,v)+g(v)]
    移除 U 中 u 的旧记录
    若 g(u) != rhs(u)：以 key(u) 重新加入 U

Repair():
    while U 的最小键 < key(start) 或 rhs(start) != g(start):
        取出最小键节点 u，并保存其旧键
        if 旧键 < 重新计算的 key(u):
            以新键重新插入 u
        else if g(u) > rhs(u):
            g(u) = rhs(u)
            对所有 Pred(u) 调用 UpdateVertex
        else:
            g(u) = infinity
            对 Pred(u) 以及 u 本身调用 UpdateVertex

先 Repair()
while start != goal:
    若 g(start) 为 infinity：报告当前图不可达并停止
    选择最小化 c(start,v)+g(v) 的后继，移动并感知
    若发现边成本变化：
        更新 km 和上一次起点
        更新所有改变的有向边 (u,v)，对 u 调用 UpdateVertex
        Repair()
```

### 一个自构例子与前置概念

起点到目标有两条路，旧最优路代价为 5，另一条为 7。机器人发现旧路中一条边关闭，受影响节点的 $rhs$ 上升，而旧 $g$ 仍为 5，于是出现过于乐观的不一致。算法撤销该值并向前驱传播，最终让起点选择代价 7 的替代路线；不依赖关闭边的区域无需全部重算。

如果以后这条边重新开放，$rhs$ 可以下降，算法也能传播改善，而非仅处理障碍新增。

五个前置概念：**Bellman 最优性**用后继最优代价描述当前最优代价；**局部一致性**比较保存值与一步前瞻；**增量搜索**跨问题实例复用结果；**字典序键**先比较第一项再比较第二项；**可采纳启发式**不高估相关真实最短代价。

## 四、把理论保证、版本差异和计时实验拆开读

<!-- figure-ref-v6:start:rc-46-figure-7-anchor -->
<span id="rc-46-figure-7"></span>
<!-- figure-ref-v6:end:rc-46-figure-7-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/046-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/046-evidence.png" width="753" height="635" alt="Fig. 7：自适应网格上的三个操作量随问题条件一起变化，完整算法和去掉某些机制的版本可能接近" loading="lazy"></a><figcaption>原论文结果图／表摘引：Sven Koenig、Maxim Likhachev（2002），Fig. 7，PDF 第 7 页；<a href="https://cdn.aaai.org/AAAI/2002/AAAI02-072.pdf#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：自适应网格上的三个操作量随问题条件一起变化，完整算法和去掉某些机制的版本可能接近。它说明收益依赖表示与工作负载，不能凭单一结构宣布每项机制始终必要。

### 理论和实验分别回答什么

基本版与优化版停止条件不同；作者勘误要求优化版用 $rhs(start)$ 判断无路，不能把基本版返回条件直接照搬。

数学目标是当前图的路径成本总和最小。算法机制是增量修复和启发式排序。实验改善指标主要是节点展开、节点访问与堆调整次数，而不是路径成本进一步降低：不同方法本来就在执行同样的最短路导航策略。

会议文 Theorem 8 给出终止和正确性陈述。每次修复调用中的节点展开有界，并非说机器人整个任务中每节点最多展开两次；边成本多次变化，可以触发多轮修复。成本变化在一次求解过程中需要形成明确的问题实例，持续无休止地修改图不属于一次静态修复的终止证明。

| 实验 | 原文设置 | 对照与评价 |
|---|---|---|
| D* 对比 | 七种地形尺寸，各 50 个随机地形，障碍密度 10%–40% | 同样二叉堆实现，比较三类操作计数，95% 置信区间 |
| 均匀网格导航 | 八邻域感知和移动；各方向单步代价为 1 | 去掉增量机制，或去掉启发式，检查两者贡献 |
| 自适应离散导航 | 六种尺寸，各 25 个随机地形，密度 30% | 非均匀网格上的机制收益是否仍然成立 |
| 贪心探索 | 64×25 网格，50 个随机样例，改变传感范围 | 到最近未知区域的计算代价 |
| 实体机器人 | 本文采用模拟对比 | 已有 D* 实机应用不是这篇新增实机实验 |
| 硬件与训练 | 无学习训练；主指标刻意采用操作计数 | 不能将操作数比例直接换算成现代硬件耗时 |

原网格对角移动也按代价 1 计算，因此使用最大坐标差作为启发式。在横直代价 1、对角代价 $\sqrt2$ 的另一个网格中，要重新对应启发式与成本，不能说两种实验路线完全相同。

### 五处具体证据

**[Figure 1](#rc-46-figure-1)，第 477 页**：新障碍出现后，只有部分目标距离变化，而且其中一些与当前路线无关。支持“只修相关变化”的动机，不是所有地图都一定只影响少量节点。

<!-- figure-ref-v6:start:rc-46-figure-1 -->
<figure class="reading-evidence-figure" id="rc-46-figure-1"><a href="/robot-classic/assets/figure-refs-v6/046-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/046-figure-1.png" width="443" height="396" alt="原论文 Figure 1：机器人首次移动前后的网格代价" loading="lazy"></a><figcaption>原论文图摘引：Koenig、Likhachev（2002），Figure 1，PDF 第 2 页；<a href="https://cdn.aaai.org/AAAI/2002/AAAI02-072.pdf#page=2" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：上下网格对照新障碍被发现前后的信息，灰色区域标出发生变化的距离；环境更新并不要求每个格点重新计算。
<!-- figure-ref-v6:end:rc-46-figure-1 -->

**[Figure 3](#rc-46-figure-3)–[图 4](#rc-46-figure-4)，第 479–480 页**：基本版与优化版可逐项比较，展示更新、优先级和停止条件。配合正式勘误，是复现正确性的重要来源。

**[Figure 5](#rc-46-figure-5)，第 481 页**：D* 的操作数表示为相对 D* Lite 的额外百分比，基准 D* Lite 固定为零。零表示归一化基线，不是没有计算；额外百分比也不是耗时秒数。

<!-- figure-ref-v6:start:rc-46-figure-5 -->
<figure class="reading-evidence-figure" id="rc-46-figure-5"><a href="/robot-classic/assets/figure-refs-v6/046-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/046-figure-5.png" width="551" height="462" alt="原论文 Figure 5：Focused D星相对D星Lite的三项开销" loading="lazy"></a><figcaption>原论文图摘引：Koenig、Likhachev（2002），Figure 5，PDF 第 6 页；<a href="https://cdn.aaai.org/AAAI/2002/AAAI02-072.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：三块图分别统计额外顶点扩展、顶点访问和堆调整，横轴均为迷宫尺寸；百分比开销不能直接当作总运行时间。
<!-- figure-ref-v6:end:rc-46-figure-5 -->

**[Figure 6](#rc-46-figure-6)，第 482 页**：均匀网格中增量和启发式结合总体有利，但正文指出小尺寸下某些堆操作差异不显著。不能只挑最大的节点展开倍率概括所有指标。

<!-- figure-ref-v6:start:rc-46-figure-6-reviewed -->
<figure class="reading-evidence-figure" id="rc-46-figure-6"><a href="/robot-classic/assets/figure-refs-v6/046-fig-6-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/046-fig-6-reviewed.png" width="640" height="545" alt="均匀离散化目标导航中三项搜索工作量比较" loading="lazy"></a><figcaption>原论文图摘引：Sven Koenig、Maxim Likhachev，D\ Lite，AAAI 2002，476–483，图 6，PDF 第 7 页；<a href="https://idm-lab.org/bib/abstracts/Koen02e.html#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。点击图片可放大。</figcaption></figure>

读图：三个面板分别统计顶点扩展、访问和堆操作，不能把其中一个数量的减少直接当作同倍墙钟时间加速。
<!-- figure-ref-v6:end:rc-46-figure-6-reviewed -->


**[Figure 7–8](#rc-46-figure-7)，第 482–483 页**：自适应网格中去掉启发式的版本可与完整版本接近；探索任务也有少数操作指标例外。支持算法收益依赖图结构和观测范围，反驳“两个机制在任何任务都等量必要”。

<!-- figure-ref-v6:start:rc-46-figure-8-reviewed -->
<figure class="reading-evidence-figure" id="rc-46-figure-8"><a href="/robot-classic/assets/figure-refs-v6/046-fig-8-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/046-fig-8-reviewed.png" width="640" height="518" alt="未知地形建图任务中三项搜索工作量随传感范围变化" loading="lazy"></a><figcaption>原论文图摘引：Sven Koenig、Maxim Likhachev，D\ Lite，AAAI 2002，476–483，图 8，PDF 第 7 页；<a href="https://idm-lab.org/bib/abstracts/Koen02e.html#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。点击图片可放大。</figcaption></figure>

读图：横轴改为传感器范围，这与目标导航实验不是同一个自变量；该图补齐增量修复在另一任务设置下的对照。
<!-- figure-ref-v6:end:rc-46-figure-8-reviewed -->


## 五、限制有限图模型、队列维护与地图未知性

### 两个值：g 是已保存的判断，rhs 是邻居给出的新意见

因为搜索从目标反向传播，$g(s)$ 估计状态 $s$ 到目标的代价。一步前瞻值为

$$rhs(s)=\begin{cases}0,&s=s_g,\\\min_{v\in Succ(s)}[c(s,v)+g(v)],&s\ne s_g.\end{cases}$$

如果 $g(s)=rhs(s)$，该节点局部一致。若不相等，就有信息需要处理。

- $g(s)>rhs(s)$：邻居发现了更便宜的路径，可以把保存值降低到前瞻值。
- $g(s)<rhs(s)$：保存值过于乐观，可能依赖已经失效的边；先撤销旧值，再传播影响。

局部一致只意味着当前节点与邻居保存值相符，不必然表示每个节点都已经得到全图真值。算法还需要优先级和正确的停止条件，保证与当前起点相关的未解决影响已经处理。

优先队列按二维键的字典序排列：

$$key(s)=\left[\min(g(s),rhs(s))+h(s_{start},s)+k_m,\;\min(g(s),rhs(s))\right].$$

第一项类似 A* 的估计总代价，第二项处理相同第一项的顺序。$k_m$ 是起点移动后的累计键修正量，不是路径实际成本，也不改变最短路目标。

### 不一致有两种方向，不能用同一种赋值修复

若 $g(s)=5,rhs(s)=3$，已保存代价偏高，可把3传播出去；若 $g(s)=3,rhs(s)=5$，旧值偏乐观，直接把邻居当作仍可信会留下循环依赖，需撤销旧承诺再重算。**教学图**令 $s$ 两个后继代价为 $1+g(a)=3$ 与 $2+g(b)=4$，把第一条边从1改成6后，$rhs(s)$变为4而非8，因为第二分支成为最优。

本篇承接[D*](032-dstar.md)的地图变化问题，但直接算法基础是Lifelong Planning A*；后作[AD*](052-anytime-dstar.md)再把时间不足时的质量—预算权衡接进来。[作者勘误页](https://idm-lab.org/bib/abstracts/Koen02e.html)特别更正优化版“没有已知路径”的判断应看 $rhs(s_{start})$，这说明证明、伪代码版本和停止条件必须成套使用。评估重规划时间时，旧图上已有解的建立成本与后续修复成本应分别记录。

### 贡献与代价

本文的重要贡献是把重规划写成结构清楚、便于分析的局部一致性维护，而不是只报告比 A* 快。额外的 $rhs$、队列状态和旧键维护增加实现复杂度；若变化范围巨大或者图很小，复用收益可能不足以覆盖维护成本。

图上的最短路径不等于连续空间最短路，更不等于机器人动力学可执行轨迹。障碍膨胀、网格分辨率、转弯约束和感知时延会决定真实安全性。若目标也不断移动，需要重新分析或使用相应扩展，本文主要处理固定目标与移动起点。

**作者实验支持的结论**是特定模拟任务中的操作计数优势。**进一步分析**是部署时还应记录每次修复的尾部延迟、地图更新成本和控制截止时间，而不是只报告全程平均规划时间。

## 六、追问：同一条边先涨价再降价，为什么测试不能只检查最终地图？

<details>
<summary>同一条边先涨价再降价，为什么测试不能只检查最终地图？</summary>

**参考答案**：最终最短路可能与初始相同，但中间搜索状态经历了不同方向的不一致。测试应在两次变化后分别检查返回路径及其成本，并核对队列是否还含过期键。可用一个有两条绕行路线的小图逐次计算，而不是只比较最后一条路；这样检查的是增量状态维护，而非一次静态搜索。

</details>

## 七、将增量修复与随时改进结合

- **直接继承**：[AD*：先给有质量界的路线，再随时间和地图一起改进](052-anytime-dstar.md)。在局部一致性复用之上加入可调的有界次优质量。

## 八、自测与参考答案

**问题 1：g 小于 rhs 和 g 大于 rhs 为什么不能用同一个赋值处理？**

**参考答案**：前者的旧代价可能依赖已失效路径，需要撤销并让依赖它的前驱重新判断；后者已有更便宜候选，可以直接降低保存值。简单全部赋值为 rhs，可能保留循环依赖的错误旧信息，破坏修复不变量。

**问题 2：km 加进所有新键，是否改变了最短路径的长度？**

**参考答案**：没有。它服务于队列的相对排序和延迟更新，实际路径选择仍使用边成本加后继 g。把 km 加进地图边成本或最终报告路径长度，会混淆调度辅助量与优化目标。

**问题 3：优化版返回后 g(start) 还是无穷，为什么可能已经存在路径？**

**参考答案**：优化版可以在起点过一致、rhs 已有限而 g 尚未更新时停止，因为继续处理起点只会把 g 降到 rhs，不改变下一步选择。作者勘误因此要求检查 rhs；基本版要求完全局部一致，返回时的条件不同。


