# 017｜渐进网络：像素策略如何迁移到真机

[系列首页](README.md) · [上一篇](016-visual-foresight.md) · [下一篇](018-domain-randomization.md)

**原论文**：*Sim-to-Real Robot Learning from Pixels with Progressive Nets*，Andrei A. Rusu 等，2016。[原文](https://arxiv.org/abs/1610.04286)。

### 先接住前作的问题

[视觉运动策略](010-visuomotor.md)在训练环境学到了相机到动作的反馈，但换到真实观测分布后，已有表示可能失效。Progressive Nets研究怎样冻结旧知识又让新列学习现实差异；这里比较表示迁移，不把引导式训练当作本篇的必需前身。

## 一、问题设定：怎样保留仿真能力又学习真实差异

仿真中学会伸手，不代表真实相机里的机械臂也能照做。直接从头训练浪费已有能力，直接微调又可能破坏原来有用的特征。本文采用渐进网络：冻结仿真策略，增加一条新网络，通过横向连接读取旧网络的中间表示，再在真机上学习。

仿真使用 MuJoCo，真实平台是 Jaco 机械臂。初始任务是朝视觉目标到达：观察 RGB，输出各关节的速度选择。目标附近获得奖励，越界、碰桌或自碰撞会终止回合。任务不是连续力矩控制，也不是接触丰富的装配。

奖励是外部任务反馈，真实平台通过颜色目标跟踪与末端相对位置自动给出。政策只从图像行动，并不表示训练系统只有图像、没有额外用于评分与安全终止的信息。这种训练与部署信息差异应明确保留。

## 二、冻结旧列并用横向连接训练适应列

它不是零样本部署，也不是把仿真渲染做得更逼真。核心问题是已有策略能否成为真机学习的起点，并减少真实探索量。

第 $k$ 列在第 $i$ 层的教学形式为：

$$
h_i^{(k)}=
f\left(
W_i^{(k)}h_{i-1}^{(k)}
+\sum_{j<k}U_i^{(k:j)}h_{i-1}^{(j)}
\right).
$$

$W$ 是新列内部权重，$U$ 是从旧列读取特征的横向连接，$f$ 为非线性。旧列参数冻结，新列可以学习使用、转换或忽略旧特征。保留旧列意味着旧能力不会因参数覆盖而丢失，但并不保证新任务一定获得正迁移。

在机器人场景中，仿真列可以较宽，真机列较窄。原因是昂贵的视觉控制基础已经学过，新列主要处理差异。不同列还可以接不同模态，例如后来加入关节角和速度；这比固定结构的直接微调灵活。

### 一个容易漏掉的初始化设计

新列随机初始化可能让初始行动完全失去仿真技能。原文因此把旧列输出连接复制到新列输出，来自新隐藏分支的输出权重初始为零，使新策略起初与旧策略一致。

这不是把新列永久关掉。输出权重仍可训练，之后逐步引入新特征。冻结旧网络解决保留问题，输出初始化解决早期探索问题，两者作用不同。没有这个区分，就容易把所有加速都归因于“不遗忘”。

### 策略如何产生多关节动作

原文对9个自由度各输出三个速度选项：正、负、零。动作分布因子化：

$$
\pi(a|s)=\prod_{j=1}^{9}\pi_j(a_j|s).
$$

每个关节一个三分类头，另有一个价值输出，因此输出维度为28。共享隐藏表示仍能协调关节，但给定表示后的独立采样结构限制了联合分布表达；它与直接枚举 $3^9$ 种组合不同。

策略使用优势 Actor–Critic 更新。教学目标可写为：

$$
L_\pi=-\mathbb E[\log\pi(a_t|s_t)\hat A_t]
-\beta H(\pi),\qquad
L_V=\mathbb E[(V(s_t)-\hat R_t)^2].
$$

这部分沿用已有强化学习框架。本文改的是知识如何跨域保留和接入，不是提出新的策略梯度定理。

伪代码表达方法关系，未包含具体并行线程或安全控制实现。真实训练不是靠删除仿真器名称就能运行，底层速度限制和评分机制仍需复现。

“新分支权重置零”还有一个训练细节。设输出 $z=U h_{old}+W h_{new}$，其中 $h_{old},h_{new}$ 为旧、新隐藏特征，$U,W$ 为输出连接，$L$ 为训练损失。初始 $W=0$，则第一步 $\partial L/\partial h_{new}=W^\top\partial L/\partial z=0$，但 $\partial L/\partial W=(\partial L/\partial z)h_{new}^\top$ 一般非零。先学会打开新分支，之后梯度才深入新隐藏层；零输出连接并不意味着整列永远学不动。

这条教学链式推导也解释了初始化的因果角色：它确保第一次真机探索仍能表现旧技能，而非直接证明新列表示更好。比较迁移速度时，冻结、横向连接和行为保真初始化若一起变化，不能把全部提升归给避免遗忘一个因素。[原文§3初始化](https://arxiv.org/html/1610.04286)

### 一个自构例子

未运行的教学例子：仿真列学会从灰色机械臂图像判断手掌在哪，并向红色目标移动。真实画面有反光和阴影。新列不必重新学习全部控制关系，而可修正视觉特征，再通过旧列提供的动作倾向开始探索。

假设新分支一开始随机给出强烈左转，可能立刻撞到边界，根本采不到有效奖励。输出初始化让它先沿旧策略行动，才有机会积累现实差异的数据。这解释了“知识复用”与“探索起点”为什么必须同时考虑。

## 三、冻结旧列并训练带横向输入的新列

旧列保持参数不变，新列却可以改变怎样利用它的中间特征。实现中要追踪冻结与可训练部分，以及新动作输出的初始化；少量真机学习并没有被省掉。

~~~text
在仿真中：
    用 A3C 训练宽网络列，选择表现好的配置
转移到真实机器人：
    冻结仿真列
    新建较窄真实列及横向连接
    复制旧输出路径，新分支输出权重置零
    用真实交互与任务奖励更新新列和横向连接
    保持旧列参数不变
扩展到相关新任务：
    冻结已有列
    新增列，可接收额外本体感知输入
    用新任务数据训练，复用先前视觉与控制特征
~~~

## 四、把真实交互、仿真预训与参数规模分开

新列从仿真受益多少，需要与从零学习和直接微调在同一真实交互预算下比较。仿真预训步数和随任务增加的参数也应另计。

作者报告了视觉到动作的机器人迁移与后续任务复用。实验支持局限于目标到达及相关移动目标任务。

**原图怎么读：** [图6，原论文图注与图像](#paper-017-progressive-figure-6)。实线经过中值滤波，点线保留原始回报。先看真实训练过程中原始波动，再判断迁移速度；平滑曲线的外观本身不是跨随机种子的置信区间。


<!-- figure-ref-v6:start:a97af322ca8e-anchor -->
<a id="paper-017-progressive-figure-6"></a>
<!-- figure-ref-v6:end:a97af322ca8e-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/017-progressive-s4-f6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/017-progressive-s4-f6.png" width="1824" height="1262" alt="Sim-to-Real Robot Learning from Pixels with Progressive Nets，图6：实线经过中值滤波，点线保留原始回报。先看真实训练过程中原始波动，再判断迁移速度；平滑曲线的外观本身不是跨随机种子的置信区间。" loading="lazy"></a><figcaption>实验图原图摘引：Andrei A. Rusu 等，2016，HTML S4.F6，图6。<a href="https://arxiv.org/html/1610.04286v2#S4.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 项目 | 原文信息及含义 |
|---|---|
| 输入 | 64×64 RGB，扩展任务加入18维关节角与速度 |
| 动作 | 6个机械臂关节加3个手指自由度，每个三种速度 |
| 奖励 | 手掌距目标10厘米内每步+1，回合最多50步 |
| 仿真预算 | 达到稳定表现约5000万步，作者报告CPU集群约24小时 |
| 真机预算 | 每个主要实验约6万步、约4小时 |
| 主基线 | 从头训练窄/宽网络、微调、渐进窄/宽网络 |
| 调参 | 仿真中搜索30种配置并选择；迁移相关参数另用模拟迁移设置调节 |
| 统计 | [图4](#paper-017-progressive-figure-4)的5次运行混合了种子与超参数变化；[图6](#paper-017-progressive-figure-6)每种扰动300次配置试验 |
| 泛化维度 | 颜色、视角的模拟变化，以及从静态目标到动态目标的相关任务迁移 |

<!-- figure-ref-v6:start:58d889d4a0a6 -->
<a id="paper-017-progressive-figure-4"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/017-progressive-v6-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/017-progressive-v6-figure-4.png" width="2132" height="2153" alt="Sim-to-Real Robot Learning from Pixels with Progressive Nets，图4：| 统计 | 图4的5次运行混合了种子与超参数变化；图6每种扰动300次配置试验 |" loading="lazy"></a><figcaption>原图摘引：Andrei A. Rusu 等，2016，HTML S4.F4，图4。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/1610.04286v2#S4.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。| 统计 | 图4的5次运行混合了种子与超参数变化；图6每种扰动300次配置试验 |</figcaption></figure>
<!-- figure-ref-v6:end:58d889d4a0a6 -->


仿真预算不可从总学习成本中抹掉。方法减少的是昂贵真机探索，而非无条件减少所有计算。此外，作者估算完全在真机完成同等仿真步数需要53天，这是速率换算，不是实际运行了53天的对照。

### 五项证据

依据[原始 PDF](https://arxiv.org/pdf/1610.04286)。论文2016年首次公开，CoRL2017，所读PDF为2018年v2。

| 位置 | 观察 | 结论边界 |
|---|---|---|
| [图1](#paper-017-progressive-figure-1)–2、第2节 | 冻结列与横向连接结构 | 明确复用机制，不是零数据迁移证明 |
| 表1、[图4](#paper-017-progressive-figure-4) | 宽列与窄列在仿真学习表现不同 | 支持分阶段容量配置，不能推出越窄越好 |
| [图5](#paper-017-progressive-figure-5)、第4.2节 | 渐进方法真机获得奖励，从头对照在给定预算失败 | 说明实际预算下迁移价值，不证明从头永远学不会 |
| [图6](#paper-017-progressive-figure-6) | 模拟颜色/视角扰动中，渐进方法对配置更稳健 | 300次并非300次真机试验 |
| [图7](#paper-017-progressive-figure-7)、第4.3节 | 复用静态任务知识加速动态目标学习 | 是相关任务课程，不是任意新技能即学即会 |

<!-- figure-ref-v6:start:56368a5f2043 -->
<a id="paper-017-progressive-figure-1"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/017-progressive-v6-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/017-progressive-v6-figure-1.png" width="2132" height="1031" alt="Sim-to-Real Robot Learning from Pixels with Progressive Nets，图1：读图对应本段的“冻结列与横向连接结构”；明确复用机制，不是零数据迁移证明。" loading="lazy"></a><figcaption>原图摘引：Andrei A. Rusu 等，2016，HTML S2.F1，图1。<a href="https://arxiv.org/html/1610.04286v2#S2.F1" target="_blank" rel="noopener noreferrer">核对原文</a>。读图对应本段的“冻结列与横向连接结构”；明确复用机制，不是零数据迁移证明。</figcaption></figure>
<!-- figure-ref-v6:end:56368a5f2043 -->
<!-- figure-ref-v6:start:667f4cfaa155 -->
<a id="paper-017-progressive-figure-2"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/017-progressive-v6-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/017-progressive-v6-figure-2.png" width="492" height="500" alt="Sim-to-Real Robot Learning from Pixels with Progressive Nets，图2：两列循环网络分别保留各自的LSTM状态，并由横向连接传递已学表征；这张结构图不是迁移效果曲线。" loading="lazy"></a><figcaption>原图摘引：Andrei A. Rusu 等，2016，PDF第5页，图2。<a href="https://arxiv.org/pdf/1610.04286v2#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。两列循环网络分别保留各自的LSTM状态，并由横向连接传递已学表征；这张结构图不是迁移效果曲线。<a href="https://arxiv.org/html/1610.04286v2" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:667f4cfaa155 -->
<!-- figure-ref-v6:start:b1ecc562955d -->
<a id="paper-017-progressive-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/017-progressive-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/017-progressive-v6-figure-5.png" width="2132" height="775" alt="Sim-to-Real Robot Learning from Pixels with Progressive Nets，图5：读图对应本段的“渐进方法真机获得奖励，从头对照在给定预算失败”；说明实际预算下迁移价值，不证明从头永远学不会。" loading="lazy"></a><figcaption>原图摘引：Andrei A. Rusu 等，2016，HTML S4.F5，图5。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/1610.04286v2#S4.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。读图对应本段的“渐进方法真机获得奖励，从头对照在给定预算失败”；说明实际预算下迁移价值，不证明从头永远学不会。</figcaption></figure>
<!-- figure-ref-v6:end:b1ecc562955d -->
<!-- figure-ref-v6:start:33ad23c86993 -->
<a id="paper-017-progressive-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/017-progressive-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/017-progressive-v6-figure-7.png" width="2132" height="1868" alt="Sim-to-Real Robot Learning from Pixels with Progressive Nets，图7：读图对应本段的“复用静态任务知识加速动态目标学习”；是相关任务课程，不是任意新技能即学即会。" loading="lazy"></a><figcaption>原图摘引：Andrei A. Rusu 等，2016，HTML S4.F7，图7。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/1610.04286v2#S4.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。读图对应本段的“复用静态任务知识加速动态目标学习”；是相关任务课程，不是任意新技能即学即会。</figcaption></figure>
<!-- figure-ref-v6:end:33ad23c86993 -->


[图5](#paper-017-progressive-figure-5)的约34分是回合奖励，表示到达目标区域后持续获得奖励的能力，不能说成34%成功率。最大50步也不等于所有回合都能获得50分，机器人需要移动时间并满足安全条件。

原文平滑曲线覆盖在原始奖励上，有助观察趋势；仍不能将视觉平滑当成误差条或重复训练置信区间。稳健性的更直接证据来自[图6](#paper-017-progressive-figure-6)的大量配置比较。

## 五、保留旧参数不等于新任务不会负迁移

参数冻结保证旧路径保持，但存储与推理成本会随列数量增加。若新列读取所有旧列，长期扩展还涉及选择、压缩与维护问题。这是结构分析，原文没有在上百个任务上测量其规模极限。

另一风险是旧知识可能不适合新域。横向连接理论上可以忽略旧特征，但学习如何忽略仍需数据。对于完全不同形态、观察视角或动作接口，本文简单到达实验没有提供广泛保证。它展示的是迁移学习机制可行，不是通用机器人基础模型已经形成。

### 五个前置概念

五个概念分别是：**sim-to-real gap**指渲染、传感器和动力学差异；**微调**在新数据上更新已有参数；**灾难性遗忘**指新任务更新损害旧功能；**渐进网络**冻结旧列并为新任务添加新列；**Actor–Critic**通过价值估计辅助策略更新。

### 追问：怎样排除渐进网络收益只是参数更多？

参考答案：应匹配新策略的可训练容量，比较有无旧列横向特征，并单独报告冻结参数和可训练参数。还要固定真实交互与选模预算，否则更大的搜索空间或更多调参可能被算作迁移收益。旧任务的参数保留是结构事实，而新任务是否受益仍需在这些对照下观察。

## 六、沿机制关系继续读

[视觉域随机化](018-domain-randomization.md)是平行迁移策略：Progressive Nets允许真机继续学习新列，随机化主要尝试让模拟训练得到的感知直接适用。二者可以组合，但“零样本迁移”与“少量真实微调”必须分栏报告。

## 七、自测三题与参考答案

**问题1：冻结旧参数，为什么新策略还能适应？**

答案：新列拥有可训练参数和横向连接，能重组旧表示并形成自己的输出。冻结的是知识来源，不是整个计算图；新任务学习发生在新增路径上。

**问题2：仿真训练5000万步、真机6万步，能说算法只需6万步吗？**

答案：只能说迁移阶段用了约6万真机步。总资源还包括仿真预训练与调参，但真实交互往往成本更高，因此把两类预算分列比混成单个数字更有意义。

**问题3：旧任务不遗忘是否意味着新任务不会负迁移？**

答案：不是。旧列功能保留与新列学得好是两个命题。旧特征可能无关甚至误导，新列虽可忽略它们，仍需要足够数据识别何者有用。
