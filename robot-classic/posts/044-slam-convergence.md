# 044｜SLAM 的收敛结构：地图为什么能越走越确定

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](043-rrt-connect.md) · [下一篇](045-fastslam.md)

**论文**：M. W. M. G. Dissanayake、Paul Newman、Steven Clark、Hugh F. Durrant-Whyte、M. Csorba，*A Solution to the Simultaneous Localization and Map Building (SLAM) Problem*，IEEE Transactions on Robotics and Automation 17(3)，229–241，2001。[原文](https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf) · [DOI](https://doi.org/10.1109/70.938381)。

### 先接住前作的问题

[空间不确定性](017-uncertain-map.md)已经强调联合相关性，本篇追问反复观测后地图究竟收敛到什么。

## 一、问题设定：反复观测后地图的相关误差究竟收敛到什么

机器人不知道自己在哪里，也不知道周围路标在哪里，却要用这些路标定位。这看似循环依赖：自身位置不准会把地图画错，地图不准又会影响自身位置。

### 背景与问题定义

系统状态写成

$$X=[x_r^T,m_1^T,\ldots,m_N^T]^T,$$

其中 $x_r$ 是车辆位置和朝向，$m_i$ 是静止路标的位置。输入是运动信息 $u_t$ 和相对观测 $z_t$；输出是联合状态估计 $\hat X_t$ 与协方差 $P_t$。这属于递归状态估计，没有策略学习、奖励函数或训练回合。

理论部分第 II 节使用线性离散模型；第 IV 节实际车辆运动与距离、方位观测是非线性的，使用 EKF。观测所对应的路标必须关联正确，噪声模型要足以描述真实误差，地图里的路标应保持静止。原文第 231 页明确指出，若让路标随机运动，可以写进状态方程，但文中收敛性质不再成立。

本文反对的捷径是：为了节省计算，将路标间的交叉协方差直接抹掉，再把它们当作独立地图点融合。这样虽然矩阵变小，却丢失了重复使用同一车辆误差的信息。真正的计算简化，需要保持适当的统计结构或采用保守近似，不能把相关当成不相关。

## 二、保留车辆与地标联合协方差，拆开三类结论

### 方法：联合协方差究竟记录什么

将协方差分块：

$$P=\begin{bmatrix}P_{rr}&P_{rm}\\P_{mr}&P_{mm}\end{bmatrix}.$$

$P_{rr}$ 表示车辆不确定性，$P_{mm}$ 表示地图不确定性，非对角块记录车辆与地图误差如何一起变化。地图块内部也有不同路标之间的交叉协方差。

用统一符号写，线性观测更新为

$$S=HP^-H^T+R,\qquad K=P^-H^TS^{-1},$$
$$\hat X^+=\hat X^-+K(z-H\hat X^-),\qquad P^+=P^- -P^-H^TS^{-1}HP^-.$$

$H$ 是观测矩阵，$R$ 是观测噪声协方差，$S$ 是创新协方差，$K$ 把观测残差分配给联合状态。只观测一个路标，其他地图点也可能更新，因为它们与被观测量之间存在相关性。

数值实现可用 Joseph 形式保持协方差的对称与半正定结构，但它是稳定实现方式，不是本文新提出的机器人机制。EKF 用非线性预测及 Jacobian 替代线性观测；误差较大或几何退化时，线性化得到的协方差未必忠实对应真实误差。

### 数学目标、算法机制和评价指标

滤波追求基于观测的状态估计及其不确定性；在线性高斯条件下，条件均值具有最小均方误差意义。本文新增的核心不是一个更换权重的损失，而是对完整联合滤波结构的收敛分析和实际建图实现。

实验检查车辆与路标误差、创新和由协方差导出的置信界。协方差小是估计器对自身误差的判断；是否可信，要对照真实或参考误差，不能仅以椭圆变小判定成功。

### 用共同模态与相对模态分开看“地图收敛”

两路标的一维协方差若为 $P=\begin{bmatrix}1&0.99\\0.99&1\end{bmatrix}$，各自标准差仍为1米，但间距 $m_2-m_1$ 的方差仅0.02平方米，标准差约0.141米。将非对角元删掉就会错误地得到2平方米。反过来，沿共同平移方向 $(1,1)$ 的不确定性并没有被相对观测消除。

从观测 $z=m-r$ 也能直接看到规范自由度：把机器人与所有路标一起加 $\delta$，所有 $z$ 不变。零残差不意味着绝对位置已确定。需要外部参考或明确固定规范，且不能把任意固定原点当成新传感信息。这个**教学模态分析**帮助理解原文第II节为何保留联合状态，以及为何特别假定路标静止。[原文模型部分](https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf)

[不确定地图](017-uncertain-map.md)提供联合相关性的历史基础；[FastSLAM](045-fastslam.md)是条件化分解的平行表示，未把地图点边缘独立化；[GraphSLAM](053-graphslam.md)用稀疏约束组织历史轨迹。三者都必须面对相同的相对观测信息边界，不能由协方差或残差单项排名。

### 三个结论怎样读才准确

**第一，静态地图的协方差不增。** 第 III.A 节的证明利用观测更新减去半正定矩阵，而静态路标在预测阶段没有新的过程噪声注入。因而地图协方差及相应主子矩阵具有单调性质。车辆本身会受运动噪声影响，完整状态协方差不能因此宣称每时刻都下降。原文定理措辞涉及子矩阵，理解其不确定性含义时应使用对应变量集合的主子矩阵，不能随意拿一个非对称矩形块的“体积”解释。

**第二，相关性可以保存精确的相对关系。** 对两个同类路标，差值的不确定性为

$$\operatorname{Cov}(m_i-m_j)=P_{ii}+P_{jj}-P_{ij}-P_{ji}.$$

即便各自绝对方差非零，只要误差主要是共同平移，差值方差仍可很小。原文第 233 页的极限论述围绕这一点。将交叉项删除，会把共同误差误当作两份独立误差。

**第三，绝对地图存在参考不确定性的下界。** 第 III 节第 234 页通过理想化、无运动过程噪声条件构造下界，并明确说非零过程噪声与观测信息竞争时，实际极限还受噪声影响。因此“下界由初始不确定性决定”不等于“任意轨迹都恰好达到这个下界”。外部已知路标或 GPS 可增加绝对参考，改变这个问题。

这些都是模型内的结果。要从不断观测走向相对误差趋零，还需要相应地图关系持续获得有效信息；只在一个角落无限重复观测、从不联系远处地图，并不能让所有相对位置自动确定。对非线性系统，朝向不确定性和不可观方向还要单独分析，不能把线性定理当作普遍一致性证明。

### 输入到输出：完整滤波之前还要确认路标

联合协方差保留了共同误差，实际更新却还依赖正确路标关联。两根柱子一起偏移的例子将检查相对精度，再进入雷达数据中的收敛证据。

## 三、执行观测关联与滤波，用共同平移误差验算

```text
输入：车辆运动数据、相对路标观测、运动和观测噪声模型
初始化车辆估计与协方差；确认路标列表、候选列表为空
每次运动数据到达：
    预测车辆状态
    传播联合协方差，保持静态地图过程噪声为零
每次观测到达：
    预测已确认路标的观测与创新协方差
    用统计门限寻找匹配
    若出现歧义匹配：拒绝该观测
    若匹配唯一的确认路标：更新整个联合状态与协方差
    否则：维护候选路标及其支持次数、时间和质量
    对足够稳定的候选：增广状态，并计算必要交叉协方差
    清理长期得不到支持或质量不足的候选
输出：车辆位姿、地图、联合不确定性和创新诊断
```

这是第 II 节滤波流程与附录 II 地图管理的教学合并。候选确认门限的具体实现依赖传感器；伪代码没有给出任意虚构的默认次数。增广新路标时，其位置由当前车辆估计计算，因此与车辆及已有地图相关，不能初始化为完全独立。

### 自构例子：两根柱子都偏了一米

假设真实柱子在 5 米与 8 米处，机器人将自身原点整体错移了 1 米，于是地图给出 6 米与 9 米。绝对误差都是 1 米，柱间距离却仍为 3 米。若共同偏移的方差为 1，且独立误差可忽略，则 $P_{11}=P_{22}=P_{12}=P_{21}=1$，差值方差等于零。

这是说明相关性的理想教学例子，不是对实测精度的声称。加入独立观测噪声后，差值也会有方差；重复有效观测可以减小这一部分，却不能知道整个坐标原点应该平移多少。

五个前置概念：**联合状态**把车辆和地图一起估计；**交叉协方差**记录共同误差；**创新**是观测减去预测；**一致性**考察不确定性与实际误差是否匹配；**参考自由度**指相对观测不能自行确定的整体坐标变换。

## 四、对照理论条件与室外雷达实验

<!-- figure-ref-v6:start:rc-44-figure-8-anchor -->
<span id="rc-44-figure-8"></span>
<!-- figure-ref-v6:end:rc-44-figure-8-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/044-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/044-evidence.png" width="800" height="625" alt="Fig. 8：比较估计位置误差与图中的置信界，而不是只看最终轨迹是否重合；真实误差与内部协方差描述的是不同对象" loading="lazy"></a><figcaption>原论文结果图／表摘引：M. W. M. G. Dissanayake、Paul Newman、Steven Clark、Hugh F. Durrant-Whyte、M. Csorba（2001），Fig. 8，PDF 第 9 页；<a href="https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf#page=9" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：比较估计位置误差与图中的置信界，而不是只看最终轨迹是否重合；真实误差与内部协方差描述的是不同对象。一次符合置信界的运行不等于严格的长期一致性证明。

标准差下降描述模型后验，不保证每次观测后真值误差都下降。联合相关性与绝对规范自由度必须同时保留。

| 项目 | 第 IV 节的实际设置 | 解释边界 |
|---|---|---|
| 平台与数据 | 手动驾驶室外车辆，记录雷达、速度编码器和转向信息 | 验证估计，不是自主规划或控制实验 |
| 感知 | 77 GHz 毫米波雷达，相对距离与方位；1–3 Hz 扫描 | 传感器规格不等于定位精度 |
| 地图 | 10 个人工雷达反射器，另识别 7 个自然路标 | 已知物理结构辅助提取，但位置不作为 SLAM 输入 |
| 绝对传感器 | 车上装有 DGPS 与 IMU，文中实验没有使用它们 | 不能称为 GPS 融合建图 |
| 参考位置 | 人工路标经测量；利用已知路标的另一个定位算法生成参考轨迹 | 参考轨迹是估计，不是无误差真值 |
| 评价 | 状态误差、创新及 95% 置信界；地图标准差随时间变化 | 显示一致性现象，没有跨大量独立任务的统计覆盖率检验 |
| 训练预算 | 不适用；无神经网络训练 | 全量计算性能与大规模地图实验仍有限 |

**[Fig. 5](#rc-44-figure-5)，第 236 页**：大量雷达反射并不属于稳定点路标，约三成观测对应可辨认路标。这张图支持前端管理的重要性，不能把原始雷达回波全作为可靠地图约束。

<!-- figure-ref-v6:start:rc-44-figure-5 -->
<figure class="reading-evidence-figure" id="rc-44-figure-5"><a href="/robot-classic/assets/figure-refs-v6/044-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/044-figure-5.png" width="588" height="472" alt="原论文 Figure 5：雷达观测、车辆路径与反射器" loading="lazy"></a><figcaption>原论文图摘引：Dissanayake 等（2001），Figure 5，PDF 第 8 页；<a href="https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf#page=8" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：图例分开原始雷达观测、车辆路径和反射器，远离真实反射器的散点说明原始返回并不都能直接当作可靠地标。
<!-- figure-ref-v6:end:rc-44-figure-5 -->

**[Fig. 7–8](#rc-44-figure-7)，第 237 页**：车辆轨迹和定位误差与参考比较，作者观察误差处于估计置信界内。文中约 5 厘米指参考轨迹算法计算出的绝对精度，不是 SLAM 自身的平均误差。

<!-- figure-ref-v6:start:rc-44-figure-7 -->
<figure class="reading-evidence-figure" id="rc-44-figure-7"><a href="/robot-classic/assets/figure-refs-v6/044-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/044-figure-7.png" width="595" height="472" alt="原论文 Figure 7：实测与估计地标位置及车辆闭合路线" loading="lazy"></a><figcaption>原论文图摘引：Dissanayake 等（2001），Figure 7，PDF 第 9 页；<a href="https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf#page=9" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：圆圈和星号分别对应实测与估计地标，环形曲线是车辆路线；视觉接近只是定性检查，还需和误差及协方差图一起读。
<!-- figure-ref-v6:end:rc-44-figure-7 -->

**[Fig. 9](#rc-44-figure-9)，第 237 页**：距离、方位创新及其置信界用于在线模型诊断。创新合理支持观测预测的一致性，但一次匹配后的残差小也可能受错误关联筛选影响，不能独立排除所有地图偏差。

<!-- figure-ref-v6:start:rc-44-figure-9 -->
<figure class="reading-evidence-figure" id="rc-44-figure-9"><a href="/robot-classic/assets/figure-refs-v6/044-figure-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/044-figure-9.png" width="592" height="466" alt="原论文 Figure 9：距离与方位创新及置信界" loading="lazy"></a><figcaption>原论文图摘引：Dissanayake 等（2001），Figure 9，PDF 第 9 页；<a href="https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf#page=9" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：上下两图分别显示距离和方位创新，外侧曲线是对应置信界；应对照时间段检查残差是否与所估计的不确定性相符。
<!-- figure-ref-v6:end:rc-44-figure-9 -->

**[Fig. 10–11](#rc-44-figure-10)，第 238 页**：对照不同时间初始化的两个反射器，展示车辆当时的不确定性如何进入路标初始方差。这比只看最终地图重叠，更直接检验联合估计的机制。

<!-- figure-ref-v6:start:rc-44-figure-11-reviewed -->
<figure class="reading-evidence-figure" id="rc-44-figure-11"><a href="/robot-classic/assets/figure-refs-v6/044-fig-11-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/044-fig-11-reviewed.png" width="640" height="503" alt="第三个路标的两方向估计误差及置信范围" loading="lazy"></a><figcaption>原论文图摘引：M. W. M. G. Dissanayake、Paul Newman、Steven Clark、Hugh F. Durrant-Whyte、M. Csorba，A Solution to the Simultaneous Localization and Map Building (SLAM) Problem，IEEE Transactions on Robotics and Automation 17(3)，229–241，2001，图 11，PDF 第 10 页；<a href="https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf#page=10" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。点击图片可放大。</figcaption></figure>

读图：这个路标较晚被观测，初始化时的置信范围与此前路标不同；保留这张对照才能检验车辆不确定性向新路标传播的论点。
<!-- figure-ref-v6:end:rc-44-figure-11-reviewed -->


<!-- figure-ref-v6:start:rc-44-figure-10 -->
<figure class="reading-evidence-figure" id="rc-44-figure-10"><a href="/robot-classic/assets/figure-refs-v6/044-figure-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/044-figure-10.png" width="591" height="480" alt="原论文 Figure 10：第一号地标的x、y位置误差" loading="lazy"></a><figcaption>原论文图摘引：Dissanayake 等（2001），Figure 10，PDF 第 10 页；<a href="https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf#page=10" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：实线是地标误差，虚线给出置信边界；边界收窄与误差始终为零是不同的命题。
<!-- figure-ref-v6:end:rc-44-figure-10 -->

**[Fig. 12–13](#rc-44-figure-12)，第 238 页**：路标标准差逐渐下降。原文注明为了画图，在路标被确认前将其方差显示为零，因此图上从零跳起不是“已经精确的路标突然变差”。该图支持有限数据下的协方差趋势，不能通过外观验证无限时间的极限定理。

<!-- figure-ref-v6:start:rc-44-figure-13-reviewed -->
<figure class="reading-evidence-figure" id="rc-44-figure-13"><a href="/robot-classic/assets/figure-refs-v6/044-fig-13-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/044-fig-13-reviewed.png" width="662" height="503" alt="全部路标在y方向的估计标准差随时间变化" loading="lazy"></a><figcaption>原论文图摘引：M. W. M. G. Dissanayake、Paul Newman、Steven Clark、Hugh F. Durrant-Whyte、M. Csorba，A Solution to the Simultaneous Localization and Map Building (SLAM) Problem，IEEE Transactions on Robotics and Automation 17(3)，229–241，2001，图 13，PDF 第 10 页；<a href="https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf#page=10" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。点击图片可放大。</figcaption></figure>

读图：与另一方向分开读取能看出不同坐标的不确定性；确认前人为显示为零的作图约定不能当作实际确定性。
<!-- figure-ref-v6:end:rc-44-figure-13-reviewed -->


<!-- figure-ref-v6:start:rc-44-figure-12 -->
<figure class="reading-evidence-figure" id="rc-44-figure-12"><a href="/robot-classic/assets/figure-refs-v6/044-figure-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/044-figure-12.png" width="591" height="475" alt="原论文 Figure 12：地标x方向标准差随时间变化" loading="lazy"></a><figcaption>原论文图摘引：Dissanayake 等（2001），Figure 12，PDF 第 10 页；<a href="https://www.cs.cmu.edu/~motionplanning/papers/sbp_papers/d/00938381.pdf#page=10" target="_blank" rel="noopener noreferrer">核对原文</a>。点击图片可放大。原版权保留。</figcaption></figure>

读图：多条曲线代表不同地标的x方向标准差，首次观测和再观测发生在不同时间；下降趋势不应误读为所有地标同时初始化。
<!-- figure-ref-v6:end:rc-44-figure-12 -->

## 五、区分相对精度、绝对参考与非线性失配

完整协方差需要随地图规模平方增长的存储；单次局部观测也会影响大量矩阵元素。第 V 节讨论保守近似、相对表示与局部地图，说明可扩展性并没有被这篇论文彻底解决。下一篇 FastSLAM 将从条件独立性的角度寻找另一种分解。

**作者明确的限制**包括规模较小、路标提取和关联、地图管理及计算负担。**进一步分析**是：有限轨迹中的误差落在置信界内，尚不足以证明一般 EKF 一致性；共同使用传感器数据产生的参考轨迹也不是完全独立测量。加入外部参考、改变初始朝向误差或系统性偏差，才能更全面测试结论边界。

## 六、追问：如果所有路标和机器人一起平移，内部相对观测能否发现这次变化？

<details>
<summary>如果所有路标和机器人一起平移，内部相对观测能否发现这次变化？</summary>

**参考答案**：在没有相应绝对参考的设定下，相对几何关系不会因共同平移而改变。共同误差与相对误差必须分开讨论；地图内部越来越精确不能自行给出绝对位置。比较协方差或真值误差时，应说明固定了什么参考系及如何对齐。

</details>

## 七、以不同表示扩展联合地图估计

- **平行路线**：[FastSLAM：不删除相关性，而是把它放进轨迹假设](045-fastslam.md)。条件于轨迹分解地图，以粒子表示共同历史歧义。
- **平行路线**：[GraphSLAM：让整段历史一起解释地图](053-graphslam.md)。保留历史变量并优化稀疏约束，改变计算组织而不创造绝对信息。

## 八、自测与参考答案

**问题 1：为什么删除路标之间的协方差，可能同时让某些量看起来更不确定、又让后续融合过度自信？**

**参考答案**：删除正相关项会抬高差值方差，因为无法消去共同误差；但后续把本来相关的观测或估计当作独立证据重复融合，又可能错误地降低联合不确定性。问题不在所有方差都向同一方向变化，而是统计关系被破坏。

**问题 2：一张图里地图标准差持续下降，是否证明地图实际误差每次都下降？**

**参考答案**：不是。标准差是模型产生的统计不确定性，单次随机观测可以把均值暂时推离真实值。要判断模型是否可信，需要独立参考误差、重复试验和一致性指标；错误关联甚至可能让方差下降而地图明显错误。

**问题 3：为什么本文的“初始不确定性下界”不能读成任意机器人最终误差都等于初始误差？**

**参考答案**：下界在理想条件下构造，实际有过程噪声、观测不足和线性化误差，未必达到。外部已知路标会提供新的绝对信息，从而改变下界的前提；只增加未知路标则不会凭空确定绝对参考。


