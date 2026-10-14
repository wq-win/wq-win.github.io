# 089｜FAST：让高频连续动作拥有紧凑 token

[系列首页](README.md) · [上一篇](088-dexmimicgen.md) · [下一篇](090-asap.md)

**原论文**：*FAST: Efficient Action Tokenization for Vision-Language-Action Models*，Karl Pertsch 等，2025。[论文](https://arxiv.org/abs/2501.09747)。

### 先接住前作的问题

[OpenVLA](082-openvla.md)逐维生成动作token，遇到高频、变化很小的长动作序列时，重复数字可能占据大量学习预算。FAST在进入模型前压缩时间结构，追问怎样保留运动细节而减少冗余符号；它改变编码，不改变任务奖励。

## 一、问题设定：怎样压缩高频动作而不丢掉关键运动变化

让模型逐个预测一秒内的700个动作数字，听起来精细，实际可能让训练陷入“照抄上一个数字”。高频动作往往变化很小，预测重复内容容易获得低损失，却没有学会根据图像和指令组织整段运动。

给定观测 $o$，策略预测一个动作块 $A\in\mathbb R^{H\times D}$。$H$ 是时间步数，$D$ 是动作维度。传统逐维分箱需要约 $HD$ 个 token，50 Hz、14维、一秒的块就是700个。

这是监督动作学习，没有环境价值函数或世界模型。观测包含图像、语言和本体状态；目标是把动作变成适合下一个 token 预测的序列，再将预测序列还原成控制命令。

重要的诊断是区分训练 teacher forcing 与部署：训练时每一步能看到真实前缀，复制最近动作便可能轻松降低损失；部署时却要依赖自己生成的前缀，微小偏差可能延续。压缩让每个目标 token 承载更丰富的全局运动信息，降低这种局部捷径的吸引力。

论文使用平滑信号的教学实验解释机制，但实际接触动作也有跳变。高频采样不等于所有信息都可丢弃；好的表示应压掉重复，而保留关键细动作。

## 二、以DCT、量化与BPE编码动作序列

FAST 先压缩连续动作，再让模型预测压缩后的 token：用离散余弦变换描述时间变化，量化系数，然后用 BPE 合并常见模式。它没有发明新的机器人奖励，也不负责规划任务，而是改变动作监督的表达方式。

实验最有启发的结果是：自回归 VLA 的部分困难可以来自 tokenizer，而非自回归本身不适合机器人。与此同时，FAST 的训练加速不等于部署更快；论文里的自回归推理仍明显慢于流匹配动作专家。

### 1. DCT把时间样本换成频率系数

每个动作维度先以训练资料的1%和99%分位数归一化，再分别沿时间做 DCT。以标准正交 DCT-II 的教学形式表示：

$$
C_{k,d}=\alpha_k\sum_{t=0}^{H-1}A_{t,d}
\cos\left[\frac{\pi}{H}\left(t+\frac12\right)k\right].
$$

$k$ 表示频率，$d$ 表示动作维度，$\alpha_k$ 是归一化常数。低频控制大致形状，高频描述更快变化。DCT本身是可逆线性变换，还没有减少信息。

随后量化：

$$
\bar C_{k,d}=\operatorname{round}(\gamma C_{k,d}),\qquad
\hat A=\operatorname{IDCT}(\bar C/\gamma).
$$

$\gamma$ 大，量化更细但 token 通常更多；$\gamma$ 小，容易得到很多零，压缩更强但失真更大。不能因为用了逆DCT就说整个方法无损：舍入后的细节无法完整恢复。

### 2. BPE压缩量化后的整数序列

把系数按低频优先、同频率跨动作维度交错的顺序展开。BPE学习常见相邻整数模式，将其合并为词表项。大量零和重复组合由此不必逐个生成。

DCT与BPE的职责不同：前者改变信息的组织方式，后者无损地压缩已经量化的序列；信息损失主要发生在量化。BPE词表不是动作技能库，它只表示频域整数串的常见片段，未必对应“抓取”或“打开抽屉”等语义。

单数据集实验使用量化尺度10和1024词表。FAST+则是在约一百万个一秒动作块上预先训练的通用 tokenizer，避免每个新数据集重训词表。这是一百万个短动作块，不是一百万条完整任务演示。

### 3. VLA仍做标准下一个token学习

编码后序列为 $z_{1:n}$，训练目标：

$$
L_{\rm AR}=-\sum_{i=1}^{n}\log p_\theta(z_i|o,z_{<i}).
$$

动作维度和时长决定还原形状，token长度可以随动作复杂度变化。本体状态作为输入仍可采用简单分箱；本篇的冗余诊断针对长动作输出，不是宣布一切分箱都不可用。

这是算法1与策略设置的教学整合。FAST本身不提供碰撞处理、奖励判断或失败后更新；压缩也不能修正错误的动作坐标和训练标签。[方法§III–V](https://arxiv.org/html/2501.09747v1)

量化损失可给出一个教学上界。假设使用正交归一DCT，动作块共有 $N$ 个标量，系数乘 $\gamma>0$ 后四舍五入，则每个恢复系数误差不超过 $1/(2\gamma)$。由正交变换保范数，令 $A$ 是原动作块、$\hat A$ 是仅经量化后还原的动作块，动作域均方误差满足 $\|\hat A-A\|_2^2/N\le1/(4\gamma^2)$，这里不含分位数裁剪、token预测错误和浮点误差。

取 $\gamma=10$，归一化动作的RMSE上界为0.05；实际误差通常更小，物理误差还需乘回每维尺度。这个界说明BPE即使完全无损，也救不回前面舍入丢掉的信息。重建误差小又不保证关键接触时刻正确，仍需闭环控制评价。[原文§V的DCT、量化与BPE](https://arxiv.org/html/2501.09747v1)

### 用一个小例子建立理解

以下是未运行的教学例子。机械臂一秒内平稳抬高，50个采样点几乎构成直线。逐点编码需要预测50个高度；频域编码则用少数重要系数描述趋势，大量其余系数接近零，BPE再合并这些零。

若中途必须突然停止，较高频率系数开始重要。过小的量化尺度可能把它们舍掉，让还原轨迹继续平滑前行。这个例子说明应同时测试重建误差与接触任务结果；只追求最短token序列可能压掉任务关键细节。

## 三、压缩动作块后训练token模型并重建执行

DCT改变时间表示，量化造成有损近似，BPE再减少符号长度。解码要回到正确身体尺度，训练token变少并不保证在线生成更快。

~~~text
准备tokenizer：
    按每维分位数归一化训练动作
    对每个一秒动作块逐维做DCT
    将系数乘scale后舍入
    低频优先展开，训练或载入BPE词表

训练策略：
    编码图像、指令与本体状态
    将动作块转成FAST token
    用真实token前缀进行下一个token交叉熵训练
    更新VLA权重

部署：
    从观测自回归生成动作token直到块结束
    BPE解码，恢复系数矩阵并除以scale
    逆DCT，反归一化得到动作块
    按控制协议执行部分或全部动作，再更新观测
~~~

## 四、分开压缩率、训练速度与执行质量

**原图怎么读：** [图3，原论文图注与图像](#paper-089-fast-figure-3)。黑色虚线与四个条件点定义教学插值目标；改变采样频率后看预测是否仍贴近目标。它隔离相邻token冗余的影响，不是机器人任务成功率曲线。


<!-- figure-ref-v6:start:089-fast-license -->
<p>原文标注 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本页摘图仅保留图形区域并作栅格化；有面板重排的图另行注明，作者与原文入口见各图注。</p>
<!-- figure-ref-v6:end:089-fast-license -->
<!-- figure-ref-v6:start:af019c23cbea-anchor -->
<a id="paper-089-fast-figure-3"></a>
<!-- figure-ref-v6:end:af019c23cbea-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/089-fast-s4-f3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/089-fast-s4-f3.png" width="1824" height="2244" alt="FAST: Efficient Action Tokenization for Vision-Language-Action Models，图3：黑色虚线与四个条件点定义教学插值目标；改变采样频率后看预测是否仍贴近目标。它隔离相邻token冗余的影响，不是机器人任务成功率曲线。" loading="lazy"></a><figcaption>实验图原图摘引：Karl Pertsch 等，2025，HTML S4.F3，图3。<a href="https://arxiv.org/html/2501.09747v1#S4.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 实验轴 | 设置与预算 | 指标及含义 |
|---|---|---|
| 合成诊断 | 四点插值曲线，25–800采样点，底层曲线不变 | 预测MSE，观察高频冗余问题 |
| tokenizer比较 | 逐维分箱、FAST、FAST+、FSQ | 重建误差与token数；二者须一起比较 |
| 主VLA | PaliGemma基础π0路线及OpenVLA，全部微调 | 机器人得分与训练进度 |
| 任务 | LIBERO与六类真机场景 | 有二元成功，也有分阶段评分 |
| DROID训练 | 75k成功回合，剔除零动作空闲步；240k更新，batch256 | 约三轮数据，8张H100约四天 |
| DROID定量 | 每策略44次试验，逐任务进度评分 | 新场景、对象和相机视角下的表现 |
| 规模实验 | π0的大规模混合资料 | 以GPU小时比较收敛与最终效果 |

DROID策略用外部视角加腕部视角，训练时随机选两个外部相机之一，不使用相机标定。输出关节速度和绝对夹爪位置，15步块在部署时执行8或15步。它不只是对原始DROID表格做编码后直接得到一个通用策略。

[图6](#paper-089-fast-figure-6)等报告95%置信区间；全部任务的独立训练种子和试验数未逐项核实。DROID文字写16个任务，但[表II](https://arxiv.org/html/2501.09747v1#A0.T2)实际列17行任务，合计44次，与总试验数相符；因此本文以明确的44次和逐任务表为准。三所校园的其他展示是定性测试，作者明确未统计其成功率。

<!-- figure-ref-v6:start:bb902110dba7 -->
<a id="paper-089-fast-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/089-fast-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/089-fast-v6-figure-6.png" width="2132" height="766" alt="FAST: Efficient Action Tokenization for Vision-Language-Action Models，图6：图6等报告95%置信区间；全部任务的独立训练种子和试验数未逐项核实。DROID文字写16个任务，但表II实际列17行任务，合计44次，与总试验数相符；因此本文以明确的44次和逐任务表为准。三所校园的其他展示是定性测试，作者明确未统计其成功率。" loading="lazy"></a><figcaption>原图摘引：Karl Pertsch 等，2025，HTML S6.F6，图6。<a href="https://arxiv.org/html/2501.09747v1#S6.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。图6等报告95%置信区间；全部任务的独立训练种子和试验数未逐项核实。DROID文字写16个任务，但表II实际列17行任务，合计44次，与总试验数相符；因此本文以明确的44次和逐任务表为准。三所校园的其他展示是定性测试，作者明确未统计其成功率。</figcaption></figure>
<!-- figure-ref-v6:end:bb902110dba7 -->


FAST+词表训练包含部分机器人评测任务的数据；独立压缩测试另选未见数据集。前者不能被写成“所有策略评测的 tokenizer 完全没见过这些数据分布”。

### 结果：证据到底有多强

**[图3](#paper-089-fast-figure-3)：冗余如何影响训练。** 同一插值问题仅提高采样密度，朴素编码的预测恶化，FAST保持较低误差。这支持表示影响学习难度的解释，但并非对任意优化器、无限训练时长的失败证明。

**[表I](https://arxiv.org/html/2501.09747v1#S6.T1)：压缩有多大。** DROID一秒动作从105降到平均29 token，约3.6倍；双臂折衫从700降到53，约13.2倍。后者 token 数减少约92.4%，不能因此说整个模型训练计算也减少92.4%，图像和前缀计算仍存在。表中的比较在相近重建精度下进行。

**[图6](#paper-089-fast-figure-6)与消融：不仅要变换，还要有效编码。** 压缩型方案优于朴素分箱；去掉BPE仍有DCT收益，但大量零token拖累训练和推理。FAST对部分高精度真机任务优于FSQ，不能推成所有学习型量化都必然逊于DCT。

**[图9](#paper-089-fast-figure-9)、[图11](#paper-089-fast-figure-11)：训练优势要按设置表述。** 单任务的大资料条件中，FAST约用三分之一更新达到较高表现；规模实验报告达到相近效果约五分之一GPU小时。这是两个口径，前者是更新数，后者是计算时间。小资料任务的两类模型则接近，不支持“任何规模都五倍”。

<!-- figure-ref-v6:start:7db70d6a0a60 -->
<a id="paper-089-fast-figure-9"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/089-fast-v6-figure-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/089-fast-v6-figure-9.png" width="2132" height="1427" alt="FAST: Efficient Action Tokenization for Vision-Language-Action Models，图9：训练优势要按设置表述。 单任务的大资料条件中，FAST约用三分之一更新达到较高表现；规模实验报告达到相近效果约五分之一GPU小时。这是两个口径，前者是更新数，后者是计算时间。小资料任务的两类模型则接近，不支持“任何规模都五倍”。" loading="lazy"></a><figcaption>原图摘引：Karl Pertsch 等，2025，HTML S6.F9，图9。<a href="https://arxiv.org/html/2501.09747v1#S6.F9" target="_blank" rel="noopener noreferrer">核对原文</a>。训练优势要按设置表述。 单任务的大资料条件中，FAST约用三分之一更新达到较高表现；规模实验报告达到相近效果约五分之一GPU小时。这是两个口径，前者是更新数，后者是计算时间。小资料任务的两类模型则接近，不支持“任何规模都五倍”。</figcaption></figure>
<!-- figure-ref-v6:end:7db70d6a0a60 -->
<!-- figure-ref-v6:start:b348f999d915 -->
<a id="paper-089-fast-figure-11"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/089-fast-v6-figure-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/089-fast-v6-figure-11.png" width="2132" height="1450" alt="FAST: Efficient Action Tokenization for Vision-Language-Action Models，图11：训练优势要按设置表述。 单任务的大资料条件中，FAST约用三分之一更新达到较高表现；规模实验报告达到相近效果约五分之一GPU小时。这是两个口径，前者是更新数，后者是计算时间。小资料任务的两类模型则接近，不支持“任何规模都五倍”。" loading="lazy"></a><figcaption>原图摘引：Karl Pertsch 等，2025，HTML S6.F11，图11。<a href="https://arxiv.org/html/2501.09747v1#S6.F11" target="_blank" rel="noopener noreferrer">核对原文</a>。训练优势要按设置表述。 单任务的大资料条件中，FAST约用三分之一更新达到较高表现；规模实验报告达到相近效果约五分之一GPU小时。这是两个口径，前者是更新数，后者是计算时间。小资料任务的两类模型则接近，不支持“任何规模都五倍”。</figcaption></figure>
<!-- figure-ref-v6:end:b348f999d915 -->


**§VI-E与附录评分：速度和任务成功不可偷换。** FAST生成一秒块约750 ms，而流匹配π0通常不足100 ms；更少于朴素分箱的token，仍比小动作专家的十步生成慢。图中任务得分也不统一等于整任务成功：收桌按正确物体比例，取面包按四个阶段，折衣则按单件完成。不能将不同口径直接平均成通用成功率。[实验与附录](https://arxiv.org/html/2501.09747v1#S6)

## 五、量化误差和解码时延仍需闭环检查

贡献是指出高频动作的预测难题可能由编码造成，并用简单、可分析的信号处理方法修正。它也为自回归路线提供了有力反例：不能根据朴素动作token失败，就断定自回归不适合灵巧操作。

代价主要有两项。第一是有损量化，接触前的小幅调整可能对完成任务很重要，整体MSE小也不能确保关键瞬间准确。第二是串行解码，压缩只减少串行长度，没有完全消除它。真实动态场景需要进一步评估延迟、动作块覆盖及反馈频率。

作者承认移动平台、灵巧手、人形等广泛形态的部分证据仍是离线压缩，未等同于全部真机策略验证。我的分析是，通用 tokenizer 的“通用”首先是可编码，不是统一的物理语义：不同机器人的第七维仍可能含义不同，归一化不会创造跨形态控制能力。

DROID新环境表现有价值，但主要资料仍含相关机器人和操作技能；它是环境泛化证据，不能推出任意新技能零样本。关于自回归更善于遵循语言的结果，也仍需要控制训练规模、架构与目标差异的进一步实验。

### 五个前置概念

五个前置概念：**DCT**把时间信号表示为余弦基组合；**量化**把连续数值变成有限精度整数；**BPE**合并频繁相邻符号串；**teacher forcing**在训练时提供真实前缀；**自回归推理**在部署时依赖自己已生成的前缀。

### 追问：DCT重建均方误差很低，为什么关键接触时刻仍可能明显偏移？

参考答案：全段平均误差会稀释短暂但重要的高频变化，量化可能改变闭爪或触碰附近的时序。应同时检查重建动作的峰值误差、关键事件时间和真实执行，而非只报压缩率与全局MSE。平滑运动可压缩，不代表每个高频分量都对任务无关。

## 六、沿机制关系继续读

从教学联系看，FAST针对[OpenVLA](082-openvla.md)式逐维动作token的时间冗余，改变编码而保留自回归监督；它也被用于[π0](087-pi0.md)相关骨干的离散输出实验，不能把tokenizer和流匹配动作专家看成同一个模块。

## 七、自测三题与参考答案

**问题1：DCT和BPE都是可逆的，为什么FAST不是无损编码？**

答案：因为中间对DCT系数进行了舍入。BPE可以完整还原整数，逆DCT可以还原这些量化系数对应的信号，但舍入前的连续细节已经丢失。量化尺度决定这种误差和压缩率的折中。

**问题2：为什么降低动作token交叉熵，不一定改善机器人行为？**

答案：高频真实前缀中，相邻动作很相似，模型复制前一个token就可能获得低损失；部署时自身误差会持续传播，而且模型可能根本没用图像判断目标。应检查闭环任务表现，而非仅比较不同编码体系下的损失数值。

**问题3：FAST训练快五倍，为什么推理可能更慢？**

答案：训练可并行计算真实前缀对应的预测，而推理必须逐token串行生成。FAST仍需大语言骨干进行几十次解码；流模型可用较小动作专家经过十次迭代生成整块。训练收敛成本、单次推理延迟和动作发送频率是三个独立指标。
