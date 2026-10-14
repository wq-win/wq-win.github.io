# 第 55 天｜Dr. GRPO：两个归一化分母，怎样改变学习方向的权重

[系列首页](README.md) · [上一篇](54-dapo.md) · [下一篇](56-mbdpo.md)

**原论文与版本**：Liu 等，*Understanding R1-Zero-Like Training: A Critical Perspective*，2025。[初版正文](https://arxiv.org/html/2503.20783v1)。

### 先接住前作的问题

[第52天 GRPO](52-grpo.md)先按回答长度平均，又按组标准差缩放优势。它们看似数值处理，却让长短回答和不同难度题获得不同权重：到底偏离了什么目标？Dr. GRPO直接检查这两个分母。[第54天 DAPO](54-dapo.md)是同期并行方案，其实际token总数分母与本篇固定常数并不相同；[第5天 REINFORCE](05-reinforce.md)的基线定理只提供统计辨析，不能直接套用到含自身的组均值。

## 一、问题设定：两个分母如何改变回答与题目的权重

同样的奖励差，如果来自更长回答或不同组方差，会被原GRPO换成不同大小的token系数。因此要解释训练动态，不能只报告“用了组相对优势”，还要逐项写出损失分母。

本篇保留组内奖励差，移除标准差除法，并用固定最大长度常数归约。研究范围是这两种隐式重加权及其与基座、模板的关系；“去偏”必须带着估计对象，不能预先等同所有策略梯度意义下无偏。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 数学推理RL，GRPO的目标权重分析 |
| 状态／观测 | 题目与回答前缀 |
| 动作 | token |
| 奖励或学习信号 | 终局可验证奖励 |
| 终止／边界 | 固定最大长度与有效token掩码 |

## 二、固定长度分母并保留原始组奖励差

修正保留 $A_i=r_i-\bar r$，取消组标准差除法，并把回答长度分母改为固定生成长度预算 $L_{max}$。在固定G下，每个有效token共享常数1/(G L_max)，不会因为某条回答变长或本批token数变化而自动改变归约分母。这与DAPO按实际有效token总数归约相关但不等价。

### 固定分母中的G与最大长度

$$A_i=r_i-\bar r,\quad L\propto\frac1{G L_{max}}\sum_i\sum_{t=1}^{L_i}\min(\rho_{it}A_i,clip(\rho_{it})A_i).$$
常数不随本批实际回答长度变化。有限组中含自身的均值、裁剪与采样仍有各自统计影响。

### 固定分母保留长度对总贡献的影响

把每回答除长度改为共同常数后，同一优势下每token系数不随该回答长度缩小，但长回答仍包含更多梯度项。它去掉一种权重偏置，并不要求长短回答的总梯度向量相同。

### 固定分母与组标准差的两个手算

以下是可手算的教学构造，不是论文实验。

取G=2、L_max=10，回答长度2和8，则固定归约给所有有效token系数1/20。若下一批长度变为2和2，仍为1/20；DAPO则从1/10变为1/4，因此两者的跨批尺度不一样。

再看奖励组(0,0,0,1)，均值0.25。去标准差的优势是(−0.25,−0.25,−0.25,0.75)；若除总体标准差约0.433，则成为(−0.577,−0.577,−0.577,1.732)。标准化不只“数值好看”，还把这道题的全部贡献放大约2.31倍。

## 三、求和有效token并检查固定常数没有被换回

```text
对每题采G条回答并评分
A_i←r_i-mean_group(r)；不除组标准差
计算有效token的PPO式裁剪项
将有效项求和
除以G*固定最大长度（及明确的batch常数）
不要改成逐回答长度或本批实际token数
更新策略
记录正确／错误回答的长度与题目梯度权重
输出：修改归一化后的推理策略
```

## 四、读图6：减少错误回答长度与提高正确率不同

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | 原文数学推理基座、模板与训练配方研究 |
| 数据来源与规模 | 同题多回答与可验证奖励 |
| 对比基线 | GRPO与去除各偏差来源的版本 |
| 训练预算与资源 | 具体模型、题集和模板分开；完整成本本文未完整核实 |
| 指标及其含义 | 正确率、正确／错误回答长度、权重分布 |
| 随机性与不确定性 | 全部训练种子／区间本文未核实 |
| 实际验证的假设 | 去除特定归一化能否改变不利训练动态 |

### 图6：主要分离来自错误回答长度

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-55-figure-6 -->
<span id="rl-55-figure-6"></span>

<p class="figure-source-links">原引用定位：<a href="https://arxiv.org/html/2503.20783v1#S3.F6" target="_blank" rel="noopener noreferrer">原文</a>。</p>
<!-- figure-ref-v6:end:rl-55-figure-6 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/55-dr-grpo-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/55-dr-grpo-figure-6.png" width="1600" height="687" alt="Dr.GRPO与GRPO的奖励、回答长度及评估分数训练动态对照" loading="lazy"></a><figcaption>原论文图形摘引；Liu等，2025，Figure 6；原HTML图形。<a href="https://arxiv.org/html/2503.20783v1#S3.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>


五个面板横轴都以策略迭代步计；上排分别画训练奖励和输出token长度，下排拆成正确回答长度、错误回答长度、平均基准分数。红色Dr.GRPO和灰色GRPO奖励接近而总长度分离，进一步查看下排可定位主要差异来自错误回答变长。应把“更少无效输出”和“更高正确率”分开，后者不能仅由第二或第四面板推出。

<!-- inline-evidence-v2:end -->

[图5](#rl-55-figure-5)把两种分母表示为样本重加权；[图7](#rl-55-figure-7)与[图8](#rl-55-figure-8)改变模板、题集和基座，检查行为变化是否只由归一化决定。

<!-- figure-ref-v6:start:rl-55-figure-5 -->
<span id="rl-55-figure-5"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/55-dr-grpo-figure-5-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/55-dr-grpo-figure-5-full.png" width="1800" height="253" alt="原论文Figure 5：蓝点大小表示组内标准差倒数，橙箭头表示长度归一化后的权重；正确与错误回答的长度差会改变更新权重。这个示意说明偏置来源，不是完整性能实验。" loading="lazy"></a><figcaption>完整原图摘引｜Liu等，2025，Figure 5；2503.20783v1，HTML S3.F5。<a href="https://arxiv.org/html/2503.20783v1#S3.F5" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2503.20783v1#S3.F5" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：蓝点大小表示组内标准差倒数，橙箭头表示长度归一化后的权重；正确与错误回答的长度差会改变更新权重。这个示意说明偏置来源，不是完整性能实验。
<!-- figure-ref-v6:end:rl-55-figure-5 -->

<!-- figure-ref-v6:start:rl-55-figure-7 -->
<span id="rl-55-figure-7"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/55-dr-grpo-figure-7-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/55-dr-grpo-figure-7-full.png" width="1800" height="498" alt="原论文Figure 7：三列分别采用R1模板、Qwen-Math模板和无模板，颜色标明题集。模板与题集共同改变训练曲线，不能把所有变化归给归一化公式。" loading="lazy"></a><figcaption>完整原图摘引｜Liu等，2025，Figure 7；2503.20783v1，HTML S3.F7。<a href="https://arxiv.org/html/2503.20783v1#S3.F7" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2503.20783v1#S3.F7" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：三列分别采用R1模板、Qwen-Math模板和无模板，颜色标明题集。模板与题集共同改变训练曲线，不能把所有变化归给归一化公式。
<!-- figure-ref-v6:end:rl-55-figure-7 -->

<!-- figure-ref-v6:start:rl-55-figure-8 -->
<span id="rl-55-figure-8"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/55-dr-grpo-figure-8-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/55-dr-grpo-figure-8-full.png" width="1800" height="974" alt="原论文Figure 8：左图更换基座模型，右图对比算法；右图实线读准确率，虚线读右轴回答长度。准确率相近与输出长度分离可以同时发生。" loading="lazy"></a><figcaption>完整原图摘引｜Liu等，2025，Figure 8；2503.20783v1，HTML S3.F8。<a href="https://arxiv.org/html/2503.20783v1#S3.F8" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2503.20783v1#S3.F8" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：左图更换基座模型，右图对比算法；右图实线读准确率，虚线读右轴回答长度。准确率相近与输出长度分离可以同时发生。
<!-- figure-ref-v6:end:rl-55-figure-8 -->

### 先固定基座和模板，再谈归一化的净收益

基座与模板对照显示，部分表面RL增益可能是在恢复被模板压低的基线。应固定基座、模板和评价协议，再讨论算法净改善；特定1.5B控制实验也不足以外推到所有模型。

## 五、移除两种权重之后仍存在哪些统计与优化影响

这里的去偏针对长度与难度归一化，不包含所有基线、裁剪或离策略复用偏差。同组均值包含样本自身，简单独立样本推导仍有(G−1)/G因子；固定常数也改变整体梯度尺度，公平对照需核对学习率和优化器。错误回答增长减少也不表示所有长推理无用。

### 五个前置概念

1. **长度归一化**：按样本token数缩放损失。
2. **难度归一化**：组奖励标准差隐含的题目权重。
3. **固定分母**：不随当前回答长度变化的归约。
4. **组均值基线**：同题奖励平均。
5. **偏差定义**：必须指明偏离哪个目标或估计量。

## 六、三个值得继续追问的问题与参考答案

<details>
<summary>1. 固定最大长度变化时是否需同步调学习率？</summary>

若损失以固定 $L_{max}$ 作分母，仅改变该分母会整体缩放梯度，理想简单SGD可用反向调整学习率补偿。但实际还受梯度裁剪、Adam状态、KL权重以及输出长度分布改变影响，不一定完全等价。应区分“只改归一化常数”和“同时允许更长生成”，分别测梯度范数与有效步长，再决定是否重调。

</details>

<details>
<summary>2. 去掉标准差后各难度题梯度如何分配？</summary>

去除按题标准差缩放后，权重不再被低方差组额外放大；二值结果下，原始中心化奖励及各题出现频率共同决定贡献，混合成败组仍有信号，全同组仍为零。难度与梯度并非因此完全解耦，因为成功概率、组规模和策略score仍影响估计。应按题难度记录梯度规模，不能把去标准差等同于每道题权重完全相同。

</details>

<details>
<summary>3. 哪些偏差仍未被此修改消除？</summary>

它针对长度分母与组标准差造成的特定重加权，不消除有限样本的组均值依赖、旧策略数据复用、clip、奖励错误、任务采样偏移或函数逼近误差。若保留KL项，也是在优化带正则目标。引用“无偏”必须说明估计对象与假设，不能把两个归一化修正扩大成所有策略梯度意义下无偏。

</details>

## 七、沿未解决的问题继续读

- [FACTOR](58-factor.md)：统一系数改为动作和token级分配后，保持的究竟是总信用还是梯度向量？FACTOR提供后续分配约束，对照本篇能继续检查“分母只是数值细节”的误解。（后续教学对照）

- [TTPO](59-ttpo.md)：若选择不同token进入负向更新，除了长度分母还增加了什么信息和偏差？TTPO引入伪答案教师与筛选，属于测试时适应的平行问题。（后续问题对照）

### 原文核对与路线出处

- [原论文与图表入口](https://arxiv.org/html/2503.20783v1)。§3.2固定分母推导、[图6](#rl-55-figure-6)长度动态及基座/模板控制实验。
- **本篇承接**：[GRPO](52-grpo.md)。本篇保留组内奖励差，移除两种归一化来源。
- **并行路线**：[DAPO](54-dapo.md)。共同关心token权重，分母和采样系统不同。
- **教学对应**：[REINFORCE](05-reinforce.md)。动作无关基线定理帮助检查无偏性；组内含自身基线不能直接照搬该条件。

- 教学阅读：[GRPO Trainer](https://huggingface.co/docs/trl/main/en/grpo_trainer)。仅借用本节的解释顺序与接口视角；具体算法、版本和实验以本篇原论文为准。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：长度归一化怎样改变同优势回答的 token 权重？

**参考答案**：两条回答长度为 10 和 100，优势都为 1。若每回答先平均，再对两回答平均，每个 token 的系数分别是 $1/20$ 和 $1/200$。长回答每个 token 的系数更小，尽管两条回答总系数相同。

**问题 2**：去掉长度与标准差归一化，是否就得到严格无偏梯度？

**参考答案**：只能说移除了这两种特定的隐式权重来源。组均值是否包含自身、裁剪、采样筛选、有限样本和其他正则项仍会影响估计。评价“无偏”必须先说明相对于哪个目标、哪种梯度定义。

[系列首页](README.md) · [上一篇](54-dapo.md) · [下一篇](56-mbdpo.md)
