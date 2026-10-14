# 082｜OpenVLA：开源视觉语言动作模型

[系列首页](README.md) · [上一篇](081-robocasa.md) · [下一篇](083-diffusion-rl.md)

**原论文**：*OpenVLA: An Open-Source Vision-Language-Action Model*，Moo Jin Kim、Karl Pertsch 等，2024。[论文](https://arxiv.org/abs/2406.09246)。

### 先接住前作的问题

[RT-2](065-rt2.md)连接互联网语义与动作token，但开放训练、复用和新机器人适配仍是门槛。OpenVLA沿用这一输出思路，公开模型并研究高效微调；语义先验、机器人数据和动作接口仍需共同成立。

## 一、问题设定：开放视觉语言模型怎样学成可适配动作策略

OpenVLA 将已经具备视觉语言知识的模型继续训练成机器人策略：看一张图、读一条指令，然后输出末端位移、旋转和夹爪动作。它沿用 RT-2 的动作 token 思路，重点解决开放使用、机器人数据训练和低成本适配问题。

这是离线模仿学习。输入是单张第三人称图像和语言指令；原始版本没有观测历史、本体状态或多相机输入。输出主要采用 7 维单臂末端控制动作。不要把后续 OpenVLA-OFT 等扩展能力倒写进这篇原论文。

预训练语料提供物体和语言知识，机器人数据提供观察到动作的映射。看懂“红杯子”不等于知道夹爪应旋转多少；反过来，只会把杯子抓起来也不一定能从多个物体中选择指令指定的那个。

任务奖励不是训练优化对象。实验用人工定义的成功或部分成功评分，不同任务评分规则并不完全一致。终止依赖具体任务的成功、失败和评价流程，不能把动作 token 结束标志当成机器人任务结束。

## 二、融合视觉特征并自回归预测动作token

它不是先写一段计划再调用技能库，也不是通过奖励自主发现动作。主体训练是大规模示范上的监督学习。动作成功依赖视觉语义知识、机器人示范和执行接口共同作用。

### 1. 融合视觉特征，再接入语言主干

模型基于 Prismatic：DINOv2 和 SigLIP 分别编码图像，将相应 patch 特征按通道拼接，由投影器映射到 Llama 2 的嵌入空间。

作者把 DINOv2 与空间信息、SigLIP 与语义信息联系起来，这是有背景依据的设计解释。最终系统同时改变数据和模型，不能把全部性能差异归功于其中一个编码器。

### 2. 每个动作维度变成离散 token

对一个连续动作维度，取训练分布的第 1 与第 99 百分位作为离散范围，划分为 256 个区间。这减少极端离群值拉大区间造成的精度损失，但也意味着范围外动作需要截断或边界处理。

教学上，设分位点为 $l,u$：

$$
b(a)=\operatorname{clip}
\left(\left\lfloor256\frac{a-l}{u-l}\right\rfloor,0,255\right).
$$

反解可取区间中心。这个表达解释离散化，不替代具体实现的边界约定。256 个动作符号被映射到词表中保留给动作使用的位置，不能理解成给模型自然语言输出“0.012 米”就完成了控制。

### 3. 自回归目标与物理误差不同

训练损失只计算动作 token：

$$
\mathcal L=-\sum_{j=1}^{d}\log p_\theta
(b_j\mid I,\ell,b_{<j}).
$$

$I$ 是图像，$\ell$ 是指令，$d$ 为动作维度。模型先预测某个动作分量，再条件于已有分量预测下一个。这里的序列首先是同一动作向量的编码，不是未来很多时间步的动作块。

交叉熵并不直接表示物理距离。相邻 bin 和相距很远的 bin 都是分类错误；机器人闭环还会放大或修正误差。因此高 token 准确率是训练诊断量，不是成功率的替代品。

### 4. 机器人微调与 LoRA

完整微调更新模型参数，包括视觉编码器。低秩适配则把某个权重变化写成：

$$
W'=W+BA,\qquad \operatorname{rank}(BA)\le r.
$$

冻结大矩阵 $W$，训练小矩阵 $A,B$，减少优化器状态和梯度存储；前向激活及基础权重仍需要显存。只训练 1.4% 参数不等于只需 1.4% 总显存。

离散精度要换回机器人单位理解。教学设某位移维的分位数范围长0.256米，256等宽bin就对应1毫米；按中心反解时，范围内的最坏量化误差约0.5毫米。若插入间隙只有0.2毫米，单次量化动作即使token预测完全正确，也未必足够；闭环修正或不同动作尺度能改变结果，不能仅凭词表大小判断可行性。

分位数还能把真实但罕见的恢复动作当成离群值压到边界。稳健统计减少常规动作分辨率损失，同时可能牺牲尾部覆盖，应检查被裁剪动作究竟是坏数据还是关键恢复行为。原文逐维分箱与只监督动作token的设计，应连着实际反归一化接口阅读。[原文§3.2](https://arxiv.org/html/2406.09246v1)

### 教学例子与五个前置概念

**自构例子，未运行**：同一个权重模型以 5 Hz 与 1 Hz 控制推杯子。即使每次预测的位移都正确，后者可能长时间持有旧目标，错过纠偏机会。再加入“统一 1 Hz”“同样动作但插值执行”两组，记录成功、超调与接触冲击，可区分模型误差和控制时序误差。

## 三、在机器人示范上训练动作token并适配新接口

视觉特征进入语言主干后，动作监督仍需正确离散化和反归一化。LoRA与量化改变适配成本，也可能改变数值实现，不能只按位数预测表现。

~~~text
准备经过清洗、动作语义一致的机器人轨迹
以分位数定义每维动作的离散区间
对每条训练样本：
    编码单张图像与语言指令
    将专家动作映射成 token 序列
    用动作 token 交叉熵更新模型
新任务：使用目标示范全量微调或训练低秩适配器
部署：
    获取当前图像和任务
    自回归预测动作分量 token
    反离散化并按目标机器人统计还原尺度
    执行动作，获取下一张图像
~~~

## 四、核对预训练、微调和量化比较的条件

实验支持它在多个物体和多指令任务中有较强适应能力；窄任务的精细控制并非总优于 Diffusion Policy。它的重要性在于提供可研究、可微调的 VLA 起点，而非已经实现高可靠通用操作。

**原图怎么读：** [图5，原论文图注与图像](#paper-082-openvla-figure-5)。按单指令窄任务和多指令干扰任务分组看扩散策略、Octo与OpenVLA。汇总最佳不代表在每类精度和语言条件上都占优。


<!-- figure-ref-v6:start:082-openvla-license -->
<p>原文标注 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本页摘图仅保留图形区域并作栅格化；有面板重排的图另行注明，作者与原文入口见各图注。</p>
<!-- figure-ref-v6:end:082-openvla-license -->
<!-- figure-ref-v6:start:a911d5ec42ef-anchor -->
<a id="paper-082-openvla-figure-5"></a>
<!-- figure-ref-v6:end:a911d5ec42ef-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/082-openvla-s5-f5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/082-openvla-s5-f5.png" width="1824" height="477" alt="OpenVLA: An Open-Source Vision-Language-Action Model，图5：按单指令窄任务和多指令干扰任务分组看扩散策略、Octo与OpenVLA。汇总最佳不代表在每类精度和语言条件上都占优。" loading="lazy"></a><figcaption>实验图原图摘引：Moo Jin Kim、Karl Pertsch 等，2024，HTML S5.F5，图5。<a href="https://arxiv.org/html/2406.09246v1#S5.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 项目 | 论文设置 | 检验问题 |
|---|---|---|
| 机器人预训练 | 约 970k Open X 轨迹；训练混合后期调整 | 大规模动作经验 |
| 主训练预算 | 64 A100、14 天、约 21500 A100 小时，batch 2048 | 上游计算成本 |
| 开箱评价 | WidowX 17 任务各 10 次；Google 12 任务各 5 次 | 多种分布变化 |
| 新任务适配 | Franka 两个设置，7 任务，每任务 10–150 示范 | 下游数据效率 |
| 全量微调 | 8 A100，每任务约 5–15 小时 | 获得新策略的训练成本 |
| 对照 | RT-X、Octo、完整及接口匹配的 Diffusion Policy | 系统表现与接口影响 |
| 参数效率 | 33 次评价的选定任务子集 | LoRA 与冻结策略 |
| 量化 | 8 个 Bridge 任务，80 次评价 | 显存、速度和闭环表现 |

数据混合不是始终固定：DROID 在训练中以较保守权重加入，最终三分之一训练移除。论文的 970k 是整体训练资源描述，不应推成每个阶段始终均匀采样同一集合。

参数效率与量化实验还有关键限定：§5.3–5.4 使用较小数据混合、仅 SigLIP 的简化版本。它们不是最终双视觉编码器主模型在所有任务上的逐项复验。

OpenVLA 的开放性也有范围：提供机器人训练部分的代码、数据配方与权重，但基础视觉和语言组件的完整上游训练数据并未全部开放。

### 五组证据与解释

**[图3](#paper-082-openvla-figure-3)、[表4](https://arxiv.org/html/2406.09246v1#A2.T4)：WidowX。** OpenVLA 平均 70.6%，RT-2-X 50.6%，差约 20 个百分点。然而部分任务允许 0.5 分，这不是全部由二元完整成功构成的频率。语义泛化类别中 RT-2-X 仍占优，不能说 OpenVLA 每种泛化都更好。

<!-- figure-ref-v6:start:f4ba4c88d8aa -->
<a id="paper-082-openvla-figure-3"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/082-openvla-v6-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/082-openvla-v6-figure-3.png" width="2132" height="897" alt="OpenVLA: An Open-Source Vision-Language-Action Model，图3：WidowX。 OpenVLA 平均 70.6%，RT-2-X 50.6%，差约 20 个百分点。然而部分任务允许 0.5 分，这不是全部由二元完整成功构成的频率。语义泛化类别中 RT-2-X 仍占优，不能说 OpenVLA 每种泛化都更好。" loading="lazy"></a><figcaption>原图摘引：Moo Jin Kim、Karl Pertsch 等，2024，HTML S5.F3，图3。<a href="https://arxiv.org/html/2406.09246v1#S5.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。WidowX。 OpenVLA 平均 70.6%，RT-2-X 50.6%，差约 20 个百分点。然而部分任务允许 0.5 分，这不是全部由二元完整成功构成的频率。语义泛化类别中 RT-2-X 仍占优，不能说 OpenVLA 每种泛化都更好。</figcaption></figure>
<!-- figure-ref-v6:end:f4ba4c88d8aa -->


**[图4](#paper-082-openvla-figure-4)、[表5](https://arxiv.org/html/2406.09246v1#A2.T5)：Google。** 85.0% 对 78.3%，误差区间较宽，论文按接近表现解读。主张的跨平台平均优势不能代替单个平台的统计强度。29 任务也不是 29 个全新机器人。

<!-- figure-ref-v6:start:557a9c7b8743 -->
<a id="paper-082-openvla-figure-4"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/082-openvla-v6-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/082-openvla-v6-figure-4.png" width="2132" height="1544" alt="OpenVLA: An Open-Source Vision-Language-Action Model，图4：Google。 85.0% 对 78.3%，误差区间较宽，论文按接近表现解读。主张的跨平台平均优势不能代替单个平台的统计强度。29 任务也不是 29 个全新机器人。" loading="lazy"></a><figcaption>原图摘引：Moo Jin Kim、Karl Pertsch 等，2024，HTML S5.F4，图4。<a href="https://arxiv.org/html/2406.09246v1#S5.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。Google。 85.0% 对 78.3%，误差区间较宽，论文按接近表现解读。主张的跨平台平均优势不能代替单个平台的统计强度。29 任务也不是 29 个全新机器人。</figcaption></figure>
<!-- figure-ref-v6:end:557a9c7b8743 -->


**[图5](#paper-082-openvla-figure-5)、[表6](https://arxiv.org/html/2406.09246v1#A2.T6)：下游适配。** OpenVLA 聚合较强，但倒物体等窄任务中 Diffusion Policy 可以更好。擦桌任务允许把一部分物体扫入簸箕获得部分分数，因此分数百分比不能直接说成完成整个清扫任务的比例。

**[表1](https://arxiv.org/html/2406.09246v1#S5.T1)：低秩微调。** 全量约 69.7%，rank 32 LoRA 约 68.2%，在此小评价集上相近；batch 16 的 LoRA 显存仍约 59.7 GB。降低参数训练量有价值，但“消费显卡可适配”依赖 batch 等配置，不能拿该表直接声称 24 GB 就能以相同设置训练。

**[表2](https://arxiv.org/html/2406.09246v1#S5.T2)：量化。** bfloat16 约 71.3%，int8 58.1%，int4 71.9%。8 位并非因精度更低就必然比 4 位差；作者观察到 int8 在评价 GPU 上推理只有约 1.2 Hz，改变了非阻塞控制时序，而 int4 约 3 Hz。离线 token 准确率接近，支持延迟解释，但若要严格分离，仍应做固定控制频率的对照。

附录 C 说明 Bridge 数据的首步全零动作导致冻结问题，OpenVLA 清洗该数据；RT-2-X 无法重训，评价时采用第二可能动作的查询办法。这是透明且重要的系统差异，不能把对比结果解释为纯架构的因果优势。

## 五、动作分箱与任务数据限制精细执行

上游数据、训练时间与基础模型知识都是成本。下游少量示范学习不是从零具备能力；与从零训练方法比较时必须保留这一背景。

作者承认单图像接口、吞吐和可靠性不足。我的分析是，这三个限制互相影响：缺历史会加剧遮挡和速度推断困难；慢推理会改变动作持续时间；单步预测缺少时间结构。改善最终控制未必需要扩大语言模型，可能更需要动作分块、时序设计或感知接口。

### 五个前置概念

五个前置概念：**VLM**用图像条件生成语言表示；**动作离散化**把连续量编码为有限符号；**自回归**逐个预测条件符号；**LoRA**限制可训练权重变化的秩；**非阻塞控制**让机器人在模型计算时继续执行，因此延迟直接影响闭环。

### 追问：动作分位数归一化遇到新的工作区范围时，会产生什么问题？

参考答案：旧缩放可能把新的必要动作压到边界或映射到不合适的物理步长。应核对目标机器人数据的单位、有效范围与反归一化，并单独评估边界状态。表示预训练可以复用，不代表动作尺度无需适配；只更换提示词无法修复执行接口的不匹配。

## 六、沿机制关系继续读

OpenVLA承接[RT-2](065-rt2.md)的动作token思路，并组合开放视觉语言骨干；后作[OpenVLA-OFT](091-openvla-oft.md)直接继承其权重并改变输出与微调配方，[FAST](089-fast.md)则另从动作编码冗余切入。

## 七、自测三题与参考答案

**问题1：为什么动作 token 准确率高仍可能操作失败？**

答案：离散分类没有直接表达物理误差大小，而且动作会改变下一步观测。小误差累积、错误动作持续时间或接触状态变化，都可能让离线正确率无法代表闭环成功。

**问题2：为什么不能据此宣布扩散策略被 VLA 全面取代？**

答案：窄任务中扩散可以更好，完整扩散策略还使用不同历史、本体信息和动作块。实验显示 VLA 对多物体、多指令任务有优势，不等于所有接触精度和时序需求都更优。

**问题3：8 位不如 4 位，应该先怀疑什么？**

答案：先核实硬件实现和控制频率。量化可能减少显存却增加算子开销，推理变慢会改变机器人行为。固定频率重新比较，才能更清楚判断数值精度与延迟分别贡献多少。
