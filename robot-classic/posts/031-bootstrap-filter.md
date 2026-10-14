# 031｜Bootstrap Filter：用一群可能状态，代替一个高斯椭球

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](030-grasp-quality.md) · [下一篇](032-dstar.md)

**论文**：N. J. Gordon、D. J. Salmond、A. F. M. Smith，*Novel Approach to Nonlinear/Non-Gaussian Bayesian State Estimation*，1993，IEE Proceedings F，140(2)：107–113。[原始论文 DOI](https://doi.org/10.1049/ip-f-2.1993.0015) · [机构保存原文](https://people.bordeaux.inria.fr/pierre.delmoral/gordon-salmond-smith-1993.pdf) · [原文文字副本](https://studylib.net/doc/18235234/novel-approach-to-nonlinear-non-gaussian-bayesian-state)。

### 先接住前作的问题

[Kalman](002-kalman.md)在线性高斯情形十分紧凑，但一个椭球装不下多峰后验。本篇改用样本传播分布。

## 一、问题设定：多峰后验怎样避免被单一均值压到不可能的位置

机器人听见一个声音，可能在走廊左侧，也可能在右侧。把这两个位置平均起来，恰好落在没有声音源的墙上。用均值和协方差表达不确定性很方便，但分布一旦有多个峰，这种压缩可能丢掉最重要的信息。

### 问题定义：估计对象是一个分布

设隐藏状态为 $x_k$，观测为 $y_k$，历史观测为 $y_{1:k}$。状态依照 $x_k=f(x_{k-1},w_{k-1})$ 演化，传感器给出 $y_k=h(x_k,v_k)$。过程噪声与观测噪声的分布已知，并满足论文第 2 节的独立性假设。

输入不是奖励，输出也不是动作策略。它属于概率状态估计；机器人可以把估计交给导航或控制器，但本文本身没有强化学习回报或训练终止条件。时间步意味着新观测到来，仿真结束只是评估区间结束。

理想的递归贝叶斯滤波分两步：

$$
p(x_k\mid y_{1:k-1})=\int p(x_k\mid x_{k-1})p(x_{k-1}\mid y_{1:k-1})dx_{k-1},
$$

$$
p(x_k\mid y_{1:k})\propto p(y_k\mid x_k)p(x_k\mid y_{1:k-1}).
$$

第一个式子把旧的不确定性推进到现在；第二个式子用观测修正预测。难点通常是积分和分布表示。EKF 在线性化后保留一个高斯近似；固定网格则为大片低概率区域也分配计算资源。Bootstrap Filter 让样本随概率质量移动，但资源是否足够仍取决于分布形状。

## 二、传播粒子、计算似然，再分析重采样与修整

### 方法：传播、打分、再抽一次

假设上一时刻已有 $N$ 个等权样本 $x_{k-1}^{(i)}$。从过程噪声分布独立抽样，通过状态方程得到预测样本 $\tilde x_k^{(i)}$。观测到来后，计算

$$
\tilde w_i=p(y_k\mid\tilde x_k^{(i)}),\qquad w_i=\frac{\tilde w_i}{\sum_j\tilde w_j}.
$$

再以概率 $w_i$ 有放回抽取 $N$ 次，形成等权后验样本。这个基本版本的提议分布就是状态转移分布，因此权重只剩观测似然；不能把这条简化权重直接套到任意自定义提议分布。

若所有似然在数值上为零，归一化不能继续；这可能是浮点下溢，也可能是全部粒子都错过观测支持区域。前者可用对数计算缓解，后者需要改变采样覆盖，不能靠加一个任意常数掩盖。

这里没有一个需要梯度下降的神经网络损失。**数学目标**是近似后验及其积分；**机制改变**是以随机样本实现预测和贝叶斯更新；**实验指标**则是状态估计、区间覆盖及后验形状。三者不能混为“优化了误差函数”。

第 3.2 节借助加权自助采样的渐近结果解释更新正确性。样本数趋于无穷的论证不等于某个固定 $N$ 在任意长序列中误差可控。重采样后的副本也不是凭空增加了独立信息。

### 一次重采样同时做了近似，也引入了随机误差

设预测粒子为 $(-2,0,2)$，归一化似然为 $(0.45,0.10,0.45)$。加权均值为0，却没有证据说明“位置0最可信”：中心粒子反而权重最低。若有放回抽三次，恰好全部抽到右侧的概率为 $0.45^3\approx0.091$，抽样后报告的均值便可能是2。增大粒子数减少这类波动，但复制三个2不会创造三条独立观测。

更一般地，区域 $A$ 的重采样粒子数 $N_A$ 满足 $E[N_A/N\mid\{x_i,w_i\}]=\sum_iw_i1_A(x_i)$。这里 $N$是总粒子数，$x_i,w_i$是重采样前位置和归一化权重，$1_A$是落在区域 $A$的指示函数。因此重采样在条件期望上保留当前离散近似，不能修复最初完全没有采到的模式。这个**教学演算**解释了原文第3.3节强调先验与似然重叠，以及第4.2节另加roughening的原因。[原稿第3节](https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf)

[Kalman](002-kalman.md)与这里共享贝叶斯递推目标，是分布表示上的平行方法；[CONDENSATION](039-isard-condensation.md)与[MCL](041-mcl.md)把这一采样传播骨架分别用于视觉轮廓和移动机器人定位。原文非线性一维例子的区间覆盖比较，首先证明单高斯近似会失配，不能推广为任何粒子数、任何观测下都优于EKF。

### 为什么还需要 Roughening 与 Prior Editing

若一次观测极精确，只有少数预测粒子落在高似然区域。重采样会制造大量相同副本；过程噪声很小时，这些副本可能长期无法分开。第 3.3 节明确指出样本数量需求与维数、先验和似然的重叠、时间长度有关。

第 4.2 节加入 **roughening**：在重采样结果上添加小抖动，让副本重新展开。各维抖动尺度随该维样本范围和 $N^{-1/d}$ 调节，其中 $d$ 是维数。抖动过大，会模糊真实分布；过小，仍是一簇重复样本。因此它是一种工程近似，不能声称完全不改变目标分布。

另一项 **prior editing** 利用下一时刻观测做粗略接受检验，拒绝明显不可能的候选。它引入一步前瞻以及额外重试计算。作者区分了编辑后的近似平滑样本与[图 8](#rc-31-figure-8)、9 所展示的未经过该接受检验的当前滤波统计量；这是读图时必须保留的时序差别。

<!-- figure-ref-v6:start:rc-31-final-source-gap-note -->
<span id="rc-31-figure-9"></span><span id="rc-31-figure-11"></span><p class="figure-reference-note">尚未内嵌：<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=5" target="_blank" rel="noopener noreferrer">图 9</a>、<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=6" target="_blank" rel="noopener noreferrer">图 11</a>。已加入 Bootstrap 与 EKF 的位置均值、真值和置信区间完整对照；剩余两图是对应速度状态的另一组完整实验时序。当前不继续扩展到整套位置及速度视觉叙事，保留速度图入口；这一范围选择不否定其技术价值，也不是数值比例禁令。</p>
<!-- figure-ref-v6:end:rc-31-final-source-gap-note -->





<!-- figure-ref-v6:start:rc-31-figure-8-reviewed -->
<figure class="reading-evidence-figure" id="rc-31-figure-8"><a href="/robot-classic/assets/figure-refs-v6/031-fig-8-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/031-fig-8-reviewed.png" width="480" height="450" alt="Bootstrap滤波位置后验均值和95%区域及完整图例" loading="lazy"></a><figcaption>原论文图摘引：N. J. Gordon、D. J. Salmond、A. F. M. Smith，Novel Approach to Nonlinear/Non-Gaussian Bayesian State Estimation，1993，IEE Proceedings F，140(2)：107–113，图 8，PDF 第 5 页；<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。图形与图例分别裁切后重新排列；原版权保留。点击图片可放大。</figcaption></figure>

读图：三角形真值与估计及区间一起读取，后半段真值仍处于所示区域附近；这是一次弯曲目标轨迹上的位置分量，不是速度分量或普遍校准保证。
<!-- figure-ref-v6:end:rc-31-figure-8-reviewed -->






重采样使高权重假设得到更多复制，却不会增加独特观测。实现检查先分清粒子数量与多样性，再读两个跟踪实验怎样体现分布表示的价值。

## 三、运行样本递推，用有限独特粒子检查信息来源

以下是第 3.1 节的教学重写，不含第 4.2 节的两项工程修正：

```text
输入：初始分布、状态转移模拟器、观测似然、粒子数 N
从初始分布抽取 N 个粒子
对每次新观测 y：
    对每个粒子：抽过程噪声并传播，得到预测粒子
    对每个预测粒子：计算 log_likelihood(y | particle)
    用减去最大值的方式稳定地归一化权重
    保存加权粒子，用于计算均值、分位数或区域概率
    按权重有放回抽 N 个粒子，供下一时刻使用
输出：后验的样本近似，以及需要的统计量
```

### 一个自构例子与五个前置概念

**教学例子，未运行实验：**传感器只测 $y=x^2$，读数为 9，噪声很小。若先验同时覆盖正负位置，后验应在 $-3$ 和 $3$ 附近形成两簇。均值可能接近零，却不能据此说物体在零附近。若 100 个初始粒子全在正半轴，重采样无法创造负半轴模式；需要初始覆盖或之后的传播机制提供那些候选。

理解本文最需要五个概念：**贝叶斯更新**用似然修正先验；**蒙特卡洛积分**用样本平均估计期望；**重要性权重**表示候选与目标分布的相对契合；**重采样**重新分配有限计算资源；**粒子退化**意味着有效不同状态减少，即使数组长度仍不变。

## 四、分别读一维非线性与纯方位跟踪实验


<!-- figure-ref-v6:start:rc-31-figure-4-anchor -->
<span id="rc-31-figure-4"></span>
<!-- figure-ref-v6:end:rc-31-figure-4-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/031-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/031-evidence.png" width="645" height="534" alt="Fig. 4：同一时刻的后验密度中，粒子核密度保留分开的峰，而高斯近似只能用一个峰概括" loading="lazy"></a><figcaption>原论文结果图／表摘引：N. J. Gordon、D. J. Salmond、A. F. M. Smith（1993），Fig. 4，PDF 第 4 页；<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：同一时刻的后验密度中，粒子核密度保留分开的峰，而高斯近似只能用一个峰概括。图中的平滑曲线也是有限样本估计，不应把它当成已知的精确后验。

### 实验：两个例子分别验证什么

时间曲线与后验密度图回答不同问题：前者看状态估计，后者看多峰分布。正文给出的数值与图上趋势分开使用，不从低清曲线猜精确误差。

| 项目 | 一维非线性例子 | 纯方位跟踪例子 |
|---|---|---|
| 状态与观测 | 标量状态，观测含 $x^2/20$ | 平面位置与速度共四维，只测方位角 |
| 数据来源 | 50 步模型生成序列 | 24 步目标运动仿真 |
| 基线 | EKF | 直接应用于笛卡尔状态的 EKF |
| 样本预算 | 500 粒子 | 保留 4000 粒子，含粗化和先验编辑 |
| 主要证据 | [图 2–4](#rc-31-figure-2) 的均值、分位区间与双峰结构 | [图 6](#rc-31-figure-6)–[图 11](https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=6) 的轨迹、散点及分量区间 |
| 想验证的假设 | 多峰后验不适合一个高斯近似 | 强非线性观测下样本表示能保持合理不确定性 |
| 重复与算力 | 展示单条序列，未给多随机种子汇总 | 未给统一耗时或等算力比较 |

<!-- figure-ref-v6:start:rc-31-figure-10-reviewed -->
<figure class="reading-evidence-figure" id="rc-31-figure-10"><a href="/robot-classic/assets/figure-refs-v6/031-fig-10-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/031-fig-10-reviewed.png" width="495" height="444" alt="同一位置分量的EKF估计和95%区域及完整图例" loading="lazy"></a><figcaption>原论文图摘引：N. J. Gordon、D. J. Salmond、A. F. M. Smith，Novel Approach to Nonlinear/Non-Gaussian Bayesian State Estimation，1993，IEE Proceedings F，140(2)：107–113，图 10，PDF 第 6 页；<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。图形与图例分别裁切后重新排列；原版权保留。点击图片可放大。</figcaption></figure>

读图：同一位置分量在约第13步后出现明显偏离，而所报区间较窄；与Bootstrap图配对后才能说明本例中过度自信的问题。
<!-- figure-ref-v6:end:rc-31-figure-10-reviewed -->


<!-- figure-ref-v6:start:rc-31-figure-2 -->
<figure class="reading-evidence-figure" id="rc-31-figure-2"><a href="/robot-classic/assets/figure-refs-v6/031-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/031-fig-2.png" width="484" height="449" alt="图2：EKF后验均值、真实状态和95%概率区间随时间的变化" loading="lazy"></a><figcaption>N. J. Gordon、D. J. Salmond、A. F. M. Smith（1993），图 2，PDF 第 4 页；<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/031-fig-2.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：星形真实状态与估计曲线及置信边界需同时看；狭窄区间若漏掉真值，表示不确定性描述失配，而非估计很精确。
<!-- figure-ref-v6:end:rc-31-figure-2 -->

<!-- figure-ref-v6:start:rc-31-figure-3 -->
<figure class="reading-evidence-figure" id="rc-31-figure-3"><a href="/robot-classic/assets/figure-refs-v6/031-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/031-fig-3.png" width="486" height="451" alt="图3：Bootstrap滤波后验均值、真实状态和95%概率区间" loading="lazy"></a><figcaption>N. J. Gordon、D. J. Salmond、A. F. M. Smith（1993），图 3，PDF 第 4 页；<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/031-fig-3.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：与图2使用同类图例比较；粒子表示改善了该非线性例子的跟踪，但少数时刻仍可能落在经验区间之外。
<!-- figure-ref-v6:end:rc-31-figure-3 -->

<!-- figure-ref-v6:start:rc-31-figure-6 -->
<figure class="reading-evidence-figure" id="rc-31-figure-6"><a href="/robot-classic/assets/figure-refs-v6/031-fig-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/031-fig-6.png" width="488" height="447" alt="图6：目标在平面中的真实轨迹与Bootstrap、EKF估计轨迹" loading="lazy"></a><figcaption>N. J. Gordon、D. J. Salmond、A. F. M. Smith（1993），图 6，PDF 第 5 页；<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/031-fig-6.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：三角形是真实目标位置，实线和虚线分别是两种估计；后段的系统偏离应结合后验形状理解，不能只比平均误差。
<!-- figure-ref-v6:end:rc-31-figure-6 -->

<!-- figure-ref-v6:start:rc-31-figure-7 -->
<figure class="reading-evidence-figure" id="rc-31-figure-7"><a href="/robot-classic/assets/figure-refs-v6/031-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/031-fig-7.png" width="510" height="412" alt="图7：时刻24的500个Bootstrap位置样本与真实目标位置" loading="lazy"></a><figcaption>N. J. Gordon、D. J. Salmond、A. F. M. Smith（1993），图 7，PDF 第 5 页；<a href="https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/031-fig-7.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：点云沿斜向拉伸且不规则，显示位置后验的相关性与非高斯形状；不要把点云中心误当作唯一可信状态。
<!-- figure-ref-v6:end:rc-31-figure-7 -->





<!-- figure-ref-v6:start:rc-31-links-109 -->
本页定位：[图 8缺口说明](#rc-31-figure-8) · [图 9缺口说明](#rc-31-figure-9) · [图 4内嵌图](#rc-31-figure-4)。
<!-- figure-ref-v6:end:rc-31-links-109 -->

原文第 4.1 节给出过程噪声方差 10、观测噪声方差 1；较强过程噪声本身能帮助样本分散。不能据此推断静态地图定位同样不需要样本恢复机制。第 5 节也把更多 Monte Carlo 评估列为后续工作。

### 结果证据：图形之外最重要的限制

**[图 2](#rc-31-figure-2) 与[图 3](#rc-31-figure-3)，页 110：**比较同一序列的 EKF 和 Bootstrap 估计。作者报告 EKF 的标称 95% 区域只在约 30% 时刻包含真值，而样本滤波的区间明显更合理。这支持该实例中的一致性改善；50 个相关时间点不能当作 50 次独立试验，更不能当作严格校准证明。

<!-- figure-ref-v6:start:rc-31-links-115 -->
本页定位：[图 2内嵌图](#rc-31-figure-2) · [图 3内嵌图](#rc-31-figure-3)。
<!-- figure-ref-v6:end:rc-31-links-115 -->

**[图 4](#rc-31-figure-4)，页 110：**比较第 21 步的后验密度。样本核密度估计出现双峰，EKF 的单高斯偏离真值。它直接揭示表示限制，但核密度图还依赖平滑带宽，不能把画出的连续曲线当作精确真后验。

<!-- figure-ref-v6:start:rc-31-links-117 -->
本页定位：[图 4内嵌图](#rc-31-figure-4)。
<!-- figure-ref-v6:end:rc-31-links-117 -->

**[图 6](#rc-31-figure-6)、7，页 111：**轨迹估计及末时刻位置样本显示非高斯偏斜。[图 7](#rc-31-figure-7) 只展示 4000 粒子中的 500 个，不能误读为该跟踪实验只用了 500 粒子。

<!-- figure-ref-v6:start:rc-31-links-119 -->
本页定位：[图 6内嵌图](#rc-31-figure-6) · [图 7内嵌图](#rc-31-figure-7)。
<!-- figure-ref-v6:end:rc-31-links-119 -->

**[图 8](#rc-31-figure-8)–[图 11](https://gaoyichao.com/Xiaotu/papers/1993%20-%20Novel%20approach%20to%20nonlinear%20nonGaussian%20Bayesian%20state%20estimation.pdf#page=6)及第 4.2 节，页 111–112：**分量区间表明 EKF 过于自信，样本方法对这条轨迹更可靠。不过作者承认采用修正极坐标参数化的 EKF 可能更好，因此证据对象是这里的标准实现，不是所有高斯滤波变体。

<!-- figure-ref-v6:start:rc-31-links-121 -->
本页定位：[图 8缺口说明](#rc-31-figure-8) · [图 9缺口说明](#rc-31-figure-9) · [图 10缺口说明](#rc-31-figure-10) · [图 11缺口说明](#rc-31-figure-11)。
<!-- figure-ref-v6:end:rc-31-links-121 -->

**第 4.2 节末尾，页 112–113：**在目标经过观测者附近的高信息阶段，拒绝候选数量可升到约 100000。保留 4000 粒子不意味着每步只做 4000 次传播；这也是不能宣称等算力胜出的原因。这里没有完整消融将粗化和先验编辑的独立贡献分开。

## 五、检查粒子退化、高维成本和置信区间解释

真正的贡献是一个简洁可递归实现的分布近似框架，而不是“随机数总比线性化好”。只要能采样初始状态和过程噪声，并计算观测似然，就能避免求复杂积分的解析式，这是作者第 3.3 节强调的接口条件。

作者承认有限样本保证和防止粒子坍缩的理论还不完善。进一步的分析是：高精度传感器并不总让这个基本算法更容易，窄似然可能让盲目从运动模型抽样变得极低效。模型错误也不会被粒子数自动修复；错误似然会非常自信地保留错误状态。

后验均值适合平方误差意义下的点估计，但在多峰问题中可能位于低概率区域。给规划器传递样本集合或多个模式，有时比传递一个平均位置更有意义。这是面向机器人系统的推论，不是论文报告的导航实验。

## 六、追问：以相同粒子数比较两种提议分布，怎样知道改进来自哪里？

<details>
<summary>以相同粒子数比较两种提议分布，怎样知道改进来自哪里？</summary>

**参考答案**：先固定观测、初始分布和评价量，再记录粒子落入高似然区域的比例与权重分布。提议分布改变了样本从哪里来，权重必须补偿这一改变；一般重要性关系是 $w\propto p/q$，不是只保留测量似然。最后还要计入生成一个粒子的成本。这用[Särkkä第7章的重要性采样讲法](https://users.aalto.fi/~ssarkka/pub/cup_book_online_20131111.pdf#page=137)区分分布近似与计算预算，不把后续提议改进归为1993原论文已有结果。

</details>

## 七、把多假设表示用于视觉与定位

- **模块组合**：[CONDENSATION：暂时保留错误答案，反而能避免彻底跟丢](039-isard-condensation.md)。将采样后验与轮廓似然、运动模型接成视觉跟踪系统。
- **模块组合**：[Monte Carlo Localization：让位置假设跟着证据聚拢](041-mcl.md)。在已知地图上用粒子表示机器人位置。

## 八、自测与参考答案

**问题1：重采样为什么不会把 10 个独特粒子变成 100 个独立的新信息？**

**参考答案：**它只复制已有状态。复制改变经验分布的质量分配，没有增加新的观测或状态候选。之后过程噪声传播可以使副本分离；若无噪声、无其他移动机制，它们会沿相同轨迹前进，数组长度与有效多样性相差很大。

**问题2：测量噪声变小，为什么可能需要更多粒子？**

**参考答案：**Bootstrap 提议只依靠运动模型，不提前利用当前观测。似然越窄，落入其高概率区域的预测样本比例可能越小。归一化后少数粒子占据几乎全部权重，因此估计方差和漏掉模式的风险上升。信息更多与计算更容易是两件事。

**问题3：图上写 95% 区间，是否意味着它一定包含真值 95% 的时间？**

**参考答案：**不是。它通常表示模型后验的 2.5% 到 97.5% 分位区间；实际覆盖还受模型正确性、有限样本误差和评估分布影响。多峰情况下这也不是最短的最高后验密度集合。验证覆盖需要重复数据与明确统计方案，不能只看一条漂亮曲线。
