# 070｜TD-MPC2：可扩展的连续控制世界模型

[系列首页](README.md) · [上一篇](069-eureka.md) · [下一篇](071-mimicgen.md)

**原论文**：*TD-MPC2: Scalable, Robust World Models for Continuous Control*，Nicklas Hansen、Hao Su、Xiaolong Wang，首次公开于 2023，本文对应 2024 年 arXiv v2。[论文](https://arxiv.org/abs/2310.16828)。

### 先接住前作的问题

[TD-MPC](049-tdmpc.md)以短潜模型规划连接长期价值，但任务数量和奖励尺度增大后，表示及估值稳定性成为限制。TD-MPC2保留在线规划骨架，修改归一化、预测目标和策略先验；要检验的是扩展后是否仍能可靠学习。

## 一、问题设定：短规划世界模型怎样扩展到多任务尺度

世界模型不一定需要生成逼真的未来视频。对控制而言，它首先需要回答：尝试这串动作，回报会怎样，最后会到一个多好的状态？

TD-MPC 不需要预测每个像素，而学习与任务有关的潜状态。规划器向前预测一小段，再使用价值函数评价更远的未来。这样避免长时间滚动导致模型误差快速放大，又不完全短视。

TD-MPC2 仍然包含五个组件：

| 组件 | 输入输出 | 控制中的作用 |
|---|---|---|
| 编码器 $h$ | 观测到潜状态 | 把感知变成模型可操作的表示 |
| 动力学 $d$ | 潜状态、动作到下一潜状态 | 在内部比较候选动作后果 |
| 奖励头 $R$ | 潜状态、动作到奖励 | 评价短期收益 |
| 价值头 $Q$ | 潜状态、动作到长期回报 | 补偿有限规划时域 |
| 策略先验 $p$ | 潜状态到动作分布 | 给规划提供有希望的候选 |

多任务时，各组件还接收任务嵌入 $e$。这是可学习任务标识，不等于自然语言理解，也不意味着能够自动识别一个未指定的新任务。

单任务实验使用在线交互；大型多任务实验从固定混合质量回放数据训练；新任务适应又加入在线交互。三种数据条件需要分别解读。

## 二、稳定潜表示、奖励价值与规划先验

TD-MPC2 延续 TD-MPC 的短期潜空间规划与长期价值估计，但重点解决稳定性和扩展问题。它调整奖励与价值预测、潜变量归一化、策略先验和价值集成，并支持多任务不同维度的状态动作。

### 潜状态一致性、奖励和价值联合训练

用简化教学记号表示：

$$
L_{\rm model}
=\sum_{t=0}^{H}\lambda^t
\left[
c_z\|d(z_t,a_t)-\operatorname{sg}(h(s_{t+1}))\|^2
+c_rL_r+c_qL_q
\right].
$$

$\operatorname{sg}$ 表示目标不接收该项反向梯度，$\lambda$ 对较远预测降权，$c_z,c_r,c_q$ 控制损失相对尺度。潜状态预测必须保持与真实后续观测编码一致，同时服务奖励与价值预测。

与直接用均方误差拟合任意量级标量不同，TD-MPC2 把奖励和价值变换到离散回归表示，以软目标交叉熵训练。这使不同回报量级的任务更容易共享训练配置。它并没有把连续机器人动作离散化成 RT-2 式文本 token。

### SimNorm 为什么能稳定表示

将潜向量分组，每组执行：

$$
g_i=\operatorname{softmax}(z_i/\tau).
$$

每组分量非负、和为一，避免潜状态幅度无限增长，同时保留连续可微表示。它不是抽样一个离散类别，因此不等同于硬 one-hot 编码。

一个值得亲手检查的原文细节是温度极限：按照式 5，$\tau\to0^+$ 时趋向尖锐，$\tau\to\infty$ 时趋向均匀；附录 H 的文字把这两个极限写反了。实验使用固定温度，不能由这个文字问题推导出实验无效，但学习公式时应以数学定义为准。

### 策略先验与价值集成

策略先验偏向高价值动作，同时保留熵，避免候选过早塌缩。用清楚的最小化约定可写为：

$$
L_p=-\mathbb E\big[\widetilde Q(z,a)+\beta\mathcal H(p(\cdot\mid z))\big],
\quad a\sim p.
$$

$\widetilde Q$ 表示按统计量缩放的价值，$\beta>0$ 控制熵项。更新只作用于策略参数。原文式 4 的“最大化”与熵负号存在阅读歧义；[官方代码的策略更新](https://raw.githubusercontent.com/nicklashansen/tdmpc2/main/tdmpc2/tdmpc2.py)采用对价值和熵之和取负的损失。该链接是持续维护版本，不能据此假定其所有细节与论文历史实验完全相同。

多个 $Q$ 头用于缓解目标估计偏差。计算 TD 目标时随机抽取两个目标价值头取较小值，而不是所有头都取最小。集成不提供确定的误差上界，不能把它当成物理安全证明。

### 短期规划加终端价值

规划候选动作的教学评分为：

$$
G(a_{0:H})
=\sum_{t=0}^{H-1}\gamma^tR(z_t,a_t)
+\gamma^HQ(z_H,a_H).
$$

规划器采样动作段、在潜模型中展开、按评分更新候选分布，只执行第一步。策略先验提供部分候选，上一步计划平移后用于热启动。

多任务时，状态和动作补零到统一长度，非法动作维被屏蔽。屏蔽不仅避免机器人执行不存在的关节，也防止策略在无效维度上虚增熵。

SimNorm每组有界不等于动力学稳定。在同一组中令 $z_j$ 为第 $j$ 个标量logit、$g_i$ 为第 $i$ 个softmax分量，则导数为 $\partial g_i/\partial z_j=g_i(\mathbf1[i=j]-g_j)/\tau$，其中 $\tau>0$ 是温度，$\mathbf1[i=j]$ 为相等时取1的指示函数。小温度可形成尖锐表示，也可能让非最大分量梯度接近零；大温度趋均匀、区分能力下降。这个导数同时说明为何不能把“归一化”当作无代价修补。

多任务动作掩码也涉及目标公平性：若不存在的关节维仍计入熵，策略能在无物理意义的维度增加熵收益。应在动作输出、概率密度与熵统计中保持同一有效维定义。原文多任务接口与稳定化组件应联合阅读，而非只把规模收益归给SimNorm。[原文SimNorm及多任务设计](https://arxiv.org/html/2310.16828v2)

### 自构小例子与前置概念

以下是自构例子，未运行。机器人要先把障碍移开，再拿后面的物体。短期规划里“绕开障碍直接伸手”看起来更接近目标，却会碰撞；移开障碍短期没有抓取奖励，但可能到达一个高价值状态。

终端价值可以给后者补分。然而如果价值网络错误地把碰撞附近状态估得很高，规划也会被误导。潜空间规划与价值学习是互补关系，同时也是两个需要分别检查的误差源。

## 三、联合更新多任务潜模型并在有效动作维度规划

统一维度后，补零动作必须在损失、熵和搜索中保持一致掩码。策略先验帮助候选生成，末端Q仍承担短预测以外的未来价值。

~~~text
初始化编码器、潜动力学、奖励头、Q 集成和策略先验
循环：
    编码当前观测及任务嵌入
    用策略先验和采样分布提出动作序列
    在潜空间预测短期奖励，并加终端价值
    迭代更新候选分布，执行第一步
    保存真实转移到回放
    抽取连续片段：
        更新潜一致性、奖励预测和 TD 价值预测
        仅更新策略先验，使其兼顾价值与熵
        更新目标价值网络
多任务训练时屏蔽无效动作维，并使用对应任务嵌入
~~~

## 四、分开单任务效率与多任务规模结果

实验支持其在多类连续控制任务上的较好数据效率，以及大模型从多任务混合经验中学习的可行性。这里主要是仿真控制，不能把“多个机器人形态”读成已经完成对应真实机器人的部署。

**原图怎么读：** [图7，原论文图注与图像](#paper-070-tdmpc2-figure-7)。左侧是模型规模与多任务归一化分数，右侧是任务嵌入的t-SNE可视化。嵌入靠近只提供表示结构线索，不是任务之间因果迁移的证明。


<!-- figure-ref-v6:start:070-tdmpc2-license -->
<p>原文标注 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本页摘图仅保留图形区域并作栅格化；有面板重排的图另行注明，作者与原文入口见各图注。</p>
<!-- figure-ref-v6:end:070-tdmpc2-license -->
<!-- figure-ref-v6:start:d04bef133f9e-anchor -->
<a id="paper-070-tdmpc2-figure-7"></a>
<!-- figure-ref-v6:end:d04bef133f9e-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/070-tdmpc2-s4-f7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/070-tdmpc2-s4-f7.png" width="1804" height="506" alt="TD-MPC2: Scalable, Robust World Models for Continuous Control，图7：左侧是模型规模与多任务归一化分数，右侧是任务嵌入的t-SNE可视化。嵌入靠近只提供表示结构线索，不是任务之间因果迁移的证明。" loading="lazy"></a><figcaption>实验图原图摘引：Nicklas Hansen、Hao Su、Xiaolong Wang，首次公开于 2023，HTML S4.F7，图7。原图面板重新排版，数据未改。<a href="https://arxiv.org/html/2310.16828v2#S4.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

用于辅助解释的官方策略代码没有锁定原实验历史提交；当前代码新增功能不能倒推成论文已测试的组成部分。

| 维度 | 原文设定及解释 |
|---|---|
| 主单任务 | 104 个连续控制任务，跨 DMControl、Meta-World、ManiSkill2、MyoSuite |
| 视觉实验 | 另外明确讨论十个图像输入控制任务；主要分析仍以状态输入为主 |
| 对照 | SAC、原 TD-MPC、指定实现和配置的 DreamerV3；视觉另有相关基线 |
| 不确定性 | 主要学习曲线三种子及 95% 区间 |
| 默认规划 | 附录 H 列出时域、候选数量与迭代次数；高维动作有自动调整 |
| 多任务数据 | 80 任务，来自单任务策略回放的 5.45 亿转移 |
| 多任务模型 | 从百万级到 317M 参数；训练成本随模型增加 |
| 新任务 | 70 任务预训练，再对十个留出任务在线微调 |
| 真实部署 | 本文主实验没有构成全面真实机器人控制验证 |

“同一组超参数”并非所有数字恒定。原文按任务回合长度自动设置折扣与起始随机步数，高维动作调整规划迭代，多任务增大批量。更准确的含义是使用统一规则，减少逐任务手工搜索。

基线批量、更新比例与参数规模也不同。横轴是环境交互量时，曲线比较样本效率；不能直接换成同算力或同墙钟时间的胜负。不同代码对 UTD 的计数还可能不同，不宜只看一个比例作成本换算。

### 五组证据的强弱

定位依据[原文 v2 结果与附录](https://arxiv.org/html/2310.16828)。

**[图4](#paper-070-tdmpc2-figure-4)、[图5](#paper-070-tdmpc2-figure-5)、[图6](#paper-070-tdmpc2-figure-6)：单任务连续控制。** 聚合和困难任务显示较强表现，但聚合领先不等于每个任务、每个阶段都领先。附录保留了某些基线更早成功的例子；视觉任务上作者使用的是相当而非全面压倒的结论。

<!-- figure-ref-v6:start:9cc7d7a0a9ad -->
<a id="paper-070-tdmpc2-figure-4"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/070-tdmpc2-v6-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/070-tdmpc2-v6-figure-4.png" width="2132" height="573" alt="TD-MPC2: Scalable, Robust World Models for Continuous Control，图4：单任务连续控制。 聚合和困难任务显示较强表现，但聚合领先不等于每个任务、每个阶段都领先。附录保留了某些基线更早成功的例子；视觉任务上作者使用的是相当而非全面压倒的结论。" loading="lazy"></a><figcaption>原图摘引：Nicklas Hansen、Hao Su、Xiaolong Wang，首次公开于 2023，本文对应 2024 年 arXiv v2，HTML S3.F4，图4。<a href="https://arxiv.org/html/2310.16828v2#S3.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。单任务连续控制。 聚合和困难任务显示较强表现，但聚合领先不等于每个任务、每个阶段都领先。附录保留了某些基线更早成功的例子；视觉任务上作者使用的是相当而非全面压倒的结论。</figcaption></figure>
<!-- figure-ref-v6:end:9cc7d7a0a9ad -->
<!-- figure-ref-v6:start:95935551236a -->
<a id="paper-070-tdmpc2-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/070-tdmpc2-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/070-tdmpc2-v6-figure-5.png" width="2132" height="508" alt="TD-MPC2: Scalable, Robust World Models for Continuous Control，图5：单任务连续控制。 聚合和困难任务显示较强表现，但聚合领先不等于每个任务、每个阶段都领先。附录保留了某些基线更早成功的例子；视觉任务上作者使用的是相当而非全面压倒的结论。" loading="lazy"></a><figcaption>原图摘引：Nicklas Hansen、Hao Su、Xiaolong Wang，首次公开于 2023，本文对应 2024 年 arXiv v2，HTML S4.F5，图5。<a href="https://arxiv.org/html/2310.16828v2#S4.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。单任务连续控制。 聚合和困难任务显示较强表现，但聚合领先不等于每个任务、每个阶段都领先。附录保留了某些基线更早成功的例子；视觉任务上作者使用的是相当而非全面压倒的结论。</figcaption></figure>
<!-- figure-ref-v6:end:95935551236a -->
<!-- figure-ref-v6:start:133b5465e41a -->
<a id="paper-070-tdmpc2-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/070-tdmpc2-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/070-tdmpc2-v6-figure-6.png" width="2132" height="507" alt="TD-MPC2: Scalable, Robust World Models for Continuous Control，图6：单任务连续控制。 聚合和困难任务显示较强表现，但聚合领先不等于每个任务、每个阶段都领先。附录保留了某些基线更早成功的例子；视觉任务上作者使用的是相当而非全面压倒的结论。" loading="lazy"></a><figcaption>原图摘引：Nicklas Hansen、Hao Su、Xiaolong Wang，首次公开于 2023，本文对应 2024 年 arXiv v2，HTML S4.F6，图6。<a href="https://arxiv.org/html/2310.16828v2#S4.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。单任务连续控制。 聚合和困难任务显示较强表现，但聚合领先不等于每个任务、每个阶段都领先。附录保留了某些基线更早成功的例子；视觉任务上作者使用的是相当而非全面压倒的结论。</figcaption></figure>
<!-- figure-ref-v6:end:133b5465e41a -->


**[图7](#paper-070-tdmpc2-figure-7)、[表1](https://arxiv.org/html/2310.16828v2#S4.T1)：模型扩展与成本。** 80 任务模型从 5M 到 317M，归一化分数由 49.5 到 70.6，成本由约 4.2 到 33 GPU 天。增加 21.1 分不等于成功率提高 21.1 个百分点，因为分数混合了成功率和归一化回报。规模收益也伴随明显计算成本。

**[图8](#paper-070-tdmpc2-figure-8)、附录 E：新任务适应。** 预训练后在低交互预算下优于从零训练，但仍需要新任务环境交互。任务嵌入从语义相似任务初始化，这包含人工选择，不能称为无任务知识的零样本泛化。

<!-- figure-ref-v6:start:37744529f244 -->
<a id="paper-070-tdmpc2-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/070-tdmpc2-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/070-tdmpc2-v6-figure-8.png" width="2132" height="2071" alt="TD-MPC2: Scalable, Robust World Models for Continuous Control，图8：新任务适应。 预训练后在低交互预算下优于从零训练，但仍需要新任务环境交互。任务嵌入从语义相似任务初始化，这包含人工选择，不能称为无任务知识的零样本泛化。" loading="lazy"></a><figcaption>原图摘引：Nicklas Hansen、Hao Su、Xiaolong Wang，首次公开于 2023，本文对应 2024 年 arXiv v2，HTML S4.F8，图8。<a href="https://arxiv.org/html/2310.16828v2#S4.F8" target="_blank" rel="noopener noreferrer">核对原文</a>。新任务适应。 预训练后在低交互预算下优于从零训练，但仍需要新任务环境交互。任务嵌入从语义相似任务初始化，这包含人工选择，不能称为无任务知识的零样本泛化。</figcaption></figure>
<!-- figure-ref-v6:end:37744529f244 -->


**[图9](#paper-070-tdmpc2-figure-9)、附录 G：稳定性机制。** 消融支持多个组件共同起作用。梯度图为清晰仅展示每任务一个种子，能显示现象，不能单靠这些曲线估计罕见发散概率。

<!-- figure-ref-v6:start:6453f32d74ef -->
<a id="paper-070-tdmpc2-figure-9"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/070-tdmpc2-v6-figure-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/070-tdmpc2-v6-figure-9.png" width="2132" height="2439" alt="TD-MPC2: Scalable, Robust World Models for Continuous Control，图9：稳定性机制。 消融支持多个组件共同起作用。梯度图为清晰仅展示每任务一个种子，能显示现象，不能单靠这些曲线估计罕见发散概率。" loading="lazy"></a><figcaption>原图摘引：Nicklas Hansen、Hao Su、Xiaolong Wang，首次公开于 2023，本文对应 2024 年 arXiv v2，HTML S4.F9，图9。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2310.16828v2#S4.F9" target="_blank" rel="noopener noreferrer">核对原文</a>。稳定性机制。 消融支持多个组件共同起作用。梯度图为清晰仅展示每任务一个种子，能显示现象，不能单靠这些曲线估计罕见发散概率。</figcaption></figure>
<!-- figure-ref-v6:end:6453f32d74ef -->


**附录 J、[表10](https://arxiv.org/html/2310.16828v2#A10.T10.fig1)：离线数据覆盖。** 附加测试时正则可以改善部分配置，但强正则也降低成绩。原文明确这不是主实验默认设置，因此不能把它写成所有 TD-MPC2 结果都使用的保守规划模块。

作者避免把有限规模实验拟合成普遍缩放定律，这一点应保留。大模型曲线仍上升，并不意味着未来按同一比例持续增长。

## 五、掩码和任务定义限制共享模型外推

它仍会面对模型误差和离线分布外动作。潜状态不重建观测节约了学习负担，但也可能丢失当前任务不需要、未来新任务却需要的信息。任务回报错误时，世界模型再准确也可能规划出错误目标。

本文进一步分析：终端价值降低短视，却引入价值误差；增加规划候选提高搜索力度，也可能更积极利用模型漏洞。应同时测量预测校准和闭环成绩，而不是认为规划更多必然更好。

### 五个前置概念

五个前置概念：

1. **潜动力学**：预测内部表示如何随动作变化。
2. **终端价值**：估计有限规划结束后的未来回报。
3. **停止梯度**：把某个目标视为常数，避免两侧同时追逐。
4. **最大熵策略**：在高回报之外保留动作分布多样性。
5. **动作掩码**：屏蔽当前任务不存在的动作维度。

### 追问：统一多任务动作维度后，为什么补零也需要进入评价审查？

参考答案：补零只是张量接口安排，不是机器人真的多了可控制关节。若无效维度仍参与熵、候选采样或损失，任务之间会获得不同的虚假自由度。应核对训练、先验和规划三处掩码一致，并分别记录每个任务的有效动作维度；统一形状不能替代语义对齐。

## 六、沿机制关系继续读

本篇直接承接[TD-MPC](049-tdmpc.md)，改善表示、奖励价值尺度与多任务训练；与[Dreamer](037-dreamer.md)仍是平行模型控制路线，TD-MPC2执行时继续规划，而非只运行想象中训练好的actor。

## 七、自测三题与参考答案

**问题1：为什么世界模型不重建图像也能用于控制？**

答案：控制需要预测与动作选择有关的后果，而非所有视觉细节。潜一致性、奖励和价值监督可以保留这部分信息；但若新任务依赖被丢弃的细节，就可能需要重新学习表示。

**问题2：为什么补零动作必须同时从熵和规划中屏蔽？**

答案：不存在的动作维不会改变环境，却可能给策略制造虚假的高熵空间，或让模型评估不合理输入。只在最后执行时删掉它们，训练目标仍会受污染。

**问题3：一个模型会八十个任务，是否说明它不用数据就能做第八十一个？**

答案：不说明。多任务模型有这些任务的训练经验和嵌入；论文的新任务结果使用在线微调并初始化新嵌入。要证明零样本能力，需要留出任务且不更新模型，用明确的任务描述直接执行。
