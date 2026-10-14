# 018｜操作空间：直接设计夹爪的动力学行为

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](017-uncertain-map.md) · [下一篇](019-adaptive-control.md)

**论文**：Oussama Khatib，*A Unified Approach for Motion and Force Control of Robot Manipulators: The Operational Space Formulation*，1987，IEEE Journal of Robotics and Automation 3(1):43–53。[原始论文](https://khatib.stanford.edu/publications/pdfs/Khatib_1987_RA.pdf) · [DOI](https://doi.org/10.1109/JRA.1987.1087068)。

### 先接住前作的问题

[微分运动控制](004-resolved-rate.md)联系关节速度与末端速度，力矩控制还必须经过整台机械臂的惯性。本篇由此建立任务惯量和动态一致分解。

## 一、问题设定：同样的末端力为何在不同构型产生不同加速度

同样在夹爪上推一下，机械臂伸直与弯曲时的加速度响应可能不同，因为所有关节的惯性和几何一起影响末端。只把“夹爪往右走”转换成关节角，还没有说明应该施加多大的力矩。

### 问题定义与对照方法

关节空间动力学写作 $M(q)\ddot q+h(q,\dot q)=\tau$，其中 $h$ 汇总速度相关项与重力。任务变量 $x=f(q)$ 满足 $\dot x=J\dot q$，加速度为 $\ddot x=J\ddot q+\dot J\dot q$。

速度运动学可以求关节速度，但忽略惯性；单纯用雅可比转置映射虚拟力可以形成任务反馈，却不一定给出希望的解耦加速度。操作空间试图回答的是：给定任务加速度和力，关节力矩如何产生相应动态效果？

为清楚推导，先考虑固定基座、充分驱动、无外部接触的机器人，并假设 $J$ 满行秩。接触力控需要另外引入约束方向与相互作用；浮动基座腿足也不能直接照搬这一最简单模型。

## 二、把关节惯性映成任务惯性，构造动态一致分解

### 方法：把关节惯性“投影”成末端惯性

施加关节力矩 $\tau=J^TF$，代入动力学：

$$\ddot x=JM^{-1}J^TF-JM^{-1}h+\dot J\dot q.$$

因此定义

$$\Lambda=(JM^{-1}J^T)^{-1},\qquad b_x=\Lambda(JM^{-1}h-\dot J\dot q),$$

就得到 $\Lambda\ddot x+b_x=F$。$\Lambda$ 描述任务空间里的等效惯性，$b_x$ 是相应偏置。它通常随姿态变化，并不等于一个固定夹爪质量。

若希望 $\ddot x=a_{cmd}$，可以取 $F=\Lambda a_{cmd}+b_x$，再用 $J^TF$ 变为关节力矩。令 $a_{cmd}=\ddot x_d+K_d(\dot x_d-\dot x)+K_p(x_d-x)$，在理想模型下可得到指定误差动力学。这是反馈线性化式的解释，不代表真实模型误差被消除了。

对于冗余机器人，定义惯性加权逆 $\bar J=M^{-1}J^T\Lambda$，以及 $N=I-\bar JJ$。总力矩可以写成

$$\tau=J^TF+N^T\tau_0.$$

这里关键等式是 $JM^{-1}N^T=0$，说明附加力矩在理想模型的瞬时任务加速度中不产生作用。普通运动学零空间满足 $JN=0$，但力矩经过 $M^{-1}$ 后才形成加速度，所以仅用运动学投影并不普遍足够。

惯性加权逆还可从一个约束问题推出。在给定构型下，要求 $J\dot q=v$，并使瞬时动能 $\tfrac12\dot q^\top M\dot q$ 最小。引入乘子 $\nu$，一阶条件给出 $M\dot q-J^\top\nu=0$，即 $\dot q=M^{-1}J^\top\nu$；代回任务约束得到 $\nu=(JM^{-1}J^\top)^{-1}v=\Lambda v$，所以 $\dot q=\bar Jv$。与欧氏最小范数伪逆相比，改变的是选择冗余运动的度量。

相应地，$N^\top=I-J^\top\Lambda JM^{-1}$，因此

$$JM^{-1}N^\top=JM^{-1}-(JM^{-1}J^\top)\Lambda JM^{-1}=0.$$

这个消去依赖真实 $M$、满行秩 $J$ 和匹配的坐标，不能仅凭矩阵名字带“零空间”就断言成立。接着核对后文同一原创系统 $J=[1\;1],M=\operatorname{diag}(1,4)$：$\bar J=(0.8,0.2)^\top$，取辅助原始力矩 $(1,0)$，经过 $N^\top$ 得 $(0.2,-0.8)$；实际关节加速度是 $(0.2,-0.2)$，任务加速度恰好为零。这是普通力矩 $(1,-1)$ 会泄漏而动态投影不会的正反两项检查。

原文第50页还展示，任务耗散矩阵仅半负定时，末端不动而内部仍能运动。由此可见，[Resolved-rate](004-resolved-rate.md)的几何冗余分解在力矩层还不够，本篇加入动力学一致性；[阻抗控制](013-impedance.md)可在该框架上指定端口行为，但内部耗散与接触稳定仍各有条件，不能只看末端误差曲线。

任务惯量与动态一致投影已经给出力矩分配依据。下面用两个关节完成一维任务的例子，检查内部作用是否真的不改变主要任务加速度。

## 三、实现任务力矩映射，用冗余一维任务验算

```text
输入：q、dq、任务参考及动力学模型
计算 x、J、Jdot*dq、M、h
通过线性方程求 A = J*M逆*J转置
解算任务惯性 Lambda = A逆（避免显式大矩阵求逆）
计算任务偏置 bx
acmd ← 参考加速度 + 速度与位置误差反馈
F ← Lambda*acmd + bx
若有冗余姿态任务：构造动态一致 N，加入 N转置*tau0
输出 tau = J转置*F + 附加力矩
```

这段教学伪代码明确省略了接触切换、力传感反馈和执行器饱和。不能因为论文题名含“力控制”，就把无接触加速度控制公式当成完整接触算法。

### 自构例子：两个关节共同完成一维任务

设 $J=[1\quad1]$，惯性 $M=\operatorname{diag}(1,4)$。则 $JM^{-1}J^T=1.25$，任务惯性为 $\Lambda=0.8$。期望单位任务加速度且忽略偏置，任务力为 0.8，关节力矩均为 0.8，对应关节加速度为 0.8 与 0.2，二者相加恰好为 1。

这说明“相同任务力映射到两个关节”不意味着关节加速度相同：重关节运动更慢，轻关节贡献更多。若把关节惯性都误当成 1，就会预测错误的末端响应。

再取普通几何零空间力矩 $(1,-1)$。任务加速度为 $1-1/4=0.75$，并不是零。它满足几何和为零，却不满足动态效果为零。这个反例直接解释为什么力矩级任务需要惯性加权的投影。

## 四、分别读解耦、受约束运动与COSMOS系统证据


<!-- figure-ref-v6:start:rc-18-figure-5-anchor -->
<span id="rc-18-figure-5"></span>
<!-- figure-ref-v6:end:rc-18-figure-5-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/018-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/018-evidence.png" width="1121" height="578" alt="Fig. 5：左侧叠加机构姿态，右侧画对应运动量随时间的变化；它们共同展示奇异构型附近的运动处理" loading="lazy"></a><figcaption>原论文结果图／表摘引：Oussama Khatib（1987），Fig. 5，PDF 第 10 页；<a href="https://khatib.stanford.edu/publications/pdfs/Khatib_1987_RA.pdf#page=10" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：左侧叠加机构姿态，右侧画对应运动量随时间的变化；它们共同展示奇异构型附近的运动处理。单条轨迹的平滑表现不能替代其他任务方向与惯性参数下的分析。

### 原文证据：解耦、内部运动和真实控制系统

控制图展示的是指定模型与构型下的响应；动态一致投影的代数成立，不自动覆盖模型偏差、饱和和采样延迟。

| 位置 | 原文内容 | 能支持什么 |
|---|---|---|
| 第 44–45 页，[Fig. 1](#rc-18-figure-1)–[图 2](#rc-18-figure-2) | 任务约束与运动、力方向选择 | 统一框架包含接触任务，不只是无约束位置跟踪 |
| 第 46 页，式（18）；第 49 页，第 VI 节，式（51）–（52） | 非冗余任务惯性及冗余推广、惯性加权逆 | 区分方阵逆与满行秩冗余公式 |
| 第 50 页，Lemma、式（55）、（57） | 动态一致的力矩分解及相关唯一性条件 | 主任务解耦具有动力学条件，不是任意几何投影都成立 |
| 第 50–51 页，[Fig. 4](#rc-18-figure-4) | 三自由度平面仿真中末端停住后仍有内部运动，加入零空间耗散 | 主要任务稳定并不等于所有关节运动自动稳定 |
| 第 51–52 页，[Fig. 5](#rc-18-figure-5) | 两自由度仿真经过奇异构型 | 展示特定奇异处理，不意味着任意奇异处仍有全维控制能力 |

<!-- figure-ref-v6:start:rc-18-figure-1 -->
<figure class="reading-evidence-figure" id="rc-18-figure-1"><a href="/robot-classic/assets/figure-refs-v6/018-fig-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/018-fig-1.png" width="701" height="460" alt="图1：接触约束下末端五、四、三个运动自由度的三种几何情形" loading="lazy"></a><figcaption>Oussama Khatib（1987），图 1，PDF 第 2 页；<a href="https://khatib.stanford.edu/publications/pdfs/Khatib_1987_RA.pdf#page=2" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/018-fig-1.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：依次对照(a)、(b)、(c)与接触面的关系；任务坐标应描述实际允许的运动，受约束方向还需要单独指定接触力。
<!-- figure-ref-v6:end:rc-18-figure-1 -->

<!-- figure-ref-v6:start:rc-18-figure-2 -->
<figure class="reading-evidence-figure" id="rc-18-figure-2"><a href="/robot-classic/assets/figure-refs-v6/018-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/018-fig-2.png" width="399" height="481" alt="图2：沿槽单自由度运动、约束力方向与两个坐标系" loading="lazy"></a><figcaption>Oussama Khatib（1987），图 2，PDF 第 3 页；<a href="https://khatib.stanford.edu/publications/pdfs/Khatib_1987_RA.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/018-fig-2.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：先看槽方向，再看力箭头和任务坐标系；位置与力的选择矩阵只有在约定坐标系后才有明确含义。
<!-- figure-ref-v6:end:rc-18-figure-2 -->

<!-- figure-ref-v6:start:rc-18-figure-4 -->
<figure class="reading-evidence-figure" id="rc-18-figure-4"><a href="/robot-classic/assets/figure-refs-v6/018-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/018-fig-4.png" width="861" height="417" alt="图4：冗余机械臂稳定化过程与最终构型两个面板" loading="lazy"></a><figcaption>Oussama Khatib（1987），图 4，PDF 第 9 页；<a href="https://khatib.stanford.edu/publications/pdfs/Khatib_1987_RA.pdf#page=9" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/018-fig-4.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：左图叠加不同姿态，右图给出稳定后的构型；末端任务完成后，零空间内的关节运动仍需要控制。
<!-- figure-ref-v6:end:rc-18-figure-4 -->

<!-- figure-ref-v6:start:rc-18-links-97 -->
本页定位：[图 5内嵌图](#rc-18-figure-5)。
<!-- figure-ref-v6:end:rc-18-links-97 -->

原文非冗余式（18）使用 $\Lambda=J^{-T}AJ^{-1}$，这里 $A$ 对应本文记号 $M$；冗余情形才使用 $(JA^{-1}J^T)^{-1}$。将两种表达互换时必须检查雅可比尺寸和秩。

| 系统或实验要素 | 原文报告及解释 |
|---|---|
| [Fig. 4](#rc-18-figure-4) 初始条件 | 三个关节初始角速度各为 0.5 rad/s，用于说明内部运动 |
| 实机 | COSMOS PUMA 560，腕部与手指传感器 |
| 计算平台 | NYMPH，四颗 National Semiconductor 32016 |
| 频率 | 伺服 200 Hz，动力学 100 Hz |
| 接触报告 | 冲击速度最高 4.0 in/s；方波力响应上升时间小于 0.02 s，稳态误差小于 12% |
| 统计范围 | 第 52 页 Summary 的作者报告，没有多任务重复次数与置信区间的统一对照 |

<!-- figure-ref-v6:start:rc-18-links-108 -->
本页定位：[图 4内嵌图](#rc-18-figure-4)。
<!-- figure-ref-v6:end:rc-18-links-108 -->

这些数值属于特定系统，不能与 1986 年势场论文的 PDP 双处理器、225 Hz 伺服混合成一个实验设置。力响应数字支持接触控制实现的能力，但不足以证明任何接触刚度、冲击速度或载荷都保持同样效果。

一个进一步的教学实验应在相同传感器和执行器限制下，对比不同构型的加速度响应、模型扰动和零空间作用泄漏。这样才可以分开任务坐标选择、动力学补偿及调参带来的影响。

## 五、检查模型失准、雅可比秩与执行器能力

主要代价是模型计算与条件数问题。接近奇异时，$JM^{-1}J^T$ 可能病态；正则化能改善数值，但会改变理想解耦与精确任务动力学。模型惯性错误也会让 $JM^{-1}N^T=0$ 在真实系统中不再精确成立。

“零空间不影响主任务”还要限定时间尺度。瞬时加速度不被附加力矩改变，并不代表长期内部姿态变化没有任何影响；姿态改变会更新未来的雅可比、惯性和可操作性。控制器需要每个周期重新计算。

姿态任务采用旋转坐标时，还需区分欧拉角导数与角速度。把六维位置姿态变量随意拼接，却仍使用不匹配的雅可比，会造成量纲和力矩含义错误。公式一致性是使用这一框架的首要条件。

五个前置概念：**惯性矩阵**联系关节力矩与加速度；**任务雅可比**联系关节与任务速度；**偏置项**包含重力和速度效应；**加权广义逆**按照动力学度量选择解；**动态一致性**要求附加力矩不改变主要任务瞬时加速度。

## 六、追问：所有关节都匀速时，末端加速度为什么仍可能不为零？

<details>
<summary>所有关节都匀速时，末端加速度为什么仍可能不为零？</summary>

**参考答案**：对 $\dot x=J(q)\dot q$ 求时间导数，有 $\ddot x=J\ddot q+\dot J\dot q$。关节匀速只使第一项为零，构型变化仍会改变雅可比，第二项可以非零。单根连杆匀速转动时端点沿圆走，就是可直观看到的例子。按[Modern Robotics任务空间动力学](https://modernrobotics.northwestern.edu/nu-gm-book-resource/8-6-dynamics-in-the-task-space/)的求导顺序，任务控制不能只保留关节加速度映射而漏掉这项。

</details>

## 七、继续组织多个任务与全身约束

- **直接继承**：[全身任务层级：够不到目标时，先决定什么不能牺牲](050-task-priority.md)。在动态一致分解之上组织多个优先任务，新增层级和可行性处理。
- **模块组合**：[质心动力学与全身运动学：怎样少算方程而不丢掉身体](080-wholebody-qp.md)。把任务动力学与全身接触、执行器限制放入优化控制。

## 八、自测与参考答案

**1．为什么 $J^TF$ 不是操作空间控制的全部？**

它只把力映射到关节。要获得指定加速度，还要考虑等效惯性和偏置。同样的任务力在不同构型可能产生不同加速度。

**2．几何零空间力矩为何可能影响末端？**

因为力矩先经过惯性逆映射成关节加速度，再经雅可比进入任务。应消除的是 $JM^{-1}\tau_0$，而不是简单要求 $J\tau_0=0$。

**3．动态一致性是否意味着可以无限增大姿态控制力矩？**

不是。投影关系不包含执行器上限、模型误差与离散采样。当力矩饱和改变实际分配后，原来的解耦关系可能失效，因此必须在完整控制设计中考虑限制。
