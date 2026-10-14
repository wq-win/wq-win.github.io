# 099｜FAST-LIO2：直接用点云定位，为什么先要解决地图更新

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](098-orbslam3.md) · [下一篇](100-kissicp.md)

**论文**：Wei Xu、Yixi Cai、Dongjiao He、Jiarong Lin、Fu Zhang，*FAST-LIO2: Fast Direct LiDAR-inertial Odometry*，2021。[原文 v1](https://arxiv.org/html/2107.06829v1) · [官方系统](https://github.com/hku-mars/FAST_LIO) · [官方 ikd-Tree](https://github.com/hku-mars/ikd-Tree)。

### 先接住前作的问题

[Kalman滤波](002-kalman.md)提供预测与测量更新的统计框架，FAST-LIO2 直接承接其前作 FAST-LIO 的迭代融合，再用增量索引解决地图扩展成本。它与[LIO-SAM](097-liosam.md)是滤波和因子图平滑的平行路线。

## 一、问题设定：更多原始激光点怎样在实时预算内进入惯性融合

激光雷达每秒产生大量点。为了赶上数据，一种做法是只留下明显边缘和平面特征。但小视场或几何不规整时，严格的特征筛选可能把本来有用的点也扔掉。

### 问题定义：里程计与完整 SLAM 的边界

输入是带采样时间的点云、IMU 与相关传感器参数。状态包括运动、惯性偏置、重力及外参相关量；输出是位姿估计和地图。它不是强化学习，不优化奖励，也不需要靠交互训练一个策略。

论文所比较的核心系统是里程计，没有回环检测与全局回环校正。局部地图中使用旧点能够减缓漂移，但这与识别一次远期重访、建立跨时间约束并重整全局轨迹不同。读到“mapping”不应自动补上所有 SLAM 后端能力。

设地图已有百万个点，每个新扫描只增加其中很小的一部分。若每次都重建整个空间索引，变化很少也要支付一次全量整理成本。这是一个与机器人算法紧密相连的数据结构问题：估计器能承担多少观测，取决于查询和维护地图有多贵。

## 二、将迭代测量更新与增量地图索引配合

FAST-LIO2 把两个改变连在一起：更高效地维护可查询的局部地图，并在惯性融合中直接使用点与地图的几何关系。没有快速地图更新，更多点会让计算吃不消；只有快速更新却没有有效的估计模型，也不会自动得到正确位置。

### 先预测，再用当前观测纠正

IMU 提供高频运动预测，并帮助把扫描内不同时间采集的点变换到共同参考时刻。随后，将点映射进地图，寻找邻域、构造局部表面残差，再更新状态。

以下是点到平面的通用教学表达：

$$
r_j(x)=n_j^T\bigl(T_{GI}(x)T_{IL}(x)p_j-q_j\bigr).
$$

$p_j$ 是激光点，$T_{IL}$ 是激光到惯性坐标的变换，$T_{GI}$ 是惯性到全局坐标的变换，$q_j,n_j$ 描述地图局部平面。每个残差是一条几何约束，不是一个被直接信任的“真位置”。

在当前状态附近线性化，$r(x\boxplus\delta x)\approx r(x)+H\delta x$。符号 $\boxplus$ 提醒我们旋转应在相应流形上更新，而不是对九个矩阵元素任意相加。

### 为什么测量很多，矩阵求逆仍可很小

在线性高斯的教学情形，预测协方差为 $P$，测量协方差为 $R$，常见增益形式是：

$$
K=PH^T(HPH^T+R)^{-1}.
$$

若有 $m$ 个点残差，这个求逆涉及测量维度。利用矩阵恒等式，在相关矩阵可逆等条件下可改写为：

$$
K=(H^TR^{-1}H+P^{-1})^{-1}H^TR^{-1}.
$$

内部主要求逆转到状态维度。假设状态几十维、残差几千维，这个差别很大；但并不意味着计算与点数无关，因为寻找邻域、构造 $H$ 和累加信息仍要处理观测。

这一快速增益思路来自 FAST-LIO 基础，FAST-LIO2 沿用而不是重新首次提出。它的新增重点在直接配准和增量地图维护。迭代滤波也不是把同一帧数据作为独立新数据反复计数，而是在共同先验下改进非线性线性化。

### 同一批点反复线性化，不能反复收取信息

快速增益也可从 MAP 正规方程直接看出。暂用欧氏线性模型 $z=Hx+v$，预测均值为 $\mu$，先验协方差 $P\succ0$、观测协方差 $R\succ0$。目标是

$$E(x)=\tfrac12(x-\mu)^TP^{-1}(x-\mu)+\tfrac12(z-Hx)^TR^{-1}(z-Hx).$$

求导得到 $(P^{-1}+H^TR^{-1}H)x=P^{-1}\mu+H^TR^{-1}z$。若每条标量残差独立、方差为 $\sigma_j^2$，信息矩阵可以逐点累加为 $P^{-1}+\sum_jH_j^TH_j/\sigma_j^2$，$H_j$ 是一行观测雅可比。这样避免建立巨大的测量维矩阵，但累加仍随点数增长；独立噪声假设若失效，简单逐点相加也不再等价。

**原创手算。** 标量先验为 $\mu=0,P=1$，三次独立观测为 $z=(1,2,3)^T$、$H=(1,1,1)^T,R=I_3$，后验均值为 $6/4=1.5$、方差为 $1/4$。若把这一帧数据错误地当成“第二帧新数据”再融合一遍，就会得到均值 $12/7\approx1.714$、方差 $1/7$，凭重复计算虚增信心。正确迭代只是围绕同一个先验与同一组观测重新求解；在线性例中下一轮仍是 1.5。

真实 FAST-LIO2 还要通过流形上的雅可比，把固定预测先验搬到当前迭代的切空间；这正是[原文IV-B3式(10)–(15)](https://arxiv.org/html/2107.06829v1)中额外修正项的作用。[表 VII](https://arxiv.org/pdf/2107.06829v1#page=15) 的总速度改善也包括地图维护，不能将本来继承自 FAST-LIO 的这项代数重排独占为 FAST-LIO2 的全部贡献。

### 方法二：地图不应每一帧推倒重建

ikd-Tree 围绕机器人地图的实际操作组织索引：插入新点、删除远离当前局部范围的点、保持采样密度、查询近邻，并在结构失衡时重建适当部分。它把“地图正在变化”视为常态。

用自构类比理解：一个图书馆每天新增几十本书，不必重新给全馆所有书排序；但如果新书总挤在同一书架，也需要局部重新安排。懒删除类似先标记书已借走，整理时再回收空位；这要求查询时正确跳过标记，不能以节省维护为由返回已失效数据。

地图采用移动局部范围，删除远端内容以控制资源。它不是无限记忆：区域移出后再次返回，可能无法直接使用所有先前点。保留更多历史也未必单调更准，旧地图本身已经漂移时，重新匹配它还可能形成错误约束。

这里的“有效”不仅是点存在，还包括时间、量程和局部几何适合参与所设模型。更多观测必须与模型相容，否则只是更快地累积错误。

地图索引承担高频查询，迭代滤波承担状态与噪声更新。下面分别检查二者，再判断直接点云利用如何改变整体预算。

## 三、维护局部地图，检查原始点到局部平面的残差

```text
输入：点云、逐点时间、IMU、状态先验与局部地图
积分 IMU，传播状态及不确定性
依据扫描内运动补偿点云畸变
按设置下采样并保留有效点
重复至迭代终止：
    查询点在地图中的近邻，检验局部平面是否有效
    构造残差和雅可比
    结合共同先验求解状态增量，更新线性化点
完成该扫描的状态与协方差更新
必要时移动地图范围、删除远端区域
将当前有效点增量插入 ikd-Tree，保持密度与平衡
输出里程计与更新后的局部地图
```

## 四、分开评估估计模型与数据结构效率

<!-- figure-ref-v6:start:rc-99-figure-11-anchor -->
<span id="rc-99-figure-11"></span>
<!-- figure-ref-v6:end:rc-99-figure-11-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/099-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/099-evidence.png" width="799" height="595" alt="Fig. 11：翻滚动作的姿态、位置、角速度和速度曲线共同给出测试运动范围" loading="lazy"></a><figcaption>原论文结果图／表摘引：Wei Xu、Yixi Cai、Dongjiao He、Jiarong Lin、Fu Zhang（2021），Fig. 11，PDF 第 16 页；<a href="https://arxiv.org/pdf/2107.06829v1#page=16" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：翻滚动作的姿态、位置、角速度和速度曲线共同给出测试运动范围。图中峰值是这次机载演示的条件，不是所有激光雷达、点云几何和平台都适用的鲁棒性上界。

### 实验：把估计效果和数据结构效果分开验证

这里对应 FAST-LIO2 v1；直接点云仍依赖局部平面残差，数据结构速度应和点数、地图范围、线程及查询任务共同比较。

| 检查项 | 原文证据与评价重点 |
|---|---|
| 数据 | §VI 的公开序列；§VII 的机载与手持实验 |
| 数据结构对比 | 18 个序列，替换地图索引，比较更新及近邻查询 |
| 估计对比 | 19 个序列，区分具有完整真值与只检查闭合误差的情况 |
| 基线 | LILI-OM、LIO-SAM、LINS；比较时关闭可用的回环模块 |
| 消融 | 地图尺寸变化；直接点配准与加入特征提取的版本 |
| 输入限制 | 缺必要姿态输入与算法运行后失败，在表中用不同符号表示 |
| 指标 | 平移 RMSE、首尾误差、每扫描计算时间及峰值行为 |
| 重复性 | 未确认每个精度序列的独立重复次数；运行时间统计不等于精度置信区间 |

重点证据有四项：

1. **[表 III](https://arxiv.org/pdf/2107.06829v1#page=12)、[图 5](#rc-99-figure-5)**：索引更新时间和查询时间共同决定总成本。某结构插入更快，不代表完成全部工作也最快。这是系统比较，不是脱离工作负载的数据结构永久排名。

<!-- figure-ref-v6:start:rc-99-figure-5 -->
<figure class="reading-evidence-figure" id="rc-99-figure-5"><a href="/robot-classic/assets/figure-refs-v6/099-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/099-fig-5.png" width="640" height="565" alt="原论文图5：四种空间索引随树大小变化的每点查询和插入耗时" loading="lazy"></a><figcaption>Wei Xu、Yixi Cai、Dongjiao He、Jiarong Lin、Fu Zhang（2021），图 5，PDF 第 12 页；<a href="https://arxiv.org/pdf/2107.06829v1#page=12" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上下图分别是查询与插入，横轴为对数树规模；尖峰与平均趋势都影响在线处理预算。
<!-- figure-ref-v6:end:rc-99-figure-5 -->
2. **[表 IV](https://arxiv.org/pdf/2107.06829v1#page=13)**：直接法在许多序列上更准，但不是全部。nclt_4 中默认版本 RMSE 8.71 米，Feature 版本 8.50 米；几何信息利用方式应按场景判断。
3. **[表 VII](https://arxiv.org/pdf/2107.06829v1#page=15)、[图 8](#rc-99-figure-8)**：特定配置下，Intel 上 FAST-LIO/FAST-LIO2 总时间为 15.83/1.82 毫秒；使用点数为 447/756。地图部分从 13.81 降至 0.13 毫秒，说明不能把全部速度收益归给删除特征提取。

<!-- figure-ref-v6:start:rc-99-figure-8 -->
<figure class="reading-evidence-figure" id="rc-99-figure-8"><a href="/robot-classic/assets/figure-refs-v6/099-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/099-fig-8.png" width="612" height="400" alt="原论文图8：FAST-LIO与FAST-LIO2每扫描处理耗时及地图点数时间序列" loading="lazy"></a><figcaption>Wei Xu、Yixi Cai、Dongjiao He、Jiarong Lin、Fu Zhang（2021），图 8，PDF 第 15 页；<a href="https://arxiv.org/pdf/2107.06829v1#page=15" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上图区分处理器与方法并保留平均线，下图给出地图规模增长；时间优势须连同硬件条件解释。
<!-- figure-ref-v6:end:rc-99-figure-8 -->
4. **[图 9–11](#rc-99-figure-9)**：激烈运动的机载演示。它支持这些实际轨迹上的可行性，不能将峰值角速度作为任意平台、场景和传感器的统一保证。

<!-- figure-ref-v6:start:rc-99-figure-9 -->
<figure class="reading-evidence-figure" id="rc-99-figure-9"><a href="/robot-classic/assets/figure-refs-v6/099-fig-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/099-fig-9.png" width="640" height="295" alt="原论文图9：翻转实验的无人机、机载视图、外部视图与姿态示意" loading="lazy"></a><figcaption>Wei Xu、Yixi Cai、Dongjiao He、Jiarong Lin、Fu Zhang（2021），图 9，PDF 第 16 页；<a href="https://arxiv.org/pdf/2107.06829v1#page=16" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：四面板给出急剧旋转的观测条件；模糊的机载画面不能单独证明激光惯性估计的误差大小。
<!-- figure-ref-v6:end:rc-99-figure-9 -->

<!-- figure-ref-v6:start:rc-99-figure-10 -->
<figure class="reading-evidence-figure" id="rc-99-figure-10"><a href="/robot-classic/assets/figure-refs-v6/099-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/099-fig-10.png" width="640" height="325" alt="原论文图10：翻转实验中FAST-LIO2重建点云与实验室实景并排比较" loading="lazy"></a><figcaption>Wei Xu、Yixi Cai、Dongjiao He、Jiarong Lin、Fu Zhang（2021），图 10，PDF 第 16 页；<a href="https://arxiv.org/pdf/2107.06829v1#page=16" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：左图是重建结果、右图是场景照片；定性结构一致性与位姿时间序列需要一起判断。
<!-- figure-ref-v6:end:rc-99-figure-10 -->

上述时间属于原表的设备、线程与点数。原文还展示 ARM 偶发超出扫描周期的情况，因此“平均赶得上”与“每次都满足硬实时截止时间”必须区分。

### 一个自构实验与五个前置概念

**未运行实验**：固定一段点云与 IMU，比较原始索引重建、增量索引，以及不同点数预算。分别记录近邻查询、状态求解、地图更新、总延迟和轨迹误差，再报告中位数、95/99 分位与最大延迟。若只展示平均总时间，就可能漏掉偶发长暂停；若只展示误差，则无法判断改进能否用于控制闭环。

五个前置概念：**误差状态**用小增量描述估计偏差；**迭代滤波**重线性化非线性测量；**点到面残差**测量沿表面法向的偏离；**空间索引**减少近邻查询工作；**摊还与峰值成本**分别描述长期平均负担和单次最坏延迟。

## 五、保留表面近似、下采样与局部地图边界

作者把索引维护节约的资源用于更充分的几何估计，这是一种算法与系统设计相互支持的改进。只把公式移植到低效地图代码，或只换树但保留所有其他瓶颈，都不必然复制论文结果。

以下是方法分析。直接点配准仍依赖局部表面近似；大面积动态物体、玻璃反射或几何退化都可能破坏观测关系。在线外参估计也依赖运动激励，不能保证错误初值和错误时间同步都能自动修复。

滤波中的协方差表达所选模型里的不确定性。如果大量地图点共享历史误差，它们不完全独立；把几千个相关残差都当独立证据，可能让估计看起来过于自信。理解这一点，有助于区分“点很多”和“独立信息很多”。

## 六、追问：点数量很多但法向几乎相同，测量更新为什么仍会缺少方向信息？

<details>
<summary>点数量很多但法向几乎相同，测量更新为什么仍会缺少方向信息？</summary>

**参考答案**：对局部点到平面残差，小平移 $\delta t$ 的变化是 $n^\top\delta t$。若所有法向 $n$ 几乎相同，沿公共切平面的移动让这项接近零，增加相似点主要重复约束同一方向。应检查几何方向和惯性提供的补充信息，而非只数点。[Dellaert因子图教程](https://gtsam.org/tutorials/intro.html)中从因子依赖看信息的讲法，在这里落到具体残差雅可比上。

</details>

## 七、比较纯激光基线与全局图约束

- **平行路线**：[KISS-ICP：把简单基线做好，究竟能走多远](100-kissicp.md)。在不用IMU的连续扫描条件下检验简化ICP组织。
- **平行路线**：[LIO-SAM：让激光、惯性、GPS 与回环共同解释运动](097-liosam.md)。因子图系统提供不同历史与全局约束管理，不能只比较速度。

## 八、自测与参考答案

### 1．不提取特征，为什么仍要拟合局部平面？

**答**：省略的是先给点分类并只保留某些类别的阶段；测量模型仍需要定义点与地图怎样对齐。局部平面提供残差方向，并不与“直接使用点”矛盾。若局部平面无效，相关测量也不应被强行接受。

### 2．增益求逆变成状态维度后，增加点数是否没有成本？

**答**：仍有成本。近邻搜索、有效性检查、雅可比构造和信息矩阵累加都依赖观测数量。矩阵恒等式消除一个昂贵瓶颈，不会让整个流程对点数保持常数时间。

### 3．怎样证明速度提升来自地图结构，而不是少用了数据？

**答**：尽量固定输入点、地图范围、查询任务、线程与硬件，只替换数据结构，分项记录插入、删除、查询与重建时间，同时检查返回结果一致性。再在完整系统上比较误差，才能连接局部性能与最终价值。
