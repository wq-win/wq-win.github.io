# 079｜vLLM 与 PagedAttention：不改变模型，也能让更多请求同时运行

[返回目录](README.md) · [发展时间线](00-发展时间线总览.md)

论文：Woosuk Kwon 等，*Efficient Memory Management for Large Language Model Serving with PagedAttention*，2023，SOSP。采用[论文 v1](https://arxiv.org/html/2309.06180v1)；代码见[官方仓库](https://github.com/vllm-project/vllm)。这里分析论文时代的系统配置，仓库后续版本的功能和性能不自动属于原论文证据。

<!-- figure-ref-v6:start:llm-license-079-vllm -->
图表来源：Woosuk Kwon 等，2023，[原文](https://arxiv.org/html/2309.06180v1)；[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。本篇展示做了图形区域裁切、PNG格式转换、按原图面板顺序拼合，图中数据与标签未改动。
<!-- figure-ref-v6:end:llm-license-079-vllm -->

### 先接住前作的问题

[GQA](073-gqa.md)减少每个token的K/V状态，[FlashAttention](059-flashattention.md)优化算子搬运，但请求长度未知仍会浪费预留缓存。本篇在服务层管理不同序列的状态生命周期，使省出的空间转化为可并发请求。

## 一、问题设定：生成长度未知时，怎样减少KV预留空洞和请求排队

训练批次形状常可提前确定，在线请求却持续进入、结束并增长。按最大长度预留连续空间会让空槽占住显存，阻止其它请求运行；本篇借鉴分页，使逻辑连续上下文使用按需分配的物理块。

模型权重在多个请求间共享，但 KV cache 属于各个上下文。它不是把单词查表得到的静态向量：同一个 token 出现在不同前文之后，内部键值通常不同。因此不能因为两段文本都含有“北京”，就让它们共享该词位置的缓存。

连续分配容易产生三类浪费。最大长度超过实际结束长度，形成内部碎片；按不同大小分配释放后留下无法方便利用的间隙，形成外部碎片；还有之后确实会用到、但当前尚未使用的预留空间。第三类并非最终永远浪费，却仍会压低当前并发量。

本文的场景是已训练模型的服务系统优化，不适用状态、奖励或策略梯度的强化学习分类。请求到达过程、输入输出长度和显存预算是核心环境条件，优化对象是资源利用及延迟约束下的吞吐。

## 二、分开注意力语义、逻辑块与物理缓存布局

### KV cache 有多大

忽略对齐和管理元数据，缓存大小可估算为

$$
M_{\mathrm{KV}}=2LTH_{\mathrm{kv}}d_hs.
$$

$L$ 是层数，$T$ 是已缓存 token 数，$H_{\mathrm{kv}}$ 是键值头数，$d_h$ 是每头维度，$s$ 是单个数值的字节数，前面的 2 对应 key 和 value。批内多条不共享的序列需要再对各自长度求和。

这个公式也连接了此前的 GQA：GQA 减少 $H_{\mathrm{kv}}$，PagedAttention 则减少为尚未存在的 token 预留空间和重复存储。两者改变的是不同因素，不应互相替代。权重量化减少参数内存，也不自动消除 KV 碎片。

### 分块以后，注意力仍需对整个历史归一化

设一条序列的有效键被分成多个块，$S_j$ 是第 $j$ 块中有效位置的集合。数学上仍然计算

$$
Z=\sum_j\sum_{u\in S_j}\exp(q^\top k_u/\sqrt{d_h}),\qquad
o=\frac{\sum_j\sum_{u\in S_j}\exp(q^\top k_u/\sqrt{d_h})v_u}{Z}.
$$

这是把普通注意力按块重写，目的是说明所有块共享全局分母。若每块独立 softmax 再直接相加，就改变了模型。实现还要采用数值稳定的归约，并屏蔽最后一块未填满的位置；上式不是建议直接计算巨大指数。

块表将逻辑块编号映射到物理块编号。注意力内核根据块表读数据，模型看到的上下文顺序保持不变。无需把所有块先复制回一段连续缓存，否则会重新引入大量搬运。

### 共享与写时复制

同一提示生成多个候选时，共同前缀的 KV 可共用。每个物理块维护引用计数。分支只读共享块没有问题；若要向一个仍被别人引用的尾块写入，就先复制该块，再改写本分支的映射。这样避免候选之间相互污染。

Beam search 的共享更加动态：某些分支被删除，另一些分支产生多个后代。释放的是引用，只有引用计数归零才回收物理块。它不需要为每次分叉复制整段上下文。

这是系统流程而非训练伪代码。重计算恢复时，不必重新逐个采样旧 token：已经生成的 token 已知，可把它们连同原提示一起做 prefill，重建缓存。原论文按序列组整体抢占，避免一个需要协同的 beam 组只剩一部分在运行。

### 块大小决定有多少无法借给别人的尾部空间

设每块容纳 $B$ 个 token，一个请求当前有 $L$ 个缓存 token。不考虑共享时，它占用 $B\lceil L/B\rceil$ 个 token 槽，尾部浪费为

$$w(L)=B\lceil L/B\rceil-L,\qquad0\leq w(L)\leq B-1.$$

这里槽数要再乘每个 token 的所有层 K/V 字节数，才是显存。仅在 $L\bmod B$ 近似均匀时，平均浪费才约为 $(B-1)/2$；真实流量长度分布未必满足这个假设。小块减少尾部碎片，却增加块表与内核访问管理开销；大块更利于规则访问，却可能降低可同时容纳的请求数。论文的高吞吐来自这种布局与调度共同作用，不能从这条容量公式直接得到端到端加速倍数。

**自构例子。** 假设每块容纳 4 个 token，两个请求长度分别为 5 和 9，且没有共同前缀。它们需要 2 和 3 块，共 20 个位置，其中 14 个使用、6 个暂空。如果每请求直接预留 16 个位置，则共占 32 个，当前空 18 个。这只是容量算例，不能直接推出吞吐提升 $32/20$ 倍。若再让第二条序列分叉，共同完整块可共享，写入尾块时才考虑复制。

### 一次分叉什么时候真的要复制缓存块

两条候选共享同一前缀时，可共同引用已经填满且不再改写的块；若最后一块尚未填满，两条分支要写入不同新token，就不能继续把该可变块当成同一份状态。写时复制只在分离写入时产生副本，而不是一出现分支就复制全部历史，也不是永远共享后续缓存。

教法联系：[Lilian Weng的Large Transformer Model Inference Optimization](https://lilianweng.github.io/posts/2023-01-10-inference-optimization/)。算例为本文自构。

## 三、按需分配并在分支共享时执行写时复制

```text
输入：请求队列、固定大小 KV 块池、块表、冻结语言模型
在每个生成迭代：
    移除已结束序列，减少其物理块引用计数
    回收引用计数为零的块
    调度可运行请求，并接纳显存允许的新请求
    为每条序列检查下一 token 是否需要新块
    若将写入共享尾块，则复制该块并更新映射
    若空间不足，则按策略抢占序列组并换出或放弃其缓存
    对新提示执行 prefill；对已有序列执行分页注意力
    采样新 token，更新长度、块表和停止状态
恢复被抢占序列时：换入缓存，或从已知 token 重新计算
输出：与相应解码策略一致的生成结果及服务响应
```

## 四、沿服务负载与延迟约束比较可承载请求率

先固定请求长度分布与延迟要求，再读吞吐曲线；分配利用率、内核速度和端到端服务效率不是同一指标。

| 项目 | 原论文设置 |
|---|---|
| 模型 | §6.1：OPT 13B、66B、175B，以及 LLaMA 13B |
| 硬件 | [表1](https://arxiv.org/html/2309.06180v1#S5.T1)：13B 用 A100 40GB；66B 用 4 张 A100、合计 160GB；175B 用 8 张 A100 80GB |
| 数据与请求 | ShareGPT、Alpaca 的输入输出长度用于合成请求；原数据没有时间戳，到达时间按不同速率的泊松过程生成 |
| 持续时间 | 大部分实验为 1 小时轨迹；175B 因成本使用 15 分钟 |
| 基线 | FasterTransformer 加作者实现的调度器；Orca 为作者复现版本，并设 Oracle、Pow2、Max 三种预留口径 |
| 主要指标 | 请求端到端延迟除以输出长度，再在请求上取均值；观察请求速率提高时的归一化延迟 |
| 附加实验 | 并行采样、beam search、共享前缀、聊天；内核延迟、块大小、换出与重计算消融 |
| 不确定性 | 正文未将所有曲线配成多随机轨迹均值及置信区间；也没有训练随机种子的概念 |

Oracle 基线预先知道真实输出长度，这是普通线上系统没有的信息；它可以帮助判断“即使长度预测完美，连续分配是否仍有损失”。但作者复现的 Orca 不应不加说明地当作原作者系统的完整实测。

归一化延迟也不等于首 token 延迟或逐 token 间隔的分位数。长输出会改变分母。系统比较应固定模型、硬件、生成长度分布与到达轨迹，再讨论收益；只给 tokens/s 而不说并发和延迟要求会掩盖体验差异。

**证据一｜[图2](#llm-v6-079-figure-2) 与 §3：浪费确实限制有效容量。** 作者剖析的旧系统只有 20.4%—38.2% 的 KV 分配空间实际保存 token 状态。这是在对应实验下的缓存利用率，不是 GPU 总显存利用率，更不是所有现存推理系统的共同常数。它支持先解决分配浪费的动机。 服务曲线分单序列、并行采样与 beam search；请求长度来自不同数据集。先固定工作负载和延迟要求，再比较可承载吞吐，不能只取最高倍率。

<!-- figure-ref-v6:start:079-f2-2 -->
<a id="llm-v6-079-figure-2"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/079-vllm-f2-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/079-vllm-f2-v6.png" width="1800" height="1029" alt="Orca与vLLM的KV缓存中有效状态、预留空间及碎片占比" loading="lazy"></a><figcaption>原文图形摘引：Woosuk Kwon 等，2023，图2，PDF第2页；<a href="https://arxiv.org/html/2309.06180v1#S1.F2" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:079-f2-2 -->

**证据二｜[图12](#llm-v6-079-figure-12)、[图13](#llm-v6-079-figure-13)：省出的空间转化为并发。** ShareGPT 负载下，vLLM 相比 Orca Oracle 在相近延迟下承受 1.7—2.7 倍请求速率；OPT-13B 的对应并发请求量为其 2.2 倍。它支持“更有效的缓存允许更大批量”的机制链。175B 搭配较短 Alpaca 序列时优势缩小，论文解释为容量已足够、系统逐渐转向计算瓶颈；这也给出了不应期待巨大收益的条件。

<!-- figure-ref-v6:start:079-f13-4 -->
<a id="llm-v6-079-figure-13"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/079-vllm-f13-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/079-vllm-f13-v6.png" width="2424" height="900" alt="ShareGPT与Alpaca负载下Orca和vLLM平均批处理请求数" loading="lazy"></a><figcaption>原文图形摘引：Woosuk Kwon 等，2023，图13，PDF第10页；<a href="https://arxiv.org/html/2309.06180v1#S5.F13" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:079-f13-4 -->

<!-- figure-ref-v6:start:079-f12-3-anchor -->
<a id="llm-v6-079-figure-12"></a>
<!-- figure-ref-v6:end:079-f12-3-anchor -->

<figure class="reading-evidence-figure"><a href="/llm/assets/papers/079-vllm-f12.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/079-vllm-f12.png" width="1701" height="717" alt="vLLM及其他推理系统在不同模型和负载下的延迟与请求速率" loading="lazy"></a><figcaption>原实验图摘引：Woosuk Kwon 等，2023，图12，PDF第10页；<a href="https://arxiv.org/pdf/2309.06180v1#page=10" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

**证据三｜[图14](#llm-v6-079-figure-14)、[图15](#llm-v6-079-figure-15)、[图16](#llm-v6-079-figure-16)：共享模式影响收益。** OPT-13B、Alpaca 的 beam search 中，块共享节省 37.6%—55.2% 缓存；并行采样为 6.1%—9.8%，因为后者主要共享提示。共享前缀翻译实验中，相比 Oracle，单样例前缀为 1.67 倍吞吐，五样例前缀为 3.58 倍。这些结果支持共享长前缀的价值，不能推导成所有不同用户内容都可以互相共享。

<!-- figure-ref-v6:start:079-f16-7 -->
<a id="llm-v6-079-figure-16"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/079-vllm-f16-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/079-vllm-f16-v6.png" width="1800" height="999" alt="共享一个或五个示例前缀的翻译请求中vLLM与Orca的延迟" loading="lazy"></a><figcaption>原文图形摘引：Woosuk Kwon 等，2023，图16，PDF第12页；<a href="https://arxiv.org/html/2309.06180v1#S6.F16" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:079-f16-7 -->

<!-- figure-ref-v6:start:079-f15-6 -->
<a id="llm-v6-079-figure-15"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/079-vllm-f15-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/079-vllm-f15-v6.png" width="2424" height="720" alt="并行输出数及束宽增加时共享KV块节省的内存百分比" loading="lazy"></a><figcaption>原文图形摘引：Woosuk Kwon 等，2023，图15，PDF第11页；<a href="https://arxiv.org/html/2309.06180v1#S6.F15" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:079-f15-6 -->

<!-- figure-ref-v6:start:079-f14-5 -->
<a id="llm-v6-079-figure-14"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/079-vllm-f14-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/079-vllm-f14-v6.png" width="2424" height="236" alt="不同并行生成数与束宽下vLLM和Orca的延迟负载曲线" loading="lazy"></a><figcaption>原文图形摘引：Woosuk Kwon 等，2023，图14，PDF第11页；<a href="https://arxiv.org/html/2309.06180v1#S6.F14" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:079-f14-5 -->

**证据四｜[图18](#llm-v6-079-figure-18)：更快的系统可以包含更慢的内核。** 分页注意力内核比所比较的 FasterTransformer 内核慢 20%—26%，原因包括间接寻址和分支；端到端服务仍更好。块大小 16—128 对较长 ShareGPT 负载有效，短 Alpaca 对大块更敏感，论文实现采用 16。这里的 16 是该实现的经验折中，不是硬件无关的数学最优值。

<!-- figure-ref-v6:start:079-f18-8 -->
<a id="llm-v6-079-figure-18"></a>
<figure class="reading-evidence-figure"><a href="/llm/assets/papers/079-vllm-f18-v6.png" target="_blank" rel="noopener noreferrer"><img src="/llm/assets/papers/079-vllm-f18-v6.png" width="2424" height="960" alt="vLLM分页内核的上下文长度开销及块大小对端到端延迟的影响" loading="lazy"></a><figcaption>原文图形摘引：Woosuk Kwon 等，2023，图18，PDF第12页；<a href="https://arxiv.org/html/2309.06180v1#S7.F18" target="_blank" rel="noopener noreferrer">核对原文</a>。</figcaption></figure>
<!-- figure-ref-v6:end:079-f18-8 -->

这些证据分别覆盖动机、系统结果、共享收益和局部代价，不能把最大端到端倍数写成每个注意力操作的加速倍数。

**自构分配例子。** 令 $B=16$，三个请求长度分别为 17、31、32，都分配 32 个槽，浪费分别为 15、1、0，总共 16 个槽。把第一个请求再生成 14 个 token，不需新增块；再跨过 32 才需分配下一块。若请求共享前缀，完整只读块可以复用，遇到共享块上的不同续写则需要写时复制。因而评测应同时说明长度分布、并发数与前缀共享条件，不能只报告一个脱离负载的“分页节省率”。

## 五、分页仍有尾部碎片、管理成本与容量上限

贡献是利用 LLM 服务的动态内存语义，设计可以直接读取分散 KV 的内核与管理系统。它借鉴已有分页思想，但实现需要结合注意力、序列组调度和生成恢复，不能只用普通 Python 列表切片代替。

分页仍需存储真实历史；序列足够长、并发足够多时照样耗尽显存。它没有提升训练时的上下文能力，也没有让全注意力变成只看少量块。最后一块仍可能有内部碎片；块表、复制、调度和抢占恢复都需要时间。

五个前置概念：**KV cache**保存已有上下文的注意力键值；**prefill**并行处理已知输入；**decode**逐步生成新 token；**连续批处理**在迭代间接纳和移除请求；**写时复制**让共享数据直到修改时才分离。

## 六、将分页与结构压缩、投机推进组合测量

缓存空间更有效后，可再组合[GQA](073-gqa.md)与[投机解码](064-speculative.md)。前者缩小历史状态，后者改变每轮推进；需要在新的批量和延迟约束下重测，不能将各自最高倍率相乘。

## 自测：从内存图推导服务行为

**1. 为什么不能每块独立 softmax 后把结果相加？**

答案：普通注意力要求历史所有有效 token 共享一个归一化分母。各块分别归一化会让每块都分到总权重 1，相当于改变不同块之间的相对权重。分页只改变取数位置和执行组织，必须通过正确的全局归约保持注意力语义。

**2. 两个请求都出现同一个词，为什么不一定能共享缓存？**

答案：该位置的隐藏状态依赖前文、位置和模型配置。只有相同有效前缀在相同计算条件下的对应缓存才可复用；相同词面不足以保证相同 KV。分支共享共同前缀之后，一旦上下文分歧，后续缓存通常也随之不同。

**3. 内核慢 20%—26%，为什么总体服务吞吐仍可能提高？**

答案：内核延迟只衡量局部运算；端到端吞吐还受可容纳批量、权重带宽摊销、排队和复制开销影响。分页增加局部寻址成本，却可能显著扩大有效批量。若显存本来充足、计算已饱和，这条收益链会减弱，因此必须比较完整负载曲线。
