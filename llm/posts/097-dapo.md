# 097｜DAPO：让长推理强化学习真正训练起来的四处修改

[返回目录](README.md) · [发展时间线](00-发展时间线总览.md)

**论文**：Yu 等，*DAPO: An Open-Source LLM Reinforcement Learning System at Scale*，2025。[原文](https://arxiv.org/abs/2503.14476) · [正文 v1](https://arxiv.org/html/2503.14476v1) · [作者项目页](https://dapo-sia.github.io/) · [训练框架](https://github.com/volcengine/verl)。

### 先接住前作的问题

[DeepSeekMath](086-deepseekmath.md)以同题奖励差代替价值网络，本篇直接继承GRPO，追问全对全错、损失归约和截断处理如何削弱信号。[R1](094-r1.md)提供长推理历史对照，但步数更少不自动等于训练算力更省。

## 一、问题设定：同样GRPO公式下，学习信号会在哪些实现环节消失

这是在线、无模型、单语言策略RL：状态是题目和前缀，动作是token，回答结束或到上限后得到结果奖励。起点为Qwen2.5-32B基础模型，约17K道整理数学题；问题是如何让有效比较信号真正进入更新，而非只保留同名目标公式。

数据来源包括 AoPS 与竞赛题。作者将答案改成整数形式，以减少表达式解析与等价判断的错误。例如把最终形式为分式或根式的题改成询问若干系数之和。这能简化验收，但改题是否保留唯一解、形式约束是否充分，仍需检查；整数奖励不等于没有数据错误。

正确答案奖励为 1，错误为 -1。组内标准化后，关注的是同题不同尝试的相对表现。完整方法去掉参考策略 KL 惩罚，允许较大行为变化；这个选择适用于作者的数学实验，不是对通用偏好训练中 KL 作用的普遍否定。

## 二、分开裁剪、有效题组、token权重与长度奖励

### 1. 非对称裁剪：给成功的低概率动作多一点空间

定义 token 概率比 $\rho_{i,t}=\pi_\theta(o_{i,t}|q,o_{i,<t})/\pi_{old}(o_{i,t}|q,o_{i,<t})$。DAPO 将裁剪区间改成 $[1-\epsilon_{low},1+\epsilon_{high}]$，实验用 $\epsilon_{low}=0.2$、$\epsilon_{high}=0.28$。

对于正优势 token，较高上界让提高其概率的目标在更大区间继续起作用。论文用 0.01 与 0.9 的旧概率说明相对裁剪对小概率动作的绝对增量更小。必须补充：PPO 裁剪约束的是替代目标，不是参数更新后的概率硬边界；0.9 乘 1.2 得到 1.08 也不是一个合法的新概率。

### 2. 动态采样：补足有比较信号的题组

每题采样 $G$ 个回答，若正确数为零或 $G$，该题组被排除，继续采样直到有效批次填满。若标准化奖励全相同，常规实现中的优势没有有效比较信号；保留足够多混合成败的题，能避免批次里真正参与更新的样本不断变少。

这不是“删除所有答对答案”。被保留的是整道题组，其中正确和错误回答都参与相对更新。它也改变了实际训练分布：更偏向当前模型有一定成功机会、但尚未完全掌握的题；极难题可能被长期排除。

#### 动态采样不是均匀删题，而是在改变课程分布

假设固定策略对题目 $q$ 的单次正确概率为 $p_q$，同组 $G$ 个回答条件独立。只有全错或全对会被筛除，所以题组的保留概率为

$$a_G(p_q)=1-(1-p_q)^G-p_q^G.$$

两项分别是全错、全对的概率。若原始抽题分布为 $d(q)$，反复抽取直到获得有效组，则保留题目的边际分布正比于 $d(q)a_G(p_q)$。这条式子描述选择效应，不是作者额外训练的难度预测器；实际有限采样、相关生成和变化中的策略都会影响近似。

**原创教学核算。** 用实验的 $G=16$，$p_q=0.5$ 时保留概率约0.99997，几乎每组都有效；$p_q=0.01$ 或0.99时只有约0.14854。若反复采样同样成功率的题，平均约 $1/0.14854=6.73$ 组才得到一组有效数据。生成不是免费发生的：这相当于期望约108条回答换16条有效组内回答，还没计长度差异。

公式揭示它同时淡化极难与极易题，而非只跳过已经掌握的题。论文[图6](#llm-v6-097-figure-6)在所测同步系统仍报告更快收敛，说明额外采样成本可能被减少无效更新和调度特性抵消；不能由该实例推成保留率趋近零时仍然高效。复现应该同时记录抽到的题分布与保留的题分布，才知道课程是否悄悄只剩中等难度。

### 3. Token 级平均：不要让长序列的每一步自动变轻

朴素做法先对每条回答取平均，再对回答取平均。DAPO 改为汇总全部有效 token：

$$
J=\mathbb E\left[\frac{1}{\sum_i L_i}\sum_i\sum_{t=1}^{L_i}
\min\{\rho_{i,t}A_i,\operatorname{clip}(\rho_{i,t},1-\epsilon_{low},1+\epsilon_{high})A_i\}\right].
$$

$L_i$ 是回答长度，$A_i$ 是组内标准化奖励。长回答因此有更大总权重，但单个 token 不因所在回答更长而自动稀释。这会改变训练目标的加权方式，不应称为纯粹等价的代码优化。它也不等于逐 token 都有独立正确性标签：同一回答仍共享结果优势。

### 4. 超长奖励：区分不会做与没有写完

作者先实验屏蔽被截断样本的损失，减少把未完成推导判成错误的噪声；进一步加入软长度惩罚。在不超过 16384 token 时不罚，随后 4096 token 缓冲区内逐渐降至 -1，总上限 20480。

$$
R_{len}(L)=\begin{cases}
0,&L\le16384,\\
-(L-16384)/4096,&16384<L\le20480,\\
-1,&L>20480.
\end{cases}
$$

这是给定预算下的偏好，不是数学真值。错误原因的区分能降低奖励噪声，但过严长度惩罚也可能不利于真正需要长推导的题。

**自构例子。** 两条回答分别长 100 和 1000 token。先对回答平均时，短回答每 token 的系数是 $1/200$，长回答是 $1/2000$；改成全 token 平均后，两者都是 $1/1100$。这是权重重分配，并不是在长回答里新增了更准确的监督。

### 裁剪上界不是训练后概率的硬上限

取正优势1、旧概率0.1，当前比率1.4时，未裁剪项1.4、上界裁剪项1.28，目标选较小者1.28，对这条样本的该分支不再提供继续推高的梯度。共享参数仍受其它token更新影响，所以更新后概率未必恰好停在0.128；必须把代理目标平台与参数可行域分开。

## 三、固定旧策略采样并记入被丢弃题组的成本

```text
输入：基础策略、数学问题与整数答案、目标有效批次
在本轮采样期间固定旧策略
重复抽取问题，每题生成 16 条回答：
    验证最终答案，记录正确数、长度、是否截断
    排除全对或全错的题组
    将混合成败题组加入有效缓冲区
直到有效批次达到要求
计算结果奖励与适用的长度处理，形成组相对优势
以非对称裁剪、全部有效 token 平均的目标更新
清空本轮缓冲，刷新旧策略
同时记录验证正确率、熵、截断率及全部采样 token
输出：更新后的推理策略
```

## 四、用累计消融与动态曲线辨别组件交互

累计表给的是在已有组件上的增量，熵与长度曲线解释训练动态；动态采样的废弃回答也必须计入总生成预算。

| 项目 | v1 设置与解释 |
|---|---|
| 任务 | DAPO-Math-17K 训练，主要报告 AIME 2024；不是广泛机器人或开放式语言任务验证 |
| 基础模型 | Qwen2.5-32B Base，使用 verl 实现 |
| Rollout | 提示批次 512，每题 16 个回答；动态采样可能额外生成被筛除的题组 |
| 更新 | 小批次 512 个回答，每轮 rollout 对应 16 次梯度更新 |
| 优化 | AdamW，学习率 $10^{-6}$，20 个 rollout 步线性预热 |
| 长度 | 期望上限 16384、缓冲 4096、生成最大 20480 |
| 评价 | AIME 重复 32 次，报告 avg@32，温度 1.0、top-p 0.7；不是多数投票成绩 |
| 基线 | 作者朴素 GRPO 与逐项累计修改；另引用 R1-Zero-Qwen-32B 的 47 分 |
| 预算限制 | 跨报告比较给训练步数，不能确认完整等 token、等算力或等调参预算 |
| 不确定性 | 32 次回答重复有助减少采样波动；正文未给多个独立完整训练种子的主表置信区间 |

**证据 1：[表1](https://arxiv.org/html/2503.14476v1#S4.T1)，整体配方。** GRPO 为 30，加入超长过滤后 36，再加 Clip-Higher 为 38，软长度惩罚后 41，token 级损失后 42，动态采样后 50。这是逐步累计实验，新增收益依赖已有组件；不能说动态采样在任何 GRPO 上都必定增加八分，也不能据此忽略组件交互。

**证据 2：[图2](#llm-v6-097-figure-2)，熵塌缩。** 对照展示 Clip-Higher 后策略熵与准确率更有利的训练轨迹。它支持作者设置中探索退化被缓解，不是熵越大越好。[图7](#llm-v6-097-figure-7) 和正文也指出过高熵可能对应乱码、重复与无效探索。 熵、长度、奖励与验证准确率是分开的监控量；先看每幅图的纵轴再判断变化，尤其不能用训练奖励上涨替代留出题正确率。

<!-- figure-ref-v6:start:097-f7-4 -->
<a id="llm-v6-097-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/097-dapo-f7-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/097-dapo-f7-v6.png" width="2424" height="1624" alt="DAPO训练过程中回答长度、奖励、熵和平均概率的四组曲线" loading="lazy"></a><figcaption>原文图形摘引：Yu 等，2025，图7，PDF第10页；<a href="https://arxiv.org/html/2503.14476v1#S4.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>
<!-- figure-ref-v6:end:097-f7-4 -->

<!-- figure-ref-v6:start:097-f2-3-anchor -->
<a id="llm-v6-097-figure-2"></a>
<!-- figure-ref-v6:end:097-f2-3-anchor -->

<figure class="reading-evidence-figure"><a href="/llm/assets/papers/097-dapo-f2.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/097-dapo-f2.png" width="2224" height="733" alt="DAPO启用Clip-Higher后的AIME准确率和生成策略熵曲线" loading="lazy"></a><figcaption>原实验图摘引：Yu 等，2025，图2；<a href="https://arxiv.org/html/2503.14476v1#S2.F2" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

**证据 3：[图4](#llm-v6-097-figure-4)、[图5](#llm-v6-097-figure-5)，长度与奖励。** token 级平均和超长处理使训练动态改善。尤其是截断样本过滤，不需要先发明复杂奖励模型，便能降低一种确定存在的标注混淆。但长度曲线健康只是诊断信号，不能代替独立正确率。

<!-- figure-ref-v6:start:097-f5-6 -->
<a id="llm-v6-097-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/097-dapo-f5-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/097-dapo-f5-v6.png" width="2424" height="800" alt="DAPO超长回答过滤对AIME准确率和生成熵的影响" loading="lazy"></a><figcaption>原文图形摘引：Yu 等，2025，图5，PDF第7页；<a href="https://arxiv.org/html/2503.14476v1#S3.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>
<!-- figure-ref-v6:end:097-f5-6 -->

<!-- figure-ref-v6:start:097-f4-5 -->
<a id="llm-v6-097-figure-4"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/097-dapo-f4-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/097-dapo-f4-v6.png" width="2424" height="800" alt="DAPO是否使用token级损失时生成熵及平均回答长度的变化" loading="lazy"></a><figcaption>原文图形摘引：Yu 等，2025，图4，PDF第6页；<a href="https://arxiv.org/html/2503.14476v1#S3.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>
<!-- figure-ref-v6:end:097-f4-5 -->

**证据 4：[图6](#llm-v6-097-figure-6)，动态采样效率。** 作者报告额外采样没有显著拖慢该同步系统，并更快达到目标表现。解释涉及长尾回答主导生成等待时间，因此硬件利用与调度很重要；换成不同异步系统或更低有效组比例，结论可能改变。

<!-- figure-ref-v6:start:097-f6-1-anchor -->
<a id="llm-v6-097-figure-6"></a>
<!-- figure-ref-v6:end:097-f6-1-anchor -->

<figure class="reading-evidence-figure"><a href="/llm/assets/papers/097-dapo-f6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/097-dapo-f6.png" width="1600" height="800" alt="DAPO启用动态采样前后达到相近AIME表现所需训练步数" loading="lazy"></a><figcaption>原实验图摘引：Yu 等，2025，图6；<a href="https://arxiv.org/html/2503.14476v1#S4.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

**证据 5：[图1](#llm-v6-097-figure-1) 与 §4.3，步数与泛化。** 作者比较 50 分与 R1-Zero-Qwen-32B 的 47 分，并称使用约一半训练步数。每步采样与更新量不同，不能将其写成成本减少一半。§4.3 还指出训练奖励与验证正确率相关性可能很低，直接反对“奖励曲线涨了就说明泛化变好”的理解。

<!-- figure-ref-v6:start:097-f1-7 -->
<a id="llm-v6-097-figure-1"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/097-dapo-f1-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/097-dapo-f1-v6.png" width="1800" height="720" alt="DAPO训练步数与AIME2024平均、任一及共识正确率" loading="lazy"></a><figcaption>原文图形摘引：Yu 等，2025，图1，PDF第1页；<a href="https://arxiv.org/html/2503.14476v1#S0.F1" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>
<!-- figure-ref-v6:end:097-f1-7 -->

## 五、可验证数学与奖励边界限制配方泛化

五个前置概念：**策略熵** 描述输出分布的分散程度；**重要性比率** 比较新旧策略对已采动作的概率；**组相对优势** 使用同题候选作基线；**损失归约** 决定不同样本与 token 的权重；**奖励塑形** 在任务结果之外加入辅助反馈。

DAPO 的贡献是把长期推理 RL 的几个实现选择明确写成可检查的配方，同时提供代码与数据入口。新意既包括目标函数权重，也包括样本选择与奖励处理，不只是一个算法缩写。

数学数据的易验收性是成功条件之一，迁移到开放式对话需要重新设计反馈。动态采样降低无信号更新，却可能漏掉需要课程或示范才能突破的难题。去除 KL 容许偏离，也需要检查通用能力是否受损；v1 的窄主评估不足以回答所有遗忘问题。

本文的分析是，这些修改共同处理“学习信号在哪里损失了”。优秀实现应把原始采样数、有效题比例、截断率、总 token、更新数与验证成绩一起记录，才能区分优化更有效和只是使用了更多样本。

## 六、将训练信号账本与部署推理账本分开核算

用[推理评估协议](100-tts-protocol.md)继续核算最终部署，但先保留本篇训练账本：被丢弃题组、长回答和奖励检查都花了资源。训练收敛步数与用户一次回答成本不能相互替代。

## 七、自测与答案

**1. 动态采样为什么保留“同题有对有错”，而不是只保留正确回答？**

答：组相对优势需要比较。全对或全错时结果奖励没有相对差异；混合成败同时提供提高成功轨迹、抑制失败轨迹的信号。只保留正确答案会破坏这种组内比较。

**2. Clip-Higher 是否保证新策略概率不超过旧概率的 1.28 倍？**

答：不保证。它裁剪替代目标，使某些方向的奖励不再继续增加；共享参数、多样本更新等仍可能使概率越界。它不是一个对最终概率作硬投影的约束。

**3. token 级平均与软长度惩罚是否互相矛盾？**

答：不矛盾。前者处理各 token 如何参与梯度，后者表达超出预算的代价；长回答可以得到充分学习权重，同时在越过长度阈值时受罚。但二者交互需要消融，不能只凭直觉确定最优组合。
