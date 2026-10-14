# 第 02 天｜TD(λ)：结果还没出现，预测为什么就能学习

[系列首页](README.md) · [上一篇](01-actor-critic.md) · [下一篇](03-dyna.md)

**论文**：Richard S. Sutton，*Learning to Predict by the Methods of Temporal Differences*，Machine Learning 3:9–44，1988。[出版社原文](https://link.springer.com/content/pdf/10.1007/BF00115009.pdf) · [Figure 3 正式勘误，1989，p.377](#rl-02-figure-3)。

### 先接住上一篇的问题

[第1天的 Actor–Critic](01-actor-critic.md)把“选动作”和“预测后果”分开，本篇集中研究预测这一半：终局还没出现，预测器能否先从相邻预测的变化中学习？这是机制上的联系，不表示1988论文只是把1983系统删去 Actor。[第3天 Dyna](03-dyna.md)会进一步问，学到模型后能否自己生成这种更新；[第15天 GAE](15-gae.md)把几何加权残差用到优势估计，估计对象与本篇不同。

## 一、问题设定：预测一件还没有发生的事

一个随机过程依次产生观测 $x_0,x_1,\ldots,x_{T-1}$，结束时才给出结果 $z$。例如棋局胜负，或本篇实验中“随机游走最终从哪一端离开”。学习器在每一步输出预测 $P_t$，希望它接近给定当前信息时终局结果的条件期望。这里先固定产生轨迹的过程，**不是训练一个改变动作的策略**。

一种做法是等终局，拿 $z-P_t$ 修正每个旧预测；困难不只是等待，也在于它把一整段未知的未来都当成一个样本。TD 的替代信号是 $P_{t+1}-P_t$：新信息已经使预测变化，就把这次修正往前传。它没有凭空创造标签，而是利用时间相邻的预测之间应当一致这一结构。

中途的预测可能本来就错，所以“能提前更新”不等于“每次更新都朝真值走”。状态表示、步长、参数更新时间和轨迹噪声都决定这笔交换是否划算。

## 二、从终局误差推到资格迹：Theorem 1 到底说了什么

先采用原文的线性预测 $P_t=w^\top x_t$，并在一条序列内部**冻结同一个参数向量 $w$**。约定 $P_T=z$，于是最后一个差分也包含真实结果。终局监督更新可以写成

$$
\Delta w_{\mathrm{WH}}=\alpha\sum_{k=0}^{T-1}(z-P_k)x_k.
$$

WH 指 Widrow–Hoff 型线性更新，$\alpha$ 是步长。先对任意旧时刻 $k$ 展开终局误差，再交换有限和的顺序：

$$
z-P_k=\sum_{t=k}^{T-1}(P_{t+1}-P_t),
$$

$$
\begin{aligned}
\Delta w_{\mathrm{WH}}
&=\alpha\sum_{k=0}^{T-1}\sum_{t=k}^{T-1}(P_{t+1}-P_t)x_k\\
&=\alpha\sum_{t=0}^{T-1}(P_{t+1}-P_t)\underbrace{\sum_{k=0}^{t}x_k}_{e_t}.
\end{aligned}
$$

外层改成当前时刻 $t$ 后，内层就是“哪些旧特征该对当前误差负责”。不必储存全部旧输入：令 $e_{-1}=0$，就有 $e_t=e_{t-1}+x_t$。这给出了 TD(1) 的后向计算形式。

**[原文 Theorem 1（印刷p.15／PDF第7页）](https://link.springer.com/content/pdf/10.1007/BF00115009.pdf#page=7)的要点是每条序列总参数改变量相同**：在线性、回合内冻结预测参数且采用相应更新定义时，TD(1) 与上述 WH 更新相同。它不是“TD(1) 总会收敛到最优预测器”，也不是现代神经网络逐步改参时的无条件等价。

若只把一部分信用传给很久以前的特征，可把内层换成

$$
e_t=\sum_{k=0}^{t}\lambda^{t-k}x_k=\lambda e_{t-1}+x_t,
\qquad
\Delta w=\alpha\sum_{t=0}^{T-1}(P_{t+1}-P_t)e_t.
$$

$\lambda=0$ 只更新当前特征，$\lambda=1$ 保留此前所有特征；中间值用指数衰减折中。**$\lambda$ 控制迹的衰减，$\alpha$ 控制更新大小，二者不能混为一谈。**

### 一个能亲手验算的例子

这是教学构造，不是论文实验。取 $P_0=0.2,P_1=0.5,P_2=0.6,z=1$，三个差分为 $0.3,0.1,0.4$。第一个特征 $x_0$ 在总更新中收到的系数为

- $\lambda=1$：$0.3+0.1+0.4=0.8=z-P_0$；
- $\lambda=0.5$：$0.3+0.5(0.1)+0.25(0.4)=0.45$；
- $\lambda=0$：只收到 $0.3$。

如果一步更新后马上用新 $w$ 重新计算后面的预测，就不能再把这三个数当成同一冻结预测函数的输出。误差望远镜展开本身仍是代数恒等式，但它与某个固定参数下监督梯度的对应关系已经变了。

## 三、今天怎么实现：先区分现代在线形式和原文实验协议

对带逐步奖励的价值预测，常见现代记法为

$$
\delta_t=r_{t+1}+\gamma V_w(s_{t+1})-V_w(s_t),\quad
 e_t=\gamma\lambda e_{t-1}+\nabla_wV_w(s_t),\quad
 w\leftarrow w+\alpha\delta_t e_t.
$$

这里 $r_{t+1}$ 是从 $s_t$ 转移出去后收到的奖励，$\gamma$ 是折扣，$\delta_t$ 是当前 TD 残差。真终止时下一状态估值取零；只有时间预算耗尽而环境未终止时，是否继续自举必须按任务定义处理。

```text
# 现代在线累积迹：说明机制，不宣称复现下文原论文曲线
每个回合开始：e ← 0
观察一次转移 s, r, s_next：
  next_value ← 0 if 真终止 else V_w(s_next)
  delta ← r + gamma * next_value - V_w(s)
  e ← gamma * lambda * e + gradient(V_w(s))
  w ← w + alpha * delta * e
```

普通在线累积迹不与冻结参数的离线 λ-return 逐步严格相等。原文图3把整个训练集的增量累计后才改参，图4—5每条完整序列结束后改参；若拿上面的逐步在线代码直接跑，再称“复现图3”，实验对象就已经换了。

## 四、把随机游走实验真正读出来

### Figure 2：为什么这里知道“正确答案”

<!-- figure-ref-v6:start:rl-02-figure-2 -->
<figure class="reading-evidence-figure" id="rl-02-figure-2"><a href="/rl/assets/reference-v6/02-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/02-figure-2.png" width="999" height="162" alt="原图的箭头从D进入；B到F各有等概率的左右转移，A和G是终止状态。下面的原创教学图另补了解析概率，二者承担的内容不同。" loading="lazy"></a><figcaption>原论文图形摘引｜Sutton，1988，图2，PDF第10页。<a href="https://link.springer.com/content/pdf/10.1007/BF00115009.pdf#page=10" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

原图的箭头从D进入；B到F各有等概率的左右转移，A和G是终止状态。下面的原创教学图另补了解析概率，二者承担的内容不同。
<!-- figure-ref-v6:end:rl-02-figure-2 -->

<figure class="reading-evidence-figure">
<a href="/rl/assets/td-lambda/random-walk-original.svg" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/td-lambda/random-walk-original.svg" width="840" height="250" alt="原创示意：从D起步，在A至G七个状态间等概率左右走，A和G吸收；B至F最终到G的概率分别为1/6至5/6。" loading="lazy"></a>
<figcaption>原创教学图｜依据Sutton (1988) 图2，印刷p.18／PDF第10页；下行数字为解析概率。 <a href="https://link.springer.com/content/pdf/10.1007/BF00115009.pdf#page=10" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。</figcaption>
</figure>

从 D 出发，每次向左或向右一步的概率都是 $1/2$；到 A 或 G 停止，目标分别是0和1。把 A 到 G 编号为 $i=0,\ldots,6$，则到达 G 的概率满足 $v_i=\tfrac12v_{i-1}+\tfrac12v_{i+1}$，边界 $v_0=0,v_6=1$，所以 $v_i=i/6$。线性预测器使用五个非终止状态的独热特征，这里的每个参数就对应一个状态的预测。

这一设定的重要性不是“任务很简单”而已：它把真值、表示能力和采样误差分开了。实验误差是五个非终止状态预测与真值之间的均方根误差，再跨100份训练集平均；不是训练标签拟合误差，也不是控制任务总回报。

### Figure 3：重复同一批数据直到稳定，哪个 λ 更好

**先纠正版本问题**：本次核对的出版社原始PDF印刷p.20把图3误印成了与图5相同的单遍训练曲线。1989年的[正式勘误p.377](https://link.springer.com/article/10.1007/BF00116840)给出了正确图3，下方展示的就是勘误图，不能拿误印版本的U形曲线解读本实验。这一发现只针对已核对的版本，不表示后来修订版也有此问题。

<!-- figure-ref-v6:start:rl-02-figure-3-original-misprint -->
<figure class="reading-evidence-figure" id="rl-02-figure-3-original-misprint"><a href="/rl/assets/reference-v6/02-figure-3-original-misprint.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/02-figure-3-original-misprint.png" width="729" height="666" alt="这是已核对1988出版社PDF中误印的图3：图内写着“使用最佳步长的误差”，曲线呈U形，实际对应后面的单遍训练图5。它只作为版本纠错对照，重复训练实验应读下方1989勘误图，不能从这张误印图得出该实验的结论。" loading="lazy"></a><figcaption>版本纠错对照｜Sutton，1988，原版误印图3，PDF第12页／印刷p.20。<a href="https://link.springer.com/content/pdf/10.1007/BF00115009.pdf#page=12" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留。</figcaption></figure>

这是已核对1988出版社PDF中误印的图3：图内写着“使用最佳步长的误差”，曲线呈U形，实际对应后面的单遍训练图5。它只作为版本纠错对照，重复训练实验应读下方1989勘误图，不能从这张误印图得出该实验的结论。
<!-- figure-ref-v6:end:rl-02-figure-3-original-misprint -->

<!-- figure-ref-v6:start:anchor-rl-02-figure-3 -->
<span id="rl-02-figure-3"></span>
<!-- figure-ref-v6:end:anchor-rl-02-figure-3 -->
<figure class="reading-evidence-figure">
<a href="/rl/assets/td-lambda/figure3-corrected.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/td-lambda/figure3-corrected.png" width="765" height="696" alt="正式勘误Figure 3：横轴lambda，纵轴重复呈现至收敛后的RMS误差；lambda从0到1时误差总体升高，lambda等于1标作Widrow-Hoff。" loading="lazy"></a>
<figcaption>原图摘引｜Sutton论文正式勘误 (1989)，正确图3，p.377。原版权保留。 <a href="https://link.springer.com/content/pdf/10.1007/BF00116840.pdf#page=1" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。</figcaption>
</figure>

读这张图要固定三个条件：每份训练集含10条随机游走序列；同一训练集反复呈现；每次看完整个训练集才应用累计参数改变量，以足够小的步长运行到稳定。横轴是 $\lambda$，纵轴是收敛预测的平均 RMS 误差，越低越好。

在这个协议下，$\lambda=0$ 的误差最低，$\lambda=1$ 对应 WH 端点。直觉上，终局监督法最直接地拟合每条序列观察到的结果；TD(0) 还利用同一状态之间共享的经验转移结构，让不同序列的信息互相约束。**这是固定有限数据集上的归纳方式差异，不是多创造了独立样本。**

图注报告各点的标准误约0.01。曲线能支持所测端点及方法的比较，但不要因为0与0.1的线段略有高低，就宣称它们存在可靠的统计差异；也不能把这个误差范围移植给下面两张不同协议的图。

### Figure 4：只看10条序列一次，步长会改变排名

<!-- figure-ref-v6:start:anchor-rl-02-figure-4 -->
<span id="rl-02-figure-4"></span>
<!-- figure-ref-v6:end:anchor-rl-02-figure-4 -->
<figure class="reading-evidence-figure">
<a href="/rl/assets/td-lambda/figure4-step-size.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/td-lambda/figure4-step-size.png" width="795" height="648" alt="原论文Figure 4：横轴学习率alpha，纵轴看完10条序列后的平均RMS误差；lambda取0、0.3、0.8、1的曲线在不同alpha处达到最低点，过大步长使误差升高。" loading="lazy"></a>
<figcaption>原图摘引｜Sutton (1988)，图4，印刷p.21／PDF第13页。© Kluwer Academic Publishers。 <a href="https://link.springer.com/content/pdf/10.1007/BF00115009.pdf#page=13" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。</figcaption>
</figure>

这次每份训练集只走一遍，**每条序列结束后更新**，五个初始预测都设为0.5。横轴改成步长 $\alpha$，每条线是一种 $\lambda$，纵轴仍是预测 RMS 误差。图中展示代表性取值，包括0、0.3、0.8、1，而不是图3的同一套横轴刻度。

首先看每条线的谷底，再看谷底左右的陡峭程度：同一种方法可因步长过小而来不及学习，也可因步长过大而过冲。$\lambda=1$ 的曲线较快向上，说明在这套短数据预算下它对大步长很敏感。比较一个调好 $\alpha$ 的 TD 与一个随意设 $\alpha$ 的 WH，会把超参数调节收益误当成全部方法收益。

### Figure 5：允许各自选好 α，最佳 λ 仍依赖训练协议

<!-- figure-ref-v6:start:anchor-rl-02-figure-5 -->
<span id="rl-02-figure-5"></span>
<!-- figure-ref-v6:end:anchor-rl-02-figure-5 -->
<figure class="reading-evidence-figure">
<a href="/rl/assets/td-lambda/figure5-best-alpha.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/td-lambda/figure5-best-alpha.png" width="717" height="672" alt="原论文Figure 5：横轴lambda，纵轴每个lambda选择所测试的最佳alpha后得到的平均RMS误差；最低区域在lambda约0.2至0.3，lambda等于1明显更高。" loading="lazy"></a>
<figcaption>原图摘引｜Sutton (1988)，图5，印刷p.22／PDF第14页。© Kluwer Academic Publishers。 <a href="https://link.springer.com/content/pdf/10.1007/BF00115009.pdf#page=14" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。</figcaption>
</figure>

这里重新让 $\lambda$ 当横轴，对每个 $\lambda$ 在所测试的 $\alpha$ 中挑出最低误差。可把它理解成图4那类“误差—步长”曲线的谷底汇总，不是固定一个共同步长。图的最低区域约在0.2—0.3，论文文字概括最佳约0.3；图形精度不足以支持更多小数位，也不宜据此声称二者显著不同。

为什么不与图3矛盾？图3问“反复利用这10条序列后会停在哪里”，图5问“只看一遍，谁更快到达较好预测”。前者强调有限数据下的稳定解，后者还混入初值、学习速度和步长。较长的迹有机会让一次新结果更快影响远处状态，但也传播更多轨迹噪声。**图5中的最优值只是这个任务、预算、初值和调参范围的结果，不是通用默认值。**

## 五、哪些结论能推广，哪些不能

这组实验支持“相邻预测及转移结构值得利用”，不能直接证明任何神经网络、部分可观测任务或离策略数据都稳定。[原文后续线性理论（§4）](https://link.springer.com/content/pdf/10.1007/BF00115009.pdf#page=16)还需要吸收式马尔可夫过程、满足条件的线性表示与足够小步长等假设。均值层面的收敛也不能读成任意单次训练路径都单调改善。

本篇的交换是：用当前估值来替代部分未知未来，降低等待和采样成本，同时引入对表示与自举误差的依赖。状态信息不足时，两个表面相同的观测可能有不同后果；资格迹不会自动补回这些丢掉的信息。

### 五个前置概念

1. **预测学习**：估计未来结果而非直接找动作。
2. **Bootstrapping**：把另一个当前估计用于目标。
3. **资格迹**：保存历史特征的衰减记忆。
4. **λ-return**：混合不同长度回报的目标。
5. **偏差—方差**：错误先验与采样噪声的折中。


## 六、三个值得继续追问的问题与参考答案

<details>
<summary>1. 转移噪声变大时，最优 λ 会怎样变化？</summary>

**参考答案**：没有不依赖条件的单调规律。若价值函数已经可靠，增加长轨迹回报的随机性，通常会提高长目标的方差，小 $\lambda$ 可能更合算；若表示存在很强自举偏差，降低 $\lambda$ 又会更依赖那个错误估计。改变转移概率还可能同时改变到达时间、访问频率与真实价值，不能把这些变化全叫作“噪声”。

一个可检查的实验应先说明增加哪一种随机性，再对 $\lambda$ 和 $\alpha$ 联合调参，固定数据预算与初始化，使用独立测试轨迹和多随机种子。原文图3与图5已经给出一个提醒：就算环境完全相同，只改变数据重用协议，最优 $\lambda$ 也会不同。

</details>

<details>
<summary>2. 若状态表示混合了两个不同真实状态，TD 的目标是什么？</summary>

**参考答案**：学习器只能在所选函数空间内求一个折中。举例：两个真实状态被编码成同一个特征，但终局成功概率分别为0和1；同一个参数不可能同时等于两个真值。用完整回报做最小二乘时，折中由样本访问权重决定，例如两类各占一半时预测0.5。

TD 的折中不一定等于这个回归平均。在常见线性、在策略和稳定性条件下，TD(0) 的期望固定点可以表述为投影贝尔曼方程 $\Phi w=\Pi_D T^\pi(\Phi w)$：$\Phi$ 是特征矩阵，$D$ 给出相应访问权重，$\Pi_D$ 将自举目标投回可表示的函数空间。转移如何连接这些混叠状态也会影响解；不同 $\lambda$ 对应的多步算子又可能改变折中。这是后续线性函数逼近理论的观点，可核对[Tsitsiklis与Van Roy（1997）§III—IV，PDF第4—6页](https://web.mit.edu/~jnt/www/Papers/J063-97-bvr-td.pdf#page=4)；其在策略折扣马尔可夫链、特征与步长等假设不同于1988年的吸收式实验，不应冒充本篇 Theorem 1 的结论。实际修正方向是补充区分状态的特征或历史信息，而不是指望迹衰减单独恢复不可见状态。

</details>

<details>
<summary>3. 为什么 TD 误差小不能直接证明策略最优？</summary>

**参考答案**：预测器首先评估的是产生数据的那个过程／策略，不是在所有策略里做最大化。考虑只有一个决策的任务：动作A终止并给0，动作B终止并给1。若当前策略永远选A，令它的状态价值为0，每次观测到的 TD 误差就是0；但改选B明明更好。这是“把一个差策略估准了”。

此外，训练数据上的平均残差小，还可能掩盖未访问状态或正负残差抵消。要得到控制结论，需要动作比较、充分探索与策略改进等额外机制。[第4天 Q-learning](04-q-learning.md)把下一步目标换成动作价值的最大值，正是从预测走向控制的一种具体改动；它也有自己的采样与收敛条件。

</details>

## 七、接下来沿哪条线读

- **模型与规划**：[第3天 Dyna](03-dyna.md)。本篇从真实序列提取 TD 更新，下一篇再把模型生成的经验用于同类更新，新增的是数据生成与规划环节。
- **预测到控制**：[第4天 Q-learning](04-q-learning.md)。自举仍在，但目标开始比较动作，不再只估计固定过程的后果。
- **迹到优势估计**：[第15天 GAE](15-gae.md)。几何加权的 TD 残差用于估计优势，随后与策略梯度组合；它不是对 TD(λ) 的简单改名。

<details>
<summary>原论文、勘误与公式核对入口</summary>

- [原论文PDF](https://link.springer.com/content/pdf/10.1007/BF00115009.pdf)：§2推导及Theorem 1见PDF第4—7页；Figure 2及随机游走设定见第10页；Figure 4—5见第13—14页。页码是PDF阅读器页序，正文另标印刷页。
- [1989正式勘误PDF](https://link.springer.com/content/pdf/10.1007/BF00116840.pdf#page=1)：正确Figure 3及其原始图注；不要用已核对原始PDF中的误印图代替。
- [Tsitsiklis与Van Roy（1997）函数逼近分析](https://web.mit.edu/~jnt/www/Papers/J063-97-bvr-td.pdf#page=4)：第2个追问的投影算子与固定点来源。它是后续理论，不用于补写1988年的实验协议。

</details>

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：TD(0)、蒙特卡洛与 TD(λ)，分别如何利用一条完整轨迹？

**参考答案**：TD(0) 用“一步奖励＋下一状态估值”更新；蒙特卡洛等待完整回报；TD(λ) 混合不同长度的多步目标。λ 较小时更依赖近期预测，λ 较大时让较远奖励产生更强影响。在完整回合、适当终止处理和固定估值等条件下，λ=1 对应蒙特卡洛目标。

**问题 2**：为什么 λ 不应该永远取最大值？

**参考答案**：长回报包含更多真实奖励，减少对不准确价值估计的依赖，但也累积更多环境与动作采样噪声。短目标通常方差较低，却更依赖自举估计。λ 调节的是这种取舍，最佳值取决于任务长度、随机性和价值函数质量。


[系列首页](README.md) · [上一篇](01-actor-critic.md) · [下一篇](03-dyna.md)
