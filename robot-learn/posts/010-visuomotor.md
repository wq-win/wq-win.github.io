# 010｜视觉运动策略：从相机到机械臂动作

[系列首页](README.md) · [上一篇](009-gps.md) · [下一篇](011-ddpg.md)

**原论文**：*End-to-End Training of Deep Visuomotor Policies*，Levine、Finn、Darrell、Abbeel，2015 首版／JMLR 2016。[原文](https://arxiv.org/abs/1504.00702)。

### 先接住前作的问题

原始[GPS](009-gps.md)已用局部引导连接好轨迹与全局策略，但所学反馈不必从相机直接获得精细接触信息。本篇承接这种训练分工，让训练时的局部教师指导图像到力矩的策略；约束式交替训练与2013年的重要性估计需分开。

## 一、问题设定：图像特征怎样为接触动作服务

传统流水线先估计物体位置，再把位置交给控制器。这个分工清楚，但感知目标通常是几何误差最小，未必最适合实际操作。例如拧瓶盖需要同时关注瓶口、瓶盖和夹爪相对姿态，单纯估计瓶子中心可能丢掉关键接触信息。

| 要素 | 训练时 | 最终策略执行时 |
|---|---|---|
| 图像 | 用于视觉策略 | 使用 |
| 机器人关节配置 | 使用 | 使用 |
| 目标物体精确位置 | 局部优化可获得 | 不直接输入视觉策略 |
| 局部动力学 | 由交互数据拟合以优化轨迹 | 不必每步在线规划 |
| 输出 | 局部策略分布与视觉网络参数 | 电机力矩 |
| 反馈 | 任务成本与引导动作 | 观察形成闭环 |

实验通过机器人另一只手移动目标并提供位置监督，控制左臂外观以避免视觉捷径。这个设计让训练可以更可靠地知道目标在哪里，但也说明数据并非完全来自无标注随手拍摄。

将训练中的特权状态转化为部署时可用观察策略，是整套方法的重要思想。不能因为最终不输入精确目标位置，就说训练从未使用位置信息。

## 二、用空间特征和局部教师联合训练力矩策略

这篇论文把图像特征与力矩输出连接起来，用引导式策略搜索联合训练。局部控制器在训练时使用更完整状态，视觉策略执行时只使用图像和机器人自身配置。[原文 §4–5](https://arxiv.org/html/1504.00702)

### 网络为什么先提取空间点

卷积响应经过空间 softmax：

$$
s_{cij}=\frac{e^{a_{cij}}}{\sum_{i'j'}e^{a_{ci'j'}}}.
$$

对每个通道计算期望坐标：

$$
f_{cx}=\sum_{ij}s_{cij}x_{ij},\qquad
f_{cy}=\sum_{ij}s_{cij}y_{ij}.
$$

这样得到一组可微的特征点，再与关节配置结合预测力矩。分类网络常有意忽略物体在图像的精确位置，而操作任务恰恰需要“在哪里”。

该表示也有限制：一个通道若同时激活两个相似位置，期望坐标可能落在两者中间，那里未必有真实物体。因此 soft-argmax 的紧凑性不等于完整保留视觉歧义。

空间期望还给出了很清楚的梯度路径。把位置记为 $x_i$，令 $a_i$ 为该位置logit、$s_i=\exp(a_i)/\sum_j\exp(a_j)$ 为空间权重，特征点 $\bar x=\sum_i s_ix_i$，则 $\partial\bar x/\partial a_j=s_j(x_j-\bar x)$。动作损失希望特征点向右时，右侧激活会得到相应梯度；“位置”是通过可微加权期望被控制目标塑造的。[原文架构与§6.3](https://arxiv.org/html/1504.00702)

教学例：位置为0与2的两点各占一半时，输出为1，两个logit梯度分别为−0.5与0.5。网络能移动期望，但当前表示仍不告诉下游“中间没有物体”。因此架构消融的定位收益与重复物体测试的歧义是两件事：前者验证这种压缩在任务分布上有益，后者才检验它何时丢失必要信息。

### 引导训练如何连接感知与控制

局部控制器在小范围数据上拟合动力学，以任务成本优化连续动作。全局视觉策略通过监督拟合这些动作分布。两者还要受到一致性约束，避免局部控制器不断选择视觉策略无法实现的行为。

论文使用 BADMM 形式组织交替优化。概念上，目标是降低局部策略的任务成本，同时让它与参数化策略的行动分布相符。约束不是只要求在已记录点上动作接近，还关系到两者运行时产生的状态分布。

视觉网络不需要沿真实物理系统反向传播：局部控制优化生成训练目标，监督阶段把损失传到视觉层。端到端描述的是网络感知到动作的可联合优化，不是环境可微。

### 一个接触特征的例子

教学构造：抓着瓶盖接近瓶口，瓶子中心估计误差只有几毫米，但夹爪稍微倾斜。一个只输入瓶子位置的控制器可能仍然垂直下压，导致卡住。联合策略可以利用夹爪边缘与瓶口边缘的相对视觉变化，调整姿态和力矩。

这个解释不是说论文证明了每个特征点都有明确语义。特征可视化显示网络关注哪里，但不能独立证明这些点对成功具有因果必要性。要验证，需要遮蔽、替换或受控扰动相关区域，并保持其他条件一致。

再考虑两个外观相同瓶子。若同一通道同时关注它们，软坐标可能落在中间；若训练数据总把目标放左边，网络可能学到位置捷径。增加视觉干扰与目标位置测试，是区分这类捷径和有效任务特征的方式。

## 三、让局部教师与视觉策略交替靠近

空间特征只有接受动作任务的训练才成为控制接口。局部控制器先使用完整状态提供动作分布，视觉网络再拟合这些反馈；两者交替调整，不能把图像回归单独当成完整训练。

~~~text
输入：相机图像、机器人状态、训练时目标位姿、任务成本
初始化视觉特征：用机器人自动产生的位姿标签训练
初始化局部时变线性高斯控制器
循环：
    从多个训练条件收集局部控制轨迹
    拟合局部动力学
    在任务成本和策略一致性约束下更新局部控制器
    用对应图像、状态、动作分布训练视觉策略
    更新约束乘子与相关权重
    采集新轨迹，继续交替优化
执行：
    图像 -> 空间特征点
    特征点 + 关节配置 -> 力矩
~~~

局部动力学只需要覆盖更新附近，但这也意味着更新不能随意跳远。相机时间戳与关节状态应同步；如果图像落后于动作，网络输入不再代表同一物理时刻，这种问题不会由监督损失自动识别。

## 四、分开核对视觉消融与操作成功

**原图怎么读：** [图10，原论文图注与图像](#paper-010-visuomotor-figure-10)。同一颜色在连续图像中追踪同一特征点，颜色本身不代表语义类别。它展示控制网络关注的空间位置，不是关键点检测的独立准确率评测。

<!-- figure-ref-v6:start:63108151487a -->
<a id="paper-010-visuomotor-figure-10"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/010-visuomotor-v6-figure-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/010-visuomotor-v6-figure-10.png" width="1744" height="1256" alt="End-to-End Training of Deep Visuomotor Policies，图10：读图对应本段的“联合训练前后的特征点”；任务训练改变视觉关注。" loading="lazy"></a><figcaption>原图摘引：Levine、Finn、Darrell、Abbeel，2015 首版／JMLR 2016，PDF第25页，图10。<a href="https://arxiv.org/pdf/1504.00702v5#page=25" target="_blank" rel="noopener noreferrer">核对原文</a>。读图对应本段的“联合训练前后的特征点”；任务训练改变视觉关注。<a href="https://arxiv.org/html/1504.00702v5#S6.F10" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:63108151487a -->


**结果图怎么读：** 内嵌图9右侧结果表比特征点可视化更直接检验控制能力。三列分别是训练位置、新位置和视觉干扰测试，括号给出试验数；同一任务内比较端到端策略与位姿特征基线，不能把较少次数下的100%当成无条件可靠性。

<!-- figure-ref-v6:start:49e2eb093ed7 -->
<a id="paper-010-visuomotor-figure-9"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/010-visuomotor-v6-figure-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/010-visuomotor-v6-figure-9.png" width="1744" height="1072" alt="End-to-End Training of Deep Visuomotor Policies，图9：左侧保留训练场景与视觉干扰场景，右侧给出对应任务、试验次数和成功率，完整复合图可检验场景与数字的对应。" loading="lazy"></a><figcaption>原图摘引：Levine、Finn、Darrell、Abbeel，2015 首版／JMLR 2016，PDF第24页，图9。<a href="https://arxiv.org/pdf/1504.00702v5#page=24" target="_blank" rel="noopener noreferrer">核对原文</a>。左侧保留训练场景与视觉干扰场景，右侧给出对应任务、试验次数和成功率，完整复合图可检验场景与数字的对应。<a href="https://arxiv.org/html/1504.00702v5#S6.F9" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:49e2eb093ed7 -->


<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/010-visuomotor-s6-f9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/010-visuomotor-s6-f9.png" width="1148" height="776" alt="End-to-End Training of Deep Visuomotor Policies，图9：内嵌图9右侧结果表比特征点可视化更直接检验控制能力。三列分别是训练位置、新位置和视觉干扰测试，括号给出试验数；同一任务内比较端到端策略与位姿特征基线，不能把较少次数下的100%当成无条件可靠性。" loading="lazy"></a><figcaption>实验图原图摘引：Levine、Finn、Darrell、Abbeel，2015 首版／JMLR 2016，PDF第24页，图9，右侧结果表局部。<a href="https://arxiv.org/pdf/1504.00702v5#page=24" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 位置 | 检验对象 | 证据意义 | 不能证明 |
|---|---|---|---|
| §6.1 | 模拟控制中的算法比较 | 引导优化可训练复杂策略 | 模拟分数直接等于真机效果 |
| [表2](https://arxiv.org/html/1504.00702v5#S6.T2)、§6.2 | PR2 局部控制器受目标扰动 | 局部优化与反馈具有一定鲁棒性 | 视觉策略对所有扰动稳定 |
| [表3](https://arxiv.org/html/1504.00702v5#S6.T3)、§6.3 | 空间 softmax 与替代架构 | 紧凑位置表示有助于该定位任务 | 所有视觉任务都适合特征点 |
| [图8](#paper-010-visuomotor-figure-8)、[图9](#paper-010-visuomotor-figure-9)、§6.4 | 挂衣架、插块、锤子、瓶盖 | 联合感知控制的任务表现 | 通用家庭操作已解决 |
| [图10](#paper-010-visuomotor-figure-10)、[图11](#paper-010-visuomotor-figure-11)、§6.5 | 联合训练前后的特征点 | 任务训练改变视觉关注 | 可视化等于因果归因 |

<!-- figure-ref-v6:start:b864a7f2eb24 -->
<a id="paper-010-visuomotor-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/010-visuomotor-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/010-visuomotor-v6-figure-8.png" width="1744" height="932" alt="End-to-End Training of Deep Visuomotor Policies，图8：读图对应本段的“挂衣架、插块、锤子、瓶盖”；联合感知控制的任务表现。" loading="lazy"></a><figcaption>原图摘引：Levine、Finn、Darrell、Abbeel，2015 首版／JMLR 2016，PDF第22页，图8。<a href="https://arxiv.org/pdf/1504.00702v5#page=22" target="_blank" rel="noopener noreferrer">核对原文</a>。读图对应本段的“挂衣架、插块、锤子、瓶盖”；联合感知控制的任务表现。<a href="https://arxiv.org/html/1504.00702v5#S6.F8" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:b864a7f2eb24 -->
<!-- figure-ref-v6:start:d77502436944 -->
<a id="paper-010-visuomotor-figure-11"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/010-visuomotor-v6-figure-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/010-visuomotor-v6-figure-11.png" width="1744" height="472" alt="End-to-End Training of Deep Visuomotor Policies，图11：读图对应本段的“联合训练前后的特征点”；任务训练改变视觉关注。" loading="lazy"></a><figcaption>原图摘引：Levine、Finn、Darrell、Abbeel，2015 首版／JMLR 2016，PDF第25页，图11。<a href="https://arxiv.org/pdf/1504.00702v5#page=25" target="_blank" rel="noopener noreferrer">核对原文</a>。读图对应本段的“联合训练前后的特征点”；任务训练改变视觉关注。<a href="https://arxiv.org/html/1504.00702v5#S6.F11" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:d77502436944 -->


[表3](https://arxiv.org/html/1504.00702v5#S6.T3) 中特征点架构的位姿误差为 $1.30\pm0.73$ 厘米，softmax 后接普通全连接变体为 $2.59\pm1.19$ 厘米。它们是三维目标点的平均欧氏误差，不是任务成功率。将差值 1.29 厘米称为“成功率提升”是指标混淆。

视觉预训练使用 1000 张机器人运动采集图像，并使用 ImageNet 初始化的首层滤波器。原文明确区分训练目标位置、未见位置／抓姿以及视觉干扰测试。对比结果不能被简化成“完全从零、没有外部数据”。

## 五、受控教师信息不能替代部署观测覆盖

原文 §6.4 指出，靠近或遮挡目标的干扰以及背景剧烈变化会明显损害表现。§6.5 也说明特征点表示假定相应特征可见且只有一个实例，这在复杂场景中是很强的简化。

从系统角度还可以推断：精细力矩控制依赖动作频率、时延与硬件状态，跨机器人迁移不能只复制网络权重。这个推断来自控制接口，不是该论文已经报告的跨本体失败实验。

### 五个前置概念

五个前置概念是空间 softmax、局部线性模型、时变高斯策略、分布一致性与特权训练信息。它们分别解释视觉压缩、轨迹优化、教师分布、交替训练和部署信息差。

### 追问：若去掉一个相机特征点后成功率下降，是否说明它编码了某个接触部位？

参考答案：只能先说明该特征对当前模型有用。特征点可能利用背景位置或多个物体的共同变化，空间softmax也可能把双峰压到中间。要检验接触语义，应独立移动目标、干扰背景并控制遮挡，观察特征和动作是否随相关部位改变。单次消融支持功能依赖，不足以给隐藏点指定固定物理含义。

## 六、沿机制关系继续读

本篇对[GPS](009-gps.md)属于直接继承并更换优化形式；与[Hand-Eye](014-hand-eye.md)则是平行视觉控制路线。前者用局部教师提供力矩分布，后者用大规模抓取结果学习动作条件成功预测器，训练信息与执行时搜索预算都不同。

## 七、自测题与参考答案

**问题 1：端到端视觉控制是否要求对真实机器人动力学求导？**

参考答案：不要求。局部控制优化产生动作分布目标，监督阶段把误差从动作输出传回视觉特征。环境交互用于生成和更新训练数据，网络内部可微不意味着真实环境需要可微。

**问题 2：训练用精确目标位姿、执行不用，是否构成信息泄漏？**

参考答案：这种特权训练本身是明确的方法设定，不自动等于评估泄漏。关键是部署策略不能直接获得测试时不允许的信息，实验必须如实说明训练信息成本，并与具有可比信息的基线比较。

**问题 3：空间 softmax 在两个同样强的响应峰之间会输出什么，为什么可能有问题？**

参考答案：期望坐标可能位于两峰中间，而不是任一真实特征处。它用单点压缩了多峰歧义，可能误导控制。更复杂目标、遮挡与重复实例需要额外表示或训练处理。
