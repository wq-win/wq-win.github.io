# 081｜RoboCasa：把厨房仿真变成机器人数据工厂

[系列首页](README.md) · [上一篇](080-octo.md) · [下一篇](082-openvla.md)

**原论文**：*RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots*，Soroush Nasiriany 等，2024。[论文](https://arxiv.org/abs/2406.02523)。

### 先接住前作的问题

[MimicGen](071-mimicgen.md)重用对象中心示范，但可生成数据的场景多样性仍取决于环境资产和任务结构。RoboCasa把厨房布局、物体和交互任务组织起来，再接示范扩增，追问丰富环境是否真的转成可迁移控制能力。

## 一、问题设定：厨房场景多样性怎样变成可用训练经验

真实厨房中的物体、布局和设备很多，逐个遥操作收集示范成本高；如果仿真只有几个桌面任务，也难以支撑通用控制研究。RoboCasa 建立多样化厨房、可交互资产和任务库，再用人类示范驱动 MimicGen 生成更多成功轨迹。

平台提供 25 个原子任务和 75 个组合任务。原子任务涉及抓放、门与抽屉、旋钮、杠杆、按钮、插入和导航；组合任务将它们串成厨房活动。“准备食物”并不意味着模拟了真实烹饪全过程，成功判据通常对应物体位置和设备状态。

策略读取图像、本体状态和语言目标，输出动作。环境真值用于生成轨迹筛选及评价，不能直接当作视觉策略输入。平台支持多种形态，主要学习实验却集中在 Franka 平台；模型支持与跨形态学习成功是不同成果。

## 二、连接可交互资产、任务定义与示范扩增

### 三种多样性分别改变什么

布局改变可达性与空间关系，纹理改变外观，物体模型改变几何与抓取方式。只换贴图不能证明机器人学会新接触动力学，只增加物体数量也不自动增加任务逻辑。

作者组合厨房布局与风格，使用生成工具补充纹理和三维资产，并人工筛选。生成模型是资产和任务构建助手，不是部署时发动作的控制器。

### LLM 提议任务，人负责实现

语言模型提出厨房活动及技能组合，人再筛除不合理内容并实现任务。缺少设备、把按咖啡机按钮当成开酒瓶，都属于语义像任务但不满足模拟器能力的情况。

生成任务建议不等于自动完成环境、奖励、成功判据和数据采集。研究价值在于将语言构思接到可运行且可检查的物理任务，而不是把自然语言当成已经正确的程序。

### 对象中心的轨迹扩展

MimicGen 将示范拆为围绕对象的片段，在新场景中按对象位姿变换，再执行并保留成功结果。教学上：

$$
T_{E,\mathrm{new}}
=T_{O,\mathrm{new}}
(T_{O,\mathrm{old}})^{-1}
T_{E,\mathrm{old}}.
$$

$T_O$ 是对象相对世界的位姿，$T_E$ 是末端相对世界的位姿。后两项获得旧示范中“手相对对象”的关系，再把它放到新对象上。实际生成还需要片段选择、插值、控制与成功筛选。

这一机制依赖已知子任务结构与参考对象。任务如果涉及绳子拓扑变化，刚体变换就可能失效。环境可以创建一种场景，不代表数据生成器能覆盖其中所有行为。

### 行为克隆优化什么

用一般概率策略表示：

$$
\mathcal L_{\mathrm{BC}}
=-\mathbb E_{(h_t,\ell,A_t)\sim D}\log\pi_\theta(A_t\mid h_t,\ell).
$$

$h_t$ 是历史，$\ell$ 是任务语言，$A_t$ 是动作块。这鼓励模仿数据，并不直接优化动作优雅、安全或最终成功。成功轨迹如果仍抖动，策略也可能学到抖动。

三个层次要分开：数学上优化动作似然；机制上通过场景变化和重定向扩大覆盖；实验上评价闭环成功。最后一项需要实验，不能由前两项直接推出。

原子技能能做，并不意味着串起来就能做。教学设开柜技能总能打开门，但结束时夹爪停在柜口中央；取杯技能的训练初态却要求夹爪从侧面接近。两个技能在各自测试初态上都成功，连接后仍可能碰撞。组合缺口来自前一技能的终态分布与后一技能的训练初态不匹配，不只是语言规划顺序错误。

因此原子预训练后的组合微调，检验的是状态交接、历史信息和新协调一起带来的难度。原文组合任务仍弱，并承认成功生成轨迹存在抖动和碰撞；只按最终成功筛选，未必留下足够优质的交接过程。[原文组合任务实验与结论](https://arxiv.org/html/2406.02523v1)

### 教学例子与前置概念

**自构例子，未运行**：抓杯子任务中，第一组换 100 种纹理，第二组改变杯口、把手几何，第三组同时变化。分别测试未见纹理、未见几何、两者一起变化，记录成功、碰撞和抓后滑落。它能检验视觉多样性和可抓取几何的作用是否相同。

## 三、构建可交互厨房并按任务生成示范

布局、外观和物体可供不同维度的变化，任务逻辑规定实际交互。人类示范经MimicGen扩增后仍需训练既有行为克隆策略，资产生成本身不是策略学习。

~~~text
建立布局、资产和可验证任务逻辑
采集原子任务示范，标注对象中心片段
重复生成：
    采样新场景、物体实例与位置
    按对象关系变换片段，执行候选轨迹
    若满足成功判据，保存完整轨迹
训练语言条件行为克隆
在未见实例与部分未见风格上闭环评价
组合任务：用目标示范微调原子任务预训练策略
真实任务：混合真机示范与仿真数据训练
~~~

## 四、把原子技能、组合任务和真机迁移分开

学习器主要是行为克隆，贡献首先在环境、数据与评价体系。实验支持大量生成数据能改善部分任务，同时给出鲜明的反面结果：组合任务仍然困难，真实迁移成功率也不高。

**原图怎么读：** [图7，原论文图注与图像](#paper-081-robocasa-figure-7)。比较组合任务从头训练与用原子任务预训练后微调，两组仍使用目标组合任务示范。提高平均表现不等于已证明技能可以无需适配直接串联。


<!-- figure-ref-v6:start:081-robocasa-license -->
<p>原文标注 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>。本页摘图仅保留图形区域并作栅格化；有面板重排的图另行注明，作者与原文入口见各图注。</p>
<!-- figure-ref-v6:end:081-robocasa-license -->
<!-- figure-ref-v6:start:a1ace9f2ed9e-anchor -->
<a id="paper-081-robocasa-figure-7"></a>
<a href="https://arxiv.org/html/2406.02523v1#S5.F7" target="_blank" rel="noopener noreferrer">原引用入口</a>
<!-- figure-ref-v6:end:a1ace9f2ed9e-anchor -->

<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/081-robocasa-s5-f7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/081-robocasa-s5-f7.png" width="808" height="300" alt="RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots，图8：比较组合任务从头训练与用原子任务预训练后微调，两组仍使用目标组合任务示范。提高平均表现不等于已证明技能可以无需适配直接串联。" loading="lazy"></a><figcaption>实验图原图摘引：Soroush Nasiriany 等，2024，PDF第7页，图8。PDF为图8；HTML转写版本同一实验表标为图7。<a href="https://arxiv.org/pdf/2406.02523v1#page=7" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

| 项目 | 设置 | 检验内容 |
|---|---|---|
| 平台资源 | 120 场景、2509 物体、100 任务 | 可研究的环境范围 |
| 人类示范 | 每个原子任务 50 条 | 基线和生成种子 |
| 主生成实验 | 24 任务，每任务最多 3000 条，共 72000 | 数据规模作用 |
| 发布资源 | 另有 28000 条使用生成物体的轨迹 | 发布与实验规模不同 |
| 仿真评价 | 每任务 50 次、5 场景、未见实例 | 闭环泛化 |
| 策略 | BC-Transformer，历史 10 步，预测 10 步执行 1 步 | 有记忆的多任务模仿 |
| 优化 | 附录 IX：500k 梯度更新 | 训练规模 |
| 真机 | 3 类抓放，各 50 条示范，3 个训练种子 | 协同训练与类别泛化 |

导航没有进入 24 个任务的生成规模实验。底座可移动，不能被解读为十万条自主移动操作经验。主实验的 72000 条与发布十万条也不是同一训练集。

平台支持高质量渲染，但大规模训练采用轻量 MuJoCo 渲染。展示图逼真，不等于每一训练帧都采用最高质量。

真机与模拟在控制器、频率、相机和基座位置上有差别，真实实验借助目标示范进行协同训练，不是纯仿真零样本部署。总数据不同的比较回答“加仿真数据有无帮助”，而非严格等预算的算法优劣。

### 五组证据及其边界

**[图6](#paper-081-robocasa-figure-6)：规模趋势。** 人类基线 28.8%，最大生成集 47.6%，相差 18.8 个百分点。小生成集为 26.3%，低于人类基线。因此结果支持规模足够时的收益，不支持每条生成数据都更有价值。

<!-- figure-ref-v6:start:3af0da515fc7 -->
<a id="paper-081-robocasa-figure-6"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/081-robocasa-v6-figure-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/081-robocasa-v6-figure-6.png" width="2132" height="563" alt="RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots，图6：规模趋势。 人类基线 28.8%，最大生成集 47.6%，相差 18.8 个百分点。小生成集为 26.3%，低于人类基线。因此结果支持规模足够时的收益，不支持每条生成数据都更有价值。" loading="lazy"></a><figcaption>原图摘引：Soroush Nasiriany 等，2024，HTML S5.F6，图6。<a href="https://arxiv.org/html/2406.02523v1#S5.F6" target="_blank" rel="noopener noreferrer">核对原文</a>。规模趋势。 人类基线 28.8%，最大生成集 47.6%，相差 18.8 个百分点。小生成集为 26.3%，低于人类基线。因此结果支持规模足够时的收益，不支持每条生成数据都更有价值。</figcaption></figure>
<!-- figure-ref-v6:end:3af0da515fc7 -->


**[图12](#paper-081-robocasa-figure-12)：逐任务结果。** 聚合趋势掩盖了非单调性。一些开关、门类任务在更大生成集上未继续提升。数据量增加可能同时改变覆盖、质量和优化难度，总体均值不能保证单任务改善。

<!-- figure-ref-v6:start:f8b8b372e234 -->
<a id="paper-081-robocasa-figure-12"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/081-robocasa-v6-figure-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/081-robocasa-v6-figure-12.png" width="1744" height="1992" alt="RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots，图12：逐任务结果。 聚合趋势掩盖了非单调性。一些开关、门类任务在更大生成集上未继续提升。数据量增加可能同时改变覆盖、质量和优化难度，总体均值不能保证单任务改善。" loading="lazy"></a><figcaption>原图摘引：Soroush Nasiriany 等，2024，PDF第16页，图13（HTML图12）。<a href="https://arxiv.org/pdf/2406.02523v1#page=16" target="_blank" rel="noopener noreferrer">核对原文</a>。逐任务结果。 聚合趋势掩盖了非单调性。一些开关、门类任务在更大生成集上未继续提升。数据量增加可能同时改变覆盖、质量和优化难度，总体均值不能保证单任务改善。<a href="https://arxiv.org/html/2406.02523v1#S9.F12" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:f8b8b372e234 -->


**[图7](#paper-081-robocasa-figure-7)：组合任务。** 五个单任务模型的微调趋势更好，但多个结果仍是个位数，准备咖啡仍为零。原子技能经验有用，却没有自动解决阶段切换、精细操作和误差累积。

**[图9](#paper-081-robocasa-figure-9)：真实协同训练。** 见过类别平均从 13.6% 到 24.4%，增加 10.8 个百分点，按舍入数相对增加约 79%；未见类别从 2.6% 到 9.3%。相对增幅大的一部分原因是基线低，最终可靠性仍有限。误差来自三个训练种子，不能当成所有厨房变化的置信范围。

<!-- figure-ref-v6:start:63846f82c281 -->
<a id="paper-081-robocasa-figure-9"></a>
<figure class="reading-evidence-figure"><a href="/robot-learn/assets/papers/081-robocasa-v6-figure-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-learn/assets/papers/081-robocasa-v6-figure-9.png" width="968" height="484" alt="RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots，图9：真实协同训练。 见过类别平均从 13.6% 到 24.4%，增加 10.8 个百分点，按舍入数相对增加约 79%；未见类别从 2.6% 到 9.3%。相对增幅大的一部分原因是基线低，最终可靠性仍有限。误差来自三个训练种子，不能当成所有厨房变化的置信范围。" loading="lazy"></a><figcaption>原图摘引：Soroush Nasiriany 等，2024，PDF第8页，图10（HTML图9）。<a href="https://arxiv.org/pdf/2406.02523v1#page=8" target="_blank" rel="noopener noreferrer">核对原文</a>。真实协同训练。 见过类别平均从 13.6% 到 24.4%，增加 10.8 个百分点，按舍入数相对增加约 79%；未见类别从 2.6% 到 9.3%。相对增幅大的一部分原因是基线低，最终可靠性仍有限。误差来自三个训练种子，不能当成所有厨房变化的置信范围。<a href="https://arxiv.org/html/2406.02523v1#S5.F9" target="_blank" rel="noopener noreferrer">原引用入口 </a></figcaption></figure>
<!-- figure-ref-v6:end:63846f82c281 -->


**附录 IX：扩散对照。** 一个任务中 BC-Transformer 为 56%，扩散方案为 12%。二者观测历史、动作执行长度不同，作者也指出历史可能影响结果。这不证明扩散本身不适合厨房，更不能推翻其他控制设置中的扩散结果。

另一个复现口径：真实迁移段落使用 20 Hz 的模拟控制描述，速度基准附录以每步 0.04 秒解释测试配置。上下文不同，应锁定各实验配置，不能用某一频率推算全数据时长。

## 五、生成规模不能替代恢复行为和真实物理覆盖

作者承认成功轨迹可能含抖动和碰撞，组合任务效果弱，任务实现仍需人类参与，技能未覆盖复杂柔性和双臂操作。更多资产不自动解决行为瓶颈。

我的分析是，后续应分离数量和质量：固定轨迹数，比较仅成功筛选与加入碰撞、平滑过滤；再固定质量阈值增加数量。否则覆盖增加和行为质量变化的贡献不易解释。

任务名也要落到具体条件。“安排蔬菜”可以只要求放到砧板，不等于切菜。成功条件比自然语言名称更能决定结论的实际范围。

### 五个前置概念

五个前置概念：**仿真资产**包含视觉、几何及物理属性；**行为克隆**拟合示范动作；**对象中心重定向**保持手与对象的关系；**拒绝采样**丢弃不满足条件的尝试；**组合任务**要求技能按状态衔接。

### 追问：增加厨房纹理和增加可交互布局，应怎样设计对照？

参考答案：前者主要改变观察，后者还改变可达性、碰撞和动作序列。应固定任务与轨迹预算，分别改变外观和结构，并测原子技能与组合任务。把两类变化同时加入后平均提高，不能判断模型学到了视觉不变性还是新的操作覆盖。

## 六、沿机制关系继续读

RoboCasa把[MimicGen](071-mimicgen.md)作为数据生成模块，与[RLBench](034-rlbench.md)是平行环境路线；后续更大模型在厨房得分时，仍需区分原子技能、组合任务与真机适配三种问题。

## 七、自测三题与参考答案

**问题1：为什么成功轨迹也可能是不好的数据？**

答案：最终位置满足要求，不代表中途没有碰撞、抖动或无效动作。行为克隆模仿整个过程，成功筛选不能替代行为质量评价。

**问题2：发布十万条意味着主规模实验用了十万条吗？**

答案：不是。主比较用 72000 条、24 个任务，另有 28000 条来自不同物体来源。发布资源、训练子集和评价范围要分别写清。

**问题3：相对提高约 79%，为什么还不能说解决了迁移？**

答案：它对应约 13.6% 到 24.4%，多数尝试仍失败，而且用了目标真机示范。结果说明协同训练有帮助，尚不代表零样本迁移或可靠家庭部署。
