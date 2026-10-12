/* Shared bilingual concepts. Keep legacy id/term/aliases/definition/href fields.
 * Aliases are true alternate names; narrower methods belong in related.
 * Single-letter mathematical symbols live in reading-symbols.js. */
window.GLOSSARY = [
    {
        "id": "mdp",
        "term": "MDP",
        "en": "Markov Decision Process",
        "zh": "马尔可夫决策过程",
        "aliases": [
            "Markov Decision Process",
            "马尔可夫决策过程"
        ],
        "definition": "用状态、动作、转移、奖励及折扣描述序列决策；给定当前状态和动作，下一步的分布不再依赖更早历史。",
        "purpose": "先核对论文如何定义任务，以及观测是否真能当作状态。",
        "example": "棋盘局面可近似完整状态；单张机器人照片可能漏掉速度。",
        "href": "rl/00-timeline.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "observation",
            "policy",
            "reward"
        ]
    },
    {
        "id": "td",
        "term": "TD",
        "en": "Temporal Difference",
        "zh": "时序差分",
        "aliases": [
            "Temporal Difference",
            "时序差分"
        ],
        "definition": "用即时奖励加下一步的价值预测形成目标，再与当前预测比较；可以不用等到整局结束。",
        "purpose": "通过相邻时刻预测的差来逐步学习价值。",
        "example": "δ=r+γV(s′)−V(s)；真实终止后通常不再加入下一状态价值。",
        "href": "rl/02-td-lambda.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "bootstrap",
            "bellman",
            "state-value"
        ]
    },
    {
        "id": "q-learning",
        "term": "Q-learning",
        "en": "Q-learning",
        "zh": "Q 学习",
        "aliases": [
            "Q 学习"
        ],
        "definition": "用下一状态最大动作价值构造 TD 目标，学习最优动作价值的经典离策略方法。",
        "purpose": "理解行为仍在探索，但更新目标可以是贪心行为。",
        "example": "采集时偶尔随机走，更新却使用 r+γ max Q(s′,a′)。",
        "href": "rl/04-q-learning.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "action-value",
            "off-policy",
            "sarsa"
        ]
    },
    {
        "id": "policy-gradient",
        "term": "策略梯度",
        "en": "Policy gradient",
        "zh": "策略梯度",
        "aliases": [
            "policy gradient",
            "Policy gradient"
        ],
        "definition": "对策略参数求期望回报的梯度并据此改进策略的一类方法。REINFORCE 是其中一种估计方式，不是整个类别的别名。",
        "purpose": "直接改进行为概率或动作函数，而不必先对全部动作求最优 Q。",
        "example": "提高高优势动作的对数概率；连续确定性策略也有相应策略梯度。",
        "href": "rl/05-reinforce.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "reinforce",
            "actor-critic",
            "deterministic-policy"
        ]
    },
    {
        "id": "actor-critic",
        "term": "Actor–Critic",
        "en": "Actor–Critic",
        "zh": "行动者–评价者",
        "aliases": [
            "Actor-Critic",
            "Actor Critic",
            "行动者-评价者",
            "行动者–评价者"
        ],
        "definition": "同时学习动作选择规则与价值评价，通过评价信号改进策略的一类方法；Actor 与 Critic 是功能分工，不一定是两个神经网络。",
        "purpose": "把“如何行动”和“行动后预计多好”拆开理解。",
        "example": "Actor 提高正优势动作的概率，Critic 同时改进对长期回报的预测。",
        "href": "rl/01-actor-critic.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "actor",
            "critic",
            "policy-gradient"
        ]
    },
    {
        "id": "ppo",
        "term": "PPO",
        "en": "Proximal Policy Optimization",
        "zh": "近端策略优化",
        "aliases": [
            "Proximal Policy Optimization",
            "近端策略优化"
        ],
        "definition": "通过限制策略更新的替代目标来改进策略的方法家族；常见 PPO-Clip 裁剪新旧动作概率比的目标项。",
        "purpose": "减少单批数据上过大的策略更新，但裁剪不等于严格保证 KL 上限。",
        "example": "旧策略采集一批轨迹，新策略在有限轮次中用裁剪目标更新。",
        "href": "rl/27-ppo.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "on-policy",
            "importance-sampling",
            "advantage"
        ]
    },
    {
        "id": "dpo",
        "term": "DPO",
        "en": "Direct Preference Optimization",
        "zh": "直接偏好优化",
        "aliases": [
            "Direct Preference Optimization",
            "直接偏好优化"
        ],
        "definition": "从偏好对直接优化策略相对参考模型的概率比；常见实现不必单独训练奖励模型再运行在线 RL。",
        "purpose": "读偏好训练时，区分固定偏好数据与在线采样奖励优化。",
        "example": "给定较好与较差回答，提高前者相对后者的模型概率优势。",
        "href": "llm/075-dpo.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "rlhf",
            "sft",
            "offline-rl"
        ]
    },
    {
        "id": "grpo",
        "term": "GRPO",
        "en": "Group Relative Policy Optimization",
        "zh": "组相对策略优化",
        "aliases": [
            "Group Relative Policy Optimization",
            "组相对策略优化"
        ],
        "definition": "对同一输入采样一组输出，以组内奖励比较构造优势的策略优化方法；原始形式省去独立价值模型。",
        "purpose": "读推理模型 RL 时，分清组内相对分数与传统价值基线。",
        "example": "同一题采样多个答案，再根据各答案相对组平均奖励的好坏更新。",
        "href": "rl/52-grpo.html",
        "series": [
            "rl",
            "llm"
        ],
        "related": [
            "ppo",
            "advantage",
            "rollout"
        ]
    },
    {
        "id": "off-policy",
        "term": "Off-policy",
        "en": "Off-policy",
        "zh": "离策略",
        "aliases": [
            "离策略"
        ],
        "definition": "学习目标策略时，允许数据来自不同的行为策略。它不等于离线，也不意味着完全不能采集新数据。",
        "purpose": "判断历史经验能否重用，以及分布差异如何处理。",
        "example": "DQN 一边与环境交互，一边从旧经验池学习，是在线、离策略方法。",
        "href": "rl/04-q-learning.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "on-policy",
            "offline-rl",
            "online-rl"
        ]
    },
    {
        "id": "offline-rl",
        "term": "离线强化学习",
        "en": "Offline RL",
        "zh": "离线强化学习",
        "aliases": [
            "Offline RL"
        ],
        "definition": "在给定数据集上学习策略，训练阶段不能通过继续环境交互补充数据；部署评估或之后在线微调是另一阶段。",
        "purpose": "关注数据覆盖不足、分布外动作与价值高估。",
        "example": "只有旧机器人操作日志，训练期间不能再让机器人试新动作。",
        "href": "rl/42-cql.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "online-rl",
            "off-policy",
            "behavior-cloning"
        ]
    },
    {
        "id": "world-model",
        "term": "世界模型",
        "en": "World model",
        "zh": "世界模型",
        "aliases": [
            "world model",
            "World model"
        ],
        "definition": "学习环境状态、观测、奖励或其潜在表示如何随动作变化的预测模型；可用于规划、想象训练或评估。",
        "purpose": "先看模型预测什么，再看算法怎样使用它。",
        "example": "预测推杯子后杯子的位置；预测正确也不自动保证规划出的动作安全。",
        "href": "rl/40-dreamer.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "model-based",
            "dreamer"
        ]
    },
    {
        "id": "attention",
        "term": "注意力",
        "en": "Attention",
        "zh": "注意力",
        "aliases": [
            "attention",
            "Attention"
        ],
        "definition": "根据当前位置的需求，对一组信息计算权重并加权读取的机制；加性注意力与点积注意力是不同实现。",
        "purpose": "解决固定摘要的瓶颈；注意力不自动等于自注意力。",
        "example": "翻译当前目标词时，动态读取不同源词位置的表示。",
        "href": "llm/007-attention.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "self-attention",
            "transformer"
        ]
    },
    {
        "id": "transformer",
        "term": "Transformer",
        "en": "Transformer",
        "zh": "Transformer 架构",
        "aliases": [
            "Transformer 架构"
        ],
        "definition": "以注意力、前馈变换、残差连接和归一化等模块组成的模型架构家族；原论文含编码器与解码器。",
        "purpose": "先区分架构与语言建模目标，再区分训练并行与自回归生成。",
        "example": "训练可同时计算已知序列各位置的损失；逐 token 生成仍依赖此前输出。",
        "href": "llm/015-transformer.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "attention",
            "causal-language-model"
        ],
        "sources": [
            {
                "title": "Attention Is All You Need",
                "url": "https://arxiv.org/abs/1706.03762"
            }
        ]
    },
    {
        "id": "pretrain",
        "term": "预训练",
        "en": "Pre-training",
        "zh": "预训练",
        "aliases": [
            "pre-training",
            "pretraining",
            "Pre-training"
        ],
        "definition": "在下游适配之前，通过较大范围数据与目标学习可复用能力或表示的阶段。",
        "purpose": "区分先学习基础能力和之后面向特定任务的适配。",
        "example": "先在通用文本上训练语言模型，再用问答示范微调。",
        "href": "llm/018-bert.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "finetune",
            "sft"
        ]
    },
    {
        "id": "lora",
        "term": "LoRA",
        "en": "Low-Rank Adaptation",
        "zh": "低秩适配",
        "aliases": [
            "低秩适配",
            "Low-Rank Adaptation"
        ],
        "definition": "冻结基础权重，以两个较小矩阵的乘积表示并训练权重增量的参数高效适配方法。",
        "purpose": "降低需要训练的参数量与优化器状态开销。",
        "example": "W 保持不变，训练 ΔW=BA；推理时可按实现将增量合并。",
        "href": "llm/047-lora.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "finetune",
            "quantization"
        ]
    },
    {
        "id": "rag",
        "term": "RAG",
        "en": "Retrieval-Augmented Generation",
        "zh": "检索增强生成",
        "aliases": [
            "检索增强生成",
            "Retrieval-Augmented Generation"
        ],
        "definition": "把外部检索结果作为生成的条件或证据来源，使模型可利用参数之外的信息。",
        "purpose": "区分检索、证据选择与答案生成各自的错误。",
        "example": "先查公司手册，再依据相关段落回答报销政策；仍需核对引用是否支持结论。",
        "href": "llm/034-rag.html",
        "series": [
            "llm"
        ],
        "related": [
            "context-window",
            "hallucination"
        ]
    },
    {
        "id": "rlhf",
        "term": "RLHF",
        "en": "Reinforcement Learning from Human Feedback",
        "zh": "人类反馈强化学习",
        "aliases": [
            "人类反馈强化学习",
            "Reinforcement Learning from Human Feedback"
        ],
        "definition": "把人类反馈转成训练信号来改进模型行为；常见流程先学习偏好奖励，再用强化学习优化策略。AI 反馈通常另称 RLAIF。",
        "purpose": "区分反馈来源、奖励模型与策略优化三个环节。",
        "example": "人类比较两个回答，奖励模型学排序，再用 PPO 改进回答策略。",
        "href": "llm/054-instructgpt.html",
        "series": [
            "rl",
            "llm"
        ],
        "related": [
            "sft",
            "ppo",
            "dpo"
        ]
    },
    {
        "id": "moe",
        "term": "MoE",
        "en": "Mixture of Experts",
        "zh": "混合专家",
        "aliases": [
            "混合专家",
            "Mixture of Experts"
        ],
        "definition": "由多个专家子模型与路由机制组成；稀疏 MoE 对每个 token 只激活部分专家。",
        "purpose": "区分总参数、每 token 激活参数与实际推理开销。",
        "example": "路由器把一个 token 送给两个专家，但通信和负载平衡仍有成本。",
        "href": "llm/014-sparse-moe.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "transformer",
            "token"
        ]
    },
    {
        "id": "test-time",
        "term": "测试时计算",
        "en": "Test-time computation",
        "zh": "测试时计算",
        "aliases": [
            "test-time compute",
            "inference-time compute",
            "Test-time computation"
        ],
        "definition": "在推理阶段用于生成、采样、搜索或验证的计算量与机制；增加它是否改善结果需要实测。",
        "purpose": "把训练预算与回答问题当下的推理预算分开。",
        "example": "同一个已训练模型，为一道题采样 16 个候选再验证。",
        "href": "llm/091-test-time-scaling.html",
        "series": [
            "rl",
            "llm"
        ],
        "related": [
            "test-time-scaling",
            "mcts",
            "cot"
        ]
    },
    {
        "id": "dmp",
        "term": "DMP",
        "en": "Dynamic Movement Primitives",
        "zh": "动态运动基元",
        "aliases": [
            "动态运动基元",
            "Dynamic Movement Primitives"
        ],
        "definition": "用结构化动力系统表示可调节的运动形状；离散运动与周期运动有不同形式，稳定性依赖具体条件。",
        "purpose": "复用示范并调整目标或时间尺度；它是运动表示，不必用 RL 训练。",
        "example": "把一次挥拍写成期望轨迹生成器，改终点后仍需底层控制器准确跟踪。",
        "href": "robot-learn/001-dmp.html",
        "series": [
            "robot-learn"
        ],
        "related": [
            "demonstration",
            "trajectory",
            "feedback-control"
        ]
    },
    {
        "id": "dagger",
        "term": "DAgger",
        "en": "Dataset Aggregation",
        "zh": "数据集聚合",
        "aliases": [
            "Dataset Aggregation",
            "数据集聚合"
        ],
        "definition": "让学习者访问状态，再请专家标注这些状态的动作，逐轮聚合数据并训练策略的方法。",
        "purpose": "缓解只在专家访问状态训练造成的误差累积。",
        "example": "机器人自己把杯子推歪后，专家示范如何纠正，纠正数据加入下一轮训练。",
        "href": "robot-learn/006-dagger.html",
        "series": [
            "robot-learn"
        ],
        "related": [
            "behavior-cloning",
            "covariate-shift",
            "imitation"
        ],
        "sources": [
            {
                "title": "Dataset Aggregation (AISTATS 2011)",
                "url": "https://proceedings.mlr.press/v15/ross11a.html"
            }
        ]
    },
    {
        "id": "vla",
        "term": "VLA",
        "en": "Vision-Language-Action model",
        "zh": "视觉语言动作模型",
        "aliases": [
            "视觉语言动作",
            "Vision-Language-Action",
            "Vision-Language-Action model",
            "视觉语言动作模型"
        ],
        "definition": "以视觉与语言等信息为条件生成机器人动作的模型类别；动作表示和底层执行接口依模型而异。",
        "purpose": "区分语言理解、动作生成与真机控制能力。",
        "example": "看到桌面并收到“把杯子放进盘子”，模型输出机器人动作。",
        "href": "robot-learn/082-openvla.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "action",
            "embodiment",
            "transformer"
        ]
    },
    {
        "id": "imitation",
        "term": "模仿学习",
        "en": "Imitation learning",
        "zh": "模仿学习",
        "aliases": [
            "Imitation learning"
        ],
        "definition": "利用专家示范学习行为的一类方法，包括直接行为克隆、交互式模仿及部分逆强化学习流程。",
        "purpose": "先看示范怎样转成训练信号，不能把整个类别等同于行为克隆。",
        "example": "可直接拟合专家动作，也可从示范推断奖励后再优化策略。",
        "href": "robot-learn/002-apprenticeship.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "behavior-cloning",
            "dagger",
            "inverse-rl"
        ]
    },
    {
        "id": "sim2real",
        "term": "仿真到真机",
        "en": "Sim-to-real transfer",
        "zh": "仿真到真机迁移",
        "aliases": [
            "sim2real",
            "sim-to-real",
            "Sim-to-real transfer",
            "仿真到真机迁移"
        ],
        "definition": "将仿真中获得的策略、模型或方法迁移到真实系统的任务与过程；域随机化只是其中一种手段。",
        "purpose": "先找仿真与真实的差异，再看所用迁移方法能覆盖哪些差异。",
        "example": "仿真学会抓取后，上真机要处理摩擦、相机和执行延迟的差异。",
        "href": "robot-learn/018-domain-randomization.html",
        "series": [
            "robot-learn"
        ],
        "related": [
            "domain-randomization",
            "dynamics"
        ]
    },
    {
        "id": "astar",
        "term": "A*",
        "en": "A-star search",
        "zh": "A* 搜索",
        "aliases": [
            "A-star",
            "A-star search",
            "A* 搜索"
        ],
        "definition": "按已走代价与到目标的启发式估计之和选择扩展节点的搜索算法；最优性依赖启发式与具体搜索实现的条件。",
        "purpose": "将启发式引导与最短路径保证的条件一起阅读。",
        "example": "四邻接、单位代价栅格用曼哈顿距离作启发式；带障碍时仍逐步扩展可行路径。",
        "href": "robot-classic/003-astar.html",
        "series": [
            "robot-classic"
        ],
        "related": [
            "motion-planning",
            "rrt"
        ]
    },
    {
        "id": "rrt",
        "term": "RRT",
        "en": "Rapidly-exploring Random Tree",
        "zh": "快速探索随机树",
        "aliases": [
            "Rapidly-exploring Random Tree",
            "快速探索随机树"
        ],
        "definition": "通过随机采样并朝样本扩展树来探索连续空间的路径规划方法；基本 RRT 不保证渐近最优。",
        "purpose": "区分快速找到可行解与持续改进到最优解。",
        "example": "机械臂在高维关节空间随机扩展无碰节点；RRT* 才引入面向渐近最优的重连。",
        "href": "robot-classic/040-rrt.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "configuration-space",
            "motion-planning"
        ]
    },
    {
        "id": "kalman",
        "term": "Kalman 滤波",
        "en": "Kalman filter",
        "zh": "卡尔曼滤波",
        "aliases": [
            "卡尔曼滤波",
            "Kalman filtering",
            "Kalman filter"
        ],
        "definition": "在线性模型和适当已知二阶噪声统计下递推最优线性估计；联合高斯条件使其还对应完整的高斯后验更新。",
        "purpose": "理解预测与测量如何根据不确定性融合；不要把最优性说成无条件保证。",
        "example": "用运动模型预测位置，再按协方差权衡 GPS 测量的修正幅度。",
        "href": "robot-classic/002-kalman.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "state-estimation",
            "observability"
        ]
    },
    {
        "id": "slam",
        "term": "SLAM",
        "en": "Simultaneous Localization and Mapping",
        "zh": "同时定位与地图构建",
        "aliases": [
            "同时定位与地图构建",
            "Simultaneous Localization and Mapping"
        ],
        "definition": "在未知环境中联合估计自身位姿和地图；两者的不确定性相互关联。",
        "purpose": "区分定位、建图、回环检测与后端优化的职责。",
        "example": "机器人绕一圈回到原处，用回环约束修正整段轨迹与地图。",
        "href": "robot-classic/082-orbslam.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "state-estimation",
            "loop-closure",
            "factor-graph"
        ]
    },
    {
        "id": "ik",
        "term": "逆运动学",
        "en": "Inverse kinematics",
        "zh": "逆运动学",
        "aliases": [
            "IK",
            "inverse kinematics",
            "Inverse kinematics"
        ],
        "definition": "由目标末端位姿反求满足几何约束的关节构型；可能多解、无解或接近奇异。",
        "purpose": "区分几何可达性与动力学可执行性。",
        "example": "同一夹爪位姿可能对应肘上、肘下两种关节构型。",
        "href": "robot-classic/004-resolved-rate.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "forward-kinematics",
            "jacobian",
            "configuration-space"
        ]
    },
    {
        "id": "occupancy",
        "term": "占据栅格",
        "en": "Occupancy grid",
        "zh": "占据栅格",
        "aliases": [
            "occupancy grid",
            "Occupancy grid"
        ],
        "definition": "把空间划为格子并估计每格被障碍占据的概率或状态；未知不等于空闲。",
        "purpose": "把传感器观测转换为可供避障规划使用的空间表示。",
        "example": "激光射线经过的格子倾向空闲，命中的端点倾向被占据。",
        "href": "robot-classic/025-occupancy.html",
        "series": [
            "robot-classic"
        ],
        "related": [
            "slam",
            "motion-planning"
        ]
    },
    {
        "id": "policy",
        "term": "策略",
        "en": "Policy",
        "zh": "策略",
        "aliases": [
            "Policy"
        ],
        "definition": "从状态、观测或历史到动作选择规则的映射；可以输出一个动作，也可以输出动作分布。",
        "purpose": "回答智能体下一步怎么做，不等于评价这一步有多好。",
        "example": "同样看到前方障碍，策略决定左转还是减速。",
        "href": "rl/08-policy-gradient-theorem.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "stochastic-policy",
            "deterministic-policy",
            "actor"
        ]
    },
    {
        "id": "stochastic-policy",
        "term": "随机策略",
        "en": "Stochastic policy",
        "zh": "随机策略",
        "aliases": [
            "Stochastic policy"
        ],
        "definition": "给定输入后输出动作的条件概率分布，再按该分布采样。随机指策略的动作选择，不是环境一定随机。",
        "purpose": "表达多个可选行为，也可提供探索和对数概率梯度。",
        "example": "π(左转|s)=0.7，π(右转|s)=0.3；重复同一状态仍可能选不同动作。",
        "href": "rl/05-reinforce.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "deterministic-policy",
            "policy-gradient",
            "entropy"
        ],
        "sources": [
            {
                "title": "OpenAI Spinning Up: Key Concepts",
                "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro.html"
            }
        ]
    },
    {
        "id": "deterministic-policy",
        "term": "确定性策略",
        "en": "Deterministic policy",
        "zh": "确定性策略",
        "aliases": [
            "Deterministic policy"
        ],
        "definition": "给定同一输入及固定参数，直接输出同一个动作。训练采集时可以另外加探索噪声。",
        "purpose": "把连续动作看作可微函数，区分策略本身与采集噪声。",
        "example": "机械臂 Actor 输出 0.2 的控制量；采集时再加噪声，并不会把其网络改成概率分布。",
        "href": "rl/13-dpg.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "stochastic-policy",
            "actor",
            "exploration"
        ],
        "sources": [
            {
                "title": "OpenAI Spinning Up: Key Concepts",
                "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro.html"
            }
        ]
    },
    {
        "id": "state-value",
        "term": "状态价值",
        "en": "State-value function",
        "zh": "状态价值函数",
        "aliases": [
            "state value",
            "V-value",
            "State-value function",
            "状态价值函数"
        ],
        "definition": "Vπ(s) 是从状态 s 出发，之后按策略 π 行动所得到的期望回报；已经对接下来的动作取平均。",
        "purpose": "评估局面，常用作策略梯度的基线。",
        "example": "“站在路口，按当前导航策略走下去，平均还能得多少分？”",
        "href": "rl/01-actor-critic.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "action-value",
            "return",
            "critic"
        ],
        "sources": [
            {
                "title": "OpenAI Spinning Up: Key Concepts",
                "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro.html"
            }
        ]
    },
    {
        "id": "action-value",
        "term": "动作价值",
        "en": "Action-value function",
        "zh": "动作价值函数",
        "aliases": [
            "action value",
            "Q-function",
            "Q 值",
            "Q值",
            "Action-value function",
            "动作价值函数"
        ],
        "definition": "Qπ(s,a) 是先在 s 执行动作 a，再按 π 行动的期望回报。Q* 才指最优后续行为对应的动作价值。",
        "purpose": "比较同一状态下不同动作的长期后果。",
        "example": "Q(s,左转) 与 Q(s,右转) 比较的是先做哪一步更好。",
        "href": "rl/04-q-learning.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "state-value",
            "advantage",
            "q-learning"
        ],
        "sources": [
            {
                "title": "OpenAI Spinning Up: Key Concepts",
                "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro.html"
            }
        ]
    },
    {
        "id": "advantage",
        "term": "优势函数",
        "en": "Advantage function",
        "zh": "优势函数",
        "aliases": [
            "advantage",
            "Advantage function"
        ],
        "definition": "Aπ(s,a)=Qπ(s,a)−Vπ(s)，表示某动作相对当前策略在该状态下平均水平的好坏。",
        "purpose": "让策略更新关注比预期更好或更差的动作。",
        "example": "该局面平均回报为 5，某动作预计为 7，则优势为 2。",
        "href": "rl/15-gae.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "state-value",
            "action-value",
            "policy-gradient"
        ]
    },
    {
        "id": "actor",
        "term": "Actor",
        "en": "Actor",
        "zh": "行动者",
        "aliases": [
            "行动者"
        ],
        "definition": "负责动作选择的策略部分；可能是概率规则、表格或网络。它描述功能角色，不规定一定采用深度网络。",
        "purpose": "读 Actor–Critic 时先找哪一部分实际决定动作。",
        "example": "早期 Actor–Critic 的动作选择单元与今天输出高斯分布的神经网络，都是 Actor 的不同实现。",
        "href": "rl/01-actor-critic.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "critic",
            "actor-critic",
            "policy"
        ],
        "contexts": {
            "rl:01-actor-critic": {
                "definition": "1983 年论文中的 Actor 是动作选择部分 ASE（associative search element），依据状态特征选择动作；不要直接替换成今天的深度策略网络。",
                "example": "ASE 接收 Critic 的评价信号来改变动作偏好；现代 Actor 网络只是后来的实现形式。"
            }
        }
    },
    {
        "id": "critic",
        "term": "Critic",
        "en": "Critic",
        "zh": "评价者",
        "aliases": [
            "评价者"
        ],
        "definition": "估计状态价值或动作价值，并为策略改进提供评价信号的部分；不是环境奖励本身。",
        "purpose": "区分即时奖励、价值预测和由两者构造的 TD 误差。",
        "example": "Critic 认为该局面可得 5 分，实际反馈使它修正预测，并影响 Actor。",
        "href": "rl/01-actor-critic.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "actor",
            "state-value",
            "action-value",
            "td"
        ],
        "contexts": {
            "rl:01-actor-critic": {
                "definition": "1983 年论文中的 Critic 是评价部分 ACE（adaptive critic element），通过时间上的预测差形成内部评价信号。它不是一个现代深度 Q 网络的同义词。",
                "example": "ACE 的预测变化影响 ASE 的动作学习，二者首先是功能分工。"
            }
        }
    },
    {
        "id": "reward",
        "term": "奖励",
        "en": "Reward",
        "zh": "奖励",
        "aliases": [
            "Reward"
        ],
        "definition": "环境或任务定义给出的单步反馈信号；它与累计回报、价值预测以及训练损失是不同量。",
        "purpose": "识别算法究竟在优化什么反馈，以及是否存在奖励设计漏洞。",
        "example": "每前进一步奖励 −1，到达目标奖励 +10；这一局的回报由整段奖励组成。",
        "href": "rl/00-timeline.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "return",
            "state-value"
        ]
    },
    {
        "id": "return",
        "term": "回报",
        "en": "Return",
        "zh": "回报",
        "aliases": [
            "累计回报",
            "Return"
        ],
        "definition": "一段未来奖励按目标约定累计得到的量；可为有限时域总和，也可含折扣。",
        "purpose": "区分一时的奖励与长期目标。",
        "example": "后续奖励为 1、2，折扣为 0.9，则当前两步回报为 1+0.9×2。",
        "href": "rl/05-reinforce.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "reward",
            "discount",
            "state-value"
        ]
    },
    {
        "id": "discount",
        "term": "折扣因子",
        "en": "Discount factor",
        "zh": "折扣因子",
        "aliases": [
            "discount factor",
            "Discount factor"
        ],
        "definition": "通常记作 γ，决定未来奖励相对当前奖励的权重；γ 的选择也是任务目标的一部分。",
        "purpose": "比较论文目标时，核对折扣、终止和截断的约定。",
        "example": "γ=0 只看即时奖励；γ 接近 1 时会更重视远期奖励。",
        "href": "rl/02-td-lambda.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "return",
            "episode"
        ]
    },
    {
        "id": "bootstrap",
        "term": "自举",
        "en": "Bootstrapping",
        "zh": "自举",
        "aliases": [
            "bootstrapping",
            "Bootstrapping"
        ],
        "definition": "用另一个已有估计来构造当前学习目标；RL 中常见于用下一状态价值更新当前价值。",
        "purpose": "理解 TD 的数据效率，以及错误估计为何可能继续传播。",
        "example": "目标 r+γV(s′) 含模型当前的 V 估计；完整蒙特卡洛回报不需要这项自举。",
        "href": "rl/02-td-lambda.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "td",
            "return",
            "target-network"
        ]
    },
    {
        "id": "bellman",
        "term": "Bellman 方程",
        "en": "Bellman equation",
        "zh": "贝尔曼方程",
        "aliases": [
            "贝尔曼方程",
            "Bellman equation"
        ],
        "definition": "把一个状态或动作的价值拆成即时奖励与下一步价值的递归关系；策略评估与最优性方程的动作处理不同。",
        "purpose": "看懂 TD、Q-learning 等算法更新目标从何而来。",
        "example": "评估固定策略时对其下一动作求期望；最优性方程则对下一动作取最大值。",
        "href": "rl/04-q-learning.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "td",
            "q-learning",
            "state-value"
        ]
    },
    {
        "id": "sarsa",
        "term": "SARSA",
        "en": "State–Action–Reward–State–Action",
        "zh": "SARSA",
        "aliases": [
            "State–Action–Reward–State–Action"
        ],
        "definition": "用实际选择的下一动作价值构造更新目标的经典在策略 TD 控制方法。",
        "purpose": "与 Q-learning 对照，分清下一动作是实际采样还是取最大值。",
        "example": "走悬崖时，SARSA 的目标会反映探索动作可能失足的后果。",
        "href": "rl/06-sarsa.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "q-learning",
            "on-policy",
            "td"
        ]
    },
    {
        "id": "reinforce",
        "term": "REINFORCE",
        "en": "REINFORCE",
        "zh": "REINFORCE 蒙特卡洛策略梯度",
        "aliases": [
            "REINFORCE 蒙特卡洛策略梯度"
        ],
        "definition": "以采样回报（可减动作无关基线）乘对数策略概率的梯度，估计策略梯度的算法家族。",
        "purpose": "在环境不可微时，用采样反馈训练随机策略。",
        "example": "回合结束后，以 Gt−b(st) 加权每一步 log π(at|st) 的梯度。",
        "href": "rl/05-reinforce.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "policy-gradient",
            "stochastic-policy",
            "return"
        ]
    },
    {
        "id": "on-policy",
        "term": "On-policy",
        "en": "On-policy",
        "zh": "在策略",
        "aliases": [
            "在策略",
            "同策略"
        ],
        "definition": "学习或评估的策略与产生相关经验的行为策略一致，或在算法允许的近似范围内一致。",
        "purpose": "它回答“谁产生数据”，并不回答“是否使用环境模型”。",
        "example": "SARSA 用当前探索策略实际选出的下一动作更新；PPO 也需要按批次刷新数据。",
        "href": "rl/06-sarsa.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "off-policy",
            "online-rl",
            "model-free"
        ]
    },
    {
        "id": "online-rl",
        "term": "在线强化学习",
        "en": "Online RL",
        "zh": "在线强化学习",
        "aliases": [
            "Online RL"
        ],
        "definition": "训练期间持续与环境交互、收集新经验并改进策略。在线描述数据获取方式，不等于在策略。",
        "purpose": "和离线学习区分，同时单独检查 on/off-policy 轴。",
        "example": "机器人边试边学，并把新旧经验混在回放池里训练。",
        "href": "rl/16-dqn.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "offline-rl",
            "on-policy",
            "off-policy"
        ]
    },
    {
        "id": "model-based",
        "term": "基于模型",
        "en": "Model-based RL",
        "zh": "基于模型的强化学习",
        "aliases": [
            "model-based",
            "模型式强化学习",
            "Model-based RL",
            "基于模型的强化学习"
        ],
        "definition": "在决策或策略改进中使用环境转移、奖励等预测模型；模型可由经验学习，也可由已知规则给出。",
        "purpose": "识别是否通过预测后果来规划或生成想象经验。",
        "example": "Dyna 用学到的转移模型产生额外训练经验；棋类搜索可使用已知规则。",
        "href": "rl/03-dyna.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "model-free",
            "world-model",
            "mcts"
        ],
        "sources": [
            {
                "title": "OpenAI Spinning Up: Kinds of RL Algorithms",
                "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro2.html"
            }
        ]
    },
    {
        "id": "model-free",
        "term": "无模型",
        "en": "Model-free RL",
        "zh": "无模型强化学习",
        "aliases": [
            "model-free",
            "Model-free RL",
            "无模型强化学习"
        ],
        "definition": "策略或价值学习不依靠显式环境预测模型来规划或产生模型经验；仍可使用神经网络表示策略和价值。",
        "purpose": "避免把“无模型”误读成“没有神经网络”或“只允许在线学习”。",
        "example": "DQN 学 Q 网络但不学状态转移预测器，所以通常归为无模型。",
        "href": "rl/16-dqn.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "model-based",
            "actor-critic",
            "offline-rl"
        ],
        "sources": [
            {
                "title": "OpenAI Spinning Up: Kinds of RL Algorithms",
                "url": "https://spinningup.openai.com/en/latest/spinningup/rl_intro2.html"
            }
        ]
    },
    {
        "id": "dreamer",
        "term": "Dreamer",
        "en": "Dreamer",
        "zh": "Dreamer 潜在想象学习",
        "aliases": [
            "Dreamer 潜在想象学习"
        ],
        "definition": "在学到的潜在动力学中展开想象轨迹，并训练行为策略及价值估计的一系列具体算法。",
        "purpose": "把一个世界模型算法家族与“世界模型”这一广义概念分开。",
        "example": "用真实经验更新潜在模型，再在潜在空间训练 Actor 与 Critic。",
        "href": "rl/40-dreamer.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "world-model",
            "model-based",
            "actor-critic"
        ],
        "sources": [
            {
                "title": "Dream to Control",
                "url": "https://arxiv.org/abs/1912.01603"
            }
        ]
    },
    {
        "id": "mcts",
        "term": "MCTS",
        "en": "Monte Carlo Tree Search",
        "zh": "蒙特卡洛树搜索",
        "aliases": [
            "Monte Carlo Tree Search",
            "蒙特卡洛树搜索"
        ],
        "definition": "反复选择、扩展、评估节点并回传结果的树搜索方法。叶子可用模拟 rollout 或价值网络评估。",
        "purpose": "理解搜索怎样在有限计算预算内聚焦有希望的分支。",
        "example": "AlphaGo 在棋类规则中搜索候选落子；MCTS 本身不等于策略梯度。",
        "href": "rl/21-alphago.html",
        "series": [
            "rl",
            "llm",
            "robot-classic"
        ],
        "related": [
            "rollout",
            "model-based",
            "action-value"
        ]
    },
    {
        "id": "trajectory",
        "term": "轨迹",
        "en": "Trajectory",
        "zh": "轨迹",
        "aliases": [
            "trajectory",
            "Trajectory"
        ],
        "definition": "按时间排列的一段状态、动作及反馈序列；机器人文献也可能仅指随时间变化的位置或构型曲线。",
        "purpose": "先核对记录中包含哪些量，以及是否含真实执行反馈。",
        "example": "RL 中 τ 可写成 s0,a0,r0,s1,…；运动规划中的轨迹还需要时间信息。",
        "href": "rl/05-reinforce.html",
        "series": [
            "rl",
            "llm",
            "robot-learn",
            "robot-classic"
        ],
        "related": [
            "rollout",
            "episode",
            "motion-planning"
        ]
    },
    {
        "id": "rollout",
        "term": "Rollout",
        "en": "Rollout",
        "zh": "轨迹展开",
        "aliases": [
            "rollout",
            "轨迹展开"
        ],
        "definition": "按策略或给定动作序列逐步推进环境或模型，得到一段轨迹；可以是短片段，不一定直到终止。",
        "purpose": "区别真实采集、模型想象与树搜索中的模拟。",
        "example": "从当前状态在模型中向前模拟 5 步，是一次模型 rollout，不一定是一整局。",
        "href": "rl/35-pets.html",
        "series": [
            "rl",
            "llm",
            "robot-learn",
            "robot-classic"
        ],
        "related": [
            "trajectory",
            "episode",
            "model-based"
        ]
    },
    {
        "id": "episode",
        "term": "Episode",
        "en": "Episode",
        "zh": "回合",
        "aliases": [
            "episode",
            "回合"
        ],
        "definition": "从初始条件开始，直到任务规定终止条件的一段交互；采集系统的时间截断不一定等于真实终止。",
        "purpose": "决定回报边界与是否保留下一状态自举值。",
        "example": "机器人到达目标算终止；训练器每 200 步切片可能只是截断。",
        "href": "rl/05-reinforce.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "rollout",
            "return",
            "bootstrap"
        ]
    },
    {
        "id": "importance-sampling",
        "term": "重要性采样",
        "en": "Importance sampling",
        "zh": "重要性采样",
        "aliases": [
            "importance sampling",
            "Importance sampling"
        ],
        "definition": "用目标分布与采样分布的概率比重加权样本，估计目标分布下的期望；要求必要的分布支持覆盖。",
        "purpose": "理解离策略修正，也注意大权重会放大方差。",
        "example": "目标策略给某动作概率 0.4，行为策略为 0.2，则单步比率为 2。",
        "href": "rl/32-impala.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "off-policy",
            "ppo",
            "stochastic-policy"
        ]
    },
    {
        "id": "experience-replay",
        "term": "经验回放",
        "en": "Experience replay",
        "zh": "经验回放",
        "aliases": [
            "replay buffer",
            "经验池",
            "Experience replay"
        ],
        "definition": "把交互样本存入缓冲区并重复抽取训练，改善样本重用和时间相关性。",
        "purpose": "区分当前采集策略与回放样本中的历史策略。",
        "example": "DQN 每走一步存转移，再从缓冲区随机抽一批旧转移。",
        "href": "rl/16-dqn.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "off-policy",
            "online-rl",
            "target-network"
        ]
    },
    {
        "id": "target-network",
        "term": "目标网络",
        "en": "Target network",
        "zh": "目标网络",
        "aliases": [
            "Target network"
        ],
        "definition": "使用更新较慢的参数副本来计算训练目标，缓解目标与预测同时快速变化的问题。",
        "purpose": "读 DQN、DDPG、TD3 时区分在线网络与目标网络的职责。",
        "example": "Q 网络每步更新，目标 Q 网络定期复制或缓慢插值更新。",
        "href": "rl/16-dqn.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "bootstrap",
            "experience-replay",
            "action-value"
        ]
    },
    {
        "id": "exploration",
        "term": "探索",
        "en": "Exploration",
        "zh": "探索",
        "aliases": [
            "exploration",
            "Exploration"
        ],
        "definition": "为获得信息或发现更高回报行为而尝试不确定的动作；随机性是手段之一，不是探索的完整定义。",
        "purpose": "区分获取新信息与利用已有最佳判断。",
        "example": "尚不知道右侧走廊是否更短，智能体愿意花一次试走的代价。",
        "href": "rl/24-icm.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "stochastic-policy",
            "entropy",
            "online-rl"
        ]
    },
    {
        "id": "entropy",
        "term": "熵",
        "en": "Entropy",
        "zh": "熵",
        "aliases": [
            "策略熵",
            "Entropy"
        ],
        "definition": "衡量概率分布不确定性的量；在策略优化中常被用作鼓励动作分布保持多样性的正则项。",
        "purpose": "区分高熵、有效探索与任务表现，它们不必同步变好。",
        "example": "两个动作各 0.5 的分布，比 0.99/0.01 更不确定。",
        "href": "rl/30-sac.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "stochastic-policy",
            "exploration"
        ]
    },
    {
        "id": "token",
        "term": "Token",
        "en": "Token",
        "zh": "词元",
        "aliases": [
            "token",
            "词元"
        ],
        "definition": "分词器处理的基本离散单位，可能是字、子词、字节片段或专用符号；不固定等于一个字或一个单词。",
        "purpose": "理解词表、序列长度、损失与推理成本的计量单位。",
        "example": "一个英文单词可能被切成多个 token；中文字符也不保证一字一 token。",
        "href": "llm/011-bpe.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "embedding",
            "context-window"
        ]
    },
    {
        "id": "embedding",
        "term": "Embedding",
        "en": "Embedding",
        "zh": "嵌入表示",
        "aliases": [
            "embedding",
            "词嵌入",
            "嵌入",
            "嵌入表示"
        ],
        "definition": "把离散对象或输入特征映射到向量表示；词嵌入通常可学习，不能把每个坐标直接当成人可读属性。",
        "purpose": "理解模型怎样把 token 或感知信息送入连续计算。",
        "example": "词表中的 token ID 先查表得到向量，再进入 Transformer。",
        "href": "llm/004-word2vec.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "token",
            "transformer"
        ]
    },
    {
        "id": "self-attention",
        "term": "自注意力",
        "en": "Self-attention",
        "zh": "自注意力",
        "aliases": [
            "self-attention",
            "self attention",
            "Self-attention"
        ],
        "definition": "查询、键和值来自同一序列表示的注意力；允许不同位置按内容交换信息。",
        "purpose": "和从另一个序列读取信息的交叉注意力区分。",
        "example": "处理一句话时，“它”的表示可读取同句较早出现的名词。",
        "href": "llm/015-transformer.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "attention",
            "transformer"
        ]
    },
    {
        "id": "causal-language-model",
        "term": "自回归语言模型",
        "en": "Causal language model",
        "zh": "自回归语言模型",
        "aliases": [
            "causal language model",
            "autoregressive language model",
            "Causal language model"
        ],
        "definition": "按序列前缀预测下一个 token，以条件概率乘积表示整段文本概率。",
        "purpose": "理解因果掩码、训练目标与逐步生成之间的关系。",
        "example": "已知“今天的天气”，模型预测后面可能出现的 token。",
        "href": "llm/017-gpt.html",
        "series": [
            "llm"
        ],
        "related": [
            "token",
            "cross-entropy",
            "masked-language-model"
        ]
    },
    {
        "id": "masked-language-model",
        "term": "掩码语言模型",
        "en": "Masked language model",
        "zh": "掩码语言模型",
        "aliases": [
            "MLM",
            "Masked language model"
        ],
        "definition": "根据被遮蔽位置周围的可见上下文恢复 token 的训练目标；典型 BERT 可同时利用左右信息。",
        "purpose": "区分双向表示学习与左到右的生成目标。",
        "example": "把“今天去学校”中的“学校”遮住，利用其余上下文恢复。",
        "href": "llm/018-bert.html",
        "series": [
            "llm"
        ],
        "related": [
            "causal-language-model",
            "pretrain"
        ]
    },
    {
        "id": "cross-entropy",
        "term": "交叉熵",
        "en": "Cross-entropy",
        "zh": "交叉熵",
        "aliases": [
            "cross entropy",
            "cross-entropy",
            "Cross-entropy"
        ],
        "definition": "用目标分布评价预测概率分布的损失；单一正确类别时等于该类别预测概率的负对数。",
        "purpose": "读语言模型损失时，理解为何低概率正确答案会受更大惩罚。",
        "example": "正确 token 的预测概率从 0.1 提高到 0.5，负对数损失会下降。",
        "href": "llm/002-nnlm.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "token",
            "causal-language-model"
        ]
    },
    {
        "id": "finetune",
        "term": "微调",
        "en": "Fine-tuning",
        "zh": "微调",
        "aliases": [
            "fine-tuning",
            "finetuning",
            "Fine-tuning"
        ],
        "definition": "在已训练模型基础上继续调整全部或部分参数，使其适应新的任务、数据或行为目标。",
        "purpose": "区分参数更新与只改变输入提示。",
        "example": "LoRA 只训练低秩增量，也属于参数高效微调。",
        "href": "llm/020-adapters.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "pretrain",
            "lora",
            "in-context-learning"
        ]
    },
    {
        "id": "sft",
        "term": "SFT",
        "en": "Supervised fine-tuning",
        "zh": "监督微调",
        "aliases": [
            "监督微调",
            "Supervised fine-tuning"
        ],
        "definition": "用输入及期望输出的配对数据，以监督损失继续训练已有模型。",
        "purpose": "区分学习示范答案与从偏好或奖励优化行为。",
        "example": "给定指令与高质量回答，最小化回答 token 的预测损失。",
        "href": "llm/054-instructgpt.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "finetune",
            "rlhf",
            "dpo"
        ]
    },
    {
        "id": "in-context-learning",
        "term": "上下文学习",
        "en": "In-context learning",
        "zh": "上下文学习",
        "aliases": [
            "ICL",
            "in-context learning",
            "In-context learning"
        ],
        "definition": "通过当前输入中的说明和示例表现出任务适配，通常不为这次任务更新模型参数。",
        "purpose": "区分多给几个例子与实际微调模型权重。",
        "example": "在提示中放两组中英翻译示例，再让模型完成第三组。",
        "href": "llm/035-gpt3.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "finetune",
            "context-window"
        ]
    },
    {
        "id": "context-window",
        "term": "上下文窗口",
        "en": "Context window",
        "zh": "上下文窗口",
        "aliases": [
            "context window",
            "上下文长度",
            "Context window"
        ],
        "definition": "一次推理中模型能够接收或处理的 token 范围；最大长度不保证每个位置的信息都被有效利用。",
        "purpose": "规划提示、文档分块和检索预算。",
        "example": "文档放得下 100 页，也可能遗漏中间位置的一句关键约束。",
        "href": "llm/077-lost-middle.html",
        "series": [
            "llm"
        ],
        "related": [
            "token",
            "rag",
            "in-context-learning"
        ]
    },
    {
        "id": "test-time-scaling",
        "term": "测试时扩展",
        "en": "Test-time scaling",
        "zh": "测试时计算扩展",
        "aliases": [
            "test-time scaling",
            "Test-time scaling",
            "测试时计算扩展"
        ],
        "definition": "研究在给定模型与任务上，如何随推理预算增加而改善结果，以及收益何时饱和。",
        "purpose": "比较策略时同时报告正确率、生成量和总计算成本。",
        "example": "更多候选只有配合有效选择器才可能改善最终答案，预算加倍不保证收益加倍。",
        "href": "llm/091-test-time-scaling.html",
        "series": [
            "rl",
            "llm"
        ],
        "related": [
            "test-time",
            "cot"
        ]
    },
    {
        "id": "rope",
        "term": "RoPE",
        "en": "Rotary Position Embedding",
        "zh": "旋转位置编码",
        "aliases": [
            "旋转位置编码",
            "Rotary Position Embedding"
        ],
        "definition": "通过位置相关旋转变换查询和键，让点积注意力包含相对位置信息。",
        "purpose": "理解位置处理与长上下文外推的联系。",
        "example": "相隔相同步数的位置会产生相应相对旋转；训练长度外的表现仍需验证。",
        "href": "llm/046-rope.html",
        "series": [
            "llm"
        ],
        "related": [
            "attention",
            "context-window"
        ]
    },
    {
        "id": "kv-cache",
        "term": "KV cache",
        "en": "Key–value cache",
        "zh": "键值缓存",
        "aliases": [
            "KV Cache",
            "KV缓存",
            "键值缓存",
            "Key–value cache"
        ],
        "definition": "在自回归生成中缓存此前 token 的键和值，避免每生成一个新 token 都重新计算这些表示。",
        "purpose": "理解长上下文和并发请求的显存开销。",
        "example": "生成第 101 个 token 时，复用前 100 个位置已有的 K、V。",
        "href": "llm/079-vllm.html",
        "series": [
            "llm"
        ],
        "related": [
            "attention",
            "causal-language-model"
        ]
    },
    {
        "id": "quantization",
        "term": "量化",
        "en": "Quantization",
        "zh": "量化",
        "aliases": [
            "quantization",
            "Quantization"
        ],
        "definition": "用较低精度或较少离散数值表示权重、激活等量，以减少存储或计算开销。",
        "purpose": "核对量化对象、位数、标定方法与实际质量损失。",
        "example": "把部分权重由 16 位表示换成 4 位，并检查目标硬件是否真正加速。",
        "href": "llm/061-gptq.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "lora",
            "distillation"
        ]
    },
    {
        "id": "distillation",
        "term": "知识蒸馏",
        "en": "Knowledge distillation",
        "zh": "知识蒸馏",
        "aliases": [
            "distillation",
            "Knowledge distillation"
        ],
        "definition": "利用教师模型的输出或中间表示来训练学生模型；学生不一定更小，关键是训练信号来自教师。",
        "purpose": "区分模型压缩、能力迁移与直接复制教师参数。",
        "example": "学生学习教师的类别概率，而非只学习一个硬标签。",
        "href": "llm/010-distillation.html",
        "series": [
            "llm",
            "robot-learn"
        ],
        "related": [
            "finetune",
            "quantization"
        ]
    },
    {
        "id": "cot",
        "term": "CoT",
        "en": "Chain of Thought",
        "zh": "思维链",
        "aliases": [
            "chain-of-thought",
            "思维链",
            "Chain of Thought"
        ],
        "definition": "通过中间推理步骤组织求解的一类提示或输出方式；可读的推理文本不保证忠实反映内部计算。",
        "purpose": "评价最终答案与推理过程时，分别检查正确性和可验证性。",
        "example": "算两次购物总价时先列每次小计，再求总和。",
        "href": "llm/053-cot.html",
        "series": [
            "llm"
        ],
        "related": [
            "test-time",
            "in-context-learning"
        ]
    },
    {
        "id": "hallucination",
        "term": "幻觉",
        "en": "Hallucination",
        "zh": "幻觉",
        "aliases": [
            "Hallucination"
        ],
        "definition": "生成了不受输入证据支持或与事实不符的内容；是否属于幻觉取决于任务对事实和依据的要求。",
        "purpose": "把语言流畅度与事实可靠性分开评估。",
        "example": "模型生成了格式正确但实际不存在的论文引用。",
        "href": "llm/049-truthfulqa.html",
        "series": [
            "llm"
        ],
        "related": [
            "rag"
        ]
    },
    {
        "id": "observation",
        "term": "观测",
        "en": "Observation",
        "zh": "观测",
        "aliases": [
            "Observation"
        ],
        "definition": "智能体通过传感器或接口实际得到的信息；可能不完整或带噪声，不一定等于环境的完整状态。",
        "purpose": "识别部分可观测性与需要历史信息的原因。",
        "example": "单帧相机看得到球的位置，却不直接给出其速度。",
        "href": "robot-learn/010-visuomotor.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "mdp",
            "proprioception",
            "state-estimation"
        ]
    },
    {
        "id": "action",
        "term": "动作",
        "en": "Action",
        "zh": "动作",
        "aliases": [
            "Action"
        ],
        "definition": "策略交给环境或控制接口的决策变量；机器人中可能是力矩、速度、目标位姿或一段动作。",
        "purpose": "读实验时先确认动作的单位、坐标系、频率与底层控制含义。",
        "example": "输出末端目标位置并不等于直接输出每个电机的力矩。",
        "href": "robot-learn/010-visuomotor.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "policy",
            "feedback-control",
            "action-chunk"
        ]
    },
    {
        "id": "demonstration",
        "term": "示范",
        "en": "Demonstration",
        "zh": "示范",
        "aliases": [
            "Demonstration"
        ],
        "definition": "展示任务如何完成的行为数据，可包含观测、动作、轨迹或结果；未必提供每一步最优动作。",
        "purpose": "核对示范来源、数据质量和部署时能否获得同样输入。",
        "example": "遥操作录下相机画面、关节状态和操作命令，组成配对训练数据。",
        "href": "robot-learn/043-robomimic.html",
        "series": [
            "robot-learn"
        ],
        "related": [
            "imitation",
            "behavior-cloning",
            "teleoperation"
        ]
    },
    {
        "id": "behavior-cloning",
        "term": "行为克隆",
        "en": "Behavior cloning",
        "zh": "行为克隆",
        "aliases": [
            "BC",
            "behavior cloning",
            "behaviour cloning",
            "Behavioral cloning",
            "Behavior cloning"
        ],
        "definition": "用示范中的观测与动作配对做监督学习，直接拟合专家动作选择。",
        "purpose": "理解无需显式奖励学习的优点，以及闭环分布偏移的局限。",
        "example": "用专家相机画面预测夹爪动作；自己偏离示范后可能遇到未见状态。",
        "href": "robot-learn/006-dagger.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "imitation",
            "covariate-shift",
            "dagger"
        ]
    },
    {
        "id": "covariate-shift",
        "term": "协变量偏移",
        "en": "Covariate shift",
        "zh": "协变量偏移",
        "aliases": [
            "covariate shift",
            "Covariate shift"
        ],
        "definition": "训练与部署时输入分布改变；在行为克隆中，策略误差会改变之后访问的状态，使问题连续累积。",
        "purpose": "区别单步预测误差与闭环执行退化。",
        "example": "示范都居中行驶，模型偏到路边后看到的图像超出示范覆盖。",
        "href": "robot-learn/006-dagger.html",
        "series": [
            "rl",
            "llm",
            "robot-learn"
        ],
        "related": [
            "behavior-cloning",
            "dagger"
        ]
    },
    {
        "id": "inverse-rl",
        "term": "逆强化学习",
        "en": "Inverse reinforcement learning",
        "zh": "逆强化学习",
        "aliases": [
            "IRL",
            "Inverse reinforcement learning"
        ],
        "definition": "根据示范行为推断能够解释这些行为的奖励或代价；奖励一般不唯一，需要假设或正则化。",
        "purpose": "区分推断任务目标与直接复制动作。",
        "example": "从绕开障碍的示范推断路径代价，再用该代价规划。",
        "href": "robot-learn/003-maxent-irl.html",
        "series": [
            "rl",
            "robot-learn"
        ],
        "related": [
            "imitation",
            "reward",
            "behavior-cloning"
        ]
    },
    {
        "id": "domain-randomization",
        "term": "域随机化",
        "en": "Domain randomization",
        "zh": "域随机化",
        "aliases": [
            "domain randomization",
            "Domain randomization"
        ],
        "definition": "训练时随机改变视觉、动力学等环境参数，让模型接触一组变化的域，提高对未知条件的适应能力。",
        "purpose": "是缩小 sim-to-real 风险的一种方法，不能保证覆盖所有真实差异。",
        "example": "随机化光照、纹理、摩擦或质量；真实条件超出训练范围时仍可能失败。",
        "href": "robot-learn/018-domain-randomization.html",
        "series": [
            "robot-learn"
        ],
        "related": [
            "sim2real",
            "dynamics"
        ],
        "sources": [
            {
                "title": "Domain Randomization",
                "url": "https://arxiv.org/abs/1703.06907"
            }
        ]
    },
    {
        "id": "diffusion-policy",
        "term": "Diffusion Policy",
        "en": "Diffusion Policy",
        "zh": "扩散策略",
        "aliases": [
            "扩散策略"
        ],
        "definition": "通过条件去噪过程生成动作分布或动作段的策略表示；原始 Diffusion Policy 主要用示范训练。",
        "purpose": "表达多模态连续动作，并区分去噪迭代与机器人执行时间。",
        "example": "从动作噪声生成一段抓取动作，执行前几步后用新观测重新生成。",
        "href": "robot-learn/061-diffusion-policy.html",
        "series": [
            "robot-learn"
        ],
        "related": [
            "behavior-cloning",
            "action-chunk"
        ],
        "sources": [
            {
                "title": "Diffusion Policy (RSS 2023)",
                "url": "https://roboticsproceedings.org/rss19/p026.pdf"
            }
        ]
    },
    {
        "id": "action-chunk",
        "term": "动作分块",
        "en": "Action chunking",
        "zh": "动作分块",
        "aliases": [
            "action chunk",
            "action chunking",
            "动作段",
            "Action chunking"
        ],
        "definition": "一次预测一段连续动作，而不是只预测下一步；实际执行的长度可以短于预测长度。",
        "purpose": "理解动作连贯性、推理延迟与闭环反馈速度之间的取舍。",
        "example": "模型预测未来 16 步，只执行前 4 步，再重新观测和预测。",
        "href": "robot-learn/062-act.html",
        "series": [
            "robot-learn"
        ],
        "related": [
            "diffusion-policy",
            "action",
            "feedback-control"
        ]
    },
    {
        "id": "embodiment",
        "term": "本体形态",
        "en": "Embodiment",
        "zh": "具身形态",
        "aliases": [
            "embodiment",
            "具身形态",
            "Embodiment"
        ],
        "definition": "机器人身体、传感器和动作接口等物理条件的组合；影响哪些信息可见、哪些动作可执行。",
        "purpose": "比较跨机器人数据时，核对不同关节、末端和控制接口。",
        "example": "单臂夹爪与双臂灵巧手可共享任务语言，却不能直接共享全部动作维度。",
        "href": "robot-learn/068-openx.html",
        "series": [
            "robot-learn"
        ],
        "related": [
            "vla",
            "action"
        ]
    },
    {
        "id": "proprioception",
        "term": "本体感知",
        "en": "Proprioception",
        "zh": "本体感知",
        "aliases": [
            "proprioception",
            "本体状态",
            "Proprioception"
        ],
        "definition": "关于机器人自身关节、速度、姿态或力等内部状态的感知信息。",
        "purpose": "区分自身状态观测与相机看到的外部环境。",
        "example": "编码器读取关节角，IMU 提供惯性测量；两者仍可能带噪声。",
        "href": "robot-learn/042-rma.html",
        "series": [
            "robot-learn",
            "robot-classic"
        ],
        "related": [
            "observation",
            "state-estimation"
        ]
    },
    {
        "id": "teleoperation",
        "term": "遥操作",
        "en": "Teleoperation",
        "zh": "遥操作",
        "aliases": [
            "Teleoperation"
        ],
        "definition": "人通过远程控制接口操纵机器人，可用于执行任务或收集示范。",
        "purpose": "读数据集时，判断人的控制方式与记录动作之间的关系。",
        "example": "操作者移动主机械臂，机器人从臂跟随，系统记录同步示范。",
        "href": "robot-learn/073-mobile-aloha.html",
        "series": [
            "robot-learn",
            "robot-classic"
        ],
        "related": [
            "demonstration",
            "action"
        ]
    },
    {
        "id": "coordinate-frame",
        "term": "坐标系",
        "en": "Coordinate frame",
        "zh": "坐标系",
        "aliases": [
            "Coordinate frame"
        ],
        "definition": "规定位置与方向数值所参照的原点和坐标轴；同一物理对象在不同坐标系中有不同数值。",
        "purpose": "任何位姿、速度或力都先确认表达在哪个坐标系。",
        "example": "杯子在相机坐标系向前 0.5 米，转换到机械臂基座坐标后数值会改变。",
        "href": "robot-classic/001-dh.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "pose",
            "rigid-transform"
        ]
    },
    {
        "id": "pose",
        "term": "位姿",
        "en": "Pose",
        "zh": "位姿",
        "aliases": [
            "Pose"
        ],
        "definition": "物体相对于指定坐标系的位置与朝向；只有位置不足以完整描述三维抓取目标。",
        "purpose": "区分平移、旋转及其组合，避免混用坐标约定。",
        "example": "夹爪到达杯子位置后，还需要正确朝向才能抓住杯柄。",
        "href": "robot-classic/001-dh.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "coordinate-frame",
            "rigid-transform",
            "ik"
        ]
    },
    {
        "id": "rigid-transform",
        "term": "刚体变换",
        "en": "Rigid transform",
        "zh": "刚体变换",
        "aliases": [
            "刚性变换",
            "rigid transformation",
            "Rigid transform"
        ],
        "definition": "由旋转和平移组成、保持点间距离的坐标变换；常用齐次矩阵表示。",
        "purpose": "把感知、机器人和世界中的点放到一致参考系。",
        "example": "相机点先乘旋转矩阵，再加平移，得到基座坐标中的点。",
        "href": "robot-classic/021-horn.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "coordinate-frame",
            "pose"
        ]
    },
    {
        "id": "forward-kinematics",
        "term": "正运动学",
        "en": "Forward kinematics",
        "zh": "正运动学",
        "aliases": [
            "正向运动学",
            "Forward kinematics"
        ],
        "definition": "根据关节构型与几何模型求连杆或末端位姿，不直接求产生运动需要的力。",
        "purpose": "建立关节空间与任务空间之间的几何关系。",
        "example": "已知肩、肘角度和连杆长度，计算夹爪的位置与朝向。",
        "href": "robot-classic/001-dh.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "ik",
            "jacobian",
            "dynamics"
        ]
    },
    {
        "id": "jacobian",
        "term": "雅可比矩阵",
        "en": "Jacobian",
        "zh": "雅可比矩阵",
        "aliases": [
            "Jacobian",
            "雅可比"
        ],
        "definition": "在当前构型附近，把关节速度映射到末端速度的局部线性关系；具体形式取决于坐标和速度表示。",
        "purpose": "理解微分逆运动学、奇异性及力到关节力矩的映射。",
        "example": "ẋ=J(q)q̇；接近奇异构型时，小末端速度也可能要求很大关节速度。",
        "href": "robot-classic/004-resolved-rate.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "ik",
            "forward-kinematics",
            "dynamics"
        ],
        "sources": [
            {
                "title": "Modern Robotics: Velocity Kinematics",
                "url": "https://modernrobotics.northwestern.edu/nu-gm-book-resource/velocity-kinematics-and-statics/"
            }
        ]
    },
    {
        "id": "dynamics",
        "term": "动力学",
        "en": "Dynamics",
        "zh": "动力学",
        "aliases": [
            "Dynamics"
        ],
        "definition": "描述力、力矩、质量惯性与运动变化的关系；不同于只描述位置与姿态关系的运动学。",
        "purpose": "判断计划是否满足真实执行器、接触和惯性约束。",
        "example": "同样一条关节轨迹，搬重物时所需力矩可能更大。",
        "href": "robot-classic/005-newton-euler.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "forward-kinematics",
            "feedback-control",
            "mpc"
        ]
    },
    {
        "id": "configuration-space",
        "term": "构型空间",
        "en": "Configuration space",
        "zh": "构型空间",
        "aliases": [
            "C-space",
            "配置空间",
            "Configuration space"
        ],
        "definition": "以能完整描述机器人几何配置的变量为坐标的空间；机器人与障碍碰撞的配置构成障碍区域。",
        "purpose": "把多连杆避障转换成构型点的搜索问题。",
        "example": "两关节机械臂的一个配置是 (q1,q2)，不是夹爪的二维位置。",
        "href": "robot-classic/009-configuration-space.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "motion-planning",
            "ik",
            "rrt"
        ]
    },
    {
        "id": "motion-planning",
        "term": "运动规划",
        "en": "Motion planning",
        "zh": "运动规划",
        "aliases": [
            "Motion planning"
        ],
        "definition": "在约束下寻找从起点到目标的可行路径或轨迹；有无时间、速度与动力学约束取决于问题设定。",
        "purpose": "区分几何避障、时间参数化与底层反馈控制。",
        "example": "找到绕过桌角的无碰路径后，还要决定执行速度并跟踪。",
        "href": "robot-classic/040-rrt.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "configuration-space",
            "rrt",
            "astar",
            "feedback-control"
        ]
    },
    {
        "id": "state-estimation",
        "term": "状态估计",
        "en": "State estimation",
        "zh": "状态估计",
        "aliases": [
            "State estimation"
        ],
        "definition": "根据带噪观测、动作与模型推断系统不可直接完整测得的状态。",
        "purpose": "先看状态有哪些量，再看传感器能提供哪些约束。",
        "example": "融合轮速计和相机来估计机器人位置与速度。",
        "href": "robot-classic/002-kalman.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "kalman",
            "observability",
            "observation"
        ]
    },
    {
        "id": "particle-filter",
        "term": "粒子滤波",
        "en": "Particle filter",
        "zh": "粒子滤波",
        "aliases": [
            "particle filter",
            "Particle filter"
        ],
        "definition": "用带权样本近似状态分布，并通过预测、观测加权与重采样递推估计。",
        "purpose": "在非线性或多峰定位问题中保留多种可能状态。",
        "example": "相似走廊导致两个可能位置时，用两群粒子保留两种假设。",
        "href": "robot-classic/031-bootstrap-filter.html",
        "series": [
            "robot-classic"
        ],
        "related": [
            "state-estimation",
            "kalman"
        ]
    },
    {
        "id": "factor-graph",
        "term": "因子图",
        "en": "Factor graph",
        "zh": "因子图",
        "aliases": [
            "factor graph",
            "Factor graph"
        ],
        "definition": "用变量节点和约束因子描述联合概率或优化问题的稀疏依赖结构。",
        "purpose": "把定位建图中的状态、测量与代价项对应起来。",
        "example": "各时刻位姿是变量，里程计和回环测量产生连接它们的因子。",
        "href": "robot-classic/068-isam2.html",
        "series": [
            "robot-classic"
        ],
        "related": [
            "slam",
            "loop-closure",
            "state-estimation"
        ]
    },
    {
        "id": "loop-closure",
        "term": "回环闭合",
        "en": "Loop closure",
        "zh": "回环闭合",
        "aliases": [
            "loop closure",
            "Loop closure"
        ],
        "definition": "识别当前地点与过去访问地点的关联，并加入相应约束以减少累积漂移。",
        "purpose": "将地点识别与几何验证分开；错误回环会破坏地图。",
        "example": "回到同一房间后，先核对视觉和几何一致性，再约束两次位姿。",
        "href": "robot-classic/082-orbslam.html",
        "series": [
            "robot-classic"
        ],
        "related": [
            "slam",
            "factor-graph"
        ]
    },
    {
        "id": "observability",
        "term": "可观测性",
        "en": "Observability",
        "zh": "可观测性",
        "aliases": [
            "observability",
            "Observability"
        ],
        "definition": "由给定输入、模型和观测能否区分内部状态的性质；不是换一个滤波器就能凭空增加的信息。",
        "purpose": "判断状态估计问题是否从根本上缺少约束。",
        "example": "若测量和运动从不提供某一方向的信息，调小噪声协方差也无法确定它。",
        "href": "robot-classic/002-kalman.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "state-estimation",
            "kalman"
        ]
    },
    {
        "id": "feedback-control",
        "term": "反馈控制",
        "en": "Feedback control",
        "zh": "反馈控制",
        "aliases": [
            "Feedback control"
        ],
        "definition": "根据实际测量与目标的偏差不断调整控制输入，使系统跟踪目标或维持所需行为。",
        "purpose": "区分开环播放动作、重新规划与底层闭环跟踪。",
        "example": "手臂受扰偏离目标后，控制器利用新误差调整电机命令。",
        "href": "robot-classic/013-impedance.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "dynamics",
            "mpc",
            "impedance-control"
        ]
    },
    {
        "id": "impedance-control",
        "term": "阻抗控制",
        "en": "Impedance control",
        "zh": "阻抗控制",
        "aliases": [
            "Impedance control"
        ],
        "definition": "通过控制塑造运动偏差与交互力之间的动态关系，常用质量、阻尼、刚度类比描述。",
        "purpose": "理解机器人接触环境时为何需要适当柔顺性。",
        "example": "插孔时允许横向小幅让步并保留阻尼；并非刚度越低就一定越安全。",
        "href": "robot-classic/013-impedance.html",
        "series": [
            "robot-classic",
            "robot-learn"
        ],
        "related": [
            "feedback-control",
            "dynamics"
        ]
    },
    {
        "id": "mpc",
        "term": "MPC",
        "en": "Model Predictive Control",
        "zh": "模型预测控制",
        "aliases": [
            "模型预测控制",
            "Model Predictive Control"
        ],
        "definition": "根据模型在有限预测时域内优化控制序列，只执行前一部分，再根据新状态滚动求解。",
        "purpose": "区分显式在线规划与已训练策略的一次前向输出。",
        "example": "四足机器人预测未来支撑力，执行当前控制后重新估计并规划。",
        "href": "robot-classic/094-cheetah-mpc.html",
        "series": [
            "rl",
            "robot-learn",
            "robot-classic"
        ],
        "related": [
            "model-based",
            "feedback-control",
            "rollout"
        ]
    }
];
