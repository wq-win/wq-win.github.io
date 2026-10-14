# 第 38 天｜BEAR：限制支持范围，而不必复制行为频率

[系列首页](README.md) · [上一篇](37-bcq.md) · [下一篇](39-mbpo.md)

**原论文与版本**：*Stabilizing Off-Policy Q-Learning via Bootstrapping Error Reduction*，2019。[原论文](https://arxiv.org/abs/1906.00949)。

### 先接住前作的问题

[BCQ](37-bcq.md)限制策略在行为候选附近搜索，避免离线自举利用未知动作。BEAR沿平行路线进一步区分支持范围与行为频率：数据中少见的好动作仍值得提高概率，不应一概按行为克隆复制。它用样本MMD约束近似这个要求，但不与精确支持检测等价。

## 一、问题设定：支持里有好动作但很少见，能否增加它的概率

行为数据可能99%选择平庸动作，1%试过好动作。离线改进希望利用这1%的证据，而不是因为频率少就禁止它；同时又要拒绝完全没支持的动作。如何用有限样本和拟合行为模型区分这两种偏离，是BEAR的核心问题。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 离线、连续动作、约束Actor–Critic |
| 状态／观测 | 离线状态 |
| 动作 | 策略与行为模型采样动作 |
| 奖励或学习信号 | 数据环境奖励 |
| 终止／边界 | 固定转移终止 |

## 二、用核样本差异近似约束Actor的偏移

行为策略可能大量执行平庸动作，少量尝试好动作。离线改进希望重新分配这些已有动作的概率，却不想跑到完全无数据的区域。这就是“支持范围”与“行为频率”需要分开的原因。

BEAR用有限样本MMD约束Actor与行为样本之间的差异，再在约束内优化Q。MMD由同组与跨组核相似度构成，无需显式计算概率密度；但是精确的特征核MMD本来衡量分布差异，有限样本下近似支持约束只是论文论证与经验观察，不是严格的支持检测等价式。

行为样本通常也来自拟合模型，因此它的误差会进入约束。核带宽、样本数及拉格朗日乘子决定容许偏移的尺度：带宽过大时许多不同动作看起来相似，过小时梯度可能缺乏有用邻域信息。

### 展开同组与交叉核相似度的三项

$$\max_\pi E[Q(s,a)],\quad MMD(\pi(\cdot|s),\hat\beta(\cdot|s))\le\epsilon.$$
MMD由策略样本间、行为样本间与交叉样本的核相似度构成；核带宽改变“接近”的尺度。

**把MMD约束展开一次**：对同一状态抽策略动作 $x_1,\ldots,x_n$ 和行为模型动作 $y_1,\ldots,y_m$，原文使用的样本形式是

$$\widehat{\operatorname{MMD}}^2=\frac1{n^2}\sum_{i,i'}k(x_i,x_{i'})+\frac1{m^2}\sum_{j,j'}k(y_j,y_{j'})-\frac2{nm}\sum_{i,j}k(x_i,y_j).$$

$k$ 是核相似度：前两项衡量各自内部相似，交叉项衡量两组是否混在一起，所以只需样本而不需动作密度。上面的逐状态约束是教学简写；[原文§5式1](https://arxiv.org/html/1906.00949v2#S5)实际在数据状态上约束平均MMD，并最大化多个Critic的较小估值。因此平均满足阈值也不代表每个状态、每个动作都受到同样严格的保证。

### 核带宽改变约束看到的差别

以高斯核为例，带宽趋大时不同动作的相似度都接近1，三项MMD可接近相消；数值很小并不因此证明支持相同。比较ε阈值时必须同时报告核与动作尺度。

### 检验罕见但有支持的动作会否被漏采

以下是可手算的教学构造，不是论文实验。

数据动作分布为P(0)=0.99、P(1)=0.01，两个动作都确实出现过且Q(1)>Q(0)。复制频率会几乎总选0，支持限制则允许把质量转向1。

然而有限样本若只抽到0，MMD约束可能把1误视为偏离。将“数据中存在”变成“这批核样本能识别”，中间还有统计误差，不能省略。

## 三、在数据状态上更新价值目标与约束乘子


```text
输入固定D，拟合行为动作模型βhat
循环：
  更新Critic的原文目标
  每个状态分别采策略动作与行为动作
  计算核MMD约束量
  Actor优化高Q，惩罚超过阈值的MMD
  按实现更新约束乘子
  更新目标网络
输出：被数据支持约束的策略
```

**实现要点**：MMD是有限样本替代约束，不是精确支持集检测器。

## 四、读有限样本支持模拟与KL对照

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | 离线连续控制与不同质量数据 |
| 数据来源与规模 | 专家／混合行为等固定轨迹 |
| 对比基线 | SAC离线、BCQ等原文比较 |
| 训练预算与资源 | 各批规模与梯度预算本文未逐项核实 |
| 指标及其含义 | 真实回报、Q异常、约束效果 |
| 随机性与不确定性 | 完整种子与区间未核实 |
| 实际验证的假设 | 支持约束能否阻止自举误差扩散 |

**实验解读（本文分析）**：附录C.3[图7](#rl-38-figure-7)专门用有限样本模拟论证MMD的支持匹配直觉，且承认精确MMD会匹配整个分布。附录D为各比较方法使用相同的百万条数据，另比较KL约束与MMD。这支持特定实现的稳定性，不能证明所有核和阈值都优于KL。

### 把精确分布匹配与有限样本观察分开

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-38-figure-3 -->
<span id="rl-38-figure-3"></span>
<!-- figure-ref-v6:end:rl-38-figure-3 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/38-bear-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/38-bear-figure-3.png" width="1800" height="1800" alt="BEAR-QL及BCQ等基线在四项中等质量离线数据任务上的平均回报" loading="lazy"></a><figcaption>原论文图形摘引；Kumar等，2019，Figure 3；原HTML图形。<a href="https://arxiv.org/html/1906.00949v2#S6.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

四个面板来自中等质量数据，曲线平均五个随机种子，粉红虚线表示数据中行为的平均回报。BEAR-QL是否超过行为、以及是否比BCQ更快，要在同一面板比较；横轴一个标度单位对应1000次梯度更新，不能读成新收集的环境步。

纵轴是各任务的平均评估回报，四个面板的分值范围不同。先看橙色BEAR-QL是否高于粉红行为参照，再与蓝色BCQ比较：Walker2d、Hopper的分离比HalfCheetah明显；不能从一张好看的面板推广为所有任务恒定收益。阴影反映重复实验波动，不应仅凭带宽猜测统计显著性。

<!-- inline-evidence-v2:end -->


[图1](#rl-38-figure-1)把离线SAC的真实回报与log Q放在左右两面板，样本增加未自动消除两者分离；[图2](#rl-38-figure-2)用浅深颜色说明不同策略约束下的误差传播。MMD是实际可估的分布约束代理，不等于精确支持集检测。附录[图7](#rl-38-figure-7)的高斯与均匀分布构造检验核度量的行为，应结合带宽、有限样本数和行为模型误差理解，而不把一个小MMD值当逐动作安全证书。 [查看原文](https://arxiv.org/html/1906.00949)。

<!-- figure-ref-v6:start:rl-38-figure-7 -->
<span id="rl-38-figure-7"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/38-bear-figure-7-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/38-bear-figure-7-full.png" width="1800" height="740" alt="原论文Figure 7：四组分布设置各保留左右两张图，比较自分布与均匀支持分布的有限样本MMD。低MMD不等于精确密度匹配，还要读支持范围与样本规模。" loading="lazy"></a><figcaption>完整原图摘引｜Kumar等，2019，Figure 7；1906.00949v2，HTML A3.F7。<a href="https://arxiv.org/html/1906.00949v2#A3.F7" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1906.00949#A3.F7" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：四组分布设置各保留左右两张图，比较自分布与均匀支持分布的有限样本MMD。低MMD不等于精确密度匹配，还要读支持范围与样本规模。
<!-- figure-ref-v6:end:rl-38-figure-7 -->

<!-- figure-ref-v6:start:rl-38-figure-1 -->
<span id="rl-38-figure-1"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/38-bear-figure-1-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/38-bear-figure-1-full.png" width="1800" height="890" alt="原论文Figure 1：左图是真实回报，右图是log Q；颜色代表不同离线样本数。右侧估值越来越大并没有带来左侧收益改善，更多同类数据也不自动修复外推问题。" loading="lazy"></a><figcaption>完整原图摘引｜Kumar等，2019，Figure 1；1906.00949v2，HTML S4.F1。<a href="https://arxiv.org/html/1906.00949v2#S4.F1" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1906.00949#S4.F1" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：左图是真实回报，右图是log Q；颜色代表不同离线样本数。右侧估值越来越大并没有带来左侧收益改善，更多同类数据也不自动修复外推问题。
<!-- figure-ref-v6:end:rl-38-figure-1 -->

<!-- figure-ref-v6:start:rl-38-figure-2 -->
<span id="rl-38-figure-2"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/38-bear-figure-2-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/38-bear-figure-2-full.png" width="1270" height="465" alt="原论文Figure 2：三行依次为不约束、分布约束、仅行为策略的Q更新；箭头和三角形表示方向动作的价值。比较误差如何传播，同时留意过窄约束可能阻止改进。" loading="lazy"></a><figcaption>完整原图摘引｜Kumar等，2019，Figure 2；1906.00949v2，HTML S4.F2。<a href="https://arxiv.org/html/1906.00949v2#S4.F2" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。原版权保留。原引用定位：<a href="https://arxiv.org/html/1906.00949#S4.F2" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：三行依次为不约束、分布约束、仅行为策略的Q更新；箭头和三角形表示方向动作的价值。比较误差如何传播，同时留意过窄约束可能阻止改进。
<!-- figure-ref-v6:end:rl-38-figure-2 -->

## 五、平均MMD小不等于每个动作有支持

行为模型错误会把错误支持传入约束，有限离散样本下MMD小也不能排除危险低概率动作。核带宽、阈值与样本数必须一并报告；平均约束不是逐状态逐动作的支持保证。

### 五个前置概念

1. **行为分布**：数据采集策略的动作规律。
2. **MMD**：用核函数比较两个分布的统计量。
3. **支持约束**：限制策略到有证据的动作区域。
4. **乘子**：调节约束违反惩罚的参数。
5. **自举传播**：用错误后继价值污染当前价值。

### 继续追问：带宽、稀有动作与行为模型

<details>
<summary>1. MMD小与没有OOD动作有什么区别？</summary>

有限样本、特定核下的 MMD 只是分布差异统计量，小值不构成每个动作都在真实支持集中的保证。核过宽、少量尾部样本或生成行为模型漏模态，都可能掩盖分布外动作。理想特征核在无限数据下可区分分布，不能直接搬成有限训练的逐动作证书；还应检查支持覆盖和高价值动作附近的误差。

</details>

<details>
<summary>2. 如何选择核带宽与约束阈值？</summary>

核带宽决定对何种动作差异敏感，阈值决定允许策略偏离多少；二者需与动作归一化、维度、样本数联动。可用行为数据的训练/保留分割估计同分布MMD噪声，再以已知偏移样本检验检测力，并在独立验证任务评估收益。只调到训练约束刚好满足会过拟合统计代理，报告应含敏感性与核选择。

</details>

<details>
<summary>3. 数据多模态时行为均值为何可能危险？</summary>

若示范在障碍两侧绕行，动作均值可能指向障碍正中，虽欧氏距离小却不属于任一可行模态。行为分布建模或支持约束希望保留这些峰，而简单 MSE 拟合单一均值可能破坏它们。仍需检验生成模型有没有漏掉小模态；“用了分布模型”并不自动保证多模态覆盖。

</details>

## 六、比较约束Actor和保守Critic的作用点

- **平行动作约束**：[BCQ](37-bcq.md)。候选生成与分布约束都保护数据边界，但对稀有动作的保留方式不同。
- **平行价值路线**：[CQL](42-cql.md)。如果约束从Actor移到Critic，保守估值如何影响策略选择就是下一个问题。

- [原论文与图表入口](https://arxiv.org/html/1906.00949)。MMD定义与约束；附录C.3[图7](#rl-38-figure-7)；附录D数据与KL比较。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：支持范围约束与行为克隆有什么区别？

**参考答案**：行为克隆希望复制动作频率；支持约束希望动作位于数据能够支持的区域，却允许重新分配概率。例如好动作只占 10%，行为克隆倾向保留这个比例，而支持约束允许在有证据时更多选择好动作。

**问题 2**：使用 MMD 约束，是否就得到了精确的数据支持检测？

**参考答案**：没有。MMD 是基于有限样本与核函数的分布差异度量，实际效果取决于样本量、核和阈值。它是可计算的近似约束，仍可能排斥合理动作，或允许部分不可靠动作。

[系列首页](README.md) · [上一篇](37-bcq.md) · [下一篇](39-mbpo.md)
