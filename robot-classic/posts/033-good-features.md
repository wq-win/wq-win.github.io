# 033｜Shi–Tomasi：好角点为什么仍然可能是坏特征

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](032-dstar.md) · [下一篇](034-force-closure.md)

**论文**：Jianbo Shi、Carlo Tomasi，*Good Features to Track*，CVPR 1994，593–600。[作者机构入口](https://publications.ri.cmu.edu/good-features-to-track) · [会议原文](https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf) · [作者上传全文](https://www.researchgate.net/publication/2239823_Good_Features_to_Track)。相关 Cornell 技术报告已有 1993 年版本；下文以 1994 年会议稿的章节和图号为准。

### 先接住前作的问题

[Lucas–Kanade](008-lucas-kanade.md)给出局部跟踪方程，但不是每个窗口都能稳定解它。本篇据此选点并持续监控。

## 一、问题设定：适合求位移的窗口怎样在跟踪中继续保持可信

画面中两根不同深度的树枝交叉，形成一个漂亮角点。相机移动后，交叉位置会滑动，它并不是世界里一个固定的实体点。单张图像上的“角点强度很高”无法解决这个问题。

### 背景与问题：先问跟踪器需要什么

输入是图像序列与一组局部窗口，输出是窗口中心随时间的二维位置，以及该轨迹是否仍可信。它属于视觉前端，不直接估计完整机器人状态，也不学习控制策略。窗口越界、无法求解或质量失效可以结束一条轨迹，但这不是强化学习中的任务终止。

Lucas–Kanade 式方法通过局部亮度差求位移。平坦墙面没有足够梯度，沿直线边缘的切向运动又难以区分，这就是孔径问题。Harris 已用梯度二阶矩阵描述局部形状；本文更直接从跟踪器线性方程的可解性推导选择准则。

还有另一个独立问题：一个窗口即使数值上容易匹配，也可能跨越多个运动层、包含高光，或者后来被遮住。选点只检查当前局部信息；可靠长轨迹还需要持续检查。把整篇文章缩成“把 Harris 响应换成最小特征值”，会漏掉后一半思想。

## 二、按最小特征值选点，再用仿射残差监控

### 方法一：用最弱方向决定是否值得追踪

设参考图为 $I$，当前图为 $J$，窗口坐标为 $x$，权重为 $w(x)$。平移位移 $d$ 的目标为

$$
E(d)=\sum_{x\in W}w(x)[J(x+d)-I(x)]^2.
$$

线性化后，位移增量需要求解 $Z\Delta d=b$，其中

$$
Z=\sum_{x\in W}w(x)\nabla J(x)\nabla J(x)^T.
$$

$Z$ 是二维对称半正定矩阵。若一个特征值很小，该方向的位移很容易被噪声扰动；若两个都小，几乎任何微小位移都难以辨别。第 4 节因此要求

$$
\min(\lambda_1,\lambda_2)>\lambda_{\text{threshold}}.
$$

这个准则同时关心最弱方向有没有足够信号，不只是条件数。比如 $Z=0.001I$ 条件数等于 1，却仍然几乎没有纹理。相反，两个特征值都很大时，即使不完全相等，也可能获得足够精度。

Harris 的 $\det Z-k(\operatorname{tr}Z)^2$ 与最小特征值都使用同一类局部信息，但响应排序和阈值含义不同。本文的“optimal by construction”应理解为针对所采用跟踪模型与数值判据的设计，不是所有视觉任务的特征集合全局最优定理。

### 方法二：追踪时简单，检查时允许形变

连续两帧运动较小时，拟合二维平移通常稳定。若每个小窗口都拟合六个参数，窗口内形变信号可能不足，额外自由度容易响应噪声。可是隔了很多帧之后，真实特征可能已经旋转、缩放或剪切，纯平移无法解释累计变化。

仿射监控使用

$$
E(A,d)=\sum_{x\in W}w(x)[J(Ax+d)-I_0(x)]^2,
$$

其中 $I_0$ 是首次观测该特征的模板，$A$ 为 $2\times2$ 形变矩阵，$d$ 为平移。论文第 3 节给出六参数迭代线性系统，第 5 节把对齐后的差异用于监控。一个真实标志牌变大，仿射模型可以解释；被前景物体挡住之后，即使允许形变，也难与旧模板一致。

计算位移与判断外观是否可解释，是两个不同用途。第 4 节还指出，监控并不要求所有形变参数都准确可观测：若某个方向变化几乎不影响图像，可用伪逆选择最小范数解。不能把一个低残差仿射拟合的每项参数都当作高精度运动测量。

**优化目标**是局部光度残差；**算法机制**是最弱方向选点和两种运动模型分工；**实验改善**是匹配稳定性和坏特征分离。残差变小不直接等于 SLAM 轨迹误差更小，因为后端还依赖特征空间分布、深度和数据关联。

### 把角点分数翻译成位移误差的量级

将窗口梯度逐行组成矩阵 $A$，时间亮度差组成 $b$，待估二维位移记为 $d$。在线性光度模型 $b=A d+\eta$、独立同方差像素残差 $\operatorname{Cov}(\eta)=\sigma^2I$ 下，最小二乘位移有近似协方差 $\sigma^2(A^TA)^{-1}$。其中正规矩阵 $Z=A^TA$必须可逆；因此最小特征值控制最大的位移方差。**教学例**令 $Z=\operatorname{diag}(100,4)$、$\sigma^2=1$，两方向标准差约0.1和0.5像素；改为 $Z=\operatorname{diag}(100,25)$，最弱方向标准差降为0.2像素。分数与误差的联系来自模型，而非“越像拐角越好”的外观判断。

这一推导不包含遮挡、反光与亮度变化的偏差。它们可能使两个特征值都大而跟踪仍然错，所以[原文第4–5节](https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf)同时讨论最小特征值选点和仿射差异监控，而非仅提出一个角点算子。实验中坏特征分离与小位移精度应分别评价。

[Lucas–Kanade](008-lucas-kanade.md)是直接的方法继承：沿用局部光度线性化，再反过来挑适合该求解器的点。[Harris](023-harris.md)是同一结构张量上的平行判据；[VINS-Mono](092-vinsmono.md)可把这类跟踪结果作为前端模块，但局部纹理强不等于整套视觉惯性系统可观测。

最小特征值保证局部位移求解的条件，仿射监控检验后续外观是否仍可信。下面把两道检查放进跟踪流程，避免只用最初的角点强度解释整段轨迹。

## 三、实现平移跟踪与模板检查，识别外观破坏

下面是机制级教学伪代码，阈值和迭代上限属于实现选择：

```text
输入：图像序列、窗口尺寸、纹理与监控阈值
在首帧各候选窗口计算梯度二阶矩阵
保留最小特征值足够大的窗口，抑制相互重叠
保存每个窗口的首帧模板
对每张新图：
    用相邻帧的纯平移迭代，更新窗口中心
    若求解失效或窗口越界，结束轨迹
    将当前窗口与首帧模板做仿射对齐
    计算对齐后的光度差异
    差异过大或持续异常时标记并丢弃该轨迹
输出：轨迹与质量状态
```

### 一个教学例子与五个前置概念

**自构例子：**窗口 A 是竖直条纹，$Z$ 的特征值为 $(100,0.1)$；窗口 B 是清楚的棋盘交点，为 $(30,25)$。虽然 A 的总梯度更大，它沿条纹方向的运动仍难确定，B 的最弱方向明显更可靠。若 B 恰是两个不同深度物体的投影交叉，初次可跟踪并不能消除长期物理不一致。

五个前置概念：**亮度一致性**假定对应表面点的强度近似不变；**孔径问题**指单方向纹理难确定完整位移；**二阶矩阵**汇总窗口内梯度方向与强度；**仿射变换**用线性变形加平移近似局部运动；**混叠**使低于采样分辨率的纹理产生不稳定外观。

## 四、读序列对照，分开正常形变与错误特征


<!-- figure-ref-v6:start:rc-33-figure-15-anchor -->
<span id="rc-33-figure-15"></span>
<!-- figure-ref-v6:end:rc-33-figure-15-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/033-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/033-evidence.png" width="744" height="516" alt="Fig. 15：多数曲线留在低差异带，若干特征的残差明显升高" loading="lazy"></a><figcaption>原论文结果图／表摘引：Jianbo Shi、Carlo Tomasi（1994），Fig. 15，PDF 第 7 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：多数曲线留在低差异带，若干特征的残差明显升高。仿射补偿先解释正常形变，再把异常轨迹凸显出来；高残差可以报警，低残差却不能证明对应必然正确。

### 实验设置与对照

图像窗口、仿射残差和特征淘汰要连起来看；强纹理只保证局部数值条件，不能独自保证长时间对应正确。

| 实验 | 任务与数据 | 对照与指标 | 预算及边界 |
|---|---|---|---|
| 电影片段 | 标志牌与被遮挡窗口 | 纯平移、仿射监控的差异曲线 | [图 1–5](https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=4)；不是大型标注视频基准 |
| 合成配准 | 四个圆斑、三种仿射变化及高斯噪声 | 真实与估计平移、形变误差 | 第 6 节；噪声标准差为最大强度的 16% |
| 复杂图像与错误配对 | 硬币图像、圆斑匹配十字 | 收敛过程与残差能否保持较高 | [图 8](#rc-33-figure-8)–[图 9](#rc-33-figure-9)；没有普遍收敛域保证 |
| 相机前进序列 | 26 帧，Pulnix 相机、16 mm 镜头，每帧前进 2 mm | 102 个不重叠初始窗口的监控曲线 | 第 7 节；窗口 25×25 像素 |
| 统计报告 | 以上示例与曲线 | 没有汇总的多种子均值和置信区间 | 不足以量化任意场景的误检率 |

<!-- figure-ref-v6:start:rc-33-final-source-gap-note -->
<span id="rc-33-figure-1"></span><span id="rc-33-figure-2"></span><span id="rc-33-figure-4"></span><span id="rc-33-figure-5"></span><p class="figure-reference-note">尚未内嵌：<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=4" target="_blank" rel="noopener noreferrer">图 1</a>、<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=4" target="_blank" rel="noopener noreferrer">图 2</a>、<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=4" target="_blank" rel="noopener noreferrer">图 4</a>、<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=4" target="_blank" rel="noopener noreferrer">图 5</a>。剩余四幅含《Manhattan》电影帧及其技术处理局部，属于论文之外的影像来源；当前已展示作者桌面实验拼图、合成实验和定量曲线，不再将两组电影序列成套加入。论文公开下载并不能说明电影画面的再利用条件；这不是对单幅必要评论摘引的绝对禁止判断。</p>
<!-- figure-ref-v6:end:rc-33-final-source-gap-note -->









<!-- figure-ref-v6:start:rc-33-figure-3 -->
<figure class="reading-evidence-figure" id="rc-33-figure-3"><a href="/robot-classic/assets/figure-refs-v6/033-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/033-fig-3.png" width="543" height="429" alt="图3：两段特征窗口在纯平移与仿射模型下的不相似度曲线" loading="lazy"></a><figcaption>Jianbo Shi、Carlo Tomasi（1994），图 3，PDF 第 4 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/033-fig-3.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：虚线为纯平移、实线为仿射模型；同一特征必须对应同一种点标记，才能区分形变建模带来的下降和遮挡造成的升高。
<!-- figure-ref-v6:end:rc-33-figure-3 -->





<!-- figure-ref-v6:start:rc-33-figure-8 -->
<figure class="reading-evidence-figure" id="rc-33-figure-8"><a href="/robot-classic/assets/figure-refs-v6/033-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/033-fig-8.png" width="553" height="185" alt="图8：硬币纹理的仿射跟踪过程及误差与参数轨迹" loading="lazy"></a><figcaption>Jianbo Shi、Carlo Tomasi（1994），图 8，PDF 第 5 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/033-fig-8.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：上排展示局部图像逐步对齐，下排与图7同类地显示误差和参数变化；纹理更复杂并不改变所拟合的仿射模型。
<!-- figure-ref-v6:end:rc-33-figure-8 -->

<!-- figure-ref-v6:start:rc-33-figure-9 -->
<figure class="reading-evidence-figure" id="rc-33-figure-9"><a href="/robot-classic/assets/figure-refs-v6/033-fig-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/033-fig-9.png" width="557" height="256" alt="图9：四个亮斑错误匹配十字目标时的迭代图像与残差" loading="lazy"></a><figcaption>Jianbo Shi、Carlo Tomasi（1994），图 9，PDF 第 6 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/033-fig-9.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：即使参数迭代趋于稳定，不相似度仍保持较高；这一反例说明收敛不等于匹配对象正确。
<!-- figure-ref-v6:end:rc-33-figure-9 -->

这篇论文没有神经网络训练预算或额外示范数据。计算量来自候选梯度矩阵和每个活跃窗口的迭代对齐。实验主要验证模型分工，不能从这些展示读出统一的现代硬件实时吞吐率。

### 五处证据：分别支持什么

**[图 2](https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=4)、3与第 5 节：**标志牌随运动放大，纯平移监控的差异上升，仿射补偿后的差异较平稳。它支持形变补偿能减少对正常外观变化的误判。正文提到约 15% 尺寸增加；帧数叙述与图注有 21/25 的不一致，不能据此重新构造精确的每帧缩放率。

<!-- figure-ref-v6:start:rc-33-links-121 -->
本页定位：[图 2缺口说明](#rc-33-figure-2) · [图 3内嵌图](#rc-33-figure-3)。
<!-- figure-ref-v6:end:rc-33-links-121 -->

**[图 4](https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=4)、5及[图 3](#rc-33-figure-3)的另一组曲线：**窗口被标志牌遮挡，仿射差异出现跳变。它说明这个遮挡实例可被检测，不证明任意遮挡比例、重复纹理都能识别。

<!-- figure-ref-v6:start:rc-33-links-123 -->
本页定位：[图 3内嵌图](#rc-33-figure-3) · [图 4缺口说明](#rc-33-figure-4) · [图 5缺口说明](#rc-33-figure-5)。
<!-- figure-ref-v6:end:rc-33-links-123 -->

**表 1、[图 6–7](#rc-33-figure-6)：**合成形变中，第一组真实平移为 $(3,0)$ 像素，估计为 $(3.0785,-0.0007)$。这是特定噪声样本与图案下的配准精度，并非所有真实图像都具有约 0.08 像素精度。[图 7](#rc-33-figure-7) 横轴是优化迭代次数，不是环境交互量。

<!-- figure-ref-v6:start:rc-33-table-1 -->
<figure class="reading-evidence-figure" id="rc-33-table-1"><a href="/robot-classic/assets/figure-refs-v6/033-table-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/033-table-1.png" width="493" height="567" alt="表1：仿真实验中真实与求得的仿射变形矩阵和位移" loading="lazy"></a><figcaption>Jianbo Shi、Carlo Tomasi（1994），表 1，PDF 第 5 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/033-table-1.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：逐项比较真实矩阵、估计矩阵与平移向量；表中误差展示数值恢复程度，不能据此推出任意初值均能收敛。
<!-- figure-ref-v6:end:rc-33-table-1 -->

<!-- figure-ref-v6:start:rc-33-figure-6 -->
<figure class="reading-evidence-figure" id="rc-33-figure-6"><a href="/robot-classic/assets/figure-refs-v6/033-fig-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/033-fig-6.png" width="556" height="267" alt="图6：三种仿射变化下原图、迭代过程与含噪目标图的三行五列对比" loading="lazy"></a><figcaption>Jianbo Shi、Carlo Tomasi（1994），图 6，PDF 第 5 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/033-fig-6.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：每行从最左原图读到最右含噪目标，中间列是不同迭代阶段；收敛是模型与纹理共同决定的，不能仅凭终帧相似断言唯一解。
<!-- figure-ref-v6:end:rc-33-figure-6 -->

<!-- figure-ref-v6:start:rc-33-figure-7 -->
<figure class="reading-evidence-figure" id="rc-33-figure-7"><a href="/robot-classic/assets/figure-refs-v6/033-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/033-fig-7.png" width="561" height="310" alt="图7：三种仿射变化中不相似度、位移误差、形变误差及参数迭代轨迹" loading="lazy"></a><figcaption>Jianbo Shi、Carlo Tomasi（1994），图 7，PDF 第 5 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/033-fig-7.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：前三列是不同误差量，后两列是参数轨迹；先分别确认纵轴和迭代步数，避免把不同量纲的下降速度直接比较。
<!-- figure-ref-v6:end:rc-33-figure-7 -->

<!-- figure-ref-v6:start:rc-33-links-125 -->
本页定位：[图 7内嵌图](#rc-33-figure-7)。
<!-- figure-ref-v6:end:rc-33-links-125 -->

**[图 12](#rc-33-figure-12)与[图 15](#rc-33-figure-15)：**同一批真实特征的纯平移差异大多一起上升；允许仿射形变后，好特征形成低差异带，多个遮挡或显露特征更突出。这是最直接的模型对照，但原文没有提供完整 ROC 或固定阈值下的精确率、召回率。

<!-- figure-ref-v6:start:rc-33-figure-12 -->
<figure class="reading-evidence-figure" id="rc-33-figure-12"><a href="/robot-classic/assets/figure-refs-v6/033-fig-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/033-fig-12.png" width="529" height="443" alt="图12：纯平移模型下各特征的不相似度时间曲线" loading="lazy"></a><figcaption>Jianbo Shi、Carlo Tomasi（1994），图 12，PDF 第 6 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/033-fig-12.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：许多曲线一起上升，难以将真正失效的特征分离出来；与原有图15的仿射补偿结果对照，才能理解质量监测的改进。
<!-- figure-ref-v6:end:rc-33-figure-12 -->

<!-- figure-ref-v6:start:rc-33-links-127 -->
本页定位：[图 15内嵌图](#rc-33-figure-15)。
<!-- figure-ref-v6:end:rc-33-links-127 -->

**[图 14](#rc-33-figure-14)、15与第 7 节末：**细小文字特征 24、60 出现混叠，差异曲线从开始就不稳定。它们说明高频细节不一定是好信号；采样分辨率不足会让外观变化无法被平滑变形解释。

<!-- figure-ref-v6:start:rc-33-figure-14-reviewed -->
<figure class="reading-evidence-figure" id="rc-33-figure-14"><a href="/robot-classic/assets/figure-refs-v6/033-fig-14-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/033-fig-14-reviewed.png" width="505" height="434" alt="六个桌面特征在六帧中的局部图像块及帧编号" loading="lazy"></a><figcaption>原论文图摘引：Jianbo Shi、Carlo Tomasi，Good Features to Track，CVPR 1994，593–600，图 14，PDF 第 7 页；<a href="https://cs.ucf.edu/courses/cap6411/cap6411/spring2006/shi_tomasi_94.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。点击图片可放大。</figcaption></figure>

读图：第4行特征60对应细字区域，随运动出现混叠；这解释了为什么仅靠较低的外观差异分数也可能接受不可靠特征。该图来自作者桌面序列，不是Manhattan电影帧。
<!-- figure-ref-v6:end:rc-33-figure-14-reviewed -->




<!-- figure-ref-v6:start:rc-33-links-129 -->
本页定位：[图 15内嵌图](#rc-33-figure-15)。
<!-- figure-ref-v6:end:rc-33-links-129 -->

## 五、保留遮挡、光度变化与镜面亮斑反例

本文把“选择什么”和“怎样跟踪”联系起来，再把外观监控接到前端。这是算法设计上的闭环：不是先任意挑出所谓有趣点，再期待跟踪器处理一切。

代价是每条轨迹都要保留模板并做额外对齐。模板始终锚定首帧有助于避免逐帧小漂移隐藏累计错误，但时间跨度增加也让仿射近似更容易失效。极端透视、形变物体、光照剧变、运动模糊或滚动快门都可能造成模型不匹配；这些是基于目标函数的系统分析，不是论文逐项评测结论。

作者明确承认，外观稳定的镜面亮斑可能仍是坏物理特征。局部图像无法完全决定刚性，这需要多点几何和更高层离群值检测。也因此，所有窗口都通过最小特征值和残差检查，不代表可以取消 RANSAC 或几何一致性验证。

## 六、追问：每次都把最新窗口当监控模板，会怎样改变检测漂移的能力？

<details>
<summary>每次都把最新窗口当监控模板，会怎样改变检测漂移的能力？</summary>

**参考答案**：正文把当前窗口与最初窗口作仿射比较，是为了保留较长时间的外观参照。若总换成最新窗口，连续的小变化可能逐步被接受，检查的问题就变成短时一致性。两种协议应分开测试并说明模板更新规则，不能把短时残差小当作长期身份正确。

</details>

## 七、把特征轨迹交给视觉惯性估计

- **模块组合**：[VINS-Mono：让单目视觉与 IMU 组成可以长期运行的定位系统](092-vinsmono.md)。将特征轨迹送入视觉惯性几何估计，再用多源约束检查运动。

## 八、自测与参考答案

**问题1：为什么不能只选条件数最接近 1 的窗口？**

**参考答案：**条件数衡量两个方向的相对不平衡，不衡量总信号强度。两个特征值同样接近零时条件数也很好，但微小噪声足以造成巨大位移变化。最小特征值阈值同时约束最弱方向的绝对信息量。

**问题2：既然仿射模型更强，为什么相邻帧不总用它？**

**参考答案：**小窗口和小运动可能不足以稳定估计六个参数，额外自由度会拟合噪声。二维平移适合短间隔定位，而跨较长时间的模板比较需要解释累计缩放与旋转。模型复杂度应随用途和可观测信息选择。

**问题3：仿射残差很小，可以证明是同一个静态三维点吗？**

**参考答案：**不能。低残差只说明两块图像能被这个外观模型解释，重复纹理、平滑移动的高光等也可能满足。确认静态几何还需要多个视角、多点一致性或其他传感器证据，局部窗口本身没有提供这些信息。
