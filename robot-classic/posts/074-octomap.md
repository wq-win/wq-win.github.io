# 074｜OctoMap：同时记住障碍、自由空间与尚未看见的地方

[系列首页](README.md) · [时间线总览](00-发展时间线总览.md)

论文：Armin Hornung、Kai M. Wurm、Maren Bennewitz、Cyrill Stachniss、Wolfram Burgard，*OctoMap: An Efficient Probabilistic 3D Mapping Framework Based on Octrees*，Autonomous Robots 2013。[正式论文](https://doi.org/10.1007/s10514-012-9321-0)；[作者预印本的大学课程镜像](https://courses.cs.washington.edu/courses/cse571/20sp/slides/hornung13auro.pdf)；[官方项目](https://octomap.github.io/)。阅读覆盖预印本的方法、实现与实验，不把软件后续接口视为原文配置；未独立复现地图实验。

### 先接住前作的问题

[占据栅格](025-occupancy.md)会融合概率，三维固定网格却容易耗尽内存。OctoMap将概率更新与八叉树组合；[OMPL](067-ompl.md)等下游规划器还必须决定怎样对待未知体积。

## 一、问题设定：三维占据证据怎样兼顾未知空间与存储规模

点云告诉我们“传感器在这里看到了表面”，却不直接告诉我们“这里已经确认没有障碍”还是“这里从未观察”。对机器人来说，二者差别很大：前者可以规划通行，后者可能藏着桌腿。

### 问题定义：它是地图框架，不是完整 SLAM

输入是测距数据及传感器在统一坐标系中的位姿，输出是占据地图。论文中的轨迹对齐使用外部扫描匹配、视觉里程计或 RGB-D SLAM。OctoMap 本身并没有解决全部定位与回环问题，不能把好的地图自动归因为它估计了准确机器人轨迹。

点云偏向表面采样；固定三维网格要为空间包围盒分配大量单元；高度图则对同一平面位置有多个高度层的结构不够一般。OctoMap 用八叉树在需要时细分空间，并显式记录已观测的自由体积。

这里没有策略、奖励和动作优化。地图可供导航、操作与探索使用，但“在地图中无碰撞”与“真实执行安全”之间还有传感器盲区、定位误差、机器人尺寸和动态障碍等条件。

## 二、用八叉树组织概率更新，区分三种压缩

### 方法一：八叉树解决存储，不替代概率模型

每个节点表示一个立方体，细分后得到八个子体积。最大深度确定最细分辨率。只为需要记录的区域建立节点，所以未知空间不必按固定网格全部分配。节点在树中的路径已经编码位置，没必要给每个节点重复保存中心坐标与边长。

查询可以提前停在内部节点，以较粗尺度查看环境。原文采用子节点占据值的最大值传播，作为偏保守的障碍判断：只要细尺度某处有障碍，粗单元就不应被平均稀释成自由。它不是严格计算“八个体素至少一个占据”的联合概率，而是导航用途的聚合策略。

### 方法二：把测量变成可累积证据

令 $p_t(n)$ 为体素 $n$ 的占据概率，使用对数几率

$$L_t(n)=\log\frac{p_t(n)}{1-p_t(n)}.$$

均匀先验为 $0.5$ 时，原文更新形式是

$$L_t(n)=\operatorname{clip}\bigl(L_{t-1}(n)+l(z_t,n),l_{min},l_{max}\bigr).$$

$l(z_t,n)$ 是逆传感器模型给出的增量。一般非均匀先验还要减去先验对数几率，不能不加说明地照抄简化式。log-odds 让更新变成加法，但并没有消除各测量之间相关性的建模假设。

为什么要截断？如果一个位置被看作自由数万次，后来放上一把椅子，不应要求再看到数万次障碍才承认变化。截断限制置信累积，让地图可更新。不过它没有显式预测椅子运动，也不是完整动态环境滤波器。

原文 §5.1 使用占据增量 0.85、自由增量 −0.4，截断范围 −2 到 3.5。这些值针对其激光数据选定，不应作为任意传感器普适常数。终点与沿途证据权重不同，因此不能简单把实现理解为命中次数减去未命中次数。

扫描内的更新冲突处理很关键。浅角度扫描平面时，某束光的终点体素可能被另一束光的离散射线穿过；若先后反复写自由，会给墙面挖出虚假孔洞。原文优先保留同批次的终点占据更新。这是针对栅格离散的工程修正，不代表忽略所有负证据。

### 方法三：三种“压缩”不能混为一谈

第一种是内存实现减少指针和重复坐标的开销。第二种是相同稳定子节点的剪枝，保留所使用的截断概率表示。第三种是把全部概率变成最大似然占据标签，再压缩为文件；它进一步丢失置信信息。

严格说，clamping 相对于不截断的贝叶斯累积已经丢失接近零和一的信息；“剪枝无损”只能相对于当前保存的表示讨论。最大似然二进制文件很小，不等于完整概率地图在运行内存中也只有同样大小。

### 一条射线携带的是一串不同证据

激光在2米处击中表面，沿途可见体素提供“未占据”证据，终点体素提供“占据”证据，表面后方仍未知。**教学对数几率例**：先验0.5给 $L=0$；一次hit逆模型为0.7，则加 $\log(0.7/0.3)\approx0.8473$；随后一次miss为0.4，加−0.4055，总 $L=0.4418$，概率约0.6087。不能将0.7与0.4直接平均成0.55来替代该模型更新。

八叉树则解决另一问题：八个子体素状态相同可以合并，但若一个孩子未知，不能为了压缩把父节点宣布为全自由。概率饱和和剪枝条件也决定地图适应变化的速度，属于表示—更新之间的折中。[原稿第3.1–3.2节](https://courses.cs.washington.edu/courses/cse571/20sp/slides/hornung13auro.pdf)

本篇直接承接[占据栅格](025-occupancy.md)的概率融合，将其与八叉树组合；与[KinectFusion](064-kinfu.md)是自由/占据体积与表面距离场的平行表示。[OMPL](067-ompl.md)可查询它做避障，但必须先规定未知区域能否穿越。压缩率高不等于薄障碍保留充分。

八叉树改变存储与查询，概率更新仍依赖射线和位姿。下面先检查占据、空闲、未知怎样进入树，再区分三种压缩损失。

## 三、逐射线更新并剪枝，检查不同尺度查询

```text
输入：点云、传感器位姿、分辨率、逆传感器模型
把传感器原点与测量终点转换到地图坐标系
在一个扫描批次内收集：终点体素集合、射线经过体素集合
从自由集合中去掉本批次已被终点命中的体素
对自由体素执行一次负log-odds更新并截断
对命中体素执行一次正log-odds更新并截断
自底向上更新内部节点的聚合占据值
若八个子叶满足相同稳定状态条件：合并
未来有相反局部证据时重新展开并更新
输出可按深度查询的地图
```

## 四、读内存、精度和地图数据的比较

<!-- figure-ref-v6:start:rc-74-figure-16-anchor -->
<span id="rc-74-figure-16"></span>
<!-- figure-ref-v6:end:rc-74-figure-16-anchor -->
<!-- figure-ref-v6:start:rc-74-figure-17-anchor -->
<span id="rc-74-figure-17"></span>
<!-- figure-ref-v6:end:rc-74-figure-17-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/074-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/074-evidence.png" width="760" height="828" alt="Figs. 16–17：上图改变地图分辨率，看每个测量点的插入耗时；下图改变查询深度，看地图遍历成本" loading="lazy"></a><figcaption>原论文结果图／表摘引：Armin Hornung、Kai M. Wurm、Maren Bennewitz、Cyrill Stachniss、Wolfram Burgard（2013），Figs. 16–17，PDF 第 14 页；<a href="https://courses.cs.washington.edu/courses/cse571/20sp/slides/hornung13auro.pdf#page=14" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：上图改变地图分辨率，看每个测量点的插入耗时；下图改变查询深度，看地图遍历成本。它们是不同操作，不能把单点插入耗时当作整次扫描的处理时间。

### 实验设计

| 项目 | 原文设置 |
|---|---|
| 数据 | §5.2：FR-079 走廊 66 次扫描约 600 万点；Freiburg 校园约 2000 万点；New College 约 1400 万点 |
| 位姿来源 | 外部扫描匹配或优化轨迹；不是同时比较完整 SLAM 算法 |
| 准确性 | §5.3：地图占据状态与扫描射线的自由/占据标签一致比例 |
| 留出测试 | 每第五次扫描留出，80% 建图、20% 检验 |
| 内存对照 | 最小包围盒固定网格、未剪枝八叉树、剪枝、最大似然地图 |
| 运行资源 | §5.5：i7-2600 3.4 GHz 单核；内存表采用 32 位布局口径 |
| 统计边界 | 没有多次独立测绘误差条；扫描一致性不是独立几何真值 |

准确率的分母包含自由体素，类别比例会影响总分；位姿对齐误差、传感噪声和离散化都会影响一致性。留出扫描比在建图数据上打分更强，但同一环境邻近扫描仍具有相关性，不能称为未见环境泛化。

### 结果：证据支持哪些结论

**证据 1｜[图 10](#rc-74-figure-10)、[图 11](#rc-74-figure-11)：更新策略修复离散伪影。**相同浅角度平面扫描，在逐射线冲突更新时出现孔洞，批次内优先占据后恢复更合理表面。这是清楚的机制对照，但不能证明玻璃、镜面、多路径等传感问题都被解决。

<!-- figure-ref-v6:start:rc-74-figure-10 -->
<figure class="reading-evidence-figure" id="rc-74-figure-10"><a href="/robot-classic/assets/figure-refs-v6/074-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/074-fig-10.png" width="622" height="243" alt="原论文图10：OctoMap射线更新在正常测量与异常回波下的差别" loading="lazy"></a><figcaption>Armin Hornung、Kai M. Wurm、Maren Bennewitz、Cyrill Stachniss、Wolfram Burgard（2013），图 10，PDF 第 10 页；<a href="https://courses.cs.washington.edu/courses/cse571/20sp/slides/hornung13auro.pdf#page=10" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：红色射线与表面位置共同决定哪些体素应更新为空闲或占据。
<!-- figure-ref-v6:end:rc-74-figure-10 -->

<!-- figure-ref-v6:start:rc-74-figure-11 -->
<figure class="reading-evidence-figure" id="rc-74-figure-11"><a href="/robot-classic/assets/figure-refs-v6/074-fig-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/074-fig-11.png" width="622" height="222" alt="原论文图11：同一表面在连续表示与不同体素构建中的结构" loading="lazy"></a><figcaption>Armin Hornung、Kai M. Wurm、Maren Bennewitz、Cyrill Stachniss、Wolfram Burgard（2013），图 11，PDF 第 10 页；<a href="https://courses.cs.washington.edu/courses/cse571/20sp/slides/hornung13auro.pdf#page=10" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：离散分辨率改变边界形状，稠密外观不能直接说明概率校准。
<!-- figure-ref-v6:end:rc-74-figure-11 -->

**证据 2｜[表 1](https://courses.cs.washington.edu/courses/cse571/20sp/slides/hornung13auro.pdf#page=11)：留出一致性保持较高。**走廊建图数据一致率 97.27%，留出扫描 96.00%；校园为 97.89% 与 95.80%。它支持该传感器模型在这些数据上的预测一致性，不等于厘米级误差直接减小了同样百分比。

**证据 3｜[表 2](https://courses.cs.washington.edu/courses/cse571/20sp/slides/hornung13auro.pdf#page=13)：压缩收益取决于空间结构。**校园 10 厘米分辨率的固定网格估计为 5162.90 MB，剪枝八叉树 990.66 MB；最大似然有损文件 13.82 MB。最后一个数是不同信息量、不同存储形式，不能把三者当作同条件内存。走廊 10 厘米时未压缩树 10.87 MB 甚至大于网格 10.01 MB，说明树也有开销。

**证据 4｜[图 16–17](#rc-74-figure-16)、§5.5：速度与查询粒度相关。**原文给出扫描插入及不同深度遍历的计时。它支持按需求使用粗查询的价值，不证明所有高帧率深度相机都能完整实时融合。相关数据来自[预印本](https://courses.cs.washington.edu/courses/cse571/20sp/slides/hornung13auro.pdf)。

## 五、保留位姿依赖、概率损失与规划语义

OctoMap 的贡献是把概率融合、自由/未知区分、多分辨率和紧凑实现组合成可复用框架。八叉树和占据网格思想各有更早来源；不能把整套方法称为首次发明概率建图。

**自构例子，未运行。**机器人扫描桌子，桌面后方没有射线经过。桌面是占据，桌前已穿过的射线区域是自由，桌后是未知。如果把所有没点的区域当自由，机械臂就可能伸进尚未观察的杂物。若用粗网格平均桌腿与周围自由体素，占据证据可能被稀释；保守最大聚合避免这类消失，但可能堵住本来可走的窄缝。

还可以把椅子从一个已稳定占据的位置移走，计算需要多少次自由观测才能改变状态。这个数由截断上界、负增量和占据阈值共同决定，能解释“地图变化反应慢”的原因。若定位漂移导致同一墙面被写到两个位置，单靠调截断参数无法修复坐标不一致。

五个前置概念：**体素**是三维栅格单元；**八叉树**递归把立方体分成八份；**逆传感器模型**由测量决定局部占据证据；**log-odds**把概率比值变成可加形式；**ray casting**枚举传感器与测量终点之间经过的空间。

## 六、追问：剪枝后再查询更细分辨率，能否恢复压缩前的全部占据概率？

<details>
<summary>剪枝后再查询更细分辨率，能否恢复压缩前的全部占据概率？</summary>

**参考答案**：不能默认恢复。不同压缩方式保留的信息不同，若已丢弃细粒度概率，只能按保留状态展开而非找回原始证据。应先说明使用的是无损结构合并还是带信息损失的压缩，再解释下游碰撞判断。

</details>

## 七、把未知体积的处理交给具体规划任务

- **模块组合**：[OMPL：怎样让不同运动规划算法使用同一套问题接口](067-ompl.md)。规划器必须明确未知体积和分辨率的处理，八叉树不替它选择风险规则。

## 八、自测与参考答案

**1. 一个区域没有点云点，为什么不能直接认为自由？**

它可能在障碍背后或从未进入视野。只有可靠测量射线穿过的空间才能提供自由证据；没有观测应该保留未知。

**2. 十几 MB 的地图文件为何可能需要接近一 GB 的运行内存？**

有损文件可能只保存占据标签和树结构，而运行地图保存概率、节点和指针。比较前必须统一信息内容、平台位宽与序列化方式。

**3. OctoMap 能否自己修复机器人轨迹漂移？**

不能作为一般保证。它融合输入坐标系中的观测，轨迹估计来自外部系统。错误位姿会造成错误融合，需要定位、回环或子地图处理协同解决。
