# 059｜CHOMP：让整条轨迹一起绕开障碍

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇：ROS](058-ros.md) · [下一篇：ORB](060-orb.md)

论文：Nathan Ratliff、Matt Zucker、J. Andrew Bagnell、Siddhartha Srinivasa，*CHOMP: Gradient Optimization Techniques for Efficient Motion Planning*，ICRA 2009，489–494。[作者实验室预印稿](https://personalrobotics-files.cs.washington.edu/ratliff2009chomp.pdf)；[CMU 发表记录](https://publications.ri.cmu.edu/chomp-gradient-optimization-techniques-for-efficient-motion-planning)。本轮从[作者实验室当前出版页](https://personalrobotics.cs.washington.edu/publications/ratliff2009chomp/)找到迁移后的八页原稿，补核第II-A/B节协变更新、第II-D/F节工作空间泛函与限位、第III节机械臂实验和第IV节LittleDog设置。关键实验数字已对照正文；未复现代码或逐像素复核所有曲线。图节定位采用八页预印稿，不能机械换成六页会议版页码。

### 先接住前作的问题

[RRT](040-rrt.md)擅长找通道，粗糙路径往往还需平滑。CHOMP直接在轨迹度量下联合改进平滑与避障。

## 一、问题设定：碰撞路点的修正怎样沿整条轨迹平滑传播

一条机械臂轨迹穿过桌面。如果只把碰撞的那个路点往外推，轨迹可能形成尖角，邻近路点还留在障碍里。CHOMP 让这次局部碰撞的影响沿轨迹平滑传播，整段运动一起调整。

### 背景与问题定义

RRT、PRM 擅长探索构型空间的连通性，找到可行路径后通常还要做 shortcut 等处理去掉多余转折。CHOMP 将轨迹质量放进优化目标，希望在不少日常任务中把寻找与平滑统一起来。

输入是起终点关节构型、机器人正运动学、障碍几何和初始轨迹。轨迹 $\xi$ 堆叠内部路点 $q_1,\ldots,q_n$，起终点固定；输出是优化后的路点序列。这不是强化学习：没有通过环境回报训练一个跨任务策略，优化是在给定任务与模型上直接进行。

原文关心平滑、碰撞、关节限位，也在四足例子中加入可达性和 ZMP 相关惩罚。关节速度或加速度平方较小，不能自动证明电机力矩满足限制；软惩罚也不能替代所有动力学和接触约束。

## 二、选择轨迹度量与距离场，推导协变更新

### 第一种几何：怎样测量“轨迹改动很小”

平滑先验由有限差分构成：

$$f_{\mathrm{prior}}(\xi)=\frac12\sum_{d=1}^D w_d\|K_d\xi+e_d\|^2
=\frac12\xi^TA\xi+b^T\xi+c.$$

$K_d$ 计算离散的第 $d$ 阶导数，$e_d$ 包含固定端点的贡献，$w_d$ 控制不同导数的重要性。$A$ 描述沿时间相邻路点之间的耦合。

总目标为 $U=f_{\mathrm{prior}}+f_{\mathrm{obs}}$。在当前轨迹附近把目标一阶展开，再惩罚改动的 $A$ 范数：

$$\delta^*=\arg\min_\delta\left[g^T\delta+\frac\lambda2\delta^TA\delta\right]
=-\frac1\lambda A^{-1}g.$$

其中 $g=\nabla U$，$\lambda$ 控制步长。实现时可以解 $A\delta=-g/\lambda$，不必显式求逆。

普通欧氏梯度认为每个路点的改动独立计价；这里认为制造急剧变化的改动更昂贵。$A^{-1}$ 因而把某处受到的推力扩散到整段轨迹。协变指这种更新尽量反映轨迹本身的几何，而不是任意离散参数的尺度；原文也把表示无关的讨论限定在小步长和细离散的极限，不是任意离散实现完全相同。

### 第二种几何：障碍距离应该在工作空间量

给定机器人身体点 $u$，正运动学 $x(q,u)$ 计算它在空间中的位置。预计算有符号距离场 $d(x)$：障碍内为负、边界为零、外部为正。这样即便初始轨迹穿进障碍，仍有可用于逃离的梯度。

第 II-C 节使用的平滑势可写为

$$c(x)=\begin{cases}
-d(x)+\epsilon/2,&d(x)<0,\\
(d(x)-\epsilon)^2/(2\epsilon),&0\le d(x)\le\epsilon,\\
0,&d(x)>\epsilon.
\end{cases}$$

$\epsilon>0$ 是安全影响距离。距离场由地图给定，不负责发现未观测障碍；球体或胶囊近似机器人时，还要考虑其半径，而不是只保证骨架中心不碰撞。

### 为什么按弧长积分

若障碍代价只是 $\int c(x(t))dt$，同一条几何路径可以通过加速穿过危险区来降低代价。作者改为沿身体点在工作空间走过的弧长累计：

$$f_{\mathrm{obs}}[q]=\int_0^1\int_B c(x(q(t),u))\|\dot x(q(t),u)\|\,du\,dt.$$

对同一几何曲线只改变时间参数，不会凭空降低这一项。平滑先验仍与时间导数有关，所以整个目标并非全部与时间安排无关。

原稿式（4）的泛函梯度包含

$$\int_B J^T\|\dot x\|\big[(I-\hat v\hat v^T)\nabla c-c\kappa\big]du,$$

其中 $J=\partial x/\partial q$，$\hat v=\dot x/\|\dot x\|$，$\kappa$ 为曲率向量。法向投影避免只沿路径方向挪动参数点，曲率项反映改变路径形状带来的长度变化，$J^T$ 将工作空间变化映射回关节。零速度附近的归一化需要数值处理，不能直接除以零。

### 限位修复也要保持平滑

硬把越界路点截到关节上下限可能形成平台或折角。作者先构造消除越界的修正量，再经 $A^{-1}$ 平滑扩散，缩放以消掉最大违反，必要时重复。这是近似投影步骤，不是一次解决全部碰撞、动力学和限位的联合可行性证明。

最后的明确失败出口是教学实现的必要区分：优化停止不等于规划成功。用于实机前还需要按实际机器人几何与轨迹插值方式验证。

### 协变更新如何把一个碰撞梯度扩散成整段弯曲

轨迹离散向量记为 $q$，平滑度量矩阵为正定 $A$，总代价梯度为 $g$。局部步长通过最小化 $g^T\delta q+(1/2\eta)\delta q^TA\delta q$得到 $\delta q=-\eta A^{-1}g$，$\eta>0$是步长。这不是对每个时间点独立沿欧氏梯度走，而是按轨迹平滑结构衡量改动大小。

**教学例**取 $A=\begin{bmatrix}2&-1\\-1&2\end{bmatrix}$、$g=(1,0)^T$、$\eta=1$，更新为 $(-2/3,-1/3)^T$。只有第一个路点直接收到梯度，第二个仍随它一起移动，避免形成尖折。若边界没有固定而 $A$有平移零空间，必须处理其零模态，不能盲目求逆。

与[RRT](040-rrt.md)是局部优化与采样搜索的平行路线；后作[STOMP](061-stomp.md)用随机扰动估计改进方向。路径能否离开错误同伦类，以及离散路点间是否碰撞，都不是平滑更新自动保证的。[原稿第II-A/B节](https://personalrobotics-files.cs.washington.edu/ratliff2009chomp.pdf)给出局部正则化目标和逆度量更新；实验的初始轨迹和碰撞模型应与速度数字一起对照。

协变更新把一处碰撞的梯度传播到邻近轨迹点。下面直接手算这个传播，检查平滑度量怎样改变更新，再读机械臂和摆腿结果。

## 三、手算一次更新，检查局部梯度的传播

```text
输入：起终点、初始离散轨迹、机器人几何、障碍模型
建立有符号距离场；构建平滑矩阵 A 与边界项
循环直到预算或停止条件：
    正运动学计算轨迹上身体采样点及雅可比
    查询距离、空间梯度，计算弧长障碍梯度
    加上速度/加速度等先验梯度
    解 A × 更新量 = -总梯度 / 步长参数
    更新内部路点，保持端点固定
    若越过关节限位，用平滑投影修复
    检查目标、碰撞及其他任务条件
若满足所需可行性：返回轨迹
否则：返回失败状态，或更换初值后重新优化
```

### 手算一次协变更新

以下为教学构造。三个内部路点只考虑一个方向，取

$$A=\begin{bmatrix}2&-1&0\\-1&2&-1\\0&-1&2\end{bmatrix},\qquad
g=\begin{bmatrix}0\\1\\0\end{bmatrix}.$$

欧氏下降只移动中间点；解 $Av=g$ 得 $v=(0.5,1,0.5)^T$。协变下降 $\delta=-\eta v$ 会让相邻两个点各跟随一半，中间仍移动最多。这直观解释了“局部碰撞推动整段平滑变化”，也说明若步长过大，相邻点可能被推到另一障碍，所以仍要检查更新后可行性。

五个前置概念：**构型空间**用关节变量描述机器人姿态；**距离场**提供每个空间位置到障碍的带符号距离；**泛函**把整条函数轨迹映射到代价；**度量**定义轨迹变化的大小；**非凸优化**允许多个局部极小值且通常依赖初值。

## 四、读机械臂与摆腿实验，分开可行性和质量

<!-- figure-ref-v6:start:rc-59-figure-5-anchor -->
<span id="rc-59-figure-5"></span>
<!-- figure-ref-v6:end:rc-59-figure-5-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/059-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/059-evidence.png" width="735" height="269" alt="Fig. 5：左图按迭代看目标下降，右图比较直线初始化（绿）与双向 RRT 初始化（红）" loading="lazy"></a><figcaption>原论文结果图／表摘引：Nathan Ratliff、Matt Zucker、J. Andrew Bagnell、Siddhartha Srinivasa（2009），Fig. 5，PDF 第 6 页；<a href="https://personalrobotics-files.cs.washington.edu/ratliff2009chomp.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：左图按迭代看目标下降，右图比较直线初始化（绿）与双向 RRT 初始化（红）。初值改变可能进入不同局部极小；log-objective 差异不能直接解释为相同比例的路径长度改善。

### 实验设置

| 项目 | 原文设定与作用 |
|---|---|
| 机械臂 | Barrett WAM 七自由度平台，实验规划前六个自由度 |
| 查询集合 | 同一家庭操作场景选 15 个构型，两两组成 105 个规划问题 |
| 几何离散 | 连杆按直线近似，每段 10 点；障碍场 50×50×50 体素 |
| 预算 | 每问题 400 次迭代约 12 s，主要优化常在前 100 次约 3 s 完成；距离场预处理平均约 0.8 s |
| 对比 | 直线初值与双向 RRT 初值；协变更新与 $A=I$ 欧氏更新 |
| 四足 | LittleDog；既有落脚规划提供落点，ZMP preview 提供初始躯干轨迹，CHOMP 优化执行轨迹 |
| 四足附加信息 | 预先三角网格地形、5 mm 距离场、向上逃离的领域先验、可达性和支撑多边形惩罚 |
| 重复与统计 | 报告问题数与成功数；未给每个问题多种子置信区间或完整全套等算力排行榜 |

机械臂场景的薄障碍还有专用启发式：从基座沿手臂检查，首次碰撞之后的身体点梯度不再累计，避免穿过薄板两侧的梯度互相抵消。它是实际结果的一部分，不能只实现最简距离梯度就期待复现全部成功数。

### 五组证据

**[图 3](#rc-59-figure-3)：泛函梯度与离散梯度的关系。** 示意二维轨迹说明，离散足够细时两者趋近，并展示轨迹方向的几何处理。它不是对任意分辨率都等价的数值保证。

<!-- figure-ref-v6:start:rc-59-figure-3 -->
<figure class="reading-evidence-figure" id="rc-59-figure-3"><a href="/robot-classic/assets/figure-refs-v6/059-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/059-fig-3.png" width="640" height="199" alt="原论文图3：CHOMP障碍代价场中的路径与一维代价梯度比较" loading="lazy"></a><figcaption>Nathan Ratliff、Matt Zucker、J. Andrew Bagnell、Siddhartha Srinivasa（2009），图 3，PDF 第 4 页；<a href="https://personalrobotics-files.cs.washington.edu/ratliff2009chomp.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：左图解释避障代价的空间结构，右图对照其梯度关系。
<!-- figure-ref-v6:end:rc-59-figure-3 -->

**[图 4](#rc-59-figure-4)：平滑限位投影。** 关节曲线在接近限位时保持平滑，支持相对逐点截断更合理的修正方式；没有单独报告力矩峰值或硬件磨损改善。

<!-- figure-ref-v6:start:rc-59-figure-4 -->
<figure class="reading-evidence-figure" id="rc-59-figure-4"><a href="/robot-classic/assets/figure-refs-v6/059-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/059-fig-4.png" width="1293" height="187" alt="原论文图4：CHOMP优化后的六个关节轨迹及关节限位" loading="lazy"></a><figcaption>Nathan Ratliff、Matt Zucker、J. Andrew Bagnell、Siddhartha Srinivasa（2009），图 4，PDF 第 6 页；<a href="https://personalrobotics-files.cs.washington.edu/ratliff2009chomp.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：每个面板对应一个关节，轨迹与红色边界的关系用于检查限位约束。
<!-- figure-ref-v6:end:rc-59-figure-4 -->

**第 III-B 节：99/105 个问题找到无碰撞轨迹。** 自行计算为约 94.3%，分母是同场景构型对，不是跨家庭随机任务，也不是 105 次独立真实抓取成功。剩余六个问题提醒我们，这不是完备规划器。

**[图 5](#rc-59-figure-5)：初值优劣和梯度度量。** 在排除未解问题后，直线初值的最终 log-objective 平均约低 0.5，原文用约 17–24 的变化范围解释。它不是“路径长度降低 3%”，也不能忽略被排除的失败例。欧氏梯度在这些实验中很差，支持平滑度量的重要性，不等于证明所有欧氏优化器都无效。

**[图 7](#rc-59-figure-7)：LittleDog 75 步优化的示例。** 初始膝/胫轨迹碰撞，之后躯干前倾增加间隙并生成平滑摆腿。实际步时预先启发式选为约 0.6–1.2 s，轨迹按 100 Hz 离散；最坏优化时间约为执行时间 1.5 倍，因此先生成再执行。这不是每 10 ms 在线完成整个规划的 MPC 演示。

<!-- figure-ref-v6:start:rc-59-figure-7 -->
<figure class="reading-evidence-figure" id="rc-59-figure-7"><a href="/robot-classic/assets/figure-refs-v6/059-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/059-fig-7.png" width="1293" height="239" alt="原论文图7：四足机器人实物运动及相应规划姿态序列" loading="lazy"></a><figcaption>Nathan Ratliff、Matt Zucker、J. Andrew Bagnell、Siddhartha Srinivasa（2009），图 7，PDF 第 8 页；<a href="https://personalrobotics-files.cs.washington.edu/ratliff2009chomp.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：左右图把实物执行与规划形态联系起来，但不能从单例推出普遍成功率。
<!-- figure-ref-v6:end:rc-59-figure-7 -->

## 五、保留非凸性、离散碰撞与初值敏感

障碍项非凸，初始化决定可能到达的局部解。原文也讨论 Hamiltonian Monte Carlo 的随机化变体，结论仍承认实际有限时间内会被局部极小值困住；不能借其随机性直接声称实用预算下的完备性。

固定离散和预定时长限制可搜索轨迹，身体点与体素近似可能漏掉薄障碍或插值段碰撞。本文结果还包含连杆碰撞启发式和四足领域先验，所以“纯通用目标一套参数解决所有机器人”超出了证据。

加速度平滑并非完整动力学约束；LittleDog 的支撑和落脚结构由其他组件参与提供。它改善的是系统中的轨迹模块，整机比赛表现不能全部归因于 CHOMP，作者的归因陈述也不是严格模块消融。

## 六、追问：时间重参数化后沿弧长的障碍代价不变，为什么离散实现仍可能改变？

<details>
<summary>时间重参数化后沿弧长的障碍代价不变，为什么离散实现仍可能改变？</summary>

**参考答案**：连续弧长积分对同一几何路径的不同走法具有对应的不变性，但离散求和依赖采样位置与权重。若重参数化后仍用旧权重，密集区域可能被重复强调。应区分连续目标的性质与数值求积误差，再检查轨迹度量中的更新；不能用一句“参数化无关”跳过离散实现。

</details>

## 七、改用随机试探或逐次凸化

- **直接继承**：[STOMP：用平滑随机试探优化机器人轨迹](061-stomp.md)。用结构化随机试探降低对代价梯度的要求。
- **平行路线**：[TrajOpt：用局部凸问题修复整条碰撞轨迹](073-trajopt.md)。采用逐次凸化和连续碰撞处理组织轨迹优化。

## 八、自测与参考答案

### 1．为什么不直接沿 $-\nabla U$ 改每个路点？

**答：** 那样把参数空间中的欧氏距离当作改动成本，局部大梯度容易制造不平滑变化。$A^{-1}$ 将梯度转换为在平滑度量下的下降方向，把一处修正传播给邻近路点。目标没有因此变成凸的，但更新更符合轨迹的结构。

### 2．按弧长计算障碍代价，是不是意味着 CHOMP 不关心速度？

**答：** 只意味着同一几何路径不能靠加速穿过危险区域降低该障碍项。总目标仍有速度、加速度等先验，四足实现还预先选定步时。必须区分某一个代价项的重参数化性质与整个运动优化问题。

### 3．优化收敛、总代价下降、输出无碰撞，是同一件事吗？

**答：** 不是。收敛可能停在仍有碰撞的局部极小值；总代价下降可能来自平滑项改善而障碍仍存在；采样点无碰撞也可能遗漏插值段或真实身体几何。规划成功需要额外检查所要求的可行性，不能只看优化器停止或曲线下降。
