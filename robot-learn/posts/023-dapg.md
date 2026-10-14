# 023｜DAPG：示范如何引导灵巧操作探索

[系列首页](README.md) · [上一篇](022-her.md) · [下一篇](024-dynamics-randomization.md)

**原论文**：*Learning Complex Dexterous Manipulation with Deep Reinforcement Learning and Demonstrations*，Aravind Rajeswaran 等，2017年首次公开。[原文](https://arxiv.org/abs/1709.10087)。

### 先接住前作的问题

[PoWER](004-power.md)可从示范运动参数开始按回报搜索，但高维灵巧反馈策略还需要在训练过程中持续得到示范方向。DAPG把行为克隆初始化与衰减的专家梯度分开设计，研究哪些阶段仍需示范；不是把DMP参数搜索直接放大。

## 一、问题设定：高维灵巧探索怎样持续利用少量示范

五指手要拿起锤子再敲钉子，随机探索首先得碰巧学会接近、握住、提起和挥动。只在最后奖励“钉进去”，几乎没有早期学习信号。DAPG 用少量示范先把策略放到有意义的行为附近，再在强化学习期间持续加入模仿梯度。

任务包括物体搬运、笔的手内重定向、开门和锤击。观测提供手关节角、物体与目标位置姿态，动作是期望关节位置。仿真虽然支持触觉，本工作未使用。它不是直接从RGB推断物体姿态的感知操作系统。

示范来源也要分开。多数任务通过虚拟现实系统采集人类示范；笔的重定向因为缺少触觉反馈难以演示，使用经过塑形奖励训练的计算专家。每任务25条成功示范，不应统一称“每个任务25条真人示范”。

## 二、分开行为克隆初始化与衰减专家梯度

它不是只做行为克隆，也不是把示范放进DDPG回放池。底层采用自然策略梯度，示范作为额外方向引导在策略数据上的优化，并随着训练逐步减弱。

### 第一步：行为克隆初始化

先最大化：

$$
L_{\mathrm{BC}}(\theta)=
\sum_{(s,a)\in D}\log\pi_\theta(a|s).
$$

这让探索从接近专家的动作开始。但BC可能只学到拿起锤子，尚未学会接着击打。如果后续完全丢掉示范，关于击打阶段的有用数据就难以再发挥作用。

因此BC不成功并不意味着示范没有价值。它只需让策略进入比随机动作更好的区域，随后RL根据任务反馈提高成功率。

### 第二步：在策略梯度中持续加入示范

原文增强梯度为：

$$
g_{\mathrm{aug}}=
\sum_{(s,a)\in D_\pi}
\nabla_\theta\log\pi_\theta(a|s)\hat A(s,a)
+\sum_{(s,a)\in D}
\nabla_\theta\log\pi_\theta(a|s)w_k.
$$

第一项来自当前策略的新交互，第二项增加示范动作概率。$D_\pi$ 和 $D$ 的采样量及归一化会影响实际权重，实现不能只复制公式而忽略批量比例。

原文给出启发式：

$$
w_k=\lambda_0\lambda_1^k
\max_{(s,a)\in D_\pi}\hat A(s,a).
$$

$\lambda_0$控制初始强度，$\lambda_1<1$控制衰减，$k$是迭代编号。作者不能直接获得所有专家状态动作在当前策略下的优势，因此使用此近似，而不是声称它是精确的无偏优势估计。

当策略接近或超过示范时，减弱模仿避免长期限制改进方向。但衰减日程不保证每次恰好适合技能掌握速度：太快可能丢失后期阶段指引，太慢可能偏向次优示范。这属于机制分析。

### 自然梯度的角色

以策略的 Fisher 信息矩阵 $F$ 对梯度预条件，更新方向为 $F^{-1}g_{\mathrm{aug}}$，再限制步幅。直觉是参数变化相同不代表行为变化相同，自然梯度按动作分布实际变化调整尺度。

它不学习环境动力学，也不对接触物理求导。价值估计用于形成优势，示范项来自监督数据，任务奖励仍是最终优化依据。三种信号职责不同。

示范项的强弱不能只看 $\lambda_1^k$。这里 $D$ 是示范批、$D_\pi$ 是当前策略批；若实现把两个批次分别求和，示范梯度的有效尺度还随 $|D|/|D_\pi|$ 改变；把示范批量翻倍、在线批量不变，会改变方向，即使所有超参数都未改。以各自均值替代求和也需要对应重标权重。这是由梯度式直接得到的复现检查。

教学例：任务梯度为 $(1,0)$，加权示范方向为 $(0,1)$，合并后指向45度；示范样本重复四倍且仍求和，会转向约76度。自然梯度只重新度量这个合并方向，不能自动知道重复样本不算新增证据。因此灵巧任务的示范效率比较应同时核对初始化、持续示范项和批量比例。[原文示范增强梯度](https://arxiv.org/html/1709.10087)

### 一个自构例子

未运行的教学例子：BC预训练后，手能握住锤子但经常在挥动时掉落。第一阶段RL提高握持稳定性，随后继续读取示范的挥动片段，才可能学到接触钉子的姿态。

若只在开始做BC，挥动数据已经被压进一个不完整策略，后续探索很难重新发现它。额外示范梯度提供再次接触这部分知识的机会。这里的“再次”不是重新请人演示，而是反复利用固定示范数据。

## 三、先行为克隆，再逐渐减弱专家辅助梯度

初始化让策略先进入有意义的动作区域，持续专家项再影响在线梯度方向。两步可以分别消融，衰减日程也必须与自然策略梯度的更新预算一起记录。

~~~text
输入每任务成功示范
用行为克隆预训练随机策略
每轮强化学习：
    用当前策略采集新轨迹
    计算任务回报与优势
    估计当前策略梯度
    从示范计算动作对数概率梯度
    按衰减权重合并两个方向
    估计Fisher信息，执行归一化自然梯度更新
    独立测量任务成功与环境变化下表现
~~~

伪代码是方法教学归纳。若改用PPO或不同示范权重，可以继承思想，但已不等于原文逐项实现。

## 四、核对交互节省与仿真运行时间

作者报告显著减少模拟灵巧操作所需交互。实验支持24自由度手的四类模拟任务，未完成同等真机技能部署。

**原图怎么读：** [图9，原论文图注与图像](#paper-023-dapg-figure-9)。星号标记训练环境条件，上方曲线考察偏离该条件后的表现。先定位星号再读鲁棒性，才能区分训练分布内拟合和对新条件的迁移。


<!-- figure-ref-v6:start:4ebb7915bc47-anchor -->
<a id="paper-023-dapg-figure-9"></a>
<!-- figure-ref-v6:end:4ebb7915bc47-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/023-dapg-s5-f9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/023-dapg-s5-f9.png" width="1804" height="1428" alt="Learning Complex Dexterous Manipulation with Deep Reinforcement Learning and Demonstrations，图9：星号标记训练环境条件，上方曲线考察偏离该条件后的表现。先定位星号再读鲁棒性，才能区分训练分布内拟合和对新条件的迁移。" loading="lazy"></a><figcaption>实验图原图摘引：Aravind Rajeswaran 等，2017年首次公开，HTML S5.F9，图9。原图面板重新排版，数据未改。<a href="https://arxiv.org/html/1709.10087v2#S5.F9" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 项目 | 原文设置与阅读要点 |
|---|---|
| 环境 | MuJoCo中的ADROIT模拟手，24自由度位置控制 |
| 任务 | 搬运、锤击、开门、笔重定向，分别有成功判据 |
| 示范 | 每任务25条，VR人类与计算专家来源不同 |
| 数据扰动 | 示范执行中每步加入小幅关节扰动以改善覆盖 |
| 对照 | NPG与DDPG从头学习；DAPG与DDPGfD比较 |
| 奖励 | 从头学习分别测稀疏和塑形；示范方法主比较采用稀疏完成奖励 |
| 预算 | [表I](https://arxiv.org/html/1709.10087v2#S5.T1)每轮200条、每条2秒，按90%成功阈值比较 |
| 时间指标 | 表中“robot hours”由模拟轨迹时长换算，非实际真机运行记录 |
| 统计范围 | 主文曲线重复种子和全部误差定义在此未完整核实，不自行填入 |

“几小时机器人经验”并不等于真机几小时就能复现。采集重置、状态测量、控制延迟、接触差异和硬件保护都未包含在轨迹时长换算中。模拟样本效率是重要证据，但不能替代部署实验。

### 五处关键证据

依据[论文全文](https://arxiv.org/html/1709.10087)。

| 位置 | 观察 | 支持与限制 |
|---|---|---|
| 第IV-C节、式5–6 | BC初始化与后续示范项分别保留 | 不只是普通BC后随意微调 |
| [图7](#paper-023-dapg-figure-7) | 稀疏奖励从头学习困难，塑形帮助部分方法 | 不证明所有无示范方法都无法解决 |
| [图9](#paper-023-dapg-figure-9) | 环境参数变化下DAPG策略更稳健 | 仅覆盖所测试变化，不等于真实硬件鲁棒 |
| [图10](#paper-023-dapg-figure-10) | 在相应设置中DAPG比DDPGfD更早取得进展 | 不能推广成on-policy必比off-policy省数据 |
| [表I](https://arxiv.org/html/1709.10087v2#S5.T1) | 达90%成功的搬运：DAPG52轮、5.77小时；塑形NPG880轮、98小时 | 时间是交互等效值，且额外示范不同 |

<!-- figure-ref-v6:start:9cc0258289fc -->
<a id="paper-023-dapg-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/023-dapg-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/023-dapg-v6-figure-7.png" width="2132" height="1390" alt="Learning Complex Dexterous Manipulation with Deep Reinforcement Learning and Demonstrations，图7：读图对应本段的“稀疏奖励从头学习困难，塑形帮助部分方法”；不证明所有无示范方法都无法解决。" loading="lazy"></a><figcaption>原图摘引：Aravind Rajeswaran 等，2017年首次公开，HTML S5.F7，图7。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/1709.10087v2#S5.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。读图对应本段的“稀疏奖励从头学习困难，塑形帮助部分方法”；不证明所有无示范方法都无法解决。</figcaption></figure>
<!-- figure-ref-v6:end:9cc0258289fc -->
<!-- figure-ref-v6:start:9ec5fba4d6cf -->
<a id="paper-023-dapg-figure-10"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/023-dapg-v6-figure-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/023-dapg-v6-figure-10.png" width="2132" height="1390" alt="Learning Complex Dexterous Manipulation with Deep Reinforcement Learning and Demonstrations，图10：读图对应本段的“在相应设置中DAPG比DDPGfD更早取得进展”；不能推广成on-policy必比off-policy省数据。" loading="lazy"></a><figcaption>原图摘引：Aravind Rajeswaran 等，2017年首次公开，HTML S5.F10，图10。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/1709.10087v2#S5.F10" target="_blank" rel="noopener noreferrer">核对原文</a>。读图对应本段的“在相应设置中DAPG比DDPGfD更早取得进展”；不能推广成on-policy必比off-policy省数据。</figcaption></figure>
<!-- figure-ref-v6:end:9ec5fba4d6cf -->


[表I](https://arxiv.org/html/1709.10087v2#S5.T1)按同一阈值计算的轮数比为 $880/52\approx16.9$。正文另有搬运“几乎30倍”的表述，但不宜直接拿它解释这张表；可能对应不同曲线或衡量点，这里未进一步确认，因此采用可明确核对的表项。

[图8](#paper-023-dapg-figure-8)提供纯RL动作“不自然”的例子，这是定性观察，不是动作风格的统一量化评分。更像人可能与鲁棒有关，但仅凭视频不能证明人类动作先验是所有鲁棒增益的唯一原因。

<!-- figure-ref-v6:start:99ddb486a807 -->
<a id="paper-023-dapg-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/023-dapg-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/023-dapg-v6-figure-8.png" width="2132" height="1296" alt="Learning Complex Dexterous Manipulation with Deep Reinforcement Learning and Demonstrations，图8：图8提供纯RL动作“不自然”的例子，这是定性观察，不是动作风格的统一量化评分。更像人可能与鲁棒有关，但仅凭视频不能证明人类动作先验是所有鲁棒增益的唯一原因。" loading="lazy"></a><figcaption>原图摘引：Aravind Rajeswaran 等，2017年首次公开，HTML S5.F8，图8。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/1709.10087v2#S5.F8" target="_blank" rel="noopener noreferrer">核对原文</a>。图8提供纯RL动作“不自然”的例子，这是定性观察，不是动作风格的统一量化评分。更像人可能与鲁棒有关，但仅凭视频不能证明人类动作先验是所有鲁棒增益的唯一原因。</figcaption></figure>
<!-- figure-ref-v6:end:99ddb486a807 -->


## 五、专家偏好和任务奖励可能出现冲突

局限首先是状态信息理想化。真机视觉估计误差、触觉缺失、摩擦变化与执行带宽可能影响手内操作。论文详细模拟硬件并不消除这些差异，作者也明确把硬件成功留待后续。

其次是示范质量。如果专家动作偏好只对一种物体有效，持续模仿可能限制策略适应。启发式衰减试图缓和这一点，但并非自动筛选每条优劣示范。需要新实验比较次优、异质和错误示范才能判断边界。

### 五个前置概念

五个概念是：**行为克隆**拟合示范动作；**策略梯度**提高有正优势动作的概率；**自然梯度**按策略分布几何调整更新；**优势函数**比较动作相对当前状态的收益；**辅助模仿损失**在任务训练中保留专家方向。

### 追问：若示范在一类状态上持续与奖励改进方向相反，应怎样排查？

参考答案：先核对示范与强化学习是否使用相同动作接口、目标和状态定义，再区分专家次优与奖励误设。可以记录两类梯度在相应状态附近的一致性，并比较不同衰减日程下的成功与恢复行为。固定专家项会影响优化方向，但不能仅因方向相反就认定专家错误；最终需要独立任务评价。

## 六、沿机制关系继续读

与[PoWER](004-power.md)有教学联系：都可从示范起步再靠回报改进，但DAPG保留示范梯度，策略是高维反馈网络；[AWAC](039-awac.md)是平行融合路线，用估计优势逐样本加权而非固定专家项。

## 七、自测三题与参考答案

**问题1：BC策略失败，为什么还能显著帮助RL？**

答案：它可以把随机探索变成围绕接近、抓住等有意义状态的探索。最终任务失败不代表所有中间能力都是零，RL能在更好覆盖上继续改进。

**问题2：为何不把模仿权重一直设得很大？**

答案：目标是完成任务而非永久复制示范。过大权重可能限制超过示范或适应新情况；衰减让任务回报逐渐主导，但衰减速度仍需检验。

**问题3：5.77小时是否意味着真实机器人只需训练5.77小时？**

答案：它是52轮乘200条乘2秒的经验时长换算。真机还需复位、感知、计算和可靠控制，且本论文没有完成同等硬件验证，所以不能直接作部署承诺。
