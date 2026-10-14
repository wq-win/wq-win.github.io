# 第 09 天｜自然策略梯度：同样改一个参数，行为变化为什么不同

[系列首页](README.md) · [上一篇](08-policy-gradient-theorem.md) · [下一篇](10-lspi.md)

**原论文与版本**：*A Natural Policy Gradient*，2001。[原论文](https://proceedings.neurips.cc/paper/2001/file/4b86abe48d358ecf194c56c69108433e-Paper.pdf)。

### 先接住前作的问题

[策略梯度定理](08-policy-gradient-theorem.md)给出更新方向，并把兼容价值近似写成score特征的拟合问题。它仍留下一个几何问题：同样长度的参数位移，在不同坐标中可能引起完全不同的动作概率变化。本篇直接承接兼容近似与策略梯度，用Fisher度量行为分布的局部变化。

## 一、问题设定：参数步幅相同，为何行为分布变化差很多

把一个概率参数的单位放大，普通梯度的数值也会改变；但智能体面对的行为选择未必改变。自然策略梯度希望按“策略分布改了多少”衡量一步，而不是按参数表面距离衡量一步。这个要求只先定义局部方向，还没有替代步长选择。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 可微随机策略的单智能体策略搜索 |
| 状态／观测 | MDP 状态；实验含 LQG 和 Tetris 特征 |
| 动作 | 策略输出的控制／放置动作 |
| 奖励或学习信号 | 任务收益或负成本 |
| 终止／边界 | 按任务定义回合或持续目标 |

## 二、从局部 KL 约束解出 Fisher 方向

普通梯度把参数空间中的欧氏长度当作更新大小。但策略参数是概率分布的坐标：同样的参数距离，不一定代表同样的行为变化。对旧策略到新策略的KL做局部展开，一阶项为零，二阶项由Fisher矩阵刻画。

因此可以解一个局部问题：最大化 $g^\top\Delta$，约束 $\frac12\Delta^\top F\Delta\le\delta$。拉格朗日条件给出 $g=\eta F\Delta$，所以方向是 $F^{-1}g$；预算只决定这个方向的尺度。所谓“自然”来自策略分布几何，不是自动找到更高回报的神奇步长。

兼容近似进一步解释了这个方向：若 $A\approx\psi^\top w$ 且加权最小二乘条件成立，就有 $Fw=g$。自然梯度等于拟合出的w。实际Fisher可能奇异，阻尼及近似求解会改变精确坐标不变性质，也增加计算成本。

### 由Fisher矩阵量化行为敏感性

$$g=\nabla J,\quad F=\mathbb E[\nabla\log\pi\nabla\log\pi^\top],\quad \tilde g=F^{-1}g.$$
局部 $D_{KL}(\pi_\theta\|\pi_{\theta+\Delta})\approx\frac12\Delta^\top F\Delta$。实现通常解线性系统而不求显式逆，阻尼 F+ηI 是数值近似。

### 用一维重参数化检查几何含义

若只把坐标改为 $\theta=c\varphi$，链式法则给 $g_\varphi=cg_\theta$、$F_\varphi=c^2F_\theta$。自然方向映回原坐标为 $cF_\varphi^{-1}g_\varphi=F_\theta^{-1}g_\theta$；普通梯度没有同样的抵消。这里假设非零尺度且F可逆。

### 把两个方向缩放到同一KL预算再比较

以下是可手算的教学构造，不是论文实验。

设 $g=(1,1)^\top,F=\mathrm{diag}(100,1)$。普通方向(1,1)把同样步幅给两维，局部KL为50.5倍尺度平方；自然方向(0.01,1)的局部KL为0.505倍尺度平方。

第一维的行为敏感性更高，因此自然方向压低它。比较两者必须再缩放到相同KL预算，否则只是比较了不同大小的更新。Fisher的估计若不准，这个几何判断也会偏。

## 三、求解带阻尼线性系统并检查实际 KL


```text
采集当前策略数据
估计普通梯度 g
构建 Fisher 矩阵或 Fisher-vector product
解 (F+ηI)d = g
按选定步长／局部 KL 尺度设置 Δθ
θ ← θ+Δθ
重新评估策略并采集新数据
输出：更新后的策略
```

**实现要点**：估计 Fisher 与求解线性系统有成本，近似会改变保证。

## 四、读优化路径与 Tetris 迭代曲线

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | §5：LQG、简单 MDP、Tetris |
| 数据来源与规模 | 策略生成经验 |
| 对比基线 | 普通梯度、近似贪心策略迭代等 |
| 训练预算与资源 | 迭代尺度按各图；硬件和完整样本账本本文未核实 |
| 指标及其含义 | 成本、平均回报、Tetris 得分 |
| 随机性与不确定性 | 全部随机重复与误差区间本文未核实 |
| 实际验证的假设 | 改变几何能否缓解普通梯度的平台现象 |

**实验解读（本文分析）**：[图2](#rl-09-figure-2)的Tetris实验用手工特征与参数化策略比较优化轨迹，横轴是迭代。图注还明确说Fisher加了10⁻³I的稳定项，并在较小棋盘上观察普通梯度最终达到类似表现。它支持优化效率差异，不能据此声称自然梯度拥有更强表示能力，或迭代少就必然总耗时低。

### 辨认各面板的线性与对数迭代轴

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:anchor-rl-09-figure-2 -->
<span id="rl-09-figure-2"></span>
<!-- figure-ref-v6:end:anchor-rl-09-figure-2 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/09-natural-policy-gradient-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/09-natural-policy-gradient-figure-2.png" width="1107" height="264" alt="Tetris中标准梯度、自然梯度及不同棋盘设置的积分学习曲线" loading="lazy"></a><figcaption>原论文图形摘引；Kakade，2001，Figure 2, PDF第7页；仅图形区域。<a href="https://proceedings.neurips.cc/paper/2001/file/4b86abe48d358ecf194c56c69108433e-Paper.pdf#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>


<!-- inline-evidence-v2:end -->


自然梯度与兼容近似的理论桥梁说明为何用Fisher几何处理参数尺度。[图1](#rl-09-figure-1)的LQG等构造比较等价策略参数化下的优化路径，读图时要注意部分横轴取log时间；[图2](#rl-09-figure-2)的Tetris纵轴是points：A面板横轴为log迭代，B/C面板是线性迭代，且C改变了游戏高度与计算配置。它们支持所测参数化和任务中的方向/速度差异，但没有把Fisher估计与线性求解成本从比较中消除，也不能外推所有深网。 [查看原文](https://proceedings.neurips.cc/paper/2001/file/4b86abe48d358ecf194c56c69108433e-Paper.pdf)。

<!-- figure-ref-v6:start:rl-09-figure-1 -->
<figure class="reading-evidence-figure" id="rl-09-figure-1"><a href="/rl/assets/reference-v6/09-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/09-figure-1.png" width="1125" height="360" alt="A面板比较参数缩放后的LQG成本，横轴取log时间；B给出两状态任务，C比较奖励随时间变化，D画参数空间轨迹。应先区分任务表现与参数路径，再判断自然梯度为何减少尺度造成的绕路。" loading="lazy"></a><figcaption>原论文图形摘引｜Kakade，2001，图1，PDF第6页。<a href="https://proceedings.neurips.cc/paper/2001/file/4b86abe48d358ecf194c56c69108433e-Paper.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a> · 点图放大。原版权保留，仅摘引供本段具体评论的图形区域。</figcaption></figure>

A面板比较参数缩放后的LQG成本，横轴取log时间；B给出两状态任务，C比较奖励随时间变化，D画参数空间轨迹。应先区分任务表现与参数路径，再判断自然梯度为何减少尺度造成的绕路。
<!-- figure-ref-v6:end:rl-09-figure-1 -->

## 五、分清参数化几何、数值近似与步长

理想自然梯度讨论参数化几何，实际还需估计Fisher并求解线性系统。奇异矩阵、有限样本噪声、阻尼近似和大步长都会影响方向与局部KL近似；迭代更少不自动抵消每步计算成本，也不提供自动最优学习率。

### 五个前置概念

1. **Fisher 信息**：刻画分布对参数扰动的敏感性。
2. **KL 散度**：比较两个概率分布。
3. **预条件化**：按曲率调整梯度方向。
4. **局部近似**：只在足够小的步长附近可靠。
5. **阻尼**：改善线性系统数值稳定性。

## 六、继续追问：Fisher样本、收益与预条件化

<details>
<summary>1. Fisher 估计样本不够时方向会怎样变？</summary>

经验 Fisher 可能秩亏或病态，逆运算会放大低特征值方向的采样噪声，使同一个梯度产生很不稳定的更新。常用阻尼求解 $(\hat F+\eta I)d=g$、共轭梯度提前停止或低秩近似，但这些会改变理想自然梯度。应比较重复批次的方向夹角、线性求解残差和实际 KL；“算出了逆矩阵”并不说明方向可信。

</details>

<details>
<summary>2. 相同 KL 步长是否保证相同回报提升？</summary>

不保证。KL 描述策略分布变化大小，回报提升还取决于优势与更新方向、访问分布变化及高阶项。两个方向可以具有同样局部 KL，但一个提高高优势动作概率，另一个恰好相反；平均 KL 还可能掩盖罕见关键状态的大变化。自然梯度只在局部线性目标、二次 KL 近似下给出最陡方向，不是固定 KL 对应固定收益的定律。

</details>

<details>
<summary>3. 自然梯度与 Adam 的预条件化有何区别？</summary>

自然梯度用策略分布的 Fisher 度量校正参数几何，理想形式具有重参数化不变性；Adam 用历史梯度的一阶与逐坐标二阶矩调节步幅，通常忽略跨参数相关，且二阶矩不等于 Fisher。二者都可表现为预条件化，但所定义的“距离”和估计目标不同。阻尼、有限批次与对角近似又会削弱自然梯度的理想不变性。

</details>

## 七、从局部方向继续控制实际更新幅度

- **直接方法承接**：[TRPO](14-trpo.md)。自然方向尚未告诉我们实际一步能走多远；TRPO把KL检查和回溯接入受限策略更新。
- **理论回看**：[策略梯度定理](08-policy-gradient-theorem.md)。若兼容拟合的权重或一阶条件改变，Fisher方向的那条理论联系也需要重新核对。

- [原论文与图表入口](https://proceedings.neurips.cc/paper/2001/file/4b86abe48d358ecf194c56c69108433e-Paper.pdf)。自然梯度和兼容近似推导；§5[图2](#rl-09-figure-2)及其图注。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：为什么“参数只改变一点点”不等于“策略只改变一点点”？

**参考答案**：不同参数对动作概率的敏感程度不同。同样的参数位移，可能几乎不改变行为，也可能使动作概率骤变。自然梯度使用 Fisher 信息矩阵衡量这种敏感性：

$$
\Delta\theta\propto F^{-1}\nabla_\theta J
$$

它关注局部行为分布的变化尺度。

**问题 2**：自然梯度是否保证每次更新都提升真实回报？

**参考答案**：不保证。它提供局部几何方向，但实际还受步长、有限样本、Fisher 近似和价值估计误差影响。即使方向合理，走得太远也可能失效。自然梯度与完整的性能改进保证不是同一个概念。

[系列首页](README.md) · [上一篇](08-policy-gradient-theorem.md) · [下一篇](10-lspi.md)
