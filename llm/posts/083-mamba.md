# 083｜Mamba：用选择性的状态压缩，重新挑战注意力架构

[返回目录](README.md) · [发展时间线](00-发展时间线总览.md)

论文：Albert Gu、Tri Dao，*Mamba: Linear-Time Sequence Modeling with Selective State Spaces*，2023。采用[论文 v2](https://arxiv.org/html/2312.00752v2)；DNA、音频作为适用边界的补充证据。实现见[官方代码](https://github.com/state-spaces/mamba)。

<!-- figure-ref-v6:start:llm-license-083-mamba -->
图表来源：Albert Gu、Tri Dao，2023，[原文](https://arxiv.org/html/2312.00752v2)；[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。本篇展示做了图形区域裁切、PNG格式转换、按原图面板顺序拼合，图中数据与标签未改动。
<!-- figure-ref-v6:end:llm-license-083-mamba -->

### 先接住前作的问题

[Transformer](015-transformer.md)保存位置并允许直接读取历史，循环状态则压缩历史但可能混入噪声。Mamba提供平行架构，让状态空间更新依据输入选择内容；[Mamba-2](088-mamba2.md)随后直接承接这一路线，继续解决扫描的硬件执行效率。

## 一、问题设定：固定状态压缩历史时，怎样按内容选择记什么

固定卷积核会用同一种规则处理有用内容与干扰，完整KV又随历史增长。本篇在固定大小状态里引入内容选择，并要求这种输入相关递推仍可高效训练；记忆选择与执行算法必须同时成立。

## 二、从时不变递推转到输入相关写入、保留与读出

普通线性时不变 SSM 的递推是

$$
h_t=\bar A h_{t-1}+\bar Bx_t,\qquad y_t=Ch_t.
$$

$h_t$ 是状态，$x_t$ 是输入，$y_t$ 是输出；$\bar A$ 控制旧状态演化，$\bar B$ 控制写入，$C$ 控制读出。这些矩阵不随位置或输入变化时，整个序列变换可写成固定卷积，因此能够使用高效卷积计算。

但固定间隔复制与选择性复制不同。前者可能只需“把 20 步以前的东西搬过来”，后者要求“记住带标记的字符，忽略中间数量不定的空白”。若动力学完全固定，就难以根据当前内容决定这一步是否应推进记忆。

Mamba 的论点是：状态压缩质量取决于选择能力。这个说法是模型设计动机，不是固定容量能够解决所有记忆任务的证明。与强化学习中的环境状态模型不同，这里的 SSM 是神经序列层；训练仍主要采用下一 token 预测。

### 1. 让部分参数成为输入的函数

Mamba 将 $B_t,C_t,\Delta_t$ 设为输入相关量，保留结构化的 $A$。典型离散化为

$$
\bar A_t=\exp(\Delta_tA),\qquad
\bar B_t=(\Delta_tA)^{-1}(\exp(\Delta_tA)-I)\Delta_tB_t.
$$

然后用 $h_t=\bar A_th_{t-1}+\bar B_tx_t$ 更新。这里写的是论文用于解释的零阶保持离散化关系；实际实现会利用对角结构和融合计算，不能照字面为每个 token 做一般矩阵求逆。

$\Delta_t$ 经 softplus 保持为正，可以理解为对当前输入的有效处理时长。稳定衰减的 $A$ 下，较小 $\Delta_t$ 更接近保留旧状态，较大值更强调当前信息。$B_t$ 控制写入方向，$C_t$ 控制读出。虽然递推对给定系数下的状态是线性的，但系数依赖输入，完整模型不再是线性时不变系统，也不再对应一个固定卷积核。

### 2. 一个能手算的门控联系

§3.5 定理 1 取一维状态、$A=-1,B=1$，并设 $\Delta_t=\operatorname{softplus}(u_t)$，可得到

$$
h_t=(1-g_t)h_{t-1}+g_tx_t,\qquad g_t=\sigma(u_t).
$$

原因是 $e^{-\operatorname{softplus}(u)}=1-\sigma(u)$。这给出了门控循环与连续系统离散化之间的具体联系，而不是说完整 Mamba 就是一维平均器。真实层有多个通道、更高维状态和输入相关写读参数。

#### 把门控展开，才能看见信息到底怎样被遗忘

在上述标量特例中，从 $h_0=0$ 出发，连续代入递推可得

$$h_t=\sum_{j=1}^{t}\left[g_j\prod_{k=j+1}^{t}(1-g_k)\right]x_j.$$

第 $j$ 个输入的系数同时包含当时的写入门 $g_j$ 和后来每步的保留门 $1-g_k$；空乘积定义为1。因而“当时记住了”不保证“后来仍保住了”。系数和为 $1-\prod_{k=1}^{t}(1-g_k)$，剩余权重对应初始状态；在门值落于 $[0,1]$ 的这个特例中，状态是有泄漏的加权记忆，而非任意放大器。完整 Mamba 的向量写入、读出没有这个简单凸组合限制。

**原创教学算例。** 先写入数值7，之后20个零输入均取 $g=0.1$，旧信息只剩 $7\times0.9^{20}\approx0.851$。若后20步的门降到0.001，则留下 $7\times0.999^{20}\approx6.861$。差异来自每一步微小泄漏的乘积，而不只是“有没有一次忘记”。同理，若噪声错误地打开门，较大的写入值会覆盖旧信息；选择机制需要学对，不能仅靠存在一个门就保证长记忆。

原文的选择性复制消融因此更有针对性：随机间隔迫使模型决定何时更新状态，固定距离卷积的捷径变弱。但这个实验没有要求在固定维度中同时存下任意多独立事实，所以不能把成功外推成无限容量。

### 3. 失去卷积以后，用扫描恢复并行性

将一步递推写为仿射映射 $f_t(h)=a_t\odot h+b_t$。两步复合仍是同类映射：

$$
(a_2,b_2)\circ(a_1,b_1)
=(a_2\odot a_1,\ a_2\odot b_1+b_2).
$$

函数复合满足结合律，所以训练时可以使用并行前缀扫描，而无需在 Python 中串行循环所有 token。输入相关系数并不破坏这个结合性，因为它们可由当前层的已知输入预先求出。

如果把每个位置的全部扩展状态写入显存，仍会有巨大的读写成本。论文将离散化和扫描融合，利用片上存储，并在反向传播时重算部分中间量。这是实现收益的重要来源；“复杂度是线性”不足以保证任意朴素代码都快。

### 4. 网络块还包含局部处理和门控

Mamba 块用输入投影、局部卷积、激活、选择性 SSM、另一分支的门控和输出投影组合，外层继续使用归一化与残差。所谓没有独立 MLP 块，不表示没有线性投影或非线性变换。

固定状态意味着其大小不随历史长度增长，但仍随层数、通道和状态维度增长；局部卷积也有缓存。它不是“推理无需内存”。

**自构例子。** 用前面的一维门控式，初始 $h=0$，需记的数值为 7，设 $g=1$，则状态变 7。后面来了三个噪声值，若都取 $g=0$，状态仍是 7；固定 $g=0.5$ 则会不断混入噪声。这解释了选择的作用，但一维状态无法无损保存任意多个独立数字；完整模型需要更多状态和训练学习如何分配它们。

### 扫描需要结合律，并不需要交换次序

固定当前输入确定的系数，把两步写成f₁(h)=0.5h+2、f₂(h)=0.2h+3，顺序复合为0.1h+3.4；反过来则为0.1h+3.5。并行扫描可以重组括号，却不能任意打乱时间顺序。输入相关系数预先计算好后仍可做这样的复合，不代表整个输入到输出映射是全局线性。

## 三、用结合扫描和融合内核执行选择性状态更新

```text
输入：序列 X，上一轮生成保存的状态（推理时）
对每个 Mamba 层：
    归一化并投影，形成主分支与门控分支
    主分支经过局部因果卷积和激活
    从主分支预测每位置的 B、C、正值 Delta
    对结构化 A 做离散化，得到递推系数
    训练：用融合并行扫描计算各位置输出
    生成：仅更新当前 SSM 状态和局部卷积状态
    将读出结果与门控分支结合，输出投影并加残差
用语言模型头预测下一 token，计算交叉熵
输出：预测分布；生成时保留固定尺寸的层状态
```

## 四、分别检验选择任务、语言质量和系统吞吐

选择复制消融检验记忆机制，语言任务检验迁移，吞吐图检验具体实现；三种证据不能由一个大O式互相替代。

| 实验 | 设置、预算与作用 |
|---|---|
| 选择性复制 | 改变需记忆字符间隔，比较网络块与内部序列层组合，检查选择机制是否解决固定间隔捷径 |
| 关联回忆 | §4.1：两层模型、训练长度 256、词表 16；测试长度 64 到 1,048,576，Mamba 宽度 64，其他模型 128 |
| 语言缩放 | Pile，约 125M—1.3B，按 Chinchilla 训练量比较标准 Transformer、改良 Transformer++ 及其他序列架构 |
| 下游模型 | [表1](https://arxiv.org/html/2312.00752v2#S4.T1)：Mamba、Pythia、RWKV 同 tokenizer/数据和 300B token；Mamba/Pythia 上下文 2,048，RWKV 为 1,024 |
| 模块消融 | 约 350M 模型、计算适配的 token 预算，检查选择参数与层结构 |
| 吞吐 | 附录 E.5：A100 80GB PCIe，输入 2,048、生成 128，批量 1—128；重复测量 3 次取平均 |
| 核心算子 | 批量 1、维度 1,024、状态维度 16、BF16；比较扫描、卷积和 FlashAttention-2，未含全部网络投影 |

质量结果中的最大训练语言模型约 2.8B；吞吐表还出现未训练的 6.9B Mamba，仅用于计时。不能用它推导一个已经验证质量的 6.9B 模型。计时重复次数也不是模型训练随机种子数。

**证据一｜[图4](#llm-v6-083-figure-4)、定理 1：改动确实进入了序列记忆机制。** 相同 Mamba 外部块，内部 S4 的选择性复制准确率为 56.4，换成 S6 为 99.8；无门控外部块从 S4 的 18.3 到 S6 的 97.0。它支持内部选择机制的重要性，而非只靠多一个外围乘法门。定理给出特殊条件下的精确联系，实验则展示具体任务效果，二者证据性质不同。 选择复制与归纳头图是合成能力测试，速度图另测实现；音频图还给出时不变结构更合适的反例，不能把一种架构的优势泛化到所有模态。

<!-- figure-ref-v6:start:083-f4-3-anchor -->
<a id="llm-v6-083-figure-4"></a>
<!-- figure-ref-v6:end:083-f4-3-anchor -->

<figure class="reading-evidence-figure"><a href="/llm/assets/papers/083-mamba-f4.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/083-mamba-f4.png" width="816" height="714" alt="Mamba选择性复制任务中内部序列层及外部结构组合的准确率" loading="lazy"></a><figcaption>实验结果表摘引：Albert Gu、Tri Dao，2023，PDF第11页表1（HTML转排标作图4）；<a href="https://arxiv.org/pdf/2312.00752v2#page=11" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

**证据二｜[表1](https://arxiv.org/html/2312.00752v2#S4.T1)：相近训练口径下有竞争力，但不是所有 Transformer。** Mamba-2.8B 平均下游准确率 63.3，Pythia-2.8B 为 59.1，差 4.2 个百分点；Pythia-6.9B 为 61.7。它支持在这批开放模型和任务上的参数效率。不同模型训练配方并不完全相同，也没有在这里验证几十或数百 B 参数的同样优势。

**证据三｜[表2](https://arxiv.org/html/2312.00752v2#S4.T2)、[图13](#llm-v6-083-figure-13)：参数选择协同改善语言建模。** Mamba 块使用实数 S4 时困惑度 10.56，选择性 S6 为 8.69；另一组选择参数消融中，全固定为 10.93，仅 $\Delta$ 选择为 9.81，三项都选择为 8.71。支持选择机制不仅对合成题有效；两组数值属于不同配置，不应拼成单一逐步训练轨迹。

<!-- figure-ref-v6:start:083-f13-5 -->
<a id="llm-v6-083-figure-13"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/083-mamba-f13-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/083-mamba-f13-v6.png" width="1470" height="534" alt="Mamba对步长、输入和输出参数分别启用选择性的困惑度消融" loading="lazy"></a><figcaption>原文图形摘引：Albert Gu、Tri Dao，2023，图13（PDF第16页表7）；<a href="https://arxiv.org/html/2312.00752v2#S4.F14.fig1" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:083-f13-5 -->

**证据四｜[图12](#llm-v6-083-figure-12) 与附录 E.5：速度取决于比较层级。** 作者报告 4—5 倍生成吞吐，主要收益之一是没有增长的 KV，能容纳更大批量。核心扫描则与 FlashAttention-2 比较，端到端生成基线采用 Hugging Face 的标准 GPT-3 架构实现，不能说完整系统全面快于所有优化推理引擎。[表7](https://arxiv.org/html/2312.00752v2#A5.T7) 的训练显存中，批量 32 的 125M Mamba 为 38.2GB，优化 Transformer 为 34.5GB，Mamba 并非处处更省训练显存。

<!-- figure-ref-v6:start:083-f12-6-anchor -->
<a id="llm-v6-083-figure-12"></a>
<!-- figure-ref-v6:end:083-f12-6-anchor -->

<figure class="reading-evidence-figure"><a href="/llm/assets/papers/083-mamba-f12.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/083-mamba-f12.png" width="2224" height="512" alt="Mamba扫描核心耗时与端到端生成吞吐的两组硬件比较" loading="lazy"></a><figcaption>原实验图摘引：Albert Gu、Tri Dao，2023，图12；<a href="https://arxiv.org/html/2312.00752v2#S4.F12" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

两个长序列边界值得另记。[图5](#llm-v6-083-figure-5) 的百万长度成功是词表 16 的合成关联任务，不是百万 token 自然语言理解；附录[表5](https://arxiv.org/html/2312.00752v2#A5.T5) 的 DNA 分类中，1.4M Mamba 在长度 $2^{14}$ 时 27.66，HyenaDNA 为 41.17，直到最长设置 Mamba 才明显领先。长上下文能力应按任务和长度具体阅读。

<!-- figure-ref-v6:start:083-f5-8 -->
<a id="llm-v6-083-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/083-mamba-f5-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/083-mamba-f5-v6.png" width="1800" height="840" alt="Mamba及各序列模型在归纳头任务中的超长序列外推准确率" loading="lazy"></a><figcaption>原文图形摘引：Albert Gu、Tri Dao，2023，图5（PDF第11页表2）；<a href="https://arxiv.org/html/2312.00752v2#S4.F5.fig2" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:083-f5-8 -->

## 五、有限状态与模态差异限制无损长记忆主张

理论门控联系解释了参数作用，消融支持机制选择，系统测量说明实现可行；它们共同构成贡献，而非一张吞吐图独立证明架构全面更好。

固定状态需要丢弃信息。如果未来问题需要此前被过滤的细节，模型不能像完整 KV 一样直接回看原位置。选择性也不总有利：附录 E.4.1 [图18](#llm-v6-083-figure-18) 的连续音频消融中，S6 会损害某些配置，匹配平滑信号的时不变归纳偏置反而更好。作者也明确指出更大语言模型规模仍待验证。

<!-- figure-ref-v6:start:083-f18-10 -->
<a id="llm-v6-083-figure-18"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/083-mamba-f18-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/083-mamba-f18-v6.png" width="2424" height="560" alt="音频建模中时不变与选择性SSM参数化在不同序列长度上的损失" loading="lazy"></a><figcaption>原文图形摘引：Albert Gu、Tri Dao，2023，图18（PDF第35页图10）；<a href="https://arxiv.org/html/2312.00752v2#A5.F18" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:083-f18-10 -->

五个前置概念：**状态空间模型**通过隐状态传播序列信息；**线性时不变**表示动力学不依赖时刻或输入；**离散化**将连续系统转成逐步更新；**并行扫描**利用结合律求前缀复合；**状态压缩**以有限表示替代保存全部历史。

原文对这一比较另有具体限定：固定动力学难以选择内容，注意力缓存随长度增加；输入相关 $\Delta,B,C$，融合扫描与简化网络块；控制写入、保留、读出，同时避免全部扩展状态的显存搬运；定理 1；[图4](#llm-v6-083-figure-4) 选择复制；[表1](https://arxiv.org/html/2312.00752v2#S4.T1) 语言；[表2](https://arxiv.org/html/2312.00752v2#S4.T2)/[图13](#llm-v6-083-figure-13) 消融；[图12](#llm-v6-083-figure-12) 效率；固定状态会丢信息，速度依赖内核与批量，连续音频存在反例，大规模语言能力未全面验证。

## 六、限制状态转移结构以换取矩阵乘法效率

选择性状态的扫描仍受硬件执行限制。[Mamba-2](088-mamba2.md)直接约束转移结构并发展SSD分块算法；继续检验何时是同函数重排，何时已改变模型可表示的结构。

## 自测：能否从公式看出选择和压缩

**1. 为什么让 $B,C,\Delta$ 依赖输入后不能再用一个固定卷积核？**

答案：固定核要求同一相对距离具有相同线性响应；输入相关参数使不同内容、不同位置的写入和传播系数变化。同样间隔的 token 可以被保留或忽略，因此不再是时不变卷积。给定系数后的仿射递推仍满足可结合的复合，允许扫描。

**2. “固定大小状态”是否意味着无限长度无损记忆？**

答案：不是。它表示计算缓存的尺寸不随历史长度增长，代价正是压缩。有限精度和容量不能保留任意多独立细节。百万长度合成题成功说明模型在该任务结构下保住了必要信息，不能推出任意长文问答都可靠。

**3. 论文的 5 倍速度应怎样限定？**

答案：应注明 A100、提示和生成长度、批量扫描、Transformer 实现以及吞吐指标；其中还包含未训练大模型的计时。它不是单请求所有延迟的统一倍数，更不是模型准确率提升。核心扫描、端到端生成与训练显存属于不同实验，必须分开比较。
