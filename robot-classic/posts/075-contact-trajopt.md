# 075｜接触隐式轨迹优化：不先规定哪只脚何时落地

[返回总览](00-发展时间线总览.md) · [上一篇](074-octomap.md) · [下一篇](076-lsdslam.md)

**论文**：Michael Posa、Cecilia Cantu、Russ Tedrake，*A Direct Method for Trajectory Optimization of Rigid Bodies Through Contact*，IJRR 2014，33(1):69—81；2013 年在线发表，前身为 WAFR 2012 工作。[作者全文](https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf) · [出版记录](https://doi.org/10.1177/0278364913506757) · [2014 年勘误](https://doi.org/10.1177/0278364914533878)。

### 先接住前作的问题

[Stewart–Trinkle](036-impulse-contact.md)把接触化为区间冲量，本篇进一步联合优化状态、控制与接触作用。它与[CIO](072-contact-implicit.md)解决相近模式发现问题，但硬互补和有限罚项对应不同的可行性承诺。

## 一、问题设定：状态控制与接触模式怎样在一个轨迹问题中共同决定

让机器人走路，通常先决定左脚落地、右脚离地等顺序，再优化每一步怎么走。多指操作、柔性脚趾或带机械限位的腿却有大量接触组合，顺序可能本来就是需要发现的答案。

### 研究背景与问题定义

这是模型驱动的轨迹优化，不是强化学习。输入为刚体动力学、接触几何、摩擦、初终状态和任务成本；输出为一段状态、控制、接触力及时间轨迹。不存在训练好的策略网络或数据驱动价值函数。

传统混合系统描述把支撑、腾空、滑动等视为不同模式，各自有动力学；触地事件触发模式转换。少数模式时很清楚，多接触点和机械限位叠加后，组合迅速增多。若固定错误顺序，优化器只能在受限的问题里努力，即使模型允许更好的动作也发现不了。

不过，“没有预设顺序”并不等于没有结构性先验。机器人可能碰到哪些表面、间隙如何计算、哪个关节可驱动、摩擦模型是什么，都必须给出。它适合已知任务几何的规划，不能直接解释成对未知环境的自主探索。

## 二、把接触力和互补约束加入离散动力学

### 1. 接触互补的逻辑

设 $\phi(q)$ 是物体到接触面的非穿透间隙，$\lambda_n$ 是法向支持力，则

$$\phi(q)\ge0,\qquad\lambda_n\ge0,\qquad\phi(q)\lambda_n=0.$$

三条约束缺一不可。只有乘积等于零会允许负间隙或吸引力；只有两个非负约束则会允许悬空获得支持。组合起来才表达单边接触。

尤其注意逻辑方向：$\lambda_n>0$ 要求 $\phi=0$，但 $\phi=0$ 并不要求 $\lambda_n>0$。刚好接触但不受力是合法边界情形。不能把论文中简略的“当且仅当接触”措辞扩展成所有接触必须承担正载荷。

### 2. 接触力与状态一起优化

用教学记号写动力学：

$$M(q)\dot v+b(q,v)=B(q)u+J(q)^T\lambda.$$

$u$ 是执行器输入，$\lambda$ 是环境接触作用，$J^T$ 把接触力映射为广义力。它们的权限不同：驱动器不能凭空操纵被动自由度，接触力也只能在接触约束允许时出现。

传统前向模拟给定控制后一步步求状态和接触；直接方法把多个时刻的 $q,v,u,\lambda$ 一起优化，再用离散动力学等式约束它们必须相容。变量更多，但相邻时刻之间的约束具有稀疏结构。

一个明确区分力与冲量的教学离散式为

$$M_{k+1}(v_{k+1}-v_k)=h_k(Bu_{k+1}-b_{k+1})+J_{k+1}^T p_{k+1},$$

其中 $p_{k+1}$ 是这一时间段内的接触冲量。若使用区间平均接触力，则 $p=h\lambda$。冲击时不应拿冲量直接当瞬时力。时间步进把短暂碰撞与持续接触统一到积分量里，并不精确恢复每个碰撞时刻的峰值。

### 3. 摩擦与求解并没有消失

法向互补只解决接触与分离；切向还需要摩擦锥与滑动方向约束。滑动时摩擦应反对运动，粘着时摩擦可以落在允许范围内。只添加 $\|\lambda_t\|\le\mu\lambda_n$ 而不处理耗散关系，可能允许不符合库仑摩擦的运动。

原文将这些条件组成 MPCC，即带互补约束的数学规划。SQP 用连续的二次近似子问题推进，但整体问题不是凸二次规划。作者利用松弛变量和求解器弹性机制改善数值表现；复杂问题还可以先容许小的互补误差，再逐步收紧。

### 互补点为什么让普通非线性优化器格外难受

单接触可行集合为 $\phi\ge0,\lambda\ge0,\phi\lambda=0$，其中 $\phi$是间隙，$\lambda$是支持力。它是两条非负坐标轴的并集，不是一个凸面：$(\phi,\lambda)=(1,0)$与$(0,1)$都可行，中点$(0.5,0.5)$却不行。在切换点 $(0,0)$，乘积约束的梯度 $(\lambda,\phi)$又为零，普通约束资格条件容易失效。

**教学松弛检查**若改成 $\phi\lambda\le\varepsilon$，取 $\varepsilon=10^{-3}$米·牛、$\phi=0.01$米，仍允许0.1牛隔空作用。把容差从 $10^{-3}$减到 $10^{-5}$会将同间隙允许力降到0.001牛。容差有单位，换米为毫米必须同步缩放，否则实际物理允许量改变。

本篇直接借助[Stewart–Trinkle](036-impulse-contact.md)的积分接触思想，与[CIO手操作](072-contact-implicit.md)的软罚项路线并行。[原文第2.2–2.3节](https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf)明确区分硬约束和允许远距离力的松弛；实验中未预指定模式不等于全局搜索所有模式，仍应检查初始化、最终残差和细步长验证。

接触作用和运动状态需在同一离散模型中满足互补。下面检查模式变化是否伴随可行的力与位移，再解释数值案例的局部解。

## 三、联合求解候选接触，检查模式与力的一致性

```text
输入刚体模型、摩擦参数、候选接触对、起终约束
建立各时刻的状态、控制、接触作用及时间变量
加入离散动力学和任务约束
对每个候选接触加入：
    非穿透、单边法向作用、接触互补
    摩擦范围以及粘着/滑动相容条件
根据需要加入关节限位和机构约束
用状态轨迹猜测初始化，初始化控制与接触变量
求解稀疏非线性问题：
    若采用互补松弛，逐步收紧允许误差
    每次更新线性化与二次近似，而非预先枚举模式序列
检查最终动力学、非穿透、摩擦及互补残差
读取哪些接触作用非零，得到对应的接触安排
独立检查细时间步模拟与反馈跟踪，再考虑硬件执行
```

伪代码最后的独立验证是教学性复现建议，不能据此声称作者每个动作都做过同等验证。数学目标是设计者给出的轨迹成本；机制变化是将接触隐式纳入优化；实验改善则是找到可行运动、改变模式或降低特定名义成本，三者不能混写。

### 自构例子与前置知识

**自构例子，未运行。** 一个 1 kg 物体静止在平面上。间隙大于零时，支持力只能为零，重力会让它下落；间隙为零时，约 9.81 N 的支持可以抵消重力。若允许间隙 0.01 m、支持力 9.81 N 同时存在，乘积为 0.0981 N·m，便出现悬空支持。这个量的单位也提醒我们：松弛阈值不能随意跨单位、跨机器人照搬。

五个前置概念：

1. 混合系统：连续运动与离散接触模式共同构成的系统。
2. 互补约束：两个非负量不能同时严格为正。
3. 直接转录：把连续轨迹问题离散成有限维约束优化。
4. 冲量：力在时间上的积分，用于描述碰撞造成的动量变化。
5. SQP：通过连续二次近似求解非线性约束问题的方法。

## 四、读操作和步态案例中的接触顺序变化

<!-- figure-ref-v6:start:rc-75-figure-7-anchor -->
<span id="rc-75-figure-7"></span>
<!-- figure-ref-v6:end:rc-75-figure-7-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/075-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/075-evidence.png" width="1130" height="255" alt="Fig. 7：从左到右读 FastRunner 的周期运动，细线还表示弹簧与肌腱" loading="lazy"></a><figcaption>原论文结果图／表摘引：Michael Posa、Cecilia Cantu、Russ Tedrake（2014），Fig. 7，PDF 第 16 页；<a href="https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf#page=16" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：从左到右读 FastRunner 的周期运动，细线还表示弹簧与肌腱。它展示复杂模型上的优化轨迹，不是实机跑步录像帧，也不能由渲染姿态判断全部接触残差。

### 实验如何验证

四组应用使用作者预印本的 PDF 页序；高速步态数字是仿真结果，不能写成真机纪录，勘误中的先行工作归属也需保留。

| 项目 | 论文设置与边界 |
| --- | --- |
| 任务 | 手指拨动物体、平面抓取、Spring Flamingo 步态和 FastRunner 运动 |
| 数据来源 | 已知模型和人工设置的任务、初始轨迹，不是人类示范数据集训练 |
| 对照 | 初始与优化轨迹、相关方法的条件性讨论，不是统一排行榜上的全面消融 |
| 求解预算 | 简单例子分钟级或更短；复杂 FastRunner 可达约一小时，见 §4 开头 |
| 特殊实现 | Spring Flamingo 用 C++ 动力学与 MATLAB 框架，其他例子的实现成本不能直接同口径比较 |
| 指标 | 可行性、接触模式、名义运输成本、求解时间 |
| 重复与不确定性 | 未报告覆盖所有案例的独立随机重复统计或置信区间 |
| 额外先验 | 抓取中使用中间抓握姿态；步态使用周期、对称或步幅约束 |

中间姿态尤其重要。只要求球到达空中，优化器可能用手指把球弹起来；这在数学上满足目标，却不是人想要的“抓起”。论文主动讨论了这种目标与意图差异，是理解优化式机器人行为的重要例子。

### 五处证据与读法

1. **[图 3](#rc-75-figure-3)、§4.1：主动建立接触。** 无重力的示例仍能从无接触初始化发现接触，支持搜索不完全依赖自然动力学把身体推到一起。它不是对所有初始化成功的保证。

<!-- figure-ref-v6:start:rc-75-figure-3 -->
<figure class="reading-evidence-figure" id="rc-75-figure-3"><a href="/robot-classic/assets/figure-refs-v6/075-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/075-fig-3.png" width="360" height="523" alt="两连杆手指、被推动椭圆与关节角和间隙标注" loading="lazy"></a><figcaption>Michael Posa、Cecilia Cantu、Russ Tedrake（2014），图 3，PDF 第 12 页；<a href="https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf#page=12" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。 本图为裁切摘录，按<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC-BY-NC-SA-4.0</a>提供；<a href="https://dspace.mit.edu/entities/publication/c55ff3f4-e533-4097-a23e-c34821e3ad96" target="_blank" rel="noopener noreferrer">版本与许可记录</a>。</figcaption></figure>

读图：红色两连杆必须先改变姿态建立接触，绿色椭圆才会运动；图中间隙变量对应互补约束的几何距离。
<!-- figure-ref-v6:end:rc-75-figure-3 -->

2. **[图 4](#rc-75-figure-4)、§4.2：抓取。** 运动同时处理手和物体动力学，但使用了中间抓握要求。不能概括成无需任务设计的自主灵巧操作。

<!-- figure-ref-v6:start:rc-75-figure-4 -->
<figure class="reading-evidence-figure" id="rc-75-figure-4"><a href="/robot-classic/assets/figure-refs-v6/075-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/075-fig-4.png" width="331" height="305" alt="平面抓取器、球体和三处黑色接触点" loading="lazy"></a><figcaption>Michael Posa、Cecilia Cantu、Russ Tedrake（2014），图 4，PDF 第 13 页；<a href="https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf#page=13" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。 本图为裁切摘录，按<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC-BY-NC-SA-4.0</a>提供；<a href="https://dspace.mit.edu/entities/publication/c55ff3f4-e533-4097-a23e-c34821e3ad96" target="_blank" rel="noopener noreferrer">版本与许可记录</a>。</figcaption></figure>

读图：黑点是候选接触位置，手指关节与球体都参与动力学；中间抓握约束仍由任务设计者给定。
<!-- figure-ref-v6:end:rc-75-figure-4 -->

3. **[图 5](#rc-75-figure-5)、§4.3：成本下降及副作用。** Spring Flamingo 的名义成本由 0.18 降为 0.04；按这两个报告值计算，相对下降约 77.8%。这是指定名义轨迹成本，不是实际电池能耗下降；图注说明未要求足够抬脚高度，因此得到很低的离地间隙。

<!-- figure-ref-v6:start:rc-75-figure-5 -->
<figure class="reading-evidence-figure" id="rc-75-figure-5"><a href="/robot-classic/assets/figure-refs-v6/075-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/075-fig-5.png" width="846" height="580" alt="Spring Flamingo步行序列及优化前后质心高度随时间曲线" loading="lazy"></a><figcaption>Michael Posa、Cecilia Cantu、Russ Tedrake（2014），图 5，PDF 第 14 页；<a href="https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf#page=14" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。 本图为裁切摘录，按<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC-BY-NC-SA-4.0</a>提供；<a href="https://dspace.mit.edu/entities/publication/c55ff3f4-e533-4097-a23e-c34821e3ad96" target="_blank" rel="noopener noreferrer">版本与许可记录</a>。</figcaption></figure>

读图：下图蓝线的质心高度变化较小，但上图脚部离地很低；这正对应成本下降与未显式约束足够抬脚高度的取舍。
<!-- figure-ref-v6:end:rc-75-figure-5 -->

4. **[图 6](#rc-75-figure-6)、8：模式变化。** 初始和优化序列不同，支持互补形式能改变接触安排。超过四百万种可能组合是模型组合数量，不是求解器实际穷举并验证四百万条模式路径。

<!-- figure-ref-v6:start:rc-75-figure-6 -->
<figure class="reading-evidence-figure" id="rc-75-figure-6"><a href="/robot-classic/assets/figure-refs-v6/075-fig-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/075-fig-6.png" width="846" height="506" alt="左右脚接触模式随时间的优化前后对照" loading="lazy"></a><figcaption>Michael Posa、Cecilia Cantu、Russ Tedrake（2014），图 6，PDF 第 15 页；<a href="https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf#page=15" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。 本图为裁切摘录，按<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC-BY-NC-SA-4.0</a>提供；<a href="https://dspace.mit.edu/entities/publication/c55ff3f4-e533-4097-a23e-c34821e3ad96" target="_blank" rel="noopener noreferrer">版本与许可记录</a>。</figcaption></figure>

读图：蓝线与红虚线在左右脚接触切换的时刻明显不同，说明优化改变的是模式序列，不只是固定模式内的连续轨迹。
<!-- figure-ref-v6:end:rc-75-figure-6 -->

<!-- figure-ref-v6:start:rc-75-figure-8 -->
<figure class="reading-evidence-figure" id="rc-75-figure-8"><a href="/robot-classic/assets/figure-refs-v6/075-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/075-fig-8.png" width="846" height="381" alt="FastRunner初始及优化后的接触模式序列" loading="lazy"></a><figcaption>Michael Posa、Cecilia Cantu、Russ Tedrake（2014），图 8，PDF 第 17 页；<a href="https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf#page=17" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。 本图为裁切摘录，按<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC-BY-NC-SA-4.0</a>提供；<a href="https://dspace.mit.edu/entities/publication/c55ff3f4-e533-4097-a23e-c34821e3ad96" target="_blank" rel="noopener noreferrer">版本与许可记录</a>。</figcaption></figure>

读图：蓝色序列经历更多不同模式，不能把模式编号的高低解释成性能好坏；时间轴显示的是单个周期内的切换。
<!-- figure-ref-v6:end:rc-75-figure-8 -->

5. **[图 7](#rc-75-figure-7)、9、10：复杂模型应用。** 展示高速周期轨迹及已知台阶、落脚约束下的运动变化。它们说明任务约束可以注入优化，不能替代未知地形、扰动恢复或真实硬件的成功率证据。

<!-- figure-ref-v6:start:rc-75-figure-9 -->
<figure class="reading-evidence-figure" id="rc-75-figure-9"><a href="/robot-classic/assets/figure-refs-v6/075-fig-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/075-fig-9.png" width="809" height="181" alt="FastRunner在台阶上抬升和下降的姿态序列" loading="lazy"></a><figcaption>Michael Posa、Cecilia Cantu、Russ Tedrake（2014），图 9，PDF 第 17 页；<a href="https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf#page=17" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。 本图为裁切摘录，按<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC-BY-NC-SA-4.0</a>提供；<a href="https://dspace.mit.edu/entities/publication/c55ff3f4-e533-4097-a23e-c34821e3ad96" target="_blank" rel="noopener noreferrer">版本与许可记录</a>。</figcaption></figure>

读图：台阶任务改变了足端落点和躯干姿态；这些是已知几何约束下的规划结果，并非未知地形上的在线适应试验。
<!-- figure-ref-v6:end:rc-75-figure-9 -->

<!-- figure-ref-v6:start:rc-75-figure-10 -->
<figure class="reading-evidence-figure" id="rc-75-figure-10"><a href="/robot-classic/assets/figure-refs-v6/075-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/075-fig-10.png" width="853" height="210" alt="FastRunner跨越离散落脚平台的步态序列" loading="lazy"></a><figcaption>Michael Posa、Cecilia Cantu、Russ Tedrake（2014），图 10，PDF 第 18 页；<a href="https://dair.seas.upenn.edu/assets/pdf/Posa2014.pdf#page=18" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。 本图为裁切摘录，按<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC-BY-NC-SA-4.0</a>提供；<a href="https://dspace.mit.edu/entities/publication/c55ff3f4-e533-4097-a23e-c34821e3ad96" target="_blank" rel="noopener noreferrer">版本与许可记录</a>。</figcaption></figure>

读图：落脚平台之间的间隙迫使步幅调整，展示的是明确足端位置约束对原有周期步态的修改。
<!-- figure-ref-v6:end:rc-75-figure-10 -->

原文运输成本公式附近的叙述、负功处理和离散时间因子需要谨慎阅读：本文只引用报告的成本对比，不将印刷求和式直接包装为完整电能计算器。真正复现应明确时间积分、力矩单位、负功处理和执行器效率。

## 五、保留非凸性、初始化与离散执行差距

贡献在于把接触互补、稀疏直接轨迹优化和适合的非线性求解技巧结合，推进到较复杂的机器人模型。**优先权必须结合勘误阅读**：2014 年勘误补充了更早、独立取得类似结果的 MPEC 相关工作，因此不能把本篇写成无人先行的绝对首次。[勘误原文](https://doi.org/10.1177/0278364914533878)

减少显式模式枚举不代表消除计算困难。互补可行域非凸且退化，局部求解器可能失败或停在不理想动作。作者承认局部最优和初始化影响；我们的进一步分析是，较粗时间步还可能隐藏穿透、快速反弹或接触峰值问题。

若暂时松弛互补，迭代中的身体可以在小间隙处得到接触作用，这是数值过渡，不是可执行物理过程。最终容差必须记录；只看求解器返回成功不够。模型允许的低成本擦地步态，也可能在真实地形误差下很脆弱。

## 六、追问：两次求解得到不同接触顺序而代价相近，应先比较哪些可行性证据？

<details>
<summary>两次求解得到不同接触顺序而代价相近，应先比较哪些可行性证据？</summary>

**参考答案**：检查各自的动力学残差、非穿透与互补关系，再核对离散时间和候选接触定义。不同顺序可能都是局部结果，目标值接近既不证明同一物理解，也不证明任何一个全局最优。真实执行能力仍需独立验证。

教学参照：[Underactuated Robotics: Planning and Control through Contact](https://underactuated.mit.edu/contact.html)。这里借用其分开连续运动、接触事件与数值实现的讲法。

</details>

## 七、比较软接触与全身一致性模型

- **平行路线**：[手部 CIO：把何时接触、在哪里施力一起优化](072-contact-implicit.md)。对照软物理约束的动作合成，不能混用可行性承诺。
- **模块组合**：[质心动力学与全身运动学：怎样少算方程而不丢掉身体](080-wholebody-qp.md)。联合全身运动学与质心动力学时，也需明确接触约束的作用。

## 八、自测与参考答案

### 问题 1：为何仅写“接触距离乘支持力等于零”不够？

**答案：** 乘积为零不能排除负间隙或负法向力。必须同时规定非穿透与单边支持。三者合起来才表达分离时零力、贴合时允许非负力，而且接触状态仍允许零力。

### 问题 2：不预设模式顺序，是否意味着与初始化无关？

**答案：** 不是。优化允许改变模式，但仍在非凸问题中做局部搜索，初始化会影响可达的局部解与收敛。它扩大了允许搜索的空间，没有证明任意起点都能找到同一最优动作。

### 问题 3：为什么最低成本的抓取轨迹可能变成把球弹起来？

**答案：** 如果目标只要求球最终到某处，没有要求稳定持握、接触过程或力闭合，弹起也可能满足数学条件。优化器执行的是目标和约束，人的语义意图需要明确编码；这不是单靠更强求解器就会自动解决的问题。
