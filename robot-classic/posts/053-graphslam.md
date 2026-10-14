# 053｜GraphSLAM：让整段历史一起解释地图

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](052-anytime-dstar.md) · [下一篇](054-capture-point.md)

**论文**：Sebastian Thrun、Michael Montemerlo，*The GraphSLAM Algorithm with Applications to Large-Scale Mapping of Urban Structures*，IJRR 25(5–6)，2006，403–429。[作者提供的期刊全文](https://robots.stanford.edu/papers/thrun.graphslam.pdf)。

### 先接住前作的问题

[FastSLAM](045-fastslam.md)用有限粒子承担历史轨迹歧义，本篇选择保留历史变量并优化稀疏约束。由此带出的消元与重线性化成本，成为[iSAM](057-isam.md)和[iSAM2](068-isam2.md)继续解决的问题。

## 一、问题设定：回环观测怎样重新分配整段轨迹的误差

机器人绕楼走了一圈，里程计却认为它停在出发点旁边几米处。如果每一步位置都已经固定，最后只能硬接上地图，墙可能变弯、同一扇门出现两次。GraphSLAM 把历史位姿和地标都保留为变量，让新的回环观测重新分配整段轨迹的误差。

### 问题定义：估计当前状态，还是估计整段历史

滤波通常关心当前位姿和地图，把旧位姿边缘化。GraphSLAM 的 full SLAM 目标是整段轨迹 $x_{0:T}$ 与地图 $m$ 的联合后验：

$$p(x_{0:T},m\mid z_{1:T},u_{1:T},c_{1:T}).$$

$u$ 表示运动输入或里程计信息，$z$ 为观测，$c$ 为观测与地标的对应关系。首先假设关联已知，再讨论未知关联。离线意味着允许先收集数据，之后联合求图；不代表数据必须来自某种离线强化学习数据集。

在独立高斯噪声假设下，负对数后验变为加权残差平方和：

$$J=\|r_0\|_{\Omega_0}^2+
\sum_t\|x_t-g(u_t,x_{t-1})\|_{R_t^{-1}}^2+
\sum_{t,i}\|z_t^i-h(x_t,m_{c_t^i})\|_{Q_t^{-1}}^2.$$

这里 $\|e\|_W^2=e^TWe$，$R,Q$ 是相应噪声协方差。协方差越小，约束越“硬”；并非传感器数据多就应该一律具有更大权重。首项锚定参考坐标，解决所有位置和朝向一起变化却不改变相对观测的规范自由度。

它是软约束最小二乘，不是每一条观测必须完全满足。高斯假设让大残差惩罚迅速增长，因此错误回环可能特别有破坏力。一个优化器算得更精确，不会自动识别一条错误对应。

## 二、用稀疏约束建图，再消去地标变量

### 方法：稀疏图从哪里来

运动约束通常只连接相邻两个位姿，地标观测只连接一个位姿与一个地标。虽然轨迹很长，一次观测只涉及少量变量，故线性化后的信息矩阵开始时是稀疏的。信息矩阵的稀疏不代表协方差也稀疏：远距离位置仍可通过图上的路径相关。

在当前估计处将残差展开为 $r+J\delta$，求解增量的正规方程

$$H\delta=b,\qquad H=\sum J^TWJ,\quad b=-\sum J^TWr.$$

这套增量记号是教学重写；原文使用信息矩阵与信息向量直接组织均值更新。加权残差、变量顺序和雅可比必须采用一致约定，角度残差尤其要处理 $2\pi$ 周期，原文第 4 节也特别提醒。

按照轨迹增量与地标增量分块：

$$\begin{bmatrix}H_{xx}&H_{xm}\\H_{mx}&H_{mm}\end{bmatrix}
\begin{bmatrix}\delta x\\\delta m\end{bmatrix}
=\begin{bmatrix}b_x\\b_m\end{bmatrix}.$$

第二行可以解出地标，再代入第一行，得到

$$\widetilde H=H_{xx}-H_{xm}H_{mm}^{-1}H_{mx},\qquad
\widetilde b=b_x-H_{xm}H_{mm}^{-1}b_m.$$

先解 $\widetilde H\delta x=\widetilde b$，再回代

$$\delta m=H_{mm}^{-1}(b_m-H_{mx}\delta x).$$

这个 Schur 补过程解释了“删掉地标，保留地标带来的信息”。某个地标曾被三个时刻看到，消元后这些位姿之间产生新的耦合。只删除地标节点和边而不加新约束，会丢信息，不是 GraphSLAM。

在本篇无地标间直接因子的模型中，$H_{mm}$ 是按地标分块对角的，很多小矩阵可以分别处理。但消元会产生填充；一个地标被许多位姿观察时，会连接很多位姿对。因此原文关于线性代价的直觉依赖局部观测结构，不能推广成任意图拓扑的总优化永远线性复杂度。作者也说明缩减后仍可能有环，集中求解不一定线性。

### 精确消元与近似求解并不矛盾

对已经线性化的高斯问题，Schur 补保持相关边缘分布的信息，是精确代数操作。但此前将非线性观测线性化是近似，之后只运行有限优化步也可能留残差。故“消元精确”不等于“原始非线性 SLAM 已全局精确求解”。

原文在每轮重新线性化、缩减、求解并恢复地标，通常少数轮即可在其场景中收敛。不能把“通常两三轮”变成任意初值的保证。方向初值尤其影响雅可比；长轨迹里程计漂移可能让关联搜索本身先出错。

### 消去一个地标，会在哪些位姿之间长出新边

**教学一维例**有观测 $z_1=m-x_1+\eta_1,z_2=m-x_2+\eta_2$，噪声独立且方差均为 $\sigma^2$。消去未知地标 $m$后，得到 $z_1-z_2=x_2-x_1+(\eta_1-\eta_2)$，方差为 $2\sigma^2$。原来“位姿—地标—位姿”的两个因子，变成一个位姿间约束，不能仍按 $\sigma^2$加权。

若一个地标被十个位姿看到，消元通常在这些位姿之间形成稠密耦合。原始观测局部、信息矩阵稀疏，并不保证任意消元顺序都无填充。这正是后续[iSAM](057-isam.md)与[iSAM2](068-isam2.md)关注增量分解与消元结构的原因。

本篇与[FastSLAM](045-fastslam.md)是后验表示和历史处理的平行路线；它保留可重新调整的轨迹，而非用有限粒子承担历史歧义。[原文第3节](https://robots.stanford.edu/papers/thrun.graphslam.pdf)从高斯观测及运动模型定义整段轨迹后验。大城市地图效果同时依赖关联、初值与GPS等信息，不能把所有精度归于一次线性消元。

消元把共享地标变成位姿间约束，不增加新信息。下面手算一个地标的消元与回代，再读大地图怎样利用这种稀疏组织。

## 三、解位姿系统并回代，用单地标消元验算

```text
输入：全部运动记录、观测、噪声模型，以及初始关联假设
利用运动模型生成初始轨迹，建立初始地标位置
固定坐标参考，保存原始因子
重复直到收敛或预算结束：
    在当前轨迹和地标处计算残差与雅可比
    将运动、观测、可用绝对定位因子累加为稀疏线性系统
    按地标消元，形成只含位姿的 Schur 补系统
    用稀疏线性求解或迭代方法求位姿更新
    回代每个地标的更新，重新评估非线性残差
    若关联未知，依据当前不确定性筛选、验证候选合并
    关联改变时重新建立受影响约束并继续优化
输出：联合轨迹、地图；按需要计算相应不确定性
```

这里把未知关联组织为便于理解的外层步骤。原文[表 10](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=18) 更朴素：尝试地标对，达到阈值就合并并再次求解；作者承认逐对检查、每次合并都重建并不高效，实际实现应更精细。不能把它等同于现代回环识别网络或鲁棒核。

### 自构例子：一个地标怎样变成两帧之间的约束

考虑一维观测 $z_1=m-x_1$、$z_2=m-x_2$。相减得到 $z_1-z_2=x_2-x_1$，未知地标 $m$ 消失，但两次观测仍约束相对位移。若两项观测噪声独立、方差均为 $\sigma^2$，差值方差为 $2\sigma^2$；不能把新约束当成没有噪声。

这个自构例子省略了非线性旋转，说明消元的意义：去掉显式变量，留下它对其他变量的影响。若三帧共用同一地标，产生的相对约束可能相关，也不能随意把所有两两差值当成独立新证据重复计数。

五个前置概念是：**因子图**表达局部观测依赖；**信息矩阵**编码高斯二次项；**规范自由度**表示整体参考系的不确定；**Schur 补**在消去变量后保留其影响；**重新线性化**用更新后的估计改善局部模型。

## 四、读城市地图与GPS案例，分开代数和系统证据

<!-- figure-ref-v6:start:rc-53-figure-6-anchor -->
<span id="rc-53-figure-6"></span>
<!-- figure-ref-v6:end:rc-53-figure-6-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/053-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/053-evidence.png" width="938" height="1641" alt="Fig. 6：上下使用同一室内外数据，下面加入室外 GPS 因子" loading="lazy"></a><figcaption>原论文结果图／表摘引：Sebastian Thrun、Michael Montemerlo（2006），Fig. 6，PDF 第 21 页；<a href="https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=21" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：上下使用同一室内外数据，下面加入室外 GPS 因子。比较道路与建筑轮廓的整体位置变化，才能看出额外绝对约束的作用；这不等于没有 GPS 时地图也具有同样的全局准确度。

### 实验设置：大地图来自怎样的数据

消元公式是标准分块系统的教学重写；原文[表 8](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=16)、9 的符号与数据关联检验需单独辨认，不能因主目标可推导就声称所有排版式都已复证。

| 项目 | 原文范围 | 对结论的意义 |
|---|---|---|
| 平台 | [图 4](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=20) 的 Segway RMP 衍生 Segbot | 同一移动平台收集城市环境数据 |
| 观测 | 扫描激光、运动/惯性信息，以及部分室外 GPS | 多源约束共同决定地图 |
| 地点 | Stanford 校园、Gates 建筑及周边、NASA DART 训练场 | 城市和室内外三维建图 |
| 采集方式 | 多数实验人工驾驶，有时使用 Carmen 自主导航 | 建图结果不等于完全自主探索成功 |
| 数据组织 | 单次大采集或多次采集合并，电池容量限制单次范围 | 多段轨迹可纳入同一图 |
| 主要对照 | 室内独立建图与联合室内外、加入室外 GPS | 信息是否通过轨迹传播进建筑内部 |
| 计算报告 | 扫描匹配可实时；最大数据位姿约束松弛约 30 秒 | 前端与离线后端耗时必须分开 |
| 统计边界 | 地图图示及案例时间，缺少统一轨迹真值误差表 | 支持规模与结构一致性，不支持普遍精度排名 |

<!-- figure-ref-v6:start:rc-53-final-source-gap-note -->
<span id="rc-53-figure-4"></span><span id="rc-53-figure-5"></span><span id="rc-53-figure-7"></span><span id="rc-53-figure-8"></span><p class="figure-reference-note">尚未内嵌：<a href="https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=20" target="_blank" rel="noopener noreferrer">图 4</a>、<a href="https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=20" target="_blank" rel="noopener noreferrer">图 5</a>、<a href="https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=22" target="_blank" rel="noopener noreferrer">图 7</a>、<a href="https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=23" target="_blank" rel="noopener noreferrer">图 8</a>。已展示图模型、信息矩阵、消元机制及室内外约束的地图对照；剩余采集平台/扫描演示和两组大型三维建图展示，暂不将方法图与整套场景视觉结果全部重组。原数据未取得，不能独立重建相同点云。</p>
<!-- figure-ref-v6:end:rc-53-final-source-gap-note -->





第 7 节报告最大区域约 $600\times800$ 米并有约十二个环。摘要和结论用 $10^8$ 级 features，结果段落又写 variables；这些不是八位数独立位姿。真正求解的大块问题已经消去了许多地图量，不能误读成直接对一亿维稠密矩阵求逆。

GPS 是实验使用的信息来源，不是只用于评价的真值。若将该结果与纯激光或纯里程计方法比较，必须明确这个额外约束。建筑室内即便收不到 GPS，也可能通过相邻室外位姿和回环获得间接约束。

### 五处证据：从代数机制到城市地图

**[图 1](#rc-53-figure-1)–[图 2](#rc-53-figure-2)，第 407–408 页：局部因子与矩阵结构。** 图把相邻位姿边、观测边和非零信息块对应起来。这解释稀疏性的来源，不证明信息矩阵逆也是稀疏，更不证明整个优化没有填充。

<!-- figure-ref-v6:start:rc-53-figure-1 -->
<figure class="reading-evidence-figure" id="rc-53-figure-1"><a href="/robot-classic/assets/figure-refs-v6/053-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/053-figure-1.png" width="820" height="471" alt="原论文 Figure 1：位姿、地标与非线性约束构成的GraphSLAM图" loading="lazy"></a><figcaption>原论文图摘引：Thrun、Montemerlo（2006），Figure 1，PDF 第 5 页；<a href="https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：三角节点是位姿、星形节点是地标，实边和虚边分别连接运动及观测约束；下方总成本由这些局部约束共同组成。
<!-- figure-ref-v6:end:rc-53-figure-1 -->

<!-- figure-ref-v6:start:rc-53-figure-2 -->
<figure class="reading-evidence-figure" id="rc-53-figure-2"><a href="/robot-classic/assets/figure-refs-v6/053-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/053-figure-2.png" width="696" height="1107" alt="原论文 Figure 2：观测及运动因子对信息矩阵块的贡献" loading="lazy"></a><figcaption>原论文图摘引：Thrun、Montemerlo（2006），Figure 2，PDF 第 6 页；<a href="https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：三个面板将左侧图关系对应到右侧矩阵阴影；增加观测或运动边会填入关联变量的块，而不是无差别改变所有元素。
<!-- figure-ref-v6:end:rc-53-figure-2 -->

**[图 3](#rc-53-figure-3)、[表 3](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=12)及[表 7](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=15)，第 409、414、417 页：地标消元。** 地标被移除后新增位姿链接，Schur 补保持线性高斯问题的边缘信息。图中的“缩减”不是简单稀疏化，也不是随意丢弃低权重边；两者的精度性质不同。

<!-- figure-ref-v6:start:rc-53-figure-3 -->
<figure class="reading-evidence-figure" id="rc-53-figure-3"><a href="/robot-classic/assets/figure-refs-v6/053-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/053-figure-3.png" width="752" height="1081" alt="原论文 Figure 3：消去地标后的位姿图与填充项" loading="lazy"></a><figcaption>原论文图摘引：Thrun、Montemerlo（2006），Figure 3，PDF 第 7 页；<a href="https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：从上到下消去地标时，原先共同观测地标的位姿之间形成新约束；最终只剩位姿变量，但矩阵的连接会比原来稠密。
<!-- figure-ref-v6:end:rc-53-figure-3 -->

**[图 4–5](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=20)，第 422 页：采集与地形展示。** 扫描着色区分地面、障碍和高处结构，说明系统可生成适合地形分析的空间数据。但图中的颜色不是独立分割基准的准确率，也不能从漂亮点云推导运动轨迹误差。

**[图 6](#rc-53-figure-6)，第 423 页：室外信息改善室内形状。** 联合室内外建图后，建筑内部的直角结构更接近已知形状。它支持约束通过图传播的作用；原文没有以独立测量的逐点误差表证明全部室内区域都提高了某个百分比。

**[图 7](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=22)–[图 8](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=23)及第 7 节，第 424–425 页：规模和后端时间。** 校园地图、建筑周边及灾害训练场展示较大三维结构；约 30 秒是位姿约束松弛阶段，不能当作包含采集、扫描匹配、所有关联和渲染的总耗时。多次采集和 GPS 都参与其中，结论必须保留这些条件。

## 五、检查线性化、初值、关联错误与批量存储

### 公式阅读中的具体边界

以标准信息形式 $p(y)\propto\exp(-\tfrac12y^T\Omega y+\xi^Ty)$ 为约定，固定另一组变量后的信息向量应从交叉项推导，例如 $\xi_x-\Omega_{xy}y$。[表 8](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=16) 和部分回代式的解析文本显示加号，它与这一约定不符，但仍需视觉核对原页，以排除解析造成的符号差异。上面用分块方程推导的回代明确保留减号。

同样，地标差 $d=m_j-m_k$ 的协方差应按线性随机变量变换计算：若 $D=[I,-I]$，则 $\Sigma_d=D\Sigma_{jk}D^T$，需要时再求信息矩阵。直接把信息矩阵以同样形式相乘通常不等价。[表 9](https://robots.stanford.edu/papers/thrun.graphslam.pdf#page=18) 和第 6.2 节的解析文本呈现后一种形式；其原页符号尚待视觉确认。这里采用前述可独立推导的协方差变换，而不把尚未核实的文本表达作为实现依据。

还有一个概率语言问题：连续高斯变量恰好等于零的概率为零，在零点计算的是密度；把密度作为关联分数不意味着得到校准的“两个地标相同的概率”。这是数学解释上的区分，不是已经验证其公开实现存在错误。实际关联仍需要观测模型、先验和阈值定义。

### 贡献、代价与失败边界

第 8 节承认高斯独立噪声并不准确。连续激光点、相邻扫描或同一标定误差会产生相关性，若全部当独立，信息可能过强。人工放大协方差是一种缓解，但作者也承认它较经验化。

初始轨迹与贪心关联是另一条失败链：初值漂移导致误关联，误关联又把地图拉向错误极小值。保存全部历史为重新解释提供了机会，却没有自动消除这种反馈。大地图也不意味着泛化性强；长期变化、动态物体与错误回环需要后续机制。

## 六、追问：地标消元后图里出现新的位姿连接，是否代表新增了传感器观测？

<details>
<summary>地标消元后图里出现新的位姿连接，是否代表新增了传感器观测？</summary>

**参考答案**：不是。新连接是已有观测经过代数消元后的约束表达，信息来源没有增加。应在同一线性化与消元条件下比较两种系统，检查回代结果，而不能把更多边当作更多独立数据。非线性重线性化与近似求解还须另行说明。

</details>

## 七、从历史稀疏图走向增量分解

- **模块组合**：[iSAM：保留历史，也能增量求解](057-isam.md)。增量更新平方根系统，减少重复分解。
- **模块组合**：[iSAM2：把不断增长的SLAM问题变成局部树更新](068-isam2.md)。用Bayes tree进一步管理受影响结构与非线性更新。

## 八、自测与参考答案

**1．消去地标之后，为什么不能只删掉它对应的矩阵行列？**

直接删除相当于丢弃它与其他变量的耦合或采用不同条件化处理，不能保留原来的边缘问题。Schur 补通过新增位姿间耦合，保存了共同观测地标带来的约束。它的代价是可能产生更多非零块。

**2．信息矩阵稀疏，是否表示相距很远的两段轨迹独立？**

不表示。稀疏描述局部直接因子，统计相关性可以经中间变量传播；协方差往往是稠密的。室外 GPS 能改善室内地图，正体现这种间接联系。

**3．图优化已经收敛且残差很小，为什么地图仍可能错？**

收敛只说明在当前因子、权重、关联和初值附近得到稳定解。错误回环、相关噪声重复计数或标定偏差可能让错误几何也得到小目标值。应检查独立真值或留出观测、残差分布和关联可靠性，而不是只看求解器停止标志。


