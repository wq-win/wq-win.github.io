# 034｜RLBench：面向视觉操作的任务集合

[系列首页](README.md) · [上一篇](033-mbpo.md) · [下一篇](035-rubiks.md)

**原论文**：*RLBench: The Robot Learning Benchmark & Learning Environment*，Stephen James 等，2019。[论文](https://arxiv.org/abs/1909.12271)。

### 先接住前作的问题

[One-shot 模仿](019-one-shot.md)把新示范作为任务上下文，但“一条示范适应新任务”仍依赖一个先决条件：测试到底换了物体摆放、目标属性，还是操作结构？RLBench把这个常被算法分数遮住的问题变成任务层级、示范生成器和留出协议。这是评测问题上的联系，不表示它继承One-shot的策略网络；同一基准也可以服务于不同学习目标。

## 一、问题设定：一次测试究竟换了什么

如果两个机器人算法分别在自建的三个任务上测试，即使各自成功率都很高，也难以知道谁更通用。一个方法可能只是选择了更容易的物体、初始位置或成功条件。RLBench 试图解决的首先是**研究如何比较**，其次才是机器人如何学习。

“拿红苹果”和“拿绿苹果”算两个任务吗？“拿苹果”和“打开抽屉”又是什么关系？如果论文可以随意命名，很容易把微小外观变化包装成跨任务泛化。

RLBench 区分三个层次：

- **任务**：操作结构，例如堆叠物块。
- **变体**：同一任务中改变目标对象、颜色或要求。
- **回合**：特定变体中的一次场景配置与执行。

这不是语言游戏，而是决定训练—测试泄漏的位置。若训练和测试只是物体坐标不同，结果支持空间配置泛化；若测试要求完成以前没有训练过的操作结构，才接近新任务适应。

原论文版本提供一百种手工设计任务，使用桌面机械臂和多种观察。它允许强化学习、模仿学习、多任务学习等路线，但这些路线不必共享同一训练目标。任务完成给出稀疏成功反馈，状态或观察、动作接口则有多种选择。

动作空间尤其不能省略。直接输出关节力矩，与输出末端位姿并调用运动规划器执行，算法承担的困难不同。两篇文章都写“RLBench 成功率”，若接口不同，仍不能直接认为分数可比。

### 用三种杯子测试辨认留出层级

**自构例子，未运行**：研究者训练机器人把杯子放到架上。测试A只移动杯子起点；测试B换成另一颜色杯子；测试C要求先打开柜门再放杯子。A主要考配置变化，B考目标或外观变体，C可能涉及新操作结构。即使三者都得到八成成功，也不应该统称为同一种泛化。

一个有用的自查是写下“测试变化由哪个变量产生”。如果连任务、变体、回合都没有区分，成功率再精确也难解释。

## 二、用任务层级和成功谓词规定题目

先把泛化问题落实到能采样的变量，再定义成功。图4是任务层级的说明图，不是一个模型已经学会泛化的实验曲线。

**原图怎么读：** [图4，原论文图注与图像](#paper-034-rlbench-figure-4)。树状层级分开任务、变体和回合：变体改目标属性，回合改具体摆放。比较新任务泛化前，先确认留出的是这一层级中的哪一层。


<!-- figure-ref-v6:start:df0331fa188e-anchor -->
<a id="paper-034-rlbench-figure-4"></a>
<!-- figure-ref-v6:end:df0331fa188e-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/034-rlbench-s3-f4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/034-rlbench-s3-f4.png" width="1526" height="517" alt="RLBench: The Robot Learning Benchmark &amp; Learning Environment，图4：树状层级分开任务、变体和回合：变体改目标属性，回合改具体摆放。比较新任务泛化前，先确认留出的是这一层级中的哪一层。" loading="lazy"></a><figcaption>方法图原图摘引：Stephen James 等，2019，HTML S3.F4，图4。<a href="https://arxiv.org/html/1909.12271v1#S3.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

基础场景负责机械臂、桌面、相机、物理交互。任务文件负责对象、变体初始化、语言描述和成功条件。这个分层使新增任务不必重写整个仿真平台。

一种教学性表示是：

$$
\mathcal T=\{\nu_1,\ldots,\nu_m\},\qquad
\xi\sim p(\xi\mid\nu),\qquad
\tau\sim p(\tau\mid\pi,\xi).
$$

$\mathcal T$ 是任务，$\nu$ 是变体，$\xi$ 是回合配置，$\tau$ 是执行轨迹。前两个采样决定“考试出什么题”，最后一个分布才包含策略如何作答。

这里没有要最小化的新 RLBench 损失函数。一个行为克隆方法可以最小化专家动作误差，一个强化学习方法可以最大化完成奖励。基准应该固定题目与评分方式，让方法保留合理自由，而不是让方法通过修改评分获得优势。

### 目标位置正确还不够：检查成功条件

任务名是给人看的，代码里的条件才决定算法得分。例如“取下锅盖”可能需要物体到达检测区域，并且仍被夹爪持有。只判断空间位置，会容许另一种行为：把盖子碰飞到目标区域。

可用逻辑条件写出一个教学例子：

$$
\mathrm{success}(s)
=\mathrm{held}(s,\mathrm{lid})
\land\mathrm{inside}(s,\mathrm{lid},\mathrm{target}).
$$

这说明为什么奖励定义不能只看自然语言描述。条件过弱会允许奖励投机；条件过强也可能把合理完成方式判为失败。研究者应检查具体任务谓词，而非笼统假定“成功”完全对应人类意图。

## 三、从航点生成示范，同时记录哪些尝试被过滤

任务和成功条件固定以后，才知道示范生成器该完成什么。航点规划降低了重复采集成本，却同时决定哪些行为会出现在训练数据里。

任务设计者给出关键运动位置和操作逻辑，规划器连接航点，形成可重复生成的专家轨迹。生成示范不意味着每个可能场景都一定规划成功；系统还提供任务验证工具来检查可执行性。

它与人工遥操作数据的区别值得认真理解。规划器示范具有较一致的结构和动作风格，便于控制数据量；但这种风格未必代表人类或真实机械臂会产生的恢复动作。

“可以持续生成示范”描述生成能力，不能在实验表中写成训练数据量无限。实际方法必须记录用了多少条轨迹、哪些变体、多少次失败后重采样。否则数据规模会成为隐形超参数。

航点生成器还隐含动作分布：如果示范全为平滑无碰撞规划，学到的策略未必见过接触后撤回重试。评估恢复能力应加入独立扰动回合，而不是把生成器可用的无限随机初态当成恢复示范覆盖。原文将任务、变体与示范生成工具分开，正给这种协议审查留下接口。[原文§IV](https://arxiv.org/html/1909.12271)

## 四、切开训练、适应和评分的信息权限

生成器可以反复调用，不代表测试任务的信息也可以无限使用。少样本评测要在这里切开权限：哪些任务用来学共享能力，哪K条示范用来适应，哪些新回合只用于评分。

先在训练任务上学习可复用能力，再给未见任务少量示范，最后在新的回合配置中评估。这里的少样本数量指**测试任务提供的示范数**，不是整个系统一生只看过几条数据。

用教学公式表示：

$$
\pi_{\mathcal T}^{\mathrm{adapt}}
=A(\theta,D_{\mathcal T}^{K}),\qquad
S_K=\mathbb E_{\mathcal T,\xi}
[\mathbf1\{\mathrm{success}(\pi_{\mathcal T}^{\mathrm{adapt}},\xi)\}].
$$

$\theta$ 是训练任务学到的参数，$A$ 可以是微调、记忆或条件推理，$D_{\mathcal T}^{K}$ 是新任务的 $K$ 条示范。不同 $A$ 都可研究，但测试信息必须清楚界定。

~~~text
固定基准版本、观察模式、动作模式和任务划分
对训练任务：
    选择变体与回合配置
    用规划器生成指定数量示范
    按所研究方法训练共享参数

对每个未见测试任务：
    抽取 K 条适应示范
    由方法产生适应该任务的策略
    对独立的新回合配置：
        重置场景
        只用允许的观察执行策略
        根据固定成功条件评分
汇报每任务结果与跨任务平均，保留随机种子和失败记录
~~~

这段是评估流程的教学化整理，不是原论文发布了某个可直接运行的少样本算法。它刻意强调适应数据与评估回合分离：不能拿同一段示范的初始配置反复调参后，再称之为新配置泛化。

### 先决定成功率按什么单位平均

基准的平均值必须先选清楚抽样单位。教学例：任务A有100个变体、成功80%，任务B只有1个变体、成功0%。按变体平均约79.2%，按任务等权平均却是40%。两个数字都能计算，但回答的问题不同，不能只写“平均成功率”。此外同一任务的语言改写也不自动算作新的物理技能。

## 五、把平台能力与算法成绩分开验收

这套流程给出了可比较的试验合同，但原论文没有用一个新策略在一百个任务上证明合同已被满足。因此下面逐项核对的是平台提供了什么，以及做算法比较时还欠哪些记录。

它提供统一操作场景、丰富任务、可生成的规划器示范和任务构建工具，并提出少样本测试协议。读这篇论文时，不应该寻找一个不存在的“新损失函数胜过 PPO”的故事。它的贡献属于研究基础设施。

RLBench 原始论文主要描述平台与挑战，没有报告一套新学习算法在全部任务上的训练曲线。下面相应区分平台属性和后续方法应报告的内容。

| 项目 | 原论文内容 | 做方法比较时还需要固定 |
|---|---|---|
| 任务集合 | 一百种任务及变体 | 具体版本、所选任务、是否全量 |
| 示范 | 规划器结合航点生成 | 实际轨迹数、失败过滤、数据种子 |
| 观察 | 图像、深度、分割及本体信息等接口 | 到底启用了哪些；是否特权信息 |
| 动作 | 多种关节或末端控制接口 | 控制频率、执行器与规划调用 |
| 指标 | 完成与否；少样本协议 | 回合数、每任务均值、不确定性 |
| 训练预算 | 未提出统一算法训练结果 | 更新次数、算力、调参和适应成本 |

原文挑战保留一部分任务做测试，并建议比较不同示范数量。后来的论文若使用另一任务子集或固定变体，是新的实验协议，不能把其结果直接贴到原始挑战名下。

对于随机性，生成场景种子、示范种子与模型训练种子承担不同作用。只改变环境初始位置、保持模型权重不变，衡量的是该策略的场景波动；训练多个模型才涉及优化稳定性。两者最好分别报告。

以下依据[原文第III—VI节](https://arxiv.org/html/1909.12271)。

1. **[图1](#paper-034-rlbench-figure-1)，任务示例**：展示多样操作结构，支持集合的广度；不能证明某个模型已经掌握这些任务。
2. **[图2](#paper-034-rlbench-figure-2)、[图3](#paper-034-rlbench-figure-3)，场景与观察**：说明传感器和输入选择，支持平台可用于视觉研究；不意味着每个方法都使用完全相同的信息。
3. **[图4](#paper-034-rlbench-figure-4)，任务层次**：解释任务、变体和回合的区别，是判断泛化类型的重要依据；它不是泛化性能实验。
4. **[图6](#paper-034-rlbench-figure-6)，任务代码示例**：展示成功条件如何落实为程序逻辑；说明可扩展性，不自动证明所有任务条件都无漏洞。
5. **[图7](#paper-034-rlbench-figure-7)，描述与示范长度统计**：显示语言和时间长度的变化；图中示范约百至千步的范围不能当作每个任务的统一评估时限。

<!-- figure-ref-v6:start:134cc564a94d -->
<a id="paper-034-rlbench-figure-1"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/034-rlbench-v6-figure-1.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/034-rlbench-v6-figure-1.png" width="1670" height="646" alt="RLBench: The Robot Learning Benchmark &amp; Learning Environment，图1：展示多样操作结构，支持集合的广度；不能证明某个模型已经掌握这些任务。" loading="lazy"></a><figcaption>原图摘引：Stephen James 等，2019，HTML S1.F1，图1。<a href="https://arxiv.org/html/1909.12271v1#S1.F1" target="_blank" rel="noopener noreferrer">核对原文</a>。展示多样操作结构，支持集合的广度；不能证明某个模型已经掌握这些任务。</figcaption></figure>
<!-- figure-ref-v6:end:134cc564a94d -->
<!-- figure-ref-v6:start:bb7b4a56f112 -->
<a id="paper-034-rlbench-figure-2"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/034-rlbench-v6-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/034-rlbench-v6-figure-2.png" width="2132" height="1608" alt="RLBench: The Robot Learning Benchmark &amp; Learning Environment，图2：说明传感器和输入选择，支持平台可用于视觉研究；不意味着每个方法都使用完全相同的信息。" loading="lazy"></a><figcaption>原图摘引：Stephen James 等，2019，HTML S3.F2，图2。<a href="https://arxiv.org/html/1909.12271v1#S3.F2" target="_blank" rel="noopener noreferrer">核对原文</a>。说明传感器和输入选择，支持平台可用于视觉研究；不意味着每个方法都使用完全相同的信息。</figcaption></figure>
<!-- figure-ref-v6:end:bb7b4a56f112 -->
<!-- figure-ref-v6:start:fb81eb67ac04 -->
<a id="paper-034-rlbench-figure-3"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/034-rlbench-v6-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/034-rlbench-v6-figure-3.png" width="1720" height="1688" alt="RLBench: The Robot Learning Benchmark &amp; Learning Environment，图3：说明传感器和输入选择，支持平台可用于视觉研究；不意味着每个方法都使用完全相同的信息。" loading="lazy"></a><figcaption>原图摘引：Stephen James 等，2019，HTML S3.F3，图3。<a href="https://arxiv.org/html/1909.12271v1#S3.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。说明传感器和输入选择，支持平台可用于视觉研究；不意味着每个方法都使用完全相同的信息。</figcaption></figure>
<!-- figure-ref-v6:end:fb81eb67ac04 -->
<!-- figure-ref-v6:start:c75a0642909d -->
<a id="paper-034-rlbench-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/034-rlbench-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/034-rlbench-v6-figure-6.png" width="1024" height="912" alt="RLBench: The Robot Learning Benchmark &amp; Learning Environment，图6：展示成功条件如何落实为程序逻辑；说明可扩展性，不自动证明所有任务条件都无漏洞。" loading="lazy"></a><figcaption>原图摘引：Stephen James 等，2019，PDF第5页，图6。<a href="https://arxiv.org/pdf/1909.12271v1#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。展示成功条件如何落实为程序逻辑；说明可扩展性，不自动证明所有任务条件都无漏洞。<a href="https://arxiv.org/html/1909.12271v1#S4.F6" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:c75a0642909d -->
<!-- figure-ref-v6:start:bc02e3fa0c73 -->
<a id="paper-034-rlbench-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/034-rlbench-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/034-rlbench-v6-figure-7.png" width="2132" height="1104" alt="RLBench: The Robot Learning Benchmark &amp; Learning Environment，图7：显示语言和时间长度的变化；图中示范约百至千步的范围不能当作每个任务的统一评估时限。" loading="lazy"></a><figcaption>原图摘引：Stephen James 等，2019，HTML S5.F7，图7。原面板按源顺序重新排版，数据未改。<a href="https://arxiv.org/html/1909.12271v1#S5.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。显示语言和时间长度的变化；图中示范约百至千步的范围不能当作每个任务的统一评估时限。</figcaption></figure>
<!-- figure-ref-v6:end:bc02e3fa0c73 -->


因此，本文可支持的最重要结论是“构建了可研究这些问题的平台”，不是“解决了少样本操作”。作者对未来研究机会的期待属于研究议程，而非已完成的算法比较。

## 六、检查规划器偏差与真实部署边界

标准基准减少了每篇文章重新建场景的成本，使数据量、观察和动作接口更容易被明确讨论。但基准本身不是中性的自然界切片：哪些任务易于航点规划，哪些物理效果能被仿真器稳定表现，都会影响收录范围。

作者明确承认渲染和物理并不等同真实世界。真实部署还会遇到感知标定、摩擦变化、柔性物体和执行器延迟。因此 RLBench 高分是可控仿真中的能力证据，不能替代真机评估。

本文分析还包括：如果测试时仍可调用知晓目标航点的专家，就可能把答案的一部分泄漏给学习器。生成训练示范时使用特权信息是允许设计；评估策略拿到同样信息则改变了问题。应按阶段追踪信息流。

五个前置概念：

- **基准**：固定任务与协议，让不同方法的结果可比较。
- **示范分布**：专家会提供哪些状态动作，而非所有可能状态。
- **少样本适应**：利用既有知识和少量新任务数据形成能力。
- **特权信息**：训练或专家可获得、部署策略不应直接使用的信息。
- **成功谓词**：把任务完成转成程序可判断的条件。

<details>
<summary>进阶追问与参考答案（3题）</summary>

**进阶问题1：任务平均是否被简单任务支配？**

参考答案：若按所有回合直接汇总，回合多的任务会更重；即使任务等权，许多容易任务也可能掩盖少数关键失败。应同时给逐任务成功率、等权宏平均和按任务难度/长度分组的结果，并固定每任务评估预算。部署要求每项技能都能用时，还应报告低分位数和零成功任务数量。

**进阶问题2：生成器失败过滤是否偷偷减少困难场景？**

参考答案：成功示范的初态分布正比于提议分布乘生成成功概率，因此难场景可能被过滤掉。记录所有生成尝试而非仅保留轨迹，按物体位置、遮挡和路径长度统计拒绝率，再与独立评估初态分布比较。若覆盖出现空洞，应补充生成器能力或分区配额，不能只把成功示范数量继续做大。

**进阶问题3：换动作空间后，性能变化来自策略还是底层规划器？**

参考答案：用固定规划器比较策略，再用固定关键位姿序列比较不同规划器；记录网络选点错误、规划失败和执行失败三类比例。关键位姿策略把连续避障交给规划器，关节策略没有同等帮助，二者直接比成功率会混合不同系统能力。若接口无法完全对齐，应明确报告各自控制栈而非声称纯算法胜负。

这些回答给出机制分析与待检验设计，不是已经运行的新实验结果。

</details>

## 七、从共同任务转向共同表示

与[Meta-World](036-metaworld.md)是平行基准关系：两者任务与观测、动作及少样本协议不同；[PerAct](055-peract.md)后续把RLBench作为评估环境，是模块组合中的基准使用，不能把模型高分反写为基准自带的算法能力。

## 八、自测三题与参考答案

**问题1：用同一 RLBench 名称，为什么两篇文章的成功率仍可能不可比？**

答：任务子集、变体、示范量、观察模式、动作接口和评估回合都可能不同。特别是末端目标加规划器，与直接关节控制，分担了不同难度。必须对齐协议后才适合比较数值。

**问题2：可以生成大量示范，为什么还值得研究少样本？**

答：少样本约束的是对新测试任务给学习器的示范量。训练任务可以提供丰富数据，用于学习可迁移结构；测试时仍需限制新任务信息。生成器能力强并不要求评估时把所有示范都交给模型。

**问题3：基准定义一百种任务、[图1](#paper-034-rlbench-figure-1)展示其中24种，是否证明系统拥有一百种自主技能？**

答：不证明。任务可定义、专家可生成示范和学习策略可闭环完成，是三个不同命题。基准论文主要提供前两项基础，第三项必须由具体算法在独立评估回合中证明。
