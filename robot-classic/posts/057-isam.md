# 057｜iSAM：保留历史，也能增量求解

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇：PTAM](056-ptam.md) · [下一篇：ROS](058-ros.md)

论文：Michael Kaess、Ananth Ranganathan、Frank Dellaert，*iSAM: Incremental Smoothing and Mapping*，IEEE Transactions on Robotics 24(6)，1365–1378，2008。[作者全文](https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf)；[出版记录](https://doi.org/10.1109/TRO.2008.2006706)。以下依据作者保存的 2008 年 9 月 7 日十四页录用稿，包括方法、实验、结论和线性化附录。它是 2007 年会议工作的扩展版，不是后来的 Bayes tree / iSAM2。

### 先接住前作的问题

[GraphSLAM](053-graphslam.md)展示保留历史的稀疏估计路线；本篇直接技术前作则是作者的Square Root SAM，其批量重分解会重复旧计算。iSAM增量更新平方根系统。

## 一、问题设定：新约束加入后怎样复用已有平方根分解

机器人走了很远，突然认出出发时的一棵树。这个新约束不仅影响当前位置，也会改变对过去整条轨迹的理解。保留所有历史位姿有助于纠正误差，却似乎意味着每来一条数据都要重新解一个越来越大的问题。

### 背景：为什么更多变量有时更稀疏

设 $X=\{x_i\}$ 为机器人历次位姿，$L=\{l_j\}$ 为路标。运动观测通常只连接相邻位姿，一次路标测量只连接某个位姿与某个路标。因此全部变量虽然很多，每条残差涉及的变量却很少。

如果消掉旧位姿，与它相连的剩余变量往往获得新的耦合关系，矩阵反而可能变密。保留历史的平滑方法利用这种局部连接性；过滤方法则主要维护当前状态。问题大小和计算难度之间，并不是单看变量个数的关系。

输入是里程计、路标测量或前端产生的相对位姿约束，输出是地图、完整轨迹和所需不确定性。本文包含路标 SLAM 与纯位姿图两类设置。没有学习策略或奖励；优化的是高斯测量模型下的最大后验估计。

第 II 节先假定对应关系已知，第 V 节再讨论数据关联。初始状态先验或等价坐标约束用于固定规范自由度，否则整体平移和旋转可能使系统不具唯一解。高斯噪声、正确残差模型、可接受的线性化点，都是解读结果的重要前提。

## 二、增量QR更新，再按需重排序和重线性化

### 从概率到最小二乘

记运动残差为 $r_i^u$、观测残差为 $r_k^z$，相应协方差为 $\Lambda_i,\Gamma_k$。省略先验记号后：

$$\min_{X,L}\sum_i(r_i^u)^T\Lambda_i^{-1}r_i^u+
\sum_k(r_k^z)^T\Gamma_k^{-1}r_k^z.$$

先按噪声白化，再在当前估计附近线性化，可写为

$$\min_{\delta\theta}\|A\delta\theta-b\|^2.$$

$A$ 是白化后的稀疏雅可比，$b$ 是残差形成的右端项，$\delta\theta$ 堆叠位姿和路标增量。白化不是把噪声删除，而是让不同精度的测量在同一二次目标中获得正确权重。

### QR 与平方根信息矩阵

若 $A$ 满列秩，令

$$A=Q\begin{bmatrix}R\\0\end{bmatrix},\qquad
Q^Tb=\begin{bmatrix}d\\e\end{bmatrix}.$$

因为正交变换不改变二范数，目标等于 $\|R\delta\theta-d\|^2+\|e\|^2$，通过回代解 $R\delta\theta=d$。$R^TR=A^TA$，所以 $R$ 是平方根信息矩阵。直接作用于 $A$ 的 QR 避免显式形成正规矩阵所带来的条件数平方问题，但不能让不可观测问题突然变得可观测。

新测量的白化行是 $w^T\delta\theta\approx\gamma$，只需处理

$$\begin{bmatrix}R\\w^T\end{bmatrix}\delta\theta
\approx\begin{bmatrix}d\\\gamma\end{bmatrix}.$$

Givens 旋转一次消去一个新出现的下三角元素，同时旋转右端项。旧分解大部分保持不动。新的位姿或路标则先扩充变量维度，再加入相关测量。

### 回环改变的是分解结构

一个约束的雅可比很稀疏，不代表消元因子也一直很稀疏。回环把远处的历史变量连接起来，可能在 $R$ 中形成填充。第 IV 节用块 COLAMD 变量排序减少填充，并周期性重新分解。

重排序和重线性化解决不同问题：前者改变消元成本，不改变同一个线性系统的数学答案；后者更新非线性残差的局部近似，可能改变当前估计。论文把两项昂贵工作安排在同一个周期执行，不能因此把它们视为同一操作。

### 不必求整个逆矩阵才能知道不确定性

线性高斯近似下 $\Sigma=(R^TR)^{-1}$。需要某几列时，设 $E$ 为相应单位向量列，解

$$R^TY=E,\qquad RC=Y,$$

就能得到对应协方差列 $C$。第 V 节进一步利用稀疏模式递归提取所需块，也提供更便宜的保守估计。数据关联关心当前位姿与候选路标的联合协方差，包括交叉项；只给路标和位姿各一个误差条是不够的。

### 增量QR究竟复用了哪一部分计算

线性化后求 $\min_\delta\|A\delta-b\|^2$，已有QR分解留下三角矩阵 $R$与变换后右端 $d$。新测量行 $(a^T,\beta)$到来，只需将 $[R;a^T]$重新三角化，同时对 $[d;\beta]$做相同正交变换；旧的全部原始行无需再读一遍。

**教学两变量例**已有 $R=I,d=(0,0)^T$，新约束 $x+y=2$且权重1，则正规方程为 $\begin{bmatrix}2&1\\1&2\end{bmatrix}(x,y)^T=(2,2)^T$，解为 $(2/3,2/3)$。若错误地把新约束当硬等式，会得到 $(1,1)$，相当于悄悄改变噪声模型。QR更新求解的仍是同一加权最小二乘。

本篇直接发展作者的Square Root SAM，与[GraphSLAM](053-graphslam.md)是共享稀疏历史估计问题的平行路线，后作[iSAM2](068-isam2.md)进一步管理局部重线性化。旧雅可比被复用时，线性代数求解可以准确，非线性问题却仍需重线性化和重排序；平均更新时间应连同这些周期性峰值报告。[作者期刊稿第IV及VI节](https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf)

新增测量可以更新已有三角因子，回环和旧线性化失效仍会扩大重算范围。下面用小图检查受影响项，再同时看平均时间和计算峰值。

## 三、更新三角系统并查询协方差，用小图验算

```text
输入：当前变量估计、测量因子、三角因子 R 和右端项 d
新数据到达：
    初始化新位姿、必要的新路标
    查询关联所需协方差，建立或确认测量对应
    对新残差白化、线性化，形成稀疏新增行
    扩充 R，使用 Givens 旋转更新三角因子及右端项
    按需要回代，恢复位姿与地图估计
到达整理周期：
    用更新估计重新线性化测量
    对变量块做减少填充的排序
    重新 QR 分解，回代并更新估计
输出：当前轨迹、地图及被请求的协方差块
```

这是论文机制的教学整理。数据关联策略、重排序周期、是否每步恢复完整轨迹都会影响运行时间，不能只计新增一行的旋转成本。

### 一个能亲手推导的例子

以下为教学构造。一维三个位置，固定 $x_0=0$，里程计为 $x_1-x_0=1$、$x_2-x_1=1$，初解是 0、1、2。回环却观测到 $x_2-x_0=1.8$。若三个残差同权，令两段长度分别为 $a,b$，目标是

$$J=(a-1)^2+(b-1)^2+(a+b-1.8)^2.$$

求导得 $a=b=0.9333\ldots$，所以 $x_2=1.8666\ldots$。新约束改变了过去的第一段，不只是改当前位置。iSAM 的增量分解会把这条新行加入已有三角系统，而不是把旧观测遗忘掉。

若把回环测量赋予极高精度，解会更靠近总长 1.8；如果回环本身是错的，高精度反而更危险。这说明求解器的“精确”不能替代前端验证。

五个前置概念：**平滑**同时估计历史状态；**白化**按噪声精度缩放残差；**QR 分解**用正交变换生成三角系统；**填充**是消元产生原来没有的非零项；**边缘协方差**描述联合估计中某些变量的不确定性而非条件固定其他变量后的误差。

## 四、读回环、速度与稀疏结构证据

<!-- figure-ref-v6:start:rc-57-figure-10-anchor -->
<span id="rc-57-figure-10"></span>
<!-- figure-ref-v6:end:rc-57-figure-10-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/057-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/057-evidence.png" width="1654" height="540" alt="Fig. 10：原始里程计、优化地图和稀疏因子结构并排看：地图变好是几何结果，右侧结构则解释增量更新成本；稀疏不等于没有填充或所有更新时间都相同" loading="lazy"></a><figcaption>原论文结果图／表摘引：Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），Fig. 10，PDF 第 10 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=10" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：原始里程计、优化地图和稀疏因子结构并排看：地图变好是几何结果，右侧结构则解释增量更新成本；稀疏不等于没有填充或所有更新时间都相同。

### 实验设计

| 实验 | 规模、对比与目的 |
|---|---|
| 线性探索 | [图 3](#rc-57-figure-3)、4 的增量更新，检验无回访的局部结构能否保持固定更新工作量 |
| 双八字回环 | 不重排、每步重排、每 100 步重排，检验填充及周期性整理的作用 |
| 数据关联 | 500 位姿、240 路标的模拟回环，3% 测量替换为随机测量；比较最近邻、保守 ML、精确 ML 的不同协方差求法 |
| Victoria Park | 4 km、26 分钟日志；去除停车重复帧后 6969 帧，提取 3640 次路标测量；包括未知对应处理 |
| Manhattan | 3500 位姿、5598 约束的模拟位姿图；比较目标值与批量非线性优化 |
| Intel / MIT | 已经预处理为位姿约束的真实日志；后端评价假定对应已知，不包含完整扫描匹配前端的全部成本 |
| 资源与统计 | OCaml、自动微分，相关实验用 2 GHz Pentium M；报告总时间、均值和部分最大值，未给出多种子置信区间 |

<!-- figure-ref-v6:start:rc-57-figure-3 -->
<figure class="reading-evidence-figure" id="rc-57-figure-3"><a href="/robot-classic/assets/figure-refs-v6/057-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/057-fig-3.png" width="640" height="573" alt="原论文图3：新增约束逐步消元后的稀疏三角因子及增量更新位置" loading="lazy"></a><figcaption>Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），图 3，PDF 第 4 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：新增行主要改变与它相连的因子部分；图中的颜色区分已有结构与更新。
<!-- figure-ref-v6:end:rc-57-figure-3 -->

<!-- figure-ref-v6:start:rc-57-figure-4 -->
<figure class="reading-evidence-figure" id="rc-57-figure-4"><a href="/robot-classic/assets/figure-refs-v6/057-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/057-fig-4.png" width="640" height="342" alt="原论文图4：每步Givens旋转次数随探索步骤变化的红色曲线" loading="lazy"></a><figcaption>Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），图 4，PDF 第 4 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：横轴是增量步骤，尖峰表示单步工作量变化，平均值不代表最坏延迟。
<!-- figure-ref-v6:end:rc-57-figure-4 -->

真实场景图主要展示轨迹与地图结构，模拟数据才便于直接检查真值或目标函数。Victoria Park 的差分 GPS 用于图中参考，没有进入估计；航空图是手工叠加，不能当作自动配准误差的数值评价。

### 五处核心证据

**[图 4](#rc-57-figure-4)：常数的是特殊探索任务中的因子更新。** 图中旋转数量没有随一万步轨迹持续增长。第 III-C 节随即区分，恢复完整历史解还要回代，示例一万步时约 0.12 s。这不是整个 SLAM 永远 $O(1)$ 的证明。

**[图 5](#rc-57-figure-5)：只增量、不整理也会越来越慢。** 回环使 $R$ 填充增加，周期性排序显著改善速度；但整理阶段有峰值。这组消融支持混合调度，而不支持“增量方法任何时刻都比批量快”。

<!-- figure-ref-v6:start:rc-57-figure-5 -->
<figure class="reading-evidence-figure" id="rc-57-figure-5"><a href="/robot-classic/assets/figure-refs-v6/057-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/057-fig-5.png" width="640" height="1353" alt="原论文图5：回环示例、重排序前后三角因子和三种排序策略的耗时曲线" loading="lazy"></a><figcaption>Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），图 5，PDF 第 5 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：先对照回环时刻与因子填充，再读线性和对数时间轴上的开销差异。
<!-- figure-ref-v6:end:rc-57-figure-5 -->

**[图 7](#rc-57-figure-7)、[表 I](https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=8)：按需协方差查询保持精确，但不是免费。** 精确高效方法的椭圆与完整求逆重合。500 位姿试验中，精确 ML 的高效查询总时间 27.5 s，完整求逆为 429 s；二者比约 15.6。保守 ML 为 2.80 s，更快但使用更宽的不确定性近似。各方法比较的是整段处理开销，不能把这些秒数当成一次查询时间。

<!-- figure-ref-v6:start:rc-57-figure-7 -->
<figure class="reading-evidence-figure" id="rc-57-figure-7"><a href="/robot-classic/assets/figure-refs-v6/057-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/057-fig-7.png" width="640" height="312" alt="原论文图7：红色轨迹、绿色保守协方差椭圆与蓝色精确协方差椭圆" loading="lazy"></a><figcaption>Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），图 7，PDF 第 7 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：绿色椭圆通常更大；这里比较的是同一线性化问题的边缘协方差近似。
<!-- figure-ref-v6:end:rc-57-figure-7 -->

**[图 8](#rc-57-figure-8)：长日志的平均吞吐可以快于数据到来。** Victoria Park 包含数据关联时约 7.7 分钟，已知对应约 5.9 分钟，对应 26 分钟采集。文中末尾百步平均用时分别为 0.120 s 和 0.095 s，整理操作仍有 1.8 s 的总开销。平均实时不意味着任何一次调用都满足硬实时截止期。

<!-- figure-ref-v6:start:rc-57-figure-8 -->
<figure class="reading-evidence-figure" id="rc-57-figure-8"><a href="/robot-classic/assets/figure-refs-v6/057-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/057-fig-8.png" width="1293" height="573" alt="原论文图8：Victoria Park的纯里程计轨迹、优化轨迹和稀疏因子" loading="lazy"></a><figcaption>Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），图 8，PDF 第 8 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：中间图叠加实景作为位置背景，右侧展示的是矩阵结构，不是另一张地图。
<!-- figure-ref-v6:end:rc-57-figure-8 -->

**[图 9](#rc-57-figure-9)–[图 12](#rc-57-figure-12)：相近目标值与稀疏性需要分别解读。** Manhattan 的归一化 $\chi^2$ 为 1.0406，再额外重线性化后 1.0375，与批量收敛值相同；这是给定模型下目标值比较，不是全局最优证书。Intel 每步平均约 85 ms，MIT 约 12.2 ms；后者位姿更多却约束结构更稀疏，说明时间不能只按轨迹长度排序。

<!-- figure-ref-v6:start:rc-57-figure-9 -->
<figure class="reading-evidence-figure" id="rc-57-figure-9"><a href="/robot-classic/assets/figure-refs-v6/057-fig-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/057-fig-9.png" width="1293" height="509" alt="原论文图9：Manhattan数据优化前后地图和最终三角因子" loading="lazy"></a><figcaption>Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），图 9，PDF 第 10 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=10" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：几何重影与矩阵稀疏性是不同观察量，需分别读左右面板。
<!-- figure-ref-v6:end:rc-57-figure-9 -->

<!-- figure-ref-v6:start:rc-57-figure-11 -->
<figure class="reading-evidence-figure" id="rc-57-figure-11"><a href="/robot-classic/assets/figure-refs-v6/057-fig-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/057-fig-11.png" width="1293" height="509" alt="原论文图11：Killian序列纯里程计、优化地图及最终稀疏因子" loading="lazy"></a><figcaption>Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），图 11，PDF 第 10 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=10" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：比较同一序列的轨迹形状，再看右侧因子中保留的非零结构。
<!-- figure-ref-v6:end:rc-57-figure-11 -->

<!-- figure-ref-v6:start:rc-57-figure-12 -->
<figure class="reading-evidence-figure" id="rc-57-figure-12"><a href="/robot-classic/assets/figure-refs-v6/057-fig-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/057-fig-12.png" width="640" height="342" alt="原论文图12：四种数据集每列非零矩阵条目平均数随步骤变化" loading="lazy"></a><figcaption>Michael Kaess、Ananth Ranganathan、Frank Dellaert（2008），图 12，PDF 第 11 页；<a href="https://www.cs.cmu.edu/~kaess/pub/Kaess08tro.pdf#page=11" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：纵轴计数描述稀疏程度，不是定位误差或每步耗时。
<!-- figure-ref-v6:end:rc-57-figure-12 -->

## 五、区分线性系统精确解与非线性全局正确

非线性问题仍需要初始化、重线性化及收敛条件。原稿对二阶方法收敛速度的概括不能当作无条件二次收敛定理：Gauss–Newton 的速率取决于局部条件、残差等因素，实际问题也可能陷入局部极小值。一次 QR 解得很准确，只能保证当次线性近似没有被粗糙求解器额外破坏。

保守协方差依赖模型内的信息更新关系，不应无条件推广到模型改变、错误关联或非线性重新线性化后的真实误差分布。协方差小同样可能是过度自信。

作者结论提出后续希望消除批量步骤、增量调整排序，并限制回代到必要变量。这些恰好指出 iSAM 的边界，也解释为什么后来的 iSAM2 需要新的数据结构和调度方式。不能把 Bayes tree 当作本篇已有组件。

## 六、追问：平均更新时间很小，为什么还要单独报告回环时的峰值？

<details>
<summary>平均更新时间很小，为什么还要单独报告回环时的峰值？</summary>

**参考答案**：回环可能影响更大范围的变量与稀疏结构，重排序和重线性化也会带来集中计算。平均值会掩盖这些对在线运行重要的时刻。比较应同时注明更新协议与峰值条件，而不能把既定线性系统的精确求解读成恒定耗时。

</details>

## 七、继续局部化非线性结构更新

- **直接继承**：[iSAM2：把不断增长的SLAM问题变成局部树更新](068-isam2.md)。用Bayes tree管理受影响变量和流动重线性化。

## 八、自测与参考答案

### 1．为什么信息矩阵稀疏，三角因子仍然可能稠密？

**答：** 消去一个变量会把其未消去的邻居耦合起来。图上的新连接对应因子中的填充，即使原始测量只连接很少变量也会发生。变量排序决定这些连接如何传播，因此同一概率问题可有截然不同的求解成本。

### 2．一个新回环导致几千个历史位置调整，是否违背“增量只更新局部”？

**答：** 不违背。局部更新是某些稀疏结构下的效率性质，不是每条测量影响范围的硬限制。回环本来就传递跨历史信息；为了保持正确解，受影响的因子和回代范围可以很大，必要时还会重排序和重线性化。

### 3．精确协方差与精确地图是同一个保证吗？

**答：** 不是。前者通常指从当前线性高斯系统准确得到相关逆矩阵元素；系统仍可能使用错误测量关联、噪声模型或不合适的线性化点。真实地图误差还取决于这些建模条件，非线性全局最优也不是 QR 分解单独提供的保证。
