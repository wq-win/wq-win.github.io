# 015｜包容架构：先让机器人活着，再增加本领

[总览](00-发展时间线总览.md) · [目录](README.md) · [上一篇](014-potential-field.md) · [下一篇](016-damped-ik.md)

**论文**：Rodney A. Brooks，*A Robust Layered Control System for a Mobile Robot*，IEEE Journal of Robotics and Automation，1986，2(1):14–23。[DOI](https://doi.org/10.1109/JRA.1986.1087032) · [大学课程托管的期刊原稿](https://www.robolabo.etsit.upm.es/asignaturas/lari/papers/Brooks86RobustLayeredControl.pdf)。

补充来源：[1985 AIM-864 技报](https://people.csail.mit.edu/brooks/papers/AIM-864.pdf)。

### 先接住前作的问题

等待完整感知、建模和规划依次结束会拖慢反应，本篇按行为建立异步模块，并限定高层能覆盖哪些消息。[人工势场](014-potential-field.md)可嵌入局部避障模块。

## 一、问题设定：高层规划未完成时怎样保留基础避障能力

一种常见系统架构是感知、建模、规划、执行依次工作。这样分工很清楚，但如果世界模型尚未完成或规划耗时，机器人可能连眼前的障碍都来不及躲。Brooks 提议按完整行为能力拆系统：先实现不碰撞，再加漫游，最后加有目的探索。

### 背景：功能分解与行为分解的区别

“感知模块”只产出世界信息，本身不会完成一个任务；“避开障碍”则贯穿传感、判断和动作。行为分解把后者作为基本组织单位。同一传感输入可以服务多个行为，不必先融合为唯一完整世界表示。

论文的低层目标包含避免接触、无目的漫游和探索。它们既有层次，也有冲突：漫游想前进，近处障碍要求停下；探索想沿走廊走，漫游的随机方向就应暂时让位。

状态分布在模块中，包括有限状态、局部变量和输入缓冲。观测来自声呐等传感器，动作是转向、前进或停止。没有统一奖励函数和策略梯度；“更高层”指行为能力扩展，不是高层回报更高。

关键假设是任务能够拆成相对简单的异步部件，并且通过固定通信拓扑组合出有用行为。该假设是否适合复杂装配、语言指令或长期规划，需要独立检验。

## 二、以异步行为分层，明确消息抑制和覆盖范围

### 机制：谁可以覆盖哪条消息

模块可抽象成带数据的有限状态机：$s_i^{+}=f_i(s_i,m_i)$，输出 $o_i=g_i(s_i,m_i)$。这里 $m_i$ 是当前收到的局部消息，$s_i$ 包含本模块记忆。异步意味着不是所有模块都等一个全局时钟完成同一轮计算。

抑制与替代作用于具体通信连接。用教学记号，某输入线可以写成

$$m(t)=\begin{cases}m_H(t),&\text{高层替代在有效期内},\\m_L(t),&\text{否则}.\end{cases}$$

这不是论文中的优化公式，而是对消息选择机制的形式化解释。输出抑制则让某条消息暂时不传播。两者都不同于把所有行为输出做平均，也不等于整个低层程序被关闭。

如果简单平均“向左躲”和“向右探索”的方向，可能得到直接撞向障碍的前进指令。显式接线与选择关系使设计者能决定哪类冲突如何解决。但保证仍来自具体网络，不是“分层”这个名字。

该流程保留原文的行为组织思想，但不是原线路图的逐线翻译。真实实现还需指定消息丢失、过期、模块复位与执行延迟的语义。将异步程序写成一个巨大同步 if-else 循环可以做教学模拟，却不应再宣称保留了全部原始实现特征。

把接线变成一段带时间的教学轨迹，更容易区分“替代输入”和“停掉低层”。假定探索模块在 $t=0$ 给出“向东”，替代漫游方向的有效期为2秒；$t=0.5$ 漫游模块仍产生“向北”，只是该条普通输入暂时不被接收；$t=1$ 碰撞模块看到近障碍，独立停止线生效；$t=2.1$ 探索没有续发消息，替代窗口结束，下一个有效漫游方向重新进入避障模块。这里2秒是教学参数，不是原机默认值，恢复输入也不等于重播此前被丢掉的消息。

原稿第18页的机制说明明确：输出被抑制期间产生的消息会丢失；输入替代则在阻断普通输入的同时把替代信号送进模块。因而实现必须回答“超时后处理哪条新消息”，不能默认存在可靠队列。若把停止线也接到可被高层压制的位置，前述故障隔离就消失了。安全性来自特定通信拓扑及传感器时效，不是高低层名字本身。

这也给出比演示路径更有辨别力的测试：有意暂停高层、延迟传感器、连续重复替代命令，记录停障反应和恢复后的行为。它是建议的故障注入实验，原稿第V节的漫游与目标覆盖演示不能被当作这些压力测试已经通过。

消息覆盖范围决定高层能力如何影响底层行为。下面让探索模块停顿，检查基础避障是否仍能把输出送到执行端，而不只确认底层进程还活着。

## 三、运行行为模块，用探索停顿检验底层响应

```text
教学示例：不同模块独立更新，消息带有效期
声呐模块：发布局部障碍信息
碰撞模块：发现正前方近障碍时发布停止消息
漫游模块：周期性产生候选行进方向
探索模块：有局部目标时发布替代方向，否则不替代
避障模块：读取当前有效方向及障碍信息，输出可行方向
运动模块：若有效停止消息存在则停止，否则执行方向
高层消息过期后，输入线恢复接受漫游模块的消息
```

### 自构例子：探索模块突然停顿

设机器人沿走廊前进，探索模块每隔一段时间发送方向命令，同时低层避障持续接收声呐。探索计算卡住后，它的方向替代过期，漫游可以重新提供方向；若前方突然出现箱子，碰撞模块仍能要求停止。

这个例子显示分布式职责的潜在收益：高层故障不必使所有行为同时停止。但如果最后一条高层命令永不过期，或运动模块无视停止线，系统依然危险。故障隔离依赖超时和接线，不能由架构图自动获得。

再考虑一个死胡同。局部避障可能让机器人长期来回转向，既不碰撞也无法离开。局部生存与全局进展是两个不同指标。若实验只报告无碰撞时间，就无法说明完成导航任务的能力。

## 四、读仿真与实体系统，检查模块组合的证据

<!-- figure-ref-v6:start:rc-15-figure-9-anchor -->
<span id="rc-15-figure-9"></span>
<!-- figure-ref-v6:end:rc-15-figure-9-anchor -->
<figure class="reading-evidence-figure"><a href="/robot-classic/assets/papers/015-evidence.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/papers/015-evidence.png" width="772" height="748" alt="Fig. 9：细线轨迹在房间内折返并避开墙体，展示低层 wander 与避障的组合结果" loading="lazy"></a><figcaption>原论文结果图／表摘引：Rodney A. Brooks（1986），Fig. 9，PDF 第 8 页；<a href="https://www.robolabo.etsit.upm.es/asignaturas/lari/papers/Brooks86RobustLayeredControl.pdf#page=8" target="_blank" rel="noopener noreferrer">核对原文</a>。原版权保留。</figcaption></figure>

读图：细线轨迹在房间内折返并避开墙体，展示低层 wander 与避障的组合结果。这里没有全局地图上的最短路目标，轨迹绕行不能据此被误解为最优规划失败。

### 实验与证据：关注模块组合而非单一准确率

1986 年期刊版第 V 节已有实体机器人，1985 年 AIM-864 技报却仍写着缺少实物演示。性能结论必须绑定期刊版，不能混用两个版本。

**[图 5](#rc-15-figure-5)–[图 7](#rc-15-figure-7) 的层级接线讨论。** 逐层加入模块；基础行为可被扩展而不整体删除；不能据此推出：任意新增模块都保持安全。

<!-- figure-ref-v6:start:rc-15-figure-5 -->
<figure class="reading-evidence-figure" id="rc-15-figure-5"><a href="/robot-classic/assets/figure-refs-v6/015-fig-5.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/015-fig-5.png" width="891" height="324" alt="原论文图5：Subsumption的第0层控制系统：声呐、碰撞、逃离与转向模块" loading="lazy"></a><figcaption>Rodney A. Brooks（1986），图 5，PDF 第 6 页；<a href="https://www.robolabo.etsit.upm.es/asignaturas/lari/papers/Brooks86RobustLayeredControl.pdf#page=6" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：沿声呐输出追踪到避碰及转向接口，可见低层行为自身已有闭环。
<!-- figure-ref-v6:end:rc-15-figure-5 -->

<!-- figure-ref-v6:start:rc-15-figure-6 -->
<figure class="reading-evidence-figure" id="rc-15-figure-6"><a href="/robot-classic/assets/figure-refs-v6/015-fig-6.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/015-fig-6.png" width="844" height="434" alt="原论文图6：在第0层上叠加第1层wander模块的控制连线" loading="lazy"></a><figcaption>Rodney A. Brooks（1986），图 6，PDF 第 7 页；<a href="https://www.robolabo.etsit.upm.es/asignaturas/lari/papers/Brooks86RobustLayeredControl.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上方wander产生的方向进入avoid，新增行为仍需通过底层避障环路。
<!-- figure-ref-v6:end:rc-15-figure-6 -->

<!-- figure-ref-v6:start:rc-15-figure-7 -->
<figure class="reading-evidence-figure" id="rc-15-figure-7"><a href="/robot-classic/assets/figure-refs-v6/015-fig-7.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/015-fig-7.png" width="975" height="786" alt="原论文图7：在第0、1层上进一步叠加第2层视觉探索与路径控制" loading="lazy"></a><figcaption>Rodney A. Brooks（1986），图 7，PDF 第 7 页；<a href="https://www.robolabo.etsit.upm.es/asignaturas/lari/papers/Brooks86RobustLayeredControl.pdf#page=7" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：框图上部的视觉与目标模块连接到既有底层，连线体现扩展关系。
<!-- figure-ref-v6:end:rc-15-figure-7 -->

**第 V-A 节，[图 8](#rc-15-figure-8)。** 仿真声呐含反射及不返回情况；验证并非理想无噪声输入；不能据此推出：与所有实物声呐误差完全相同。

<!-- figure-ref-v6:start:rc-15-figure-8 -->
<figure class="reading-evidence-figure" id="rc-15-figure-8"><a href="/robot-classic/assets/figure-refs-v6/015-fig-8.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/015-fig-8.png" width="552" height="518" alt="原论文图8：含墙面镜面反射和不返回情况的十二束模拟声呐" loading="lazy"></a><figcaption>Rodney A. Brooks（1986），图 8，PDF 第 8 页；<a href="https://www.robolabo.etsit.upm.es/asignaturas/lari/papers/Brooks86RobustLayeredControl.pdf#page=8" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：射线不会全都垂直反射回机器人，这正是本例的非理想感知条件。
<!-- figure-ref-v6:end:rc-15-figure-8 -->

**第 V-A 节，[图 9](#rc-15-figure-9)。** 低层漫游轨迹；示例中能够绕开障碍；不能据此推出：对任意环境无碰撞的证明。

**第 V-A 节，[图 10](#rc-15-figure-10)。** 局部目标覆盖漫游，避障继续工作；行为选择与避障能够同时存在；不能据此推出：完整视觉探索已被验证。

<!-- figure-ref-v6:start:rc-15-figure-10 -->
<figure class="reading-evidence-figure" id="rc-15-figure-10"><a href="/robot-classic/assets/figure-refs-v6/015-fig-10.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/015-fig-10.png" width="550" height="1094" alt="原论文图10：机器人受高层目标指引后穿过房间的两个轨迹面板" loading="lazy"></a><figcaption>Rodney A. Brooks（1986），图 10，PDF 第 9 页；<a href="https://www.robolabo.etsit.upm.es/asignaturas/lari/papers/Brooks86RobustLayeredControl.pdf#page=9" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：上下两条路径对应不同高层场景指引；到达目标前仍经过障碍边缘的绕行。
<!-- figure-ref-v6:end:rc-15-figure-10 -->

**第 V-B 节，[图 11](#rc-15-figure-11)。** 实体移动机器人，主要处理在机外；架构能够驱动实物运行；不能据此推出：全部计算都已在机器人上完成。

<!-- figure-ref-v6:start:rc-15-figure-11 -->
<figure class="reading-evidence-figure" id="rc-15-figure-11"><a href="/robot-classic/assets/figure-refs-v6/015-fig-11.png" target="_blank" rel="noopener noreferrer"><img src="/robot-classic/assets/figure-refs-v6/015-fig-11.png" width="343" height="461" alt="原论文图11：MIT AI Lab用于分层行为控制实验的实体移动机器人" loading="lazy"></a><figcaption>Rodney A. Brooks（1986），图 11，PDF 第 9 页；<a href="https://www.robolabo.etsit.upm.es/asignaturas/lari/papers/Brooks86RobustLayeredControl.pdf#page=9" target="_blank" rel="noopener noreferrer">原文与图注</a>。原版权保留。</figcaption></figure>

读图：这张设备图证明实物平台存在；机外计算的范围仍应以正文说明为准。
<!-- figure-ref-v6:end:rc-15-figure-11 -->

[图 10](#rc-15-figure-10) 的走廊描述由场景特定模块提供，不能当成通用视觉理解结果。期刊第 21 页还明确区分实际移动与里程积分的目标判断：轮滑等误差可能让机器人“认为到达”而实际存在偏差。

这些演示没有形成现代统一基准及置信区间比较。种子数、统计显著性与完整运行时长在所核对段落中未确认。文章证明了构建方式可行，关于普遍鲁棒性和可扩展性的更广主张仍需更多任务覆盖。

## 五、区分可增量构建与全局任务保证

主要贡献是系统组织方式：按任务行为增量构建，允许低带宽模块直接参与动作，减少对单一完整世界模型的依赖。这为后来的行为式机器人与混合架构提供了重要思想。

成本首先是交互分析。模块数增加后，单个模块都“正确”仍可能出现循环覆盖、行为饥饿或频繁切换。局部调试容易，整体可证明性质未必容易。设计者需要记录每条消息的生产者、消费者、优先级和有效期。

另一个边界是表达能力。无地图漫游可以很有效，但“先去办公室取钥匙，再返回开门”需要记忆、顺序与目标关系。可以在架构中加入这些能力，却不能用早期漫游演示证明它们已被解决。

本文的分析建议是把它与规划架构互补使用：慢速模块决定长期意图，快速模块处理局部反馈。具体混合方案属于后续系统设计，不是对原作者原样结论的复述。

五个前置概念：**有限状态机**用有限模式组织逻辑；**异步通信**不要求模块同时完成；**消息替代**改变某条输入来源；**输出抑制**阻止消息传播；**行为分解**把能完成任务的感知动作链作为单位。

## 六、追问：若高层模块持续发送过时输出，底层仍在运行是否足以保证避障？

<details>
<summary>若高层模块持续发送过时输出，底层仍在运行是否足以保证避障？</summary>

**参考答案**：不够。底层计算继续运行与其输出最终能到达执行器是两件事，消息抑制或替代可能挡住它的作用。测试应区分高层无输出、延迟输出和持续错误输出，检查具体连接与覆盖规则。原文架构的可增量性不等于任意模块故障下都有安全保证。

</details>

## 七、继续比较地图路线与通信基础设施

- **平行路线**：[Occupancy Grid：地图不只记录哪里有墙，还记录有多确定](025-occupancy.md)。用地图概率组织感知与规划，可与行为模块组合但不是其必然替代。
- **教学联系**：[ROS：让机器人算法能组成系统](058-ros.md)。进一步区分行为职责划分与通用软件通信基础设施。

## 八、自测与参考答案

**1．高层覆盖低层，为什么低层仍可能参与控制？**

因为覆盖针对指定消息线，而不是删除整个低层。探索方向可以替换随机方向，局部避障仍修改该方向，碰撞模块仍可影响停止指令。是否保留这些作用取决于接线。

**2．没有统一世界模型是否等于没有任何内部状态？**

不是。有限状态机、局部变量及运动积分都构成内部状态。拒绝唯一集中表示，不代表机器人完全无记忆。

**3．为什么不能用技报末尾的“缺少实物演示”评价期刊版也没有实验？**

因为版本之间有新增内容。1985 技报反映较早进度，1986 期刊第 V-B 节报告实体机器人。阅读证据必须绑定具体版本，既不能提前归功，也不能忽略后来的实测。
