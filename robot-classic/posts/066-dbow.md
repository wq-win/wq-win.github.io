# 066｜DBoW：怎样从相似图片中找出真正的重访地点

[返回总览](00-发展时间线总览.md) · [上一篇](065-min-snap.md) · [下一篇](067-ompl.md)

**论文**：Dorian Gálvez-López、Juan D. Tardós，*Bags of Binary Words for Fast Place Recognition in Image Sequences*，IEEE TRO，2012。[出版记录](https://doi.org/10.1109/TRO.2012.2197158) · [原文预印本存档](https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf)。本文讨论扩展后的期刊方法，不把后续 ORB-SLAM 的功能归给它。

### 先接住前作的问题

[ORB](060-orb.md)等描述子能匹配局部图块，大地图中却不能每次逐图穷举。DBoW2用词汇和索引快速筛候选。

## 一、问题设定：历史图像怎样快速筛出可信闭环候选

机器人绕了一圈回到走廊，能否认出这里来过？逐张比较历史图片太慢；只找视觉上相似的图片又容易把另一条相似走廊误认成原地点。错误闭环一旦送进地图优化器，可能把整张地图拉坏。

### 背景与问题定义

这是视觉地点识别方法，无强化学习奖励、策略或价值函数。输入是单目图像流；内部状态是历史图像数据库、词袋向量及匹配历史；输出是经过验证的历史图像对应关系。它可以为 SLAM 提供闭环候选，但不直接完成全局位姿优化。

“看起来相似”和“相机真的回来”是两个不同命题。楼道重复门框能产生相似外观；相同地点的曝光和视角变化则可能让外观不同。因此，一个实用系统需要同时处理检索效率、感知混淆和几何一致性。

以一般词袋检索为参照，本文沿用局部描述子量化、词频加权和倒排检索，重点改变描述子及其索引方式，并把序列证据用于候选筛选。原文使用 FAST 与修改的 BRIEF，不能因为后来 DBoW 系列支持 ORB，就说本篇原始实验使用 ORB。

离线训练词汇不等于训练控制策略；在线插入图片也不等于在线强化学习。论文中的训练集主要用于词汇学习或参数选择，应分别核对，不能合并称作训练数据。

## 二、量化二进制视觉词，再做时间与几何验证

### 1. 把局部外观变成词

BRIEF 用局部像素比较形成比特串。两个描述子的汉明距离是不同位的数量。比如教学字符串 101100 与 100110 相差两位，距离为 2。比较可以通过异或和位计数实现，而不必对浮点向量反复计算欧氏距离。

层次词汇树把描述子逐层分组，最终映射到叶节点，即视觉词。图像被表示为带权词频向量：出现太普遍的词区分力较弱，稀有词的区分作用较强。这一设计降低了检索成本，但量化也会丢失信息：相似描述子可能落到不同词，重复纹理则可能落到同词。

对于已经做 L1 归一化的非负词向量，可把相似度写成

$$s(v,w)=1-\frac12\|v-w\|_1.$$

这里的分数反映词分布相似程度，不是“同一地点的概率”。原文还用当前图像与前一图像的相似程度归一化候选分数，以适应不同图像内容；当前后帧本来几乎不相似时，必须防止小分母造成虚高。

### 2. 两种索引解决两种问题

倒排索引回答“包含这个词的历史图像有哪些”，避免每次遍历所有历史图像。直接索引回答“某图像中哪些局部特征属于这个树节点”，帮助候选图像之间寻找对应点。

可以把前者理解为书末索引中的关键词到页码，后者理解为某页内部的内容分组。它们分别缩小候选图像集合和候选特征对集合，不应混为一个查表步骤。

直接索引允许在词汇树的祖先节点上匹配：只匹配相同叶节点最快但容易漏掉对应；放宽到更高祖先会增加对应机会，也增加计算量。树的顶层相当于几乎不再筛选，速度优势会消失。

### 3. 外观、时间、几何依次过滤

相邻历史帧可能描述同一位置。如果把它们互相当竞争者，单个分数会分散。论文先将时间邻近的候选归组，再考察连续查询是否支持相近的历史区间，最后用局部对应估计基础矩阵并检查支持。

数学目标、算法机制和实验指标必须分开：这里没有端到端学习一个闭环奖励；词向量相似度用于检索，RANSAC 用于几何判断，最终评价的是精确率、召回率和执行时间。提高相似度不是已经提高了定位精度。

### 词袋相似只提供候选，几何一致才提供约束

将图像压成视觉词频会丢掉大量空间排列。**教学例**：两图都含一扇窗、一张桌、一个灯，词袋可相同；若三者位置完全不同，仍未必是同一地点。倒排索引回答“哪些图共享这些词”，直接索引进一步回答“这些词来自哪些特征”，才便于几何验证；两种索引服务不同查询。

把归一化词频简化为 $v=(0.5,0.5,0)$与 $w=(0.5,0,0.5)$，基于 $L_1$距离的相似分数 $1-\|v-w\|_1/2=0.5$。这个数是所选描述空间的相似度，未经校准不能解释为50%回环概率。真实系统还使用词权重、时序一致性和几何过滤。

[作者官方库说明](https://github.com/dorian3d/DBoW2)确认层次词汇树、倒排/直接索引及BRIEF、ORB接口；当前库功能不能自动归入2012论文。本轮另核读[原预印本第IV–VI节及表II–VI](https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf)：直接索引放宽到共同祖先会同时增加候选对应与计算，而FAB-MAP对照还改变了部分输入频率和词汇规模，因而不是单变量消融。[ORB](060-orb.md)是可组合的特征模块，后作[ORB-SLAM](082-orbslam.md)用词袋产生回环与重定位候选。检索耗时与错误回环对整图的破坏风险，应分开评价。

词袋分数只生成候选，时间与几何验证决定是否交给地图。下面沿这条筛选链记录真闭环和误报，再解释论文有限序列上的零误报。

## 三、执行检索和验证，用相似走廊检查误报

以下是教学伪代码，省略原实现的边界管理与参数细节：

```text
离线：用独立图像的二进制特征构建词汇树
初始化历史数据库、倒排索引、直接索引和候选历史
对于当前图像 I：
    提取局部二进制特征，将特征量化成视觉词
    形成加权词向量 v
    如果图像信息不足或相邻帧相似度不足：跳过本次闭环判断
    否则：
        利用倒排索引检索历史候选，排除时间过近的图像
        归一化候选分数，将时间邻近候选合并成组
        检查最优组与前几次查询的时间一致性
        若通过：利用直接索引寻找候选图像的局部对应
        用 RANSAC 检查基础矩阵及支持点
        若几何检验通过：输出闭环图像对
    将当前图像及其两种索引信息加入数据库
```

### 建立自己的理解

**自构例子，未运行。** 假设机器人第一次经过红门、白墙、消防箱，回来时又观察到相同词集合。检索会提出这段历史；连续几帧都指向相邻历史时间，形成时间支持；最后门框和消防箱上的对应点符合共同几何关系，闭环才被接受。如果另一个楼层有相同布置，前三步仍可能通过，因此不能把这些检查当作逻辑上的绝对证明。

五个前置概念：

1. 局部描述子：用短向量表示一个图像邻域的外观。
2. 视觉词袋：忽略部分空间结构，将图像描述成词频分布。
3. 倒排索引：从词快速查到包含它的图像。
4. 基础矩阵：描述两幅透视图像中对应点的对极约束。
5. 精确率与召回率：分别检查误报和漏报，必须联合解释。

## 四、同时报告召回、误报与单帧耗时

<!-- figure-ref-v6:start:rc-66-figure-4-anchor -->
<span id="rc-66-figure-4"></span>
<!-- figure-ref-v6:end:rc-66-figure-4-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/066-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/066-evidence.png" width="708" height="389" alt="Fig. 4：这是未做几何验证的精确率—召回率曲线，同时改变连续匹配数 k 和处理频率 f" loading="lazy"></a><figcaption>原论文结果图／表摘引：Dorian Gálvez-López、Juan D. Tardós（2012），Fig. 4，PDF 第 5 页；<a href="https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：这是未做几何验证的精确率—召回率曲线，同时改变连续匹配数 k 和处理频率 f。更严格的时间一致性可能过滤错配，也可能漏掉短暂重访；不能把所有曲线差异只归于一个参数。

### 实验设计与公平性

100% 精确率只约束实验中接受的闭环；图中的召回率、几何验证和运行时间仍决定系统实际覆盖多少输入。

| 项目 | 原文设置与需要检查的边界 |
| --- | --- |
| 环境 | 室内、室外及城市图像序列；任务是重访检测，而非控制或导航成功率 |
| 词汇与参数 | 词汇来自独立数据；三个序列选择系统参数，另两个序列评价迁移，见 §VI-A |
| 数据标注 | 依据人工建立的重访时间区间判断正确性；这类真值也需要明确边界 |
| 基线 | SURF 描述子、不同对应搜索方式及 FAB-MAP 2.0；并非所有比较都共享相同图像抽样方式 |
| 预算 | 回放图像、CPU 上计时；不涉及环境交互步数、梯度更新或控制奖励 |
| 指标 | precision 表示报告的闭环有多少正确，recall 表示真值中的闭环机会有多少被发现 |
| 不确定性 | [表 III](https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf#page=6) 的标准差描述查询耗时变化；不能当成多随机种子独立实验的置信区间 |
| 信息条件 | 使用序列时序和局部图像几何；Ford 数据还排除了车体上的特征，见 §VI-F |

值得特别留意的是，算法参数验证集与词汇训练图像不是一回事。基线输入频率、词汇规模、特征类型以及几何验证方式存在差异，因此不能把整个系统对比解释成“只改变二进制描述子”的严格因果消融。

### 五处证据怎样读

1. **[图 2](#rc-66-figure-2) 与[图 3](#rc-66-figure-3)：描述子可靠性。** 比较不同局部表示在闭环检测中的行为，支持 BRIEF 在目标运动条件下可用；图中的旋转、尺度变化案例也暴露它的弱点。不能由若干成功图片推导全视角不变性。

<!-- figure-ref-v6:start:rc-66-figure-2 -->
<figure class="reading-evidence-figure" id="rc-66-figure-2"><a href="/robot-classic/assets/figure-refs-v6/066-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/066-fig-2.png" width="573" height="296" alt="原论文图2：BRIEF、SURF64及U-SURF128的精确率召回率曲线" loading="lazy"></a><figcaption>Dorian Gálvez-López、Juan D. Tardós（2012），图 2，PDF 第 4 页；<a href="https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：同一描述子在不同数据集上的曲线不同，比较时不能混用两组曲线的最好点。
<!-- figure-ref-v6:end:rc-66-figure-2 -->

<!-- figure-ref-v6:start:rc-66-figure-3 -->
<figure class="reading-evidence-figure" id="rc-66-figure-3"><a href="/robot-classic/assets/figure-refs-v6/066-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/066-fig-3.png" width="640" height="741" alt="原论文图3：回环候选影像中的匹配连线及错误对应示例" loading="lazy"></a><figcaption>Dorian Gálvez-López、Juan D. Tardós（2012），图 3，PDF 第 5 页；<a href="https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：蓝色连线是对应关系，仍需几何检验才能成为可靠回环。
<!-- figure-ref-v6:end:rc-66-figure-3 -->

2. **[图 4](#rc-66-figure-4)：时间一致性。** 加入连续查询信息可以排除部分偶然外观相似。其解释是利用序列冗余，而非每张图片单独识别得更准确。要求过长的一致序列，又会漏掉短暂重访。

3. **[表 II](https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf#page=6)：速度与漏检的直接交换。** DI2 的召回率为 56.1%，几何验证中位耗时 0.78 ms；穷举对应为 61.2%、14.17 ms。前者减少计算但损失召回；这里的时间只覆盖几何检查，不是整个系统。

4. **[图 5](#rc-66-figure-5)、[表 III](https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf#page=6)：完整运行成本。** 26292 张 NewCollege 图像对应平均 21.60 ms、最大 51.68 ms。平均值足以说明该配置的吞吐潜力，却不能证明每帧满足 30 Hz 的 33.3 ms 截止时间，更不能直接移植成其他硬件保证。

<!-- figure-ref-v6:start:rc-66-figure-5 -->
<figure class="reading-evidence-figure" id="rc-66-figure-5"><a href="/robot-classic/assets/figure-refs-v6/066-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/066-fig-5.png" width="529" height="280" alt="原论文图5：NewCollege逐图查询中总耗时和各模块耗时曲线" loading="lazy"></a><figcaption>Dorian Gálvez-López、Juan D. Tardós（2012），图 5，PDF 第 6 页；<a href="https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：横轴是图像序号，尖峰展示单次查询波动；不能只报告平均耗时。
<!-- figure-ref-v6:end:rc-66-figure-5 -->

5. **[表 V](https://gaoyichao.com/Xiaotu/papers/2012%20-%20Bags%20of%20Binary%20Words%20for%20Fast%20Place%20Recognition%20in%20Image%20Sequences.pdf#page=7)、VI：迁移及反例。** CityCentre 上本文召回率 30.61%，FAB-MAP 2.0 为 38.77%，两者所报告精确率均为 100%。本文在这个条件下召回较低，不能写成全面超过基线。其他数据集的比较还要看输入采样差异。

这里最重要的实验证据是条件化的系统可用性。论文没有证明只要误报率低，最终 SLAM 地图就一定更好；闭环约束的几何质量、图优化鲁棒性和漏检位置同样影响地图。

## 五、区分有限序列零误报与未来可靠性

作者明确讨论描述子缺乏充分旋转、尺度不变性。我们的进一步分析是：词汇量化、时间筛选和几何验证会叠加召回损失，不能只观察最后的误报数字。仓库里的重复货架可能长期保持相似外观，时间连续性本身也未必能解开混淆。

复现时应锁定论文对应配置，记录图像采样、词汇训练来源、特征截断数量和直接索引层级。后续代码支持的描述子和系统功能不能自动归入本论文证据。若要比较实时性，应同时报告高分位耗时与最坏观测值，而不只给平均数。

## 六、追问：提高几何验证阈值后零误报保持不变，为什么仍不能说检测器没有退步？

<details>
<summary>提高几何验证阈值后零误报保持不变，为什么仍不能说检测器没有退步？</summary>

**参考答案**：更严格验证可能同时丢掉更多真实闭环，零误报没有描述召回变化。应在同一候选集合和数据划分下记录被拒绝的真闭环、总体召回与耗时。阈值的取舍必须与任务需求一起报告。

</details>

## 七、将检索候选变成几何回环

- **模块组合**：[ORB-SLAM：从持续跟踪走向能够重访和恢复的单目地图](082-orbslam.md)。将通过验证的地点候选转成回环约束，仍需几何优化与地图管理。

## 八、自测与参考答案

### 问题 1：倒排索引已经找到候选图像，为什么还需要直接索引？

**答案：** 倒排索引减少要考虑的图像数量，但没有解决候选图像之间哪些局部特征该比较。直接索引利用词汇树对局部特征分组，缩小对应搜索范围，因此加速后续几何验证。它也会遗漏跨分组的真实对应。

### 问题 2：精确率为 100%，是否说明闭环检测问题已经解决？

**答案：** 不是。这只说明所报告实验中接受的闭环没有被真值判为错误，既没有保证未来零误报，也没有说明漏检多少。极端情况下，一个系统只报告最容易的一次闭环也能有很高精确率，因此必须同时看召回率、覆盖条件和标注方式。

### 问题 3：直接索引层级越严格是否一定越好？

**答案：** 不是。严格分组减少特征比较，但受量化误差影响，真实对应可能落入不同叶节点。放宽到共同祖先能提高匹配机会，却提高时间成本。合理层级是针对任务与预算的选择，不能只以最快的几何检查为目标。
