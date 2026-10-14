# 095｜LeGO-LOAM：利用地面结构，让激光里程计更轻

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](094-cheetah-mpc.md) · [下一篇](096-teaser.md)

**论文**：Tixiao Shan、Brendan Englot，*LeGO-LOAM: Lightweight and Ground-Optimized Lidar Odometry and Mapping on Variable Terrain*，IROS 2018。[作者稿 PDF](https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf) · [官方代码与使用说明](https://github.com/RobustFieldAutonomyLab/LeGO-LOAM) · [出版记录](https://doi.org/10.1109/IROS.2018.8594299)。

### 先接住前作的问题

[LOAM](077-loam.md)已把快速里程计与低频建图分开，但地面车的植被点和算力限制仍造成瓶颈；LeGO-LOAM 直接承接这一架构，加入地面分割和分阶段配准。

## 一、问题设定：地面车怎样筛掉昂贵又不稳定的激光特征

小型地面机器人经过草地、树林和不平路面时，扫描里有大量草叶、小树枝和不稳定点。把它们都作为特征，既耗算力，也容易把不同扫描中的不同东西误配起来。

### 背景与问题：小平台上的 LOAM 为什么吃力

本篇是在线六自由度定位与建图。输入是激光扫描，可使用 IMU 提供运动辅助；输出是相对运动、位姿和点云地图。没有强化学习奖励、示范数据或策略更新。

参考方法 LOAM 将较快的里程计与较慢的地图配准分开。LeGO-LOAM 沿用这一分工及点到线、点到面的配准思想，改变的是哪些点进入处理，以及如何利用地面几何拆分优化。

原文强调两类现实问题：嵌入式计算资源不足，以及草木点云形成看似尖锐、实际不稳定的特征。直接提高特征阈值又可能让干净场景缺少足够约束，因而作者在特征提取之前加入几何筛选。

“地面优化”不要求整个世界是一张严格水平平面。原文第 III-B 节说明，地面提取考虑可变地形；但系统仍依赖足够可用的地面观测。这与任意手持、飞行姿态下完全不依赖地面的算法不同。

## 二、用距离图分割，再分阶段估计运动

### 方法第一步：把点云变成有组织的距离图

旋转式多线激光雷达可按扫描线和水平角度组织成二维图像，每个位置记录距离。相邻像素对应近邻射线，因此地面判断、连通分割和局部粗糙度计算都能利用扫描结构。

作者的 VLP-16 设置使用 16 行距离图。系统先标记地面，再对其余点分组，去掉过小或不适合稳定匹配的结构。原文示例以少于 30 点的小簇筛除说明处理方式；实际移植应核对版本中的完整判断条件，不能把一个论文阈值视为所有雷达通用规则。

分割标签是几何连通分组，不是神经网络识别出的“树”“汽车”“人”。它也不是跨时间永久不变的物体身份编号。筛掉小簇可能减少草叶干扰，却不构成完整的动态物体检测。

### 方法第二步：筛选有几何意义的特征

局部粗糙度衡量某个距离与同一扫描行邻近距离的差异。大的变化倾向于边缘，小的变化倾向于平面。为避免所有特征集中在一个方向，距离图被分区选点。

平面特征与边缘特征承担不同作用。地面上的平面点能稳定限制某些运动分量；非地面分割结构中的边缘则补足另外的方向。匹配时标签与几何条件缩小不合理对应的范围。

这里的重要取舍是：少一些点，可以更快，也可能更准，前提是去掉的主要是不可靠或冗余信息。如果恰好去掉了唯一能约束某个方向的结构，问题就会退化。点少本身不是精度提升的原因。

### 方法第三步：为什么分成两次优化

令刚体变换 $T=(R,t)$。点到平面的教学残差为：

$$
r_p(T)=n^\mathsf T(Rp+t-q),
$$

其中 $q,n$ 是对应平面的点与单位法向。点到线距离可写为：

$$
r_e(T)=\frac{\|(Rp+t-a)\times(Rp+t-b)\|}{\|a-b\|}.
$$

$a,b$ 定义对应线。优化让这些几何距离变小，不是在拟合语义标签，也不是最小化完整地图的所有误差。

第 III-D 节先用地面平面特征估计 $t_z,\theta_{roll},\theta_{pitch}$，再将这些量作为条件估计 $t_x,t_y,\theta_{yaw}$。第一步得到的水平分量不作为最终水平估计使用，因为地面对它们的约束较弱。

可以用一张理想无限平面理解：沿平面平移或绕法向旋转，不改变点到平面的距离；但向上抬、横滚或俯仰会改变残差。第二阶段需要其他结构填补这些自由方向。

这不是证明两个子问题在所有场景下严格等价于联合六维最优解，而是利用典型地面车观测结构的计算策略。地面估计错误可能传到后续阶段。

把地面的自由方向写进雅可比，会比“地面约束三个自由度”更具体。取局部地面为 $z=0$，法向 $n=(0,0,1)$，地面点 $p=(a,b,0)$；在接近单位变换处使用小旋转 $\delta\theta=(\delta\phi,\delta\vartheta,\delta\psi)$，有 $Rp\approx p+\delta\theta\times p$。点到平面残差的一阶变化于是为

$$\delta r=\delta t_z+b\delta\phi-a\delta\vartheta.$$

这里 $\phi,\vartheta,\psi$ 分别表示横滚、俯仰和偏航。$\delta t_x,\delta t_y,\delta\psi$ 的系数全为零，沿平面滑动与偏航处在理想地面残差的零空间；点再多也不会凭数量消除这些自由方向。

**原创三点检查。** 选以米计的地面点 $(0,0,0),(1,0,0),(0,1,0)$，对未知量 $(\delta t_z,\delta\phi,\delta\vartheta)$ 的雅可比为 $J=\begin{bmatrix}1&0&0\\1&0&-1\\1&1&0\end{bmatrix}$。若希望产生的残差改变量为 $d=(0.02,0.01,0.04)^T$，解 $J\delta=d$ 得到高度变化 0.02 m、横滚 0.02、俯仰 0.01，两个角量以弧度计；水平平移与偏航仍完全未定。真实优化若要消除已有残差，则右端应取其负值，不能混淆符号。

不平地形会让不同点的法向倾斜，理想零系数可能变为小而非零，故分阶段是利用强弱约束的近似，不是普适解耦定理。[原文III-D与表III](https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf)所示节时还与每步处理的特征数有关；第二步迭代数未必更少，不能单凭“三维比六维小”断言总成本必然减半。

地图模块与帧间里程计具有不同频率和工作量，不能把二者的耗时简单当作每帧串行延迟。

地面先约束部分自由度，边缘再补充其余方向。下面检查分割与两步求解的依赖，再把环境先验与计算收益一起报告。

## 三、提取地面和平面边缘，检查自由度分工

```text
输入：当前激光扫描、扫描结构参数、可选 IMU 辅助
将点云投影到距离图
提取地面，分割非地面点，筛除不稳定的小簇
分区计算粗糙度并选择平面、边缘特征
与上一扫描建立符合标签和几何条件的对应
用地面平面残差优化高度、横滚、俯仰
固定相应估计，利用边缘残差优化水平位移和偏航
输出较高频里程计
在较低频地图模块中匹配局部地图并细化变换
保存位姿关联的特征；需要时检测回环并优化位姿图
输出融合位姿与地图
```

### 自构例子与前置概念

**自构例子，未运行**：机器人在平整空旷停车场前进。地面让高度与倾斜角容易估计，但没有路灯杆、墙角或其他稳定边缘时，水平运动与偏航仍可能不确定。加入一根固定杆，才提供新的几何约束；增加更多同一平面的点不能自动替代这根杆。

如果把雷达向上倾斜到看不见地面，原来的两阶段分工就失去依据。这个例子说明，环境先验必须与实际视野匹配。

五个前置概念：

1. **距离图**：按射线方向组织激光距离的二维表示。
2. **点到面残差**：衡量点偏离对应局部平面的程度。
3. **点到线残差**：衡量点偏离对应局部边缘的程度。
4. **几何退化**：观测不能区分某些运动方向。
5. **里程计与回环**：前者积累局部运动，后者用重访地点约束长期漂移。

## 四、读植被场景漂移与计算量对照

### 结果：把准确、快速与回环分别看

**[图 4](#rc-95-figure-4)、5。** 植被场景的特征与地图；筛选可减少不稳定关联；不能据此推出：所有被删点都是噪声。

<!-- figure-ref-v6:start:rc-95-figure-4 -->
<figure class="reading-evidence-figure" id="rc-95-figure-4"><a href="/robot-classic/assets/figure-refs-v6/095-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/095-fig-4.png" width="640" height="515" alt="原论文图4：植被场景中LOAM与LeGO-LOAM提取的边缘和平面特征" loading="lazy"></a><figcaption>Tixiao Shan、Brendan Englot（2018），图 4，PDF 第 5 页；<a href="https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：实景与两套特征投影对应同一植被环境；特征几何稳定性需要结合后续地图结果判断。
<!-- figure-ref-v6:end:rc-95-figure-4 -->

<!-- figure-ref-v6:start:rc-95-figure-5 -->
<figure class="reading-evidence-figure" id="rc-95-figure-5"><a href="/robot-classic/assets/figure-refs-v6/095-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/095-fig-5.png" width="640" height="259" alt="原论文图5：同一植被环境中LOAM与LeGO-LOAM的地图比较" loading="lazy"></a><figcaption>Tixiao Shan、Brendan Englot（2018），图 5，PDF 第 5 页；<a href="https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：白箭头标记同一棵树在LOAM地图中的重复出现；这是该序列的关联失败示例。
<!-- figure-ref-v6:end:rc-95-figure-5 -->

**[图 7](#rc-95-figure-7)、9。** 复杂路线及 10 次回放轨迹；在所测困难路段改善重复运行表现；不能据此推出：所有环境都不漂移。

<!-- figure-ref-v6:start:rc-95-figure-9 -->
<figure class="reading-evidence-figure" id="rc-95-figure-9"><a href="/robot-classic/assets/figure-refs-v6/095-fig-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/095-fig-9.png" width="640" height="463" alt="原论文图9：LOAM与LeGO-LOAM在两种计算平台上十次运行的轨迹" loading="lazy"></a><figcaption>Tixiao Shan、Brendan Englot（2018），图 9，PDF 第 7 页；<a href="https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：四个面板同时分开算法与平台因素，重叠程度展示重复运行差异；不能只选一条最好的轨迹。
<!-- figure-ref-v6:end:rc-95-figure-9 -->

**[表 III](https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=7)。** 联合与两阶段优化的迭代及耗时；分阶段计算可节省时间；不能据此推出：总迭代次数必然更少。

**[表 IV](https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=7)、V。** 模块成本与返程误差；同一平台上观察效率和精度；不能据此推出：将不同硬件混成一个比较。

**[图 10](#rc-95-figure-10)。** KITTI 回环结果；系统可以集成回环；不能据此推出：全 KITTI 榜单领先。

<!-- figure-ref-v6:start:rc-95-figure-10 -->
<figure class="reading-evidence-figure" id="rc-95-figure-10"><a href="/robot-classic/assets/figure-refs-v6/095-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/095-fig-10.png" width="537" height="299" alt="原论文图10：KITTI闭环测试的LeGO-LOAM地图和真值轨迹对照" loading="lazy"></a><figcaption>Tixiao Shan、Brendan Englot（2018），图 10，PDF 第 8 页；<a href="https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：左图用高度着色地图，右图并列估计轨迹与真值；这一闭环测试的轨迹接近，不意味着所有路段误差都相同。
<!-- figure-ref-v6:end:rc-95-figure-10 -->

[表 III](https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=7) 的细节很有启发：第二阶段迭代数与原联合方法接近，第一阶段还增加了少量迭代，但每次处理的特征与变量不同，所以总时间仍下降。论文报告该里程计优化时间减少约 34%–48%。把它改写为“迭代次数减少 48%”就错了。

[表 IV](https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=7) 路线 1 的 Jetson 结果中，特征提取约 105.1→9.1 ms，里程计约 133.4→19.3 ms；LeGO-LOAM 另有约 29.3 ms 分割开销。地图模块仍约 266.7 ms，因此不能宣称整个系统每个模块都在一个 100 ms 扫描周期内完成。

[表 V](https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=8) 的路线 3 在 Jetson 上，返回起点的平移误差为 LOAM 69.40 m、LeGO-LOAM 13.93 m；在笔记本上分别为 62.11 m、14.87 m。改善明显，但后者仍有米级累计漂移，不能写成“消除了定位误差”。

KITTI 实验将每帧约 75% 的点省去，使用序列 00 并加入 ICP 回环、iSAM2 图优化。原文明确没有用这个演示给出完整 KITTI 速度公平排行榜。额外回环与数据下采样都必须随结果一起报告。

<!-- figure-ref-v6:start:rc-95-figure-7-anchor -->
<span id="rc-95-figure-7"></span>
<!-- figure-ref-v6:end:rc-95-figure-7-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/095-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/095-evidence.png" width="1571" height="348" alt="Fig. 7：同一人行道片段把地图与横截面并排比较：LOAM 的高度漂移与 LeGO-LOAM 的地面约束效果更容易在侧视中辨认" loading="lazy"></a><figcaption>原论文结果图／表摘引：Tixiao Shan、Brendan Englot（2018），Fig. 7，PDF 第 6 页；<a href="https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：同一人行道片段把地图与横截面并排比较：LOAM 的高度漂移与 LeGO-LOAM 的地面约束效果更容易在侧视中辨认。局部结构改善不等于整段长路线没有累计误差。

地面约束先验帮助分解优化，但平面本身仍不能观测沿面的位移和偏航；KITTI 00 回环示例也不是完整排行榜对比。

原文第 IV 节比较 LOAM 与 LeGO-LOAM，使用 Jetson TX2 和 i7-4710MQ 笔记本；实验采用 CPU，没有把设备名称中的 GPU 视为已经使用 GPU 加速。两种方法都以 C++、ROS 实现。

| 实验 | 数据与规模 | 比较内容 | 指标和验证意图 |
|---|---|---|---|
| 小范围植被 | 草、树、墙等结构，包含较激烈转向 | 同阈值特征、同初始 IMU 猜测 | 看不稳定特征如何造成地图分裂 |
| 室外路线 1 | 8077 扫描，1.09 km | 平顺运动、结构较充分 | 两方法是否都能低漂移 |
| 室外路线 2 | 8946 扫描，1.24 km | 同区域但进入特征不稳定路段 | 分割是否改善关联 |
| 室外路线 3 | 20834 扫描，2.71 km，地形起伏 | 两硬件平台上的长路线 | 稳定性、终点漂移与耗时 |
| KITTI 回环 | 序列 00，HDL-64E 下采样 | LeGO-LOAM 加位姿图 | 说明低算力回环集成可行性 |

前三条路线结果平均自每个数据集的 **10 次实时回放**。这不是独立采集的 10 条路线，也不能当作十个随机训练种子。重放重复主要显示实时调度与数值处理下的运行差异。

终点误差来自机器人返回初始位置后的估计偏差，不是带有全程定位真值的 ATE。卫星图叠加与地图外观提供补充证据，无法替代每一时刻的真值。

## 五、保留地面先验、投影配置与几何退化

真正的改动包括分割在特征提取前的使用、地面与非地面特征的不同分工、两阶段运动估计，以及位姿关联特征地图的组织方式。原有几何配准与 LM 优化等技术被沿用。

局限同样来自这些选择：地面点不足或误分割时，第一阶段缺少可靠约束；重复建筑边缘或长走廊仍可能退化；小簇筛除也可能删除有用的细结构。

官方 README 明确要求正确的距离图投影和足够地面点，新雷达需要调整参数；可选 IMU 的坐标对齐错误反而会损害结果。README 还说明仓库中的简单 ICP 回环在漂移过大时常失败，不能等同于强大的全局地点识别。

作者在结论讨论无人机扩展时，建议没有地面假设的分割与恢复联合 LM 等改动。这是提出的扩展方向，不是本篇已经用无人机实验验证的能力。

## 六、追问：地面提取失败时，为什么不能只把第一阶段误差留给第二阶段自然修正？

<details>
<summary>地面提取失败时，为什么不能只把第一阶段误差留给第二阶段自然修正？</summary>

**参考答案**：两阶段分工依赖第一阶段提供的姿态与高度信息，后续边缘优化并非自动拥有全部缺失约束。应记录地面可见性和特征几何，检查失败如何传播。环境先验带来的加速必须连同失效条件报告。

</details>

## 七、在激光建图中进一步紧耦合惯性

- **直接继承**：[LIO-SAM：让激光、惯性、GPS 与回环共同解释运动](097-liosam.md)。继续发展激光建图并紧耦合惯性与全局因子。

## 八、自测与参考答案

### 问题一：为什么一大片地面不足以确定全部六自由度运动？

**答案**：理想平面上的点到面距离对沿平面的平移及绕法向的旋转不敏感，因此这些方向缺少约束。地面主要帮助高度、横滚和俯仰；水平位移与偏航需要其他结构。更多同一平面点不能解决几何可观测性不足。

### 问题二：两阶段优化为什么可能迭代次数没少，却更快？

**答案**：每轮计算的变量、特征数量和残差不同。第一阶段很快确定地面约束较强的分量，第二阶段处理更少的有效特征；总成本取决于每次迭代工作量，而不仅是次数。[表 III](https://personal.stevens.edu/~benglot/Shan_Englot_IROS_2018_Preprint.pdf#page=7) 与 IV 应一起读。

### 问题三：KITTI 序列 00 回环后地图很好，能否证明该方法在完整 KITTI 上优于 LOAM？

**答案**：不能。这里只演示一个序列，使用下采样和额外回环，且没有覆盖完整相同速度与设置的排行榜比较。它支持系统集成与低算力运行的可行性，不能扩大成所有序列、所有精度指标上的领先。
