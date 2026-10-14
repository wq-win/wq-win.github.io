# 086｜EuRoC：一张定位成绩表背后，真值是怎样产生的

[返回总览](00-发展时间线总览.md) · [上一篇：DSO](085-dso.md) · [下一篇：GPMP2](087-gpmp2.md)

**论文**：Michael Burri 等，*The EuRoC Micro Aerial Vehicle Datasets*，IJRR 2016。[正式论文](https://doi.org/10.1177/0278364915620033) · [ETH 官方数据说明](https://projects.asl.ethz.ch/datasets/euroc-mav/) · [作者公开稿](https://www.researchgate.net/profile/Michael-Burri/publication/291954561_The_EuRoC_micro_aerial_vehicle_datasets/links/56af0c6008ae19a38516937c/The-EuRoC-micro-aerial-vehicle-datasets.pdf?origin=publication_detail)。

### 先接住前作的问题

[TUM RGB-D](069-tum-rgbd.md)和[KITTI](070-kitti.md)分别提供室内深度与车载评测，但不能覆盖微型飞行器的惯性、同步和快速转动条件；EuRoC 补上这一平行基准。

## 一、问题设定：飞行视觉惯性轨迹怎样与独立参考测量对齐

EuRoC 不是提出一个更准的 SLAM 算法，而是让不同算法有共同的考场。作者在无人机上记录双目图像、IMU，以及独立测量系统的参考轨迹，还提供传感器标定、时间关系和部分场景的三维扫描。

### 研究背景与任务

无人机具有快速转动、振动、运动模糊和光照变化，静态相机或匀速车辆的测试不能完全代表这些困难。EuRoC 包含机器大厅和两种 Vicon 房间配置，共十一段序列，由易到难覆盖不同运动和成像条件。

这是一篇数据集论文。观测是图像、角速度和比力；待评估算法通常输出位姿、速度、偏置或地图。原论文没有定义强化学习动作、奖励和回合终止条件。序列结束只是记录结束，不表示完成了某个控制任务。

“飞行数据”也不等于每个样本都处于空中。开头用于初始化的运动、起飞和着陆区间会影响评测。后续研究如果裁剪开头，应报告具体区间；不同裁剪规则的数值不能直接并排比较。

## 二、统一传感器标定、时间和被测刚体坐标

### 1. 传感器与不同层次的真值

第 2 节和[表 1](https://www.researchgate.net/profile/Michael-Burri/publication/291954561_The_EuRoC_micro_aerial_vehicle_datasets/links/56af0c6008ae19a38516937c/The-EuRoC-micro-aerial-vehicle-datasets.pdf?origin=publication_detail#page=3)：两台全局快门灰度相机各 20 Hz，视觉惯性单元的 IMU 为 200 Hz；它不是飞控自带 IMU。Leica 激光跟踪约 20 Hz，原始输出三维位置；Vicon 约 100 Hz，输出六自由度位姿。相机曝光中点与 IMU 硬件同步。

后处理还提供 IMU 采样频率上的完整状态估计。**不能因此说 Leica 原始设备直接测到了 200 Hz 六自由度真值。** 完整参考状态包含离线平滑和惯性信息，原始外部测量与后处理结果具有不同含义。

### 2. 坐标变换不是文件格式小事

论文把机体坐标系 $B$ 定义在 IMU，$S$ 是某个传感器坐标系，$W$ 是世界系。外参 $T_{BS}$ 把传感器系表示的点变换到机体系。用齐次坐标可写成：

$$p_W=T_{WB}T_{BS}p_S.$$

若算法输出 $T_{WC}$，评估 IMU 位姿时就要结合相机外参转换，不能直接拿位置列相减。作者稿第 4 节规定 Hamilton 四元数顺序为 $[q_w,q_x,q_y,q_z]$；某些软件接口采用其他顺序，必须显式转换。

时间戳是整数纳秒。较稳妥的教学做法是先减去同一个整数时间原点，再转换成秒，避免不必要的数值精度损失。这个建议是数据处理分析，不是论文提出的新算法。

### 3. 外部真值怎样对齐

第 5.2 节采用离线批量最大似然估计，把 IMU 和外部测量结合起来，估计身体运动、偏置、标记外参和时间偏移。时间偏移作为随时间变化的量处理，以考虑固定偏差和时钟漂移。

抽象地说，它是在寻找使不同传感器共同解释同一次运动的参数：

$$\min_{x,\theta}\sum_k\|r_{imu,k}(x)\|_{\Sigma_i^{-1}}^2+
\sum_l\|r_{ref,l}(x,\theta)\|_{\Sigma_r^{-1}}^2.$$

这是对作者状态估计思路的教学概括，不是原文新增编号公式。$x$ 是轨迹和偏置，$\theta$ 包括外参与时间关系。离线平滑可以使用未来数据，因此它不是一个可直接部署的因果在线定位基线。

### 4. 噪声参数是什么

第 4.3 节把惯性误差分为白噪声与偏置随机游走：$n(t)=b(t)+w(t)$，$\dot b(t)=w_b(t)$。噪声密度不是离散样本标准差本身；实现需要按采样周期及具体模型离散化。

作者明确提醒这些参数由静止数据得到，不能完全捕获飞行中的残余尺度误差与轴不对准。因此它们不是“真实飞行噪声已经被全部精确描述”的证书，也不能随意调到某个测试序列成绩最好而不披露。

### 从噪声密度到一条离散 IMU 样本

沿用作者式(7)的连续白噪声约定，令单轴噪声满足 $E[w(t)w(s)]=\sigma_w^2\delta(t-s)$，其中 $\sigma_w$ 是噪声密度，$\delta$ 是 Dirac 脉冲。若一条离散读数代表长为 $\Delta t$ 区间的平均值，$\bar w_k=\Delta t^{-1}\int_{t_k}^{t_k+\Delta t}w(t)dt$，双重积分给出

$$\operatorname{Var}(\bar w_k)=\frac{\sigma_w^2}{\Delta t},\qquad \operatorname{Var}(\bar w_k\Delta t)=\sigma_w^2\Delta t.$$

对 $\dot b=w_b$ 的偏置随机游走，步间偏置增量的标准差则是 $\sigma_b\sqrt{\Delta t}$。所以测量白噪声除以 $\sqrt{\Delta t}$，偏置增量乘以 $\sqrt{\Delta t}$；两者方向相反，是因为前者平均、后者积分。此结论以论文给定谱密度和区间平均模型为前提，不能忽略设备滤波、降采样带来的相关性。

**原创数值检查。** 假设陀螺仪密度为 $0.001\,\mathrm{rad/s}/\sqrt{\mathrm{Hz}}$，采样率 200 Hz，则样本角速度标准差约 $0.01414\,\mathrm{rad/s}$，一个采样周期积分角度标准差约 $7.071\times10^{-5}\,\mathrm{rad}$。200 个独立增量累计一秒，角度标准差回到 $0.001\,\mathrm{rad}$。提高采样率让单条平均读数更吵，却不凭空增加固定一秒的积分噪声。数字是教学设定，不是 EuRoC 的实测参数；原数据应读取对应 YAML。推导对应[作者稿4.3.2节](https://www.researchgate.net/profile/Michael-Burri/publication/291954561_The_EuRoC_micro_aerial_vehicle_datasets/links/56af0c6008ae19a38516937c/The-EuRoC-micro-aerial-vehicle-datasets.pdf?origin=publication_detail)的噪声定义，也说明为何实验必须披露离散化方式。

该流程是本文建议，不是原论文发布的学习或规划算法。完整真值可以用于评估对齐，但用它初始化算法会增加特权信息，必须与纯传感器初始化结果区分。

评测前先把棱镜、相机或IMU变到同一参考点。下面固定时间关联与坐标变换，再读真值精度和已知序列问题。

## 三、按序列关联估计与真值，检查机体杆臂

### 5. 如何正确使用：教学伪代码

```text
输入：选定 EuRoC 序列、算法传感器模式、固定评估协议
读取各 sensor.yaml 和数据列名，确认单位及变换方向
解析整数时间戳，将图像和 IMU 按同一时轴送入算法
只给算法约定的传感器输入，不把测试真值当观测输入
记录完整输出、失败时间、处理延迟与所用数据区间
把算法输出转换到与参考轨迹相同的身体坐标系
按固定规则关联时间，并选择合理的 SE(3) 或 Sim(3) 对齐
计算轨迹误差，同时报告覆盖率、失败和初始化处理
若评估重建，独立检查几何误差与场景覆盖
输出：附数据版本、配置和评估条件的结果
```

### 自构例子与前置概念

**自构例子，未运行。** 相机中心与 IMU 相距 10 cm。无人机原地转动，IMU 位置不变，相机却沿小圆弧移动。若把相机位置直接与 IMU 真值比，算法即使完全正确也会被判有误差。另设飞行速度 1 m/s、时间偏差 10 ms，匀速近似下就能产生约 1 cm 的位置错配；计算是 $1\times0.01$，不是论文测得偏差。

五个前置概念：

1. **外参**：不同传感器坐标系之间的刚体变换。
2. **比力**：加速度计提供的量，需要与重力和姿态共同解释。
3. **时间偏移与漂移**：前者是钟的偏差，后者是偏差随时间变化。
4. **SE(3)/Sim(3) 对齐**：后者多允许一个整体尺度，选择会影响评估含义。
5. **独立参考与平滑真值**：原始外部测量和融合后完整状态具有不同信息来源。

## 四、读采集条件、真值精度与已知数据问题

<!-- figure-ref-v6:start:rc-86-figure-5-anchor -->
<span id="rc-86-figure-5"></span>
<!-- figure-ref-v6:end:rc-86-figure-5-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/086-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/086-evidence.png" width="708" height="693" alt="Fig. 5：这两幅结构参考来自对房间的独立三维扫描，用于检查地图而非只检查相机轨迹" loading="lazy"></a><figcaption>原论文结果图／表摘引：Michael Burri 等（2016），Fig. 5，PDF 第 5 页；<a href="https://www.researchgate.net/profile/Michael-Burri/publication/291954561_The_EuRoC_micro_aerial_vehicle_datasets/links/56af0c6008ae19a38516937c/The-EuRoC-micro-aerial-vehicle-datasets.pdf?origin=publication_detail#page=5" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：这两幅结构参考来自对房间的独立三维扫描，用于检查地图而非只检查相机轨迹。它们同样受遮挡与配准条件限制，评估时要固定双方可见的区域。

### 采集与证据表

这里是九页作者公开稿的 PDF 页序。完整参考状态经过离线融合，采样更密不等于同频率获得独立外部真值。

| 项目 | 内容及能回答的问题 |
|---|---|
| 平台 | AscTec Firefly，固定安装的视觉惯性单元；体现一种微型飞行平台的数据特性 |
| 机器大厅 | 五段序列，主要检验真实工业环境中的运动估计；原始激光参考是位置 |
| Vicon 房间 | 两种布置各三段，约 8×8.4×4 m；提供位姿参考和三维结构扫描 |
| 标定数据 | 相机内参、相机—IMU 外参及棋盘格/AprilTag 数据；允许研究者比较自己的标定方法 |
| 基线与训练预算 | 本文不是新算法对比；统一训练预算、随机种子胜率不适用 |
| 覆盖边界 | 十一段记录不等于十一类独立世界；同设备、相似室内条件限制跨域结论 |

### 三组图表与已知问题怎样读

**[表 1](https://www.researchgate.net/profile/Michael-Burri/publication/291954561_The_EuRoC_micro_aerial_vehicle_datasets/links/56af0c6008ae19a38516937c/The-EuRoC-micro-aerial-vehicle-datasets.pdf?origin=publication_detail#page=3)：设备性能不是最终误差下界。** 表中激光位置和结构测量列出约 1 mm 的精度特征。但第 6 节提醒动态运动会降低跟踪精度，厂商数字可能过于乐观。这个表支持“存在高精度外部参考”，不能支持“所有时刻最终真值误差严格小于 1 mm”。

**[表 2](https://www.researchgate.net/profile/Michael-Burri/publication/291954561_The_EuRoC_micro_aerial_vehicle_datasets/links/56af0c6008ae19a38516937c/The-EuRoC-micro-aerial-vehicle-datasets.pdf?origin=publication_detail#page=4) 与[图 4](#rc-86-figure-4)：难度有具体来源。** MH_01 为 80.6 m、182 s、平均速度约 0.44 m/s；MH_03 为 130.9 m、132 s、约 0.99 m/s；V2_03 为 86.1 m、115 s，并有较快旋转和模糊。它们展示不同条件，不是控制其他变量的单因素消融；不能从难序列更差就判定原因只在速度。

<!-- figure-ref-v6:start:rc-86-figure-4 -->
<figure class="reading-evidence-figure" id="rc-86-figure-4"><a href="/robot-classic/assets/figure-refs-v6/086-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/086-fig-4.png" width="640" height="440" alt="原论文图4：机器大厅三个难度序列的俯视飞行轨迹" loading="lazy"></a><figcaption>Michael Burri 等（2016），图 4，PDF 第 4 页；<a href="https://www.researchgate.net/profile/Michael-Burri/publication/291954561_The_EuRoC_micro_aerial_vehicle_datasets/links/56af0c6008ae19a38516937c/The-EuRoC-micro-aerial-vehicle-datasets.pdf?origin=publication_detail#page=4" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：坐标单位为米，三条轨迹的覆盖范围与折返不同；easy、medium、difficult不是仅由路径长度定义。
<!-- figure-ref-v6:end:rc-86-figure-4 -->

**[图 5](#rc-86-figure-5)：地图评估也需要独立参考。** Vicon 房间通过七个扫描位置融合出结构参考，用于评估重建；一条轨迹 ATE 很小不保证地图完整。扫描参考也有遮挡、可见性与配准条件，比较时要说明评估区域。

**原论文第 6 节：同步不只有一种。** 左右相机分别自动曝光，亮度可能不同，但曝光中点同步设计仍然成立。另一方面，传感器与外部真值记录在不同系统，Vicon 缺少设备时间戳，外部对齐仍有限制。把“相机—IMU 硬件同步”写成“全部系统完全无时间误差”，就是越过证据。

这些内容可在[作者稿第 2–6 节](https://www.researchgate.net/profile/Michael-Burri/publication/291954561_The_EuRoC_micro_aerial_vehicle_datasets/links/56af0c6008ae19a38516937c/The-EuRoC-micro-aerial-vehicle-datasets.pdf?origin=publication_detail)和[当前官方数据概览](https://projects.asl.ethz.ch/datasets/euroc-mav/)交叉查看。论文没有给出一个覆盖全部时刻、全部后处理变量的统一置信区间；不能自行构造这种保证。

## 五、保留运动覆盖与参考系统误差

贡献属于研究基础设施：把输入、参考、标定和约定一起公开，使方法结果更容易复查。数据格式和外参说明看似琐碎，却会决定实验是否比较了同一个量。

作者承认曝光差异、动态跟踪精度和时钟同步问题。我的分析还包括：同一基准被反复调参后，提升可能部分来自基准适配；室内无人机表现不能自动推广到雨雪车辆、手持滚动快门手机或动态人群。若用它训练学习式模型，应事先划分场景和序列，并把验证集与最终测试分开；这是后续研究责任，不是原文已实施的学习协议。

## 六、追问：机器人纯旋转时，棱镜位置变化为什么不一定是机体平移？

<details>
<summary>机器人纯旋转时，棱镜位置变化为什么不一定是机体平移？</summary>

**参考答案**：棱镜若相对所选机体原点有杆臂，转动会使它沿弧线移动。应使用标定变换把真值与估计转到同一刚体点和同一时刻，再比较位置。忽略杆臂会把参考点差异误计成算法漂移，尤其在快速转动时。

写成公式更容易查错：若刚体参考点A到棱镜P的固定杆臂为 $r_{AP}$，则 $p_{WP}=p_{WA}+R_{WA}r_{AP}$。即使 $p_{WA}$ 不变，只要 $R_{WA}$ 改变，棱镜仍会运动。按[Modern Robotics参照系组合](https://modernrobotics.northwestern.edu/nu-gm-book-resource/3-3-1-homogeneous-transformation-matrices/)检查这项后，再谈毫米级轨迹差异。

</details>

## 七、作为视觉惯性系统的共同评测输入

- **模块组合**：[VINS-Mono：让单目视觉与 IMU 组成可以长期运行的定位系统](092-vinsmono.md)。作为视觉惯性系统的评测输入，不能代替系统初始化与模型。
- **模块组合**：[ORB-SLAM3：跟踪丢了以后，地图还能继续生长吗](098-orbslam3.md)。比较时注明传感器模式、对齐与多地图结果的处理。

## 八、自测与参考答案

**问题 1：为什么 200 Hz 的完整参考状态不等于 200 Hz 的独立外部真值？**

**答案：** Leica 和 Vicon 的原始输出频率、维度不同；完整状态经过 IMU 与外部测量离线融合。更密的参考采样不代表外部仪器独立观测了同样多的自由度。

**问题 2：单目与双目惯性算法都用 Sim(3) 对齐，是否一定公平？**

**答案：** 不一定。单目无尺度时允许整体尺度通常合理；对本应恢复公制尺度的系统，任意尺度拟合可能掩盖尺度误差。应明确任务允许的规范自由度，必要时同时报告保尺度对齐与尺度偏差。

**问题 3：两篇论文在 EuRoC 上差 2 mm，能否直接排出优劣？**

**答案：** 不能。先核对数据版本、传感器模式、输出坐标、时间关联、起始裁剪、失败统计和对齐方法，再考虑重复性及真值误差。差异小于协议变化可能造成的影响时，排序结论尤其脆弱。
