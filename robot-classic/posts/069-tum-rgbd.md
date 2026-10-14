# 069｜TUM RGB-D基准：把“地图看起来不错”变成可检验的轨迹误差

[总览](00-发展时间线总览.md) · [上一篇](068-isam2.md) · [下一篇](070-kitti.md)

**原论文：** *A Benchmark for the Evaluation of RGB-D SLAM Systems*，Jürgen Sturm、Nikolas Engelhard、Felix Endres、Wolfram Burgard、Daniel Cremers，IROS 2012。[出版记录](https://doi.org/10.1109/IROS.2012.6385773) · [作者全文](https://jsturm.de/publications/data/sturm12iros.pdf)。

### 先接住前作的问题

[KinectFusion](064-kinfu.md)展示了RGB-D重建，漂亮表面却不是轨迹真值。TUM提供同步数据、真值和评价工具；[KITTI](070-kitti.md)、[EuRoC](086-euRoC.md)是不同运动域的平行基准，不能混为同一难度。

## 一、问题设定：同一RGB-D输入下怎样可信比较轨迹误差

两个SLAM系统各自展示一幅漂亮点云，究竟谁更准确？如果输入不同、相机没有统一标定、真值时间戳没对齐，视觉效果甚至误差数字都可能无法比较。

### 研究背景与问题定义

这是基准与测量方法论文，不属于在线或离线强化学习。没有动作奖励、训练策略或终止奖励；待测系统从图像估计相机位姿，数据序列结束时完成一次评价。

输入包含640×480、30 Hz的Kinect彩色和深度图像；外部八相机动作捕捉提供参考轨迹，摘要说明真值记录100 Hz。硬件最高能力与实际记录频率要分开：正文还说明动作捕捉相机可达更高频率，不应把该硬件上限当每个文件的采样率。

论文描述39条序列，涵盖办公室、工业大厅、手持六自由度运动及Pioneer 3机器人搭载相机。测试目的既包括慢速调试，也包括快速转动、低纹理、回环、无回环和跟踪丢失后的恢复。它提供可重复输入，而不代替一个真实自主导航系统的完整闭环评估。

问题依赖几个条件：参考轨迹与估计轨迹必须描述同一物理坐标框架；时间关联可靠；输出缺失部分不能悄悄被删除后只报告容易片段；度量单位与深度缩放必须一致。否则一个“算法误差”可能其实是数据处理错误。

## 二、组织标定、同步和动作捕捉真值

### 1. 真值不是一个没有误差的文件

论文对相机内参、深度比例、动作捕捉标记与相机光学中心的外参，以及时间偏移分别校准。动作捕捉跟踪的是标记刚体，不直接等于RGB相机光学中心，必须经过外参变换。

文件深度采用16位PNG，以米乘5000存储；读出值除5000才是米。论文测得的深度校正因子已经应用到发布数据，不能看到[表 II](https://cvg.cit.tum.de/_media/spezial/bib/sturm12iros.pdf#page=4)的1.035或1.031便再次相乘。深度也已配准到RGB视角，不能无判断地重复进行相机配准。

一个细节尤其容易影响快速运动：动作捕捉相对RGB约20毫秒的偏移已被修正；RGB与深度的原始时间戳保留，论文观察到深度平均稍晚，提供关联脚本允许设置偏移和最大差值。两类同步处理不能混为“所有流已严格同一时刻”。

### 2. RPE：比较一段运动，而不是两点绝对位置

令 $P_i$ 为估计位姿，$Q_i$ 为真值位姿，均从相机坐标变换到各自参考坐标系。固定时间间隔 $\Delta$，原文式1为：

$$
E_i=(Q_i^{-1}Q_{i+\Delta})^{-1}(P_i^{-1}P_{i+\Delta}).
$$

左边先取得真值相对运动，右边取得估计相对运动，再比较二者。平移RPE的RMSE为：

$$
\operatorname{RPE}_\Delta=
\sqrt{\frac1{n-\Delta}\sum_i\|\operatorname{trans}(E_i)\|^2}.
$$

它回答“这一段运动估错了多少”。$\Delta=1$检查相邻帧；在等间隔30 Hz条件下，$\Delta=30$对应一秒。若掉帧或采样不均匀，应按时间关联处理，不能机械数30帧。

位姿矩阵包含旋转，但上式只汇总平移分量。旋转误差可以单独取角度，也可能通过后续运动反映在平移漂移里。不能说这个数字直接把米与度相加。

### 3. ATE：先消除任意全局坐标差，再比较形状

两个系统可以选择不同世界原点。先寻找一个刚体变换 $S$，将估计位置整体最小二乘对齐到参考位置：

$$
S^\star=\arg\min_{S\in SE(3)}\sum_i
\|\operatorname{trans}(Q_i)-\operatorname{trans}(SP_i)\|^2.
$$

再用原文式4—5计算：

$$
F_i=Q_i^{-1}S^\star P_i,\qquad
\operatorname{ATE}=\sqrt{\frac1n\sum_i\|\operatorname{trans}(F_i)\|^2}.
$$

这里是刚体对齐，不默认添加自由尺度。RGB-D有度量深度，如果用额外尺度对齐掩盖深度单位错误，就改变了问题。单目算法采用相似变换评估时，应另行说明协议。

数学上优化的是评测前的全局对齐，机制上新增的是统一采集和评分流程，实际改善的是比较的可信度。没有一个通过最小化ATE训练出来的“本文策略”。

### 4. 教学评测伪代码

~~~text
输入：RGB-D序列、真值轨迹、待测算法
核对相机坐标约定、深度单位和已应用的校正
按时间戳关联RGB与深度，记录容许时间差
运行待测算法，保存带时间戳的估计位姿和失败区间
将估计与参考轨迹关联到共同时间点，报告覆盖率
用一个SE(3)变换对齐轨迹位置，计算ATE
对预先指定的时间间隔计算相对位姿差，分别汇总平移/旋转RPE
报告序列名称、关联规则、间隔、RMSE、异常值和失败比例
输出：可与相同协议结果比较的误差报告
~~~

失败覆盖率是本文教学建议，用来避免仅凭成功片段误导，并非声称原文所有示例都报告了这个指标。

### 同一条轨迹，用不同对齐方法可以得出不同答案

**教学尺度例**：真值一维位置为(0,1,2)米，估计为(0,1.1,2.2)。只允许平移对齐，最优平移−0.1米后误差为(−0.1,0,0.1)，RMSE约0.08165米；若再允许自由缩放 $1/1.1$，误差会变成0。对有米制深度输入的系统，任意缩放可能把真实尺度误差藏起来；对单目系统，是否准许尺度对齐必须事先说明。

RPE考察相隔一定时间或距离的相对运动误差，ATE考察整体对齐后的轨迹差异，两者不是可互换的“定位误差”。时间关联也要先做好：原数据的深度整数要除以5000才是米，四元数文件顺序为 $q_x,q_y,q_z,q_w$。[原稿第V节](https://jsturm.de/publications/data/sturm12iros.pdf)

本篇为[KinectFusion](064-kinfu.md)等RGB-D系统提供独立真值检验；[KITTI](070-kitti.md)与[EuRoC](086-euRoC.md)是不同传感器和运动域的平行基准。原文特意指出内部残差很小不保证轨迹正确，比较时还应保留失败段和覆盖率，不能只挑能输出结果的帧。

真值与估计只有在时间关联和对齐规则一致时才能比较。下面固定ATE与RPE的评价流程，再检查参考系统精度与轨迹覆盖。

## 三、关联时间戳并固定ATE与RPE评测流程

**自构例子，未运行。** 算法A把整条正确轨迹整体平移10米，算法B起点正确但逐步产生尺度漂移。未对齐时A看似很差；刚体对齐后A的ATE可为零，B的形状失真仍然保留。这说明ATE消除的是任意参考坐标差，并不是帮算法修正所有错误。

再构造一条缓慢累计漂移轨迹，每一秒只错一点，短间隔RPE可以小，但长期ATE较大。若只输出前半段容易轨迹，ATE也可能更低，因此需要同时报告覆盖和失跟。这些都是评测逻辑示例，不是原文新增实验。

理解本文需要的五个概念：

- **SE(3)**：同时表示三维旋转和平移的刚体变换。
- **时间关联**：把不同传感器或输出的时间戳对应到可比较时刻。
- **外参标定**：确定标记、相机与其他传感器坐标系之间的变换。
- **RPE**：比较固定间隔的相对运动，刻画局部漂移。
- **ATE**：全局刚体对齐后比较轨迹位置，刻画整体一致性。

阅读范围：依据[2012论文全文](https://jsturm.de/publications/data/sturm12iros.pdf)的方法、标定和指标章节；[官方数据入口](https://cvg.cit.tum.de/data/datasets/rgbd-dataset)用于确认资源归属。本文没有重新运行基准，未把后来扩展的数据规模和协议替换进2012论文。

## 四、读真值精度、轨迹图与评测工具验证

<!-- figure-ref-v6:start:rc-69-figure-6-anchor -->
<span id="rc-69-figure-6"></span>
<!-- figure-ref-v6:end:rc-69-figure-6-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/069-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/069-evidence.png" width="781" height="334" alt="Fig. 6：时间轴上的尖峰暴露短时间相对位姿失配，不能被一个整程汇总均值抹平" loading="lazy"></a><figcaption>原论文结果图／表摘引：Sturm 等（2012），Fig. 6，PDF 第 6 页；<a href="https://cvg.cit.tum.de/_media/spezial/bib/sturm12iros.pdf#page=6" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：时间轴上的尖峰暴露短时间相对位姿失配，不能被一个整程汇总均值抹平。RBM 与 GICP 的漂移表现属于该序列，RPE 也不能直接替代全局对齐后的 ATE。

### 实验如何验证基准

| 验证对象 | 原文设置或观测 | 想排除的误解 |
|---|---|---|
| 数据覆盖 | 办公室与大厅，手持与机器人，多类运动 | 单个简单桌面序列不代表SLAM全部难度 |
| 深度标定 | 棋盘格距离与深度比较，两个Kinect分别校准 | 深度读数不是天然精确米制真值 |
| 动捕几何 | 标记点拟合及棋盘格外参验证 | 标记刚体不等于光学中心 |
| 同步 | 扫描时间偏移，比较重投影残差 | 快速运动中的误差可能来自时间错位 |
| RPE演示 | fr1/desk中RBM与GICP的相对误差曲线 | 不只检查一个终点偏差 |
| ATE演示 | RGB-D SLAM在fr1/desk2的轨迹对齐 | 地图截图不提供统一数值尺度 |
| 预算与统计 | 这是数据与工具发布；不是固定训练算力竞赛 | 不应虚构梯度步数或训练种子 |

论文有标定噪声与残差分析，但没有因此完成所有未来算法的公平比较。用户自行选择参数、跳帧和序列子集仍可能影响排名。基准统一输入和评分，算法报告仍须公开选择规则。

### 结果：证据到底有多强

**证据1：[表 I](https://cvg.cit.tum.de/_media/spezial/bib/sturm12iros.pdf#page=4)与[图 2](#rc-69-figure-2)展示任务差异。** 例如fr1/desk时长23秒、平均平移速度0.41 m/s，fr2/desk为99秒、0.19 m/s。差别不仅是录制更长，还包括相机、运动和场景条件。不能把不同序列上的厘米数直接当模型优劣。

<!-- figure-ref-v6:start:rc-69-figure-2 -->
<figure class="reading-evidence-figure" id="rc-69-figure-2"><a href="/robot-classic/assets/figure-refs-v6/069-fig-2.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/069-fig-2.png" width="1293" height="523" alt="原论文图2：TUM RGB-D四类场景影像及各自相机轨迹" loading="lazy"></a><figcaption>A Benchmark for the Evaluation of RGB-D SLAM Systems（2012），图 2，PDF 第 2 页；<a href="https://jsturm.de/publications/data/sturm12iros.pdf#page=2" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上排场景与下排轨迹成对对应，场景难度不只由轨迹长度决定。
<!-- figure-ref-v6:end:rc-69-figure-2 -->

**证据2：[表 II](https://cvg.cit.tum.de/_media/spezial/bib/sturm12iros.pdf#page=4)、[图 4](#rc-69-figure-4)验证深度比例与噪声。** 两台设备校正因子为1.035、1.031，已经作用于数据；约2米以内深度噪声在1厘米量级，4米处约5厘米。它支持深度噪声随距离增加的观察，不证明每个像素、材质和光照下都遵循同一误差模型。

<!-- figure-ref-v6:start:rc-69-figure-4 -->
<figure class="reading-evidence-figure" id="rc-69-figure-4"><a href="/robot-classic/assets/figure-refs-v6/069-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/069-fig-4.png" width="640" height="346" alt="原论文图4：深度测量与真实棋盘距离、深度误差标准差的关系" loading="lazy"></a><figcaption>A Benchmark for the Evaluation of RGB-D SLAM Systems（2012），图 4，PDF 第 5 页；<a href="https://jsturm.de/publications/data/sturm12iros.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：误差随距离增加而变化，不能把近距离标定精度当作所有量程的常数。
<!-- figure-ref-v6:end:rc-69-figure-4 -->

**证据3：§VI.C说明真值精度下限。** 标记点拟合平均误差为0.60与0.86毫米，但这不是最终整条相机轨迹误差。作者进一步估计相机中心帧间误差低于1毫米和0.5度，全区域绝对误差低于10毫米和0.5度。只有被测误差明显高于这些尺度，才适合据此比较；不可把0.60毫米宣传成无条件的ATE精度保证。

**证据4：[图 5](#rc-69-figure-5)把同步当作可测量的问题。** 不同时间偏移对应不同标定残差，约20毫秒动捕/RGB偏移被修正。这个数字说明需要同步，不代表简单给所有RGB、深度和位姿统一加20毫秒就正确。色彩滚动快门和自动曝光还可能产生不可由单一时间偏移消除的失真。

<!-- figure-ref-v6:start:rc-69-figure-5 -->
<figure class="reading-evidence-figure" id="rc-69-figure-5"><a href="/robot-classic/assets/figure-refs-v6/069-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/069-fig-5.png" width="640" height="299" alt="原论文图5：移动棋盘和时间偏移对应的重投影误差曲线" loading="lazy"></a><figcaption>A Benchmark for the Evaluation of RGB-D SLAM Systems（2012），图 5，PDF 第 6 页；<a href="https://jsturm.de/publications/data/sturm12iros.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：右图的最低点用于估计时间同步偏移，不是空间标定误差本身。
<!-- figure-ref-v6:end:rc-69-figure-5 -->

**证据5：[图 6](#rc-69-figure-6)–[图 7](#rc-69-figure-7)说明RPE和ATE的互补。** [图 6](#rc-69-figure-6)中RBM在展示序列上比GICP漂移更低、异常点更少；[图 7](#rc-69-figure-7)演示对齐后轨迹误差及两指标关系。它们验证指标的解释用途，不是大规模全算法排名。原文关于RPE与ATE关系的讨论不应泛化为任意采样、间隔和轨迹下的严格大小关系；两者测量对象不同。

<!-- figure-ref-v6:start:rc-69-figure-7 -->
<figure class="reading-evidence-figure" id="rc-69-figure-7"><a href="/robot-classic/assets/figure-refs-v6/069-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/069-fig-7.png" width="640" height="351" alt="原论文图7：真值与估计轨迹、ATE与RPE关系的示例" loading="lazy"></a><figcaption>A Benchmark for the Evaluation of RGB-D SLAM Systems（2012），图 7，PDF 第 7 页；<a href="https://jsturm.de/publications/data/sturm12iros.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：ATE与RPE测量不同性质，即使两者在样例中相关，也不能互相替代。
<!-- figure-ref-v6:end:rc-69-figure-7 -->

## 五、区分轨迹指标、地图可用性与场景覆盖

贡献是把数据、标定、真值、格式与评价合成一个可复用研究基础。看似“只是数据”的工作，实际上把误差的来源拆开了：输入传感器误差、时间误差、外参误差、算法估计误差，不能混在一起。

作者明确指出，好轨迹不必然意味着好地图。门口少量错误点就可能妨碍导航，轨迹平均误差却仍很小；动捕方向误差也会在较远距离放大到厘米级重建误差，所以其位姿不能直接充当高精度稠密地图真值。

本文的进一步分析：数据主要覆盖特定室内环境与Kinect成像机制，不能直接代表户外日照、长距离或其他深度传感器；公开真值有助于调试，也意味着长期反复调参可能使算法对基准过拟合；比较失跟系统时应报告有效轨迹比例。这些边界不削弱基准价值，而是决定如何正确使用。

## 六、追问：固定RPE时间间隔和固定路程间隔，是否在问同一个漂移问题？

<details>
<summary>固定RPE时间间隔和固定路程间隔，是否在问同一个漂移问题？</summary>

**参考答案**：不完全相同。同一时间间隔在快慢运动中对应不同位移与转角；同一路程间隔则可能包含不同等待和转弯时间。应在报告RPE前说明配对规则，并在相同规则下比较轨迹。它们都不同于对整条轨迹作一次对齐后的ATE，不能只因单位相同就合并排名。

</details>

## 七、比较道路与飞行数据域的评价条件

- **平行路线**：[KITTI：把视觉算法放到真正行驶的街道上检验](070-kitti.md)。道路运动和传感器范围不同，应在各自任务域解释指标。
- **平行路线**：[EuRoC：一张定位成绩表背后，真值是怎样产生的](086-euRoC.md)。以飞行视觉惯性数据提供不同运动与同步挑战。

## 八、自测与参考答案

**问题1：读到[表 II](https://cvg.cit.tum.de/_media/spezial/bib/sturm12iros.pdf#page=4)的深度比例1.035，为什么不能直接把下载的深度再乘一次？**

答案：论文说明该校正已应用于发布数据。再次乘会人为引入约3.5%的尺度偏差。首先按文件编码除5000得到米，再确认该数据版本是否已校正，而不是重复执行论文描述的采集处理步骤。

**问题2：ATE很小，是否说明机器人短时间跟踪与地图重建都准确？**

答案：不一定。ATE汇总对齐后的位置误差，可能掩盖局部抖动、失跟区间或方向误差；地图还受深度噪声和融合算法影响。应结合RPE、完整覆盖、姿态与地图质量检查。

**问题3：为什么不能只比较两个系统各自成功输出的帧？**

答案：困难帧可能恰好被较差系统丢弃，剩余帧平均误差反而低。应在共同协议下报告全部序列的运行结果、失败范围及轨迹覆盖，必要时另给共同时间子集误差，使准确性与完整性都可见。
