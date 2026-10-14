# 064｜KinectFusion：让三维地图反过来帮助相机定位

[返回总览](00-发展时间线总览.md) · [上一篇：g2o](063-g2o.md) · [下一篇：Minimum Snap](065-min-snap.md)

**论文**：Richard A. Newcombe 等，*KinectFusion: Real-Time Dense Surface Mapping and Tracking*，ISMAR 2011。[微软研究院论文页](https://www.microsoft.com/en-us/research/publication/kinectfusion-real-time-dense-surface-mapping-tracking/) · [十页全文](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/ismar_2011.pdf)。

### 先接住前作的问题

[ICP](028-icp.md)可以配准点云，单次深度仍嘈杂且缺少持续表面模型。KinectFusion让跟踪、融合与预测构成循环。

## 一、问题设定：噪声深度怎样变成下一帧也能使用的表面模型

深度相机每帧都能得到许多三维点，但单帧点云有噪声和空洞。把相邻帧配准后直接堆起来，定位误差还会逐步积累，使表面出现重影。

### 2.1 有深度并不等于已经有地图

一帧深度是相机坐标系中的局部观测。要把不同帧放进同一张地图，仍需知道每帧六自由度位姿。位姿错误会污染融合，而污染后的地图又会误导后续位姿，这是系统必须控制的反馈风险。

输入为带内参的深度图，状态包括相机位姿和世界坐标系中的体积表面。输出是连续更新的表面模型及相机轨迹；跟踪失败会暂停正常融合，避免把明显错误数据写入地图。

这不是模型学习或策略训练。若与机器人学习联系，它提供的是几何环境表征和定位能力，可供后续规划使用，但没有在本论文中训练操作策略。

### 2.2 为什么配准到模型可能更稳

相邻原始帧都包含测量噪声。历史模型融合了更多观测，通常更平滑、覆盖更充分，因此能成为质量更好的参考。

不过“模型更好”是条件性的：此前位姿必须足够正确、环境大体静态。如果误差已经融合成错误表面，当前帧可能被拉向错误位置。融合不是无条件去噪器，更不是自动的全局回环优化。

## 二、把跟踪、TSDF融合与模型预测接成循环

### 3.1 深度预处理与几何金字塔

根据内参将像素和深度反投影为顶点，再由邻近顶点估计法向。用于跟踪的深度先经保边滤波，并构建多尺度顶点、法向图。

粗尺度有助于处理相对较大的像素位移，细尺度再精化。它扩大局部优化的实用范围，但不让 ICP 变成能从任意姿态开始的全局匹配器。

一个容易漏掉的细节是：§3.3 使用**原始深度做融合**，滤波深度主要用于跟踪。过早平滑虽能改善法向，却可能抹去希望多帧融合恢复的细节。

### 3.2 TSDF：表面由零交叉定义

体素不仅记录有没有点，还记录截断有符号距离 $F$ 与权重 $W$。表面位于距离值过零的位置。下面是帮助理解加权融合的教学形式：

$$
F_{\mathrm{new}}=\frac{W_{\mathrm{old}}F_{\mathrm{old}}+w f}
{W_{\mathrm{old}}+w}.
$$

$f$ 是当前观测对该体素提供的距离估计，$w$ 是观测权重。具体截断、有效区域和权重更新应遵循论文 §3.3，而不是把所有体素都当作获得新观测。

表面后方很远的位置被遮挡，属于未知，不应当成可靠的内部占据观测。TSDF 的投影距离近似也不能无条件视为全空间精确欧氏距离场；拿来作碰撞距离时要理解其有效范围。

### 3.3 光线投射生成预测

从虚拟相机向体积发射每像素一条射线，寻找可见的零交叉，生成预测顶点与法向。这样不必先提取整张三角网格，便能为下一轮 ICP 提供稠密参考。

空闲区域可用较大步长跳过，接近表面时再细化。预测图的误差取决于体素分辨率、插值、当前地图和位姿，不是一个没有不确定性的真实世界渲染器。

### 3.4 点到平面的位姿优化

当前点为 $p_i$，模型对应点为 $q_i$，对应法向为 $n_i$，教学目标写为：

$$
E(R,t)=\sum_i[n_i^\top(Rp_i+t-q_i)]^2.
$$

它惩罚沿表面法向的错位。投影关联、距离与法向兼容性检查排除部分错误匹配，再在小运动近似下形成六维增量系统。

大量像素上的局部计算和归约适合 GPU；小型线性系统可单独求解。原文 §3.5 描述的实现仍由 CPU 求解最终系统，不能写成所有步骤都完全在 GPU 上。

“交互式”不可省略：原始系统丢失后，要求用户把实时深度与最后可靠视角的模型预测对齐，再恢复跟踪。这与后续自动场景重定位不同。

### 融合是降噪还是把错误固化，取决于配准

单体素保存距离 $F$与权重 $W$，新观测为 $f,w$，更新 $F^+=(WF+wf)/(W+w)$。**教学例**两次等权距离+0.02、−0.01米给均值0.005米；若第二帧位姿错了0.10米，平均并不会神奇抵消该系统误差，可能把表面融合成厚层或双层。

更容易漏掉的是未知空间：相机所见表面后方超过截断带的体素没有新测量，不能当作“已知占据”或用零填充。原文第4节明确区别可见自由空间、表面截断带及未见区域，并使用投影TSDF而非全局精确欧氏距离。[原稿TSDF部分](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/ismar_2011.pdf)

本篇以[ICP](028-icp.md)作为跟踪模块，再通过融合模型反过来改善下一帧配准；后作[ElasticFusion](084-elasticfusion.md)改用surfel并处理更长程一致性，是后续系统路线。桌面物体重建的表面细节与整个房间的轨迹漂移是不同指标，细节图不能单独证明回环或全局无漂移。

模型预测参与下一次跟踪，使融合错误也可能回到估计环中。下面按这四个组件的调用次序检查，再把表面效果与轨迹真值分开。

## 三、执行深度到模型配准，检查融合反馈

### 3.5 教学伪代码

```text
分配固定体素网格，设置相机初始位姿
接收第一帧有效深度，初始化表面
对后续每帧：
    保存原始深度，另生成滤波跟踪深度
    构建顶点与法向的多尺度表示
    用已有模型的预测图作为参考
    从粗到细重复：
        投影建立点对应，剔除不兼容观测
        汇总点到平面残差的六维线性系统
        求局部位姿增量并更新当前估计
    检查系统退化与更新幅度
    若失败：暂停融合，进入交互式重定位
    若有效：
        用原始深度更新可见区域的 TSDF
        从更新后模型光线投射，准备后续预测
输出：相机轨迹和融合表面
```

### 自构、未运行的融合例子

同一体素的三次有效距离测量为 2、4、3 毫米，等权平均为 3 毫米。这能减小独立零均值噪声的影响。

如果三帧相机位姿都向右偏了 2 厘米，平均无法自动消除共同偏差；它可能生成一面很光滑但位置错误的墙。于是我们必须同时检查表面质量与轨迹误差，不能只看模型是否漂亮。

### 五个前置概念

1. **深度反投影**：用内参把像素及距离转为三维点。
2. **ICP**：交替更新对应关系和刚体变换的局部配准方法。
3. **法向**：表面的局部垂直方向，决定点到平面误差。
4. **TSDF**：在表面附近保存截断距离，用零交叉表示表面。
5. **可观性**：测量是否足以区分某个运动方向，和测量数量不是同一个概念。

## 四、读表面和轨迹证据，区分图像外观与位姿误差

### 5.1 [图 8](#rc-64-figure-8)：帧到模型减少该回路中的累计偏差

<!-- figure-ref-v6:start:rc-64-figure-8 -->
<figure class="reading-evidence-figure" id="rc-64-figure-8"><a href="/robot-classic/assets/figure-refs-v6/064-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/064-fig-8.png" width="1293" height="530" alt="原论文图8：KinectFusion逐帧跟踪、部分回环、全回环及重复回环重建比较" loading="lazy"></a><figcaption>Richard A. Newcombe 等（2011），图 8，PDF 第 8 页；<a href="https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/ismar_2011.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上排轨迹和下排表面重建共同显示累计漂移怎样随跟踪方式改变。
<!-- figure-ref-v6:end:rc-64-figure-8 -->

同一段深度序列，更换配准参考方式后，闭合和表面质量明显不同。这是系统核心机制最直接的对照。

它不能证明整个建筑尺度都无漂移。图像中起终点近乎重合，仍不意味着每个中间位姿绝对准确；结论 §6 也承认更大探索范围会出现漂移和闭合不一致。

### 5.2 [图 9](#rc-64-figure-9)、10：重复数据与新视角不同

<!-- figure-ref-v6:start:rc-64-figure-10 -->
<figure class="reading-evidence-figure" id="rc-64-figure-10"><a href="/robot-classic/assets/figure-refs-v6/064-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/064-fig-10.png" width="640" height="206" alt="原论文图10：KinectFusion不同模型融合次数下的相机位姿示意" loading="lazy"></a><figcaption>Richard A. Newcombe 等（2011），图 10，PDF 第 9 页；<a href="https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/ismar_2011.pdf#page=9" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：三幅使用不同的融合设置，不能把模型的重复使用等同于新增独立观测。
<!-- figure-ref-v6:end:rc-64-figure-10 -->

重复回放可进一步改善对齐；不同视角则还带来更多表面覆盖和新的测量信息。二者同样处理很多帧，却回答不同问题。

这提醒我们，不能只用“累计帧数”比较系统效率。重复旧数据的计算成本、独立观测量和场景覆盖应分开报告。

### 5.3 [图 11](#rc-64-figure-11)：基线也能通过跳帧改善

<!-- figure-ref-v6:start:rc-64-figure-11 -->
<figure class="reading-evidence-figure" id="rc-64-figure-11"><a href="/robot-classic/assets/figure-refs-v6/064-fig-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/064-fig-11.png" width="640" height="500" alt="原论文图11：逐帧跟踪与逐模型跟踪的相机回环轨迹和重建比较" loading="lazy"></a><figcaption>Richard A. Newcombe 等（2011），图 11，PDF 第 9 页；<a href="https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/ismar_2011.pdf#page=9" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：左右相同视角便于比较漂移；上下面板则给出俯视与侧视的几何差异。
<!-- figure-ref-v6:end:rc-64-figure-11 -->

帧到帧方法每八帧处理一次时，漂移比全帧版本小。这是需要保留的反例：更多相邻帧不总能使逐帧估计更好。

作者借此讨论参考帧的影响。帧到模型仍表现良好，但不能忽略基线配置对结论幅度的作用。

### 5.4 [图 12](#rc-64-figure-12)：内存节省伴随分辨率变化

<!-- figure-ref-v6:start:rc-64-figure-12 -->
<figure class="reading-evidence-figure" id="rc-64-figure-12"><a href="/robot-classic/assets/figure-refs-v6/064-fig-12.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/064-fig-12.png" width="640" height="282" alt="原论文图12：KinectFusion绕物体一周的相机轨迹及相应表面模型" loading="lazy"></a><figcaption>Richard A. Newcombe 等（2011），图 12，PDF 第 9 页；<a href="https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/ismar_2011.pdf#page=9" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：轨迹闭合与局部表面完整性是两种指标，不应只凭其中一张图宣称全面准确。
<!-- figure-ref-v6:end:rc-64-figure-12 -->

由 $256^3$ 降至 $64^3$，体素数是原来的 $1/64$，这里的倍率来自三维体素数计算。该图同时减少处理帧数，因此不能把所有质量变化单独归因于分辨率。

体素变粗之后，薄结构和细小间隙会更难表达。模型仍能看出大轮廓，并不意味着它仍适合精密抓取所需的接触几何。

### 5.5 [图 13](#rc-64-figure-13)：固定资源下的实时性

图中分别测量预处理、关联、优化、光线投射和融合。所谓固定时间行为，是在给定图像和体素规模下讨论，不是体积和分辨率无限增加也保持同样耗时。

§3.3 的约 2 毫秒描述单次 $512^3$ 体积更新，不是整帧端到端时间。将局部内核时间当成整个 SLAM 延迟，会得到错误结论。

<!-- figure-ref-v6:start:rc-64-figure-13-anchor -->
<span id="rc-64-figure-13"></span>
<!-- figure-ref-v6:end:rc-64-figure-13-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/064-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/064-evidence.png" width="763" height="305" alt="Fig. 13：堆叠面积把不同系统阶段的耗时分开，横轴增加体积网格分辨率" loading="lazy"></a><figcaption>原论文结果图／表摘引：Richard A. Newcombe 等（2011），Fig. 13，PDF 第 9 页；<a href="https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/ismar_2011.pdf#page=9" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：堆叠面积把不同系统阶段的耗时分开，横轴增加体积网格分辨率。看清哪一部分增长，才能把实时性结论绑定到所用 GPU、分辨率和处理范围。

这是 ISMAR 跟踪与建图论文；同年 UIST 交互工作及后来的重定位能力不计入这里。重放同一序列不会增加独立视角。

| 项目 | 原文设置与证据含义 |
|---|---|
| 传感器 | Kinect 深度，640×480、30 Hz |
| 主验证场景 | 相机固定，桌面转台完整旋转，用限定体积等价模拟绕桌运动 |
| 主序列 | 约 19 秒、560 帧；默认 $256^3$ 体素 |
| 配准对照 | 帧到帧、帧到模型；部分回路、完整回路 |
| 重复处理 | 同一序列重放四次；另有 2,240 个不同手持视角帧的对照 |
| 资源变化 | $64^3$ 至 $512^3$ 体素；[图 13](#rc-64-figure-13) 分解组件耗时 |
| 几何评估 | 闭合处位姿一致性与表面可视化；不是完整逐帧外部真值轨迹基准 |
| 统计范围 | 未报告多场景统一成功率、随机种子或置信区间 |
| 硬件口径 | 本文不依据其他 KinectFusion 版本补写具体 GPU 型号；这里仅采用正文可核对的并行实现描述 |

反复重放同一数据可以研究优化和融合行为，但不等于独立采集了四倍信息。把同一帧重新计入权重，还需要区分算法上的累计与统计上的独立证据。

## 五、检查体积内存、几何退化与长期漂移

**作者贡献**在于实时融合模型与深度跟踪相互提供支持，并把整个流水线组织到可并行实现。ICP 和体积融合本身并非新发明。

**实验支持**的是有限室内场景中，模型参考改善一致性、资源减少导致可解释的质量下降。原文没有证明任意光照、材质、运动和场景都可靠。

**作者明确的失败模式**包括视野被大平面占满：点到平面约束无法观察平面内的两个平移和绕法向旋转，形成三个自由度退化。增加更多同平面像素无法补回缺失信息。

**本文分析**还需注意静态融合对动态物体的敏感性、深度空洞、结构光感测范围和误差传播。核心跟踪不依赖可见光纹理，并不意味着深度传感器在所有室外强光、透明或反光材料上都正常工作。

原始固定体积也缺少后来的空间哈希、多子地图和全局形变机制。写技术史时，应把这些后续方法的价值留给它们自己的论文。

## 六、追问：暂时跟踪错误后继续融合，为什么不能只把它当一帧位姿噪声？

<details>
<summary>暂时跟踪错误后继续融合，为什么不能只把它当一帧位姿噪声？</summary>

**参考答案**：新深度会被写入错误的空间位置，而后续跟踪又使用这个融合模型作为参照，误差会进入反馈链。应分别检查跟踪质量与地图更新条件，并观察错误后的恢复；漂亮的局部表面不能证明整条轨迹或全局模型一致。

</details>

## 七、修复稠密地图，并引入外部轨迹评价

- **平行路线**：[ElasticFusion：直接修正稠密地图，而不只修正相机轨迹](084-elasticfusion.md)。用表面元和变形处理长期地图一致性，改变地图表示与修正机制。
- **模块组合**：[TUM RGB-D基准：把“地图看起来不错”变成可检验的轨迹误差](069-tum-rgbd.md)。用外部轨迹真值检验RGB-D系统，表面效果不替代误差评测。

## 八、自测与参考答案

### 问题 1：为什么跟踪用滤波深度，融合却用原始深度？

**答案**：跟踪需要稳定法向和对应关系，滤波有帮助；融合希望保留可由多视角累积恢复的细节。提前平滑可能把真实高频结构与噪声一起删除，所以两环节选择不同输入。

### 问题 2：面前是一堵平墙，十万个点为什么还不够确定六自由度运动？

**答案**：点到平面误差主要感知法向方向的偏离。沿墙平移或绕墙法向旋转，不会提供足够变化来确定对应运动。数量增加改善已有方向的精度，却不创造新的几何约束方向。

### 问题 3：同一序列重放四次后模型更好，能否说采集效率提高了四倍？

**答案**：不能。重放增加计算和重复融合，没有增加独立观测或新视角。应分别评价处理次数、实际采集帧数、几何覆盖与最终误差；[图 9](#rc-64-figure-9) 的新视角对照正说明这些区别。

<!-- figure-ref-v6:start:rc-64-figure-9 -->
<figure class="reading-evidence-figure" id="rc-64-figure-9"><a href="/robot-classic/assets/figure-refs-v6/064-fig-9.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/064-fig-9.png" width="640" height="491" alt="原论文图9：KinectFusion渲染的带球体、鞋和物体的测试场景" loading="lazy"></a><figcaption>Richard A. Newcombe 等（2011），图 9，PDF 第 8 页；<a href="https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/ismar_2011.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：这张图给出测试几何，不是传感器在真实环境中的误差统计。
<!-- figure-ref-v6:end:rc-64-figure-9 -->
