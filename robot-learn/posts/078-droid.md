# 078｜DROID：真实环境中的多样操作示范

[系列首页](README.md) · [上一篇](077-dexcap.md) · [下一篇](079-humanoidgym.md)

**原论文**：*DROID: A Large-Scale In-the-Wild Robot Manipulation Dataset*，Alexander Khazatsky、Karl Pertsch 等，2024，arXiv v1。[论文](https://arxiv.org/abs/2403.12945)。

### 先接住前作的问题

[BridgeData V2](066-bridgev2.md)扩展单一体系内的任务与环境，仍需检验更广地域和采集者带来的变化。DROID统一机器人底座和接口，把不同建筑、物体与视角纳入采集；它用固定学习器考察数据，未另造动作学习目标。

## 一、问题设定：怎样让真实数据多样性超出同一张桌子

如果十万次抓取都发生在同一张桌子上，模型可能学会桌面背景，而不是稳定识别操作关系。DROID 把采集地点、物体、视角和交互位置的多样性作为核心问题。

论文将任务多样性用去重动词数量表示。这里的86不是86个严格定义、互不重叠的基准任务；同一个动词可能对应不同对象、几何与控制要求。

场景指机器人工作空间发生实质变化，不只是换物体排列或桌布。一个厨房可有多个场景，564个场景也不等于564栋房屋。轨迹是一次执行，不应把三个相机流计成三条独立机器人经验。

数据使用同一类 Franka 平台，记录图像、本体与多种动作表达。平台可推到新位置，但采集过程中机械臂并没有学习移动底盘控制；带轮工作台主要用于换场景。

训练验证是语言条件行为克隆：当前图像与本体状态加指令，预测末端绝对位姿与夹爪动作块。不涉及奖励优化。采集中的成功标签用于数据选择，不能把所有有成功标注的数据集都归为强化学习。[定义与协议：§II–III](https://arxiv.org/html/2403.12945v1)。

## 二、统一硬件接口并分散采集环境

结果支持 DROID 辅助数据提升若干目标任务的表现与扰动鲁棒性；实验仍使用目标任务示范，不能概括成下载模型后在全新厨房零样本工作。

### 1. 统一底座，变化环境

硬件统一降低跨地点控制语义差异；外部相机可调整，换视角后标定。采集者列出场景可执行任务，界面随机提示下一项，并周期提示改变光照、对象或视角，减少人只录最方便任务的倾向。

这一协议并不保证任务均匀分布。人先决定任务候选集，物理可达性也限制可采行为；随机采样是在这个候选集内进行。

每条轨迹还记录操作者、场景与相机标定等元数据，方便分组分析。若未来要做严格泛化实验，这些元数据比单纯轨迹数量更关键：可以按建筑而不是按随机帧划分训练测试，避免近重复泄漏。

### 2. 用固定策略检验数据价值

语言用冻结DistilBERT编码，两路外部RGB用预训练ResNet-50编码，再与本体信息一起输入扩散动作头。数据虽然包含腕部相机和深度，主学习实验没有全部使用。

混合目标可教学写为：

$$
\mathcal L(\theta)=
\tfrac12\mathbb E_{D_{\rm target}}\ell_{\rm diff}
+\tfrac12\mathbb E_{D_{\rm aux}}\ell_{\rm diff}.
$$

目标任务数据和辅助来源各占一半，模型结构和训练预算保持一致。变化的核心是辅助来源：无辅助、DROID或OXE。

扩散仍拟合动作分布，例如用加噪动作块$A_k$学习恢复$A_0$或噪声，具体参数化随实现。DROID本身不新增一个不同的扩散数学目标，读者应把注意力放在数据条件与比较协议。

这段流程没有“让数据集自动变成通用机器人”的一步。数据价值需要通过具体学习算法、目标数据和评估问题共同体现。

数据体积和梯度影响不是同一件事。教学设目标集100条、辅助集10万条，所有轨迹等长，每批先各选一个来源、再在来源内部均匀抽取。对单条轨迹而言，目标样本被选中的概率是任意辅助样本的1000倍；对来源整体而言仍各占一半。

这说明“小量目标数据+大规模辅助数据”的结果并非纯零样本迁移，也不是把全部轨迹拼接的效果。原文固定策略与目标混合比例比较DROID/OXE，是较清晰的数据来源实验；但其OXE是经过条件筛选的训练子集，不能把差值解释为完整公开数据集的普遍排名。[原文学习实验与数据混合附录](https://arxiv.org/html/2403.12945v1)

### 自构小例子与前置概念

**教学例子，未运行。** 数据A在一间厨房录10000次拿杯子，数据B在100间厨房各录100次。两者轨迹数相同，但背景、相机与杯子位置变化不同。如果测试是同一厨房新杯子，A不一定差；若测试是新厨房，B可能更合适。评价问题决定哪种“多样”有价值。

再把一条轨迹的三个相机分别存成文件：这增加视觉观察，但仍是同一组动作与物体状态，不能算三倍独立接触经验。

若用随机帧切分训练测试，一次操作前后帧可能分到两边。模型即使记忆也得高分；按轨迹、场景或建筑切分，才逐渐检验更强泛化。

## 三、保存采集层级并用固定扩散策略验证数据

统一硬件减少接口差异，分散环境扩大覆盖；实验再固定学习器检查不同数据混合。轨迹的地点、任务和成功筛选信息应随样本保留。

~~~text
采集：
    搬机器人到新工作空间，选择并标定相机
    输入场景可执行任务列表
    随机提示任务，遥操作并记录同步观察和动作
    标注执行成败，周期改变场景条件
    对轨迹补充语言描述与场景元数据

数据审核：
    合并重复场景，区分成功与失败轨迹
    统计任务、对象、视角和交互位置覆盖

训练验证：
    固定目标任务示范与模型结构
    选择辅助数据来源
    每批各一半目标数据与辅助数据
    训练语言条件扩散策略
    在匹配初始条件的正常/扰动任务中实际执行
~~~

## 四、分别统计发布数据、实际训练混合与迁移测试

它是一份真实机器人数据集与采集系统论文，不是新策略算法。作者统一硬件和控制接口，在不同建筑、房间和任务中收集示范，再用已有扩散策略检验数据是否有用。

**原图怎么读：** [图9，原论文图注与图像](#paper-078-droid-figure-9)。比较不同场景数的数据子集在分布外任务上的表现。等量子集控制了数量，却未必控制对象、动作和操作者分布，所以场景多样性的因果解释仍需谨慎。


<!-- figure-ref-v6:start:078-droid-license -->
<p>原文标注 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本页摘图仅保留图形区域并作栅格化；有面板重排的图另行注明，作者与原文入口见各图注。</p>
<!-- figure-ref-v6:end:078-droid-license -->
<!-- figure-ref-v6:start:2ee5dd6481f3-anchor -->
<a id="paper-078-droid-figure-9"></a>
<!-- figure-ref-v6:end:2ee5dd6481f3-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/078-droid-s5-f9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/078-droid-s5-f9.png" width="1824" height="1244" alt="DROID: A Large-Scale In-the-Wild Robot Manipulation Dataset，图9：比较不同场景数的数据子集在分布外任务上的表现。等量子集控制了数量，却未必控制对象、动作和操作者分布，所以场景多样性的因果解释仍需谨慎。" loading="lazy"></a><figcaption>实验图原图摘引：Alexander Khazatsky、Karl Pertsch 等，2024，arXiv v1，HTML S5.F9，图9。<a href="https://arxiv.org/html/2403.12945v1#S5.F9" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

策略实验采用附录所列实际4万条训练资料；发布的7.6万条资源不能直接替换成这些结果的训练分母。

| 项目 | 论文口径 | 为什么要区分 |
|---|---|---|
| 发布成功数据 | 约7.6万轨迹、350小时 | 不等于全部采集尝试 |
| 失败轨迹 | 约1.6万，另含于发布 | 主政策实验不使用 |
| 场景/建筑 | 564/52 | 空间层级不同 |
| 实际辅助训练 | 首批有语言的4万成功轨迹 | 不是全部7.6万 |
| OXE对照 | 约40万轨迹的筛选混合，去掉Language Table | 不是整个OXE原样使用 |
| 目标任务 | 6任务、4地点，每项50–150条示范 | 多数任务分别训练 |
| 特殊共享模型 | 烤箱与华夫饼机合并为一个多任务策略 | 不能严格说六任务六模型 |
| 训练 | 通常25000步、batch128；煮豆OOD为50000步 | 同一比较组预算匹配 |
| 动作序列 | 观察2步、预测16步、执行8步后重算 | 有短期开环执行 |
| 评价 | 每条件每方法10次，图中汇总标准误 | 执行重复不等于训练种子 |
| 未逐项确认 | 训练种子、GPU墙钟、完整失败数据质量 | 不由发布大小反推训练成本 |

这些细节来自附录 F，尤其4万条实际训练数据修正了主文“完整数据集”的简略说法。采集15Hz是记录接口频率，不代表底层电机仅15Hz控制。

参与数量也需谨慎：引言有18实验室的表述，系统段明确写18套机器人、13机构。这里沿用具体硬件与机构计数，不把机器人台数等同于机构数。

### 五组证据：多样性有作用，但如何隔离它

**证据1：[表I](https://arxiv.org/html/2403.12945v1#S1.T1) 与[图2](#paper-078-droid-figure-2)、[图3](#paper-078-droid-figure-3)、[图4](#paper-078-droid-figure-4)、[图5](#paper-078-droid-figure-5)的数据分析。** 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。

<!-- figure-ref-v6:start:37ca0bdcda95 -->
<a id="paper-078-droid-figure-2"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/078-droid-v6-figure-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/078-droid-v6-figure-2.png" width="2132" height="1165" alt="DROID: A Large-Scale In-the-Wild Robot Manipulation Dataset，图2：表I 与图2、图3、图4、图5的数据分析。 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。" loading="lazy"></a><figcaption>原图摘引：Alexander Khazatsky、Karl Pertsch 等，2024，arXiv v1，HTML S3.F2，图2。<a href="https://arxiv.org/html/2403.12945v1#S3.F2" target="_blank" rel="noopener noreferrer">核对原文</a>。表I 与图2、图3、图4、图5的数据分析。 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。</figcaption></figure>
<!-- figure-ref-v6:end:37ca0bdcda95 -->
<!-- figure-ref-v6:start:6ee2a2fd8590 -->
<a id="paper-078-droid-figure-3"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/078-droid-v6-figure-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/078-droid-v6-figure-3.png" width="2132" height="1502" alt="DROID: A Large-Scale In-the-Wild Robot Manipulation Dataset，图3：表I 与图2、图3、图4、图5的数据分析。 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。" loading="lazy"></a><figcaption>原图摘引：Alexander Khazatsky、Karl Pertsch 等，2024，arXiv v1，HTML S4.F3，图3。<a href="https://arxiv.org/html/2403.12945v1#S4.F3" target="_blank" rel="noopener noreferrer">核对原文</a>。表I 与图2、图3、图4、图5的数据分析。 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。</figcaption></figure>
<!-- figure-ref-v6:end:6ee2a2fd8590 -->
<!-- figure-ref-v6:start:69be6f9b9f05 -->
<a id="paper-078-droid-figure-4"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/078-droid-v6-figure-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/078-droid-v6-figure-4.png" width="2132" height="1642" alt="DROID: A Large-Scale In-the-Wild Robot Manipulation Dataset，图4：表I 与图2、图3、图4、图5的数据分析。 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。" loading="lazy"></a><figcaption>原图摘引：Alexander Khazatsky、Karl Pertsch 等，2024，arXiv v1，HTML S4.F4，图4。<a href="https://arxiv.org/html/2403.12945v1#S4.F4" target="_blank" rel="noopener noreferrer">核对原文</a>。表I 与图2、图3、图4、图5的数据分析。 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。</figcaption></figure>
<!-- figure-ref-v6:end:69be6f9b9f05 -->
<!-- figure-ref-v6:start:353eac89da80 -->
<a id="paper-078-droid-figure-5"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/078-droid-v6-figure-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/078-droid-v6-figure-5.png" width="2132" height="1722" alt="DROID: A Large-Scale In-the-Wild Robot Manipulation Dataset，图5：表I 与图2、图3、图4、图5的数据分析。 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。" loading="lazy"></a><figcaption>原图摘引：Alexander Khazatsky、Karl Pertsch 等，2024，arXiv v1，HTML S4.F5，图5。<a href="https://arxiv.org/html/2403.12945v1#S4.F5" target="_blank" rel="noopener noreferrer">核对原文</a>。表I 与图2、图3、图4、图5的数据分析。 动词、场景、视角和交互位置均更丰富。首个夹爪闭合位置只是交互位置代理：推、擦等动作可能不需要闭合，不能把该分布当所有接触的完整覆盖。数据统计证明覆盖增加，尚不直接证明政策能力。</figcaption></figure>
<!-- figure-ref-v6:end:353eac89da80 -->


**证据2：[图7](#paper-078-droid-figure-7)的目标任务成绩。** 图注报告，相对次优方法，正常条件平均提高22个百分点，分布外提高17个百分点。这里是绝对百分点，而不是“相对增长22%”。模型依然用了每个目标场景的示范，所以证据是辅助数据提升适应后的表现。

<!-- figure-ref-v6:start:fcf58ae6c3dd -->
<a id="paper-078-droid-figure-7"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/078-droid-v6-figure-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/078-droid-v6-figure-7.png" width="2132" height="1409" alt="DROID: A Large-Scale In-the-Wild Robot Manipulation Dataset，图7：图7的目标任务成绩。 图注报告，相对次优方法，正常条件平均提高22个百分点，分布外提高17个百分点。这里是绝对百分点，而不是“相对增长22%”。模型依然用了每个目标场景的示范，所以证据是辅助数据提升适应后的表现。" loading="lazy"></a><figcaption>原图摘引：Alexander Khazatsky、Karl Pertsch 等，2024，arXiv v1，HTML S5.F7，图7。<a href="https://arxiv.org/html/2403.12945v1#S5.F7" target="_blank" rel="noopener noreferrer">核对原文</a>。图7的目标任务成绩。 图注报告，相对次优方法，正常条件平均提高22个百分点，分布外提高17个百分点。这里是绝对百分点，而不是“相对增长22%”。模型依然用了每个目标场景的示范，所以证据是辅助数据提升适应后的表现。</figcaption></figure>
<!-- figure-ref-v6:end:fcf58ae6c3dd -->


**证据3：[图9](#paper-078-droid-figure-9)的等量子集。** 两组都7362条，一组集中20个场景，一组随机取更分散场景；后者OOD更好。它控制了轨迹数量，比直接对比4万和更小数据强。但场景变化还可能伴随任务、对象与操作者变化，不能声称纯外观场景因果效应已完全隔离。

**证据4：[图8](#paper-078-droid-figure-8)的长任务执行。** 煮豆展示更连贯的多阶段动作，是与汇总成绩一致的定性证据。任务标准是揭盖、倒豆、开炉，不包含“食物已经煮熟”的检验，因此不能把任务名当完整烹饪认证。

<!-- figure-ref-v6:start:2e97c10c73de -->
<a id="paper-078-droid-figure-8"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/078-droid-v6-figure-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/078-droid-v6-figure-8.png" width="2132" height="953" alt="DROID: A Large-Scale In-the-Wild Robot Manipulation Dataset，图8：图8的长任务执行。 煮豆展示更连贯的多阶段动作，是与汇总成绩一致的定性证据。任务标准是揭盖、倒豆、开炉，不包含“食物已经煮熟”的检验，因此不能把任务名当完整烹饪认证。" loading="lazy"></a><figcaption>原图摘引：Alexander Khazatsky、Karl Pertsch 等，2024，arXiv v1，HTML S5.F8，图8。<a href="https://arxiv.org/html/2403.12945v1#S5.F8" target="_blank" rel="noopener noreferrer">核对原文</a>。图8的长任务执行。 煮豆展示更连贯的多阶段动作，是与汇总成绩一致的定性证据。任务标准是揭盖、倒豆、开炉，不包含“食物已经煮熟”的检验，因此不能把任务名当完整烹饪认证。</figcaption></figure>
<!-- figure-ref-v6:end:2e97c10c73de -->


**证据5：附录 E 的失败边界。** 清理桌面时，在抽屉内部加入干扰物会导致所有策略失败。主文概括的干扰条件与附录具体执行条件不完全相同，复现宜采用附录说明。这一失败说明背景鲁棒并不等于拥挤接触环境中的物体规划能力。[实验及附录](https://arxiv.org/html/2403.12945v1)。

“无辅助”与“有辅助”的比较不能证明只是更多数据导致收益，因为辅助数据同时改变多样性。DROID与OXE对照也混合了同形体数据匹配优势：在DROID硬件上评估，DROID无需跨那么多动作与形体差异。

## 五、场景多样性仍与任务和操作者相互关联

DROID 的贡献是将多机构数据采集变成可复用系统，并把多样性拆成可讨论的轴。它提供不仅可训练策略、也可研究标定、视觉表征、失败行为的资源。

人工筛选仍影响数据。只保留成功示范训练，可能缺少从失败状态恢复的例子；虽然发布失败数据，本文并未证明怎样利用它最好。大量成功轨迹也可能集中在易执行的行为和舒适工作区。

场景去重依赖元数据与人工检查。附录承认按机器人序列号分组可能漏掉不同机器人到同一场景的重复。因而场景数是带定义与流程的统计量，不是无歧义的客观常数。

本文分析还包括一个长期问题：数据多样性是否与部署目标相关。大量不相关行为可能占用容量；更均匀的场景采样也可能稀释困难接触技能。最优采样不是“越大越杂越好”，需要同时看任务覆盖、成功质量和负迁移。

### 五个前置概念

五个前置概念：

- **数据分布**：训练样本出现在哪些状态、任务和环境中的规律。
- **数据混合采样**：决定不同来源在每批更新中占多少权重。
- **分布外评估**：明确改变某个训练条件后测试策略。
- **分组划分**：按场景等单位隔离训练与测试，减少近重复泄漏。
- **代理统计**：用容易测量的量代表复杂概念，需要说明遗漏。

### 追问：如果按帧随机划分训练和测试，为什么可能高估DROID的场景泛化？

参考答案：同一轨迹相邻帧共享物体、背景和操作阶段，随机分帧会把近重复条件放进两边。要检验新场景，应按轨迹、地点或相应留出因素划分，并记录目标任务微调数据。帧级预测准确与新场景执行是不同问题，数据越长越需要保留采集层级。

## 六、沿机制关系继续读

DROID与[BridgeData V2](066-bridgev2.md)是平行数据建设，前者强调多地点统一平台采集；它组合[Diffusion Policy](061-diffusion-policy.md)检验数据价值，后续VLA使用DROID时仍要注明筛选和采样权重。

## 七、自测三题与参考答案

**问题1：DROID实验是否证明不需要任何目标任务示范？**

答案：没有。主要实验把目标任务示范与DROID数据对半混合。论文将无目标数据的新场景执行列为未来问题，不能把辅助数据的收益解释成已经解决零样本部署。

**问题2：为什么等量多场景子集仍不能完全隔离“场景多样性”的因果作用？**

答案：不同场景往往连带不同物体、任务、操作者与动作分布。等量控制去掉了数据数量差异，却没有消除所有混杂；可进一步匹配动词、对象与轨迹长度来加强证据。

**问题3：发布7.6万成功轨迹，为什么正文强调实际训练4万条？**

答案：实际训练受当时语言标注可用性限制。发布资源规模和支持论文结果的训练数据范围是两回事。把前者代入后者，会误算数据利用率、训练预算和规模收益。
