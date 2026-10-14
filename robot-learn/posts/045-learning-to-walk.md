# 045｜并行强化学习：在分钟级训练四足步态

[系列首页](README.md) · [上一篇](044-ibc.md) · [下一篇](046-clipport.md)

**原论文**：*Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning*，Nikita Rudin、David Hoeller、Philipp Reist、Marco Hutter，2021；本文依据2022年v3。[论文](https://arxiv.org/abs/2109.11978)。

### 先接住前作的问题

[ANYmal](032-anymal.md)已经把学习的执行器放进仿真并迁移到真机，但一次策略训练仍受数据管线吞吐制约。并行强化学习将仿真和学习留在GPU上，同时面对短采样片段对优势估计的影响；它优化系统与估计器的配合。

## 一、问题设定：大规模并行怎样加速而不损害时序估计

这篇论文最重要的变化并非一个新的价值函数，而是把仿真、观测、奖励、策略推理和梯度更新尽量放在同一块GPU上，让数千个机器人同时提供经验。

传统流程往往CPU跑物理、GPU更新网络。机器人一步需要推理、物理推进、观测和奖励计算，数据反复拷贝可能比网络计算还昂贵。只换更快显卡而不改变数据流，可能不能显著缩短实验周期。

本篇是单智能体策略共享的并行环境训练，不是数千机器人在同一任务中协作的多智能体RL。每个环境提供独立轨迹，所有机器人使用同一策略的当前参数。

任务要求四足机器人跟随线速度和朝向指令通过平地、斜坡、粗糙地形、离散障碍、楼梯。策略接收本体速度、重力方向、关节位置速度、上一步动作和108个地形高度采样；输出目标关节位置，经低层执行器产生力矩。奖励衡量速度跟踪，也惩罚非期望运动、力矩、加速度、动作变化和碰撞，并使用足部腾空时间相关项。

躯干接触被视为摔倒并复位；最长回合20秒也会复位。但两种复位在价值学习中含义不同，正是论文强调的实现细节。真实机器人地形信息来自激光雷达构建的高程地图，不是直接把真值高度传入硬件。

## 二、匹配环境数、片段长度与超时自举

### 1. 批次包含多少机器人，也包含多少时间

核心关系是

$$
B=N_{\mathrm{env}}H,
$$

其中 $B$ 为每次PPO收集的转移数，$N_{\mathrm{env}}$ 为并行环境数，$H$ 为每个环境连续采样步数。固定 $B$ 时，提高 $N_{\mathrm{env}}$ 会减少 $H$。

GAE教学表达为

$$
\hat A_t=\sum_{\ell=0}^{H-1-t}(\gamma\lambda)^\ell
\big(r_{t+\ell}+\gamma V(s_{t+\ell+1})-V(s_{t+\ell})\big),
$$

在真实终止处需使用终止掩码。$H$ 越短，估计越依赖片段末端的价值预测。初期价值不准确时，过短片段可能无法提供足够学习信号；这是作者对观测结果的解释，不是所有PPO任务都必须遵守的固定下限。

实际配置为4096个环境、每个24步，批次98304；正文把约25步、约0.5秒作为困难出现的经验尺度。应直接保留精确配置24步，不能把“约25步”写成严格数学阈值。环境不会每24步复位，一次20秒回合可以跨多个策略更新。

### 2. 超时是截断，摔倒才是终止

教学上可把价值目标写成

$$
y_t=r_t+\gamma(1-d_t^{\mathrm{terminal}})V(s_{t+1}).
$$

如果只是人为超时而不是任务终止，仍应使用超时前最后状态的价值。不能使用自动reset后新回合的初始状态作为 $s_{t+1}$；那样会把两个不相关回合连接起来。

作者用超时标记区分两类复位，并在超时时补上价值自举。它沿用已有的时间限制处理思想，不应称为首次发明bootstrapping。重要性来自大规模短片段采样让回合边界更容易落在批次内部。

### 3. 课程直接成为地图上的位置

地形按类别和难度铺在一个大网格上，减少运行时反复重建地形的开销。机器人走出当前地块边界，下次复位进入更难级别；移动不足目标速度要求的一半，则降低难度。最高级成功后随机回到其他级别，维持训练分布多样性。

这种课程根据完成情况分配难度，避免一开始全部进入不可学的高台阶。它没有改变任务最终目标，却改变策略何时看到哪些数据。作者称其不需要外部调参，但地形范围、升级判据与任务奖励仍是设计选择。

仿真中的执行器网络采用LSTM表示串联弹性驱动器响应；这不等于控制策略本身是RNN。摩擦随机化、观测噪声和周期推扰帮助迁移，噪声尺度还参考真实测量，因此不是完全没有真实系统知识的训练。

超时处理可用一行手算核对：末步奖励1、折扣0.99、超时前状态价值10，则继续任务的目标为10.9；若错当终止，目标变成1。反过来若机器人已摔倒却继续自举，会把失败后虚构的未来价值加回来。两种错误方向相反，不能统一称为“多补一点奖励”。

并行化还改变数据结构。98304条转移可能来自4096台各24步，也可能来自1024台各96步；总数相同，时间相关性、GAE末端自举比例与覆盖的初态数量都不同。原文分钟级墙钟收益包含GPU物理、并行数据流和训练设置，不能将其解释为少量真机交互。[原文时间限制处理及附录A.2](https://arxiv.org/html/2109.11978v3)

### 一个例子与五个前置概念

自构例子，未运行：固定批次约10万，把环境数从1000增至10000，每环境连续步数从约100缩为10。虽然物理数据更快到齐，但一次落足与恢复可能跨越10步，早期不准的价值函数需要承担更多预测。增加批次能恢复片段长度，却又增加计算；真正目标是达到指定成功率的总时间。

## 三、在GPU内同步采样、估值与PPO更新

增加机器人数量会缩短固定批次中的时间片段，超时又需要正确自举。实现应把环境吞吐、GAE片段与地形课程一起配置，不能只调一个并行数。

~~~text
在GPU创建地形网格、并行机器人、策略与价值网络
为每个机器人分配地形类别和初始难度
重复1500次策略更新：
    保持当前策略，连续采集H步：
        向量化计算全部机器人动作
        执行器模型与GPU物理引擎推进
        在GPU计算观测、奖励、摔倒标记、超时标记
        保存复位前的末状态
        对需要复位的环境：
            根据行走进度调整难度
            移到对应地形重新初始化
    对超时保留末状态价值，对真实终止停止自举
    计算GAE与价值目标
    用大mini-batch进行PPO更新
    按新旧策略KL大小调整学习率
部署：固定策略，读取本体信息与真实高程地图，输出关节目标
~~~

## 四、同时检查吞吐、墙钟收敛和真机部署

但并行不是简单把环境数量调大。固定批次下，机器人越多，每个机器人采到的连续片段越短，GAE能利用的时间信息随之减少。作者分析这个折中，配合地形课程和正确超时处理，使ANYmal平地策略训练少于4分钟、崎岖地形少于20分钟。

这里的时间是配置好的仿真训练运行时间，不是机器人在现实里学习20分钟，也不包含此前所有建模和调参。

**原图怎么读：** [图4，原论文图注与图像](#paper-045-learning-to-walk-figure-4)。颜色编码机器人数量，点形状编码批大小；回报和训练时间分别成图。最有价值的是时间较短且回报较高的配置，而非只追求最多并行环境。


<!-- figure-ref-v6:start:1610da57a034-anchor -->
<a id="paper-045-learning-to-walk-figure-4"></a>
<!-- figure-ref-v6:end:1610da57a034-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/045-learning-to-walk-s4-f4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/045-learning-to-walk-s4-f4.png" width="1804" height="460" alt="Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning，图4：颜色编码机器人数量，点形状编码批大小；回报和训练时间分别成图。最有价值的是时间较短且回报较高的配置，而非只追求最多并行环境。" loading="lazy"></a><figcaption>实验图原图摘引：Nikita Rudin、David Hoeller、Philipp Reist、Marco Hutter，2021，HTML S4.F4，图4。原图面板重新排版，数据未改。<a href="https://arxiv.org/html/2109.11978v3#S4.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

附录A.1.1对0.005秒步长的“smaller”表述与上下文不够一致；执行时序采用明确给出的四子步和50 Hz配置，不据该措辞推导稳定性方向。

| 项目 | 原文配置与目的 |
|---|---|
| 主平台 | Isaac Gym/PhysX，ANYmal C为主要仿真与真机对象 |
| 主训练配置 | 4096环境×24步，1500次更新，PPO每批5个epoch |
| mini-batch | 24576样本，约为总批次四分之一 |
| 计算设备 | i9-11900k与RTX A6000 |
| 总交互量 | 由98304×1500计算约1.475亿转移，属于教学计算 |
| 并行消融 | 128至16384机器人，多个固定批次；[图4](#paper-045-learning-to-walk-figure-4)每点5次运行均值和标准差 |
| 地形课程 | 台阶从5至20厘米，斜坡0至25度；按环境表现逐级变化 |
| 迁移设置 | 摩擦0.5至1.25、观测噪声、每10秒推扰，驱动器网络 |
| 控制时序 | 策略50 Hz，每策略步4个仿真子步 |
| 真机条件 | 固定策略，激光高程地图；最高线速度指令限制为0.6米/秒 |

[图4](#paper-045-learning-to-walk-figure-4)为了让总奖励可比，特意关闭课程，并降低了地形最大难度。否则更强策略被课程分配到更难地形，奖励可能反而下降。这一实验设计很有启发性：训练分数不仅取决于策略，还取决于当前任务分布。

跨机器人体型实验包含重新训练。ANYmal带固定机械臂与ANYmal B基本沿用配置，A1调整驱动器模型、PD与惩罚，Cassie增加相关奖励。不能称为一张策略零样本控制所有机器人。

### 五处证据：快到什么程度，在哪些条件下变差

**[图4](#paper-045-learning-to-walk-figure-4)：并行存在最佳区间。** 固定批次增加环境能降低时间，但环境过多会使性能突然下降；约2048至4096环境、10万至20万批次在该任务中折中较好。它证明优化吞吐要看最终回报，不能只追求最大环境数。

**[图8](#paper-045-learning-to-walk-figure-8)与[图9](#paper-045-learning-to-walk-figure-9)：瓶颈并未消失。** 物理仿真与观测奖励计算占主要时间，固定批次下学习步骤耗时基本不受环境数影响。4096粗糙地形机器人约需6 GB显存，无图形；开启显示约9 GB。显存量是该版本配置测量，不是对未来任意模型的通用硬件需求。

<!-- figure-ref-v6:start:ab7c3fab8b3f -->
<a id="paper-045-learning-to-walk-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-8.png" width="2132" height="619" alt="Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning，图8：瓶颈并未消失。 物理仿真与观测奖励计算占主要时间，固定批次下学习步骤耗时基本不受环境数影响。4096粗糙地形机器人约需6 GB显存，无图形；开启显示约9 GB。显存量是该版本配置测量，不是对未来任意模型的通用硬件需求。" loading="lazy"></a><figcaption>原图摘引：Nikita Rudin、David Hoeller、Philipp Reist、Marco Hutter，2021，HTML A1.F8，图8。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2109.11978v3#A1.F8" target="_blank" rel="noopener noreferrer">核对原文</a>。瓶颈并未消失。 物理仿真与观测奖励计算占主要时间，固定批次下学习步骤耗时基本不受环境数影响。4096粗糙地形机器人约需6 GB显存，无图形；开启显示约9 GB。显存量是该版本配置测量，不是对未来任意模型的通用硬件需求。</figcaption></figure>
<!-- figure-ref-v6:end:ab7c3fab8b3f -->
<!-- figure-ref-v6:start:049716490b20 -->
<a id="paper-045-learning-to-walk-figure-9"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-9.png" width="2132" height="619" alt="Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning，图9：瓶颈并未消失。 物理仿真与观测奖励计算占主要时间，固定批次下学习步骤耗时基本不受环境数影响。4096粗糙地形机器人约需6 GB显存，无图形；开启显示约9 GB。显存量是该版本配置测量，不是对未来任意模型的通用硬件需求。" loading="lazy"></a><figcaption>原图摘引：Nikita Rudin、David Hoeller、Philipp Reist、Marco Hutter，2021，HTML A1.F9，图9。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2109.11978v3#A1.F9" target="_blank" rel="noopener noreferrer">核对原文</a>。瓶颈并未消失。 物理仿真与观测奖励计算占主要时间，固定批次下学习步骤耗时基本不受环境数影响。4096粗糙地形机器人约需6 GB显存，无图形；开启显示约9 GB。显存量是该版本配置测量，不是对未来任意模型的通用硬件需求。</figcaption></figure>
<!-- figure-ref-v6:end:049716490b20 -->


**[图10](#paper-045-learning-to-walk-figure-10)：超时处理确有影响。** 加入自举降低critic损失，作者报告平地与粗糙任务奖励约提高10%至20%。这是回报改善，不是减少相同比例摔倒，也不表示不加自举完全无法学习。

<!-- figure-ref-v6:start:5a1107e75f73 -->
<a id="paper-045-learning-to-walk-figure-10"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-10.png" width="2132" height="1206" alt="Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning，图10：超时处理确有影响。 加入自举降低critic损失，作者报告平地与粗糙任务奖励约提高10%至20%。这是回报改善，不是减少相同比例摔倒，也不表示不加自举完全无法学习。" loading="lazy"></a><figcaption>原图摘引：Nikita Rudin、David Hoeller、Philipp Reist、Marco Hutter，2021，HTML A1.F10，图10。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2109.11978v3#A1.F10" target="_blank" rel="noopener noreferrer">核对原文</a>。超时处理确有影响。 加入自举降低critic损失，作者报告平地与粗糙任务奖励约提高10%至20%。这是回报改善，不是减少相同比例摔倒，也不表示不加自举完全无法学习。</figcaption></figure>
<!-- figure-ref-v6:end:5a1107e75f73 -->


**[图5](#paper-045-learning-to-walk-figure-5)：地形边界清楚存在。** 对20厘米内台阶接近100%仿真穿越成功，而25度以上上坡开始不可行；随机障碍更难。离散障碍高度可正可负，因此相邻落差可达到标称高度两倍，不能把两种“20厘米”直接等价。

<!-- figure-ref-v6:start:dd913546819d -->
<a id="paper-045-learning-to-walk-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-5.png" width="2132" height="619" alt="Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning，图5：地形边界清楚存在。 对20厘米内台阶接近100%仿真穿越成功，而25度以上上坡开始不可行；随机障碍更难。离散障碍高度可正可负，因此相邻落差可达到标称高度两倍，不能把两种“20厘米”直接等价。" loading="lazy"></a><figcaption>原图摘引：Nikita Rudin、David Hoeller、Philipp Reist、Marco Hutter，2021，HTML S4.F5，图5。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2109.11978v3#S4.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。地形边界清楚存在。 对20厘米内台阶接近100%仿真穿越成功，而25度以上上坡开始不可行；随机障碍更难。离散障碍高度可正可负，因此相邻落差可达到标称高度两倍，不能把两种“20厘米”直接等价。</figcaption></figure>
<!-- figure-ref-v6:end:dd913546819d -->


**[图7](#paper-045-learning-to-walk-figure-7)与§4.3：真机可用，但感知误差降低鲁棒性。** 仿真测试前向指令0.75米/秒，真机限为0.6米/秒。作者说明高程地图误差在高速时造成问题，并展示上下楼梯与障碍通过。正文未提供可直接与[图5](#paper-045-learning-to-walk-figure-5)对齐的完整真机成功率表，本文也未核实所有真机重复数。

<!-- figure-ref-v6:start:8db432457c4a -->
<a id="paper-045-learning-to-walk-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-7.png" width="2132" height="1335" alt="Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning，图7：真机可用，但感知误差降低鲁棒性。 仿真测试前向指令0.75米/秒，真机限为0.6米/秒。作者说明高程地图误差在高速时造成问题，并展示上下楼梯与障碍通过。正文未提供可直接与图5对齐的完整真机成功率表，本文也未核实所有真机重复数。" loading="lazy"></a><figcaption>原图摘引：Nikita Rudin、David Hoeller、Philipp Reist、Marco Hutter，2021，HTML S4.F7，图7。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2109.11978v3#S4.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。真机可用，但感知误差降低鲁棒性。 仿真测试前向指令0.75米/秒，真机限为0.6米/秒。作者说明高程地图误差在高速时造成问题，并展示上下楼梯与障碍通过。正文未提供可直接与图5对齐的完整真机成功率表，本文也未核实所有真机重复数。</figcaption></figure>
<!-- figure-ref-v6:end:8db432457c4a -->


来源为[论文方法、结果与附录](https://arxiv.org/html/2109.11978)。论文首次公开在2021，本文使用2022年的v3；“少于20分钟”不包含所有调参运行，也不说明同样GPU预算下达到了绝对最高鲁棒性，作者在结论中主动限定了研究目标。

原机制图表补充定位：[图3](#paper-045-learning-to-walk-figure-3)。

<!-- figure-ref-v6:start:890ee30a6837 -->
<a id="paper-045-learning-to-walk-figure-3"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/045-learning-to-walk-v6-figure-3.png" width="2132" height="634" alt="Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning，图3：左图对应500次、右图对应1000次策略更新，4000个并行机器人逐步进入更难的地形。它展示自动课程推进的状态，不能仅凭机器人分布推断单个策略的成功率。" loading="lazy"></a><figcaption>原图摘引：Nikita Rudin、David Hoeller、Philipp Reist、Marco Hutter，2021，HTML S3.F3，左图对应500次、右图对应1000次策略更新，4000个并行机器人逐步进入更难的地形。它展示自动课程推进的状态，不能仅凭机器人分布推断单个策略的成功率。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2109.11978v3#S3.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。左图对应500次、右图对应1000次策略更新，4000个并行机器人逐步进入更难的地形。它展示自动课程推进的状态，不能仅凭机器人分布推断单个策略的成功率。</figcaption></figure>
<!-- figure-ref-v6:end:890ee30a6837 -->


## 五、并行样本数不等于独立长期经验

代价是1亿量级仿真转移依然存在。快速墙钟训练没有让样本复杂度消失，更多调参试验也可能增加总体计算消耗。执行器建模、真实噪声和高程地图误差仍需工程处理。

作者还指出会出现拖腿、身体过高或过低等行为，需要调整奖励权重。没有手工指定步态不代表学到的每个最优奖励行为都自然。本文进一步分析，课程等级进步是训练诊断，不等于在独立分布上通过鲁棒性认证；独立固定难度测试仍必需。

### 五个前置概念

五个概念：**吞吐**是单位时间处理转移数量；**样本效率**是达到性能需要多少交互；**GAE**组合多步TD误差估计优势；**超时自举**为人为截断保留未来价值；**课程学习**按能力改变训练难度。

### 追问：固定总批次时增加环境数，应怎样判断是否牺牲了远期信用？

参考答案：总批次固定意味着每个环境的连续片段缩短，优势估计更依赖末端价值自举。应同时改变或对照价值质量、片段长度与任务回报，而非仅记录每秒步数。若吞吐增加却需要更多训练步才能学会，墙钟收益可能被抵消；这是数据管线和估计误差的共同问题。

## 六、沿机制关系继续读

本篇承接[ANYmal](032-anymal.md)的模拟训练与执行器建模路线，主要扩大并行系统效率；与[DayDreamer](054-daydreamer.md)是平行效率路径，前者大量仿真换墙钟，后者珍惜真实交互并用模型学习，分钟数不能直接排同一榜。

## 七、自测三题与参考答案

**问题1：为什么4096个机器人训练同一策略不是多智能体协作？**

答案：它们只是并行环境副本，不通过合作或竞争共同完成一个任务。经验汇总用于同一策略更新。多智能体协作还涉及其他智能体行为、联合目标或通信，这里不是研究重点。

**问题2：24步采样片段是否意味着机器人每0.48秒重新开始？**

答案：不是。片段只是一次策略更新的数据边界，环境回合持续至摔倒或20秒超时。若错误地每个片段都复位，会改变状态分布与任务长度，也破坏原论文的训练设定。

**问题3：要复现“20分钟”，只报告每秒仿真步数够吗？**

答案：不够。应记录完整训练墙钟、策略更新与环境复位成本、最终性能、设备和样本总量，并说明是否包含课程与迁移组件。高吞吐而不收敛没有复现目标；把提前完成的数据采样时间当作全训练时间同样不成立。
