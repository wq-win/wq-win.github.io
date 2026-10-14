# 077｜LOAM：用两种速度处理同一片点云

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](076-lsdslam.md) · [下一篇](078-svo.md)

**论文**：Ji Zhang、Sanjiv Singh，*LOAM: Lidar Odometry and Mapping in Real-time*，RSS 2014。[会议原稿](https://www.roboticsproceedings.org/rss10/p07.pdf)。

### 先接住前作的问题

[ICP](028-icp.md)建立点云配准的迭代范式，运动雷达又带来扫描内畸变与实时预算的冲突。LOAM用时序补偿、线面特征及双速配准分工。

## 一、问题设定：扫描内运动怎样与实时点云配准一同估计

相机一帧照片尚且可能有滚动快门，旋转激光雷达的问题更直观：左边的墙可能在零点几秒前测到，右边的柱子在稍后才测到。机器人一直在走，直接把所有点当成同一瞬间的观测，墙就可能歪斜。

### 问题定义与先修概念

这是在线状态估计与建图，不是训练控制策略。输入为带采集时序的激光点和扫描组织信息，输出为雷达相对于地图的六自由度位姿及点云地图。动作、奖励和回合终止不是本文的算法元素。

五个前置概念：**刚体变换**把一个坐标系中的点转换到另一个坐标系；**点云配准**寻找让两组几何观测一致的变换；**运动畸变**来自一帧扫描内不同点的采样时间差；**局部可观测性**描述现有几何能否区分不同方向的运动；**里程计漂移**是小步误差累积后的长期偏差。

原实验自制雷达使用电机驱动 Hokuyo 扫描器往复转动，单次完整 sweep 为一秒。论文 §IV 的里程计约 10 Hz、建图约 1 Hz，来自在 sweep 尚未结束时递归使用已经到达的点。因此“一秒一圈”与“每秒十次运动输出”不矛盾，也不能据此假定每次输出都包含新的完整三维扫描。

KITTI 则使用另一种旋转雷达，数据以 10 Hz 记录。传感器的扫描组织、时间补偿方式和对应搜索必须适配，不能把自制雷达的所有具体参数直接搬到它上面。

## 二、用线面特征和双速模块组织运动补偿

### 从点到线与面的约束

§V-A 沿同一条激光扫描线计算邻域变化。用教学记号表达其平滑度：

$$s_i=\frac{\|\sum_{j\in\mathcal N_i}(p_i-p_j)\|}{|\mathcal N_i|\,\|p_i\|}.$$

变化大可能是边缘，变化小可能是平面。但“大变化”也可能是遮挡边界：视角稍变就消失的边界不适合稳定配准。因此原算法另有遮挡、掠射等筛选，并限制特征的空间聚集。这里的平滑度不是连续曲面曲率的严格微分定义。

设当前点经待估变换后为 $p'=Rp+t$，对应边由 $a,b$ 确定，点到线距离为

$$d_e=\frac{\|(p'-a)\times(p'-b)\|}{\|a-b\|}.$$

对应平面取单位法向 $n$ 和平面点 $a$，则有符号点到面残差为

$$r_p=n^T(p'-a).$$

原文式 2、3 给出等价的几何距离表达。距离只惩罚几何真正约束的方向：平面不能辨别沿自身平面的平移，一条直线不能约束沿线滑动。很多同方向平面未必比少量方向互补的几何更有信息。

### 快模块估计运动，慢模块修正地图中的位置

里程计把当前扫描中的特征关联到上一 sweep 的结构；边对应要利用不同扫描线的点，面对应使用三个点构造局部平面。原文 §V-C 假设 sweep 内角速度与线速度近似恒定，用六参数姿态的时间插值表达每个点的采集位置。这是原文的近似，不能等同于任意高速运动下精确的连续时间刚体积分。

统一写成教学目标：

$$\min_\theta \sum_i w_i d_{e,i}(\theta)^2+\sum_j w_j r_{p,j}(\theta)^2.$$

参数 $\theta$ 表示运动；权重用于降低异常对应的影响。原稿采用迭代非线性优化和 bisquare 鲁棒权重，残差超过阈值的点权重可置零。对应关系与运动交替更新，初始化仍很重要。

建图模块在 sweep 结束后工作，把去畸变点云对齐到已有地图。它使用更多特征，从地图邻域协方差的特征值和特征向量判断线、面结构；地图按立方区域组织，选择相关区域构建搜索结构。这里的“慢”允许更充分的几何约束，并不是把所有历史位姿都重新做一次全局优化。

数学目标是几何一致性；算法机制是特征选择、时间补偿与双频率分工；实验指标则是漂移、地图匹配误差与实时处理表现。三者不能互相替代：残差更小不一定意味着真值误差更小，因为错误关联也可能被拟合得很好。

去畸变的坐标顺序值得单独验证。令 $T(t)$ 把时刻 $t$ 的雷达坐标映射到世界，点在自己的采样时刻测为齐次坐标 $p(t)$，统一到扫描结束 $t_e$ 时应为

$$p_e=T(t_e)^{-1}T(t)p(t).$$

原创一维例：扫描持续1秒，雷达从世界位置0以1米/秒匀速前进，静止目标在10米。最早读数为10，最晚读数为9；经 $p_e=p(t)+t-1$ 变换，二者都为9。不处理时间，便把同一个目标画成1米厚；若误用逆向相对变换 $T(t)^{-1}T(t_e)$，则会进一步拉开。这里用纯平移隔离时间问题，原文§V-C的六参数插值还包含旋转近似，急转加速时需要重新评价模型。

双速线程也不应把旧的地图修正直接冒充当前位姿。教学实现可在建图时刻 $t_0$ 保存 $T_{M O}=T_{M B}(t_0)T_{O B}(t_0)^{-1}$，再以 $T_{M B}(t)=T_{M O}T_{O B}(t)$ 发布当前结果；$M,O,B$ 分别表示地图、里程计和雷达体坐标。这把低频漂移修正与已经发生的高频增量拼接起来，解释了“两种速度”如何合作，而非只是开两个线程。

快里程计先给扫描内运动近似，慢建图再用积累几何修正。下面按点的采集时刻检查两层接口，避免把点云当静态快照。

## 三、按采集时刻校正点，再完成地图配准

```text
输入：带时序的扫描点、上一 sweep 点云、已有地图
扫描期间反复执行：
    从已到达的点提取稳定边缘和平面特征
    用当前运动近似，把特征变换到统一时刻
    在上一 sweep 中查找对应线与面
    更新鲁棒权重，优化扫描期间的六自由度运动
    发布快速里程计增量
完整 sweep 结束时：
    依据各点采集时间执行去畸变
    用里程计结果初始化扫描到地图配准
    在地图局部邻域估计线、面，优化地图中的位姿
    插入点云、维护地图，将修正与后续里程计增量组合
输出：高频位姿与较低频率更新的点云地图
```

## 四、核对里程计和建图实验的输入与真值

<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/077-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/077-evidence.png" width="726" height="939" alt="Fig. 12：上方轨迹与下方地图对照不同 IMU 使用方式：直接使用有漂移的朝向可能使几何结构变差，预处理辅助与完全信任朝向不是一回事" loading="lazy"></a><figcaption>原论文结果图／表摘引：Ji Zhang、Sanjiv Singh（2014），Fig. 12，PDF 第 8 页；<a href="https://www.roboticsproceedings.org/rss10/p07.pdf#page=8" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：上方轨迹与下方地图对照不同 IMU 使用方式：直接使用有漂移的朝向可能使几何结构变差，预处理辅助与完全信任朝向不是一回事。视觉对齐仍不能代替独立逐时刻真值。

### 实验设定与比较的公平性

KITTI 排名是发表时的历史记录；原始 LOAM、额外 IMU 辅助版本与后来的 LeGO-LOAM、回环系统不能混作一个输入条件。

| 项目 | 原文设置与要验证的问题 |
|---|---|
| 自采场景 | 走廊、大厅、植被道路、果园；主要地图实验移动速度 0.5 m/s |
| 局部地图精度 | 另采静止雷达点云，用点到面 ICP 对齐后统计距离；检验地图局部几何一致性 |
| 累积漂移 | 室内以返回起点的闭合间隙评价，果园用高精 GPS/INS 真值；评价定义不同 |
| IMU 实验 | Xsens MTi-10 辅助扫描预处理，与不辅助及固定 IMU 朝向方案比较；真值用卷尺测量 |
| KITTI | 使用激光数据，不使用相机图像作为算法输入；GPS/INS 用于基准真值 |
| 计算平台 | 2.5 GHz 四核笔记本、6 GiB 内存、Linux/ROS，两个算法占用两个核 |
| 重复与统计 | [表 I](https://www.roboticsproceedings.org/rss10/p07.pdf#page=7) 每类列两次测试，[表 II](https://www.roboticsproceedings.org/rss10/p07.pdf#page=8) 列四个场景；没有统一多随机种子显著性检验 |

KITTI 的服务器排名允许不同传感器方法一起比较，不代表等传感器、等算力的控制变量实验。自采地图误差先通过 ICP 对齐，适合评价形状，不能同时当作绝对地理坐标精度。辅助 IMU 的比较属于增加传感器信息后的系统结果，也不能算作纯激光模块的无代价改善。

### 五处证据：结论能走多远

**[图 5](#rc-77-figure-5)、[图 6](#rc-77-figure-6)（PDF 第 4 页）：畸变与时间补偿。** 图示解释移动扫描为何形成歪斜结构，以及怎样统一时间戳。它支持问题机制，不是独立统计证明补偿在所有运动下有效。

<!-- figure-ref-v6:start:rc-77-figure-5 -->
<figure class="reading-evidence-figure" id="rc-77-figure-5"><a href="/robot-classic/assets/figure-refs-v6/077-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/077-fig-5.png" width="640" height="300" alt="运动扫描产生几何畸变的彩色激光点云" loading="lazy"></a><figcaption>Ji Zhang、Sanjiv Singh（2014），图 5，PDF 第 4 页；<a href="https://www.roboticsproceedings.org/rss10/p07.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：移动中采集的一次扫描包含不同时间的点，几何边界因此会歪斜；这幅点云是畸变机制的例子。
<!-- figure-ref-v6:end:rc-77-figure-5 -->

<!-- figure-ref-v6:start:rc-77-figure-6 -->
<figure class="reading-evidence-figure" id="rc-77-figure-6"><a href="/robot-classic/assets/figure-refs-v6/077-fig-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/077-fig-6.png" width="640" height="138" alt="扫描起止时间与激光点姿态补偿示意" loading="lazy"></a><figcaption>Ji Zhang、Sanjiv Singh（2014），图 6，PDF 第 4 页；<a href="https://www.roboticsproceedings.org/rss10/p07.pdf#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：横轴是扫描时间，箭头将不同时刻的点映射到统一时刻；该关系不等于所有运动模式下的误差保证。
<!-- figure-ref-v6:end:rc-77-figure-6 -->

**[图 10](#rc-77-figure-10)、[图 11](#rc-77-figure-11)（第 6—7 页）：地图及误差分布。** 人工结构场景的配准误差小于植被场景，说明几何对应质量影响最终地图。与静止扫描对齐后的分布不能证明整个长轨迹无漂移，也不评价地图未覆盖区域。

<!-- figure-ref-v6:start:rc-77-figure-10 -->
<figure class="reading-evidence-figure" id="rc-77-figure-10"><a href="/robot-classic/assets/figure-refs-v6/077-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/077-fig-10.png" width="1293" height="661" alt="走廊、大厅、植被道路及果园的地图和实景八面板" loading="lazy"></a><figcaption>Ji Zhang、Sanjiv Singh（2014），图 10，PDF 第 7 页；<a href="https://www.roboticsproceedings.org/rss10/p07.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：每对面板将重建与同场景照片并列，规则建筑与植被的几何差异为后面的配准误差比较提供背景。
<!-- figure-ref-v6:end:rc-77-figure-10 -->

<!-- figure-ref-v6:start:rc-77-figure-11 -->
<figure class="reading-evidence-figure" id="rc-77-figure-11"><a href="/robot-classic/assets/figure-refs-v6/077-fig-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/077-fig-11.png" width="640" height="329" alt="四类场景的匹配误差密度分布" loading="lazy"></a><figcaption>Ji Zhang、Sanjiv Singh（2014），图 11，PDF 第 6 页；<a href="https://www.roboticsproceedings.org/rss10/p07.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：走廊和大厅的误差分布更窄，植被场景分布更宽；这里测量的是地图与静止扫描之间的配准误差。
<!-- figure-ref-v6:end:rc-77-figure-11 -->

**[表 I](https://www.roboticsproceedings.org/rss10/p07.pdf#page=7)（第 7 页）：累积漂移。** 走廊 58 m、46 m 的相对误差分别为 0.9%、1.1%；果园 52 m、67 m 为 2.3%、2.8%。这些是不同记录上的测量，支持该实验范围内的低漂移；不能把四个比例当作同分布重复试验的置信区间。

**[表 II](https://www.roboticsproceedings.org/rss10/p07.pdf#page=8)、[图 12](#rc-77-figure-12)（第 8 页）：IMU 的正确用法。** 走廊记录上，不辅助为 2.1%，IMU 预处理后为 0.9%；这是减少 1.2 个百分点，相对减少约 $1.2/2.1=57.1\%$。直接采用 IMU 朝向的方案为 16.7%，说明把有漂移的朝向当成完全准确输入可能更差。该表不能证明任何 IMU 融合结构都具有相同效果。

<!-- figure-ref-v6:start:rc-77-figure-12 -->
<figure class="reading-evidence-figure" id="rc-77-figure-12"><a href="/robot-classic/assets/figure-refs-v6/077-fig-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/077-fig-12.png" width="603" height="922" alt="激光里程计有无IMU辅助的三维轨迹与完整地图细节" loading="lazy"></a><figcaption>Ji Zhang、Sanjiv Singh（2014），图 12，PDF 第 8 页；<a href="https://www.roboticsproceedings.org/rss10/p07.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上方三条轨迹对比不同IMU使用方式，下方整幅重建与局部细节对照说明预处理影响；起点接近不能替代整条轨迹的真值误差测量。
<!-- figure-ref-v6:end:rc-77-figure-12 -->

**§VII-C（第 8 页）：KITTI。** 作者报告当时平均位置误差为路程的 0.88%，基于 100—800 m 子轨迹，覆盖数据总路程 39.2 km。这个指标不是整程终点误差；历史排名不能沿用为今天的排名。原文也没有把逐序列完整结果放入正文，而是指向基准网站。

## 五、保留几何退化、运动近似和无回环漂移

**自构例子。** 雷达面对一面无限平墙，所有点到面残差只测墙的法向方向。沿墙移动半米，残差可能几乎不变。再加入一根与墙方向不同的柱子或墙角，才补充横向定位信息。增加十万个位于同一平面的点，主要减少噪声，未必解决缺失方向的可观测性。

另一个容易忽视的代价是时间一致性：快输出使用最新里程计和较旧地图修正，消费者必须理解坐标变换的时刻。把晚到的地图修正直接当作当前全新观测，可能给控制器制造跳变；这是系统接入时需要处理的接口问题。

## 六、追问：只在已经去畸变的扫描上测误差，能否验证LOAM的运动补偿机制？

<details>
<summary>只在已经去畸变的扫描上测误差，能否验证LOAM的运动补偿机制？</summary>

**参考答案**：不能直接验证，因为关键输入困难已由外部预处理消除。应声明扫描时序与预处理，在有扫描内运动的数据上单独检查补偿，并分开评价后续配准。更低轨迹误差也可能来自不同输入信息，而非双速组织本身。

</details>

## 七、加入地面先验，或紧耦合惯性

- **直接继承**：[LeGO-LOAM：利用地面结构，让激光里程计更轻](095-legoloam.md)。加入地面和点云分割先验以降低小平台的配准负担。
- **模块组合**：[LIO-SAM：让激光、惯性、GPS 与回环共同解释运动](097-liosam.md)。再将惯性与激光约束接入统一因子图。

## 八、自测与参考答案

**1．只增加建图线程频率，是否一定让输出更准确？**

不一定。计算资源不足时会挤压里程计、产生积压；每次配准若使用更少数据或尚未完成去畸变，约束也可能更差。需要同时测延迟、处理吞吐、对应质量和真值误差，而不是单看线程频率。

**2．为什么点到面方法在长走廊可能漂移，即使墙面特别平整？**

墙面沿走廊方向近似不变，沿该方向移动对残差影响很小。优化的某些方向因此弱约束；平整能减少测量噪声，却不能凭空创造缺失的几何信息。转角、端墙或其他传感器才可能补足约束。

**3．[表 II](https://www.roboticsproceedings.org/rss10/p07.pdf#page=8) 的 Ours+IMU 优于 Ours，能否据此说原始纯激光系统在快速运动时同样可靠？**

不能。辅助方案用了额外惯性信息校正扫描内非线性运动，改变了输入条件。它支持组合系统的收益，也间接说明纯激光匀速近似的边界；应分别报告两种设置。
