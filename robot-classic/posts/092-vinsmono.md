# 092｜VINS-Mono：让单目视觉与 IMU 组成可以长期运行的定位系统

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](091-cbfqp.md) · [下一篇](093-toppra.md)

**论文**：Tong Qin、Peiliang Li、Shaojie Shen，*VINS-Mono: A Robust and Versatile Monocular Visual-Inertial State Estimator*，2017 年预印本，2018 年期刊发表。[原文](https://arxiv.org/html/1708.03852) · [PDF](https://arxiv.org/pdf/1708.03852) · [官方代码](https://github.com/HKUST-Aerial-Robotics/VINS-Mono)。

### 先接住前作的问题

[流形预积分](083-imu-preintegration.md)解决了惯性测量如何高效进入优化，却没有单独完成整套系统的启动与恢复；VINS-Mono承接预积分并组合视觉SfM、滑窗和回环。

## 一、问题设定：单目和IMU怎样完成可信启动并持续恢复定位

单目相机能从图像变化推断运动，却很难直接知道一段位移究竟是一米还是十米。IMU 有物理单位，能补充快速运动信息，但积分会受偏置影响而漂移。二者互补，却需要合适的初始尺度、重力方向和偏置，才能放进同一个优化问题。

### 背景与状态：估计什么，缺什么

这是在线状态估计，没有强化学习策略、奖励和训练回合。输入是连续图像、陀螺仪与加速度计数据；输出是位置、速度、姿态，以及用于修正测量的偏置等状态。

滑窗里每个时刻的状态可概括为：

$$
x_k=(p_k,v_k,q_k,b_{a,k},b_{g,k}).
$$

窗口还包含相机相对 IMU 的外参，以及视觉特征的逆深度。姿态 $q_k$ 不是普通四维欧氏变量；更新时必须尊重旋转结构。

单目视觉的尺度模糊，不等于“任何情况下加 IMU 都立即得到尺度”。纯旋转缺少三角化所需的平移，运动激励不足时，尺度、加速度偏置与重力方向也可能难以区分。初始化要检查信息是否足够，而不能只等固定几帧就宣布成功。

与只融合两个独立位姿输出的松耦合方案相比，紧耦合直接让特征观测和惯性测量共同约束状态。它保留的信息更丰富，但也更依赖测量模型、时间对应和初值。

## 二、连接尺度重力初始化、预积分与视觉残差

### 初始化：先找到一个可信的起点

第 V 节先进行视觉 SfM，得到只有相对尺度的相机轨迹与特征，再与 IMU 预积分对齐。过程包括陀螺仪偏置校准、速度与尺度估计，以及重力方向细化。

重力大小在设定中已知，方向只有两个自由度，因此可以在单位方向的切平面中更新。这样避免把重力的三个分量当成完全自由变量。

一个容易漏掉的细节是：初始化阶段不同时强行估计全部惯性偏置。作者说明短时间内加速度偏置与重力耦合，因而先忽略加速度偏置，随后在非线性估计中处理。这是对可观测性的工程选择，不是认为加速度计没有偏置。

### 消去初速度后，尺度信息从哪里出现

先做一个只保留尺度的教学化简：固定姿态，已知并扣除重力及加速度偏置，忽略相机—IMU 杆臂，沿一个水平方向以等时间间隔 $\Delta t$ 观测恒加速度运动。令视觉位置为 $\bar p_k$，真实位置为 $p_k=s\bar p_k$，未知尺度 $s>0$。相邻位移相减消去初速度，有

$$s(\bar p_{k+2}-2\bar p_{k+1}+\bar p_k)=a\Delta t^2,$$

其中 $a$ 是 IMU 给出的该方向米制加速度。**原创手算：** $\Delta t=1$ s，视觉位置为 $0,1,3$ 个任意单位，IMU 加速度为 $2\,\mathrm{m/s^2}$，则视觉二阶差分为 1，尺度为每视觉单位 2 m。

若视觉位置换成 $0,1,2$，IMU 同时给出零加速度，方程退化为 $0=0$，任何正尺度都成立；“移动了很远”不等于“有足够加速度激励”。再把未知加速度偏置 $b_a$ 放回第一例，测得的比力经重力补偿后只给出 $s+b_a=2$（数值采用上述单位），一段固定姿态恒加速度数据无法独立确定两者。真实系统靠更多姿态和运动变化增加区分能力。

这解释了[原文V-B](https://arxiv.org/html/1708.03852)为什么先忽略短窗里难以分离的加速度偏置，再做重力切平面细化并进入完整非线性优化。本文例子不是论文初始化实现的替代公式，也不将 EuRoC 成功运行解释为所有恒速或纯旋转输入都能启动。

### 长期运行：局部窗口之外还需要什么

回环首先检索旧地点，再做几何检查。匹配通过后，旧关键帧的特征可以作为额外约束加入当前窗口；重定位时旧帧位姿固定，而历史全局图在另一个线程中优化。

全局图主要优化三维位置和偏航角，共四个自由度。理由是正常视觉惯性条件下重力提供横滚与俯仰参照，长期自由漂移的方向与纯单目不同。这里的可观测性并不意味着横滚和俯仰没有噪声或估计误差。

高频输出不代表每次都完成了完整滑窗优化。IMU 前向传播、轻量运动优化、全窗口优化和回环图优化有不同成本与频率。

初始化先确定可联合估计的起点，局部窗口和长期图才有一致参照。下面检查各模块何时接管，再拆开纯VIO与回环收益。

## 三、运行滑窗和全局回环，检查各频率输出

```text
输入：带时间戳图像、IMU、相机模型与外参初值
持续接收数据：
    跟踪视觉角点；累计两帧之间的 IMU 预积分
    若尚未初始化：
        检查特征与视差；运行视觉 SfM
        对齐视觉轨迹与 IMU，估计尺度、速度、重力与初始陀螺偏置
        条件不足时继续等待新观测
    否则：
        优化窗口内状态、偏置、外参与特征深度
        根据关键帧状态边缘化或丢弃相应测量
        检测异常；必要时重新初始化并建立新的图段
    并行检索回环、几何验证、紧耦合重定位与四自由度图优化
    用最新优化结果加 IMU 前向传播提供高频输出
输出：局部状态估计及经过回环修正的全局轨迹
```

### 自构例子与前置概念

**自构例子，未运行**：拿着手机绕桌子一圈。前半圈相机提供桌角的相对几何，IMU 帮助估计有单位的运动；暂时看向白墙时，惯性传播维持短时间预测，但误差增大；回到桌子前，匹配旧桌角提供回环约束，修正长期漂移。如果开始只绕手机光心旋转，则无法把“拿手机走了一圈”的正常初始化结论直接照搬。

五个前置概念：

1. **尺度模糊**：单目几何可以整体缩放而保持相同投影。
2. **预积分**：把一段高频惯性信息浓缩为帧间约束及其不确定性。
3. **紧耦合**：不同传感器的原始测量残差共同约束状态。
4. **边缘化**：消去旧变量并将其信息压缩成当前优化的先验。
5. **可观测性**：测量和运动是否足以区分不同状态解释。

## 四、把纯VIO精度与加入回环后的系统结果拆开

<!-- figure-ref-v6:start:rc-92-figure-17-anchor -->
<span id="rc-92-figure-17"></span>
<!-- figure-ref-v6:end:rc-92-figure-17-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/092-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/092-evidence.png" width="781" height="873" alt="Fig. 17：三条室内轨迹依次比较 OKVIS、无回环 VINS 和含回环 VINS" loading="lazy"></a><figcaption>原论文结果图／表摘引：Tong Qin、Peiliang Li、Shaojie Shen（2017），Fig. 17，PDF 第 13 页；<a href="https://arxiv.org/pdf/1708.03852#page=13" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：三条室内轨迹依次比较 OKVIS、无回环 VINS 和含回环 VINS。闭环后的起终点更一致表明全局约束发挥作用，不能由首尾闭合推断中间每一时刻都同样准确。

### 局部估计：三类证据一起优化

纯 VIO、加入回环的系统和高频惯性传播用了不同信息与时序；回环后的误差改善不能全部归因于局部预积分。

将原文式 22 写成更易读的形式：

$$
\min_{\mathcal X}\ \|r_{\rm prior}\|^2+
\sum_k r_{I,k}^{\mathsf T}\Sigma_{I,k}^{-1}r_{I,k}
+\sum_{l,j}\rho\!\left(r_{V,lj}^{\mathsf T}\Sigma_{V,lj}^{-1}r_{V,lj}\right).
$$

第一项保留移出窗口的历史信息；第二项要求相邻状态与 IMU 预积分一致；第三项要求当前三维结构能解释视觉观测。协方差决定残差尺度，不能把像素、米和角度直接不加区分地相加。

### 3.1 预积分为什么能节省工作

两张图像之间可能有很多 IMU 样本。若优化每更新一次状态，就从头积分所有原始样本，成本很高。预积分把这段信息汇总到相邻帧之间，并传播不确定性。

偏置稍有变化时，可用雅可比作一阶修正：

$$
\Delta p(b+\delta b)\approx\Delta p(b)+J_b\delta b.
$$

这是教学简写，对应第 IV-B 节式 12 的思想。它不是说偏置变化再大也无需重新传播；近似精度有适用范围。

### 3.2 为什么视觉残差放到球面上

广角与鱼眼相机不能都当作普通针孔。论文将观测反投影成单位方向，在观测方向的切平面上计算二维残差。这样能用同一种方向几何表达不同相机模型，但仍然需要正确的相机标定。

### 3.3 边缘化保留了信息，也冻结了部分选择

窗口不能无限增长。第 VI-D 节通过 Schur 补将旧状态的约束转成先验；关键帧选择还要保留足够视差和惯性激励。非关键帧的处理并非“所有测量都边缘化”：相应视觉观测可丢弃，惯性预积分继续连接后续帧。

作者承认边缘化会固定早期线性化点，可能造成次优估计。这解释了为什么有限窗口能实时，却不能被当作无限历史完整优化的等价替代。

### 3.4 式 23 的核对说明

原文网页与 PDF 第 7 页式 23 的分段形式不符合标准 Huber 损失：大残差分支被写成常数，另一分支的范围也不对应通常定义。本文不把该式作为可执行公式。以平方残差 $s$ 为输入、阈值为 1 的标准形式是：

$$
\rho(s)=\begin{cases}s,&s\le1,\\2\sqrt{s}-1,&s>1.\end{cases}
$$

其定义可在 [Ceres 官方损失函数文档](https://ceres-solver.readthedocs.io/latest/nnls_modeling.html) 核对。这个版本差异不等于已经证明原实验代码使用了错误损失；论文排版和实际实现需要分别检查。

### 实验设计与比较条件

| 实验 | 数据与设备 | 对比和指标 | 应当控制的解释 |
|---|---|---|---|
| EuRoC | 使用左目图像与 IMU；重点展示 MH_03、MH_05 | OKVIS 单目/双目，VIO 与含回环版本；位置、姿态误差曲线 | 额外相机和回环是不同信息条件 |
| 室内与室外手持 | 重复场景、楼梯、光照与纹理变化 | 无回环/有回环轨迹及终点漂移 | 部分路线没有全程真值 |
| 校园长程 | 5.62 km，持续约 94 分钟 | 地图叠加与模块耗时 | 卫星图视觉对齐不是全程 ATE |
| 无人机反馈 | 八字轨迹，关闭回环；OptiTrack 真值 | 飞行定位与终点漂移 | 运行示范不等于大量随机重复 |
| 手机 AR | iPhone 与 Tango 同架运动 | 虚拟物体一致性、回程表现 | 硬件、镜头和同步条件不一致 |

这些都是估计与控制实验，不存在统一策略训练预算。第 IX 节未给出覆盖全部实验的多随机种子置信区间；不能从一条轨迹图推导成功概率。

公开序列比较还规定了对齐方式：先丢弃部分初始输出，再用随后一段进行对齐，最后比较余下输出。对齐使用多少轨迹会影响误差，因此复现必须保留该口径。

### 结果：怎样避免把不同证据合成一个分数

**[图 11–14](#rc-92-figure-11)。** OKVIS、纯 VIO、含回环系统；回环能约束累计位置漂移；不能据此推出：局部 VIO 在每个姿态分量都更好。

<!-- figure-ref-v6:start:rc-92-figure-11 -->
<figure class="reading-evidence-figure" id="rc-92-figure-11"><a href="/robot-classic/assets/figure-refs-v6/092-fig-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/092-fig-11.png" width="640" height="441" alt="原论文图11：MH03序列中VINS、回环VINS、OKVIS和真值的轨迹比较" loading="lazy"></a><figcaption>Tong Qin、Peiliang Li、Shaojie Shen（2017），图 11，PDF 第 12 页；<a href="https://arxiv.org/pdf/1708.03852#page=12" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：轨迹在同一平面坐标比较，回环后的全局修正与局部里程计漂移需区分。
<!-- figure-ref-v6:end:rc-92-figure-11 -->

<!-- figure-ref-v6:start:rc-92-figure-12 -->
<figure class="reading-evidence-figure" id="rc-92-figure-12"><a href="/robot-classic/assets/figure-refs-v6/092-fig-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/092-fig-12.png" width="589" height="634" alt="原论文图12：MH03序列各轴平移误差及随路程变化的平移误差" loading="lazy"></a><figcaption>Tong Qin、Peiliang Li、Shaojie Shen（2017），图 12，PDF 第 12 页；<a href="https://arxiv.org/pdf/1708.03852#page=12" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上三幅横轴为时间、底图横轴为距离；不能将同一图上的不同横轴误读成同一采样序列。
<!-- figure-ref-v6:end:rc-92-figure-12 -->

<!-- figure-ref-v6:start:rc-92-figure-13 -->
<figure class="reading-evidence-figure" id="rc-92-figure-13"><a href="/robot-classic/assets/figure-refs-v6/092-fig-13.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/092-fig-13.png" width="640" height="438" alt="原论文图13：MH05困难序列中多种估计器与真值的平面轨迹" loading="lazy"></a><figcaption>Tong Qin、Peiliang Li、Shaojie Shen（2017），图 13，PDF 第 12 页；<a href="https://arxiv.org/pdf/1708.03852#page=12" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：在相同坐标轴看局部偏差与全局回环；单条轨迹没有表达跨重复运行的置信区间。
<!-- figure-ref-v6:end:rc-92-figure-13 -->

<!-- figure-ref-v6:start:rc-92-figure-14 -->
<figure class="reading-evidence-figure" id="rc-92-figure-14"><a href="/robot-classic/assets/figure-refs-v6/092-fig-14.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/092-fig-14.png" width="640" height="387" alt="原论文图14：MH05序列的平移和旋转误差随行进距离变化" loading="lazy"></a><figcaption>Tong Qin、Peiliang Li、Shaojie Shen（2017），图 14，PDF 第 12 页；<a href="https://arxiv.org/pdf/1708.03852#page=12" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上下图单位不同；应同时比较平移与旋转，避免只据一种误差宣称全面更准确。
<!-- figure-ref-v6:end:rc-92-figure-14 -->

**[图 17](#rc-92-figure-17)–[图 19](#rc-92-figure-19)。** 室内外回环前后轨迹；系统模块能改善长期一致性；不能据此推出：无真值路段的逐时刻绝对精度。

<!-- figure-ref-v6:start:rc-92-final-source-gap-note -->
<span id="rc-92-figure-18"></span><p class="figure-reference-note">尚未内嵌：<a href="https://arxiv.org/pdf/1708.03852#page=14" target="_blank" rel="noopener noreferrer">图 18</a>。剩余轨迹图叠加 Google 地图背景。官方 Geo Guidelines 允许特定教育/研究展示，但要求真实 Google 及数据提供商署名；当前原图未能核清完整提供商署名，不能自行猜造，因此保留入口并明确记录这一可核验性缺口。</p>
<!-- figure-ref-v6:end:rc-92-final-source-gap-note -->





<!-- figure-ref-v6:start:rc-92-figure-19 -->
<figure class="reading-evidence-figure" id="rc-92-figure-19"><a href="/robot-classic/assets/figure-refs-v6/092-fig-19.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/092-fig-19.png" width="640" height="673" alt="原论文图19：混合室内外序列中OKVIS、无回环VINS和回环VINS三种轨迹" loading="lazy"></a><figcaption>Tong Qin、Peiliang Li、Shaojie Shen（2017），图 19，PDF 第 14 页；<a href="https://arxiv.org/pdf/1708.03852#page=14" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：红框指出跟踪丢失或错误估计区域；回环修正的全局一致性与局部跟踪稳定性是不同问题。
<!-- figure-ref-v6:end:rc-92-figure-19 -->



**[表 I](https://arxiv.org/pdf/1708.03852#page=14)。** 长程实验中不同模块时间；计算可以分线程、分频率组织；不能据此推出：每帧所有模块均耗时相同或串行相加。

**[图 22](#rc-92-figure-22)–[图 23](#rc-92-figure-23)。** 无人机轨迹与 OptiTrack；无回环局部估计可用于该飞行反馈；不能据此推出：任意高速动作和光照都能稳定控制。

<!-- figure-ref-v6:start:rc-92-figure-22 -->
<figure class="reading-evidence-figure" id="rc-92-figure-22"><a href="/robot-classic/assets/figure-refs-v6/092-fig-22.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/092-fig-22.png" width="640" height="550" alt="原论文图22：机载无回环VINS与OptiTrack真值的三维轨迹" loading="lazy"></a><figcaption>Tong Qin、Peiliang Li、Shaojie Shen（2017），图 22，PDF 第 15 页；<a href="https://arxiv.org/pdf/1708.03852#page=15" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：三根坐标轴均以米计；轨迹重叠是该次机载实验的结果，不能替代更长序列的漂移统计。
<!-- figure-ref-v6:end:rc-92-figure-22 -->

<!-- figure-ref-v6:start:rc-92-figure-23 -->
<figure class="reading-evidence-figure" id="rc-92-figure-23"><a href="/robot-classic/assets/figure-refs-v6/092-fig-23.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/092-fig-23.png" width="1293" height="685" alt="原论文图23：无回环VINS相对OptiTrack的位置、姿态及对应误差时间序列" loading="lazy"></a><figcaption>Tong Qin、Peiliang Li、Shaojie Shen（2017），图 23，PDF 第 16 页；<a href="https://arxiv.org/pdf/1708.03852#page=16" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：每一组同时保留估计量与误差；姿态角突变要联系角度表示和对应误差一起检查。
<!-- figure-ref-v6:end:rc-92-figure-23 -->

**[图 25](#rc-92-figure-25)。** 手机 AR 与 Tango 的一段路线；一般移动硬件上的系统可用性；不能据此推出：在所有局部精度指标上胜过 Tango。

<!-- figure-ref-v6:start:rc-92-figure-25-reviewed -->
<figure class="reading-evidence-figure" id="rc-92-figure-25"><a href="/robot-classic/assets/figure-refs-v6/092-fig-25-reviewed.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/092-fig-25-reviewed.png" width="640" height="625" alt="手机VINS和Tango在起点、开门干扰及终点的九面板比较" loading="lazy"></a><figcaption>原论文图摘引：Tong Qin、Peiliang Li、Shaojie Shen，VINS-Mono: A Robust and Versatile Monocular Visual-Inertial State Estimator，2017 年预印本，2018 年期刊发表，图 25，PDF 第 16 页；<a href="https://arxiv.org/pdf/1708.03852#page=16" target="_blank" rel="noopener noreferrer">原文与图注</a>。局部裁切；原版权保留。点击图片可放大。</figcaption></figure>

读图：左列是 VINS-Mobile 的 AR 画面，中列是 VINS-Mono 轨迹，右列是 Tango 轨迹；三行依次为起点、开门和结束。开门时 Tango 的偏航与轨迹明显跳变；走完约 264 m 后，VINS 通过闭环与四自由度位姿图优化回到起点，虚拟方块仍注册在原位置，而 Tango 最后一圈仍有漂移。作者同时承认 Tango 的局部状态估计更准确，这一例不能当作所有精度指标的全面领先。
<!-- figure-ref-v6:end:rc-92-figure-25-reviewed -->


无人机路线总长 61.97 m，最终漂移约 0.18 m，论文给出约 0.29% 的终点相对漂移。这个百分比的分母是路线长度，不是每一帧误差的平均值，更不是 ATE 降低 99.71%。

[表 I](https://arxiv.org/pdf/1708.03852#page=14) 中窗口优化约 50 ms、运行频率 10 Hz；高频反馈则利用最新结果做惯性传播。两者能同时成立。作者还明确表示 Tango 的局部估计更准确，因此手机回程案例不能改写成全面精度领先。

## 五、保留运动激励、标定和失效处理边界

本篇的价值来自已有组件的改进与系统整合，包括偏置修正的预积分、初始化、特征级重定位、四自由度图以及可运行实现。不能把所有组件都视为本篇首次发明，也不能因为用了已有方法就忽略集成中的困难。

局限包括初始化退化、纹理与光照失效、边缘化近似、回环误检，以及外参与时间条件对结果的影响。作者设计了失败检测与重启，但重启不等于恢复失效期间所有丢失信息。

**本文分析**：定位系统真正影响机器人任务的还包括输出延迟、跳变和恢复时间。ATE 较低的系统若输出严重滞后，仍可能不适合快速反馈；回环修正后的全局位姿若直接进入控制器，也需要处理坐标修正。这些不是本篇已完成的统一对照实验。

## 六、追问：若长路线误差改善只在加入回环后出现，应该怎样定位收益来源？

<details>
<summary>若长路线误差改善只在加入回环后出现，应该怎样定位收益来源？</summary>

**参考答案**：固定局部VIO配置，分别评估启用和关闭回环的结果，并检查回环发生前后的误差变化。这样才能区分局部融合、长期约束与恢复机制。完整系统更好，不等于每一个局部估计步骤都单独优于对照。

</details>

## 七、比较视觉惯性系统的恢复与地图管理

- **平行路线**：[ORB-SLAM3：跟踪丢了以后，地图还能继续生长吗](098-orbslam3.md)。视觉惯性与多地图组织采取另一套系统设计，不能只按IMU有无等同。

## 八、自测与参考答案

### 问题一：为什么加入 IMU 后，仍然需要专门初始化？

**答案**：IMU 并不直接提供准确位置；加速度包含重力、偏置和运动成分。若尺度、重力与偏置初值错误，非线性融合可能收敛到错误解释。初始化通过视觉轨迹与惯性约束对齐提供起点，而且运动不足时应继续等待，不能强行宣布尺度已知。

### 问题二：四自由度图优化是否意味着机器人只做四自由度运动？

**答案**：不是。局部状态仍描述完整三维运动。四自由度指全局图主要修正位置和偏航的长期漂移；重力为横滚、俯仰提供参照。可观测方向仍有测量噪声，也不代表所有运动条件下估计都可靠。

### 问题三：含回环版本误差更小，能证明它的 IMU 预积分比 OKVIS 更准确吗？

**答案**：不能。回环引入了额外的历史地点约束，提升的是完整系统。要比较预积分本身，需要相同观测、初始化、回环条件和其他模块下的消融。原文对纯 VIO 的评价更谨慎，也指出某些姿态分量 OKVIS 表现更好。
