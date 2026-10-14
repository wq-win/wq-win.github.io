# 071｜MuJoCo：让物理仿真成为控制优化的内循环

[系列首页](README.md) · [时间线总览](00-发展时间线总览.md)

论文：Emanuel Todorov、Tom Erez、Yuval Tassa，*MuJoCo: A Physics Engine for Model-Based Control*，IROS 2012。[原始书目链接](https://homes.cs.washington.edu/~todorov/papers/TodorovIROS12.pdf)；[作者迁移后的全文](https://roboti.us/lab/papers/TodorovIROS12.pdf)。阅读范围为原文八页的算法、建模与计时实验；以下讨论 2012 年版本，不把后来的功能倒写成初版贡献。未独立重跑计时实验。

### 先接住前作的问题

[Newton–Euler](005-newton-euler.md)解决多关节计算，[接触时间步进](036-impulse-contact.md)处理碰撞，面向控制还需速度与逆动力学接口。MuJoCo组合并取舍这些数值模块；[CIO](072-contact-implicit.md)则说明外层动作优化为何关心接触模型的可求解性。

## 一、问题设定：控制优化怎样反复调用可计算的接触动力学

控制优化需要不断问：“如果现在施加这个力，下一步会怎样？”如果每次仿真很慢、接触数值不稳定，或者难以重复调用，优化算法就很难发挥作用。MuJoCo 把仿真器设计成可反复调用的计算组件，围绕多关节动力学、接触求解、逆动力学和并行评估进行组织。

### 问题与建模设定

仿真状态包括广义位置 $q$、速度 $v$，以及某些执行器的激活状态；控制输入经执行器转为广义力。输出是下一状态或逆动力学需要的力。奖励、终止条件与训练数据不是引擎固定组成，须由使用它的控制任务定义。

广义坐标直接描述关节允许的运动。与先给每个刚体自由运动、再用大量约束把它们绑起来相比，这能利用机构树结构。四元数表示的姿态有四个数，角速度只有三个分量，因此不能总把 $v$ 当作与 $q$ 同维的普通导数，更不能对四元数直接逐项相加后不做几何处理。

刚性接触又带来不同困难：一个物体落地时速度可能突变，而传统高刚度弹簧模型要求很小的时间步才能稳定。论文采用速度步进，把一个时间步内接触的作用表示为冲量。冲量单位是力乘时间；把它与普通力混用会导致时间步改变后行为异常。

## 二、从广义坐标动力学转到接触空间求解

省略等式约束时，教学形式为

$$M(v^+-v)=h(b+\tau)+J^T f,\qquad
v_C=Jv^+=Af+v_0,\qquad A=JM^{-1}J^T.$$

$M$ 是广义惯性矩阵，$h$ 是步长，$b$ 按原文约定包含重力等偏置力，$\tau$ 是控制与外力，$J$ 把广义速度映射为接触点速度，$f$ 是接触冲量。$v_0$ 表示没有接触冲量时的接触速度。存在闭环等式约束时，需要先投影到满足约束的速度子空间，不能原样使用上面的 $M^{-1}$。

$A$ 表示接触之间通过机构传递的影响。手掌压在桌面上，一个接触点的力可能改变另一个接触点的速度；把接触完全独立处理会丢失这种耦合。实现通常通过分解和回代求解线性系统，而不是显式计算一个稠密逆矩阵。

原文 §II 给出三种接触路线。隐式互补求解器用混合变量编码法向力和分离速度，再解残差问题，目标是较准确地满足接触关系；但原文并未保证总能找到零残差。凸求解器放松部分非凸条件，以速度与精度折中。对角求解器忽略接触耦合，最快但精度较低。这三种方法不能概括为一个“精确可微刚体求解器”。

凸路线的目标可整理为

$$\min_{f\in\mathcal K}\frac12 f^T(A+R)f+f^Tv_0+\psi(Af+v_0).$$

$\mathcal K$ 是摩擦锥，$R$ 是正则项，$\psi$ 惩罚不希望出现的法向速度。前三个部分分别描述冲量造成的能量变化、原有速度与冲量的关系，以及穿透相关代价。正则化同时影响可解性和物理近似，不只是一个无关紧要的数值补丁。这里优化的是单步接触响应，不是任务回报。

逆动力学的需求与前向不同：给定轨迹，想计算支持它所需的力。优化早期轨迹可能穿透物体，若此时逆动力学完全没有定义，外层优化就难以连续改善。论文 §II.G 讨论 posthoc 模式，以及特定凸接触模型的可逆结构。**可逆是指定模型与条件下的性质，不代表真实世界的接触力始终唯一，也不代表任意求解器都有同样逆映射。**

### 接触空间有效质量把整台机构带进一个小方程

接触雅可比 $J$将广义速度映到接触法向速度，$M$为对称正定的广义惯量矩阵。无其他约束时，冲量 $f$造成的法向速度变化为 $JM^{-1}J^Tf$，因此标量接触的有效质量是 $m_{eff}=1/(JM^{-1}J^T)$，不是随手取末端零件质量。

**教学例**取 $M=\operatorname{diag}(1,4)$、$J=[1\ 1]$，得到 $JM^{-1}J^T=1.25$、$m_{eff}=0.8$。若接触前法向闭合速度为−1，理想无反弹停止所需冲量为0.8；把有效质量误设为两项质量之和5会严重改变响应。多个接触对应矩阵非对角项，不能逐个套独立单体碰撞。

本篇将[Newton–Euler](005-newton-euler.md)等动力学算法作为模块，与[Stewart–Trinkle](036-impulse-contact.md)是接触数值模型的平行路线。[原文第II节](https://roboti.us/lab/papers/TodorovIROS12.pdf)还区分四元数配置维数和速度维数，故不能默认 $v=\dot q$逐分量成立。论文SD/FAST对比重点在多关节动力学成本，基线不处理同样接触，不能把这组计时解释成同接触精度下的全面胜出。

接触求解器是外层控制反复调用的组件，速度与精度必须连同设置报告。下面检查调用接口和教学接触例子，再读特定模型上的计时。

## 三、选择求解与逆动力学接口，检查速度精度取舍

```text
输入：已编译机构模型，状态(q,v)，控制u，步长h
计算执行器输出力与偏置力
正向运动学；检测候选接触；构造约束与接触Jacobian
计算惯性矩阵并利用机构稀疏性分解
先消去等式约束，得到接触空间系统 A f + v0
按所选精度/速度路线求接触冲量f
回代求下一步广义速度v_next
在位置与姿态各自的几何表示上积分
输出下一状态及接触诊断
```

## 四、按模型和调用预算读吞吐计时

<!-- figure-ref-v6:start:rc-71-table-2-anchor -->
<span id="rc-71-table-2"></span>
<!-- figure-ref-v6:end:rc-71-table-2-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/071-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/071-evidence.png" width="763" height="239" alt="Table 2：固定状态批量下对照线程数和接触数，观察总计算时间" loading="lazy"></a><figcaption>原论文结果图／表摘引：Emanuel Todorov、Tom Erez、Yuval Tassa（2012），Table 2，PDF 第 7 页；<a href="https://roboti.us/lab/papers/TodorovIROS12.pdf#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：固定状态批量下对照线程数和接触数，观察总计算时间。这里可并行的是大量独立动力学评估，不能用表内加速比预测一条串行控制轨迹的单步延迟。

### 实验设计

| 项目 | 原文设置与检查目的 |
|---|---|
| 平滑动力学 | §IV.A：孤立刚体、长链、手、人形四类模型，与 SD/FAST 比较 |
| 计算内容 | 正向运动学、Jacobian、惯性矩阵与偏置力；另列分解回代开销 |
| 重复与硬件 | [表 1](https://roboti.us/lab/papers/TodorovIROS12.pdf#page=7)：四种 Intel 处理器，100 次运行平均，单线程 |
| 接触优化调用 | §IV.B：18 自由度人形，30 时间步，每足三个接触点 |
| 并行配置 | 双六核 X5860，启用超线程，比较 1 与 24 线程 |
| 指标 | 每秒动力学评估次数，以及一次轨迹代价、梯度、Hessian 评估时间 |
| 未报告范围 | 现代 GPU 比较、真实接触误差基准、随机训练种子置信区间 |

这里没有环境交互学习曲线，也没有统一的任务成功率。评价对象是计算内循环。不同求解器的精度、收敛容差、接触数量和缓存状态都会影响速度，不能拿某个最快数字代表任意仿真任务。

### 三组证据怎样阅读

**证据 1｜[表 1](https://roboti.us/lab/papers/TodorovIROS12.pdf#page=7)：不是每个模型都胜出。**手模型每秒评估数为 MuJoCo 101,000、SD/FAST 89,000；长链则为 103,000 对 128,000。比较支持结构和实现决定速度，不能推出 MuJoCo 对所有平滑动力学总是更快。表中增加回代的列还执行了额外工作，不能与前两列直接当作相同任务比较。

**证据 2｜[表 2](https://roboti.us/lab/papers/TodorovIROS12.pdf#page=7)：并行加速来自大量独立评估。**42,930 个状态、六接触条件下，1 与 24 线程的时间为 1.096 秒和 0.111 秒，按相除约 9.87 倍。它不是单条因果仿真轨迹加速 24 倍；有限差分的许多扰动状态能并行，是这里的重要条件。

**证据 3｜[图 2](#rc-71-figure-2) 与 §II.D：平滑接触的展示。**落球例子展示凸求解器的响应形状，支持所选配置能形成看似刚性的接触。它不能证明所有摩擦、冲击或极端质量比都准确。更强的验证还应比较穿透、能量变化、步长收敛和真实测量。

<!-- figure-ref-v6:start:rc-71-figure-2 -->
<figure class="reading-evidence-figure" id="rc-71-figure-2"><a href="/robot-classic/assets/figure-refs-v6/071-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/071-fig-2.png" width="640" height="315" alt="原论文图2：MuJoCo接触示例及法向冲量、竖直速度曲线" loading="lazy"></a><figcaption>Emanuel Todorov、Tom Erez、Yuval Tassa（2012），图 2，PDF 第 4 页；<a href="https://roboti.us/lab/papers/TodorovIROS12.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：右侧曲线以仿真时间为横轴，速度与冲量峰值不能当成求解耗时。
<!-- figure-ref-v6:end:rc-71-figure-2 -->

以上证据定位见[作者原文](https://roboti.us/lab/papers/TodorovIROS12.pdf)。[图 3](#rc-71-figure-3) 的应用来自相关工作，说明接口已经用于控制研究，但不构成本文内部完整的控制算法消融。

<!-- figure-ref-v6:start:rc-71-figure-3 -->
<figure class="reading-evidence-figure" id="rc-71-figure-3"><a href="/robot-classic/assets/figure-refs-v6/071-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/071-fig-3.png" width="640" height="595" alt="原论文图3：MuJoCo四种机器人或肌肉骨骼仿真模型" loading="lazy"></a><figcaption>Emanuel Todorov、Tom Erez、Yuval Tassa（2012），图 3，PDF 第 8 页；<a href="https://roboti.us/lab/papers/TodorovIROS12.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：四面板展示建模范围；是否适合具体控制任务仍需检查接触与动力学设定。
<!-- figure-ref-v6:end:rc-71-figure-3 -->

## 五、区分数值可用性、真实接触与策略迁移

MuJoCo 把物理模型编译、运行状态、结构化计算和多次评估组织成适合优化的软件。其价值包含系统设计与数值模型，不应只记成“一个速度快的仿真器”。作者同时指出缓存与内存访问的重要性，理论运算阶数不能完全预测机器上的性能。

**自构例子，未运行。**比较两个候选控制器让手指夹住小球。控制器甲需要大法向力却依赖摩擦极限，乙使用较低力和更稳定几何。如果仿真摩擦偏高，甲可能表现更好；换真实材料后排序可能反转。增加仿真吞吐量只能更快优化当前模型，不能自动纠正模型误差。

可做三项诊断：把步长减半观察结果是否改变；把摩擦和质量小幅扰动观察策略是否脆弱；固定轨迹比较不同求解器的接触残差与成本。这些是分析建议，不是原文已经完成的实机验证。

五个前置概念：**广义坐标**描述机构独立运动量；**Jacobian**连接关节变化与接触点运动；**冲量**描述有限时间内力的累积；**互补条件**表达接触作用与分离不能同时发生；**逆动力学**由期望运动推算所需作用力。

## 六、追问：在相同总时间内增加仿真调用次数，为什么仍需报告接触求解精度？

<details>
<summary>在相同总时间内增加仿真调用次数，为什么仍需报告接触求解精度？</summary>

**参考答案**：吞吐可以通过较粗的求解或不同接触设定改变，而外层优化使用的是这些近似结果。应固定模型并注明求解设置，分别看运行时间与约束残差或任务结果。计时优势不能自动升级为真实接触精度或实机迁移保证。

教学参照：[Underactuated Robotics: Planning and Control through Contact](https://underactuated.mit.edu/contact.html)。这里借用其分开连续运动、接触事件与数值实现的讲法。

</details>

## 七、把接触求解交给外层动作优化

- **模块组合**：[手部 CIO：把何时接触、在哪里施力一起优化](072-contact-implicit.md)。外层动作优化会依赖接触模型是否便于求解。
- **平行路线**：[接触隐式轨迹优化：不先规定哪只脚何时落地](075-contact-trajopt.md)。以显式互补约束组织接触轨迹，物理与数值承诺不同。

## 八、自测与参考答案

**1. 每秒能评估更多状态，为什么不代表学到的策略更可靠？**

它改善计算预算，却没有自动提高模型与真实系统的一致性。策略可能更充分地利用错误摩擦、接触或执行器模型，可靠性要靠模型辨识、扰动检验和实机证据验证。

**2. 凸接触求解器为什么不能称为精确解全部刚性库仑接触条件？**

因为它为了凸性放松了部分非凸接触关系，并引入正则与惩罚。求得该凸问题的全局最优，并不意味着原始物理接触问题得到精确解。

**3. [表 2](https://roboti.us/lab/papers/TodorovIROS12.pdf#page=7) 的多线程收益为什么不能直接用于预测单个控制周期延迟？**

[表 2](https://roboti.us/lab/papers/TodorovIROS12.pdf#page=7) 包含大量可并行的有限差分状态评估。实际控制周期可能包含串行状态推进、传感器和通信等待；必须按完整工作负载测量，而非用线程数直接相除。
