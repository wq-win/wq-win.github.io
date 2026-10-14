# 100｜CoRE-VLA：用条件专家路由平衡规模与鲁棒性

[系列首页](README.md) · [上一篇](099-worldsample.md) · [系列总结](101-系列总结.md)

**原论文**：*CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts*，Haozhe Zhang 等，2026。[论文](https://arxiv.org/abs/2607.03693)。

### 先接住前作的问题

[Octo](080-octo.md)用模块接口接纳变化的传感器，但稠密共享计算与辅助深度缺失仍会影响容量和可靠性。CoRE-VLA通过条件选择与专家路由分配动作计算，并把无深度模式纳入训练；接口可变与稀疏鲁棒是不同机制。

## 一、问题设定：辅助深度缺失时怎样保留可用动作路径

给机器人增加深度相机，往往能帮助它判断物体位置；但如果训练过度依赖深度，部署时相机缺失就可能明显退化。另一个问题是，多任务动作模型使用同一套计算处理所有情境，抓蔬菜、折衣服和执行长任务可能互相干扰。

这是示范驱动的连续动作策略学习，实验训练目标不是环境奖励，因此不能因为输出动作就把它称为强化学习算法。观测包含 RGB、语言、本体状态及可选深度；输出未来动作块。评价时按环境或人工定义的子目标判断成功。

模拟实验覆盖 LIBERO 四套任务与 RoboCasa GR1 Tabletop。真机使用 AgileX ALOHA 双臂，头部与双腕提供三视角图像。任务为蔬菜拾取、衣服折叠，以及训练衣服后测试不同颜色、形状和材质布料。这里的零样本是未用目标布料示范微调，不代表从未见过折叠动作。

一个重要设置是：训练辅助深度来自 Depth Anything V2 对 RGB 的估计，并非同步真实深度，也不是完美模拟真值；真机推理则测试无深度和物理深度相机两种方式。因而论文同时涉及“模态缺失”和“估计深度到真实传感器”的输入变化。模型没有因此获得训练时未接触过的一切传感器接口。

其基本假设是：存在可复用的一般动作计算，也存在适合辅助模态的专门计算；在训练中暴露缺失条件，可以使模型减少对单一路径的依赖。专家语义是训练结果，不是人工指定“一个负责抓取，一个负责放置”。

## 二、联动模态dropout、专家掩码与动作侧稀疏计算

CoRE-VLA 把动作生成器改成条件稀疏计算：先挑选部分动作侧表示，再把它们交给不同专家；深度不可用时，禁用深度分支与相关专家。训练中随机去掉深度，使一般专家也能完成工作。最后仍通过流匹配生成连续动作块，并不是让语言模型逐个输出离散控制指令。

### 1. 从稠密动作模型扩展到条件专家

视觉语言骨干为 Qwen3-VL-4B-Instruct。先训练 RGB、语言、本体状态条件的稠密 Action DiT，再复制 FFN 为一般专家，加入模态专家及深度编码器，继续训练。动作生成器没有使用大规模机器人策略预训练，不意味着视觉语言骨干没有预训练。

模型从经过视觉语言注意力的文本 token 求平均得到任务意图 $g$。它已经可能包含视觉上下文，所以“文本意图”不等于孤立的原始指令词向量。

在每个 CoRE 层，给动作侧表示 $h_i$ 一个分数：

$$
p_i=\sigma(w_{\rm sel}^{\top}[h_i;g]),\qquad
S=\operatorname{TopK}(p,\max(1,\lfloor\rho L_a\rfloor)).
$$

$L_a$ 是动作侧 token 数量，$\rho$ 是选择容量比例。这里的 token 包含本体状态、可学习动作查询、带噪动作表示，不能直接解释为“只计算一半动作并丢弃另外一半”。未选表示绕过该层的条件计算，最后仍恢复完整序列并输出完整动作块。

选中的表示先做交叉注意力，再根据条件表示和 $g$ 计算专家分数。没有深度时，将深度专家的 logit 设为负无穷；每个选中 token 只派给一个可用专家。软分数乘在输出上，离散 Top-K 和 argmax 本身不求导，选中路径仍可通过连续门值得到梯度。

### 2. 缺失模态训练与目标函数

训练时 $z\sim \operatorname{Bernoulli}(1-p_{\rm drop})$；当 $z=0$，同时去掉深度条件和深度专家，而不仅把一张图涂黑。部署时按实际传感器可用性设置 $z$。

动作流匹配采用：

$$
x_\tau=(1-\tau)\epsilon+\tau a,\qquad
\mathcal L_{\rm act}=E\|v_\theta(x_\tau,\tau,\text{条件})-(a-\epsilon)\|^2.
$$

$a$ 是示范动作块，$\epsilon$ 是同形状高斯噪声，$\tau$ 从0到1。推理从噪声开始，沿预测速度场积分。这里符号方向是自洽的：噪声到数据的导数就是 $a-\epsilon$。

总损失还加入选择分数质量与专家负载均衡：

$$
\mathcal L=\mathcal L_{\rm act}
+\lambda_{\rm sel}\sum_\ell(\operatorname{mean}_i p_i^\ell-\rho)^2
+\lambda_{\rm moe}\mathcal L_{\rm moe}.
$$

固定 Top-K 已决定实际选中个数，选择正则主要约束连续门值，不能额外“保证每个样本挑选恰好多少”——那个数量来自 Top-K。负载均衡则避免所有选中表示长期落到少数专家。

### 3. 一个值得继续验证的公式细节

本文的代数分析：在固定 $h_i$ 的同一层内，线性拼接评分可拆成 $w_h^\top h_i+w_g^\top g$，后者对所有 $i$ 相同；sigmoid 单调，因此它不会直接改变该层 token 排序。任务意图仍能影响连续门值、专家选择，以及前层形成的 $h_i$，但若声称这个线性项本身直接改变当前 Top-K 顺序，需要额外机制或实现说明。这不是“路由完全无用”，而是把直接作用与间接作用区分清楚。

若只有占总计算 $\eta$ 的部分被稀疏化，理想计算比例近似为 $1-(1-\rho)\eta$，还需加路由开销。教学设总计算中70%来自不变的视觉语言骨干、其他层和投影，30%来自可稀疏部分；即使取 $\rho=0.5$ 且路由免费，总量仍为 $0.7+0.5\times0.3=0.85$，理想算力收益仅约1.18倍，并不等于整机快一倍。这些比例是假设，不是论文实测，FLOPs比例也不能直接换成闭环延迟比例。

现实还有专家权重存储、分派和小批量利用率，FLOPs下降不必按同比例缩短延迟。原文附录明确把条件层与整体动作生成器、视觉语言前端分开核算，因此“更多参数、相近激活计算”的结论应与显存、端到端时延和传感器处理一起报告。[原文附录D计算分析](https://arxiv.org/html/2607.03693v1)

### 帮助建立理解

**自构例子，未运行。** 双臂折布时，深度可帮助判断布边高度；相机失联后，将深度专家禁用，模型还能凭 RGB 和本体状态继续。若只是把深度图置零却让深度专家照常工作，零可能被当作真实几何而产生错误动作。再设想深度图没断流却冻结在两秒前：可用性门控本身不会发现，需要时间戳或传感器质量机制。这展示了缺失鲁棒性与错误读数鲁棒性的差别。

## 三、联合训练缺失模态路径并选择动作侧专家

关闭深度需要同步处理输入与相关专家，训练dropout让通用路径实际见过这种条件。选择部分token更新后仍恢复完整动作序列，不是少执行一半动作。

~~~text
输入：图像、语言、本体状态、可选深度、示范动作块
训练：
    编码视觉语言条件，并从文本表示得到意图g
    随机决定深度是否启用；同步设置深度条件和专家掩码
    采样噪声与流时间，构造带噪动作
    经过动作DiT：
        普通层正常计算
        CoRE层给动作侧表示打分，选择固定容量子集
        子集读取条件，路由到一个可用专家
        用连续门值加权更新，再与绕过的表示合并
    预测流速度，优化动作损失、门值正则和负载均衡
部署：
    根据传感器状态设置掩码，从噪声积分得到完整动作块
    执行控制并更新观测，再预测下一块
输出：适应可用传感器的连续动作
~~~

## 四、分开路由可视化、成功率与计算估算

**图13逐面板读：** [原图与附录C](https://arxiv.org/html/2607.03693v1#A3.F13)把同一时刻的视频帧、上方专家使用柱图、下方token选择热图放在一起。上图横轴为专家编号，0–23是通用专家、24–31是模态专属专家；纵轴为该时刻选中token派发给各专家的归一化占比，汇总跨CoRE层与去噪步的派发，不是单层路由softmax概率。下图横轴为动作侧token编号：0为本体状态、1–32为可学习动作查询、33–48为未来0–15步的带噪动作表示；纵轴为CoRE层编号。色条0–1标为“Selection probability/frequency”，论文称其为选择活动，但未完整交代下半图的归一化分母，不另行假定。它不是专家编号×时间图，也不是成功率。

对照视频step40到step60，瓶子由台面附近被提起，此时可分别比较哪些专家使用柱变高、哪些token在某层更常被选择。这个同步展示提供计算分配随阶段变化的线索，却不能据一段视频将某位专家命名为“抓取专家”；更不能把较暗的未来动作token理解成机器人少执行了相应动作。


<!-- figure-ref-v6:start:90ea14e7c288-anchor -->
<a id="paper-100-core-vla-figure-13"></a>
<!-- figure-ref-v6:end:90ea14e7c288-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-a3-f13.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-a3-f13.png" width="1270" height="2066" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图13：token 0为本体状态、1–32为动作查询、33–48为未来动作token；专家也分通用与模态专属。按这个图例读热图，不能把“少更新一部分token”当成少执行动作。" loading="lazy"></a><figcaption>实验图原图摘引：Haozhe Zhang 等，2026，HTML A3.F13，图13。<a href="https://arxiv.org/html/2607.03693v1#A3.F13" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

专家配置的表述口径及线性选择器是否具有直接条件作用仍需结合代码核验；路由热图本身不能证明某个专家的因果语义。

| 项目 | 可核实设置 | 结论范围 |
|---|---|---|
| LIBERO | 四套40任务共同训练；每任务50次评估 | 多任务模拟操作，不是每套单独训练 |
| RoboCasa GR1 | 24任务、每任务1000示范；每任务5组各100回合 | 组间评估波动，不等于5次独立训练 |
| 训练预算 | LIBERO 100K步、RoboCasa 200K步；batch 128；8张H200 | [表4](https://arxiv.org/html/2607.03693v1#A1.T4)、[表5](https://arxiv.org/html/2607.03693v1#A1.T5)给最终检查点和seed 42 |
| 动作设置 | LIBERO 7维、块长8；RoboCasa 29维、块长16；4步流积分 | 不能用动作输出维数直接比较模型难度 |
| 模态训练 | DA-V2估计深度；dropout 0.2；选择比例0.5 | 真实深度输入为部署变化 |
| 真机数据 | 蔬菜44条示范；折衣约1.3K条 | 布料泛化沿用折衣训练 |
| 真机比较 | 稠密DiT、公开JAX版π0.5、完整模型有/无深度 | 同下游示范，不同预训练历史 |
| 真机评价 | 每方法每任务20回合；阶段分数和完整成功分别报告 | 每一个成功回合对应5个百分点 |
| 物理深度 | 头与双腕的Orbbec Dabai DC1 | 不能外推为任意深度传感器 |

主表的跨论文基线含公开结果，不是全部在相同计算预算下重新训练。真机对比说明同样的下游数据和硬件，但不能消除预训练、模型规模、训练细节的影响。

配置还有一处需要复现者注意：[表4](https://arxiv.org/html/2607.03693v1#A1.T4)写 LIBERO 一般/模态专家12/4，而[表12](#paper-100-core-vla-table-12)完整消融和[图8](#paper-100-core-vla-figure-8)写8/4；RoboCasa [表5](https://arxiv.org/html/2607.03693v1#A1.T5)写32/8，[图13](#paper-100-core-vla-figure-13)说明写24/8。它们可能对应不同实验配置，但正文没有清楚打通，不能把这些数字混成一个已确定的默认配置。

<!-- figure-ref-v6:start:9fea81a11354 -->
<a id="paper-100-core-vla-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-8.png" width="2132" height="2349" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图8：每个时刻同时给出观察帧、专家使用柱形图和各层路由热图；按0、40至256步的顺序对齐阅读，避免把任务进展与单个专家编号直接等同。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F8，图8。<a href="https://arxiv.org/html/2607.03693v1#A3.F8" target="_blank" rel="noopener noreferrer">核对原文</a>。每个时刻同时给出观察帧、专家使用柱形图和各层路由热图；按0、40至256步的顺序对齐阅读，避免把任务进展与单个专家编号直接等同。</figcaption></figure>
<!-- figure-ref-v6:end:9fea81a11354 -->


### 结果：证据到底有多强

**证据1：[表1](https://arxiv.org/html/2607.03693v1#S4.T1)的LIBERO总成绩。** CoRE-VLA 平均98.7%，OpenVLA-OFT97.1%，相差1.6个百分点；Long为97.6%与94.5%，相差3.1个百分点。支持该模型在报告设置下表现强，但因联合任务训练、骨干与深度输入不同，不能将差值全部归因于专家路由。附录[表8](https://arxiv.org/html/2607.03693v1#A1.T8)还有单任务90%的结果，平均接近满分不等于所有任务解决。

**证据2：[表12](#paper-100-core-vla-table-12)的缺失深度消融。** 前面的训练dropout让通用路径见过无深度条件，推理掩码则禁用不可用的深度路径；要检验两者联动，应在相同模型的有/无深度成对配置内比较。LIBERO-Long第3、4行的朴素深度模型从95.6%降到91.2%，第11、12行完整设计从97.6%降到97.0%。一般专家路由另使稠密基线94.4%到95.2%；单独dropout的有/无深度为94.4/96.2，反而无深度更好。这支持完整训练与路由组合在该设置下的价值，不能推出加深度必然增益或任意触觉、力觉故障都能处理。路由热图只能提供过程线索，不能替代这一任务结果消融。


<!-- figure-ref-v6:start:a095f1f54691-anchor -->
<a id="paper-100-core-vla-table-12"></a>
<a href="https://arxiv.org/html/2607.03693v1#A2.T12" target="_blank" rel="noopener noreferrer">原引用入口</a>
<!-- figure-ref-v6:end:a095f1f54691-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-a2-t12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-a2-t12.png" width="1540" height="696" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，表12：表12让缺失深度结论可直接核对：第3、4行去掉推理深度时从95.6降到91.2，第11、12行完整设计从97.6降到97.0。只在相应成对配置内比较；路由热图提供过程线索，不能替代这个任务结果消融。" loading="lazy"></a><figcaption>实验图原图摘引：Haozhe Zhang 等，2026，PDF第19页，表12。<a href="https://arxiv.org/pdf/2607.03693v1#page=19" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

**证据3：[表2](https://arxiv.org/html/2607.03693v1#S4.T2)、[表6](https://arxiv.org/html/2607.03693v1#A1.T6)、[表7](https://arxiv.org/html/2607.03693v1#A1.T7)的RoboCasa。** 平均56.5±0.4%，高于所列GR00T-N1.5的48.0%。±0.4来自五个评估组的任务平均，不是训练种子标准差。逐任务并非全胜，例如把土豆放入微波炉38.0%，低于GR00T-N1.6的41.5%；把新物体放到层架的若干任务仅约26%。平均优势保留了明显失败区域。

**证据4：[表3](https://arxiv.org/html/2607.03693v1#S4.T3)及[表9](https://arxiv.org/html/2607.03693v1#A1.T9)、[表10](https://arxiv.org/html/2607.03693v1#A1.T10)、[表11](https://arxiv.org/html/2607.03693v1#A1.T11)的真机结果。** 有物理深度时，三任务完整成功率70%、65%、80%；无深度为65%、50%、70%。折衣无深度得分77.5，却只有50%完整成功，且低于π0.5的60%成功率，虽然分阶段得分更高。布料有深度80%相对π0.5的60%高20个百分点，但20回合样本仍不足以支持大范围通用泛化结论。

**证据5：[图6](#paper-100-core-vla-figure-6)、[图7](#paper-100-core-vla-figure-7)、[图8](#paper-100-core-vla-figure-8)、[图9](#paper-100-core-vla-figure-9)、[图10](#paper-100-core-vla-figure-10)、[图11](#paper-100-core-vla-figure-11)、[图12](#paper-100-core-vla-figure-12)、[图13](#paper-100-core-vla-figure-13)、[图14](#paper-100-core-vla-figure-14)、[图15](#paper-100-core-vla-figure-15)与附录D。** 专家热图显示计算路径随任务和时间变化，支持不是固定派发；不能据此给专家命名为独立、可解释的“抓取概念”。附录D分析的是动作生成器局部激活计算，明确不包括视觉语言骨干和深度估计。更多可选路径也不等于已经学习到同样多的可靠技能。

<!-- figure-ref-v6:start:ac7674428dfa -->
<a id="paper-100-core-vla-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-6.png" width="1828" height="1140" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图6：横轴为环境时间步，纵轴为12个专家编号；颜色编码使用比例。逐列比较派发随时间的变化，不能把专家编号直接解释成独立动作概念。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F6，图6。<a href="https://arxiv.org/html/2607.03693v1#A3.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。横轴为环境时间步，纵轴为12个专家编号；颜色编码使用比例。逐列比较派发随时间的变化，不能把专家编号直接解释成独立动作概念。</figcaption></figure>
<!-- figure-ref-v6:end:ac7674428dfa -->
<!-- figure-ref-v6:start:b0e2045b2604 -->
<a id="paper-100-core-vla-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-7.png" width="2132" height="1207" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图7：每根柱是一个专家的汇总使用比例；它展示整体负载分布，不能替代图6逐时间步的路由变化。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F7，图7。<a href="https://arxiv.org/html/2607.03693v1#A3.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。每根柱是一个专家的汇总使用比例；它展示整体负载分布，不能替代图6逐时间步的路由变化。</figcaption></figure>
<!-- figure-ref-v6:end:b0e2045b2604 -->
<!-- figure-ref-v6:start:c5898a15672a -->
<a id="paper-100-core-vla-figure-9"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-9.png" width="2132" height="726" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图9：每行是一条完整任务指令，每列是专家编号，虚线分开通用专家与深度/模态专家。颜色是归一化使用量，跨行比较路由模式而非任务成功率。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F9，图9。<a href="https://arxiv.org/html/2607.03693v1#A3.F9" target="_blank" rel="noopener noreferrer">核对原文</a>。每行是一条完整任务指令，每列是专家编号，虚线分开通用专家与深度/模态专家。颜色是归一化使用量，跨行比较路由模式而非任务成功率。</figcaption></figure>
<!-- figure-ref-v6:end:c5898a15672a -->
<!-- figure-ref-v6:start:4f4861013f1e -->
<a id="paper-100-core-vla-figure-10"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-10.png" width="2132" height="724" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图10：各行保持黑碗操作主题、改变空间位置描述；热图比较不同指令的专家使用分布。颜色尺度表示路由使用量，不是空间定位误差。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F10，图10。<a href="https://arxiv.org/html/2607.03693v1#A3.F10" target="_blank" rel="noopener noreferrer">核对原文</a>。各行保持黑碗操作主题、改变空间位置描述；热图比较不同指令的专家使用分布。颜色尺度表示路由使用量，不是空间定位误差。</figcaption></figure>
<!-- figure-ref-v6:end:4f4861013f1e -->
<!-- figure-ref-v6:start:5b42ad7970dc -->
<a id="paper-100-core-vla-figure-11"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-11.png" width="2132" height="862" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图11：各行更换放入篮子的目标物体，列仍为相同专家；同一目标动作下比较不同物体的路由分布，不能据热图给专家赋予确定语义。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F11，图11。<a href="https://arxiv.org/html/2607.03693v1#A3.F11" target="_blank" rel="noopener noreferrer">核对原文</a>。各行更换放入篮子的目标物体，列仍为相同专家；同一目标动作下比较不同物体的路由分布，不能据热图给专家赋予确定语义。</figcaption></figure>
<!-- figure-ref-v6:end:5b42ad7970dc -->
<!-- figure-ref-v6:start:64b148c69d1f -->
<a id="paper-100-core-vla-figure-12"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-12.png" width="2132" height="927" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图12：各行包含开关柜门、操作炉灶和移动物体等目标；虚线两侧属于不同专家组。观察路由差异时须结合右侧色标，不把颜色深浅当执行质量。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F12，图12。<a href="https://arxiv.org/html/2607.03693v1#A3.F12" target="_blank" rel="noopener noreferrer">核对原文</a>。各行包含开关柜门、操作炉灶和移动物体等目标；虚线两侧属于不同专家组。观察路由差异时须结合右侧色标，不把颜色深浅当执行质量。</figcaption></figure>
<!-- figure-ref-v6:end:64b148c69d1f -->
<!-- figure-ref-v6:start:21f392484fac -->
<a id="paper-100-core-vla-figure-14"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-14.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-14.png" width="2132" height="1843" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图14：32个专家按环境时间步展开，颜色标出使用比例；与12专家设置相比，专家数和轨迹长度均不同，不能只凭热图更密就推断策略更强。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F14，图14。<a href="https://arxiv.org/html/2607.03693v1#A3.F14" target="_blank" rel="noopener noreferrer">核对原文</a>。32个专家按环境时间步展开，颜色标出使用比例；与12专家设置相比，专家数和轨迹长度均不同，不能只凭热图更密就推断策略更强。</figcaption></figure>
<!-- figure-ref-v6:end:21f392484fac -->
<!-- figure-ref-v6:start:93d05245a2c4 -->
<a id="paper-100-core-vla-figure-15"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/100-core-vla-v6-figure-15.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/100-core-vla-v6-figure-15.png" width="2132" height="863" alt="CoRE-VLA: Towards Scalable and Robust Vision-Language-Action Modeling via Conditional Routing of Experts，图15：柱形图汇总32个专家的使用比例，部分专家负载较高；它是路由分布诊断，不是32项独立技能的准确率。" loading="lazy"></a><figcaption>原图摘引：Haozhe Zhang 等，2026，HTML A3.F15，图15。<a href="https://arxiv.org/html/2607.03693v1#A3.F15" target="_blank" rel="noopener noreferrer">核对原文</a>。柱形图汇总32个专家的使用比例，部分专家负载较高；它是路由分布诊断，不是32项独立技能的准确率。</figcaption></figure>
<!-- figure-ref-v6:end:93d05245a2c4 -->


## 五、错误但可用的深度仍需质量检测

作者将触觉、力觉和更大跨本体数据放到后续方向。本文进一步分析：可用性标志只能处理“知道传感器缺失”的情况，错误但仍被标记可用的深度可能需要质量检测；训练时整体 dropout 与执行中突发断流并不完全相同；估计深度和物理深度的尺度、噪声适配也值得单独验证。它们是尚未充分覆盖的问题，不是已证实发生的故障。

### 五个前置概念

五个前置概念：

- 专家混合：输入只激活部分子网络，以共享和专门化分配容量。
- Token-choice：每个选中表示自行选择专家，而非专家挑选全部输入。
- 模态 dropout：训练时有意去掉一种输入，使网络练习缺失条件。
- 流匹配：学习把噪声分布搬运到动作分布的速度场。
- 负载均衡：避免路由长期只用少数专家，维持可训练的容量。

### 追问：专家负载均衡改善后，为什么不能直接说专家已形成有用分工？

参考答案：均衡只说明使用频率没有过度集中，不说明不同专家承担了不同语义或对动作有因果贡献。应在保持总激活计算的条件下干预路由、交换或屏蔽专家，并检查任务及模态变化下的影响。热图可以提出分工假设，最终需要行为对照来检验。

## 六、沿机制关系继续读

CoRE-VLA与[Octo](080-octo.md)共享异构传感接口问题，但采用可用模态感知的稀疏专家；与[π0](087-pi0.md)动作专家只有模块设计的教学联系，按token类型固定分工与逐token条件路由并非同一机制。

## 七、自测三题与参考答案

**问题1：为什么关闭深度时要同时移除深度token与屏蔽深度专家？**

答案：只删除输入，仍可能让专门依赖它的计算路径被路由器选中；只屏蔽专家，其他路径又可能读取不可靠输入。联动两者定义清楚的无深度模式，而训练 dropout 让一般路径实际接受这种条件的监督。

**问题2：选择一半动作侧token，是否意味着机器人只执行一半动作？**

答案：不是。被跳过的是某层交叉注意力和专家更新，未选token仍保留，后面恢复完整序列并解码完整动作块。动作侧token还包括状态与查询，因此选择数量更不能直接换算为执行动作数量。

**问题3：56.5±0.4%的成绩为什么不能解释为训练非常稳定？**

答案：这里的标准差来自同一报告设置下五组评估回合的任务平均，而训练表只给seed 42。它描述评估采样波动，不描述重新初始化、重新训练、改变数据顺序后的性能变化。要论证训练稳定性，需要独立训练重复并分别报告两层不确定性。
