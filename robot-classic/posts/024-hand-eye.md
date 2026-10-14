# 024｜Tsai–Lenz 手眼标定：为什么换几个姿态，就能知道相机装在哪里

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](023-harris.md) · [下一篇](025-occupancy.md)

**论文**：Roger Y. Tsai、Reimar K. Lenz，*A New Technique for Fully Autonomous and Efficient 3D Robotics Hand/Eye Calibration*，1989，IEEE TRA 5(3):345–358。[原始期刊全文](https://kmlee.gatech.edu/me6406/handeye.pdf) · [DOI](https://doi.org/10.1109/70.34770)。

### 先接住前作的问题

[相机标定](020-tsai-calibration.md)给出每次观测的成像坐标关系，仍不知道相机如何固定在手上。本篇通过两次运动消去静止世界变换，得到AX=XB。

## 一、问题设定：相机与机械臂末端的固定关系怎样从相对运动恢复

相机能告诉你杯子在镜头前方多少厘米，却不能直接告诉机械臂末端应到哪里。中间缺少相机与末端之间的固定变换。用尺测安装位置很难精确，尤其难测三个旋转角；同时精确知道标定板在机器人基座中的位置，也增加了布置成本。

### 背景与问题定义

这是几何标定，不存在奖励、训练回合或价值函数。观测是各个停靠姿态的机器人运动学结果与相机外参；待估计状态是一段固定刚体变换。相机内参、标定板几何和机器人相对运动精度影响最终质量，不能因为算法输入看起来只有矩阵就忽略上游误差。

设 $G_i={}^{B}T_{H_i}$ 把第 $i$ 次手坐标变换到基座，$C_i={}^{C_i}T_W$ 把静止标定板坐标变换到相机。未知 $X={}^{H}T_C$ 为相机到手的变换。每次观察都满足

$$G_iXC_i={}^{B}T_W.$$

因为标定板不动，右端对所有姿态相同。比较姿态 $i,j$，消去这个未知量：

$$A_{ij}X=XB_{ij},\qquad A_{ij}=G_j^{-1}G_i,\quad B_{ij}=C_jC_i^{-1}.$$

这里先定义每个矩阵“从哪里到哪里”，再决定逆和乘法顺序。许多程序错误并不是线性代数错误，而是把相机到标定板与标定板到相机混用。原文第 348 页也专门提醒两组相对运动中逆的位置不同。

## 二、用AX=XB消去世界变换，再分解旋转和平移

### 方法：把六个未知量拆成两个小问题

展开齐次变换可得

$$R_AR_X=R_XR_B,$$
$$ (R_A-I)t_X=R_Xt_B-t_A.$$

第一式没有平移，因而可以先求 $R_X$。第二式在旋转已知时，对 $t_X$ 线性。这种分离让计算简单，但也意味着旋转估计误差会进入平移右端，平移步骤不会反过来修正旋转。

用单位四元数的向量部分表示旋转：$P_A=2\sin(\theta_A/2)n_A$，$P_B$ 同理，$n$ 是单位旋转轴。令 $r=\tan(\theta_X/2)n_X$，则可构造

$$[P_A+P_B]_\times r=P_B-P_A.$$

$[v]_\times u=v\times u$。把多组方程堆叠做最小二乘，得到 $r$；再由 $q_X=(1,r)/\sqrt{1+r^Tr}$ 恢复旋转。这是固定变换旋转角非 $180^\circ$ 时的常规分支；原文第 349 页讨论了特殊情况，不能让正切参数在奇点上硬算。

几何直觉是：同一刚体旋转的轴在相机坐标和手坐标中不同，$R_X$ 把一组轴变成另一组轴。只有一根轴时，绕该轴的歧义还在；第二根不平行轴提供额外方向。单个叉乘矩阵秩至多为二，所以一对姿态不够。

最后的独立姿态检查与诊断是教学实现建议；其思想对应原文实机预测实验。数学上拟合的是线性化旋转表示及平移方程的残差，不是直接最小化像素重投影误差，也没有自动获得全局统计最优性。

叉乘线性式可以从四元数乘法直接看出来。令单位四元数 $q_A=(a_0,a),q_B=(b_0,b)$，在选择一致符号的共轭旋转下 $a_0=b_0$。若 $q_X=q_0(1,r)$ 且 $q_0\ne0$，将 $q_Aq_X=q_Xq_B$ 的向量部分展开并约去 $q_0$，有

$$a_0r+a+a\times r=b+b_0r+r\times b,$$

从而 $(a+b)\times r=b-a$。再用 $P_A=2a,P_B=2b$ 就回到前面的线性式。此推导也解释了为什么必须协调四元数符号，以及为什么 $q_0=0$ 的180度安装旋转需要单独分支；不是任何四元数库输出都能直接堆成这组方程。

原创平移验算设 $R_X=I,t_X=(1,2,3)$。第一组 $R_A=R_B=R_z(90^\circ),t_B=0,t_A=(3,1,0)$，平移方程成为 $(-3,-1,0)=(-3,-1,0)$，但完全不约束第三分量。第二组改为 $R_A=R_B=R_x(90^\circ),t_B=0,t_A=(0,5,1)$，左侧为 $(0,-5,-1)$，于是补上缺失约束。两组非平行转轴一起能恢复 $(1,2,3)$；重复采集第一组一百次仍不能确定轴向安装距离。

[Tsai相机标定](020-tsai-calibration.md)给出各停靠姿态的视觉外参，是本篇实际使用的前端模块；[Horn](021-horn.md)求点对旋转，本篇求相对运动之间的固定变换，两者是平行几何问题。原文第348页说明依赖高质量相对机器人运动，因此基座绝对坐标误差与每次姿态间不一致误差，也不能笼统归成一个“机器人精度”。

AX=XB消去了共同世界关系，却没有凭空增加缺少的转动信息。实现两阶段求解后，要用轴分布不同的运动检查可观测性，再解释多姿态实验误差。

## 三、实现两阶段求解，用运动轴分布检查可观测性

```text
输入：同步采集的手位姿 Gi、标定板到相机位姿 Ci
选取具有足够转角且轴方向不同的姿态对
对每对构造 A = inverse(Gj) Gi，B = Cj inverse(Ci)
从 RA、RB 提取一致的轴角/四元数表示
堆叠 [PA+PB]× r = PB-PA，检查秩与条件数
解旋转最小二乘，恢复 RX；特殊角度单独处理
堆叠 (RA-I)tX = RX tB-tA，解平移最小二乘
构造 X，并在未用于拟合的新姿态上检查预测误差
输出：手眼变换、残差和运动激励质量诊断
```

### 自构例子与前置概念

假设所有运动都绕手的 $z$ 轴旋转。那么 $(R_A-I)e_z=0$，平移 $t_X$ 加上任意 $\alpha e_z$ 都不改变平移方程左侧，沿轴的安装距离无法确定。再加入一次绕 $x$ 轴的转动，原来缺失的方向就能获得约束。这个例子是秩亏的直接计算，不是原文机器人数据。

五个前置概念：**齐次变换**统一表达旋转和平移；**相对运动**消掉世界坐标的公共未知量；**旋转轴角**揭示共轭关系保持的旋转性质；**矩阵秩**判断未知量是否能够唯一确定；**条件数**判断小测量误差会被放大多少。

## 四、区分预测姿态误差、手眼误差与机器人自身误差


<!-- figure-ref-v6:start:rc-24-figure-8-anchor -->
<span id="rc-24-figure-8"></span>
<!-- figure-ref-v6:end:rc-24-figure-8-anchor -->

<!-- figure-ref-v6:start:rc-24-figure-9-anchor -->
<span id="rc-24-figure-9"></span>
<!-- figure-ref-v6:end:rc-24-figure-9-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/024-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/024-evidence.png" width="1603" height="678" alt="Figs. 8–9：两图横轴都是运动几何退化程度的倒数尺度：转动角太小，恢复旋转和平移都会变得敏感" loading="lazy"></a><figcaption>原论文结果图／表摘引：Roger Y. Tsai、Reimar K. Lenz（1989），Figs. 8–9，PDF 第 11 页；<a href="https://kmlee.gatech.edu/me6406/handeye.pdf#page=11" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：两图横轴都是运动几何退化程度的倒数尺度：转动角太小，恢复旋转和平移都会变得敏感。曲线增长支持条件数分析，不能把更多几乎相同的姿态当成更多独立信息。

### 实验设置与验证意图

以下用统一的 $AX=XB$ 方向解释手眼关系。核对原图时先辨认相机系与手端系，否则同名变换可能实际取了相反方向。

| 项目 | 已核实设置 |
|---|---|
| 仿真 | 第 IV-A 节系统生成多姿态，改变相对转角、轴夹角、相机距离和姿态数量 |
| 仿真统计 | 原文说明相关曲线平均 1000 次测试；[图 12–13](#rc-24-figure-12) 同时给 RMS 与最大误差 |
| 实机 | IBM Cartesian/Clean Room 机器人，末端刚性安装 CCD 相机，静止标定目标；[图 3–4](#rc-24-figure-3) |
| 感知前端 | 36 个圆点中心用于相机外参估计；第 I-A 节给出采集提取与求解耗时 |
| 硬件预算 | 68000 小型计算机；没有训练，耗时拆分为图像处理与最终手眼求解 |
| 实机评价 | 用新姿态预测相机位置方向，比较视觉结果；没有独立手眼真值 |
| 重复限制 | 实机表每个姿态数只有一次测试；不是多次重复的均值和置信区间 |

<!-- figure-ref-v6:start:rc-24-figure-12 -->
<figure class="reading-evidence-figure" id="rc-24-figure-12"><a href="/robot-classic/assets/figure-refs-v6/024-fig-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/024-fig-12.png" width="538" height="524" alt="图12：站位数平方根倒数与平移误差，含RMS及最大值曲线" loading="lazy"></a><figcaption>Roger Y. Tsai、Reimar K. Lenz（1989），图 12，PDF 第 12 页；<a href="https://kmlee.gatech.edu/me6406/handeye.pdf#page=12" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/024-fig-12.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：实线是RMS、虚线是最大误差；横轴向左对应更多站位，均方误差下降不意味着最坏误差完全消失。
<!-- figure-ref-v6:end:rc-24-figure-12 -->

<!-- figure-ref-v6:start:rc-24-figure-13 -->
<figure class="reading-evidence-figure" id="rc-24-figure-13"><a href="/robot-classic/assets/figure-refs-v6/024-fig-13.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/024-fig-13.png" width="525" height="524" alt="图13：站位数平方根倒数与旋转误差，含RMS及最大值曲线" loading="lazy"></a><figcaption>Roger Y. Tsai、Reimar K. Lenz（1989），图 13，PDF 第 12 页；<a href="https://kmlee.gatech.edu/me6406/handeye.pdf#page=12" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/024-fig-13.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：与图12使用同一横轴含义；分别读实线的平均尺度和虚线的最大误差，避免把样本数量收益当成几何激励的替代。
<!-- figure-ref-v6:end:rc-24-figure-13 -->

<!-- figure-ref-v6:start:rc-24-figure-3 -->
<figure class="reading-evidence-figure" id="rc-24-figure-3"><a href="/robot-classic/assets/figure-refs-v6/024-fig-3.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/024-fig-3.png" width="415" height="444" alt="图3：手眼标定实验中机器人、相机和标定装置的整体照片" loading="lazy"></a><figcaption>Roger Y. Tsai、Reimar K. Lenz（1989），图 3，PDF 第 3 页；<a href="https://kmlee.gatech.edu/me6406/handeye.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/024-fig-3.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：这张整体照片用于核对眼在手上的实际安装关系；它说明实验装置，不能单独证明标定精度。
<!-- figure-ref-v6:end:rc-24-figure-3 -->

<!-- figure-ref-v6:start:rc-24-figure-4 -->
<figure class="reading-evidence-figure" id="rc-24-figure-4"><a href="/robot-classic/assets/figure-refs-v6/024-fig-4.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/024-fig-4.png" width="524" height="573" alt="图4：刚性安装在机器人末端的CCD相机近景" loading="lazy"></a><figcaption>Roger Y. Tsai、Reimar K. Lenz（1989），图 4，PDF 第 3 页；<a href="https://kmlee.gatech.edu/me6406/handeye.pdf#page=3" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/024-fig-4.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：近景补充图3的整体视角，重点看相机与末端刚性连接；固定的手眼变换正依赖这一机械假设。
<!-- figure-ref-v6:end:rc-24-figure-4 -->

论文的创新不只是一条解方程公式，还包含如何选择运动。若每次只是沿同一轴小幅摆动，增加帧数可能增加很多近乎重复的约束。好的实验应同时考察观测数量与方向丰富程度。其误差分析把这两者分开，这是对今日标定系统仍很实用的提醒。

### 四处关键证据如何阅读

**[图 6](#rc-24-figure-6)，第 349 页**给出姿态配对设计：强调相对旋转角和不同旋转轴之间的夹角。这是方法设计证据，不能独立证明某个具体机器人在视野和关节约束下都能执行该设计。

<!-- figure-ref-v6:start:rc-24-figure-6 -->
<figure class="reading-evidence-figure" id="rc-24-figure-6"><a href="/robot-classic/assets/figure-refs-v6/024-fig-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/024-fig-6.png" width="644" height="469" alt="图6：多姿态站位、相邻旋转轴与参考坐标系的选择" loading="lazy"></a><figcaption>Roger Y. Tsai、Reimar K. Lenz（1989），图 6，PDF 第 5 页；<a href="https://kmlee.gatech.edu/me6406/handeye.pdf#page=5" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/024-fig-6.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：对照不同姿态之间的连线与旋转轴方向；需要足够的旋转激励和轴向差异，不能仅增加相似姿态的数量。
<!-- figure-ref-v6:end:rc-24-figure-6 -->

**[图 8–10](#rc-24-figure-8)，第 355 页**比较误差与运动几何参数。仿真支持弱转动与接近共轴会放大误差，与秩和条件数分析一致。它们验证指定扰动模型下的趋势，并非所有真实误差源的穷尽试验。

<!-- figure-ref-v6:start:rc-24-figure-10 -->
<figure class="reading-evidence-figure" id="rc-24-figure-10"><a href="/robot-classic/assets/figure-refs-v6/024-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/024-fig-10.png" width="526" height="517" alt="图10：旋转轴夹角倒数与旋转RMS误差的关系" loading="lazy"></a><figcaption>Roger Y. Tsai、Reimar K. Lenz（1989），图 10，PDF 第 11 页；<a href="https://kmlee.gatech.edu/me6406/handeye.pdf#page=11" target="_blank" rel="noopener noreferrer">原文与图注</a>；<a href="/robot-classic/assets/figure-refs-v6/024-fig-10.png" target="_blank" rel="noopener noreferrer">放大查看</a>。原版权保留。</figcaption></figure>

读图：横轴是两条主要旋转轴夹角的倒数；越接近平行，横轴越大、误差越高，体现了退化方向的影响。
<!-- figure-ref-v6:end:rc-24-figure-10 -->

<!-- figure-ref-v6:start:rc-24-links-108 -->
本页定位：[图 8内嵌图](#rc-24-figure-8) · [图 9内嵌图](#rc-24-figure-9)。
<!-- figure-ref-v6:end:rc-24-links-108 -->

**[图 12–13](#rc-24-figure-12)，第 356 页**讨论更多观测的作用。随机误差平均化与系统偏差是两回事；增加姿态数不会让错误相机内参、松动支架或机器人系统标定偏差自动消失。原文第 III-C 节也把改善基础测量精度列为单独步骤。

<!-- figure-ref-v6:start:rc-24-links-110 -->
本页定位：[图 12内嵌图](#rc-24-figure-12) · [图 13内嵌图](#rc-24-figure-13)。
<!-- figure-ref-v6:end:rc-24-links-110 -->

**第 357 页实机结果表**给出：4 个姿态时预测旋转误差 4.568 mrad、平移误差 23.238 mil；12 个姿态时分别为 2.782 mrad、12.516 mil。按 $(旧-新)/旧$ 自行计算，降幅约 39.1% 与 46.1%。这只是这两次配置的端点比较，不能称作多次独立实验的期望收益；8 个姿态的平移误差还出现反升。

这里 mil 是千分之一英寸，12.516 mil 约为 0.318 mm。这个换算帮助理解量级，但该数字仍包括机器人定位误差。原文明确指出缺少绝对 $X$ 真值，因此使用预测检验。作者关于优于既有工作的广泛表述，比这个单机器人验证能够直接支持的范围更大。

## 五、保留运动噪声、转动激励与原稿疑点

方法把刚性关系中的不变量转换为低维线性求解，同时强调实验设计和误差传播。它要求静止目标、刚性安装、时间同步以及可信的相对运动。移动目标、相机支架弹性或曝光时仍在运动，都会破坏统一 $X$ 的模型，而不仅是增加一点白噪声。

原文的算术量口径存在具体不一致：第 II-C 节写约 $100+60N$，结论写 $100+64N$。两处都支持对姿态数近似线性增长，但不足以锁定一个完全一致的精确常数。另一方面，第 I-A 节的 90 ms 包括图像读取、提取和外参计算，不能和纯手眼求解的毫秒数混成同一计时对象。

另一项分析边界是观测相关性：由同一批绝对姿态构造很多相对姿态对，会重复使用测量。方程数量增加不等于独立信息同比增加。独立新姿态检验、残差随方向的分布以及条件数，往往比仅看拟合残差更有解释力。

## 六、追问：增加姿态数量却保持相同运动范围，误差为什么可能不再明显下降？

<details>
<summary>增加姿态数量却保持相同运动范围，误差为什么可能不再明显下降？</summary>

**参考答案**：重复测量可能降低某些随机误差，却不会自动补足缺少的运动方向，也不能消除共同系统偏差。应把姿态数与旋转轴分布分开改变，并使用未参与拟合的姿态检验。小拟合残差仍可能混合相机外参、机器人运动和手眼关系的误差。

</details>

## 七、把标定关系交给视觉反馈

- **模块组合**：[视觉伺服：机器人究竟应该追三维位置，还是追图像误差](037-visual-servo.md)。把相机与末端几何关系用于视觉反馈的速度映射。

## 八、自测与参考答案

**问题1：为什么不需要精确测量标定板在机器人基座中的位置？**

答：只要标定板在所有采集期间静止，$G_iXC_i$ 就是同一未知常量。比较两次观测把它消掉，剩下的是两种相对运动与 $X$ 的关系。目标一旦移动，这个消元条件就失效。

**问题2：采集一百次同轴旋转，能代替两次不同轴的旋转吗？**

答：不能消除结构性退化。同轴数据可以减少某些已可观测方向的随机误差，却不能恢复始终处在零空间中的分量。增加数量与增加几何方向是不同操作。

**问题3：手眼拟合残差很小，为什么抓取仍可能偏？**

答：同一批数据可能包含共同系统误差，算法会拟合一个内部一致却有偏的变换；也可能运动分布退化，未测试方向没有被约束。还要检查新姿态预测、机器人运动学、相机内参、工具中心与时序，而不是单凭一个训练式残差判断标定质量。
