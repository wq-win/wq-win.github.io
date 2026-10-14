# 053｜Diffuser：通过去噪生成行为轨迹

[系列首页](README.md) · [上一篇](052-gato.md) · [下一篇](054-daydreamer.md)

**原论文**：*Planning with Diffusion for Flexible Behavior Synthesis*，Michael Janner、Yilun Du、Joshua B. Tenenbaum、Sergey Levine，2022。[论文](https://arxiv.org/abs/2205.09991)。

### 先接住前作的问题

[Dreamer](037-dreamer.md)逐步想象潜在转移并训练可执行策略，但它不把整条状态动作计划作为同时修正的对象。Diffuser从离线轨迹学习联合去噪，再在采样时加目标约束；两者利用未来信息的计算位置不同。

## 一、问题设定：怎样同时修正整条状态动作计划

通常的模型规划是“猜一个动作，再预测下一步”，重复很多次。Diffuser换了一种方式：先产生一整条杂乱轨迹，再反复修正它，让起点、终点、中间状态和动作逐渐相互协调。

单步模型可以在测试集预测得很好，却被优化器找到漏洞。优化器会主动搜索高奖励动作；一旦模型在某些数据少的区域过度乐观，它就把计划推向错误区域。仅改善平均单步误差，未必改善实际控制。

Diffuser从离线状态动作轨迹学习联合分布。奖励可来自原数据，也可在测试时通过目标约束指定。它是面向规划的生成模型，既不同于直接行为克隆单步动作，也不同于先学一个独立动力学再交给通用优化器。

全部主实验是模拟环境。迷宫观察低维位置等状态；积木实验包含机器人与物体状态，指导函数还访问接触相关状态维度；运动控制使用D4RL低维状态动作。没有从真实相机端到端完成这些任务的证据。

目标可以是终点、积木配置或累积回报。终止条件由具体环境定义；算法中的规划长度不是回合最大长度，更不是扩散步数。这三个时间尺度必须区分。

## 二、用轨迹去噪与条件引导连接远端目标

这种修正使用扩散模型。模型从离线轨迹学习哪些行为序列像真实数据；执行任务时，用目标条件或奖励梯度引导去噪。于是“从模型采样”和“生成计划”几乎成为同一个过程。

论文在模拟迷宫、积木和离线运动控制中验证这一思路，优势主要在长时域与测试时目标调整。它不是后来直接生成动作块的Diffusion Policy：这里联合生成未来状态和动作，具有显式轨迹规划含义。

### 1. 两个时间轴

用 $\tau^0$ 表示干净轨迹，列方向是物理时间 $t$，每列含 $s_t,a_t$。对整个数组加高斯噪声，得到 $\tau^k$，其中上标 $k$ 是扩散噪声等级。

$$
\tau^k=\sqrt{\bar\alpha_k}\tau^0+
\sqrt{1-\bar\alpha_k}\epsilon,\qquad
L_{\mathrm{denoise}}=\mathbb E\|\epsilon-\epsilon_\theta(\tau^k,k)\|_2^2.
$$

网络学习从带噪轨迹估计噪声。训练时只需抽某个噪声等级，无需每次走完所有反向步骤；采样时才从高噪声逐步还原。

网络用沿时间的一维卷积U-Net。同一步去噪主要协调相邻物理时间，反复多轮后信息可以传播得更远。这种时间结构不同于因果自回归：未来目标可以影响更早动作，是规划所需要的条件依赖，并不违反真实动力学的因果性。

### 2. 轨迹先验和任务要求分开

论文把任务条件写成：

$$
\tilde p(\tau)\propto p_\theta(\tau)h(\tau).
$$

$p_\theta$偏向离线数据中合理的轨迹，$h$偏向当前任务需要的轨迹。若 $h(\tau)=\exp(\alpha J(\tau))$，反向采样的均值可以近似加入收益梯度：

$$
\tau^{k-1}\sim\mathcal N\!\left(
\mu_\theta(\tau^k,k)+\alpha\Sigma_k\nabla_\tau J(\mu_\theta),
\Sigma_k\right).
$$

$J$可为在同一数据上训练的回报预测器，$\alpha$控制引导强度。这个近似依赖局部平滑等条件，不是精确抽样证明；引导太大还会压过数据先验，重新走向不可靠轨迹。

### 3. 起点终点作为“修补”条件

若知道当前状态或期望终点，每轮去噪后把相应数组位置设回条件值。其余位置由模型补全，类似图像修补。当前状态必须始终对齐真实观测，否则生成的可能是一条从错误起点出发的漂亮计划。

硬写入终点坐标只保证数组中的终点值，不能保证中间路径不撞墙、动作能实现所有状态变化。可行性依赖模型学到的联合结构和实际执行反馈。

原论文迷宫使用开环计划，而一般算法展示滚动重规划。不能把全部结果都称为同一种闭环MPC。热启动小节对“开环”和每步重规划有容易混淆的表述，阅读时以具体任务协议区分。

模型优化的是噪声预测误差；计划阶段改变的是条件采样分布；评测关注回报或任务分数。没有显式critic TD备份，不应为了套RL模板再虚构actor–critic组件。

硬条件满足与轨迹动力学一致可以分开检查。教学设定为一维系统 $s_{t+1}=s_t+a_t$，生成数组中 $s_0=0,s_1=2,a_0=0.1$，起终点条件都被写回，却有残差 $s_1-s_0-a_0=1.9$。图像式inpainting只约束已知格子，不自动把每对相邻状态投影到真实转移流形。

因此扩散先验学习到的联合一致性才是中间动作可执行的来源。加大目标引导会更服从目标，却可能更偏离数据支持；增加去噪次数也不保证修好先验未学过的接触。原文把约束修补与回报梯度引导分开，评价时也应分别报告目标满足、真实执行与采样预算。[原文§3.2—3.3](https://arxiv.org/html/2205.09991)

### 帮助建立理解

**自构例子，未运行。** 迷宫里起点与终点隔着一道墙。直接逐步朝目标走会撞墙。Diffuser先得到一条杂乱曲线，每轮同时调整靠近墙两侧的多个位置，最终可能经门洞绕行。若强行给出一个位于墙内的终点，数组修补仍会固定它；模型只能勉强生成不合理路径。这说明“能施加条件”不等于“条件一定可满足”。

可进一步验证：固定计算预算比较去噪步数与候选数；移除接触指导检查堆叠下降；对轨迹加入真实扰动比较开环、重规划与热启动恢复能力。

## 三、以目标约束引导轨迹去噪并滚动执行

扩散迭代发生在计划空间中，100次去噪不等于执行100步。目标条件约束生成轨迹，实际执行后仍需按新起点重新生成。

~~~text
离线训练：
    从真实记录的离线轨迹采样固定长度窗口
    抽扩散等级和噪声，对状态动作数组加噪
    训练时间U-Net预测噪声
    若使用奖励引导：另训练带噪轨迹的回报预测器

规划：
    初始化整段高斯噪声轨迹
    从高噪声等级到低等级：
        用去噪网络计算反向均值
        若有回报目标，用梯度移动均值
        采样下一等级轨迹
        将起点和规定目标位置恢复为条件值
    输出完整状态动作计划

执行：
    按任务协议使用整段计划或只执行首个动作后重规划
    若采用热启动，对旧计划轻度加噪，再做少量去噪修正
~~~

## 四、区分长时域规划收益与生成可行性

**原图怎么读：** [图4，原论文图注与图像](#paper-053-diffuser-figure-4)。先看固定起点和目标怎样作为轨迹修补条件，再看中间轨迹如何生成。图中连接成立是模型内的计划结果，不等于每个预测动作都已在真实动力学中验证。

<!-- figure-ref-v6:start:133190fbc0f6 -->
<a id="paper-053-diffuser-figure-4"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/053-diffuser-v6-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/053-diffuser-v6-figure-4.png" width="952" height="760" alt="Planning with Diffusion for Flexible Behavior Synthesis，图4：三行分别对应U-Maze、Medium和Large；每行从左向右去噪，固定起终点后中间路径逐步形成。行名与去噪方向均保留，示例轨迹不能替代任务平均回报。" loading="lazy"></a><figcaption>原图摘引：Michael Janner、Yilun Du、Joshua B. Tenenbaum、Sergey Levine，2022，PDF第6页，图4。<a href="https://arxiv.org/pdf/2205.09991v2#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。三行分别对应U-Maze、Medium和Large；每行从左向右去噪，固定起终点后中间路径逐步形成。行名与去噪方向均保留，示例轨迹不能替代任务平均回报。<a href="https://arxiv.org/html/2205.09991v2#S5.F4" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:133190fbc0f6 -->


<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/053-diffuser-s5-f4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/053-diffuser-s5-f4.png" width="1804" height="1371" alt="Planning with Diffusion for Flexible Behavior Synthesis，图4：先看固定起点和目标怎样作为轨迹修补条件，再看中间轨迹如何生成。图中连接成立是模型内的计划结果，不等于每个预测动作都已在真实动力学中验证。" loading="lazy"></a><figcaption>实验图原图摘引：Michael Janner、Yilun Du、Joshua B. Tenenbaum、Sergey Levine，2022，HTML S5.F4，图4。原图面板重新排版，数据未改。<a href="https://arxiv.org/html/2205.09991v2#S5.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

[表2](https://arxiv.org/html/2205.09991v2#S5.T2)中的150规划种子按规划评价重复解释，不能改称150次独立模型训练。

| 项目 | 设置与解释 |
|---|---|
| 迷宫 | D4RL Maze2D三种规模，数据为去随机地点的无定向轨迹；成功位置给稀疏奖励 |
| 多目标迷宫 | Multi2D每回合重采目标，同一个Diffuser改变条件即可 |
| 积木 | 模拟Kuka、10000条PDDLStream示范；无条件堆叠、指定顺序、重排 |
| 积木引导 | 目标配置分类器与接触约束组合；接触约束使用状态中的接触维度 |
| 运动控制 | 三种环境乘三类D4RL数据，奖励预测器与扩散模型使用相同数据 |
| 训练 | Adam、学习率 $4\times10^{-5}$、batch32、50万更新 |
| 物理规划长度 | 运动32、积木128；迷宫按规模128/265/384，按附录所列 |
| 去噪步数 | 运动20、积木100；热启动另比较2–100步 |
| 不确定性 | 运动[表2](https://arxiv.org/html/2205.09991v2#S5.T2)均值与标准误差来自150个规划种子；不等于150次独立模型训练 |
| 未完整核实 | 各数据集全部转移数、主训练硬件与墙钟预算，以及其他表格重训种子分解 |

不同任务的引导尺度也不同，特别是Hopper medium-expert使用更小尺度；不能称全任务完全无调参。调整规划长度时还可能需要改引导强度。

迷宫MPPI用真实动力学仍失败，支持长时域稀疏目标使传统搜索困难；它不支持Diffuser预测物理比真实模型更准。多目标IQL对照加入目标条件和事后重标注，是作者适配的具体版本，不能把其结果概括成所有目标条件RL都无法规划。

积木基线看到目标，但Diffuser还使用定制接触指导。成功差距是完整方法的差距；若要声称仅扩散架构带来全部收益，需要进一步把额外约束分别接入基线或做对应消融。

### 五处关键结果

**[表1](https://arxiv.org/html/2205.09991v2#S4.T1)：迷宫长规划。** Maze2D Large中Diffuser123.0、IQL58.6、MPPI5.1。123并非123%成功率，而是归一化任务得分，超过100表示超过基准参考策略。目标固定与每回合随机的两种协议也应分开报告。

**[图3](#paper-053-diffuser-figure-3)、[图4](#paper-053-diffuser-figure-4)：组合与条件传播。** 图中展示直线片段可组合出新路径，起终点条件可通过去噪传播到中间轨迹。它说明了机制现象，不能替代任意地图、动态障碍或复杂接触下的可行性证明。

<!-- figure-ref-v6:start:8c7b4f70213d -->
<a id="paper-053-diffuser-figure-3"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/053-diffuser-v6-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/053-diffuser-v6-figure-3.png" width="1740" height="792" alt="Planning with Diffusion for Flexible Behavior Synthesis，图3：组合与条件传播。 图中展示直线片段可组合出新路径，起终点条件可通过去噪传播到中间轨迹。它说明了机制现象，不能替代任意地图、动态障碍或复杂接触下的可行性证明。" loading="lazy"></a><figcaption>原图摘引：Michael Janner、Yilun Du、Joshua B. Tenenbaum、Sergey Levine，2022，PDF第5页，图3。<a href="https://arxiv.org/pdf/2205.09991v2#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。组合与条件传播。 图中展示直线片段可组合出新路径，起终点条件可通过去噪传播到中间轨迹。它说明了机制现象，不能替代任意地图、动态障碍或复杂接触下的可行性证明。<a href="https://arxiv.org/html/2205.09991v2#S3.F3" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:8c7b4f70213d -->


**[表3](https://arxiv.org/html/2205.09991v2#S5.T3)：积木任务。** 指定堆叠Diffuser45.6、重排58.9，而所测BCQ/CQL在这两项为0。100代表完美任务执行的分数；不能直接说45.6%的完整堆叠成功。成功放置逐次得分与整条任务全成功不是同一个统计量。

**[表2](https://arxiv.org/html/2205.09991v2#S5.T2)：运动任务并非全面占优。** 九项平均Diffuser77.5，CQL77.6，IQL77.0，TT78.9，整体接近。HalfCheetah medium-replay中Diffuser37.7低于CQL45.5；Walker2d medium-expert的106.9也低于IQL109.6。这说明灵活规划是亮点，不是每个离线任务都获最高分。

**[图7](#paper-053-diffuser-figure-7)：热启动减少采样负担。** Walker2d medium-expert中保留上一计划并做较少修正，只小幅损失表现。它支持该设置下重用计划有效；若环境突变，旧计划可能是坏初始化，不能保证同样速度收益。

<!-- figure-ref-v6:start:399b93d3c4ca -->
<a id="paper-053-diffuser-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/053-diffuser-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/053-diffuser-v6-figure-7.png" width="2132" height="1469" alt="Planning with Diffusion for Flexible Behavior Synthesis，图7：热启动减少采样负担。 Walker2d medium-expert中保留上一计划并做较少修正，只小幅损失表现。它支持该设置下重用计划有效；若环境突变，旧计划可能是坏初始化，不能保证同样速度收益。" loading="lazy"></a><figcaption>原图摘引：Michael Janner、Yilun Du、Joshua B. Tenenbaum、Sergey Levine，2022，HTML S6.F7，图7。<a href="https://arxiv.org/html/2205.09991v2#S6.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。热启动减少采样负担。 Walker2d medium-expert中保留上一计划并做较少修正，只小幅损失表现。它支持该设置下重用计划有效；若环境突变，旧计划可能是坏初始化，不能保证同样速度收益。</figcaption></figure>
<!-- figure-ref-v6:end:399b93d3c4ca -->


§5.3还有一个值得注意的消融：把Diffuser当作普通动力学模型再交给MPPI，作者报告未优于随机。这支持收益来自模型与采样规划的配合，而不是孤立的预测精度指标。

## 五、采样迭代不能保证真实动力学一致

Diffuser把扩散的两个生成能力重新解释为控制工具：条件修补对应起终点约束，梯度引导对应任务目标。奖励与轨迹先验分离，使同一模型可在同一环境中改变目标。

但它学到的是数据中的轨迹分布，包含行为习惯，也包含物理规律；两者没有自动分离。数据没有覆盖的关键动作不会因为“生成式”就可靠出现。组合成功也依赖片段之间有可衔接状态。

相比单次策略前向，去噪要多轮计算，还可能对回报网络求梯度。论文没有用真机时延和碰撞率证明适合所有实时任务。状态接触约束在模拟中容易取得，真实机器人若只有相机，需要另解决估计问题。

作者强调避免单步自回归误差累积；应理解为改变误差传播结构，而不是生成误差彻底消失。整条轨迹仍可能局部不一致、穿墙或利用错误奖励引导。

### 五个前置概念

五个前置概念：**扩散去噪**从噪声逐步恢复数据；**轨迹分布**联合描述多个状态和动作；**条件修补**固定部分值再生成其余部分；**梯度引导**把采样偏向目标高分区域；**滚动规划**执行一小段后重新观察。

### 追问：奖励引导越强，为什么生成计划可能越偏离可执行轨迹？

参考答案：去噪模型提供数据中的轨迹结构，奖励梯度推动计划向高分区域移动。引导过强可能压过原分布的约束，使状态与动作配合变差。可固定采样步数，比较引导强度下的模型内奖励、转移一致性和真实执行回报；只有奖励分数升高不能证明计划改善。

## 六、沿机制关系继续读

Diffuser与[Dreamer](037-dreamer.md)是平行世界模型规划思路；后来的[Diffusion Policy](061-diffusion-policy.md)共享去噪生成工具，但直接条件生成动作块，不联合预测未来状态。两者是教学联系，不能把轨迹规划约束原样转移给动作策略。

## 七、自测三题与参考答案

**问题1：扩散100步是否意味着机器人向前执行100个动作？**

不是。扩散步是计算中去噪的迭代次数；物理规划长度是生成数组包含多少未来状态动作；真实回合长度又由环境定义。积木可生成128步计划，用100轮计算修正它。

**问题2：固定最终目标，为什么不能保证真实机器人一定到达？**

固定的是预测数组的坐标。动力学一致性由学习先验近似维护，没有严格验证每个动作能把真实系统推到下个预测状态。模型误差、外部扰动和不可达目标都可能造成失败。

**问题3：Diffuser和Diffusion Policy的关键区别是什么？**

本篇联合生成状态与动作轨迹，结合目标修补或回报指导进行规划。Diffusion Policy重点学习观测条件下的动作序列分布，不必生成未来状态或训练奖励指导器。二者共享去噪工具，但控制问题和监督方式不同。
