window.GLOSSARY = [
    {
        id: 'mdp',
        term: 'MDP',
        aliases: ['马尔可夫决策过程', 'Markov Decision Process'],
        definition: '用状态、动作、转移、奖励描述序列决策。下一步只依赖当前状态和动作，不需要完整历史。',
        href: 'rl/00-timeline.html'
    },
    {
        id: 'td',
        term: 'TD',
        aliases: ['时序差分', 'Temporal Difference'],
        definition: '用“当前预测”和“下一步预测 + 即时奖励”的差来学习，不必等到整局结束。',
        href: 'rl/02-td-lambda.html'
    },
    {
        id: 'q-learning',
        term: 'Q-learning',
        aliases: [],
        definition: '学习状态—动作价值 Q。更新时用贪心目标，即使实际行为仍在探索。',
        href: 'rl/04-q-learning.html'
    },
    {
        id: 'policy-gradient',
        term: '策略梯度',
        aliases: ['REINFORCE', 'policy gradient'],
        definition: '直接对策略参数求奖励的梯度。环境不必可微，用采样回报估计更新方向。',
        href: 'rl/05-reinforce.html'
    },
    {
        id: 'actor-critic',
        term: 'Actor–Critic',
        aliases: ['行动者-评价者'],
        definition: 'Actor 选动作，Critic 评价状态或优势，用评价信号降低策略梯度方差。',
        href: 'rl/01-actor-critic.html'
    },
    {
        id: 'ppo',
        term: 'PPO',
        aliases: ['Proximal Policy Optimization'],
        definition: '用裁剪后的替代目标限制一次更新对策略的改动，稳定策略梯度训练。',
        href: 'rl/27-ppo.html'
    },
    {
        id: 'dpo',
        term: 'DPO',
        aliases: ['Direct Preference Optimization'],
        definition: '从偏好对直接优化策略，训练时不必另建奖励模型再跑在线 RL。',
        href: 'llm/075-dpo.html'
    },
    {
        id: 'grpo',
        term: 'GRPO',
        aliases: [],
        definition: '对同一题采样一组回答，用组内相对奖励构造优势，减少独立价值网络。',
        href: 'rl/52-grpo.html'
    },
    {
        id: 'off-policy',
        term: 'Off-policy',
        aliases: ['离策略'],
        definition: '学习目标策略，但经验可以来自另一个行为策略。不等于完全不能采集新数据。',
        href: 'rl/04-q-learning.html'
    },
    {
        id: 'offline-rl',
        term: '离线强化学习',
        aliases: ['Offline RL'],
        definition: '主要或只使用固定数据集学习，不能靠实时交互立刻修正错误估计。',
        href: 'rl/42-cql.html'
    },
    {
        id: 'world-model',
        term: '世界模型',
        aliases: ['Dreamer'],
        definition: '学习预测未来观测、奖励或潜在状态，再在想象轨迹里改进行为。',
        href: 'rl/40-dreamer.html'
    },
    {
        id: 'attention',
        term: '注意力',
        aliases: ['self-attention', '自注意力'],
        definition: '用查询与键的相似度对值加权。位置之间可以直接交换信息，而不必逐步递归。',
        href: 'llm/007-attention.html'
    },
    {
        id: 'transformer',
        term: 'Transformer',
        aliases: [],
        definition: '以注意力、前馈、残差和归一化组成的序列模型。训练时可并行处理已知序列位置。',
        href: 'llm/015-transformer.html'
    },
    {
        id: 'pretrain',
        term: '预训练',
        aliases: ['pre-training'],
        definition: '先在大规模数据上学习通用表示或生成能力，再适配下游任务。',
        href: 'llm/018-bert.html'
    },
    {
        id: 'lora',
        term: 'LoRA',
        aliases: ['低秩适配'],
        definition: '冻结原参数，只训练低秩增量，用来便宜地适配大模型。',
        href: 'llm/047-lora.html'
    },
    {
        id: 'rag',
        term: 'RAG',
        aliases: ['检索增强生成'],
        definition: '生成前先检索外部文档，把查到的证据写入上下文，而不是只靠参数记忆。',
        href: 'llm/034-rag.html'
    },
    {
        id: 'rlhf',
        term: 'RLHF',
        aliases: ['人类反馈强化学习'],
        definition: '用人类（或 AI）偏好训练奖励模型，再优化语言模型使其更符合意图。',
        href: 'llm/054-instructgpt.html'
    },
    {
        id: 'moe',
        term: 'MoE',
        aliases: ['混合专家', 'Mixture of Experts'],
        definition: '每次只激活部分专家网络。参数量可以很大，但单次前向不必用上全部参数。',
        href: 'llm/014-sparse-moe.html'
    },
    {
        id: 'test-time',
        term: '测试时计算',
        aliases: ['test-time scaling', '推理预算'],
        definition: '在已经训练好的模型上，用更多采样、搜索或验证来换取更好答案。',
        href: 'llm/091-test-time-scaling.html'
    },
    {
        id: 'dmp',
        term: 'DMP',
        aliases: ['动态运动基元', 'Dynamic Movement Primitives'],
        definition: '把示范写成稳定动力系统。改目标或受扰后，仍能按相似形状到达新终点。',
        href: 'robot-learn/001-dmp.html'
    },
    {
        id: 'dagger',
        term: 'DAgger',
        aliases: [],
        definition: '在学习者自己访问的状态上查询专家，减轻行为克隆的分布偏移。',
        href: 'robot-learn/006-dagger.html'
    },
    {
        id: 'vla',
        term: 'VLA',
        aliases: ['视觉语言动作', 'Vision-Language-Action'],
        definition: '用视觉和语言条件生成机器人动作，把感知、指令与控制放进同一套模型。',
        href: 'robot-learn/082-openvla.html'
    },
    {
        id: 'imitation',
        term: '模仿学习',
        aliases: ['behavior cloning', '行为克隆'],
        definition: '从示范中学习动作。可以直接回归动作，也可以先恢复奖励再优化策略。',
        href: 'robot-learn/002-apprenticeship.html'
    },
    {
        id: 'sim2real',
        term: '仿真到真机',
        aliases: ['domain randomization', '域随机化'],
        definition: '在仿真里训练，再部署到真机。常用随机化动力学或视觉，缩小两边差异。',
        href: 'robot-learn/018-domain-randomization.html'
    },
    {
        id: 'astar',
        term: 'A*',
        aliases: ['A-star'],
        definition: '用已走路程加启发式估计，在图上搜索最短路径。启发式可接受时保证最优。',
        href: 'robot-classic/003-astar.html'
    },
    {
        id: 'rrt',
        term: 'RRT',
        aliases: ['Rapidly-exploring Random Tree'],
        definition: '在连续空间随机采样并扩展树，适合高维、带障碍的路径规划。',
        href: 'robot-classic/040-rrt.html'
    },
    {
        id: 'kalman',
        term: 'Kalman 滤波',
        aliases: ['卡尔曼滤波'],
        definition: '在线性高斯假设下，融合预测与观测，递归估计状态均值和协方差。',
        href: 'robot-classic/002-kalman.html'
    },
    {
        id: 'slam',
        term: 'SLAM',
        aliases: ['同时定位与地图构建'],
        definition: '一边估计自身位姿，一边建立环境地图。位姿误差和地图误差会互相影响。',
        href: 'robot-classic/082-orbslam.html'
    },
    {
        id: 'ik',
        term: '逆运动学',
        aliases: ['IK', 'inverse kinematics'],
        definition: '由末端位姿反求关节角。可能有多解、奇异或不可达。',
        href: 'robot-classic/004-resolved-rate.html'
    },
    {
        id: 'occupancy',
        term: '占据栅格',
        aliases: ['occupancy grid'],
        definition: '把空间分成格子，用概率表示每格是否被占据，便于避障和规划。',
        href: 'robot-classic/025-occupancy.html'
    }
];
