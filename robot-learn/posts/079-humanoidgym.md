# 079｜Humanoid-Gym：人形步态的零样本仿真迁移

[系列首页](README.md) · [上一篇](078-droid.md) · [下一篇](080-octo.md)

**原论文**：*Humanoid-Gym: Reinforcement Learning for Humanoid Robot with Zero-Shot Sim2Real Transfer*，Xinyang Gu、Yen-Jen Wang、Jianyu Chen，2024。[论文](https://arxiv.org/abs/2404.05695)。

### 先接住前作的问题

[并行强化学习](045-learning-to-walk.md)加快四足仿真训练，但人形从一个模拟器到另一模拟器再到电机仍有工程断层。Humanoid-Gym组织相位参考、非对称训练与跨模拟器检查，研究怎样定位部署链路误差；不把两个机器人解释成共享同一权重。

## 一、问题设定：人形步态怎样走过模拟器到硬件的接口

训练出一个在模拟器里不摔倒的人形策略，并不等于把程序复制到机器人后就能走。电机响应、关节摩擦、通信时延和接触求解器都会改变闭环行为。Humanoid-Gym 把关注点放在这个工程断层：用统一环境训练步态，再跨模拟器检查，最后部署到真实人形机器人。

这是在线、无模型、单机器人强化学习。环境转移由模拟器生成，部署时策略利用本体感知产生连续关节目标；训练奖励由人工构造，既不来自语言模型，也不依赖人类偏好。

观测承担两种不同任务：关节位置、速度、机体姿态等说明“身体现在怎样”，速度指令和相位说明“现在希望怎样运动”。动作是 12 个受控关节的位置目标，低层控制器再把位置误差转换为驱动力。动作不是直接的脚落点，也不是对环境的导航路径。

终止机制和奖励共同约束安全行走。复现时必须从具体机器人配置核实跌倒判据、时间限制和重置分布，不能仅凭一个速度跟踪公式恢复完整环境。论文提供的目标身高等参数也是配置参数，不应原样套给任意尺寸的人形。

传统模型控制往往显式规划质心、接触力或落脚点；这里将大量补偿留给策略学习。但它仍使用周期参考和底层控制器。无运动捕捉示范，并不意味着没有运动先验。

## 二、联合相位、历史与部署可用观测训练步态

它沿用 PPO、非对称 Actor–Critic、关节位置目标和底层 PD 控制，增加或整理了周期步态参考、随机化、历史观测，以及 Isaac Gym—MuJoCo—硬件的验证流程。论文展示 XBot-S 和 XBot-L 的迁移。这是两个平台各自策略的部署证据，不能理解为同一组权重直接控制不同尺寸机器人。

### 1. 先把动作放在一个容易控制的空间

教学上可以写成：

$$
q_t^{\mathrm{des}}=q_{\mathrm{ref}}(c_t)+s_a a_t,\qquad
\tau_t=K_p(q_t^{\mathrm{des}}-q_t)-K_d\dot q_t.
$$

$q_t$ 是关节角，$c_t$ 是周期相位，$a_t$ 是策略输出，$s_a$ 是动作尺度。这里用“参考加修正”解释动作与先验的关系；具体代码中参考量怎样并入默认关节姿态和策略目标，需要按配置确认。

PD 层的作用是提高动作接口的可控性，不是消除动力学误差。若真实电机有显著延迟，同样的目标序列仍可能造成不同的脚接触时刻。因此控制频率和延迟随机化不能从算法定义中删掉。

### 2. 用相位告诉策略左右腿的角色

周期信号通常由 $\sin(2\pi\phi_t)$、$\cos(2\pi\phi_t)$ 表示。与只输入一个会从 1 跳回 0 的相位标量相比，这种表示避免了周期边界的不连续。接触掩码规定单支撑与双支撑区间，使奖励可以判断哪只脚应当着地。

这是行为先验：它减少探索时胡乱蹬腿的空间，但可能限制非周期动作。若希望跨台阶时临时延长单脚支撑，仅让策略“更努力优化同一奖励”未必足够，还可能需要修改相位机制或上层命令。

### 3. Actor 看部署信息，Critic 看训练信息

[表I](https://arxiv.org/html/2404.05695v2#S3.T1) 给出的单帧策略观测是 47 维，并堆叠 15 帧；价值端使用更丰富的特权信息。历史并不等于显式辨识出摩擦系数，它只是让网络有机会根据过去的响应推断隐藏状态。

训练价值函数可以访问摩擦、载荷和接触等模拟器信息，从而更准确评估当前状态；部署策略不能依赖这些不可测变量。区分这两条通道，是避免把仿真优势偷偷带到硬件评价中的关键。

### 4. 优化的是奖励期望，不是直接优化“真实可部署性”

PPO 的核心教学形式是：

$$
\max_\theta\ \mathbb E_t
\left[\min\big(r_t(\theta)\hat A_t,\,
\operatorname{clip}(r_t(\theta),1-\epsilon,1+\epsilon)\hat A_t\big)\right],
\quad
r_t(\theta)=\frac{\pi_\theta(a_t\mid o_t)}
{\pi_{\theta_{\mathrm{old}}}(a_t\mid o_t)}.
$$

$\hat A_t$ 由回报和价值估计构造，衡量动作相对当前策略平均行为的好坏。训练目标由速度跟踪、步态与接触、动作平滑和能耗等项加权形成。指数型跟踪奖励可写作 $\exp(-w\|e\|^2)$：误差越小奖励越接近 1，远离目标后梯度信号可能变弱。

三个层次必须分开：数学上最大化代理目标；机制上限制策略更新并随机化物理环境；实验上希望机器人稳定行走。前两项并不构成第三项的数学保证。

### 5. 跨模拟器检查是一道诊断关口

Isaac Gym 适合大规模并行训练，MuJoCo 提供另一套动力学和接触实现。若策略只在前者成功，可能已经利用了模拟器特性。把相同控制逻辑移到后者，有助于发现坐标、增益、时序和动力学敏感性。

下面是教学伪代码，省略框架并行管理：



跨模拟器首先可以抓到时间接口错误。教学设参考相位每秒走一圈，但部署时因步长换算错误实际走1.1圈；10秒后相位累计多出整整一圈。虽然周期末又重合，中间足接触时机已反复错位，不能因为静态关节姿态一致就认为接口正确。

因此sim-to-sim应先检查秒、弧度、关节顺序、控制保持步数和接触判定，再讨论物理参数。两个引擎都成功仍只是较强的诊断证据：它们可能共享同一错误电机模型或遗漏同一种延迟。原文Isaac Gym→MuJoCo→实机链条的每一级提供不同证据，最后一级不能被前两级替代。[原文系统流程与sim-to-sim](https://arxiv.org/html/2404.05695)

### 一个小例子与五个前置概念

**自构例子，未运行**：保持策略不变，把真实控制延迟从 2 ms 增加到 20 ms。即使平均速度仍接近命令，脚的接触时机可能变晚，机体先倾斜再补偿。比较无随机化、0–10 ms 随机化、覆盖更大延迟三种训练方案，记录跌倒率和关节高频振荡，可检验“训练范围覆盖”与“行为代价”的关系。更宽随机化也可能降低理想条件下的步态效率。

五个必要概念：**PD 控制**把位置和速度误差变为驱动力；**非对称 Actor–Critic**让训练评估器拥有额外信息；**GAE**折中优势估计的偏差与方差；**相位参考**为周期行为提供时间结构；**域随机化**使策略面对一个环境分布，而不是单个名义模型。

## 三、把相位步态训练接到跨模拟器与硬件检查

Actor只能读取部署可得信息，Critic可用训练特权；关节位置目标再经过PD控制。跨模拟器环节检验部分动力学差异，硬件接口仍要单独核对。

~~~text
标定机器人关节响应，建立训练和验证模型
初始化 Actor、Critic、周期步态与奖励
重复训练：
    为各并行环境采样摩擦、载荷、延迟和观测噪声
    接收速度命令，构造相位和历史观测
    Actor 输出关节目标，由 PD 控制环境推进
    保存奖励、动作概率和 Critic 的特权观测
    计算优势，进行 PPO 和价值更新
固定策略，在 MuJoCo 检查时序、接触和扰动响应
确认接口与限幅后，在对应实机评估策略
~~~

## 四、逐层检查仿真、跨模拟器和真实表现

**原图怎么读：** [图4，原论文图注与图像](#paper-079-humanoidgym-figure-4)。对照MuJoCo、真机与Isaac Gym的相图，查看动态关系而非仅比较某时刻角度。跨模拟器一致与真机匹配是两个检验，不能互相替代。


<!-- figure-ref-v6:start:079-humanoidgym-license -->
<p>原文标注 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本页摘图仅保留图形区域并作栅格化；有面板重排的图另行注明，作者与原文入口见各图注。</p>
<!-- figure-ref-v6:end:079-humanoidgym-license -->
<!-- figure-ref-v6:start:dbb4035de1e7-anchor -->
<a id="paper-079-humanoidgym-figure-4"></a>
<!-- figure-ref-v6:end:dbb4035de1e7-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/079-humanoidgym-s4-f4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/079-humanoidgym-s4-f4.png" width="1824" height="774" alt="Humanoid-Gym: Reinforcement Learning for Humanoid Robot with Zero-Shot Sim2Real Transfer，图4：对照MuJoCo、真机与Isaac Gym的相图，查看动态关系而非仅比较某时刻角度。跨模拟器一致与真机匹配是两个检验，不能互相替代。" loading="lazy"></a><figcaption>实验图原图摘引：Xinyang Gu、Yen-Jen Wang、Jianyu Chen，2024，HTML S4.F4，图4。<a href="https://arxiv.org/html/2404.05695v2#S4.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 项目 | 论文设置或可核实范围 | 实际验证的问题 |
|---|---|---|
| 训练环境 | Isaac Gym，大量并行实例 | 能否获得可用的周期行走策略 |
| 跨模拟器 | MuJoCo | 策略是否过度依赖训练模拟器 |
| 真实平台 | XBot-S、XBot-L | 两个平台能否分别实现迁移 |
| 采样配置 | [表II](https://arxiv.org/html/2404.05695v2#A0.T2)：8192 环境、每次收集 24 步 | 并行采样规模；不等于总训练步数 |
| 控制频率 | 策略 100 Hz、PD 1 kHz | 学习层与执行层的时序分工 |
| 随机化 | [表III](https://arxiv.org/html/2404.05695v2#A0.T3)：摩擦、载荷、电机响应、延迟等 | 对参数与观测误差的适应范围 |
| 评价展示 | 关节曲线、相位图、实机与地形演示 | 局部响应和运动可行性 |
| 不确定性 | 统一成功率、多种子区间未核实 | 无法据此建立稳健的算法排名 |

[表II](https://arxiv.org/html/2404.05695v2#A0.T2) 中的训练 epoch 数应理解为一次数据更新中的优化轮数，不能当作“整个算法只训练两轮”。同样，$8192\times24=196608$ 是一次并行收集的样本数，而非整项研究的数据总量。

随机化表中的高斯噪声参数与均匀分布区间也不同。一个标准差不是绝对上下界；如果复现者把所有高斯扰动剪成相同宽度的均匀噪声，得到的尾部事件频率会改变。

### 四组证据及其边界

**[图3](#paper-079-humanoidgym-figure-3)：关节响应标定。** 比较模拟与实机腿部运动，说明标定能提高局部执行器响应的一致性。它支持“训练模型需要与硬件对齐”，不能证明全身接触、跌倒冲击或所有负载都被准确建模。

<!-- figure-ref-v6:start:783daadebc23 -->
<a id="paper-079-humanoidgym-figure-3"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/079-humanoidgym-v6-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/079-humanoidgym-v6-figure-3.png" width="1982" height="1546" alt="Humanoid-Gym: Reinforcement Learning for Humanoid Robot with Zero-Shot Sim2Real Transfer，图3：关节响应标定。 比较模拟与实机腿部运动，说明标定能提高局部执行器响应的一致性。它支持“训练模型需要与硬件对齐”，不能证明全身接触、跌倒冲击或所有负载都被准确建模。" loading="lazy"></a><figcaption>原图摘引：Xinyang Gu、Yen-Jen Wang、Jianyu Chen，2024，HTML S4.F3，图3。<a href="https://arxiv.org/html/2404.05695v2#S4.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。关节响应标定。 比较模拟与实机腿部运动，说明标定能提高局部执行器响应的一致性。它支持“训练模型需要与硬件对齐”，不能证明全身接触、跌倒冲击或所有负载都被准确建模。</figcaption></figure>
<!-- figure-ref-v6:end:783daadebc23 -->


**[图4](#paper-079-humanoidgym-figure-4)：膝、踝相位轨迹。** 相位图把角度与角速度联系起来，比单一平均误差更容易暴露阻尼和响应时序不同。图中的短时局部一致性有诊断价值，但不是长期不跌倒概率的估计。

**[图5](#paper-079-humanoidgym-figure-5)：真实机器人部署。** 实机展示支持策略能够产生可执行的行走行为。两个机器人尺寸不同，增强了流程可迁移的可信度；然而它没有隔离出 PPO、参考步态、随机化各自贡献，也不是同一权重的跨形态泛化实验。

<!-- figure-ref-v6:start:a4473e7afc48 -->
<a id="paper-079-humanoidgym-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/079-humanoidgym-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/079-humanoidgym-v6-figure-5.png" width="1684" height="2200" alt="Humanoid-Gym: Reinforcement Learning for Humanoid Robot with Zero-Shot Sim2Real Transfer，图5：真实机器人部署。 实机展示支持策略能够产生可执行的行走行为。两个机器人尺寸不同，增强了流程可迁移的可信度；然而它没有隔离出 PPO、参考步态、随机化各自贡献，也不是同一权重的跨形态泛化实验。" loading="lazy"></a><figcaption>原图摘引：Xinyang Gu、Yen-Jen Wang、Jianyu Chen，2024，HTML A0.F5，图5。<a href="https://arxiv.org/html/2404.05695v2#A0.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。真实机器人部署。 实机展示支持策略能够产生可执行的行走行为。两个机器人尺寸不同，增强了流程可迁移的可信度；然而它没有隔离出 PPO、参考步态、随机化各自贡献，也不是同一权重的跨形态泛化实验。</figcaption></figure>
<!-- figure-ref-v6:end:a4473e7afc48 -->


**[图7](#paper-079-humanoidgym-figure-7) 与[表III](https://arxiv.org/html/2404.05695v2#A0.T3)：地形展示及随机化范围。** 前者显示验证环境中的平地和不平整地形行为，后者说明训练扰动设计。二者合起来提供鲁棒性线索，仍不能推导超出采样范围的障碍物、台阶或传感器故障表现。

<!-- figure-ref-v6:start:e3ff02c0a99a -->
<a id="paper-079-humanoidgym-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/079-humanoidgym-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/079-humanoidgym-v6-figure-7.png" width="1610" height="1246" alt="Humanoid-Gym: Reinforcement Learning for Humanoid Robot with Zero-Shot Sim2Real Transfer，图7：地形展示及随机化范围。 前者显示验证环境中的平地和不平整地形行为，后者说明训练扰动设计。二者合起来提供鲁棒性线索，仍不能推导超出采样范围的障碍物、台阶或传感器故障表现。" loading="lazy"></a><figcaption>原图摘引：Xinyang Gu、Yen-Jen Wang、Jianyu Chen，2024，HTML A0.F7，图7。<a href="https://arxiv.org/html/2404.05695v2#A0.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。地形展示及随机化范围。 前者显示验证环境中的平地和不平整地形行为，后者说明训练扰动设计。二者合起来提供鲁棒性线索，仍不能推导超出采样范围的障碍物、台阶或传感器故障表现。</figcaption></figure>
<!-- figure-ref-v6:end:e3ff02c0a99a -->


“零样本”尤其容易误读：这里主要指不再用真实机器人奖励微调策略。动力学标定仍然使用实机信息，因此它不等价于“没有接触过硬件数据”。

## 五、跨模拟器通过仍不能替代真实安全验证

代价包括模型标定、控制器接口适配、奖励和相位设计，以及大量仿真交互。跨模拟器验证还会增加维护工作，但可能提前暴露硬件试验中昂贵的问题。

我的分析是，这种流程最值得迁移的思想并非某一个奖励权重，而是“让失败定位到层”。若 MuJoCo 已经出现关节振荡，应先查执行器和时序；若两套模拟器稳定而实机失败，再检查未建模的延迟、柔顺、状态估计与接触。每一种故障需要不同对照实验，不能全部归因于策略网络太小。

### 追问：两个模拟器都通过时，为什么仍要单独核对关节顺序和动作尺度？

参考答案：它们可能共享同一套错误接口约定，因而共同通过不能检出硬件映射错误。部署前应把策略输出、PD目标、实际关节方向和单位逐项对照，再检查延迟与限位。跨模拟器主要暴露部分动力学差异，不是对整个软件与电气接口的自动证明。

## 六、沿机制关系继续读

本篇承接[大规模足式RL](045-learning-to-walk.md)的并行训练与随机化工程，扩展到人形平台和跨引擎验证；与[Human to Humanoid](076-human2humanoid.md)是平行目标，周期行走并不等于跟踪任意人体动作。

## 七、自测三题与参考答案

**问题1：为什么“策略没有在真机继续训练”仍不等于没有使用真机数据？**

答案：关节标定和模型参数选择就可能利用硬件测量。这些信息通过环境模型影响最终策略。准确说法应限定为没有真机策略微调，而不是完全无实机信息。

**问题2：如果 Actor 也读到了模拟器摩擦真值，会有什么问题？**

答案：它可能学会直接按摩擦数值选择动作，而实际传感器无法提供该量。部署时填零或估计误差都会改变输入分布。特权信息放在 Critic 中有助于训练，同时避免成为执行时的硬依赖。

**问题3：通过两套模拟器就能保证真机安全吗？**

答案：不能。两者可能共同漏掉减速器间隙、结构弹性或通信异常。跨模拟器成功缩小了一类风险，却没有给这些共同遗漏提供测试；还需要硬件测量、逐步扩大运行范围和明确的故障判据。
