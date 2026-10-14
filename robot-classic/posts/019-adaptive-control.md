# 019｜Slotine–Li 自适应控制：一边跟踪，一边修正动力学参数

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](018-operational-space.md) · [下一篇](020-tsai-calibration.md)

**论文**：Jean-Jacques E. Slotine、Weiping Li，*On the Adaptive Control of Robot Manipulators*，IJRR，1987，6(3):49–59。[出版入口](https://doi.org/10.1177/027836498700600303) · [作者书目](https://www.mit.edu/~nsl/)。

补充来源：[期刊原稿的公开文本副本](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。

### 先接住前作的问题

[逆动力学](005-newton-euler.md)能高效计算给定参数的力矩，未知负载却会让这个模型失准。本篇把参数更新与跟踪稳定性共同设计；与[操作空间](018-operational-space.md)控制可作模块组合，但“换到任务坐标”不会自动解决参数可辨识性。

## 一、问题设定：未知负载怎样在运动中修正而不破坏跟踪稳定性

只加大反馈增益可能提高跟踪，却也可能放大噪声和力矩需求。作者利用刚体动力学对一组物理参数呈线性的性质，在跟踪过程中更新参数估计。

### 问题设定与假设

刚性机械臂动力学写作 $M(q)\ddot q+C(q,\dot q)\dot q+g(q)=\tau$。未知量包括负载质量、质心和惯性形成的组合参数 $a$。这里不是把任意黑箱动力学拟合成神经网络，而是保留已知物理结构。

利用恰当参数化，任意参考速度与加速度对应的补偿项可写成 $Y(q,\dot q,\dot q_r,\ddot q_r)a$。$Y$ 为可计算回归矩阵，非线性依赖运动变量，却线性依赖未知参数。

原文先构造全局稳定控制，再加入参考运动以消除残余位置误差。不能把前一结构的性质和后一结构的性质混作同一个定理。基础推导还要求参考轨迹及必要导数有界，动力学结构正确，反馈测量满足分析条件。

## 二、利用参数线性结构，把更新律接入能量分析

### 方法：让参数误差在能量导数里抵消

令位置误差 $e=q-q_d$，定义参考速度 $\dot q_r=\dot q_d-L e$，参考加速度 $\ddot q_r=\ddot q_d-L\dot e$，其中 $L$ 正定。合成误差为 $s=\dot q-\dot q_r=\dot e+Le$。

教学标准形式是

$$\tau=Y\hat a-K_Ds,\qquad\dot{\hat a}=-\Gamma Y^Ts.$$

$K_D$、$\Gamma$ 正定，分别控制误差反馈和参数更新尺度。$s$ 不是新传感器，只由实际位置、速度及参考导数构造。参考加速度可由期望轨迹与误差计算，区别于直接测量噪声较大的实际加速度。

令 $\tilde a=\hat a-a$，误差动力学为 $M\dot s+Cs=Y\tilde a-K_Ds$。取

$$V=\tfrac12s^TMs+\tfrac12\tilde a^T\Gamma^{-1}\tilde a.$$

适当定义 $C$ 后，$\dot M-2C$ 反对称，因此 $s^T(\dot M-2C)s=0$。参数更新项又抵消 $s^TY\tilde a$，得到 $\dot V=-s^TK_Ds\le0$。在相应有界性与连续性条件下，可进一步证明跟踪收敛。

这个更新律由闭环 Lyapunov 抵消条件确定，并非对预测误差作普通最小二乘。

不妨把能量抵消拆成两行。由于真参数 $a$ 被假定为常量，$\dot{\tilde a}=\dot{\hat a}$，于是

$$\dot V=s^\top(M\dot s+Cs)+\tilde a^\top\Gamma^{-1}\dot{\hat a}
=s^\top Y\tilde a-s^\top K_Ds-\tilde a^\top Y^\top s.$$

第一项与最后一项是同一个标量，所以相消。若载荷参数随时间变化，另多出 $-\tilde a^\top\Gamma^{-1}\dot a$，基本证明便不能原样使用。又因为 $\dot V$ 只惩罚 $s$，不能从它直接推出 $\tilde a\to0$；跟踪收敛还需先建立有界性和一致连续性，再通过 $\dot e+Le=s$ 推出位置误差的结论。

原创瞬时检查：一维质量块真质量2，估计质量1，参考加速度3，当前 $s=1$，取 $K_D=4,\Gamma=1$。控制力为 $1\times3-4=-1$，误差方程给 $\dot s=(-3-4)/2=-3.5$，参数更新为 $\dot{\hat m}=-3$。估计质量此刻反而远离真值，但储能导数为 $2(1)(-3.5)+(-1)(-3)=-4$。这是局部代数检查，不是整段仿真；它清楚说明该更新律服务于闭环总误差能量，不保证每一时刻的物理参数误差都下降。

因此实现之后要分别画轨迹误差和参数误差：能量式只直接压低合成跟踪误差，辨识还取决于轨迹提供的信息。

## 三、实现参考运动与参数更新，区分两类误差

```text
输入：参考 qd、dqd、ddqd，已知动力学结构，初始参数估计
循环：
    读取 q、dq
    e ← q-qd
    dqr ← dqd-L*e
    ddqr ← ddqd-L*(dq-dqd)
    s ← dq-dqr
    Y ← 由当前状态与参考运动构造回归矩阵
    tau ← Y*参数估计-KD*s
    参数估计导数 ← -Gamma*Y转置*s
    执行力矩，并按选定积分器更新参数估计
```

这是连续时间控制器的教学离散实现轮廓。实际步长、饱和、投影和抗噪声修正需要额外设计；不能用连续时间证明直接替任意离散代码担保。

### 自构例子：跟踪正确，但质量估计未必正确

考虑一维质量块 $m\ddot x=u$。若一直静止在同一点且没有重力，任何质量都与“零输入、零加速度”相容。机器人可以完美保持静止，质量却根本没有被测出来。

若让它执行变化丰富的加速减速，输入和加速度关系才提供辨识质量的信息。多关节系统也一样：如果某些参数总以同一组合影响当前轨迹，就可能只有这个组合可被辨识。

负载突变后的重新适应与瞬态风险，需要另作测试；上面的常参数证明不覆盖这一过程。

## 四、读未知负载仿真，分开跟踪改善和参数辨识

### 仿真如何验证

原稿的第 4 节以图 2–8 说明双连杆仿真；可核对[公开正文和图注转录](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。本轮尚未取得可可靠查看的原图或核实 PDF 页序，因此这个入口只算文字来源，不算已验证的原图入口；下文不新增曲线读数。

<!-- figure-ref-v6:start:rc-19-figure-2 -->
<span id="rc-19-figure-2"></span>
原图 2未内嵌：未取得可核验的原论文图像：SAGE原文需要付费访问，作者公开出版物目录未找到可读PDF。保留原图号与原文入口；现有原创教学图不是该原图的替代，也不计为完成。 [查看原文](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。
<!-- figure-ref-v6:end:rc-19-figure-2 -->

<!-- figure-ref-v6:start:rc-19-figure-3 -->
<span id="rc-19-figure-3"></span>
原图 3未内嵌：未取得可核验的原论文图像：SAGE原文需要付费访问，作者公开出版物目录未找到可读PDF。保留原图号与原文入口；现有原创教学图不是该原图的替代，也不计为完成。 [查看原文](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。
<!-- figure-ref-v6:end:rc-19-figure-3 -->

<!-- figure-ref-v6:start:rc-19-figure-4 -->
<span id="rc-19-figure-4"></span>
原图 4未内嵌：未取得可核验的原论文图像：SAGE原文需要付费访问，作者公开出版物目录未找到可读PDF。保留原图号与原文入口；现有原创教学图不是该原图的替代，也不计为完成。 [查看原文](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。
<!-- figure-ref-v6:end:rc-19-figure-4 -->

<!-- figure-ref-v6:start:rc-19-figure-5 -->
<span id="rc-19-figure-5"></span>
原图 5未内嵌：未取得可核验的原论文图像：SAGE原文需要付费访问，作者公开出版物目录未找到可读PDF。保留原图号与原文入口；现有原创教学图不是该原图的替代，也不计为完成。 [查看原文](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。
<!-- figure-ref-v6:end:rc-19-figure-5 -->

<!-- figure-ref-v6:start:rc-19-figure-6 -->
<span id="rc-19-figure-6"></span>
原图 6未内嵌：未取得可核验的原论文图像：SAGE原文需要付费访问，作者公开出版物目录未找到可读PDF。保留原图号与原文入口；现有原创教学图不是该原图的替代，也不计为完成。 [查看原文](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。
<!-- figure-ref-v6:end:rc-19-figure-6 -->

<!-- figure-ref-v6:start:rc-19-figure-7 -->
<span id="rc-19-figure-7"></span>
原图 7未内嵌：未取得可核验的原论文图像：SAGE原文需要付费访问，作者公开出版物目录未找到可读PDF。保留原图号与原文入口；现有原创教学图不是该原图的替代，也不计为完成。 [查看原文](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。
<!-- figure-ref-v6:end:rc-19-figure-7 -->

<!-- figure-ref-v6:start:rc-19-figure-8 -->
<span id="rc-19-figure-8"></span>
原图 8未内嵌：未取得可核验的原论文图像：SAGE原文需要付费访问，作者公开出版物目录未找到可读PDF。保留原图号与原文入口；现有原创教学图不是该原图的替代，也不计为完成。 [查看原文](https://www.scribd.com/document/315024557/1987-J-J-Slotine-W-Li-On-the-Adaptive-Control-of-Robot-Manipulators-pdf)。
<!-- figure-ref-v6:end:rc-19-figure-8 -->

本篇是仿真比较，不能把作者另作中的实体实验归入这里。公开转录的部分公式图片解析不完整，以下稳定性推导采用统一现代符号。

**第 2 节及附录 II。** 利用动力学反对称结构；稳定性证明的关键抵消成立；依赖模型结构。

**第 4 节，图 2、3。** 平面二连杆带未知负载，五次多项式轨迹；构造参数失配跟踪问题；机器人自身参数假定已知。

<!-- figure-ref-v6:start:rc-19-links-92 -->
本页定位：[图 2缺口说明](#rc-19-figure-2) · [图 3缺口说明](#rc-19-figure-3)。
<!-- figure-ref-v6:end:rc-19-links-92 -->

**Example 1，图 4–6。** PD、固定动力学前馈与自适应；相同反馈增益下自适应改善轨迹误差；不是所有控制器的最优调参比较。

<!-- figure-ref-v6:start:rc-19-links-94 -->
本页定位：[图 4缺口说明](#rc-19-figure-4) · [图 5缺口说明](#rc-19-figure-5) · [图 6缺口说明](#rc-19-figure-6)。
<!-- figure-ref-v6:end:rc-19-links-94 -->

**Example 2，图 7。** 加入参考运动后的结构；去除前一结构的稳态位置误差；增益设置有改变。

<!-- figure-ref-v6:start:rc-19-links-96 -->
本页定位：[图 7缺口说明](#rc-19-figure-7)。
<!-- figure-ref-v6:end:rc-19-links-96 -->

**Example 3，图 8。** 持续激励轨迹；参数收敛与运动激励相关；不能推广到任意静止或重复轨迹。

<!-- figure-ref-v6:start:rc-19-links-98 -->
本页定位：[图 8缺口说明](#rc-19-figure-8)。
<!-- figure-ref-v6:end:rc-19-links-98 -->

未知负载与连杆同几何、质量为其两倍，机器人本体参数在仿真中视为精确；这是一种明确受控的参数失配测试。原稿文字给出若干最大角误差数值，但副本角度符号解析缺损，本文不据此计算百分比提升。

更重要的观察是 Example 1 的参数未收敛到真实值，而轨迹误差已经明显改善。作者将原因与轨迹缺少持续激励联系起来。随机种子与误差条不是这种确定性示例的主要证据形式；不能据图中一次曲线推断对噪声分布的统计鲁棒性。

<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/019-teaching.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/019-teaching.png" width="1100" height="650" alt="跟踪正确，不等于未知质量已经学准；左侧三个不同质量都解释同一个零输入、零加速度记录；右侧才出现能够区分质量的信息" loading="lazy"></a><figcaption>原创教学图：本文手算与几何示意；<a href="https://doi.org/10.1177/027836498700600303" target="_blank" rel="noopener noreferrer">核对相关原文</a>。非原论文图，非实验数据。</figcaption></figure>

读图：左侧三个不同质量都解释同一个零输入、零加速度记录；右侧才出现能够区分质量的信息。这是辨识条件的自构反例，不能代替尚未取得的原论文双连杆仿真曲线。

## 五、检查持续激励、模型类别与未建模扰动

代价包括回归矩阵构造、增益尺度和参数估计的物理合理性。基础更新不自动强制估计质量为正；尽管该控制形式避免直接反演估计惯性，非物理参数仍会影响瞬态与解释。加入参数投影属于额外机制，需要相应分析。

摩擦、柔性和传感偏置可能形成无法由既有参数吸收的误差。原文还讨论鲁棒性扩展，但不能将基础理想收敛结论直接推广到所有这些扰动。过大的自适应增益也可能让估计追逐噪声。

五个前置概念：**线性参数化**指对未知参数线性而非对状态线性；**回归矩阵**编码已知运动关系；**Lyapunov 函数**用于证明误差能量受控；**持续激励**提供辨识各参数方向的信息；**跟踪收敛**不等于参数收敛。

## 六、追问：要比较两个参数更新律，为什么只画末端轨迹不够？

<details>
<summary>要比较两个参数更新律，为什么只画末端轨迹不够？</summary>

**参考答案**：相同或相近的轨迹误差可以由不同参数估计与反馈作用产生。应固定参考运动和负载，至少同时观察跟踪误差、参数变化及控制作用，并说明是否提供足够激励。正文已经区分跟踪收敛与参数收敛，不能用前者替代辨识正确性的证据。

</details>

## 七、区分在线参数适应与滚动模型优化

- **模块组合**：[操作空间：直接设计夹爪的动力学行为](018-operational-space.md)。与任务空间控制组合时仍须重新检查参数化、误差定义及稳定性条件。
- **教学联系**：[Cheetah 凸 MPC：用简化模型提前安排四足机器人的支撑力](094-cheetah-mpc.md)。比较在线适应未知参数与使用简化固定模型滚动优化的不同职责。

## 八、自测与参考答案

**1．为什么不测实际关节加速度仍能做动力学补偿？**

控制器使用由参考轨迹和位置速度误差构造的参考加速度，并以误差系统完成稳定性分析。它并非先用实测加速度精确辨识所有参数再控制。

**2．轨迹已经收敛，为什么参数可能仍然错误？**

当前运动只激励了某些参数组合，不同参数可能产生同样控制效果。跟踪只需要误差消失，唯一辨识还需足够丰富的激励条件。

**3．把参数更新速度提高十倍，是否一定更好？**

不一定。更新增益会改变瞬态、噪声敏感性与离散数值行为。连续理想模型中的稳定性不能替代真实系统对增益、采样和饱和的联合验证。
