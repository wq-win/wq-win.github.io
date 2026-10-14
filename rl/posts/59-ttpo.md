# 第 59 天｜TTPO：没有标准答案，测试时还能怎样更新模型

[系列首页](README.md) · [上一篇](58-factor.md) · [下一篇](60-draco.md)

**原论文与版本**：Wang 等，*TTPO: Test-Time Policy Optimization*，2026-08-27。[正文](https://arxiv.org/html/2608.27448v1)。

### 先接住前作的问题

[第52天 GRPO](52-grpo.md)利用同题奖励比较回答，[第53天 R1](53-r1.md)把可验证反馈用于训练阶段的推理增强。测试时若没有真答案，能否只靠当前模型生成的信息继续更新？TTPO把组相对负向更新与答案条件自蒸馏组合起来，新增的是测试题参数适应权限。它和上一篇[FACTOR](58-factor.md)都细分token信号，但没有直接算法继承关系。

## 一、问题设定：无真答案的测试题能提供什么更新信号

测试题可见，标准答案不可用于训练；模型仍能生成多个候选并抽取多数答案。多数票可以提供伪标签，却也会把共同错误当成共识，因此简单把所有一致回答一律强化存在风险。

TTPO分别处理多数一致的正组和不一致的负组，并选择不同token更新。除了检查分支是否互补，本篇还必须问最终用哪个检查点、全部生成与教师计算花了多少；训练无标签并不自动使整个评价流程无标签。

| 要素 | 本文设定 |
|---|---|
| 研究场景 | 无标签训练／测试时参数优化 |
| 状态／观测 | 测试题与生成前缀 |
| 动作 | token |
| 奖励或学习信号 | 多数答案的一致性伪奖励，无真实答案参与更新 |
| 终止／边界 | 生成上限；适应结束检查点需独立规定 |

## 二、拆开答案条件蒸馏与负样本token抑制

它非对称地处理两组回答：与多数答案一致者接受答案条件教师的前向KL蒸馏；不一致者接受负优势策略梯度。教师同样依赖当前模型，但额外看到伪答案并启用规定的思考设置，这是一种训练时特权上下文。

掩码分数为 $s_t=-\log\pi(y_t|x,y_{<t})(1-\widehat H_t)$，保留分数上半部分；这偏向“当前分布熵低、实际采到的token却低概率”的异常位置，不是简单挑最高概率token。

### 正分支Soft-OR与负分支掩码

教学总式 $L=L_{positive\ distill}+\lambda L_{negative\ RL}$。原文例λ=0.1，不能把所有token统一广播当完整TTPO。

**把两条损失真正拆开**：在正组，一条回答的损失是 $L_+=T^{-1}\sum_t w_t\,KL(q_t\|p_t)$，其中 $q_t$ 是看到伪答案的停止梯度教师分布，$p_t$ 是学生分布。$w_t=\hat H_t+\hat\Delta_t-\hat H_t\hat\Delta_t=1-(1-\hat H_t)(1-\hat\Delta_t)$，所以两种归一化信号任一个大就提高权重。负组是 $L_-=-A\,T^{-1}\sum_t m_t\log p_t(y_t)$；$A<0$ 时，最小化损失会降低所选token的概率，$m_t$ 由前文异常分数筛选。$T$ 是有效回答长度，两组各自平均后再以 $\lambda$ 合并；该式没有额外PPO比率裁剪。对应[§3.3—3.5式3—8](https://arxiv.org/html/2608.27448v1#S3.SS3)。

### 把伪标签数量与独立正确证据分开

同一当前模型的64个回答可以彼此相关。多数投票得到更大的组内支持，不等于取得64个独立正确标签；更新再偏向多数会反馈改变下一批的答案分布。

### 错误多数与低概率token的筛选

以下是可手算的教学构造，不是论文实验。

同题生成6条答案，4条为A、2条为B，则多数伪标签为A，即使真实答案恰为B。负分支仍会惩罚两条B，这个反例保留了方法无法消除的自确认风险。

在一条负样本内，token甲的实际概率0.01、归一熵0.1，分数约4.605×0.9=4.14；token乙概率0.8、归一熵0.1，分数约0.223×0.9=0.20。两者同样低熵，甲更可能被选中。低熵是整个分布集中，低概率是已采token落在分布尾部，两者可以同时成立。

## 三、生成64个候选、选训练子集并更新LoRA

```text
对无标签题从当前策略采K=64条回答
抽取答案并确定多数伪答案
划分与伪答案一致／不一致的回答
选训练子集，按正负比例构造batch
正分支：教师以伪答案为条件，计算分布蒸馏与token权重
负分支：构造组优势，筛选高置信相关token做负向更新
某分支为空时显式跳过，不除零
合并损失更新LoRA参数
按预先定义规则选检查点后评估
```

## 四、读正负分支消融，同时审查测试时选点权限

| 实验要素 | 原文设定与证据范围 |
|---|---|
| 环境与任务 | AIME25/26、HMMT25/26、BRUMO25等 |
| 数据来源与规模 | 无标签题与自生成候选；OT训练和测试时训练分开 |
| 对比基线 | OPSD、TTRL、GRPO等按标签权限区分 |
| 训练预算与资源 | Qwen3-1.7/4/8B；LoRA rank64；K64；TTPO100步与部分基线500步 |
| 指标及其含义 | Avg@12平均表现，不是pass@12 |
| 随机性与不确定性 | 重复生成与训练种子区分；原文报告峰值检查点 |
| 实际验证的假设 | 伪教师和正负token分工是否促进无标签适应 |

### 图3：先辨正负更新组合和教师信息

<!-- inline-evidence-v2:start -->

<!-- figure-ref-v6:start:rl-59-figure-3 -->
<span id="rl-59-figure-3"></span>
<!-- figure-ref-v6:end:rl-59-figure-3 -->
<figure class="reading-evidence-figure"><a href="/rl/assets/papers/59-ttpo-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/papers/59-ttpo-figure-3.png" width="1600" height="351" alt="TTPO的正负样本更新策略消融与AIME26平均准确率" loading="lazy"></a><figcaption>原论文图形摘引；Wang等，2026，Figure 3；原HTML图形。<a href="https://arxiv.org/html/2608.27448v1#S4.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>


图3纵轴是AIME26的Avg@12准确率，横轴每根柱表示一对正组 $\mathcal P$/负组 $\mathcal N$ 的更新组合；柱内绿色为前向KL、粉色为GRPO式负更新、白色为不更新。灰水平虚线为基座，标出的短虚线是无答案特权上下文的教师变体。48.9对应这张Qwen3-1.7B消融的正FKL/负RL组合，不是主结果中跨测试集平均45.2；应先读组合，再比较是否用了相同教师信息。

<!-- inline-evidence-v2:end -->

表1的OpenThoughts训练与表2的直接测试时适应是两种数据权限，不能合写成固定权重的独立泛化。后者38.0→45.2增加7.2个百分点、相对约18.9%。[图5](#rl-59-figure-5)比较伪标签、真标签参照与熵；[图6](#rl-59-figure-6)把平均采样与多数投票准确率分开。

<!-- figure-ref-v6:start:rl-59-figure-5 -->
<span id="rl-59-figure-5"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/59-ttpo-figure-5-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/59-ttpo-figure-5-full.png" width="1800" height="640" alt="原论文Figure 5：左侧比较伪标签与真标签参照，右侧比较训练熵。右侧括号内给TTRL步数，不能把双重刻度当成所有方法相同的更新预算。" loading="lazy"></a><figcaption>完整原图摘引｜Wang等，2026，Figure 5；2608.27448v1，HTML S4.F5。<a href="https://arxiv.org/html/2608.27448v1#S4.F5" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2608.27448v1#S4.F5" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：左侧比较伪标签与真标签参照，右侧比较训练熵。右侧括号内给TTRL步数，不能把双重刻度当成所有方法相同的更新预算。
<!-- figure-ref-v6:end:rl-59-figure-5 -->

<!-- figure-ref-v6:start:rl-59-figure-6 -->
<span id="rl-59-figure-6"></span>

<figure class="reading-evidence-figure"><a href="/rl/assets/reference-v6/59-ttpo-figure-6-full.png" target="_blank" rel="noopener noreferrer"><img src="/rl/assets/reference-v6/59-ttpo-figure-6-full.png" width="1800" height="1295" alt="原论文Figure 6：红色虚线为Maj@12，蓝色实线为Avg@12，灰虚线为基座Maj@12。多数投票改善与单次采样平均改善分别报告，不把两种推理预算混成一个准确率。" loading="lazy"></a><figcaption>完整原图摘引｜Wang等，2026，Figure 6；2608.27448v1，HTML S4.F6。<a href="https://arxiv.org/html/2608.27448v1#S4.F6" target="_blank" rel="noopener noreferrer">核对原文与图号</a>。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>；图形仅缩放／重新排版，沿用原许可。原引用定位：<a href="https://arxiv.org/html/2608.27448v1#S4.F6" target="_blank" rel="noopener noreferrer">原文</a>。</figcaption></figure>

读图提示：红色虚线为Maj@12，蓝色实线为Avg@12，灰虚线为基座Maj@12。多数投票改善与单次采样平均改善分别报告，不把两种推理预算混成一个准确率。
<!-- figure-ref-v6:end:rl-59-figure-6 -->

### 训练子集、全部生成与峰值检查点

原文每题生成64条，再选较少回答训练并限制反传token；“只训练8条”不等于只生成8条，组优势也使用全部采样回答。成本还包括教师重评分与LoRA更新。主比较采用Avg@12，并在训练中按评测选峰值检查点；因此虽然参数更新不使用真答案，模型选择仍用到了评测标签。

## 五、错误多数与峰值选点留下的部署问题

多数答案可能错，非对称蒸馏不会把伪标签变成真值。

完全无标签部署还需要独立的停止规则，以及预先固定检查点的成绩。

### 五个前置概念

1. **测试时训练**：部署／评测题上继续修改参数。
2. **伪标签**：由模型自身预测构成的监督。
3. **多数票**：用最常见答案作聚合。
4. **自蒸馏**：模型在不同条件下相互提供目标。
5. **检查点选择**：决定最终报告哪个训练时刻。

## 六、三个值得继续追问的问题与参考答案

<details>
<summary>1. 如何在完全无标签部署中选择停止时刻？</summary>

可预先固定更新步数或生成预算，用只依赖无标签可观察量的规则监测KL、熵塌缩、答案一致性和目标停滞，并在独立开发任务上确定阈值后冻结。多数一致性仍可能对应共同错误，因此不是可靠正确率代理。若论文用真实评测分数选峰值，部署无标签停机尚未被解决；应同时报告预定检查点结果，不能用测试答案暗中选点。

</details>

<details>
<summary>2. 错误多数率怎样影响训练收益？</summary>

错误多数会把错误答案当正组，并惩罚部分真实正确的少数回答，形成自我强化。影响不仅看错误多数率，还看错误组的margin、奖励强度、token筛选与初始正确覆盖。应利用仅用于审计的真标签按伪标签正确/错误分层测梯度与后续表现，做受控标签噪声实验；审计标签不能进入宣称无标签的训练或选点流程。

</details>

<details>
<summary>3. 同样总生成token预算的纯推理基线表现如何？</summary>

应把适应训练生成、teacher/评分调用和最终测试生成全部计入，给固定权重基座相同总token，比较多采样投票、best-of-N及其他预先指定解码。还需报告一次性适应成本如何摊到后续问题，单题与批量场景不同。若原文未完整给出这一预算匹配，无法断言TTPO优于纯推理；目前应把它列为关键未闭合对照。

</details>

## 七、沿未解决的问题继续读

- [DRACO](60-draco.md)：没有可靠训练标签时，是否必须由模型多数票自我提供监督？DRACO改用外部judge动态准则，并采用不同检查点协议，是后续平行反馈路线。（后续平行路线）

- [系列收尾](61-系列收尾.md)：在同样总token与教师调用预算下，参数适应是否优于固定权重多采样？收尾篇继续比较信息权限和成本账本，这项预算匹配仍是待验证问题。（教学收束）

### 原文核对与路线出处

- [原论文与图表入口](https://arxiv.org/html/2608.27448v1)。§3算法与式3—8的非对称目标、token评分；§4及附录测试时预算和峰值检查点协议。
- **模块组合**：[GRPO](52-grpo.md)。组相对奖励用于负分支，正分支由自蒸馏承担，不是原目标的原样复用。
- **教学对应**：[R1](53-r1.md)。都研究推理增强，但R1主要讨论训练阶段流程，TTPO额外允许测试题参数适应。

## 自测两题

第一题考查核心机制，第二题考查边界与辨析。建议先自行作答，再对照参考答案。以下数值小例子均为教学构造。

**问题 1**：没有真实答案，TTPO 从哪里获得训练信号？

**参考答案**：它先由多次采样形成多数票伪答案。与伪答案一致的回答进入答案条件教师蒸馏分支，不一致的回答进入负向 RL 分支，并分别进行 token 选择。它会更新参数，因而不同于只在推理时做多数投票。[原文方法](https://arxiv.org/html/2608.27448v1)

**问题 2**：训练不使用答案，为什么仍需检查检查点选择方式？

**参考答案**：若最后根据真实测试分数挑选最佳检查点，模型选择仍使用了标签信息，无法直接代表无标签部署。应预先指定停止与选择规则，并报告全部适应成本。多数票本身也可能错误，因此伪标签质量与评估协议必须分别检查。

[系列首页](README.md) · [上一篇](58-factor.md) · [下一篇](60-draco.md)
