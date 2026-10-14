# 083｜DPPO：扩散策略如何在线优化回报

[系列首页](README.md) · [上一篇](082-openvla.md) · [下一篇](084-robotwin.md)

**原论文**：*Diffusion Policy Policy Optimization*，Allen Z. Ren 等，2024。[论文](https://arxiv.org/abs/2409.00588)。

### 先接住前作的问题

[Diffusion Policy](061-diffusion-policy.md)从示范学动作分布，却不能单靠监督补齐部署时的失败状态。DPPO保留去噪生成，把内部随机步骤接到PPO，追问怎样用真实奖励改进这种策略而不放弃多模态表示。

## 一、问题设定：多步去噪策略怎样计算可用的更新概率

这是先离线模仿、后在线强化学习的无模型方案。策略可以读取状态或图像，输出连续动作块；没有学习环境模型。奖励来自任务完成或阶段完成，Gym 运动任务则使用原来的稠密奖励。

它与“用 Q 函数梯度指导扩散采样”不同，也与单纯对高回报动作加权回归不同。DPPO 直接提高那些产生较高后续回报的内部去噪决策的概率。

应用范围需要分开：图像控制在仿真 Robomimic 中验证；真实装配使用状态策略，通过 AprilTag 获取物体位姿。不能把两项实验合成“端到端 RGB 策略直接零样本装桌子”。

## 二、把去噪内部决策与环境决策连接起来

困难在于最终动作的概率不好直接计算：动作经过多次随机去噪才产生。DPPO 把每次去噪视为内部决策，将内部过程与真实环境决策连接起来。每个内部转移都有可计算的高斯概率，于是可以使用 PPO 更新。

### 1. 内部去噪不是环境动作

令 $t$ 表示环境决策，$k$ 表示去噪阶段：

$$
A_t^{k-1}\sim
\mathcal N\big(\mu_\theta(A_t^k,s_t,k),\sigma_k^2I\big).
$$

$A_t^K$ 从噪声开始，$A_t^0$ 才是交给控制系统的动作块。内部状态可写成 $(s_t,A_t^k)$，内部动作是下一份更干净的候选 $A_t^{k-1}$。内部去噪期间环境状态不变，完成后才执行动作并接收真实奖励。

因此，10 次去噪不能计为 10 次环境交互。它们增加计算和梯度决策长度，却不等于让机器人实际尝试了 10 种动作。

### 2. 为什么能计算策略梯度

最终边缘概率 $p_\theta(A_t^0\mid s_t)$ 需要对所有内部路径积分，不方便计算；采样路径中每个条件高斯的概率却是显式的。

对教学简化的路径目标：

$$
\nabla_\theta J
\approx\mathbb E\sum_{t,k}
\nabla_\theta\log p_\theta(A_t^{k-1}\mid A_t^k,s_t)\,
\widehat A_{t,k}.
$$

这里用得分函数估计器，不要求对真实环境动力学求导，也不要求把最终回报作为连续可微函数传遍模拟器。回报只是为采样的内部决策提供好坏权重。

### 3. 两类折扣与一个价值基线

环境折扣控制未来物理回报；去噪折扣降低早期高噪声决策的更新权重。教学形式：

$$
\widehat A_{t,k}
=\gamma_{\mathrm{denoise}}^{k-1}\widehat A_t^{\mathrm{env}}.
$$

$\widehat A_t^{\mathrm{env}}$ 可由 GAE 得到，价值函数只依赖环境状态。这个设计避免价值网络额外拟合高度随机的中间动作；是实验支持的偏差—方差取舍，不是对所有问题都成立的最优估计定理。

v1 式 4.6 的求和记号和折扣上标不够清楚。理解时使用标准的“从当前环境时间往后的折扣回报”，不要把印刷表达直接抄成递归调用自身的代码。

### 4. PPO 更新的是内部概率比

定义每个内部转移的新旧概率比 $\rho_{t,k}$，最大化：

$$
\mathbb E\min\left(
\rho_{t,k}\widehat A_{t,k},
\operatorname{clip}(\rho_{t,k},1-\epsilon,1+\epsilon)\widehat A_{t,k}
\right).
$$

这限制局部更新的激进程度。它并不是直接对最终动作的边缘概率使用同一个解析高斯公式；把两者混淆，会改变算法。

论文还区分采样噪声下界与计算概率时使用的下界。前者影响探索，后者避免过小方差造成极大概率比。它们属于实践稳定化选择，不能省略后仍宣称完全复现了算法。

### 5. 只微调部分去噪步骤

可以保留一个冻结预训练网络负责前期高噪声步骤，用可训练副本负责末尾步骤。也可减少采样步数；训练时保持随机性以计算概率，评价时使用确定性采样。

局部去噪更新幅度与整条生成路径不同。教学上，即使十个内部转移的新旧密度比分别都为1.1，该条路径的联合概率比也会是 $1.1^{10}\approx2.59$。这只是假设同一路径上各条件概率比相乘，不能当成最终动作边缘概率比，因为后者还要对内部路径积分。

更重要的是PPO裁剪是代理目标的形状，并非把所有新旧概率比硬限制在区间内。因此“用了小clip”不能单独保证完整去噪策略变化小。原文对clip、噪声下界和末尾步骤微调进行实践选择，正是两层决策链需要额外稳定化的证据。[原文§4与附录D.4](https://arxiv.org/html/2409.00588v1)

### 教学例子与前置概念

**自构例子，未运行**：绕过障碍可以走左边或右边，示范两种都有，但在线奖励只认可右边到达。比较扩散、高斯和混合高斯：除了最终回报，还记录撞障比例、左右路线占比及更新后的分布坍缩。若初始拟合误差不同，先让各模型达到接近的模仿质量再比较，才能避免把预训练差异误认为 RL 优势。

## 三、沿内部高斯转移计算PPO比率

每次去噪有可计算的条件概率，内部过程与环境决策共同构成优化对象。内部步数增加并不增加真实物理转移，两个时间尺度的折扣与成本必须分开。

~~~text
用示范训练扩散行为克隆策略
复制冻结策略和可微调策略，初始化环境价值函数
重复在线训练：
    从当前状态采样噪声动作块
    逐步去噪，记录内部状态、动作与旧概率
    执行最终动作块，记录环境奖励和下一状态
    用环境轨迹计算 GAE 与价值目标
    给不同去噪阶段分配优势权重
    用内部概率比进行 PPO 更新，更新价值函数
固定策略，减少探索噪声进行独立闭环评价
~~~

## 四、分开预训、在线交互与内部去噪预算

论文不仅提出这一表示，还研究哪些去噪步骤需要微调、噪声多大、价值函数应读取什么。实验支持其在若干稀疏奖励操作任务中的稳定性，并展示仿真训练后的真实桌腿装配。

**原图怎么读：** [图7，原论文图注与图像](#paper-083-diffusion-rl-figure-7)。上排是仿真家具任务曲线，下排才是真实One-leg迁移；不能把另一处像素策略结果套到这组依赖状态观测的真机实验。


<!-- figure-ref-v6:start:083-diffusion-rl-license -->
<p>原文标注 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本页摘图仅保留图形区域并作栅格化；有面板重排的图另行注明，作者与原文入口见各图注。</p>
<!-- figure-ref-v6:end:083-diffusion-rl-license -->
<!-- figure-ref-v6:start:e78ca32e1ccc-anchor -->
<a id="paper-083-diffusion-rl-figure-7"></a>
<!-- figure-ref-v6:end:e78ca32e1ccc-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/083-diffusion-rl-s5-f7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/083-diffusion-rl-s5-f7.png" width="1824" height="763" alt="Diffusion Policy Policy Optimization，图7：上排是仿真家具任务曲线，下排才是真实One-leg迁移；不能把另一处像素策略结果套到这组依赖状态观测的真机实验。" loading="lazy"></a><figcaption>实验图原图摘引：Allen Z. Ren 等，2024，HTML S5.F7，图7。<a href="https://arxiv.org/html/2409.00588v1#S5.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 实验组 | 数据和任务 | 评价问题 |
|---|---|---|
| Gym | 三个运动环境，D4RL medium 预训练，稠密奖励 | 一般连续控制微调 |
| Robomimic 状态 | 300 条多人示范，四任务 | 稀疏操作奖励下的稳定性 |
| Robomimic 图像 | 100 条示范，任务对应相机视角 | 视觉策略能否继续学 |
| Furniture-Bench | 每任务 50 条模拟人类示范，三种装配、两档随机性 | 长时序和接触鲁棒性 |
| 真机 | One-leg，各方法 20 次 | 仿真到真实装配迁移 |
| 重复统计 | Gym 5 种子，主要操作实验 3 种子 | 训练随机性 |
| 并行采样 | Robomimic 50 环境；家具 1000 环境 | 交互成本与并行效率 |

不同策略的预训练轮数不相同，例如家具任务扩散与高斯使用不同 epoch 数；参数规模、架构也不完全一致。论文努力调优基线并保持动作块可比，但不能把结果解释为严格等总计算的分布族比较。

家具奖励包含阶段完成指标，不是只在整个装配结束才给唯一奖励。硬件使用物体标签定位和坐标标定；随机化噪声也参考了静止硬件观测。这意味着“没有真机策略微调”不等于完全没用真机测量信息。

### 五组证据：结果与机制分开

**[图5](#paper-083-diffusion-rl-figure-5)：不同扩散 RL 方法。** DPPO 在稀疏操作任务尤其 Transport 中有优势，Gym 上部分方法也有竞争力。这支持任务相关的稳定性收益，不支持所有离策略算法必然不适合扩散。

<!-- figure-ref-v6:start:64fc4a0b6dee -->
<a id="paper-083-diffusion-rl-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/083-diffusion-rl-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/083-diffusion-rl-v6-figure-5.png" width="2132" height="923" alt="Diffusion Policy Policy Optimization，图5：不同扩散 RL 方法。 DPPO 在稀疏操作任务尤其 Transport 中有优势，Gym 上部分方法也有竞争力。这支持任务相关的稳定性收益，不支持所有离策略算法必然不适合扩散。" loading="lazy"></a><figcaption>原图摘引：Allen Z. Ren 等，2024，HTML S5.F5，图5。<a href="https://arxiv.org/html/2409.00588v1#S5.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。不同扩散 RL 方法。 DPPO 在稀疏操作任务尤其 Transport 中有优势，Gym 上部分方法也有竞争力。这支持任务相关的稳定性收益，不支持所有离策略算法必然不适合扩散。</figcaption></figure>
<!-- figure-ref-v6:end:64fc4a0b6dee -->


**[图6](#paper-083-diffusion-rl-figure-6)：不同动作分布。** 状态 Transport 达到超过 90% 的表现，视觉困难任务中也表现较强。较容易任务差距较小，说明多步去噪优势并不在所有任务上同样明显。

<!-- figure-ref-v6:start:067872ca7300 -->
<a id="paper-083-diffusion-rl-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/083-diffusion-rl-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/083-diffusion-rl-v6-figure-6.png" width="2132" height="558" alt="Diffusion Policy Policy Optimization，图6：不同动作分布。 状态 Transport 达到超过 90% 的表现，视觉困难任务中也表现较强。较容易任务差距较小，说明多步去噪优势并不在所有任务上同样明显。" loading="lazy"></a><figcaption>原图摘引：Allen Z. Ren 等，2024，HTML S5.F6，图6。<a href="https://arxiv.org/html/2409.00588v1#S5.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。不同动作分布。 状态 Transport 达到超过 90% 的表现，视觉困难任务中也表现较强。较容易任务差距较小，说明多步去噪优势并不在所有任务上同样明显。</figcaption></figure>
<!-- figure-ref-v6:end:067872ca7300 -->


**[图7](#paper-083-diffusion-rl-figure-7)：真机。** DPPO 为 16/20，即 80%；高斯微调在模拟中 88%，真实为零；加入行为克隆约束后真实为 50%。这说明模拟高回报不足以保证部署，也显示合理基线改进能缩小差距。20 次试验仍不足以证明跨家具、跨硬件普遍可靠。

**[图8](#paper-083-diffusion-rl-figure-8)：纠错行为。** 示例展示插入失败后的修正，说明强化学习可能扩展示范之外的状态覆盖。但展示轨迹不能单独量化所有扰动下的恢复概率，需要随机扰动和预先定义的成功标准。

<!-- figure-ref-v6:start:47d90d4d76ee -->
<a id="paper-083-diffusion-rl-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/083-diffusion-rl-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/083-diffusion-rl-v6-figure-8.png" width="2132" height="1740" alt="Diffusion Policy Policy Optimization，图8：纠错行为。 示例展示插入失败后的修正，说明强化学习可能扩展示范之外的状态覆盖。但展示轨迹不能单独量化所有扰动下的恢复概率，需要随机扰动和预先定义的成功标准。" loading="lazy"></a><figcaption>原图摘引：Allen Z. Ren 等，2024，HTML S5.F8，图8。<a href="https://arxiv.org/html/2409.00588v1#S5.F8" target="_blank" rel="noopener noreferrer">核对原文</a>。纠错行为。 示例展示插入失败后的修正，说明强化学习可能扩展示范之外的状态覆盖。但展示轨迹不能单独量化所有扰动下的恢复概率，需要随机扰动和预先定义的成功标准。</figcaption></figure>
<!-- figure-ref-v6:end:47d90d4d76ee -->


**§6 与附录 B：探索解释和消融。** 简化绕障任务支持扩散探索更贴近已有行为分布，以及噪声和去噪阶段设计影响稳定性。这是机制证据和作者推断，尚非“策略永不离开安全流形”的定理。

附录 D.4 关于 clipping 的文字方向与给出的阶段比值容易产生歧义：文字说早期更大，而索引关系给出另一种直观读法。复现应按代码版本核实具体调度，不能凭一句文字决定实现。该疑点不否定实验结果，但影响精确复现。

## 五、奖励改进仍受支持和控制接口约束

多步采样和保存去噪路径增加计算、显存；论文说明与部分其他策略参数化相比墙钟可更慢。样本效率、最终成功率、计算速度应分别比较，不能看到更陡的交互曲线就说训练更快。

我的分析是，它尤其适合已有相对可用示范、在线奖励可信的情况。若初始策略几乎永远到不了任何奖励区域，扩散结构并不能凭空产生正确技能；如果成功判据奖励危险捷径，PPO 仍会沿奖励优化。

### 五个前置概念

五个前置概念：**动作块**代表多个未来控制量；**去噪链**逐步生成动作样本；**得分函数梯度**通过采样概率优化回报；**GAE**估计动作相对基线的优势；**域随机化**改变训练环境分布以提高鲁棒性。

### 追问：减少可训练去噪步骤时，怎样区分节省计算与限制改进能力？

参考答案：固定预训练策略和环境交互预算，改变被微调的步骤集合，另外记录梯度计算和采样延迟。只更新部分步骤保留更多原分布结构，也可能限制策略摆脱次优模式。最终回报、示范保持和样本覆盖应共同查看，不能只用相同环境步数断言优化工作量相同。

## 六、沿机制关系继续读

DPPO直接从[Diffusion Policy](061-diffusion-policy.md)式示范策略出发，组合PPO优化内部去噪决策；与[AWAC](039-awac.md)是平行的示范后改进路线，前者主要在线on-policy采样，后者依赖离策略价值与回放。

## 七、自测三题与参考答案

**问题1：为什么不需要知道最终动作的精确边缘概率？**

答案：可以把内部随机去噪决策一起纳入扩展 MDP，针对已采样路径的条件概率求策略梯度。每步高斯可计算，不必先对全部内部路径积分。

**问题2：去噪十步是否意味着环境样本量增加十倍？**

答案：不是。内部候选只在计算图中变化，最终动作才送到环境。去噪增加计算成本和内部信用分配长度，不能算成十次物理交互。

**问题3：真实 80% 装配是否证明视觉策略已泛化到任意家具？**

答案：不能。硬件实验是特定 One-leg 任务的状态策略，依赖 AprilTag 位姿和标定。视觉输入结果来自另一组仿真实验，不能将二者合并成未做过的实验结论。
