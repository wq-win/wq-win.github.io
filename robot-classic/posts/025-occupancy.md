# 025｜Occupancy Grid：地图不只记录哪里有墙，还记录有多确定

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](024-hand-eye.md) · [下一篇](026-vfh.md)

**论文**：Alberto Elfes，*Using Occupancy Grids for Mobile Robot Perception and Navigation*，1989，Computer 22(6):46–57。[原始期刊扫描件](https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf) · [作者上传的同版正文](https://www.researchgate.net/publication/2953854_Using_occupancy_grids_for_mobile_robot_perception_and_navigation) · [DOI](https://doi.org/10.1109/2.30720)。

### 先接住前作的问题

[空间不确定性](017-uncertain-map.md)主要保存坐标关系误差，本篇选择为每格保存是否占据的信念，避免过早拟合确定物体。原系统与[A*](003-astar.md)和局部势场组合导航。

## 一、问题设定：带方向歧义的测距怎样累积成占据信念

超声波测到两米处有反射，并不意味着正前方恰好两米处一定有一面墙。反射可能来自波束内的多个方向，测距也有误差。如果马上把这次读数画成确定障碍，错误可能长期留在地图里。

### 背景：几何描述之前，先保留传感器确实知道什么

文章所针对的瓶颈是过早解释：把不完整读数直接变成线段、表面或物体模型，容易把猜测当成事实。格子无需预先知道障碍是桌腿、墙还是树，只问一个局部空间问题。因此自然环境和结构复杂的场景也能进入同一表示。

这是概率估计与地图表示方法，不是学习控制策略。输入包含距离读数及相应传感器位姿，状态是每个格子的二元占据变量，输出是地图后验或供规划使用的代价图。导航有行动目标，但地图更新本身没有奖励函数，也不依靠试错训练。

对第 $i$ 格，令 $m_i\in\{0,1\}$，其中 1 表示占据。$p_i=P(m_i=1\mid z_{1:t},x_{1:t})$ 表示给定观测与位姿后的信念。原文第 47 页采用零阶随机场近似，使单格状态可以分别估计；更高阶关联模型需要更多计算。

“未知”不是第三种物理材质，而是缺少足够证据。未观测区域可能用接近先验的概率表示；规划器是否允许穿越未知区域，是后续风险决策。把未知全部当作空地会改变任务风险，却不是地图提供了新的空闲证据。

## 二、从单次观测证据推到栅格概率更新

### 方法：一份新证据如何改变旧地图

先看单格的贝叶斯更新。以 $L_1=P(z_t\mid m_i=1)$、$L_0=P(z_t\mid m_i=0)$ 表示简化似然，则

$$p_i^+=\frac{L_1p_i}{L_1p_i+L_0(1-p_i)}.$$

直觉是：当这次读数在“占据”的假设下更可能出现，占据概率就增加；反之下降。传感器模型是算法的物理入口，不能随意把距离数值本身当成概率。真实射线观测还受沿线遮挡与其他格子影响，上式采用的是逐格近似后的解释。

为便于理解实现，可把信念写成对数几率 $l_i=\log[p_i/(1-p_i)]$。于是累积似然比变成加法。如果前端提供逆传感器模型 $\hat p_i=P(m_i=1\mid z_t,x_t)$，且它使用先验 $p_0$，得到常见的教学表达：

$$l_i^+=l_i+\log\frac{\hat p_i}{1-\hat p_i}-\log\frac{p_0}{1-p_0}.$$

减去先验项是为了避免每次把同一个先验重复计算。这是对贝叶斯机制的代数重写，不声称原文用同样变量列出今天常见的软件伪代码。

对于窄波束测距，命中点之前的可见射线提供空闲证据，端点附近提供占据证据，端点后面通常未知。宽波束声呐还要处理角度模糊，不能像理想激光那样只在一条无限细线上更新。原文第 48–49 页的传感器概率轮廓正是在说明这种区别。

这里没有一个端到端优化损失。主要改变是表示与推断机制，实验改善对象是地图的可用性、信息融合和对误差的表达。导航成功还依赖定位、碰撞模型和规划策略，不能只由每格概率保证。

逆传感器概率与似然比不是同一个数。由贝叶斯公式可得

$$\frac{L_1}{L_0}=\frac{\hat p_i/(1-\hat p_i)}{p_0/(1-p_0)}.$$

原创例取前端建模先验 $p_0=0.2$，某观测给出 $\hat p_i=0.5$；这并非“毫无证据”，而是将占据几率从 $1/4$ 提升到1，似然比为4。若当前格子仍在先验0.2，更新后得到0.5；第二次条件独立的同类证据才得到0.8。把 $\hat p=0.5$ 永远理解为中立，是把常用先验0.5误当成了必然规律。

单格概率还会丢失观测产生的联合约束。另一个原创理想例中，两个格子先验独立且各有一半概率占据，传感器只告诉我们“至少一个被占据”。四种状态中 $(0,0)$ 被排除，剩下 $(1,0),(0,1),(1,1)$ 各为 $1/3$；两格边缘占据概率都为 $2/3$，但实际同时占据概率是 $1/3$，并非独立近似的 $4/9$。零阶随机场节省了联合表示成本，也确实舍弃了这类相关性，不能仅靠反复贝叶斯更新找回来。

这与[空间不确定性](017-uncertain-map.md)保留共享误差来源的讨论相通，但两者表示的状态不同。本篇原文Dolphin系统把地图与[A*](003-astar.md)、[人工势场](014-potential-field.md)组合，属于论文中明确出现的模块集成；若进一步加入机器人尺寸，应采用[构型空间](009-configuration-space.md)的碰撞含义，而不是认为低占据概率本身已经提供全机身通行保证。

逐格概率更新看起来只是重复加证据，独立性和定位误差却决定这一步是否可信。两次“看见”的例子将先检查数据来源，再进入声呐与双目地图证据。

## 三、实现逐格融合，用重复观测检验独立性

```text
输入：地图先验，各传感器模型，带时间和位姿的测距观测
初始化每格占据概率或对数几率
对每次观测：
    按传感器波束与遮挡关系确定受影响的格子
    用对应传感器模型形成空闲、占据或无信息证据
    在共同坐标系中完成逐格贝叶斯更新
    若位姿不确定，传播其空间影响，避免当作精确落点
保留概率地图；按任务需要生成占据/空闲/未知标签
为规划考虑机器人尺寸，构造膨胀障碍或风险代价
输出：概率地图与可选导航表示
```

### 一个自构例子：两次“看见”为什么不能随便相加

设先验为 $p_0=0.5$，一次观测给占据的似然比 4。后验几率从 1 变为 4，概率为 0.8。若第二次观测在给定占据状态下独立且同样有似然比 4，几率变为 16，概率为 $16/17\approx0.941$。

若第二条只是同一张传感器数据被重复读入，这个 0.941 就是虚假自信。若后续独立空闲证据的似然比为 $1/4$，它会抵消一次占据证据，概率退回 0.8，而不是直接变成“空”。这些数字是教学构造，说明证据累积、重复计数和硬标签覆盖的区别。

五个前置概念：**伯努利变量**表示占据或空闲；**贝叶斯更新**将先验与新证据结合；**似然比**衡量一份观测更支持哪种假设；**条件独立**说明哪些证据可直接相乘；**位姿不确定性**决定传感器信息在空间中的分布。

## 四、读声呐与双目建图，区分地图表示与精度排名

本篇介绍占据地图框架，部分更细的推导和实验由所引文献承担。传感器融合示例不等于所有测量独立，定位不确定性仍会影响地图。


<!-- figure-ref-v6:start:rc-25-figure-13-anchor -->
<span id="rc-25-figure-13"></span>
<!-- figure-ref-v6:end:rc-25-figure-13-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/025-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/025-evidence.png" width="515" height="868" alt="Fig. 13：依次比较声呐、双目和融合地图中的占据区域：两种传感器对同一环境的盲区不同，融合后的形状体现互补信息；这里没有逐格概率校准曲线" loading="lazy"></a><figcaption>原论文结果图／表摘引：Alberto Elfes（1989），Fig. 13，PDF 第 8 页；<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=8" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：依次比较声呐、双目和融合地图中的占据区域：两种传感器对同一环境的盲区不同，融合后的形状体现互补信息；这里没有逐格概率校准曲线。

### 实验如何支撑这套框架

| 项目 | 原文内容与边界 |
|---|---|
| 室内平台 | Neptune，环形声呐与双目相机；[图 7](https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=6) |
| 户外平台 | Terregator；文章还介绍面向矿区的 Locomotion Emulator，[图 8](https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=6) |
| 软件 | Dolphin 建图导航系统；Neptune 的感知导航主系统在机外计算，车载处理运动与接口 |
| 数据 | 实际室内走廊、室外林地、声呐与扫描线双目观测 |
| 对照 | 单声呐、单双目与融合地图展示，[图 13](#rc-25-figure-13) |
| 预算与指标 | 框架展示未给出可统一复算的训练预算或大样本精度排行榜；无学习训练 |
| 重复与不确定性 | 地图显式表示信念，但文章未给出跨随机种子的结果置信区间；二者不能混淆 |

<!-- figure-ref-v6:start:rc-25-final-source-gap-note -->
<span id="rc-25-figure-7"></span><span id="rc-25-figure-8"></span><span id="rc-25-figure-15"></span><p class="figure-reference-note">尚未内嵌：<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=6" target="_blank" rel="noopener noreferrer">图 7</a>、<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=6" target="_blank" rel="noopener noreferrer">图 8</a>、<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=10" target="_blank" rel="noopener noreferrer">图 15</a>。两张机器人平台照片对当前概率模型评论不是必要证据；八面板连续地图接近整页，和已摘引的多组地图更新证据有较大重叠。当前保留这些原图入口，未以固定图数或无 CC 声明认定禁止。</p>
<!-- figure-ref-v6:end:rc-25-final-source-gap-note -->









<!-- figure-ref-v6:start:rc-25-links-98 -->
本页定位：[图 13内嵌图](#rc-25-figure-13)。
<!-- figure-ref-v6:end:rc-25-links-98 -->

第一组证据是**[图 3–4](#rc-25-figure-3)，第 49 页**的高斯传感器占据概率轮廓。它们解释测量噪声如何进入地图，不是实机鲁棒性统计。

<!-- figure-ref-v6:start:rc-25-figure-3 -->
<figure class="reading-evidence-figure" id="rc-25-figure-3"><a href="/robot-classic/assets/figure-refs-v6/025-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/025-fig-3.png" width="749" height="767" alt="图3：高斯距离传感器观测下的一维占据概率曲线" loading="lazy"></a><figcaption>Alberto Elfes（1989），图 3，PDF 第 4 页；<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/025-fig-3.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：沿横轴读距离，纵轴读占据概率；测量附近概率上升、之前区域降低，未观测区域仍保留先验，不能把未知等同空闲。
<!-- figure-ref-v6:end:rc-25-figure-3 -->

<!-- figure-ref-v6:start:rc-25-figure-4 -->
<figure class="reading-evidence-figure" id="rc-25-figure-4"><a href="/robot-classic/assets/figure-refs-v6/025-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/025-fig-4.png" width="781" height="522" alt="图4：二维高斯传感器的占据概率曲面" loading="lazy"></a><figcaption>Alberto Elfes（1989），图 4，PDF 第 4 页；<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/025-fig-4.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：近处的低谷与回波附近的峰对应自由空间和障碍证据；沿波束的测距与横向的不确定性共同决定曲面形状。
<!-- figure-ref-v6:end:rc-25-figure-4 -->

第二组是**[图 9](#rc-25-figure-9)–[图 12](#rc-25-figure-12)，第 51–53 页**的声呐地图，包括室内和林地。图像支持系统能产生可用于空间推理的地图；没有配套真值误差曲线时，地图看起来合理不等于知道每格概率经过严格校准。

<!-- figure-ref-v6:start:rc-25-figure-9 -->
<figure class="reading-evidence-figure" id="rc-25-figure-9"><a href="/robot-classic/assets/figure-refs-v6/025-fig-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/025-fig-9.png" width="746" height="481" alt="图9：室内声呐二维占据栅格与房间及障碍轮廓" loading="lazy"></a><figcaption>Alberto Elfes（1989），图 9，PDF 第 7 页；<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/025-fig-9.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：对照边界、圆形障碍与机器人采样位置；扫描版为灰度，原图注中的颜色信息不可直接从这里恢复。
<!-- figure-ref-v6:end:rc-25-figure-9 -->

<!-- figure-ref-v6:start:rc-25-figure-10 -->
<figure class="reading-evidence-figure" id="rc-25-figure-10"><a href="/robot-classic/assets/figure-refs-v6/025-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/025-fig-10.png" width="413" height="333" alt="图10：图9声呐地图对应的三维占据概率视图" loading="lazy"></a><figcaption>Alberto Elfes（1989），图 10，PDF 第 7 页；<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/025-fig-10.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：高度表示每个栅格的占据概率；这是同一地图的概率视图，不是环境物体的真实三维高度。
<!-- figure-ref-v6:end:rc-25-figure-10 -->

<!-- figure-ref-v6:start:rc-25-figure-11 -->
<figure class="reading-evidence-figure" id="rc-25-figure-11"><a href="/robot-classic/assets/figure-refs-v6/025-fig-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/025-fig-11.png" width="762" height="380" alt="图11：走廊地图、机器人采样位置与声呐射线" loading="lazy"></a><figcaption>Alberto Elfes（1989），图 11，PDF 第 7 页；<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/025-fig-11.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：从各停靠点发出的射线展示观测如何累计成地图；墙面和门洞的可分辨程度与声呐模型及栅格分辨率共同有关。
<!-- figure-ref-v6:end:rc-25-figure-11 -->

<!-- figure-ref-v6:start:rc-25-figure-12 -->
<figure class="reading-evidence-figure" id="rc-25-figure-12"><a href="/robot-classic/assets/figure-refs-v6/025-fig-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/025-fig-12.png" width="1005" height="360" alt="图12：室外树林测试的声呐占据地图和行驶轨迹" loading="lazy"></a><figcaption>Alberto Elfes（1989），图 12，PDF 第 8 页；<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/025-fig-12.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：黑色障碍与中央行驶轨迹对应室外测试；这张图展示一次运行的结果，不能推出所有植被环境下的可靠性。
<!-- figure-ref-v6:end:rc-25-figure-12 -->

第三组是**[图 13](#rc-25-figure-13)，第 53–54 页附近的传感器融合讨论**。声呐角分辨率较差，双目又依赖纹理和对比度；两者的盲区不同，融合能提供互补信息。文章采用独立意见池方式结合单传感器地图。这支持互补性，而不能证明传感器错误永远独立，也不能保证冲突证据总被正确解决。

<!-- figure-ref-v6:start:rc-25-links-104 -->
本页定位：[图 13内嵌图](#rc-25-figure-13)。
<!-- figure-ref-v6:end:rc-25-links-104 -->

第四组是**[图 15](https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=10)–[图 16](#rc-25-figure-16)，第 55–56 页**：位姿不确定性会使地图模糊，并可把局部视图附着在运动关系图上保存。它表明作者没有把定位当作完全不存在的问题；但概率图更新本身也不等同于现代完整 SLAM 后端。



<!-- figure-ref-v6:start:rc-25-figure-16 -->
<figure class="reading-evidence-figure" id="rc-25-figure-16"><a href="/robot-classic/assets/figure-refs-v6/025-fig-16.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/025-fig-16.png" width="763" height="882" alt="图16：局部机器人视图网络、运动路径与全局地图的两层表示" loading="lazy"></a><figcaption>Alberto Elfes（1989），图 16，PDF 第 11 页；<a href="https://mediawiki.isr.ist.utl.pt/images/f/f3/Elfes_occup_grids.pdf#page=11" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/025-fig-16.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：上层保存各局部视图及位姿关系，下层保留融合地图；保留关系网络有助于避免把每次观测不可逆地压平到单一网格。
<!-- figure-ref-v6:end:rc-25-figure-16 -->

## 五、检查定位误差、离散化和相关证据

这是从模型作出的分析。假设声呐在某种材质上持续产生同一种伪反射，算法却把连续读数当作独立证据，就会不断提升错误格子的置信度。后验更尖锐只说明模型累积了证据，并不自动说明模型正确。

定位误差同样会污染地图。一面真实薄墙，如果每次落点都有横向误差，可能被画成厚墙甚至双墙。原文讨论世界中心与机器人中心地图的不同模糊方式：前者新观测受全局位姿误差影响，后者让远期地图相对于当前机器人变得不确定。两者都在处理“信息应该放在哪里”，而非只处理传感器读数是否准确。

格子独立是计算上的重要近似。两格如果可能解释同一个声呐回波，其占据状态通常并不独立；把每格边缘概率保存下来，无法保留所有互斥关系。地图还会失去格内几何：细杆可能消失，窄通道可能被关闭；更小格子提升分辨率，同时增加内存和更新成本。

在三维中，把每条边的格子数加倍，稠密格子总数增加八倍。这是维度带来的直接成本，而不是算法实现不够优化。后来稀疏体素与树结构解决存储分配问题，但不自动解决概率模型与动态障碍问题。

## 六、追问：把栅格分辨率提高一倍，能否在不改传感器模型时认为地图信息增加了？

<details>
<summary>把栅格分辨率提高一倍，能否在不改传感器模型时认为地图信息增加了？</summary>

**参考答案**：不能。更多格子改变空间离散化，却没有增加独立测量；原来的波束和定位不确定性仍覆盖多个单元。应重新检查逆传感器模型与存储成本，并区分绘图更细和证据更强。概率更新依然受相关性近似限制。

</details>

## 七、扩展三维存储，再把占据信念交给规划

- **直接继承**：[OctoMap：同时记住障碍、自由空间与尚未看见的地方](074-octomap.md)。把概率占据扩展到八叉树三维存储，同时保留未知与空闲的区别。
- **模块组合**：[A*：用可信的剩余代价引导最短路搜索](003-astar.md)。将地图变成搜索图之前，还需确定碰撞阈值与机器人尺寸。

## 八、自测与参考答案

**问题1：未扫描过的格子，与多次确认没有障碍的格子，为什么不能用同一个数值表示？**

答：前者接近先验，表示不知道；后者有空闲证据，占据概率较低。两者对探索和安全规划的含义不同。使用同一个空白标签会丢失知识状态，让规划器误把未知当成已验证通道。

**问题2：为什么有了概率地图，还必须关注机器人定位？**

答：概率更新仍需要把观测放到对应格子。位姿错误会把正确读数分配到错误位置；只建模测距噪声不能修复坐标错误。应传播位姿不确定性，或用地图一致性反过来改进定位。

**问题3：两个传感器都认为某格被占据，就能把置信度无限提高吗？**

答：只有在传感器模型可靠且相关性处理正确时，证据叠加才有合理含义。共享标定偏差、相同遮挡或重复数据会造成共同错误。融合需要辨认独立信息，还应考虑模型失配和动态变化，不能把传感器数量当成真实性证明。
