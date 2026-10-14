# 037｜Dreamer：在潜在世界里训练控制策略

[系列首页](README.md) · [上一篇](036-metaworld.md) · [下一篇](038-cql.md)

**原论文**：*Dream to Control: Learning Behaviors by Latent Imagination*，Danijar Hafner 等，首次公开于2019；本文核对2020年的 arXiv v3。[论文](https://arxiv.org/abs/1912.01603)。

### 先接住前作的问题

[视觉预见](016-visual-foresight.md)提供一个阅读起点。Visual Foresight在像素未来中在线搜索，但持续生成完整画面会消耗控制计算。Dreamer把经验压缩到潜在状态，在想象中训练能直接执行的策略；未解问题是表示和模型梯度是否保留了控制所需信息。

## 一、问题设定：怎样在不反复生成图像的想象中学控制

这是在线、基于模型的视觉强化学习。输入是图像，动作是连续控制，真实环境反馈任务奖励。这里“纯粹在想象中学习行为”指 actor 和 critic 的训练来源，并不意味着世界模型不需要环境经验。

单张画面可能无法确定速度、接触或被遮挡部分，因此问题属于部分可观测控制。Dreamer 用带记忆的潜在动力学维护状态估计，而不是把每帧独立压成一个向量就宣称满足马尔可夫性。

主实验来自仿真控制套件，包含多种运动和接触任务。它是机器人学习的重要算法基础，却不是原论文已经完成真实机械臂部署的证据。后面的 DayDreamer 才进一步面对真实机器人持续收集经验的问题。

与 PlaNet 相比，Dreamer 沿用潜在动力学思路，但把在线动作序列搜索转成学习参数化策略。与 MBPO 相比，两者都从真实经验附近开始想象，但 Dreamer 还沿动力学计算图反传策略梯度，而非仅把模型生成的转移交给普通 SAC。

## 二、连接潜在动力学、可微回报与价值自举

它不只预测短期奖励，还学习价值函数，把想象范围之外的后果接回来。策略梯度可以穿过学习到的动力学，直接调整那些会让未来更好的动作。

### 1. 看见现在与想象未来使用不同分布

为避免与原文符号习惯混淆，以下采用教学记号 $q_\theta$ 表示看到图像后的状态后验，$p_\theta$ 表示不看下一图像时的先验：

$$
z_t\sim q_\theta(z_t\mid z_{t-1},a_{t-1},o_t),
\qquad
\hat z_{t+1}\sim p_\theta(z_{t+1}\mid z_t,a_t).
$$

$o_t$ 是图像，$z_t$ 是包含时序信息的潜在状态。前一个操作把新证据并入信念，后一个操作预测尚未观察到的未来。想象时没有未来图像，所以不能偷用后验编码器得到下一状态。

原始 Dreamer 使用 RSSM，结合确定性的循环部分与随机潜在变量。确定性部分记录历史，随机部分表达难以唯一预测的变化。潜在状态不是人工给定的关节角，而是为重构与预测学习的表示。

### 2. 世界模型目标

常用训练目标可整理为：

$$
L_{\mathrm{model}}=
-\log p_\theta(o_t\mid z_t)
-\log p_\theta(r_t\mid z_t)
+\beta D_{\mathrm{KL}}(q_\theta(z_t\mid\cdots,o_t)\|p_\theta(z_t\mid\cdots)).
$$

图像重构促使状态保存场景信息，奖励预测保留与任务有关的信息，KL 项让看到图像后的后验不要任意远离可预测先验。这个写法表达主要结构，未列出批次平均和 free-nats 等实现细节。

重构并不等于最终任务目标。背景纹理可能占很多像素，却对动作无用；相反，细小接触缝隙可能像素不多却决定成败。论文比较不同表示目标，正是在检验哪种监督能形成更有用的控制表示。

### 3. 在潜在状态里生成动作

连续动作使用可重参数化分布：

$$
a_t=\tanh(\mu_\phi(z_t)+\sigma_\phi(z_t)\epsilon_t),
\qquad\epsilon_t\sim\mathcal N(0,I).
$$

随机性由 $\epsilon_t$ 提供，动作对网络参数的依赖仍可求导。先有动作，再通过动力学得到下一潜在状态和奖励，于是多步后果对早期动作的梯度可以沿链式法则传播。

在更新策略时，**世界模型参数保持固定，但梯度仍可穿过模型到动作**。冻结参数与切断计算图是两回事。若全部使用 stop-gradient，Dreamer 最关键的路径导数便不存在了。

### 4. 价值函数把想象以外的未来接回来

仅把未来 $H$ 步奖励相加，会偏好短视行为。Dreamer 使用混合多步自举目标。下面是等价思想的递推写法：

$$
G_t^\lambda=\hat r_t+\gamma[
(1-\lambda)v_\psi(\hat z_{t+1})
+\lambda G_{t+1}^\lambda].
$$

在想象边界以价值预测结束递推。$\lambda$ 控制不同长度回报的权衡；$v_\psi$ 估计从该状态继续行动的收益。

价值网络拟合停止梯度的 $G_t^\lambda$，策略则最大化想象回报，并允许梯度沿奖励、价值与转移路径回到动作。两个更新不能混用：训练 critic 时让目标和预测互相追逐，可能产生不合理的捷径。

训练时的图像解码提供监督；想象行为不需要逐步把状态画成图片。省去这一步，是潜在想象能并行生成许多轨迹的重要原因。

想象梯度的风险不同于预测误差。局部设 $z_{t+1}=f(z_t,a_t)$，远期奖励对早期动作的梯度包含一串雅可比乘积 $\prod_j\partial f/\partial z_j$；这里 $z$ 是潜在状态，$f$ 是固定世界模型。即使每步位置预测误差小，斜率略错也可能随长度放大，或让梯度消失。更准确的画面不自动意味着更可靠的策略更新方向。

教学例：真实局部斜率1.0、模型斜率1.1，20次连乘相差约6.7倍。这个线性例子未运行，也不描述原文具体网络；它解释为何要控制想象长度并用价值自举接远期。实验应分别看模型预测、策略回报与想象长度敏感性。[原文潜在想象与策略梯度](https://arxiv.org/html/1912.01603v3)

### 帮助建立理解

**自构例子，未运行**：摆杆要先向反方向运动，才能积累能量最终立起。如果只看很短奖励，反向摆动可能显得不值得。价值网络若已知道“有足够角速度的中间状态”有前景，短想象达到这个状态后便能通过自举得到较高评价，进而鼓励前面的蓄力动作。

这个例子也说明模型风险：如果模型虚构某个动作能无代价增加角速度，梯度会鼓励利用它。下一轮环境数据应纠正错误，但纠正是否足够快是实验问题。

## 三、交替收集真实经验、学习模型与想象行为

固定模型参数$\psi$并不等于把想象状态全部detach。以$z_{t+1}=f_\psi(z_t,a_t)$为例，Actor需要保留$\partial f_\psi/\partial a_t$这条输入导数，才能沿未来回报更新当前动作；只是不在Actor步更新$\psi$。反过来，价值网络拟合的回报标签需要按规定停止梯度，避免标签随同一次价值拟合一起逃走。两个“冻结”发生在不同位置。

~~~text
用少量随机交互初始化环境序列池
重复：
    抽取连续图像、动作、奖励序列
    后验编码：把真实观察变成潜在状态
    用重构、奖励预测和 KL 更新世界模型

    冻结世界模型参数
    从上述潜在状态出发：
        策略采样动作
        先验动力学预测下一潜在状态
        奖励模型和价值网络给出预测
        重复到想象长度 H
    计算 lambda 回报
    价值网络拟合停止梯度的回报目标
    沿想象计算图更新策略以增加回报

    在环境中：
        用新图像修正当前潜在状态
        执行策略动作并记录反馈
    把新序列加入环境池
~~~

## 四、从表现对照检验想象训练的作用

**原图怎么读：** [图4，原论文图注与图像](#paper-037-dreamer-figure-4)。改变想象长度时，比较有无价值预测以及在线规划。价值模型承接时域之外的收益，因此曲线检验的是长期信用分配，不是未来视频生成得有多远。


<!-- figure-ref-v6:start:c013c64ca838-anchor -->
<a id="paper-037-dreamer-figure-4"></a>
<!-- figure-ref-v6:end:c013c64ca838-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/037-dreamer-s3-f4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/037-dreamer-s3-f4.png" width="1824" height="426" alt="Dream to Control: Learning Behaviors by Latent Imagination，图4：改变想象长度时，比较有无价值预测以及在线规划。价值模型承接时域之外的收益，因此曲线检验的是长期信用分配，不是未来视频生成得有多远。" loading="lazy"></a><figcaption>实验图原图摘引：Danijar Hafner 等，首次公开于2019，HTML S3.F4，图4。<a href="https://arxiv.org/html/1912.01603v3#S3.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 项目 | 原论文设置 |
|---|---|
| 主任务 | 二十个视觉控制任务 |
| 输入与动作 | 小尺寸 RGB 图像，连续动作 |
| 对照 | PlaNet、D4PG，以及作为参照的其他方法 |
| 核心消融 | 无价值模型、改变想象长度、替换表示学习目标 |
| 主要指标 | 回报对环境步数；同时讨论训练时间 |
| 统计 | 主结果平均五个种子 |
| 硬件 | 每次训练一张 V100 与十个 CPU 核 |

公平性最清楚的对照是共享世界模型而改变行为学习方式的 PlaNet。其他基线部分采用已有论文结果，输入信息与实现体系不完全相同，不能把所有比较都视作同一代码与机器上的重跑。

动作重复尤其影响预算。一个策略动作保持多个仿真步，会改变控制频率和有效规划跨度。论文统一主要连续控制实验的重复设置，并有专门消融；读后续论文时仍需确认“环境步数”与“决策次数”口径。

奖励来自任务环境，并非人类偏好或语言反馈。训练评估图像来自同一套基准范围，不能据此推断对真实光照、相机和物体类别都有广泛泛化。

### 结果：从表现到机制

依据[原文第3—6节与附录A](https://arxiv.org/html/1912.01603)。

1. **[图6](#paper-037-dreamer-figure-6)，总体性能**：Dreamer 在五百万环境步后平均分 823，D4PG 参照在一亿步为 786。它支持所测任务中的样本效率与表现收益；两种预算不同，不应称同预算提升。
2. **[图4](#paper-037-dreamer-figure-4)，想象长度消融**：有价值预测时对长度更稳健，支持自举缓解短视；并不意味着长度完全不影响训练。
3. **[图7](#paper-037-dreamer-figure-7)，长期任务**：比较只优化有限想象奖励与带价值的方法，检验是否需要跨越短期回报；不能自动推广到任意长操作链。
4. **[图8](#paper-037-dreamer-figure-8)，表示学习**：重构目标在该实验中比只预测奖励更有效；这不是“像素重构永远最好”的定理。
5. **[图5](#paper-037-dreamer-figure-5)，预测可视化**：展示保留轨迹的预测，说明模型捕捉到可见动态；漂亮视频不足以证明动作梯度或接触物理完全正确。

<!-- figure-ref-v6:start:b93831525d2c -->
<a id="paper-037-dreamer-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/037-dreamer-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/037-dreamer-v6-figure-5.png" width="1566" height="496" alt="Dream to Control: Learning Behaviors by Latent Imagination，图5：展示保留轨迹的预测，说明模型捕捉到可见动态；漂亮视频不足以证明动作梯度或接触物理完全正确。" loading="lazy"></a><figcaption>原图摘引：Danijar Hafner 等，首次公开于2019，HTML S4.F5，图5。<a href="https://arxiv.org/html/1912.01603v3#S4.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。展示保留轨迹的预测，说明模型捕捉到可见动态；漂亮视频不足以证明动作梯度或接触物理完全正确。</figcaption></figure>
<!-- figure-ref-v6:end:b93831525d2c -->
<!-- figure-ref-v6:start:520b4765aaa0 -->
<a id="paper-037-dreamer-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/037-dreamer-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/037-dreamer-v6-figure-6.png" width="2132" height="638" alt="Dream to Control: Learning Behaviors by Latent Imagination，图6：Dreamer 在五百万环境步后平均分 823，D4PG 参照在一亿步为 786。它支持所测任务中的样本效率与表现收益；两种预算不同，不应称同预算提升。" loading="lazy"></a><figcaption>原图摘引：Danijar Hafner 等，首次公开于2019，HTML S4.F6，图6。<a href="https://arxiv.org/html/1912.01603v3#S4.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。Dreamer 在五百万环境步后平均分 823，D4PG 参照在一亿步为 786。它支持所测任务中的样本效率与表现收益；两种预算不同，不应称同预算提升。</figcaption></figure>
<!-- figure-ref-v6:end:520b4765aaa0 -->
<!-- figure-ref-v6:start:d48a8ab71514 -->
<a id="paper-037-dreamer-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/037-dreamer-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/037-dreamer-v6-figure-7.png" width="2132" height="1051" alt="Dream to Control: Learning Behaviors by Latent Imagination，图7：比较只优化有限想象奖励与带价值的方法，检验是否需要跨越短期回报；不能自动推广到任意长操作链。" loading="lazy"></a><figcaption>原图摘引：Danijar Hafner 等，首次公开于2019，HTML S4.F7，图7。<a href="https://arxiv.org/html/1912.01603v3#S4.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。比较只优化有限想象奖励与带价值的方法，检验是否需要跨越短期回报；不能自动推广到任意长操作链。</figcaption></figure>
<!-- figure-ref-v6:end:d48a8ab71514 -->
<!-- figure-ref-v6:start:a484cedab188 -->
<a id="paper-037-dreamer-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/037-dreamer-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/037-dreamer-v6-figure-8.png" width="2132" height="1051" alt="Dream to Control: Learning Behaviors by Latent Imagination，图8：重构目标在该实验中比只预测奖励更有效；这不是“像素重构永远最好”的定理。" loading="lazy"></a><figcaption>原图摘引：Danijar Hafner 等，首次公开于2019，HTML S6.F8，图8。<a href="https://arxiv.org/html/1912.01603v3#S6.F8" target="_blank" rel="noopener noreferrer">核对原文</a>。重构目标在该实验中比只预测奖励更有效；这不是“像素重构永远最好”的定理。</figcaption></figure>
<!-- figure-ref-v6:end:a484cedab188 -->


论文还报告训练时间比较，因此不只讨论交互数。不过不同基线来源和实现必须保留，硬件相同也不能自动消除并行采样、软件优化等因素。

一个关键解释是：Dreamer 的长期能力来自“短想象加已学习的长期价值”，而非声称模型已经能准确生成无限远未来。价值误差和模型误差依旧会共同影响策略。

## 五、冻结模型参数不能保证模型梯度正确

代价包括世界模型训练、图像重构和反向传播。潜在表示若遗漏重要信息，后续 actor–critic 再强也无法凭空恢复。模型梯度若在数据稀少区域错误，策略可能朝错误方向优化。

本文分析：世界模型的预测误差和导数误差是不同问题。两个模型可以在已观察点给出接近结果，却在附近动作方向上给出不同斜率。Dreamer 使用这些斜率优化策略，因此闭环评估比单看重构损失更加必要。

### 五个前置概念

五个前置概念：

- **潜在状态**：从观察学习的紧凑动态表示。
- **先验与后验**：不看新观察的预测，与结合新观察的状态估计。
- **重参数化**：把随机采样写成可微函数加外部噪声。
- **路径导数**：沿动作到状态再到回报的计算链求梯度。
- **lambda 回报**：混合不同步数自举目标以平衡估计误差。

<details>
<summary>进阶追问与参考答案（3题）</summary>

**进阶问题1：无关背景重构是否会分散模型容量？**

参考答案：在容量有限且背景变化比控制目标更容易主导像素损失时可能会，但重构也可能保留任务尚未识别的重要信息。用相同前景轨迹合成不同背景，只改变背景熵；固定模型和训练预算，比较目标区域预测、潜在状态可预测性与闭环回报。只有控制表现下降，才支持背景重构在该条件下有害。

**进阶问题2：模型导数误差能否预测闭环失败？**

参考答案：它比平均图像误差更接近策略更新方向，但仍不是充分条件。可在可查询的仿真状态上，对相同小动作扰动比较真实回报差分与模型预测梯度方向，再按误差分层评估更新后的策略。真实硬件上无法无代价重置时，应采用受限扰动与重复试验；不能把不可测的精确真实梯度当作已知量。

**进阶问题3：相同模型用于规划或策略训练，预算怎样分配最划算？**

参考答案：答案取决于部署决策次数、延迟上限和环境变化速度。少量决策且场景常变时，在线搜索可能值得；大量重复决策时，把搜索摊销为策略训练可能更省。固定模型与数据，画出总训练算力、单次决策延迟和闭环回报的帕累托曲线，并把端到端延迟纳入控制测试，不能只比较模型调用次数。

这些回答给出机制分析与待检验设计，不是已经运行的新实验结果。

</details>

## 六、沿机制关系继续读

与[MBPO](033-mbpo.md)是平行模型策略学习路线：Dreamer让梯度穿过潜在动力学，MBPO将合成转移交给离策略更新；[DayDreamer](054-daydreamer.md)后续承接世界模型行为学习并验证真实机器人系统。

## 七、自测三题与参考答案

**问题1：Dreamer 想象时是不是每一步都生成图片再识别？**

答：不是。图像解码主要用于训练表示，想象在潜在状态之间推进。策略和价值模型直接使用潜在状态，因此省去反复图像生成与编码的成本。

**问题2：冻结世界模型参数，会不会让策略无法获得模型梯度？**

答：不会。可以不更新模型权重，但保留模型输出对动作输入的导数。策略梯度经由这些导数回到策略参数；冻结参数与切断梯度路径是不同操作。

**问题3：为什么模型只需想象有限步，也可能学会较长任务？**

答：想象末端的价值估计承接更远的回报，反复自举把后续收益传播回来。但这依赖价值和模型足够可靠，不表示有限想象自动解决所有长期规划问题。
