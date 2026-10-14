# 054｜DayDreamer：世界模型走出仿真

[系列首页](README.md) · [上一篇](053-diffuser.md) · [下一篇](055-peract.md)

**原论文**：*DayDreamer: World Models for Physical Robot Learning*，Philipp Wu、Alejandro Escontrela、Danijar Hafner 等，2022。[论文](https://arxiv.org/abs/2206.14176)。

### 先接住前作的问题

[Dreamer](037-dreamer.md)在潜在模型中学习行为，但模拟中的数据采集与真实硬件的连续运行并非同一问题。DayDreamer采用DreamerV2家族方法，把异步学习、实际奖励和复位条件接到四台机器人，检验有限真实经验能否支撑持续学习。

## 一、问题设定：真实机器人怎样边执行边用想象改进

在仿真里学会走路，与让一台真实机器人边试边学，是两种难度。DayDreamer把Dreamer世界模型方法放到四台真实机器人上：机器人只收集有限真实经验，模型在内部预测大量未来，用这些想象轨迹训练策略。

这是在线、基于模型、单机器人RL。四台平台分别独立学习，没有一个模型共享权重控制全部机器人。统一的是算法与学习超参数，动作空间、传感器、奖励和硬件辅助仍按任务设计。

A1使用本体感知，输出12个关节目标角，20Hz，通过硬件PD控制器执行，并用Butterworth滤波减少高频命令。奖励包含直立、站姿及速度等顺序门控项，具有明确任务知识。

UR5使用RGB加本体感知，2Hz选择离散末端移动与夹爪动作。抓住物体奖励+1、放回同箱-1、移到另一箱+10。Z轴移动仅在持物时启用，到正确箱上方自动打开夹爪。这些约束减少探索难度，不能描述为完全自由的端到端操作。

XArm约0.5Hz，额外用深度图；柔软物体用绳子连着夹爪，降低卡在角落的概率。Sphero以RGB估计位置和朝向，2Hz连续控制，目标距离提供密集奖励；每100步结束并通过随机大动作改变位置。

因此“无重置”主要针对四足学翻身的论点，不适合覆盖四个平台。A1达到训练区域边缘时也有人挪动位置，但不改变它当时关节和朝向；SAC还得到过解除腿部死锁的帮助。

## 二、把世界模型行为学习接入异步硬件数据流

论文明确说没有提出新的学习算法，贡献在于真实系统验证和异步训练基础设施。四足机器人约一小时学会翻身、站起和前行；机械臂用数小时学习视觉搬运。结果很有启发性，但不应把“无仿真、无示范”扩大成“没有人工设计、辅助或干预”。

### 1. 世界模型融合当前观察和历史

RSSM有循环状态 $h_t$ 和随机潜变量 $z_t$。观测编码器把图像、本体感知等融合，得到有观测条件的后验；动力学则从过去状态和动作预测下一潜变量先验。

教学表示为：

$$
h_t=f_\theta(h_{t-1},z_{t-1},a_{t-1}),\quad
z_t\sim q_\theta(z_t\mid h_t,o_t),\quad
\hat z_t\sim p_\theta(z_t\mid h_t).
$$

训练时解码器重建观测，奖励头预测实际收到的奖励，并用KL类约束协调先验与后验。模型基于DreamerV2的离散潜变量实现；不是早期Dreamer的连续高斯版本直接原封复制。

重建提供丰富监督，但策略在想象中训练时不必生成每张图像，只在潜在空间推进。解码视频可以帮助人检查模型，却不是控制前向每一步必做的高成本操作。

### 2. Actor–critic在想象中更新

从真实回放对应的潜在状态出发，用当前策略采样动作、模型预测状态与奖励，展开约16步。critic学习超出这段展开范围的未来回报，使用递归目标：

$$
V_t^\lambda=r_t+\gamma\big[(1-\lambda)v(s_{t+1})+\lambda V_{t+1}^\lambda\big],
\qquad V_H^\lambda=v(s_H).
$$

其中 $s$ 在这里指潜在模型状态，$\lambda$平衡短备份和长备份。连续动作可通过可微模型传播回报梯度；离散动作使用REINFORCE类估计，并加熵项维持探索。不能把所有平台都写成同一种重参数梯度。

更新actor时世界模型参数固定，但允许需要的梯度穿过模型计算；“固定参数”和“把整个计算图切断”不是一回事。若actor可以通过修改模型降低任务难度，就可能学成自我欺骗而不是更好控制。

### 3. 异步是实际系统的一部分

真实机器人不会等待训练完成。论文分开actor和learner：前者不断执行，后者持续用回放更新模型和策略。慢机械臂移动时GPU还能训练；四足需要动作及时产生，不宜把更新串在控制循环中。

没有固定的“每环境步必须更新多少次”节拍，学习尽可能与采集并行。这使墙钟学习效率更贴近硬件现实，也意味着训练更新总量由设备速度和控制频率共同决定。

异步系统要区分三只钟：真实动作次数、学习更新次数和墙钟时间。教学设定：机械臂每2秒产生一条新转移，learner每秒做10次更新，则每条真实转移期间约有20次更新；四足100Hz控制时，同样learner速度平均10条转移才有一次更新。相同网络超参数并不等于相同更新/数据比。

更快学习器可能提高样本利用，也可能更久拟合旧数据；策略参数发布过慢则actor持续用旧行为采集。论文异步actor/learner是系统贡献的一部分，因此应同时报告训练是否包含等待机器人、复位和人工处理，不能只比较GPU优化时间。[原文Implementation](https://arxiv.org/html/2206.14176)

### 一个具体例子

**自构例子，未运行。** 机械臂刚学会把球抓起，却总放回原箱。真实环境再尝试十次很慢；世界模型可从已有抓取状态想象许多“抓住后横向移动”的动作，借远期+10奖励提高这些行为的概率。但如果模型错误地认为球不会掉落，就可能推荐不可靠动作，必须用新的真实失败纠正它。

值得继续检验的是：固定墙钟预算与固定交互预算会否得出不同排序；去掉机械辅助后学习时间增加多少；冻结与持续学习在新光照、推扰下各自有什么恢复曲线。

## 三、让硬件采集、模型更新与参数发布异步运行

世界模型训练不应阻塞机器人每个控制周期，策略参数也不是每步都同步更新。数据采集、想象训练与部署发布各自运行，才把算法接到持续真机交互。

~~~text
actor线程：
    读取传感器，并更新RSSM观测条件状态
    用当前策略产生动作，经任务接口执行
    记录真实观测、动作、奖励到回放
    周期性接收learner的参数

learner线程：
    从回放抽连续片段
    学习观测重建、奖励预测和潜在动力学
    从片段中的潜在状态并行想象未来
    计算lambda回报，更新critic
    在固定世界模型参数下更新actor
    将新参数提供给actor

整个过程：
    真实经验持续纠正模型，模型想象放大经验的训练价值
~~~

## 四、按机器人分别核对时间与人工干预

**原图怎么读：** [图4，原论文图注与图像](#paper-054-daydreamer-figure-4)。下方曲线中的实心圆标出机器人摔倒时刻，需与恢复行为一起读；不要只看平滑回报上升就认为训练过程没有跌倒或人工场地维护。


<!-- figure-ref-v6:start:054-daydreamer-license -->
<p>原文标注 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本页摘图仅保留图形区域并作栅格化；有面板重排的图另行注明，作者与原文入口见各图注。</p>
<!-- figure-ref-v6:end:054-daydreamer-license -->
<!-- figure-ref-v6:start:b05ec608dbfa-anchor -->
<a id="paper-054-daydreamer-figure-4"></a>
<!-- figure-ref-v6:end:b05ec608dbfa-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/054-daydreamer-s3-f4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/054-daydreamer-s3-f4.png" width="1804" height="1720" alt="DayDreamer: World Models for Physical Robot Learning，图4：下方曲线中的实心圆标出机器人摔倒时刻，需与恢复行为一起读；不要只看平滑回报上升就认为训练过程没有跌倒或人工场地维护。" loading="lazy"></a><figcaption>实验图原图摘引：Philipp Wu、Alejandro Escontrela、Danijar Hafner 等，2022，HTML S3.F4，图4。原图面板重新排版，数据未改。<a href="https://arxiv.org/html/2206.14176v1#S3.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

单次训练的执行波动不能替代独立训练种子的不确定性；式5的符号对应尚需核实，不据此声称已验证全部更新分支。

| 平台 | 输入、动作与任务 | 主要对比 | 结果口径 |
|---|---|---|---|
| A1 | 本体状态、12关节目标角，翻身站立前行 | SAC | 墙钟学习曲线，约1小时 |
| UR5 | RGB+状态、2Hz离散搬运 | Rainbow、PPO、人类 | 约8小时达到2.5物体/分钟 |
| XArm | RGB-D+状态、约0.5Hz离散搬运 | Rainbow、人类 | 约10小时达到3.1物体/分钟 |
| Sphero | 顶视RGB、2Hz连续导航 | DrQv2 | 约2小时，平均归一化目标距离0.15 |
| 共同数据 | 各平台自己的在线真实经验，无训练示范或预先仿真 | — | 人类遥操作只用于性能参考 |
| 训练资源 | 异步世界模型与想象actor–critic，可在单GPU进行大批量潜在展开 | — | 完整硬件配置与更新数未逐项核实 |
| 不确定性 | A1[图4](#paper-054-daydreamer-figure-4)明确单次训练，阴影为时间分箱内标准差 | — | 不能当跨种子置信区间 |

按相同时间预算比较可以反映真实部署成本，但不同算法可能完成不同数量更新。本文证据支持这些系统设置中的时间效率，不是严格固定FLOPs或同梯度次数的算法排名。

人类基线通过相同机械臂接口控制，受2Hz或0.5Hz节拍限制。因此“接近人类”意味着在这套受限接口和具体任务上的吞吐接近，不能扩展成一般人类手部操作能力。

奖励中抓住加1、同箱释放减1，意图避免只抓放循环获得净奖励，但折扣、检测误差和行为时序仍会影响优化。基线出现原地抓放说明策略陷入局部行为，不足以单独证明算法在理论上必然奖励投机。

### 结果证据：五处应该怎样理解

**[图4](#paper-054-daydreamer-figure-4)与§3.1：真实学习可行。** A1从躺倒开始，一小时内学会前行，SAC在相同小预算中未学会站走。图的阴影是同一次训练内波动，因此不能说明跨初始化稳定复现率，也不能证明SAC延长训练仍不会学会。

**[图5](#paper-054-daydreamer-figure-5)与§3.2：视觉搬运吞吐。** UR5在八小时约2.5物体/分钟。指标同时取决于定位、抓取、运输和硬件动作时长；它不是单次抓取成功率。动作约束与自动松爪是达到结果的实验条件。

<!-- figure-ref-v6:start:c835db1879d1 -->
<a id="paper-054-daydreamer-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/054-daydreamer-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/054-daydreamer-v6-figure-5.png" width="2132" height="2164" alt="DayDreamer: World Models for Physical Robot Learning，图5：视觉搬运吞吐。 UR5在八小时约2.5物体/分钟。指标同时取决于定位、抓取、运输和硬件动作时长；它不是单次抓取成功率。动作约束与自动松爪是达到结果的实验条件。" loading="lazy"></a><figcaption>原图摘引：Philipp Wu、Alejandro Escontrela、Danijar Hafner 等，2022，HTML S3.F5，图5。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2206.14176v1#S3.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。视觉搬运吞吐。 UR5在八小时约2.5物体/分钟。指标同时取决于定位、抓取、运输和硬件动作时长；它不是单次抓取成功率。动作约束与自动松爪是达到结果的实验条件。</figcaption></figure>
<!-- figure-ref-v6:end:c835db1879d1 -->


**[图6](#paper-054-daydreamer-figure-6)与§3.3：软物体与辅助结构。** XArm达到约3.1物体/分钟，有时利用绳子把物体拉离角落。作者将其描述为有趣行为；从应用视角看，这说明策略利用了环境提供的辅助工具，不能直接推广为无绳任意软物体操作能力。

<!-- figure-ref-v6:start:d2a4c0d08acc -->
<a id="paper-054-daydreamer-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/054-daydreamer-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/054-daydreamer-v6-figure-6.png" width="2132" height="2144" alt="DayDreamer: World Models for Physical Robot Learning，图6：软物体与辅助结构。 XArm达到约3.1物体/分钟，有时利用绳子把物体拉离角落。作者将其描述为有趣行为；从应用视角看，这说明策略利用了环境提供的辅助工具，不能直接推广为无绳任意软物体操作能力。" loading="lazy"></a><figcaption>原图摘引：Philipp Wu、Alejandro Escontrela、Danijar Hafner 等，2022，HTML S3.F6，图6。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2206.14176v1#S3.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。软物体与辅助结构。 XArm达到约3.1物体/分钟，有时利用绳子把物体拉离角落。作者将其描述为有趣行为；从应用视角看，这说明策略利用了环境提供的辅助工具，不能直接推广为无绳任意软物体操作能力。</figcaption></figure>
<!-- figure-ref-v6:end:d2a4c0d08acc -->


**[图7](#paper-054-daydreamer-figure-7)与§3.4：存在不领先的任务。** Sphero导航与DrQv2表现接近。平均距离0.15按活动区域尺度归一化，不是0.15米，也不是15%失败率。这个结果反对“世界模型在四个平台都大幅胜出”的简单总结。

<!-- figure-ref-v6:start:567ce6b40b48 -->
<a id="paper-054-daydreamer-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/054-daydreamer-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/054-daydreamer-v6-figure-7.png" width="2132" height="2164" alt="DayDreamer: World Models for Physical Robot Learning，图7：存在不领先的任务。 Sphero导航与DrQv2表现接近。平均距离0.15按活动区域尺度归一化，不是0.15米，也不是15%失败率。这个结果反对“世界模型在四个平台都大幅胜出”的简单总结。" loading="lazy"></a><figcaption>原图摘引：Philipp Wu、Alejandro Escontrela、Danijar Hafner 等，2022，HTML S3.F7，图7。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/2206.14176v1#S3.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。存在不领先的任务。 Sphero导航与DrQv2表现接近。平均距离0.15按活动区域尺度归一化，不是0.15米，也不是15%失败率。这个结果反对“世界模型在四个平台都大幅胜出”的简单总结。</figcaption></figure>
<!-- figure-ref-v6:end:567ce6b40b48 -->


**[图8](#paper-054-daydreamer-figure-8)、附录A和B：适应与模型误差。** 四足在新增推扰训练约十分钟后改善；XArm日出光照变化使表现下降，继续训练约五小时恢复。这是带参数更新的适应，不是冻结策略天然光照不变。附录B想象视频甚至出现静止橙球变绿，提醒预测视觉不完美与任务仍可成功能够同时发生。

<!-- figure-ref-v6:start:5655088dfe9e -->
<a id="paper-054-daydreamer-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/054-daydreamer-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/054-daydreamer-v6-figure-8.png" width="2132" height="1213" alt="DayDreamer: World Models for Physical Robot Learning，图8：适应与模型误差。 四足在新增推扰训练约十分钟后改善；XArm日出光照变化使表现下降，继续训练约五小时恢复。这是带参数更新的适应，不是冻结策略天然光照不变。附录B想象视频甚至出现静止橙球变绿，提醒预测视觉不完美与任务仍可成功能够同时发生。" loading="lazy"></a><figcaption>原图摘引：Philipp Wu、Alejandro Escontrela、Danijar Hafner 等，2022，HTML S3.F8，图8。<a href="https://arxiv.org/html/2206.14176v1#S3.F8" target="_blank" rel="noopener noreferrer">核对原文</a>。适应与模型误差。 四足在新增推扰训练约十分钟后改善；XArm日出光照变化使表现下降，继续训练约五小时恢复。这是带参数更新的适应，不是冻结策略天然光照不变。附录B想象视频甚至出现静止橙球变绿，提醒预测视觉不完美与任务仍可成功能够同时发生。</figcaption></figure>
<!-- figure-ref-v6:end:5655088dfe9e -->


原机制图表补充定位：[图2](#paper-054-daydreamer-figure-2)。

<!-- figure-ref-v6:start:ab00d08d8e69 -->
<a id="paper-054-daydreamer-figure-2"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/054-daydreamer-v6-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/054-daydreamer-v6-figure-2.png" width="1140" height="976" alt="DayDreamer: World Models for Physical Robot Learning，图2：沿箭头阅读：真机经验进入回放，世界模型从回放序列学习，演员与评论家在潜空间想象轨迹上优化策略，再回到真机采集。想象训练与真实交互是不同数据流。" loading="lazy"></a><figcaption>原图摘引：Philipp Wu、Alejandro Escontrela、Danijar Hafner 等，2022，HTML S1.F2，沿箭头阅读：真机经验进入回放，世界模型从回放序列学习，演员与评论家在潜空间想象轨迹上优化策略，再回到真机采集。想象训练与真实交互是不同数据流。<a href="https://arxiv.org/html/2206.14176v1#S1.F2" target="_blank" rel="noopener noreferrer">核对原文</a>。沿箭头阅读：真机经验进入回放，世界模型从回放序列学习，演员与评论家在潜空间想象轨迹上优化策略，再回到真机采集。想象训练与真实交互是不同数据流。</figcaption></figure>
<!-- figure-ref-v6:end:ab00d08d8e69 -->


## 五、无外部仿真不等于没有模型误差和任务工程

作者承认长时间硬件学习会磨损，可能需要干预或维修，也需要更长训练来研究基线极限。本文进一步强调：算法超参数相同不能抹去动作限制、奖励设计、绳子、PD控制和人工搬移的贡献。

这里的世界模型没有展示对四个平台共享的物理知识，也没有证明学习一个任务后能广泛零样本换任务。对比TD-MPC，DayDreamer侧重想象中训练策略，部署不用每一步搜索大量候选动作；对比Diffuser，它持续从真实交互更新，生成对象和规划方式也不同。

原文式5的直立奖励HTML呈现为单位向量点积减1后除2，与后续0.7门控及最高奖励描述不相容。本文据文字解释奖励结构，不把这一式子当作可直接运行的配方；精确实现需进一步对照代码或PDF符号。这是公式核对问题，不影响本文如实报告实验曲线。

### 五个前置概念

五个前置概念：**RSSM**用记忆和随机状态表示环境；**想象轨迹**是在学得模型中生成的未来；**lambda回报**混合不同长度的价值备份；**异步学习**使更新和执行并行；**部分可观测性**指当前传感器不足以确定完整状态，例如Sphero朝向。

### 追问：异步训练中，怎样检查策略更新没有拖慢控制？

参考答案：应分别记录机器人控制周期、数据到达训练器的延迟和新参数发布频率，而不是只报总训练小时数。学习器较快不代表硬件收到最新参数，发布过频也可能增加切换开销。对照固定发布日程与实际运行日志，才能区分样本效率、计算吞吐和实时执行三类收益。

## 六、沿机制关系继续读

本篇直接承接[Dreamer](037-dreamer.md)家族，实际基于DreamerV2离散潜状态实现；与[Learning to Walk](045-learning-to-walk.md)是平行效率路线，真机数据时间与大规模仿真墙钟分别回答不同成本问题。

## 七、自测三题与参考答案

**问题1：“无仿真训练”为什么还可以说机器人在内部模拟？**

无仿真指没有预先搭建并用于采集的外部物理模拟器。内部世界模型由真实交互学习，是算法要估计的对象。它可以支持想象训练，但没有因此变成已知准确的物理引擎。

**问题2：四足无重置是否等于训练全程无人碰机器人？**

不是。论文避免用重置把跌倒变回站立，要求策略自己恢复；但到了场地边缘有人移回可训练区域。Sphero等其他任务还有不同重置协议，应逐平台说明。

**问题3：模型想象里球变色，为什么控制仍可能有效？**

任务需要的信息与完整像素准确性不完全相同。只要位置、持物状态和收益相关动态足够准确，策略仍可学到有效行为。但变色现象也提醒我们不能仅靠好看视频或一次成功判断模型普遍可靠。
