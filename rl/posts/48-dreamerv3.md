# 第 48 天｜DreamerV3：为什么跨任务稳定，比单个任务高分更难

[系列首页](README.md) · [上一篇](47-instructgpt.md) · [下一篇](49-dpo.md)

**原论文与版本**：*Mastering Diverse Domains through World Models*，2023。[原论文](https://arxiv.org/abs/2301.04104)。

**阅读范围**：引用 arXiv 修订正文中的方法与基准结果。2023 指首次预印本年份，后续修订结果不能全部归入首版。各版本的完整差异与代码尚未逐项核实。

### 先接住前作的问题

[第40天 Dreamer](40-dreamer.md)已在潜在想象中训练Actor–Critic，尚未自动解决不同任务的奖励和观测尺度让公共配置失效的问题。DreamerV3沿这一架构路线继续发展，重点转向数值稳健与扩展；这里的直接路线关系不能误写成它继承了相邻的[InstructGPT](47-instructgpt.md)。[第41天 MuZero](41-muzero.md)则提供潜在模型加行动时搜索的并行对照。

## 一、问题设定：同一世界模型配方怎样跨越任务尺度

同一世界模型算法面对像素、状态向量、稀疏奖励和大幅度价值时，各预测头与行为梯度的数值尺度会发生变化。为每个任务重新调损失权重和学习率，会削弱训练配方的可复用性。

DreamerV3研究怎样让同一组规定配置在不同任务上分别训练仍然有效。检验对象是跨域训练配方，既不是单个任务的最高分，也不是一个共享模型未经训练就能零样本完成所有任务。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 模型驱动、潜在世界模型与Actor–Critic，多领域 |
| 状态／观测 | 图像／状态经离散潜变量和递归记忆编码 |
| 动作 | 离散或连续动作按任务设置 |
| 奖励或学习信号 | 任务奖励的稳健编码与想象回报 |
| 终止／边界 | 预测继续概率及真实终止 |

## 二、用尺度变换与分布目标稳住模型和行为学习

DreamerV3保留“真实轨迹学世界模型、潜在想象中学Actor–Critic”的分工，改变的是尺度稳健性。模型面对像素、连续观测、稀疏奖励和巨大价值范围时，不能让数值幅度最大的预测头独占学习。symlog压缩向量观测的动态范围；奖励和价值的分布头使用symexp two-hot，把标量监督分给相邻原始值桶，而不是直接最小化巨大数值的平方误差。

### 原始桶插值与预测期望不能交换顺序

$$symlog(x)=sign(x)\log(1+|x|),\quad symexp(y)=sign(y)(e^{|y|}-1).$$
奖励／价值的分布预测与逆变换必须配套；Actor使用归一化的优势或回报信号时，不能把训练数值直接当原始任务回报。

**two-hot的“两个非零数”怎么算**：若真实标量 $y$ 位于原始值桶 $B_k\le y\le B_{k+1}$，令 $w_k=(B_{k+1}-y)/(B_{k+1}-B_k)$、$w_{k+1}=(y-B_k)/(B_{k+1}-B_k)$，其他权重为0。两者和为1，且 $w_kB_k+w_{k+1}B_{k+1}=y$；以这两个权重做交叉熵标签，再按原始桶值求预测期望，才保留下文例子的正确尺度。这个等式只针对桶范围内目标，并不说明分布头能无界外推。symlog与symexp互逆，但非线性变换不能与求期望随意交换。可核对本文所用[修订v2式9—11](https://arxiv.org/html/2301.04104v2#Sx2)。

这里有一个容易被略过的中间步。修订正文定义原始值桶 $B=\operatorname{symexp}([-20,\ldots,20])$，先预测桶概率p，读出为 $\hat x=\sum_i p_iB_i$。这通常不等于先求symlog坐标平均再做symexp。这种分布监督把回归改成对桶概率的分类训练。

离散潜变量的KL平衡与free-bits式处理控制表征和动态预测之间的压力，想象中的λ-return与稳健回报尺度则控制行为梯度。各技术处理不同的不稳定源，不能仅凭奖励缩放就推导整套算法的鲁棒性。

### 压缩数值不意味着删除奖励符号

symlog先保留正负号再对幅度取对数，因此正负收益仍可区分；逆变换负责返回原尺度。训练空间中的等距误差不等于原尺度等距误差，判断价值预测时要注明读的是哪一个空间。

### 三个原始值桶与100倍奖励尺度

以下是可手算的教学构造，不是论文实验。

将桶缩成三个原始值B=(0,1,3)。若目标为2，two-hot标签是(0,0.5,0.5)，读出期望正好2。若模型也给该分布，则原始值平均是2；先平均变换坐标再逆变换得到 $\exp[(\log2+\log4)/2]-1=\sqrt8-1\approx1.83$。两种读出不同，因此不能把“symlog+two-hot”随意交换顺序。

再设两个任务回报尺度相差100倍。直接Actor更新可能相差100倍；若分母采用各自稳健回报尺度，两者会更接近。但分母有下限且分位数是估计值，不能声称更新对任意奖励变换严格不变。

## 三、编码预测目标，平衡KL，再展开想象更新

```text
用真实轨迹训练离散潜在世界模型
对不同预测头使用规定的尺度变换／分布损失
平衡动态预测与表征KL目标
从后验状态展开想象轨迹
计算λ-return与稳健回报尺度
更新Actor、Critic及目标统计
继续真实交互
跨任务保持论文规定的公共配置
输出：每个任务训练出的模型与策略
```

## 四、读图6：组件、学习信号与额外计算分别贡献什么

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | 视觉控制、Atari、ProcGen、DMLab、Minecraft等 |
| 数据来源与规模 | 各任务在线经验 |
| 对比基线 | 领域专用算法及PPO等 |
| 训练预算与资源 | 各域数据预算不同，固定超参不代表同样计算量 |
| 指标及其含义 | 任务分数、跨领域稳健性、扩展趋势 |
| 随机性与不确定性 | 完整种子与区间按基准图，本文未逐项核实 |
| 实际验证的假设 | 一套训练配方能否减少跨任务调参 |

### 图6：组件消融和扩展预算分面板读

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-48-figure-6 -->
<span id="rl-48-figure-6"></span>

<p class="figure-source-links">原引用定位：<a href="https://arxiv.org/html/2301.04104#Sx2.F6" target="_blank" rel="noopener noreferrer">原文</a>。</p>
<!-- figure-ref-v6:end:rl-48-figure-6 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/48-dreamerv3-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/48-dreamerv3-figure-6.png" width="1661" height="899" alt="DreamerV3鲁棒组件与学习信号消融以及模型规模和回放比例扩展" loading="lazy"></a><figcaption>原论文图形摘引；Hafner等，2023/2024，Figure 6；原HTML图形。<a href="https://arxiv.org/html/2301.04104v2#Sx2.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。原作者版权保留，CC BY 4.0。</figcaption></figure>


图6左上/左下是14任务归一化后的平均曲线，两轴的百分比不是单一任务成功率；左上移除稳健性组件，左下切断不同学习信号。右上/右下则分别在Crafter与DMLab Goals画任务回报对百万环境步，颜色代表模型参数量或回放比。先在同一任务、同一横轴预算比较，再看跨任务平均；左边平均变好仍允许少数任务退化，右边更高回报则消耗了不同训练计算。

<!-- inline-evidence-v2:end -->

[图1](#rl-48-figure-1)汇总各任务结果；[图3](#rl-48-figure-3)展示世界模型与想象Actor–Critic的接口。[图4](#rl-48-figure-4)给五帧上下文和动作后预测45帧，能检查预测偏离，但视觉合理仍不等于物理正确。图6右上的模型范围为12M–400M，右下改变回放比；比较这些曲线须同时记录训练计算。

<!-- figure-ref-v6:start:rl-48-figure-1 -->
<span id="rl-48-figure-1"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/48-dreamerv3-figure-1-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/48-dreamerv3-figure-1-full.png" width="1661" height="616" alt="原论文Figure 1：左侧按基准分别标明任务数和环境步，右侧是Minecraft钻石学习过程。不同基准的柱高不可直接相加，Minecraft最大值曲线也不能代替平均表现。" loading="lazy"></a><figcaption>完整原图摘引｜Hafner等，2023/2024，Figure 1；2301.04104v2，HTML S0.F1。<a href="https://arxiv.org/html/2301.04104v2#S0.F1" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2301.04104#S0.F1" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：左侧按基准分别标明任务数和环境步，右侧是Minecraft钻石学习过程。不同基准的柱高不可直接相加，Minecraft最大值曲线也不能代替平均表现。
<!-- figure-ref-v6:end:rl-48-figure-1 -->

<!-- figure-ref-v6:start:rl-48-figure-3 -->
<span id="rl-48-figure-3"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/48-dreamerv3-figure-3-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/48-dreamerv3-figure-3-full.png" width="1800" height="759" alt="原论文Figure 3：左侧为世界模型学习，右侧为潜空间Actor–Critic学习；分别沿编码、重建和想象箭头读信息流。想象轨迹依赖学得模型，并非新增真实交互。" loading="lazy"></a><figcaption>完整原图摘引｜Hafner等，2023/2024，Figure 3；2301.04104v2，HTML Sx1.F3。<a href="https://arxiv.org/html/2301.04104v2#Sx1.F3" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2301.04104#Sx1.F3" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：左侧为世界模型学习，右侧为潜空间Actor–Critic学习；分别沿编码、重建和想象箭头读信息流。想象轨迹依赖学得模型，并非新增真实交互。
<!-- figure-ref-v6:end:rl-48-figure-3 -->

<!-- figure-ref-v6:start:rl-48-figure-4 -->
<span id="rl-48-figure-4"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/48-dreamerv3-figure-4-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/48-dreamerv3-figure-4-full.png" width="1196" height="536" alt="原论文Figure 4：上组为DMLab迷宫，下组为四足运动；每组True与Model成对保留。前5帧提供上下文，后续预测没有中间真图输入，视觉接近仍不能单独证明控制价值准确。" loading="lazy"></a><figcaption>完整原图摘引｜Hafner等，2023/2024，Figure 4；2301.04104v2，HTML Sx2.F4。<a href="https://arxiv.org/html/2301.04104v2#Sx2.F4" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2301.04104#Sx2.F4" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：上组为DMLab迷宫，下组为四足运动；每组True与Model成对保留。前5帧提供上下文，后续预测没有中间真图输入，视觉接近仍不能单独证明控制价值准确。
<!-- figure-ref-v6:end:rl-48-figure-4 -->

### 修订版配置与样本效率不能省略计算

组件消融对不同任务的影响并不相同，应与同一修订版配置一起引用，不能把版本差异当成一个受控变量。更大模型和更多replay的样本效率收益也不能直接换算成墙钟节约。

## 五、公共配置与跨任务通用性的证据边界

同一组超参数指不同任务分别训练时复用配方，不是一个模型零样本完成所有任务。必须列出哪些设置共享、哪些允许随任务改变；环境信息、预处理和动作编码也可能包含专业设计。跨任务平均与同任务样本效率不能合并成零样本或同算力结论。

### 五个前置概念

1. **Symlog**：保留符号的对数压缩。
2. **Two-hot**：在相邻离散桶分配目标概率。
3. **离散潜变量**：用离散随机编码描述隐状态。
4. **KL平衡**：分配动态与表示学习的正则压力。
5. **跨域稳健性**：在不同任务类型下保持训练有效。

## 六、三个值得继续追问的问题与参考答案

<details>
<summary>1. 固定超参数具体包括哪些，不包括哪些？</summary>

应按引用版本列出共享的学习率、损失尺度处理、优化器、熵/价值训练等算法配置，并区分网络容量、训练步数、观测/动作接口、任务包装器与评估预算。论文“固定超参数”不等于所有任务拥有相同数据量、计算量或同一个训练模型。具体是否共享某项配置，必须以原文配置表为准，不能凭口号补全。

</details>

<details>
<summary>2. 预测更清晰是否一定提高控制？</summary>

不一定。清晰图像可以忽略很小却决定接触或奖励的变量，也可能视觉合理但动力学错误；有用控制表示反而可能不追求每个像素清晰。应固定策略优化预算，对比预测保真、奖励/终止预测及真实回报，特别测试多步与分布外动作。长视频演示是模型能力线索，不能独立证明更强控制。

</details>

<details>
<summary>3. 首版与后续修订结果应怎样引用？</summary>

引用应带明确版本或发布日期，并让公式、任务数、消融与数字来自同一版本。若讨论从首版到修订的变化，逐项标明改动，不能将新版成绩配旧版训练预算。可给版本记录入口和论文固定版本链接；本文使用哪个版本的鲁棒训练与图示，应以文首和来源条目为准，未做跨版本完整复现就不推断改动的净收益。

</details>

## 七、沿未解决的问题继续读

- [MBDPO](56-mbdpo.md)：尺度稳健之后，模型内高回报搜索与价值训练的分布仍可能失配。MBDPO改为学习带行为约束的扩散动作序列，是世界模型方向的后续平行方案。（后续平行路线）

- [WorldSample](57-worldsample.md)：如果把模型经验用于真实机器人Critic，怎样控制合成错误进入价值目标？WorldSample从筛选和调度入手，进一步比较的是合成经验接口，不是V3的直接升级。（后续应用问题对照）

### 原文核对与路线出处

- [原论文与图表入口](https://arxiv.org/html/2301.04104)。修订正文鲁棒预测、symexp two-hot公式、想象学习与[图6](#rl-48-figure-6)消融。
- **本篇承接**：[Dreamer](40-dreamer.md)。本篇继承潜在想象学习，重点转向跨任务数值稳健与扩展。
- **教学对应**：[GAE](15-gae.md)。λ加权回报共享多步偏差方差思路，但Dreamer的模型内回报目标不能直接当成GAE原论文实验。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：为什么跨任务使用同一套训练配置很困难？

**参考答案**：不同任务的奖励、价值和观测尺度差异很大，同一个损失或学习率可能被大数值任务主导。DreamerV3 通过数值变换、归一化等设计改善训练尺度，例如 symlog 压缩大幅度数值，同时保留符号与顺序。

**问题 2**：多个任务使用相同配置成功，是否意味着一个模型能零样本完成它们？

**参考答案**：不是。相同训练配方可以在各任务分别训练，检验的是算法配置的通用性；单模型零样本泛化则要求无需任务训练就适应新环境。两者的训练数据、参数共享和评估条件明显不同。

[系列首页](README.md) · [上一篇](47-instructgpt.md) · [下一篇](49-dpo.md)
