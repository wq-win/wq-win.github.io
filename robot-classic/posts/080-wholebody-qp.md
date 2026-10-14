# 080｜质心动力学与全身运动学：怎样少算方程而不丢掉身体

[返回总览](00-发展时间线总览.md) · [上一篇](079-informed-rrtstar.md) · [下一篇](081-bitstar.md)

**论文**：Hongkai Dai、Andrés Valenzuela、Russ Tedrake，*Whole-body Motion Planning with Centroidal Dynamics and Full Kinematics*，Humanoids 2014。[原始论文](https://groups.csail.mit.edu/robotics-center/public_papers/Dai14.pdf) · [出版记录](https://doi.org/10.1109/HUMANOIDS.2014.7041398)。

### 先接住前作的问题

[LIPM](027-lipm.md)等简化模型易求解，却限制身体姿态与质心运动；本篇保留全身运动学并以质心动量压缩动力学。与[接触隐式优化](075-contact-trajopt.md)可共享接触约束思想。

## 一、问题设定：全身几何与压缩动力学怎样描述同一具机器人

让人形机器人跳下台阶，既要知道身体能否维持合适的动量，也要知道脚会不会撞台阶、手够不够得到扶手。把身体简化成一个质点，第二类问题就丢掉了；每次都同时优化全部关节动力学，又可能算得很慢。

### 背景与问题定义

本篇属于已知模型的轨迹优化，不是在线或离线强化学习。输入包括机器人模型、环境几何、起止要求、接触区域和任务约束；输出是关节轨迹、整体动量轨迹、接触力及时间安排。目标函数由设计者指定，论文没有训练一个通用策略。

传统简化步行模型往往适用于特定地面、质心高度和接触条件。攀爬或腾空时，手部接触、身体转动和质心高度变化不再是可以轻易丢掉的细节。另一方面，保留全部连杆动力学会把更多变量和等式交给求解器。

需要区分两个问题：一是外力能否产生所要求的整体运动；二是各关节能否产生实现这条运动所需的内部力矩。质心方程直接处理前者；后者在执行器能力无限或足够的假设下可以通过逆动力学恢复，但真实电机存在力矩、功率和速度边界。

因此，文章所说的动力学等价具有条件。它不是说质量分布或关节惯量不重要，而是把其影响通过全身运动学与质心动量映射纳入，暂时不把每个内部力矩作为核心优化变量。

## 二、用质心动量与完整运动学的一致约束连接两层变量

### 1. 整体动力学

以 $r$ 表示质心位置、$m$ 表示总质量、$h$ 表示质心角动量、$F_j$ 表示第 $j$ 个接触力，整体方程为

$$m\ddot r=mg+\sum_j F_j,$$

$$\dot h=\sum_j\big[(c_j-r)\times F_j+\tau_j\big].$$

$c_j$ 是接触位置，$\tau_j$ 是接触力矩；这些不是关节电机力矩。第一式控制质心加速度，第二式控制身体整体角动量变化。身体内部关节力互相抵消，不能凭空改变整体线动量。

一个容易混淆的细节是：角动量不必为零。摆臂、收腿和身体转动都能改变其内部组成，但没有外力矩时，总角动量必须保持相应守恒。

### 2. 全身一致性

设关节及浮动基座配置为 $q$、广义速度为 $v$，还必须满足

$$r=\operatorname{com}(q),\qquad c_j=p_j(q),\qquad h=A(q)v.$$

如果只优化 $r$ 和接触力，求解器可能要求脚出现在腿够不到的位置。上面的映射确保质心位置、脚手接触位置和角动量来自同一个关节配置。

这里写出的 $A$ 是角动量映射；不同文献可能把线动量也堆叠进去形成六维质心动量矩阵，不能只看符号名称就认为维度相同。浮动基座的姿态参数及其导数映射也须和实现一致，教学式不替代具体坐标约定。

### 3. 约束、目标与接触顺序

轨迹离散到多个时刻，联合约束积分关系、关节范围、接触几何、摩擦及碰撞距离。目标可惩罚偏离名义姿态、较大的速度、质心加速度和接触力。这些偏好会改变动作，但目标值小不等于更省真实电能。

未知接触顺序可以用互补关系表达：

$$F_j^n\ge0,\quad \phi_j(q)\ge0,\quad F_j^n\phi_j(q)=0.$$

脚离地时不能得到地面支持；贴地时允许支持力，但并不要求一定有正力。原文还增加无滑动相关约束。接触的可能对象仍需定义，“不预设顺序”不等于不需要环境和接触模型。

最后两行含实践性核验建议，并非声称作者所有案例都完成了同样的力矩审计。整体问题仍然非凸：接触位置与力的叉积、运动学映射和互补条件都不是简单线性约束。

整体方程为何能代替一部分全身动力学？完整浮动基座系统中，内部关节力矩在整体动量账目里互相抵消，剩下六个未驱动方向由外部合力、合力矩决定。已指定关节轨迹且内部驱动充分时，可再用逆动力学恢复关节力矩。原文§II-A正是在“远离奇异、足够自由度和执行器力矩不受限”等条件下陈述等价性；把六式单独求解却不维护全身运动学，不满足这个前提。

原创静态双脚例：总重100 N，脚位于水平坐标 $x_L=-0.2,x_R=0.2$ 米，只施加竖直力且不施加接触力矩。质心居中时，$F_L+F_R=100$ 与 $0.2F_L-0.2F_R=0$ 给出各50 N。质心右移到0.1米后，力臂变为−0.3与0.1，平衡式 $0.3F_L-0.1F_R=0$ 给出25 N、75 N。若右腿承受能力只有60 N，整体平衡方程有解仍不代表机器人能执行；若腿长够不到所需接触位置，甚至几何一致性也不成立。

同时，接触力矩中的 $x_jF_j^z-z_jF_j^x$ 含位置与力的乘积。二者都作为变量时，这已经是双线性非凸项；再加入姿态运动学和互补接触，不能因某次求解采用二次子问题就称原规划问题为凸QP。原论文的复杂动作说明表达能力，并非提供了任意初始化的全局最优保证。

质心动力学和关节运动学必须在一致约束处接上。下面检查同一候选动作的两套变量，再区分数值规划、闭环仿真和实际执行证据。

## 三、联合规划接触和关节姿态，检查一致性

下面是本文整理的教学伪代码：

```text
输入机器人模型、环境、任务与候选接触集合
选择离散时刻，初始化关节、质心、动量、接触力及时间间隔
为各时刻建立：
    全身正运动学、关节边界、碰撞约束
    质心动力学与角动量动力学
    关节状态到质心、接触点和动量的一致性约束
为相邻时刻建立积分关系
若接触顺序固定：施加对应的接触区域与阶段约束
否则：增加非穿透、单边力、互补及无滑动约束
选择与接触模式设定相容的目标函数
用稀疏非线性求解器寻找局部可行轨迹
检查约束残差，并恢复关节力矩检查实际执行器限制
用独立仿真和反馈控制评价轨迹；不把优化成功当作执行成功
```

### 自构例子与前置知识

**自构例子，未运行。** 总支持力为 100 N，单脚承担时平方和为 10000；两脚各承担 50 N 时为 5000。只优化这个量会倾向分摊载荷，但若任务要求迈步，必须有另一部分目标或约束表达离地需要。这个算式展示目标偏置，不证明论文中每条轨迹都出现这一现象。

五个前置概念：

1. 质心：质量加权的位置平均，是整体平移动力学的自然参考点。
2. 角动量：整体转动状态的量，变化由外力矩决定。
3. 正运动学：从关节配置计算手脚和质心位置。
4. 直接轨迹优化：把多个时刻的状态与输入一起作为优化变量。
5. 互补约束：以乘积为零表达接触距离与支持力不能同时为正。

## 四、读数值动作与部分闭环仿真

<!-- figure-ref-v6:start:rc-80-figure-7-anchor -->
<span id="rc-80-figure-7"></span>
<!-- figure-ref-v6:end:rc-80-figure-7-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/080-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/080-evidence.png" width="717" height="405" alt="Fig. 7：将质心高度和归一化竖直反力放在同一运动阶段看，尤其检查触地、支撑与离地的对应" loading="lazy"></a><figcaption>原论文结果图／表摘引：Hongkai Dai、Andrés Valenzuela、Russ Tedrake（2014），Fig. 7，PDF 第 6 页；<a href="https://groups.csail.mit.edu/robotics-center/public_papers/Dai14.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：将质心高度和归一化竖直反力放在同一运动阶段看，尤其检查触地、支撑与离地的对应。力归一化后仍不是电机功率，网格点满足约束也不是连续时间自动无误差。

### 实验设计

这篇是非线性全身轨迹优化，接触顺序、足点与身体姿态仍带非凸结构；内部使用二次子问题不使完整方法成为凸 QP。

| 项目 | 论文内容与证据边界 |
| --- | --- |
| 机器人与任务 | Atlas 动作规划与 LittleDog 步态；见 §III |
| 数据 | 模型及任务几何，不是大规模示范或交互训练集 |
| 求解 | 稀疏非线性优化，使用 SNOPT；优化质量依赖初始化 |
| 控制验证 | 部分动作在 Drake 中结合已有反馈控制器模拟，不能概括为全部真机成功 |
| 对照 | 固定与自由接触顺序的落地例子；另讨论完整动力学求解器的困难 |
| 指标 | 可行轨迹、姿态及力曲线、求解时间；没有统一的大样本成功率排行榜 |
| 随机性与误差 | 未报告所有案例的独立重复次数、成功概率及置信区间，不据此生成统计显著性 |

已有控制器属于额外系统组件。若没有它，开环轨迹面对离散化或状态扰动可能不能稳定执行。比较规划方法时，应把参考轨迹质量和跟踪控制器贡献分开。

### 五处证据与限制

1. **[图 2](#rc-80-figure-2)：几何表达能力。** 展示脚、手、朝向和视线等约束如何同时指定。支持完整运动学的必要性，但这本身不是动力学跟踪试验。

<!-- figure-ref-v6:start:rc-80-figure-2 -->
<figure class="reading-evidence-figure" id="rc-80-figure-2"><a href="/robot-classic/assets/figure-refs-v6/080-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/080-fig-2.png" width="640" height="573" alt="人形机器人足端、手部目标和视线几何约束示例" loading="lazy"></a><figcaption>Hongkai Dai、Andrés Valenzuela、Russ Tedrake（2014），图 2，PDF 第 3 页；<a href="https://groups.csail.mit.edu/robotics-center/public_papers/Dai14.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：绿色视线锥与手部目标展示了完整运动学表达的约束，不能据这个姿态图判断动力学跟踪是否成功。
<!-- figure-ref-v6:end:rc-80-figure-2 -->

2. **[图 4](#rc-80-figure-4)–[图 8](#rc-80-figure-8)、§III-A/B：跳跃与奔跑。** 包括 29 cm 台阶及指定 2 m/s 的奔跑规划。数字是任务条件或参考运动条件，不应直接写成现实机器人速度纪录。

<!-- figure-ref-v6:start:rc-80-figure-4 -->
<figure class="reading-evidence-figure" id="rc-80-figure-4"><a href="/robot-classic/assets/figure-refs-v6/080-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/080-fig-4.png" width="640" height="420" alt="人形机器人越过障碍的空中运动规划姿态" loading="lazy"></a><figcaption>Hongkai Dai、Andrés Valenzuela、Russ Tedrake（2014），图 4，PDF 第 5 页；<a href="https://groups.csail.mit.edu/robotics-center/public_papers/Dai14.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：图中身体各关节共同满足腾空运动约束；这是一段规划的可视化，不是硬件执行成功率统计。
<!-- figure-ref-v6:end:rc-80-figure-4 -->

<!-- figure-ref-v6:start:rc-80-figure-5 -->
<figure class="reading-evidence-figure" id="rc-80-figure-5"><a href="/robot-classic/assets/figure-refs-v6/080-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/080-fig-5.png" width="640" height="261" alt="人形机器人踏上台阶的三阶段规划姿态" loading="lazy"></a><figcaption>Hongkai Dai、Andrés Valenzuela、Russ Tedrake（2014），图 5，PDF 第 5 页；<a href="https://groups.csail.mit.edu/robotics-center/public_papers/Dai14.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：三个姿态展示起跳、跨越和落地的几何安排；台阶高度是任务条件，不能当作机器人平台的普遍性能上限。
<!-- figure-ref-v6:end:rc-80-figure-5 -->

<!-- figure-ref-v6:start:rc-80-figure-6 -->
<figure class="reading-evidence-figure" id="rc-80-figure-6"><a href="/robot-classic/assets/figure-refs-v6/080-fig-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/080-fig-6.png" width="640" height="378" alt="人形机器人奔跑的触地、支撑与离地姿态" loading="lazy"></a><figcaption>Hongkai Dai、Andrés Valenzuela、Russ Tedrake（2014），图 6，PDF 第 6 页；<a href="https://groups.csail.mit.edu/robotics-center/public_papers/Dai14.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：面板按触地、支撑中段和脚尖离地排列，说明周期轨迹中的接触与姿态变化；指定奔跑速度是规划目标。
<!-- figure-ref-v6:end:rc-80-figure-6 -->

<!-- figure-ref-v6:start:rc-80-figure-8 -->
<figure class="reading-evidence-figure" id="rc-80-figure-8"><a href="/robot-classic/assets/figure-refs-v6/080-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/080-fig-8.png" width="640" height="351" alt="人形机器人在低障碍下通过的三帧姿态" loading="lazy"></a><figcaption>Hongkai Dai、Andrés Valenzuela、Russ Tedrake（2014），图 8，PDF 第 6 页；<a href="https://groups.csail.mit.edu/robotics-center/public_papers/Dai14.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：机器人同时调整腿部和躯干以满足空间约束；采用完整运动学使这些躯体碰撞条件可以显式表达。
<!-- figure-ref-v6:end:rc-80-figure-8 -->

3. **[图 7](#rc-80-figure-7)：质心与支撑力。** 曲线让读者检查运动和外力是否相容。归一化地面反力不能当作电机功率，离散点一致也不能自动保证连续轨迹完全无误差。

4. **[图 10](#rc-80-figure-10)：接触顺序确实能变化。** 从固定顺序解初始化后，互补形式得到不同落地姿态。它支持局部搜索能改变模式，但没有证明所有模式都被遍历、或最终模式全局最优。

<!-- figure-ref-v6:start:rc-80-figure-10 -->
<figure class="reading-evidence-figure" id="rc-80-figure-10"><a href="/robot-classic/assets/figure-refs-v6/080-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/080-fig-10.png" width="640" height="460" alt="固定与自由接触顺序优化得到的不同落地姿态" loading="lazy"></a><figcaption>Hongkai Dai、Andrés Valenzuela、Russ Tedrake（2014），图 10，PDF 第 6 页；<a href="https://groups.csail.mit.edu/robotics-center/public_papers/Dai14.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：两面板的左右脚先后落地顺序不同，说明允许改变接触模式会改变优化结果；这不意味着已经遍历全部离散模式。
<!-- figure-ref-v6:end:rc-80-figure-10 -->

5. **§IV：速度的真实边界。** 当前 MATLAB 版本通常需要分钟，差的初始化可能耗费小时。文中的 0.2 秒对应另一个仅运动学的实现；对 C++ 加速的期待也不能替换成本篇完整方法已经达到的结果。

作者对完整动力学求解困难的解释仍带有推测成分。不能把一套基线实现的困难扩大为“全动力学优化理论上不可行”，也不能据此算出一个没有统一预算的加速比。

## 五、保留执行器能力、非凸性和初始化假设

真正值得继承的是表示选择：减少核心动力学方程，同时用一致性约束保留身体几何。它比纯质点模型更有表达力，但并不因此免除关节执行器检查。

作者承认求解时间及初始化问题。我们的分析还包括：接触模型、摩擦系数、几何误差和执行器饱和会影响可执行性；离散碰撞约束应进一步检查节点之间；对于有明显柔性、背隙或复杂手指抓握的硬件，当前抽象可能不足。

另一个设计陷阱是接触力平方惩罚。在允许选择接触数量时，把固定总支持力分给更多接触点通常降低平方和，因此会偏向多点同时接触。这是目标函数诱导的行为，不能误读成机器人“自然学会最优支撑策略”。原文未知接触模式版本调整了相关目标。

## 六、追问：质心和接触力满足动力学，为什么还要核对关节姿态中的质心位置？

<details>
<summary>质心和接触力满足动力学，为什么还要核对关节姿态中的质心位置？</summary>

**参考答案**：若两套变量各自可行却不一致，优化描述的就不是同一个物理身体。必须通过相应运动学一致约束把整体动量与关节姿态连接起来。通过这项检查后，实际执行器是否有足够能力仍是另一层条件。

教学参照：[Underactuated Robotics: Trajectory Optimization](https://underactuated.mit.edu/trajopt.html)。这里借用其分开变量、离散约束与求解预算的讲法。

</details>

## 七、比较更强近似下的在线接触力规划

- **平行路线**：[Cheetah 凸 MPC：用简化模型提前安排四足机器人的支撑力](094-cheetah-mpc.md)。以更强模型近似换取在线滚动求解，预算与保证不同。

## 八、自测与参考答案

### 问题 1：满足质心动力学后，为什么还要检查关节力矩？

**答案：** 整体外力平衡只说明浮动身体的总体运动有可能成立。实现某个关节加速度还需要内部电机力矩，真实执行器可能饱和。论文的简化依赖足够控制能力，不能删掉这个条件后仍宣称完整物理可执行。

### 问题 2：只要求脚在地面上，为什么不够？

**答案：** 几何接触没有说明地面是否提供了合法支持力、摩擦是否足够或身体是否满足动量变化。反过来，只有接触力方程又可能把力施加在脚够不到的地方。因此动力学、运动学和两者的一致性必须同时成立。

### 问题 3：为何接触力平方惩罚可能妨碍未知步态搜索？

**答案：** 固定总力分摊到更多接触点会减小平方和，因此目标可能偏好所有脚持续贴地。这个偏好对载荷均匀有用，却可能与迈步相冲突。接触顺序可变时，应重新设计目标，不能机械照搬固定模式版本。
