# 013｜阻抗控制：接触任务需要控制一种关系

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](012-manipulability.md) · [下一篇](014-potential-field.md)

**论文**：Neville Hogan，*Impedance Control: An Approach to Manipulation—Part I: Theory*，1985，JDSMC 107(1):1–7。[原始论文全文](https://bpb-us-e1.wpmucdn.com/sites.mit.edu/dist/5/1384/files/2025/02/1985-impedance-control-an-approach-to-manipulation-part-I-theory.pdf) · [DOI](https://doi.org/10.1115/1.3140702)。

### 先接住前作的问题

[混合力位控制](007-hybrid-force.md)按接触方向分工，本篇从另一条路线追问机器人与环境应该呈现怎样的力—运动关系。

## 一、问题设定：接触时怎样设计偏离参考运动的力响应

推一扇门时，“手必须到达某个精确位置”可能与门的约束冲突；“一直施加固定的力”又不足以保证停在合适位置。更好的描述是：手偏离参考位置时产生多大恢复力，运动多快时产生多大阻尼。

### 为什么位置与力不能任意同时指定

在一维接触端口，瞬时功率为 $P=Fv$。若机器人试图固定速度，环境必须给出相应作用力；若机器人给定作用力，环境的质量、约束与初始状态会参与决定运动。同一自由度上，双方不能互不相干地指定所有变量。

混合位置／力控制适合按约束方向划分任务，但切向无摩擦、法向不动的理想模型并不覆盖所有操作。推重物、打磨和钻孔都可能有显著功交换，动态响应因而成为问题本身。

阻抗接受运动作为输入并产生力响应；导纳接受力并产生运动响应。在线性、可逆且条件适当时，可以互相转换表达；一般非线性系统可能没有单值逆。例如静摩擦允许一段不同外力对应同一个零速度，仅凭零速度无法唯一推回外力。

原文“环境作为导纳、机器人应呈现阻抗”的主张基于惯性及运动约束类环境的分析。它不能被简化成“现代导纳控制都不正确”：软件控制接口、物理端口行为和完整闭环因果性必须分开讨论。

## 二、把机器人与环境的交互写成阻抗关系

### 方法的两层含义

第一层是指定交互行为。用教学中的线性平移模型表示，令 $e=x-x_d$，外力 $F_{ext}$ 指环境作用于机器人，则希望

$$M_d\ddot e+D_d\dot e+K_de=F_{ext}.$$

$M_d$ 是期望惯性，$D_d$ 是阻尼，$K_d$ 是刚度。外力撤去后，弹性项把机器人拉回参考，阻尼消耗运动能量，惯性决定加速度响应。刚度小通常允许更大偏移，但不能单靠“软”保证所有接触稳定。

第二层是如何用真实机器人实现这种端口行为。一个理想化、重力已补偿的力矩机器人可以先从

$$F_c=K(x_d-x)+D(\dot x_d-\dot x),\qquad\tau=J^TF_c+g(q)$$

入手。这里 $F_c$ 为机器人控制产生的恢复作用，不是前式定义的外力。该简单控制器并不会任意实现指定 $M_d$：真实惯性仍然存在。完整惯性整形需要动力学处理，不能把两式直接画等号。

原论文更一般的处理是将虚拟运动源与阻抗关系分开，并通过物理网络连接；在指定条件下，多个非线性阻抗分量也可按作用力相加。这与“任意非线性函数都满足线性叠加原理”是完全不同的说法。

一个能量计算说明阻尼在理想模型里究竟保证什么。取固定参考、常数对称正定 $M_d,K_d$，以及半正定 $D_d$，令储能

$$V=\tfrac12\dot e^\top M_d\dot e+\tfrac12e^\top K_de.$$

把期望阻抗方程代入导数，惯性与弹簧交叉项相消，得到

$$\dot V=\dot e^\top F_{ext}-\dot e^\top D_d\dot e.$$

第一项是环境输入的机械功率，第二项是耗散。这是该线性教学端口被动性的直接证明，不能跳成“任何实现接任何环境都稳定”：真实控制中的延迟、采样、饱和和时变参考可能改变功率账目。尤其是移动参考会主动做功，此时储能导数需要包含参考运动带来的项。

原创一维例：$M_d=1,D_d=2,K_d=4$，施加恒定外力2后，静态偏移为0.5；撤力后的特征根为 $-1\pm i\sqrt3$，所以会衰减振荡。把 $D_d$ 改成4得到临界阻尼，却不改变0.5的静态偏移。这区分了刚度决定静态关系、阻尼决定耗散、惯性参与瞬态三件事。

原文第6页的阻抗相加依据是多个分量承受同一端口运动、力响应相加；不是把任意两个控制器的软件输出相加就保留各自稳定性。[混合力位控制](007-hybrid-force.md)用任务方向分工，是平行设计；[操作空间](018-operational-space.md)可帮助在真实惯量下实现期望端口行为，是模块组合。两者都需要明确硬件接口与力的正方向。

质量、阻尼和刚度描述的是动态关系，控制实现仍要把它变成可执行作用。墙面位置误差例子将先检查恢复力如何形成，再区分静态柔顺与动态稳定。

## 三、落实质量阻尼刚度关系，用墙面误差检验

```text
教学特例：平移任务、力矩接口、重力补偿
输入：参考位置 xd、参考速度 vd、正定 K 与 D
循环：
    读取 q、dq
    x、J ← 正运动学及雅可比
    v ← J * dq
    恢复作用 Fc ← K*(xd-x) + D*(vd-v)
    tau ← J转置*Fc + 重力补偿(q)
    在力矩和速度允许范围内执行 tau
输出：机器人对外部位移与速度的闭环力响应
```

伪代码不是优化器，没有训练损失。它改的是闭环机制；改善指标应另行测量，例如接触峰值力、扰动后振荡和位置偏移。把“误差不为零”一律当失败，会误判阻抗控制有意允许的柔顺行为。

### 自构例子：墙的位置估计偏了一厘米

设夹爪沿法向推进，参考位置比实际墙面深入 $0.01$ 米。忽略瞬态并把墙看成刚性约束，采用 $K=1000$ 牛／米的恢复关系，会产生约 $10$ 牛静态作用；若 $K=100$，则约 $1$ 牛。这里算的是教学模型，不是论文实验数值。

两者都没有达到墙后的参考位置，但低刚度容忍同样几何误差时施力更小。若任务需要至少 $5$ 牛才能打磨，低刚度又可能不足。因此“刚度越小越安全、越好”的说法不成立，要结合任务需求设计参考与刚度。

增加阻尼会影响接触过渡和振荡，但静止时阻尼力为零，不能替代所需静态支撑。进一步，若参考点高速移动，即使固定刚度为正，参考源也可能持续向系统注入能量；被动弹簧的直觉不能未经检查地推广到任意时变轨迹。

## 四、读Part I理论证据，区分动态关系与实机保证

<!-- figure-ref-v6:start:rc-13-figure-7-anchor -->
<span id="rc-13-figure-7"></span>
<!-- figure-ref-v6:end:rc-13-figure-7-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/013-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/013-evidence.png" width="780" height="554" alt="Fig. 7：多个阻抗元件共享同一运动端口，各分支的作用力相加" loading="lazy"></a><figcaption>原论文方法图摘引：Neville Hogan（1985），Fig. 7，PDF 第 6 页；<a href="https://bpb-us-e1.wpmucdn.com/sites.mit.edu/dist/5/1384/files/2025/02/1985-impedance-control-an-approach-to-manipulation-part-I-theory.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：多个阻抗元件共享同一运动端口，各分支的作用力相加。这张连接图说明可组合的是端口关系，并不保证互相冲突的多个任务目标都能同时精确达到。

### 原文的五处证据

这里的证据属于 Part I 的理论与等效网络。Part II、III 的实施和应用结果不能移作本篇实验；质量—弹簧—阻尼方程是用于理解端口关系的特例。

**第 1–2 页，引言。** 按交互功区分任务；单独控制运动量不足以覆盖动态操作；不能据此推出：任一特定机器人性能提升。

**第 2–3 页，Causality，[图 2](#rc-13-figure-2)、3。** 非可逆关系与机构例子；阻抗、导纳区别有物理含义；不能据此推出：所有系统都只能使用一种软件接口。

<!-- figure-ref-v6:start:rc-13-figure-2 -->
<figure class="reading-evidence-figure" id="rc-13-figure-2"><a href="/robot-classic/assets/figure-refs-v6/013-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/013-fig-2.png" width="463" height="573" alt="原论文图2：二连杆机构及对应运动学变换的键合图" loading="lazy"></a><figcaption>Neville Hogan（1985），图 2，PDF 第 3 页；<a href="https://bpb-us-e1.wpmucdn.com/sites.mit.edu/dist/5/1384/files/2025/02/1985-impedance-control-an-approach-to-manipulation-part-I-theory.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：从端点位移到关节运动不总是单值可逆，不能把此端口随意当成受控力源。
<!-- figure-ref-v6:end:rc-13-figure-2 -->

<!-- figure-ref-v6:start:rc-13-figure-3 -->
<figure class="reading-evidence-figure" id="rc-13-figure-3"><a href="/robot-classic/assets/figure-refs-v6/013-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/013-fig-3.png" width="515" height="639" alt="原论文图3：三连杆机构及对应运动学变换的键合图" loading="lazy"></a><figcaption>Neville Hogan（1985），图 3，PDF 第 3 页；<a href="https://bpb-us-e1.wpmucdn.com/sites.mit.edu/dist/5/1384/files/2025/02/1985-impedance-control-an-approach-to-manipulation-part-I-theory.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：增加内部自由度改变了端口关系；上下图应作为同一机构的几何与因果表示一起读。
<!-- figure-ref-v6:end:rc-13-figure-3 -->

**第 4 页，[图 4](#rc-13-figure-4)。** 纯力源与阻抗结构；需要力—位移关系来支持定位；不能据此推出：已证明采样闭环稳定。

<!-- figure-ref-v6:start:rc-13-figure-4 -->
<figure class="reading-evidence-figure" id="rc-13-figure-4"><a href="/robot-classic/assets/figure-refs-v6/013-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/013-fig-4.png" width="434" height="599" alt="原论文图4：纯力控制与阻抗控制的两种键合图连接" loading="lazy"></a><figcaption>Neville Hogan（1985），图 4，PDF 第 4 页；<a href="https://bpb-us-e1.wpmucdn.com/sites.mit.edu/dist/5/1384/files/2025/02/1985-impedance-control-an-approach-to-manipulation-part-I-theory.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：下方面板加入阻抗关系，比较的是端口结构，而不是两组实验精度。
<!-- figure-ref-v6:end:rc-13-figure-4 -->

**第 5 页，式 (8)–(13)。** 定义虚拟位置与网络；在前提下分解运动命令及端口关系；不能据此推出：虚拟位置必须是可达实物位置。

**第 6 页，[图 7](#rc-13-figure-7)。** 多阻抗分量连接；同端口力响应可组合；不能据此推出：各任务目标必定同时满足。

这是一篇理论论文。数据集、训练步数、随机种子不适用；原文没有现代基准对比表。验证时应逐条检查其假设，包括端口描述、平衡位置的可定义性与网络连接方式。某些推广是否适用于你的硬件，不能由文章题名直接推定。

## 五、检查物理可实现性、采样与环境耦合

这里有一个值得保留的理论边界：力可以相加，不代表愿望可以相加。两个弹簧分别拉向相反目标，最后可能停在中间；数学上组合良好，任务层面却谁也没有完成。高层仍要处理优先级、接触状态和目标可行性。

实际控制中的高延迟、速度估计噪声、力矩饱和和传动摩擦，会改变设计阻抗与实际阻抗之间的关系。上述实现风险是工程分析，不是 Part I 已完成的系统评测。论文自身把实施与应用留给后续两部分，阅读时应保持这个证据边界。

五个前置概念：**功率共轭变量**相乘得到交换功率；**阻抗**描述运动到力的响应；**导纳**描述力到运动的响应；**虚拟轨迹**是用于定义响应的参考源；**被动性**是系统不能无源持续产生能量的性质。

## 六、追问：期望刚度翻倍而阻尼不变，目标自由响应的阻尼比怎样变化？

<details>
<summary>期望刚度翻倍而阻尼不变，目标自由响应的阻尼比怎样变化？</summary>

**参考答案**：对标量教学模型 $M\ddot e+D\dot e+Ke=0$，取正的 $M,D,K$，自然频率为 $\sqrt{K/M}$，阻尼比为 $D/(2\sqrt{MK})$。刚度翻倍会让自然频率乘 $\sqrt2$，阻尼比除以 $\sqrt2$；因此“更硬”不能单独解释为“更不振荡”。这是[Modern Robotics二阶误差动力学](https://modernrobotics.northwestern.edu/nu-gm-book-resource/11-2-2-2-second-order-error-dynamics/)在期望阻抗上的教学应用，真实接触还受离散采样和环境耦合影响。

</details>

## 七、把期望交互关系放进动力学实现

- **模块组合**：[操作空间：直接设计夹爪的动力学行为](018-operational-space.md)。借助操作空间动力学实现任务端口行为，同时检查模型精度和执行器能力。
- **模块组合**：[质心动力学与全身运动学：怎样少算方程而不丢掉身体](080-wholebody-qp.md)。在全身约束下组织力与运动目标，仍需另行处理接触可行性。

## 八、自测与参考答案

**1．机器人受外力后偏离参考，是否说明阻抗控制没有跟踪好？**

不一定。稳态偏移满足 $K_de=F_{ext}$，是指定柔顺关系的结果。应比较实际力—位移关系与目标关系，而不是只看位置误差。

**2．为什么提高阻尼不能消除静态受力偏移？**

静止时速度为零，阻尼项消失。需要改变刚度、参考位置或额外力目标，才能改变静态平衡。增加阻尼主要改变过渡过程。

**3．两个独立稳定的阻抗任务相加，是否必然同时达到两个目标？**

不必然。稳定性讨论系统运动，目标达成讨论平衡是否符合任务。冲突参考会产生折中平衡；若参考随时间改变，还要重新分析能量与稳定性，不能只凭各模块的名称下结论。
