# 023｜Harris：一个小矩阵，解释为什么角点适合跟踪

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](022-gilbert-distance.md) · [下一篇](024-hand-eye.md)

**论文**：Chris Harris、Mike Stephens，*A Combined Corner and Edge Detector*，1988，Alvey Vision Conference。[原始论文与书目](https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.html) · [全文](https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf)。官方目录使用 23.1–23.6，扫描正文印刷页码为 147–152，以下采用正文页码。

### 先接住前作的问题

离散方向角点测试与断裂边缘难以稳定提供跟踪线索，Harris改用连续局部二次型并考虑边角连接。它与[LK](008-lucas-kanade.md)有信息矩阵上的教学联系。

## 一、问题设定：局部图像怎样区分平坦区域、边和角点

摄像头看到一面没有纹理的墙，很难判断它移动了多少；看到一条长直边，只容易判断垂直于边的移动；看到窗框拐角，两个方向的位移都比较容易辨认。Harris 的核心思想就是把这种直觉写成一个二维二次型。

### 背景：机器人需要可以反复认出的局部证据

这里的角点与边缘图评价视觉前端；匹配相机运动还需要对应、几何验证与尺度，不能把角点检测图当作完整里程计结果。

这是确定性视觉算法，不涉及策略、奖励或强化学习训练。输入是一幅灰度图，输出是角点、边缘以及可选的连接关系。对机器人而言，后续可以据此跟踪、匹配和估计运动；这些后续任务的精度不能直接归功于角点检测器。

原文从移动单目摄像头观察道路、建筑和植被出发。直线片段对复杂自然纹理并不总是稳定，曲线参数化也可能病态。另一条路线是保留能够可靠定位的点，同时利用边缘表达它们的连接。论文第 148 页讨论的灌木图像尤其说明：一条边是否越过阈值，会影响整段连接结构。

其关键假设是局部图像在微小平移下可以做一阶近似，梯度能代表主要变化。它没有假设角点一定对应物体的真实三维几何角；纹理交叉、孤立亮点同样可能产生较强响应。“角点”在这里首先是一种局部图像性质。

## 二、把微小平移后的灰度变化写成结构张量

### 方法：从移动窗口到结构张量

设像素位置为 $p$，微小位移为 $d=(d_x,d_y)^T$，窗口权重为 $w(p)$。定义平移前后的加权平方差：

$$E(d)=\sum_p w(p)[I(p+d)-I(p)]^2.$$

使用 $I(p+d)-I(p)\approx\nabla I(p)^Td$，得到

$$E(d)\approx d^TMd,\qquad M=\sum_p w(p)\begin{bmatrix}I_x^2&I_xI_y\\I_xI_y&I_y^2\end{bmatrix}.$$

$I_x,I_y$ 是水平和竖直梯度。矩阵 $M$ 汇总窗口里所有梯度方向，现代资料常称它为结构张量或二阶矩矩阵。它并不是图像二阶导数构成的 Hessian；这里先求一阶梯度，再求外积和局部平均。

设特征值为 $\lambda_1,\lambda_2\ge0$。两者都小意味着移动后变化都小；一大一小意味着存在不敏感方向；两者都大意味着所有方向都比较敏感。于是一个角点必须有两个方向的信息，单纯“梯度很强”并不够。

Moravec 只考察有限几个离散位移方向。Harris 用连续局部近似减少方向偏置，用平滑窗口替代二值矩形窗口，最后通过

$$R=\det M-k(\operatorname{tr}M)^2=\lambda_1\lambda_2-k(\lambda_1+\lambda_2)^2$$

给出响应，无须逐像素显式求特征值。$k$ 调节对强烈各向异性结构的惩罚；原稿可读正文没有给出可通用于所有实验的固定数值，因此不把常见实现默认值当作论文设置。

要区分三个层面：$E$ 是解释局部位移敏感性的数学量；$R$ 是特征选择准则，不是训练损失；实验考察的是输出特征与连接的稳定性，而非最小化 $R$ 后的机器人回报。

响应的正负只给出粗分类，不能代替条件数。令 $\lambda_1\ge\lambda_2>0$，记比值 $\rho=\lambda_1/\lambda_2$，则

$$R=\lambda_2^2[\rho-k(\rho+1)^2].$$

因此固定 $k$ 后，分类边界由特征值比例决定，但响应幅值还取决于整体梯度能量。原创检查取 $k=0.04,M=\operatorname{diag}(20,1)$，响应 $R=20-0.04\times21^2=2.36>0$，然而两个方向的信息量相差20倍。正响应不等于“各方向同样好”，还需响应阈值、最弱特征值或应用相关诊断。

这与[Lucas–Kanade](008-lucas-kanade.md)的联系可以再走一步。在梯度固定、独立等方差光度噪声、等权且线性化有效的简化模型下，位移最小二乘的协方差近似为 $\sigma_r^2M^{-1}$，其中 $\sigma_r^2$ 是残差噪声方差。上例若 $\sigma_r^2=1$，两方向方差为0.05与1。增加一百个同方向梯度可能继续减小第一项，却不能取代第二方向的纹理。这是教学统计解释，并非1988论文已报告的跟踪方差实验。

结构张量把局部平移响应变成两个方向的量。手算例子将分别放大一个和两个特征值，检查边缘与角点判别，而不把高响应误当匹配成功。

## 三、计算角点响应，用两个特征值检查方向信息

```text
输入：灰度图 I，平滑窗口 w，响应参数 k，阈值
计算水平与竖直梯度 Ix、Iy
局部加权平均 Ix²、Iy²、IxIy，组成每个像素的 M
计算 trace、det 与 R = det - k × trace²
用 trace 排除变化很小的平坦区域
在角点区域保留 R 的八邻域局部最大值
在边缘区域沿适当方向细化负响应
可选：双阈值连接、删除短枝、补小断裂，连接边与角点
输出：角点集合，以及可选的边—顶点图
```

这是教学流程。第 150–151 页分别说明局部极大值选择、边缘细化和后续连接；“只调用一个角点函数”省略了原文希望建立图结构的后半部分。

### 一个可以手算的小例子

以下为自构例子，取 $k=0.04$ 仅便于算数。边缘窗口的矩阵为 $M_1=\operatorname{diag}(100,1)$，则 $R_1=100-0.04\times101^2=-308.04$。角点窗口为 $M_2=\operatorname{diag}(50,50)$，则 $R_2=2500-0.04\times100^2=2100$。

两个窗口的总梯度能量几乎相同，但只有第二个能同时约束两个方向。若相机沿第一幅窗口的弱方向移动，图像几乎不变，估计误差会被放大。这个例子解释了响应惩罚项的必要性，也说明不能仅凭梯度总量选择跟踪点。

五个前置概念：**图像梯度**表示灰度变化方向；**泰勒展开**用局部线性近似解释微小位移；**二次型**把方向映射为变化强度；**特征值**表示主方向的信息量；**非极大值抑制**从一片高响应中选出离散位置。

## 四、读边角连接图，限制可视化比较的结论


<!-- figure-ref-v6:start:rc-23-figure-4-anchor -->
<span id="rc-23-figure-4"></span>
<!-- figure-ref-v6:end:rc-23-figure-4-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/023-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/023-evidence.png" width="726" height="879" alt="Fig. 4：四个面板使用同一测试图案，比较角点算子在曲线、轮廓和细节附近的响应分布" loading="lazy"></a><figcaption>原论文结果图／表摘引：Chris Harris、Mike Stephens（1988），Fig. 4，PDF 第 3 页；<a href="https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=3" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：四个面板使用同一测试图案，比较角点算子在曲线、轮廓和细节附近的响应分布。它是受控输入下的定性对照，不能读成数据集上的准确率排名。

| 项目 | 原文设置与证据边界 |
|---|---|
| 输入任务 | 测试图和户外序列的两幅图像；[图 1](https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=1) 给出自然场景 |
| 对照 | [图 4](#rc-23-figure-4) 对比 Moravec、Beaudet、Kitchen–Rosenfeld 和本文结果；[图 2–3](#rc-23-figure-2) 展示 Canny 边缘处理 |
| 数据规模 | 以展示图像为主，没有独立划分的大型训练集与测试集 |
| 训练预算 | 不适用：没有学习参数的训练过程；运行耗时与统一硬件对照未报告 |
| 指标 | 主要为角点分布、边缘连接和跨图像可匹配性的定性观察 |
| 重复与不确定性 | 未报告随机种子、重复运行统计或置信区间 |
| 假设 | 统一检测能改善角点与边缘的连接，连续方向分析可避免离散方向的部分缺陷 |

<!-- figure-ref-v6:start:rc-23-final-source-gap-note -->
<span id="rc-23-figure-1"></span><span id="rc-23-figure-6"></span><span id="rc-23-figure-7"></span><p class="figure-reference-note">尚未内嵌：<a href="https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=1" target="_blank" rel="noopener noreferrer">图 1</a>、<a href="https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=4" target="_blank" rel="noopener noreferrer">图 6</a>、<a href="https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=5" target="_blank" rel="noopener noreferrer">图 7</a>。已摘引 Canny 连接前后与检测器对照，并独立重绘特征值响应机制；尚缺的是原始户外双帧及初步/最终特征连接输出。继续加入会连同输入和完整输出链重现该短文的主要影像表达，且原文另列 HMSO 灰度影像权利。当前保留三项入口，属于具体累计影像范围的编辑判断，并非版权标记自动禁止摘引。</p>
<!-- figure-ref-v6:end:rc-23-final-source-gap-note -->





<!-- figure-ref-v6:start:rc-23-figure-3-reviewed -->
<figure class="reading-evidence-figure" id="rc-23-figure-3"><a href="/robot-classic/assets/figure-refs-v6/023-fig-3-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/023-fig-3-reviewed.png" width="1210" height="593" alt="同两帧室外场景的连接后Canny边缘双面板" loading="lazy"></a><figcaption>原论文图摘引：Chris Harris、Mike Stephens（1988）; original independently generated diagram in this article, no source pixels or tracing.，图 3，PDF 第 2 页；<a href="https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=2" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。 原论文©The Plessey Company plc（1988）；原影像另署©Controller HMSO, London（1988）。点击图片可放大。</figcaption></figure>

读图：连接后保留的主轮廓与短枝条仍不完全一致；这张与前一张形成必要的处理前后对照，并不证明角点也能在任意场景中保持稳定。
<!-- figure-ref-v6:end:rc-23-figure-3-reviewed -->


<!-- figure-ref-v6:start:rc-23-figure-2-reviewed -->
<figure class="reading-evidence-figure" id="rc-23-figure-2"><a href="/robot-classic/assets/figure-refs-v6/023-fig-2-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/023-fig-2-reviewed.png" width="1207" height="589" alt="两帧室外场景的未连接Canny边缘双面板" loading="lazy"></a><figcaption>原论文图摘引：Chris Harris、Mike Stephens（1988）; original independently generated diagram in this article, no source pixels or tracing.，图 2，PDF 第 2 页；<a href="https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=2" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。 原论文©The Plessey Company plc（1988）；原影像另署©Controller HMSO, London（1988）。点击图片可放大。</figcaption></figure>

读图：两帧中的灌木细边缘变化明显；这对结果是作者质疑仅靠边缘维持稳定拓扑的具体视觉证据。
<!-- figure-ref-v6:end:rc-23-figure-2-reviewed -->








<!-- figure-ref-v6:start:rc-23-links-97 -->
本页定位：[图 4内嵌图](#rc-23-figure-4)。
<!-- figure-ref-v6:end:rc-23-links-97 -->

四组证据分别回答不同问题。第一，**[图 2–3](#rc-23-figure-2)，第 148 页**：比较连接前后的 Canny 边缘，显示植被区域的连接不稳定；它解释问题来源，不能证明所有边缘检测器都会如此。第二，**[图 4](#rc-23-figure-4)，第 149 页及第 151 页解释**：几种算子在同一测试图上的角点输出有区别；这是具体输入下的行为比较，没有量化全数据集排名。

<!-- figure-ref-v6:start:rc-23-links-99 -->
本页定位：[图 4内嵌图](#rc-23-figure-4) · [图 2缺口说明](#rc-23-figure-2) · [图 3缺口说明](#rc-23-figure-3)。
<!-- figure-ref-v6:end:rc-23-links-99 -->

第三，**[图 5](#rc-23-figure-5)，第 150 页**：在特征值平面画出区域与等响应线，直接连接公式和分类机制。这属于数学解释图，不是性能实验。第四，**[图 6](https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=4)–[图 7](https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=5)，第 150–151 页**：从初始分类到完整连接图，展示点与边的组合；作者称不少特征能够直接匹配，同时承认交点补全仍较初步，自适应阈值仍需研究。

<!-- figure-ref-v6:start:rc-23-figure-5 -->
<figure class="reading-evidence-figure" id="rc-23-figure-5"><a href="/robot-classic/assets/figure-refs-v6/023-fig-5-redraw.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/023-fig-5-redraw.png" width="2268" height="1422" alt="对应Harris原图5的独立计算图：特征值平面中的平坦、边缘与角点区域，以及Harris响应等值线" loading="lazy"></a><figcaption>Chris Harris、Mike Stephens（1988），对应原图 5 的独立公式计算与机制重绘（非原图转载），原图见 PDF 第 4 页（印刷第 150 页）；<a href="https://www.bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。</figcaption></figure>

读图：灰色区域先由 trace(M)<2 排除；其余区域再按 R 的正负分类，粗深线为 R=0，细线为等响应线。这里自行选择 k=0.04、平坦阈值2与两个特征值0至6的范围，原文未给出统一的这些参数；网格为601×601。A、B、C的数值直接代入原响应公式，显示正R的低能量点也可被平坦阈值排除。它对应原图5的区域划分和等响应线机制，不是对原图曲线描摹，也不是原论文影像实验结果。
<!-- figure-ref-v6:end:rc-23-figure-5 -->





论文没有给出足以计算总体绝对提升或相对提升的统一数字。把这些图改写成“跟踪准确率提升多少”会混淆可视化论证与量化基准。原稿也没有将平滑窗口、响应形式、连接后处理逐项做严格消融，因此不能由最终图单独断定每个组件的独立贡献。

## 五、检查尺度、阈值、光照与真实对应

最有生命力的贡献，是把“局部可定位性”归结为矩阵的两个方向。这个思路与 Lucas–Kanade 很自然地衔接：前者选择信息充分的位置，后者在位置附近解位移。两者共享局部梯度的几何解释，但检测好角点不等于完成匹配，重复纹理仍可能把一个角点配到错误位置。

以下是从公式得出的分析，而非论文基准结论。若亮度整体增加常数，梯度不变；若对比度乘 $a$，则 $M$ 乘 $a^2$、$R$ 乘 $a^4$。因此特征值比例保留，但固定数值阈值可能让角点出现或消失。旋转下二次型的特征值具有不变性，也不意味着离散采样、滤波和阈值后能做到完美旋转重复检测。

尺度变化是另一边界：小窗口中的角点放大后，局部可能只剩一段边；视角变化、遮挡和运动模糊也改变局部结构。后来的尺度空间、描述子和几何验证解决的是不同层次的问题，不能把它们追溯为这篇六页论文已经实现的功能。

## 六、追问：若要验证角点重复性，为什么只数每张图检测到多少点不够？

<details>
<summary>若要验证角点重复性，为什么只数每张图检测到多少点不够？</summary>

**参考答案**：数量相同并不说明检测的是同一物理位置，也不说明这些点适合跟踪。应在已知图像关系下检查位置是否对应，并固定阈值、尺度及光度条件。原文的检测与连接可视化支持局部结构描述，不能被角点总数替代为完整匹配正确性的证据。

</details>

## 七、从角点检测走向跟踪质量监控

- **直接继承**：[Shi–Tomasi：好角点为什么仍然可能是坏特征](033-good-features.md)。按跟踪求解条件选择窗口，并增加跨帧质量监控。

## 八、自测与参考答案

**问题1：一条高对比度直线为什么可能比一个较弱的角点更不适合估计二维位移？**

答：直线梯度大多平行，矩阵只有一个强方向。沿边平移几乎不改变图像，导致另一个方向的信息不足。较弱角点只要两个特征值都足够大，就能约束两个分量。关键是最弱方向的信息，而不只是总能量。

**问题2：把所有像素灰度乘二，原来的角点会严格保持不变吗？**

答：梯度乘二、矩阵乘四、响应乘十六。忽略饱和和量化时，响应排序与特征值比例保留；但固定阈值会改变通过筛选的集合。因此几何分类的比例性质与最终检测集合的不变性不同。

**问题3：Harris 响应很高，能否直接证明一个匹配是正确的？**

答：不能。高响应说明局部平移通常可辨识，但没有判断两个不同图像位置是否对应同一物理点。棋盘重复角点都可能高响应，仍需描述、搜索约束和几何一致性检验。检测信息充足与对应关系正确是两个问题。
