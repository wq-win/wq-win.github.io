# 048｜SIFT：先统一局部坐标，再比较纹理

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](047-preview-zmp.md) · [下一篇](049-five-point.md)

**论文**：David G. Lowe，*Distinctive Image Features from Scale-Invariant Keypoints*，IJCV，2004。[作者原稿](https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf)。所链接为 2004 年 1 月 5 日、接受发表的二十八页作者版，以下页码按此 PDF。SIFT 已有 1999 年先行工作；本篇系统展开检测、描述、匹配和验证，并不是所有组件第一次出现的年份。

### 先接住前作的问题

[Harris](023-harris.md)找到局部显著点，不等于缩放旋转后仍能认出它们。SIFT把尺度、方向和描述整合；[ORB](060-orb.md)走更轻的二进制路线，[COLMAP](088-colmap.md)再把特征接入完整重建。

## 一、问题设定：尺度与旋转变化后怎样识别同一局部纹理

机器人向一扇门走近，图像中的门变大；转动相机后，门的纹理也旋转。如果直接比较固定大小的像素小块，同一个位置可能比另一个错误位置还不像。

### 背景：检测重复性与描述区分度是两道关

一个描述子再好，如果同一物理结构在第二幅图中根本没有被检测到，就无法匹配。反过来，重复检测到同一类边缘，也可能因为外观相似而配错。因此论文把位置与尺度选择、方向分配、描述子构造和最终匹配分别评估。

输入是灰度图像，输出每个关键点的位置、尺度、方向及描述向量。它不是强化学习，也不是通过大数据反向传播训练特征的神经网络。识别部分的“训练图像”主要用于建立参考特征数据库，不能直接等同现代模型训练集。

尺度不变性也不是任意缩放后逐比特相同。实际图像存在采样、模糊、噪声和离散尺度层，算法追求可重复的特征坐标及稳定匹配；超出分辨率的信息无法恢复。

## 二、检测尺度极值，再做方向归一化与梯度描述

### 检测：在尺度空间寻找局部极值

高斯尺度空间和差分定义为

$$L(x,y,\sigma)=G(x,y,\sigma)*I(x,y),$$
$$D(x,y,\sigma)=L(x,y,k\sigma)-L(x,y,\sigma).$$

相邻尺度的差分近似尺度归一化的高斯拉普拉斯：$D\approx(k-1)\sigma^2\nabla^2L$。其作用是让不同大小的局部结构在相应尺度显现，不是简单对原图求一次梯度。

候选与本层八个邻居及上下尺度各九个邻居比较，共 26 个。接着在位置和尺度三维空间拟合二次函数，细化极值。低对比候选容易受噪声影响，沿长边的候选则在某个方向位置不稳定，两者分别筛除。

边缘筛选使用二维空间 Hessian 的特征值比例。避免显式求特征值，可比较

$$\frac{\operatorname{tr}(H)^2}{\det H}<\frac{(r+1)^2}{r},\qquad\det H>0.$$

原实验采用比例阈值 $r=10$。这里的 Hessian 是 DoG 的二阶空间导数，不是 LK 正规方程中梯度外积构成的结构张量；两者都反映方向性，但不能因矩阵都是 2×2 就混用。

### 描述：保留粗略布局，容忍小位移

在关键点相应尺度上计算梯度方向直方图，分配主方向。原方法使用 36 个方向桶；若次峰达到主峰的 80%，同一位置可以产生另一个方向实例，从而避免复杂纹理下主方向轻微变化导致描述完全不同。

围绕关键点按尺度和方向建立局部坐标，使用 4×4 空间网格，每格 8 个方向桶，得到 $4\times4\times8=128$ 维向量。每个像素按梯度幅值和高斯窗口加权，并向相邻空间、方向桶插值，减轻越过桶边界时的突变。

这个表示保留“左上角是什么方向、右下角是什么方向”的粗略布局，却不坚持每个梯度出现在完全同一像素。这是在区分能力与局部形变容忍之间取舍。把所有区域合成一个直方图，会丢掉位置结构；把每像素都单独保存，则对形变更敏感。

最后归一化向量，将大于 0.2 的分量截断，再归一化。理想的整体加性亮度变化不影响梯度，整体正比例对比变化可被归一化抵消；局部阴影、饱和与镜面反射不满足这种简单模型，不能称为对任意光照不变。

### 描述子的稳定，来自连续投票而非绝对不变

一个梯度方向若正落在两个方向箱中间，线性投票各分一半；转过很小角度时，权重连续变化。空间两维再一起插值，便形成三线性投票，避免一个像素跨箱后整票突然跳动。[原文第6.1节](https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf)同时使用高斯窗、归一化、截断再归一化，分别处理窗口边界、整体对比度和少数大梯度。

**教学两分量缩影**：向量 $(3,4)$归一化为 $(0.6,0.8)$；像素整体对比度翻倍得到 $(6,8)$，归一化仍相同。但若只有第一分量因反光变为30，则方向和相对权重都改变，不能靠整体归一化恢复。原文0.2截断阈值是在128维描述子上的经验选择，不应直接照搬到这两个分量的示例。

相较[Harris](023-harris.md)主要解决局部检测，本篇增加尺度选择、方向归一化和可匹配描述；[ORB](060-orb.md)是速度与描述表示上的平行取舍；[COLMAP](088-colmap.md)将这类特征作为重建链中的模块。描述子匹配测试与整套重建成功率必须分层解释。

### 匹配：最近不够，还要明显胜过第二名

设最近候选的欧氏距离为 $d_1$，次近为 $d_2$，使用 $d_1/d_2$ 判断歧义。低比例意味着第一名明显更像；两名几乎一样，即使绝对距离都小，也可能来自重复纹理。

论文对象识别设置中，若参考库含同一物体多视图，第二名按来自不同物体的最近候选定义。普通双图匹配常直接取第二近描述子，两种使用条件应区分。

通过比例筛选也不等于几何正确。原文识别管线还用 Hough 位姿投票聚类、仿射最小二乘与外点剔除。机器人位姿任务通常要换用适合相机和场景的几何模型，而不是把一个物体识别仿射框直接当成相机六自由度位姿。

算法没有统一可微损失贯穿所有步骤。DoG 极值、稳定性筛选、描述子距离与几何残差是不同对象；最终匹配率改善不能全部归因于某一个式子。

检测、描述和比值筛选各自回答一道问题。下面把候选对应送到几何验证之前，先区分重复检测和描述区分度所需的证据。

## 三、执行描述子匹配，用比值检验筛候选

```text
输入：两幅图像或图像与参考特征库
对每幅图像：
    建立高斯金字塔并计算 DoG
    检查空间与尺度邻域极值
    细化位置和尺度，去掉低对比及强边缘响应
    为稳定候选分配一个或多个局部方向
    在归一化坐标中累计 4×4×8 梯度直方图
    归一化、截断大分量、再次归一化
对每个描述子：
    查找最近与次近候选
    根据距离比拒绝歧义匹配
将保留匹配交给符合任务的几何验证
输出：带关键点坐标的候选对应及验证结果
```

### 自构例子与前置概念

一块招牌在第一张图中宽 80 像素，在第二张图中宽 160 像素并旋转 30 度。若检测到对应尺度及方向，SIFT 可以把邻域变到近似相同局部坐标中再统计。若只用固定 16×16 原图窗口，两次看的可能根本不是同一范围。

但若招牌上每个字母都是同样的条纹，尺度和方向统一仍不能创造唯一身份。这时距离比或几何一致性会比单个最小距离更重要。

五个前置概念：**尺度空间**以不同平滑尺度观察结构；**局部极值**提供候选位置；**方向归一化**抵消图像内旋转；**描述子**编码局部外观；**几何验证**检验多组对应是否符合共同变换。

## 四、拆开读检测、描述与匹配各组实验

<!-- figure-ref-v6:start:rc-48-figure-9-anchor -->
<span id="rc-48-figure-9"></span>
<!-- figure-ref-v6:end:rc-48-figure-9-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/048-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/048-evidence.png" width="891" height="617" alt="Fig. 9：横轴增加视角变化时，定位、方向分配和最终匹配的重复率下降幅度不同" loading="lazy"></a><figcaption>原论文结果图／表摘引：David G. Lowe（2004），Fig. 9，PDF 第 18 页；<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=18" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：横轴增加视角变化时，定位、方向分配和最终匹配的重复率下降幅度不同。看各阶段之间的差距，才能区分特征检测丢失与描述子匹配失败。

### 实验如何拆开验证

重复检测率、描述匹配率和对象识别率来自不同实验；图的分母和扰动类型应保留，不能将其中一个曲线解释为完整视觉定位成功率。

| 实验轴 | 原文设置 | 指标含义 |
|---|---|---|
| 尺度采样和初始平滑 | 32 幅真实图像加合成旋转、尺度变化与噪声 | 变换已知，因此可计算位置、尺度重复检测 |
| 描述子网格与方向数 | 第 6.2 节，平面视角变化 50 度、4% 噪声、40,000 关键点数据库 | 最近邻能否找到正确对应，非对象分类准确率 |
| 数据库规模 | 112 幅图像构成扩大的干扰库 | 干扰候选增多时描述子的区分能力 |
| 比例测试 | 40,000 点库，30 度平面深度旋转和 2% 噪声等 | 正误匹配的距离比分布 |
| 识别应用 | 杂乱遮挡中的物体与场景区域 | 完整匹配验证管线可用性，非大规模分类数据集 |
| 算力与训练 | 手工特征，无梯度训练；应用报告使用 2 GHz Pentium 4 | 历史耗时不能代表所有分辨率和现代实现 |

大部分受控实验通过变换真实图像构造对应真值，这有利于隔离参数，但不能涵盖三维物体自遮挡、新表面出现和复杂真实光照。参数也在这组实验中选择，不能视为完全独立测试上的最优超参数保证。

### 五组图的证据强度

**[Fig. 3](#rc-48-figure-3)–[图 4](#rc-48-figure-4)，PDF 第 8–9 页**：区分重复检测比例、正确匹配比例与关键点总量。更多尺度层可能增加正确匹配总数，却降低百分比，因此“重复率最高”不等于所有任务都应取同样采样量。

<!-- figure-ref-v6:start:rc-48-figure-3 -->
<figure class="reading-evidence-figure" id="rc-48-figure-3"><a href="/robot-classic/assets/figure-refs-v6/048-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/048-figure-3.png" width="1097" height="391" alt="原论文 Figure 3：每倍频程采样层数的重复率与关键点数" loading="lazy"></a><figcaption>原论文图摘引：Lowe（2004），Figure 3，PDF 第 8 页；<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=8" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：左右图共享采样层数横轴：重复率在几层后趋于平缓，而关键点数量继续增加；因此增加计算量不保证同比提高匹配质量。
<!-- figure-ref-v6:end:rc-48-figure-3 -->

<!-- figure-ref-v6:start:rc-48-figure-4 -->
<figure class="reading-evidence-figure" id="rc-48-figure-4"><a href="/robot-classic/assets/figure-refs-v6/048-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/048-figure-4.png" width="667" height="484" alt="原论文 Figure 4：预平滑尺度与检测重复率" loading="lazy"></a><figcaption>原论文图摘引：Lowe（2004），Figure 4，PDF 第 9 页；<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=9" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：横轴为每倍频程的预平滑sigma，纵轴为重复率；两条曲线分别检查位置尺度一致性和描述子匹配，不能把二者当成同一指标。
<!-- figure-ref-v6:end:rc-48-figure-4 -->

**[Fig. 5](#rc-48-figure-5)，第 11 页**：示例从 832 个候选，经低对比筛选剩 729，再经边缘筛选剩 536。它直观展示筛选作用，但单幅图数量不是整套算法准确率。

<!-- figure-ref-v6:start:rc-48-figure-5 -->
<figure class="reading-evidence-figure" id="rc-48-figure-5"><a href="/robot-classic/assets/figure-refs-v6/048-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/048-figure-5.png" width="1057" height="739" alt="原论文 Figure 5：关键点筛选的四个阶段" loading="lazy"></a><figcaption>原论文图摘引：Lowe（2004），Figure 5，PDF 第 11 页；<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=11" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：从原图到候选点，再去除低对比度点和边缘响应，箭头数量逐步减少；保留下来的点并不是所有强边缘上的像素。
<!-- figure-ref-v6:end:rc-48-figure-5 -->

**[Fig. 8](#rc-48-figure-8)–[图 9](#rc-48-figure-9)，第 17–18 页**：网格和方向桶数存在折中，强平面仿射变化降低各阶段稳定性。不能把平面旋转实验中的容忍角度直接推广到任意三维物体。

<!-- figure-ref-v6:start:rc-48-figure-8 -->
<figure class="reading-evidence-figure" id="rc-48-figure-8"><a href="/robot-classic/assets/figure-refs-v6/048-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/048-figure-8.png" width="667" height="476" alt="原论文 Figure 8：描述子空间宽度与方向桶数量" loading="lazy"></a><figcaption>原论文图摘引：Lowe（2004），Figure 8，PDF 第 17 页；<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=17" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：横轴是描述子网格宽度，三条曲线使用4、8和16个方向；增加空间范围先明显改善匹配，随后收益减小。
<!-- figure-ref-v6:end:rc-48-figure-8 -->

**[Fig. 10](#rc-48-figure-10)–[图 11](#rc-48-figure-11)，第 19–20 页**：扩大数据库时区分度下降；比例阈值 0.8 在指定实验中剔除约 90% 错配，同时丢掉不到 5% 正确匹配。这是两类样本各自的保留情况，不是“最终匹配准确率 95%”。

<!-- figure-ref-v6:start:rc-48-figure-10 -->
<figure class="reading-evidence-figure" id="rc-48-figure-10"><a href="/robot-classic/assets/figure-refs-v6/048-figure-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/048-figure-10.png" width="660" height="484" alt="原论文 Figure 10：数据库关键点数量与匹配重复率" loading="lazy"></a><figcaption>原论文图摘引：Lowe（2004），Figure 10，PDF 第 19 页；<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=19" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：横轴采用对数刻度，数据库增大时最近描述子匹配曲线有所下降；位置、尺度和方向检测曲线用于区分检测与匹配的影响。
<!-- figure-ref-v6:end:rc-48-figure-10 -->

<!-- figure-ref-v6:start:rc-48-figure-11 -->
<figure class="reading-evidence-figure" id="rc-48-figure-11"><a href="/robot-classic/assets/figure-refs-v6/048-figure-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/048-figure-11.png" width="664" height="484" alt="原论文 Figure 11：最近与次近距离比值的正确错误匹配分布" loading="lazy"></a><figcaption>原论文图摘引：Lowe（2004），Figure 11，PDF 第 20 页；<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=20" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：正确匹配密度偏向较小距离比，错误匹配更多聚集在接近1的位置；阈值筛选利用的是相对歧义，而不是固定绝对距离。
<!-- figure-ref-v6:end:rc-48-figure-11 -->

**[Fig. 12](https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=23)–[图 13](https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=24)，第 23–24 页**：对象与地点识别显示局部特征加几何验证可抵抗部分遮挡。第 25 页报告这两个例子的完整识别少于 0.3 秒，并指出更系统的真实三维视角和光照测试仍有必要。

<!-- figure-ref-v6:start:rc-48-final-source-gap-note -->
<span id="rc-48-figure-12"></span><span id="rc-48-figure-13"></span><p class="figure-reference-note">尚未内嵌：<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=23" target="_blank" rel="noopener noreferrer">图 12</a>、<a href="https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf#page=24" target="_blank" rel="noopener noreferrer">图 13</a>。尺度采样、筛选、描述子、距离比判断与定量对照已摘引；剩余是两组杂乱场景物体识别照片拼图。当前不将方法分析连同完整应用展示集一起复现，保留具体示例的原文入口。</p>
<!-- figure-ref-v6:end:rc-48-final-source-gap-note -->





## 五、保留视角变化、遮挡和几何验证条件

SIFT 把局部坐标标准化与有区分度的分布描述结合得很完整，还用分阶段实验解释为何选这些参数。代价是多尺度图像、浮点描述子和近邻搜索；因此后来的机器人系统常研究更轻量的二进制描述子或学习特征。

重复窗户会产生很多貌似可信的匹配，白墙则可能根本没有稳定特征。运动模糊破坏局部梯度，强视角改变使局部区域发生非相似形变，动态物体又可能匹配正确但不属于静态背景。描述子正确对应与适合相机运动估计之间，还隔着场景假设。

原文对相关工作中 RANSAC 的低内点率困难作讨论，不能理解为 RANSAC 只有内点超过 50% 才能运行。其样本复杂度与最小样本数、内点率及置信度有关；本文选择 Hough 聚类是特定识别情境的工程取舍。

## 六、追问：要区分检测器和描述子的贡献，实验输入应该怎样固定？

<details>
<summary>要区分检测器和描述子的贡献，实验输入应该怎样固定？</summary>

**参考答案**：先在固定对应关键点上比较描述区分度，再单独测量变换后关键点能否重复检测；端到端匹配则同时包含两项影响。各实验应说明尺度、视角和阈值设置。只报告最终匹配数，无法判断收益来自多找了点还是把点描述得更可靠。

</details>

## 七、降低描述成本，或进入完整重建

- **平行路线**：[ORB：让二进制特征既快又有区分力](060-orb.md)。用方向化二进制测试降低计算与存储开销。
- **模块组合**：[COLMAP 的 SfM 基础：重建质量取决于整条链，而不只取决于 BA](088-colmap.md)。把局部特征接入增量重建与几何验证。

## 八、自测与参考答案

**问题 1：为什么关键点重复检测率很高，最终匹配仍可能差？**

**参考答案**：检测只保证相应位置和尺度再次出现，描述子仍可能不稳定或不够区分。重复纹理会有多个相似候选，方向赋值也可能改变，必须分别检查检测、描述和匹配。

**问题 2：为什么 128 维描述子不直接保存 128 个像素值？**

**参考答案**：像素值对精确位置和亮度敏感。梯度方向直方图在保留粗空间布局时容忍小位移，归一化又可消除部分整体亮度和对比变化。维数相同不意味着包含的信息结构相同。

**问题 3：d1/d2 很小，是否就能确认相机位姿估计可用？**

**参考答案**：不能。它仅说明当前特征库中的最佳候选相对突出，仍可能匹配动态物体或几何上不相容的位置。需要足够分布的对应、合适几何模型和外点验证，才能进入可靠位姿估计。


