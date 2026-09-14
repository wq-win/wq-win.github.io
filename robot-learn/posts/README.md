# 机器人学习：从运动基元到视觉语言动作模型

机器人学习研究怎样从示范、交互和已有数据中形成可执行的行为。算法不仅要预测正确，还必须在有延迟、有接触、有执行误差的物理系统里持续工作。这条主线贯穿运动表示、奖励推断、深度控制、仿真迁移、生成动作与 VLA。

[发展时间线与技术地图](00-发展时间线总览.md) · [系列总结](101-系列总结.md)

## 阅读方法

每篇先解释原问题与机器人设定，再沿数据、模型、动作和反馈追踪一次算法执行。公式与教学伪代码帮助复原机制；实验部分区分作者主张、原文证据及适用范围。末尾自测题要求解释一个核心机制并处理一个反例。数值示例若非原文实验，均明确标为教学构造。

年份以首次公开的论文版本为主；期刊扩展、会议发表与后续模型版本在对应文章单独区分。2026 年条目是截至 2026-09-09 的研究样例，其长期影响仍需更多独立证据。

## 100 篇阅读目录

| 篇 | 年份 | 论文与阅读主题 | 分支 | 原文 |
|---|---|---|---|---|
| 1 | 2002 | [DMP：把示范写进稳定动力系统](001-dmp.md) | 运动表示 | [原文](https://proceedings.neurips.cc/paper_files/paper/2002/hash/23c97e9cb93576e45d2feaf00d0e8502-Abstract.html) |
| 2 | 2004 | [学徒学习：从行为恢复任务偏好](002-apprenticeship.md) | 模仿与奖励 | [原文](https://ai.stanford.edu/~ang/papers/icml04-apprentice.pdf) |
| 3 | 2008 | [最大熵逆强化学习：多条合理轨迹如何共存](003-maxent-irl.md) | 模仿与奖励 | [原文](https://www.cs.cmu.edu/~bziebart/publications/maximum-entropy-inverse-reinforcement-learning.pdf) |
| 4 | 2008 | [PoWER：用回报重加权动作探索](004-power.md) | 机器人强化学习 | [原文](https://proceedings.neurips.cc/paper/2008/hash/7647966b7343c29048673252e490f736-Abstract.html) |
| 5 | 2010 | [PI²：从轨迹代价到策略参数更新](005-pi2.md) | 机器人强化学习 | [原文](https://jmlr.org/papers/v11/theodorou10a.html) |
| 6 | 2011 | [DAgger：修复模仿中的分布偏移](006-dagger.md) | 模仿与奖励 | [原文](https://proceedings.mlr.press/v15/ross11a.html) |
| 7 | 2011 | [PILCO：把模型不确定性传播到长期回报](007-pilco.md) | 模型学习 | [原文](https://icml.cc/2011/papers/323_icmlpaper.pdf) |
| 8 | 2013 | [ProMP：把动作技能表示为轨迹分布](008-promp.md) | 运动表示 | [原文](https://proceedings.neurips.cc/paper/2013/hash/e53a0a2978c28872a4505bdb51db06dc-Abstract.html) |
| 9 | 2013 | [GPS：让轨迹优化指导策略学习](009-gps.md) | 机器人强化学习 | [原文](https://proceedings.mlr.press/v28/levine13.html) |
| 10 | 2015 | [视觉运动策略：从相机到机械臂动作](010-visuomotor.md) | 视觉控制 | [原文](https://arxiv.org/abs/1504.00702) |
| 11 | 2015 | [DDPG：在连续动作上直接优化价值](011-ddpg.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/1509.02971) |
| 12 | 2016 | [Guided Cost Learning：一起学习代价与策略](012-guided-cost.md) | 模仿与奖励 | [原文](https://arxiv.org/abs/1603.00448) |
| 13 | 2016 | [NAF：让连续 Q 的最大化可以解析求解](013-naf.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/1603.00748) |
| 14 | 2016 | [手眼协调：从大规模抓取中学习闭环视觉控制](014-hand-eye.md) | 抓取操作 | [原文](https://arxiv.org/abs/1603.02199) |
| 15 | 2016 | [GAIL：匹配长期行为分布](015-gail.md) | 模仿与奖励 | [原文](https://arxiv.org/abs/1606.03476) |
| 16 | 2016 | [视觉预见：通过预测视频规划动作](016-visual-foresight.md) | 模型学习 | [原文](https://arxiv.org/abs/1610.00696) |
| 17 | 2016 | [渐进网络：像素策略如何迁移到真机](017-progressive.md) | 仿真迁移 | [原文](https://arxiv.org/abs/1610.04286) |
| 18 | 2017 | [域随机化：让真实视觉成为一种变化](018-domain-randomization.md) | 仿真迁移 | [原文](https://arxiv.org/abs/1703.06907) |
| 19 | 2017 | [一次示范模仿：学习如何使用新示范](019-one-shot.md) | 模仿与奖励 | [原文](https://arxiv.org/abs/1703.07326) |
| 20 | 2017 | [Dex-Net 2.0：解析抓取指标与合成深度数据](020-dexnet2.md) | 抓取操作 | [原文](https://arxiv.org/abs/1703.09312) |
| 21 | 2017 | [DART：在专家示范中注入恢复机会](021-dart.md) | 模仿与奖励 | [原文](https://arxiv.org/abs/1703.09327) |
| 22 | 2017 | [HER：失败轨迹中的新目标](022-her.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/1707.01495) |
| 23 | 2017 | [DAPG：示范如何引导灵巧操作探索](023-dapg.md) | 灵巧操作 | [原文](https://arxiv.org/abs/1709.10087) |
| 24 | 2017 | [动力学随机化：从参数变化中学习鲁棒控制](024-dynamics-randomization.md) | 仿真迁移 | [原文](https://arxiv.org/abs/1710.06537) |
| 25 | 2018 | [SAC：把动作随机性写进控制目标](025-sac.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/1801.01290) |
| 26 | 2018 | [TD3：防止策略利用价值估计错误](026-td3.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/1802.09477) |
| 27 | 2018 | [动态环境元强化学习：从短历史识别新动力学](027-dynamics-embedding.md) | 仿真迁移 | [原文](https://arxiv.org/abs/1803.11347) |
| 28 | 2018 | [DeepMimic：让物理角色学习动作技能](028-deepmimic.md) | 全身运动 | [原文](https://arxiv.org/abs/1804.02717) |
| 29 | 2018 | [PETS：用概率集成模型做控制规划](029-pets.md) | 模型学习 | [原文](https://arxiv.org/abs/1805.12114) |
| 30 | 2018 | [QT-Opt：大规模视觉抓取的 Q 学习](030-qt-opt.md) | 抓取操作 | [原文](https://arxiv.org/abs/1806.10293) |
| 31 | 2018 | [灵巧手：用随机化模拟学习物体重定向](031-dexterous.md) | 灵巧操作 | [原文](https://arxiv.org/abs/1808.00177) |
| 32 | 2019 | [ANYmal：把学习到的敏捷运动带到真机](032-anymal.md) | 全身运动 | [原文](https://arxiv.org/abs/1901.08652) |
| 33 | 2019 | [MBPO：什么时候该相信模型生成的经验](033-mbpo.md) | 模型学习 | [原文](https://arxiv.org/abs/1906.08253) |
| 34 | 2019 | [RLBench：面向视觉操作的任务集合](034-rlbench.md) | 基准与数据 | [原文](https://arxiv.org/abs/1909.12271) |
| 35 | 2019 | [机械手魔方：自动域随机化与长期控制](035-rubiks.md) | 灵巧操作 | [原文](https://arxiv.org/abs/1910.07113) |
| 36 | 2019 | [Meta-World：多任务操作应该怎样比较](036-metaworld.md) | 基准与数据 | [原文](https://arxiv.org/abs/1910.10897) |
| 37 | 2019 | [Dreamer：在潜在世界里训练控制策略](037-dreamer.md) | 模型学习 | [原文](https://arxiv.org/abs/1912.01603) |
| 38 | 2020 | [CQL：离线机器人数据为什么需要保守估值](038-cql.md) | 离线学习 | [原文](https://arxiv.org/abs/2006.04779) |
| 39 | 2020 | [AWAC：示范预热后的在线策略改进](039-awac.md) | 离线学习 | [原文](https://arxiv.org/abs/2006.09359) |
| 40 | 2020 | [Transporter：用空间对应关系学习操作](040-transporter.md) | 抓取操作 | [原文](https://arxiv.org/abs/2010.14406) |
| 41 | 2021 | [AMP：把动作分布变成运动先验](041-amp.md) | 全身运动 | [原文](https://arxiv.org/abs/2104.02180) |
| 42 | 2021 | [RMA：根据近期运动快速适应新地面](042-rma.md) | 全身运动 | [原文](https://arxiv.org/abs/2107.04034) |
| 43 | 2021 | [robomimic：离线人类示范中真正重要的变量](043-robomimic.md) | 模仿与奖励 | [原文](https://arxiv.org/abs/2108.03298) |
| 44 | 2021 | [IBC：用能量函数表示多峰动作](044-ibc.md) | 模仿与奖励 | [原文](https://arxiv.org/abs/2109.00137) |
| 45 | 2021 | [并行强化学习：在分钟级训练四足步态](045-learning-to-walk.md) | 全身运动 | [原文](https://arxiv.org/abs/2109.11978) |
| 46 | 2021 | [CLIPort：语言语义与空间操作的分工](046-clipport.md) | 语言与操作 | [原文](https://arxiv.org/abs/2109.12098) |
| 47 | 2021 | [IQL：在数据内完成价值改进](047-iql.md) | 离线学习 | [原文](https://arxiv.org/abs/2110.06169) |
| 48 | 2021 | [CALVIN：语言条件长任务的组合泛化](048-calvin.md) | 基准与数据 | [原文](https://arxiv.org/abs/2112.03227) |
| 49 | 2022 | [TD-MPC：让短规划连接长期价值](049-tdmpc.md) | 模型学习 | [原文](https://arxiv.org/abs/2203.04955) |
| 50 | 2022 | [R3M：人类视频中的机器人视觉表征](050-r3m.md) | 视觉控制 | [原文](https://arxiv.org/abs/2203.12601) |
| 51 | 2022 | [SayCan：语言计划还需要可执行性](051-saycan.md) | 语言与操作 | [原文](https://arxiv.org/abs/2204.01691) |
| 52 | 2022 | [Gato：把多模态决策统一为序列预测](052-gato.md) | 通用策略 | [原文](https://arxiv.org/abs/2205.06175) |
| 53 | 2022 | [Diffuser：通过去噪生成行为轨迹](053-diffuser.md) | 生成动作 | [原文](https://arxiv.org/abs/2205.09991) |
| 54 | 2022 | [DayDreamer：世界模型走出仿真](054-daydreamer.md) | 模型学习 | [原文](https://arxiv.org/abs/2206.14176) |
| 55 | 2022 | [PerAct：三维体素中的语言条件动作](055-peract.md) | 抓取操作 | [原文](https://arxiv.org/abs/2209.05451) |
| 56 | 2022 | [VIMA：多模态提示中的任务组合](056-vima.md) | 语言与操作 | [原文](https://arxiv.org/abs/2210.03094) |
| 57 | 2022 | [RT-1：大规模真实机器人动作序列](057-rt1.md) | VLA | [原文](https://arxiv.org/abs/2212.06817) |
| 58 | 2023 | [UniPi：把文本生成视频变成动作策略](058-uni-pi.md) | 模型学习 | [原文](https://arxiv.org/abs/2302.00111) |
| 59 | 2023 | [GenAug：用生成式视觉增强扩展示范](059-genaug.md) | 视觉控制 | [原文](https://arxiv.org/abs/2302.06671) |
| 60 | 2023 | [PaLM-E：将连续感知送入语言模型](060-palm-e.md) | 语言与操作 | [原文](https://arxiv.org/abs/2303.03378) |
| 61 | 2023 | [Diffusion Policy：在动作空间迭代去噪](061-diffusion-policy.md) | 生成动作 | [原文](https://arxiv.org/abs/2303.04137) |
| 62 | 2023 | [ACT：用动作分块学习精细双臂操作](062-act.md) | 生成动作 | [原文](https://arxiv.org/abs/2304.13705) |
| 63 | 2023 | [FurnitureBench：真实装配的长期误差](063-furniturebench.md) | 基准与数据 | [原文](https://arxiv.org/abs/2305.12821) |
| 64 | 2023 | [VoxPoser：从语言构造三维价值地图](064-voxposer.md) | 语言与操作 | [原文](https://arxiv.org/abs/2307.05973) |
| 65 | 2023 | [RT-2：把视觉语言知识接到机器人动作](065-rt2.md) | VLA | [原文](https://arxiv.org/abs/2307.15818) |
| 66 | 2023 | [BridgeData V2：跨场景操作数据](066-bridgev2.md) | 基准与数据 | [原文](https://arxiv.org/abs/2308.12952) |
| 67 | 2023 | [Extreme Parkour：复杂地形中的运动课程](067-extreme-parkour.md) | 全身运动 | [原文](https://arxiv.org/abs/2309.14341) |
| 68 | 2023 | [Open X：跨机器人数据与共享策略](068-openx.md) | 基准与数据 | [原文](https://arxiv.org/abs/2310.08864) |
| 69 | 2023 | [Eureka：用程序生成与反馈改进奖励](069-eureka.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/2310.12931) |
| 70 | 2023 | [TD-MPC2：可扩展的连续控制世界模型](070-tdmpc2.md) | 模型学习 | [原文](https://arxiv.org/abs/2310.16828) |
| 71 | 2023 | [MimicGen：用对象中心变换复用示范](071-mimicgen.md) | 模仿与奖励 | [原文](https://arxiv.org/abs/2310.17596) |
| 72 | 2023 | [GR-1：视频预测预训练与机器人动作学习](072-gr1.md) | 模型学习 | [原文](https://arxiv.org/abs/2312.13139) |
| 73 | 2024 | [Mobile ALOHA：移动双臂的全身示范](073-mobile-aloha.md) | 全身操作 | [原文](https://arxiv.org/abs/2401.02117) |
| 74 | 2024 | [SERL：可实际运行的真机强化学习栈](074-serl.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/2401.16013) |
| 75 | 2024 | [DP3：简洁三维表示与动作扩散](075-dp3.md) | 生成动作 | [原文](https://arxiv.org/abs/2403.03954) |
| 76 | 2024 | [Human2Humanoid：把人的全身运动映射到机器人](076-human2humanoid.md) | 全身运动 | [原文](https://arxiv.org/abs/2403.04436) |
| 77 | 2024 | [DexCap：便携式灵巧操作数据采集](077-dexcap.md) | 灵巧操作 | [原文](https://arxiv.org/abs/2403.07788) |
| 78 | 2024 | [DROID：真实环境中的多样操作示范](078-droid.md) | 基准与数据 | [原文](https://arxiv.org/abs/2403.12945) |
| 79 | 2024 | [Humanoid-Gym：人形步态的零样本仿真迁移](079-humanoidgym.md) | 全身运动 | [原文](https://arxiv.org/abs/2404.05695) |
| 80 | 2024 | [Octo：可适配的通用机器人策略](080-octo.md) | 通用策略 | [原文](https://arxiv.org/abs/2405.12213) |
| 81 | 2024 | [RoboCasa：厨房任务中的通用机器人训练](081-robocasa.md) | 基准与数据 | [原文](https://arxiv.org/abs/2406.02523) |
| 82 | 2024 | [OpenVLA：开源视觉语言动作模型](082-openvla.md) | VLA | [原文](https://arxiv.org/abs/2406.09246) |
| 83 | 2024 | [DPPO：扩散策略如何在线优化回报](083-diffusion-rl.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/2409.00588) |
| 84 | 2024 | [RoboTwin：数字孪生中的双臂任务](084-robotwin.md) | 基准与数据 | [原文](https://arxiv.org/abs/2409.02920) |
| 85 | 2024 | [RDT-1B：双臂控制的扩散基础模型](085-rdt.md) | 生成动作 | [原文](https://arxiv.org/abs/2410.07864) |
| 86 | 2024 | [HIL-SERL：通过人类纠正加速真机学习](086-hil-serl.md) | 机器人强化学习 | [原文](https://arxiv.org/abs/2410.21845) |
| 87 | 2024 | [π0：以流匹配生成连续动作](087-pi0.md) | VLA | [原文](https://arxiv.org/abs/2410.24164) |
| 88 | 2024 | [DexMimicGen：从少量示范生成双臂灵巧数据](088-dexmimicgen.md) | 灵巧操作 | [原文](https://arxiv.org/abs/2410.24185) |
| 89 | 2025 | [FAST：让高频连续动作拥有紧凑 token](089-fast.md) | VLA | [原文](https://arxiv.org/abs/2501.09747) |
| 90 | 2025 | [ASAP：学习仿真与现实之间的动作差异](090-asap.md) | 全身运动 | [原文](https://arxiv.org/abs/2502.01143) |
| 91 | 2025 | [OpenVLA-OFT：高效微调与动作分块](091-openvla-oft.md) | VLA | [原文](https://arxiv.org/abs/2502.19645) |
| 92 | 2025 | [GR00T N1：面向人形操作的通用模型](092-groot.md) | VLA | [原文](https://arxiv.org/abs/2503.14734) |
| 93 | 2025 | [π0.5：开放环境中的任务与动作泛化](093-pi05.md) | VLA | [原文](https://arxiv.org/abs/2504.16054) |
| 94 | 2025 | [VLA-RL：用强化学习改进动作基础模型](094-vla-rl.md) | VLA | [原文](https://arxiv.org/abs/2505.18719) |
| 95 | 2025 | [SmolVLA：紧凑模型与异步机器人控制](095-smolvla.md) | VLA | [原文](https://arxiv.org/abs/2506.01844) |
| 96 | 2026 | [Xiaomi-Robotics-0：实时执行约束下的通用动作模型](096-xiaomi0.md) | VLA | [原文](https://arxiv.org/abs/2602.12684) |
| 97 | 2026 | [MBDPO：世界模型中的扩散策略优化](097-mbdpo.md) | 模型学习 | [原文](https://arxiv.org/abs/2605.26282) |
| 98 | 2026 | [连续推理：让潜在思想成为可复用的动作接口](098-continuous-reasoning.md) | VLA | [原文](https://arxiv.org/abs/2606.00229) |
| 99 | 2026 | [WorldSample：世界模型合成经验的选择与使用](099-worldsample.md) | 模型学习 | [原文](https://arxiv.org/abs/2607.02431) |
| 100 | 2026 | [CoRE-VLA：用条件专家路由平衡规模与鲁棒性](100-core-vla.md) | VLA | [原文](https://arxiv.org/abs/2607.03693) |



