# 062｜RRT*：让随机树在找到路径后继续变好

[返回总览](00-发展时间线总览.md) · [上一篇：STOMP](061-stomp.md) · [下一篇：g2o](063-g2o.md)

**论文**：Sertac Karaman、Emilio Frazzoli，*Sampling-Based Algorithms for Optimal Motion Planning*，2011。[原论文](https://arxiv.org/html/1105.1186) · [论文记录](https://arxiv.org/abs/1105.1186)。

补充来源：[Solovey 等人的后续论文摘要](https://arxiv.org/abs/1909.09688) · [正式出版记录](https://www.research-collection.ethz.ch/items/29513524-b114-40a5-999f-0ba59430bd28)。

### 先接住前作的问题

[RRT](040-rrt.md)不断长树，却保留早期昂贵绕路。RRT*加选父和重接，并研究连接尺度。

## 一、问题设定：新采样怎样修复随机树中早先形成的绕路

普通 RRT 很会“先找到一条路”：随机采样一个位置，让已有树朝那里长一段。但新点通常接在最近的旧点上，早期形成的绕路关系会一直保留。增加很多点，不等于旧路线自动变好。

### 2.1 这是几何路径规划

输入包含自由配置空间、起点、目标区域和路径成本。输出是一条不穿障碍物、从起点到达目标区域的曲线。

路径的参数不一定是真实时间。将空间最短曲线交给汽车，并不代表汽车能够在转向半径限制下沿它行驶。原文的基本结果不应直接扩展到任意动力学约束、动态障碍或接触模式切换。

它没有训练数据集、策略网络或奖励模型。随机性用于探索空间，而不是用随机梯度训练参数。终止通常由时间或样本预算控制；若找到了可行解，可以随时返回当时最好路径。

### 2.2 三个容易混淆的保证

**概率完备性**讨论：存在满足条件的可行路径时，失败概率是否随着采样增加趋于零。

**渐近最优性**讨论：最好路径成本是否几乎必然趋于最优成本。

**有限预算性能**讨论：给一秒钟，成功率、路径长度和波动到底怎样。这是部署最关心的问题，却不能仅由前两个极限命题回答。

理论还要求适当的路径鲁棒性和成本连续性。若唯一通道宽度严格为零，连续随机采样恰好落入其中的概率可能为零；这种退化任务不属于通常的鲁棒可行设定。

## 二、在邻域选父并重连，核对连接尺度条件

### 3.1 累计成本比几何距离更重要

设 $g(v)$ 为树根到节点 $v$ 的累计成本，$c(u,v)$ 为两点间可行局部连接的成本。新点应比较：

$$
v_{\mathrm{parent}}=\arg\min_{v\in\mathcal N}
\{g(v)+c(v,x_{\mathrm{new}})\}.
$$

这与“离新点最近的旧点”不同。一个近邻可能位于已经绕了很远的枝条末端；另一个稍远的邻居可能有很便宜的根路径。

重连则检查：

$$
g(x_{\mathrm{new}})+c(x_{\mathrm{new}},v)<g(v).
$$

若连接无碰撞且成本更低，就改变 $v$ 的父节点。工程实现还必须维护受影响后代的累计成本，否则下一轮比较会使用过期数字。

### 3.2 邻域为什么随样本数变化

原论文算法采用的典型半径为：

$$
r_n=\min\left\{\eta,\gamma\left(\frac{\log n}{n}\right)^{1/d}\right\}.
$$

$n$ 是样本规模，$d$ 是空间维度，$\eta$ 限制局部扩展距离，$\gamma$ 控制连接范围。这里写的是原算法尺度；RRT* 的严格证明边界见下一小节。

教学上可以从平均邻居数量理解它：均匀点云中，一个小球包含的点数约与 $n r_n^d$ 成正比。代入上式得到 $\log n$ 量级。因此几何半径虽然变小，可比较邻居的数量仍缓慢增长。

若把半径一直固定为很小的值，或无条件只找固定两个邻居，就不能照搬这套论证。邻域太大又会增加大量昂贵碰撞检查。

树不是每轮重新训练的模型，而是积累计算结果的数据结构。它保留已探索空间，并通过重连修复过去的决策。

### 3.4 原定理与后续证明修订

原文定理 33 陈述标准 RRT 不具渐近最优性，定理 34—39 分别讨论新算法及其近邻变体。理解历史贡献时，应准确表述为“原文给出这些结论及证明”。

Solovey 等人在 2019 年公开、2020 年正式发表的工作指出原 RRT* 最优性证明存在逻辑缺口，并提供另一套证明，其充分连接尺度考虑采样到达顺序，使用 $(\log n/n)^{1/(d+1)}$。这不能简化成“RRT* 已被证明失效”：证明存在缺口、换一组条件可以证明、原尺度是否在更细分析下成立，是不同命题。本文不依据一篇后续摘要断言该理论问题的全部最新状态。

### 重接改变的是代价到达方式，不是点本身的位置

**教学小树**：新点 $x$可从节点 $a$或 $b$到达，已有代价 $g(a)=6,g(b)=2$，无碰撞连接成本分别1、3。最近的 $a$给总成本7，稍远的 $b$给5，因此选父不应只看几何距离。随后邻居 $y$原代价9，若 $c(x,y)=2$，可重接为7，并将降低的代价传播到其后代。

邻域也不能任意缩小。对上节2011原算法的 $d$维欧氏半径尺度，均匀采样下期望邻居数量仍以对数量级增长；固定只找一个邻居无法替代它。但这个数量级直觉并没有处理样本到达顺序，不能补上3.4节所述证明缺口，更不能仅凭把系数 $\gamma$调大就宣称原尺度的严格证明已完备。

本篇直接改造[RRT](040-rrt.md)与[PRM](035-prm.md)以追求渐近最优；后作[Informed RRT*](079-informed-rrtstar.md)再减少不会改善当前解的采样区域。[原论文](https://arxiv.org/html/1105.1186)区分概率完备与渐近最优，实验的有限时预算成功率仍需单独测，不能从极限定理读出必胜的运行时间。

选父改变新点的成本，重连还会影响旧子树。下面检查父指针、累计代价和碰撞边是否同步更新，再读渐近质量与有限时间实验。

## 三、更新累计代价，用旧邻居换父验算

### 3.3 教学伪代码

```text
树 T 以起点为根，根成本为 0
重复直到预算耗尽：
    随机采样 x_rand
    找最近树节点 x_nearest
    用局部扩展得到 x_new
    若 x_nearest 到 x_new 不可行：跳过
    按邻域规则查找附近节点 N
    用 x_nearest 初始化新点父节点和成本
    对 N 中每个 v：
        若 v 到 x_new 可行且总成本更低：选 v 为父节点
    插入 x_new
    对 N 中每个 v：
        若经过 x_new 到 v 更便宜且连接可行：
            把 v 重连到 x_new
            更新受影响子树成本，保持树结构无环
    更新到达目标区域的最好解
返回最好可行路径；若没有则报告预算内未找到
```

### 自构、未运行的选父例子

新点附近有 A、B 两个候选父节点。A 距新点 1 米，但根到 A 已走 20 米；B 距新点 3 米，根到 B 只走 5 米。普通最近邻选择 A，总长 21 米；选父比较会选择 B，总长 8 米，前提是该连接无碰撞。

随后一个旧邻居 C 原成本 15 米，新点到 C 为 2 米。经新点只要 10 米，C 就能重连。C 后面的所有子节点也一起获得 5 米改善，这说明一次局部修改可能影响一整支路线。

### 五个前置概念

1. **配置空间**：用所有自由度描述机器人姿态的空间。
2. **局部连接器**：尝试连接附近状态并检查可行性的工具。
3. **树与父节点**：每个非根节点只有一个父节点，形成唯一根路径。
4. **几乎必然收敛**：除概率为零的例外外，随机序列最终满足极限性质。
5. **同伦路径类别**：粗略理解为绕障方式不同、不能不穿障地连续变成彼此的路线类别。

## 四、分开比较首解、长期代价与计算预算

<!-- figure-ref-v6:start:rc-62-figure-13-anchor -->
<span id="rc-62-figure-13"></span>
<!-- figure-ref-v6:end:rc-62-figure-13-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/062-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/062-evidence.png" width="919" height="951" alt="Fig. 13：上图是 500 次运行的平均最好路径代价，下图是方差，横轴均为迭代次数" loading="lazy"></a><figcaption>原论文结果图／表摘引：Sertac Karaman、Emilio Frazzoli（2011），Fig. 13，PDF 第 38 页；<a href="https://arxiv.org/pdf/1105.1186#page=38" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：上图是 500 次运行的平均最好路径代价，下图是方差，横轴均为迭代次数。蓝色 RRT* 继续趋近黑色最优参考，红色 RRT 的平台说明可行路径扩展与渐近最优是两回事。

### 实验如何检验

RRT* 的渐近最优性应连同算法邻域、几何假设及后续证明修订阅读；图中有限预算改善不能独自证明无限采样性质。

以下来自原文 §5 与[图 10](#rc-62-figure-10)–[图 22](#rc-62-figure-22)。它是理论算法论文，证据重心包括定理与仿真，而非真实机器人训练成绩。

<!-- figure-ref-v6:start:rc-62-figure-10 -->
<figure class="reading-evidence-figure" id="rc-62-figure-10"><a href="/robot-classic/assets/figure-refs-v6/062-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-10.png" width="1367" height="810" alt="原论文图10：不同近邻数sPRM与PRM*的最优路径代价随迭代次数变化" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 10，PDF 第 35 页；<a href="https://arxiv.org/html/1105.1186#page=35" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：横轴为对数刻度；固定近邻数曲线的停滞与PRM*逐渐改善是不同现象。
<!-- figure-ref-v6:end:rc-62-figure-10 -->

<!-- figure-ref-v6:start:rc-62-figure-11 -->
<figure class="reading-evidence-figure" id="rc-62-figure-11"><a href="/robot-classic/assets/figure-refs-v6/062-fig-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-11.png" width="1367" height="982" alt="原论文图11：二维至五维自由空间中PRM*路径代价的四个面板" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 11，PDF 第 36 页；<a href="https://arxiv.org/html/1105.1186#page=36" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：维数和采样数量须一起考虑，不能把不同面板视为相同难度的重复试验。
<!-- figure-ref-v6:end:rc-62-figure-11 -->

<!-- figure-ref-v6:start:rc-62-figure-12 -->
<figure class="reading-evidence-figure" id="rc-62-figure-12"><a href="/robot-classic/assets/figure-refs-v6/062-fig-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-12.png" width="1367" height="1464" alt="原论文图12：无障碍环境中RRT与RRT*的多阶段树和路径比较" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 12，PDF 第 37 页；<a href="https://arxiv.org/html/1105.1186#page=37" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：按面板顺序追踪最优路径变化；密集分支并不自动意味着路径更优。
<!-- figure-ref-v6:end:rc-62-figure-12 -->

<!-- figure-ref-v6:start:rc-62-figure-14 -->
<figure class="reading-evidence-figure" id="rc-62-figure-14"><a href="/robot-classic/assets/figure-refs-v6/062-fig-14.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-14.png" width="1367" height="738" alt="原论文图14：障碍环境中RRT和RRT*最终树结构与红色路径" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 14，PDF 第 39 页；<a href="https://arxiv.org/html/1105.1186#page=39" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：相同几何场景下，红线表示返回路径，而绿色和蓝色线条表示探索结构。
<!-- figure-ref-v6:end:rc-62-figure-14 -->

<!-- figure-ref-v6:start:rc-62-figure-15 -->
<figure class="reading-evidence-figure" id="rc-62-figure-15"><a href="/robot-classic/assets/figure-refs-v6/062-fig-15.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-15.png" width="1367" height="1023" alt="原论文图15：障碍环境中RRT*从500至20000次迭代的六个阶段" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 15，PDF 第 40 页；<a href="https://arxiv.org/html/1105.1186#page=40" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：树继续增密的同时，重连可使红色路径绕障形状逐步变化。
<!-- figure-ref-v6:end:rc-62-figure-15 -->

<!-- figure-ref-v6:start:rc-62-figure-16 -->
<figure class="reading-evidence-figure" id="rc-62-figure-16"><a href="/robot-classic/assets/figure-refs-v6/062-fig-16.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-16.png" width="1367" height="826" alt="原论文图16：障碍环境中RRT与RRT*路径代价均值及方差随迭代变化" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 16，PDF 第 41 页；<a href="https://arxiv.org/html/1105.1186#page=41" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上下两幅分别展示代价与波动，不能只看均值而忽略随机性。
<!-- figure-ref-v6:end:rc-62-figure-16 -->

<!-- figure-ref-v6:start:rc-62-figure-17 -->
<figure class="reading-evidence-figure" id="rc-62-figure-17"><a href="/robot-classic/assets/figure-refs-v6/062-fig-17.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-17.png" width="1367" height="708" alt="原论文图17：含不同区域代价的环境中RRT*最终树和红色最优路径" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 17，PDF 第 42 页；<a href="https://arxiv.org/html/1105.1186#page=42" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：黄色区域改变穿行代价；几何最短与加权代价最小因此不是同一个目标。
<!-- figure-ref-v6:end:rc-62-figure-17 -->

<!-- figure-ref-v6:start:rc-62-figure-18 -->
<figure class="reading-evidence-figure" id="rc-62-figure-18"><a href="/robot-classic/assets/figure-refs-v6/062-fig-18.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-18.png" width="1367" height="419" alt="原论文图18：无障碍环境中RRT*与RRT计算耗时比随迭代变化" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 18，PDF 第 42 页；<a href="https://arxiv.org/html/1105.1186#page=42" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：纵轴是两个实现的耗时比，不是某一算法的绝对运行时间。
<!-- figure-ref-v6:end:rc-62-figure-18 -->

<!-- figure-ref-v6:start:rc-62-figure-19 -->
<figure class="reading-evidence-figure" id="rc-62-figure-19"><a href="/robot-classic/assets/figure-refs-v6/062-fig-19.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-19.png" width="1367" height="450" alt="原论文图19：障碍环境中RRT*与RRT计算耗时比随迭代变化" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 19，PDF 第 43 页；<a href="https://arxiv.org/html/1105.1186#page=43" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：把这张曲线与其障碍设置一起读，不能移用成所有环境的固定倍率。
<!-- figure-ref-v6:end:rc-62-figure-19 -->

<!-- figure-ref-v6:start:rc-62-figure-20 -->
<figure class="reading-evidence-figure" id="rc-62-figure-20"><a href="/robot-classic/assets/figure-refs-v6/062-fig-20.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-20.png" width="1367" height="901" alt="原论文图20：代价区域示例中RRT与RRT*最优路径代价和方差" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 20，PDF 第 44 页；<a href="https://arxiv.org/html/1105.1186#page=44" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：算法比较保留同一代价定义；蓝色曲线的下降不是单纯几何长度的变化。
<!-- figure-ref-v6:end:rc-62-figure-20 -->

<!-- figure-ref-v6:start:rc-62-figure-21 -->
<figure class="reading-evidence-figure" id="rc-62-figure-21"><a href="/robot-classic/assets/figure-refs-v6/062-fig-21.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-21.png" width="1367" height="498" alt="原论文图21：不同代价区域设置中RRT与RRT*的运行时间比" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 21，PDF 第 45 页；<a href="https://arxiv.org/html/1105.1186#page=45" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：代价改善的同时仍要检查计算成本，横轴是采样或迭代预算。
<!-- figure-ref-v6:end:rc-62-figure-21 -->

<!-- figure-ref-v6:start:rc-62-figure-22 -->
<figure class="reading-evidence-figure" id="rc-62-figure-22"><a href="/robot-classic/assets/figure-refs-v6/062-fig-22.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/062-fig-22.png" width="1367" height="901" alt="原论文图22：另一约束示例中RRT与RRT*路径代价及波动随采样变化" loading="lazy"></a><figcaption>Sertac Karaman、Emilio Frazzoli（2011），图 22，PDF 第 46 页；<a href="https://arxiv.org/html/1105.1186#page=46" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上下两幅应结合阅读，有限预算下的趋势并不等于已经达到极限最优。
<!-- figure-ref-v6:end:rc-62-figure-22 -->

| 项目 | 原文设置与需要注意的口径 |
|---|---|
| 实现与机器 | C 实现，2.66 GHz 处理器、4 GB RAM、Linux |
| 主要对照 | RRT 与 RRT*；固定近邻 sPRM 与 PRM* |
| 二维场景 | 无障碍、有障碍、空间成本不均匀 |
| 重复与横轴 | 主要二维成本曲线 500 次重复，横轴为迭代/样本数 |
| 高维实验 | [图 20](#rc-62-figure-20) 五维为 100 次；[图 22](#rc-62-figure-22) 十维为 25 次，不能统一写成 100 次 |
| 时间比较 | 耗时比随样本数变化；无障碍实验延伸至一百万次迭代并平均 50 次 |
| 指标 | 最好路径成本、运行间方差、运行时间比 |
| 未报告事项 | 公开种子编号、真实机器人部署成功率、统一调参耗时未报告 |

若两算法使用同一随机点序列，可以减少“谁碰巧采到好位置”的混杂。但同样本数并不代表同时间预算，因为重连需要额外计算。

### 5.1 [图 12](#rc-62-figure-12)、13：相同顶点，连接方式不同

无障碍可视化在相同采样序列下比较两棵树。改变的不仅是点分布，而是边怎样组成根路径。成本及方差曲线支持重连带来持续改善。

原文用接近 $\sqrt2$ 的成本比例描述该无障碍例子的 RRT 结果。这是特定例子中的现象，不是所有 RRT 问题都具有同一个近似比。

### 5.2 [图 15](#rc-62-figure-15)、16：能够改变绕障路线

树随着样本增加发现另一类绕障方式，最好成本进一步降低。这里展示了全空间采样和局部重连结合的意义：它不只沿当前路径做小修小补。

但有限的五百次试验曲线只能支持测试范围内的行为，不能用“曲线接近最优线”替代对所有合格问题的数学证明。

### 5.3 [图 17](#rc-62-figure-17)：最短距离不是唯一目标

改变空间成本后，路径倾向避开高成本区域、更多利用低成本区域。这个实验检验目标函数能影响几何选择，而不是证明成本函数与真实风险、能耗一定一致。

例如人为把湿滑地面成本设低，规划器会忠实地选择危险捷径。优化器正确执行目标，不代表目标设计正确。

### 5.4 [图 18](#rc-62-figure-18)–[图 22](#rc-62-figure-22)：更多计算换更好解

时间比和高维成本曲线帮助评估渐近复杂度分析的实际表现。固定维度下的渐近阶数不能解释成“每台机器人上只慢固定两倍”，也不能消除维度增长带来的常数和搜索难度。

原文[图 14](#rc-62-figure-14) 标题比较 RRT 与 RRT*，末句却把第二个成本标为 RRG。本文不把这两个单次图示数字当作无歧义的 RRT* 定量对照；主要采用正文、重复曲线和算法机制建立结论。

## 五、保留渐近条件和有限时间限制

**真正的贡献**不仅是加上一个重连循环，而是用随机几何图的尺度分析，解释为什么某些连接规则支持持续逼近最优、另一些规则不支持。

**作者的理论主张**需要连同假设和后续修订阅读。**实验支持**是在给定几何场景中，重连改善成本且额外运行开销可衡量。**本文的工程判断**是：实际使用时，首解时间、固定时间的最好成本和成功率应一起报告。

几何最优还可能带来尖锐拐角；机械系统需要时间参数化和轨迹平滑。若后处理改变路径，应重新检查碰撞与最终成本，不能直接把处理前的性质转移给处理后的控制指令。

有限分辨率碰撞检测也可能漏过薄障碍。采样树的理论与碰撞检测器的数值误差是两个层次；把节点数增加十倍并不会自动修复错误地图或漏检逻辑。

## 六、追问：重连后只改父指针而不更新受影响的累计代价，会损坏哪一步判断？

<details>
<summary>重连后只改父指针而不更新受影响的累计代价，会损坏哪一步判断？</summary>

**参考答案**：后续选父与重连比较依赖到达节点的累计成本。若指针表示新路径而代价仍对应旧路径，比较的就不是同一个树状态。应沿受影响关系核对成本一致性，并同时检查新边的碰撞有效性；增加样本不能修复这种维护错误。

</details>

## 七、集中采样，再优先验证候选连接

- **直接继承**：[Informed RRT*：已有一条路之后，还值得搜索哪里](079-informed-rrtstar.md)。把采样限制在仍可能改进当前解的启发区域。
- **直接继承**：[BIT*：让随机采样按照值得尝试的顺序进行搜索](081-bitstar.md)。进一步按启发顺序验证采样图中的候选边。

## 八、自测与参考答案

### 问题 1：一个算法概率完备，为什么仍可能永远不接近最优？

**答案**：找到任意可行路径只要求某次连接成功；优化则要求坏的早期选择能不断被改进。标准 RRT 可以不断增加点，却保留高成本根路径。两个性质针对的事件不同，前者不推出后者。

### 问题 2：邻域半径变小，为什么平均邻居数量还能变多？

**答案**：样本密度也在增加。对原文尺度，$n r_n^d$ 约为 $\log n$。半径缩小描述几何范围，邻居数量同时取决于里面有多密，不能只看半径。

### 问题 3：怎样向别人准确解释“RRT* 渐近最优”？

**答案**：先说明所用算法、连接规则、问题假设及依据的证明版本，再解释成本随无限采样趋于最优的概率命题。还应注明原证明存在后续修订。它不意味着运行一秒必得最优，也不意味着几何路径直接满足真实机器人的动力学约束。
