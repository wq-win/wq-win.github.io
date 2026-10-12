/* Contextual notation for the four reading series.
 * Consumer contract: READING_SYMBOLS[folder] is an array of entries.
 * symbol/meaning/type/scope/note are plain text. match contains case-sensitive
 * literal contextual keywords or compound TeX fragments, NEVER regexes or a
 * bare single letter. Read math annotation text as well as visible prose.
 * articles, when present, is an allow-list of basenames without .html. It only
 * narrows eligibility; a matching section still needs contextual match text.
 * Optional sections/exclude are heading-fragment constraints. Keep symbols in
 * a contextual table; do not globally annotate Q, V, R, K, tau or other letters.
 * Empty context should show no inferred meaning rather than guessing.
 */
window.READING_SYMBOLS = {
    "rl": [
        {
            "id": "rl-state",
            "symbol": "sₜ / s′",
            "meaning": "当前状态 / 下一状态",
            "type": "状态变量",
            "scope": "MDP 与价值更新",
            "note": "观测不一定是完整状态；s′ 不表示对 s 求导。",
            "match": [
                "s_t",
                "s_{t",
                "s′",
                "下一状态",
                "当前状态"
            ]
        },
        {
            "id": "rl-action",
            "symbol": "aₜ",
            "meaning": "在第 t 步选择的动作",
            "type": "动作变量",
            "scope": "策略与交互轨迹",
            "note": "连续控制时 a 可以是向量；与机器人执行接口对应。",
            "match": [
                "a_t",
                "a_{t",
                "π(a",
                "\\pi(a",
                "\\pi_\\theta(a",
                "选择动作"
            ]
        },
        {
            "id": "rl-policy",
            "symbol": "π(a|s)",
            "meaning": "给定状态时的动作概率分布",
            "type": "条件概率／密度",
            "scope": "随机策略",
            "note": "连续动作中的 π 通常是概率密度；一次具体动作由分布采样。",
            "match": [
                "\\pi(a",
                "\\pi_\\theta",
                "\\pi_θ",
                "π(a",
                "随机策略",
                "动作概率"
            ]
        },
        {
            "id": "rl-deterministic-policy",
            "symbol": "μθ(s)",
            "meaning": "给定状态直接输出动作的确定性策略",
            "type": "向量值函数",
            "scope": "DPG / DDPG / TD3",
            "note": "μ 在别的公式也可能是均值或行为分布；只按当前语境解读。",
            "match": [
                "\\mu_\\theta",
                "\\mu_θ",
                "μθ",
                "确定性策略"
            ],
            "articles": [
                "13-dpg",
                "17-ddpg",
                "31-td3",
                "45-td3-bc"
            ]
        },
        {
            "id": "rl-state-value",
            "symbol": "Vπ(s)",
            "meaning": "从 s 开始按 π 行动的期望回报",
            "type": "标量函数",
            "scope": "状态价值",
            "note": "V 对接下来按策略选择的动作取平均；不同于指定动作后的 Q。",
            "match": [
                "V^",
                "V(s",
                "V_\\phi",
                "V_φ",
                "状态价值",
                "状态值"
            ]
        },
        {
            "id": "rl-action-value",
            "symbol": "Qπ(s,a)",
            "meaning": "在 s 先做 a，随后按 π 行动的期望回报",
            "type": "标量函数",
            "scope": "动作价值",
            "note": "Q* 表示最优后续行为的价值；这里的 Q 不是注意力查询或噪声协方差。",
            "match": [
                "Q(s",
                "Q^",
                "Q_\\theta",
                "Q_θ",
                "动作价值",
                "Q 值",
                "Q值"
            ]
        },
        {
            "id": "rl-advantage",
            "symbol": "Aπ(s,a)",
            "meaning": "相对该状态平均水平的动作优势 Qπ−Vπ",
            "type": "标量函数",
            "scope": "策略梯度与优势估计",
            "note": "估计优势 Â 不等于真实优势；可以来自 GAE 或组内奖励比较。",
            "match": [
                "A^",
                "\\hat A",
                "\\hat{A}",
                "优势函数",
                "优势估计",
                "组内优势"
            ]
        },
        {
            "id": "rl-reward",
            "symbol": "rₜ",
            "meaning": "当前一步的奖励反馈",
            "type": "标量",
            "scope": "交互与 Bellman 目标",
            "note": "奖励的时间下标约定可能是 rₜ 或 rₜ₊₁；以本文定义为准。",
            "match": [
                "r_t",
                "r_{t",
                "即时奖励",
                "单步奖励"
            ]
        },
        {
            "id": "rl-return",
            "symbol": "Gₜ",
            "meaning": "从当前时刻开始累计的后续回报",
            "type": "标量随机变量",
            "scope": "蒙特卡洛与策略梯度",
            "note": "是多个未来奖励的累计，不是即时奖励，也不是 V 的预测值。",
            "match": [
                "G_t",
                "G_{t",
                "Gₜ",
                "后续回报",
                "蒙特卡洛回报"
            ]
        },
        {
            "id": "rl-discount",
            "symbol": "γ",
            "meaning": "未来奖励的折扣因子",
            "type": "标量超参数",
            "scope": "折扣回报与 TD",
            "note": "γ=1 需要同时考虑有限回合或相应收敛条件。",
            "match": [
                "\\gamma",
                "折扣因子",
                "γ=",
                "γV",
                "γQ"
            ]
        },
        {
            "id": "rl-td-error",
            "symbol": "δₜ",
            "meaning": "目标与当前价值预测之间的 TD 误差",
            "type": "标量",
            "scope": "时序差分",
            "note": "常见一步形式为 r+γV(s′)−V(s)，真实终止时不再自举。",
            "match": [
                "\\delta_t",
                "\\delta_{t",
                "TD 误差",
                "TD误差",
                "时序差分误差"
            ]
        },
        {
            "id": "rl-trajectory",
            "symbol": "τ",
            "meaning": "按时间排列的一段状态、动作与反馈轨迹",
            "type": "序列／随机变量",
            "scope": "轨迹分布与策略梯度",
            "note": "不是 DMP 的时间尺度；轨迹可以是片段，不必包含完整回合。",
            "match": [
                "p_\\theta(\\tau)",
                "p(\\tau)",
                "R(\\tau)",
                "\\mathbb E_\\tau",
                "\\tau=",
                "轨迹 τ",
                "轨迹τ"
            ]
        },
        {
            "id": "rl-parameters",
            "symbol": "θ / φ",
            "meaning": "策略、价值或模型的可学习参数",
            "type": "参数向量",
            "scope": "参数化模型",
            "note": "哪个字母对应哪个网络由论文定义；两套参数也可能共享一部分。",
            "match": [
                "策略参数",
                "价值参数",
                "网络参数",
                "\\nabla_\\theta",
                "\\nabla_θ",
                "\\pi_\\theta"
            ]
        },
        {
            "id": "rl-learning-rate",
            "symbol": "α",
            "meaning": "优化更新的步长（在对应更新式中）",
            "type": "标量超参数",
            "scope": "表格 TD 与梯度更新",
            "note": "SAC 中 α 常改指熵温度，不能跨文章沿用步长解释。",
            "match": [
                "学习率",
                "步长 α",
                "步长α",
                "Q+\\alpha",
                "V+\\alpha"
            ],
            "articles": [
                "01-actor-critic",
                "02-td-lambda",
                "04-q-learning",
                "05-reinforce",
                "06-sarsa",
                "11-double-q"
            ]
        },
        {
            "id": "rl-entropy-temperature",
            "symbol": "α",
            "meaning": "控制奖励与策略熵相对权重的温度",
            "type": "非负标量",
            "scope": "SAC 最大熵目标",
            "note": "这是熵系数，不是这里默认的梯度学习率；部分方法自动调整它。",
            "match": [
                "熵系数",
                "温度",
                "\\alpha\\log",
                "\\alpha \\log",
                "\\alpha\\mathcal H"
            ],
            "articles": [
                "30-sac"
            ]
        },
        {
            "id": "rl-importance-ratio",
            "symbol": "ρₜ / π(a|s)÷μ(a|s)",
            "meaning": "目标策略与行为策略对同一动作的概率比",
            "type": "无量纲标量",
            "scope": "离策略重要性修正",
            "note": "分母必须对目标所需动作有支持；比率或连乘可能带来高方差。",
            "match": [
                "重要性",
                "概率比",
                "\\rho",
                "行为策略"
            ]
        },
        {
            "id": "rl-ppo-ratio",
            "symbol": "rₜ(θ)",
            "meaning": "当前策略概率除以采样时旧策略概率",
            "type": "无量纲标量",
            "scope": "PPO 裁剪目标",
            "note": "这里 r 是概率比，不是环境奖励；看 r 的参数与分式定义。",
            "match": [
                "概率比",
                "r_t(\\theta)",
                "r_t(θ)",
                "\\pi_{\\theta_{old}}",
                "裁剪目标"
            ],
            "articles": [
                "27-ppo"
            ]
        },
        {
            "id": "rl-gae-lambda",
            "symbol": "λ",
            "meaning": "控制多步 TD 残差加权衰减的参数",
            "type": "标量超参数",
            "scope": "TD(λ) 与 GAE",
            "note": "它调节估计的偏差与方差；并不是另一个奖励折扣的通用别名。",
            "match": [
                "\\lambda",
                "TD(λ)",
                "资格迹",
                "GAE"
            ],
            "articles": [
                "02-td-lambda",
                "15-gae"
            ]
        },
        {
            "id": "rl-batch",
            "symbol": "𝒟 / B",
            "meaning": "经验数据集或训练批次",
            "type": "样本集合",
            "scope": "经验回放与离线学习",
            "note": "集合来源、是否固定以及能否采集新数据，需由训练设置判断。",
            "match": [
                "\\mathcal D",
                "\\mathcal{D}",
                "回放池",
                "固定数据集",
                "离线数据集"
            ]
        },
        {
            "id": "rl-search-visits",
            "symbol": "N(s,a)",
            "meaning": "搜索树中状态–动作边的访问次数",
            "type": "非负整数",
            "scope": "MCTS / PUCT",
            "note": "访问次数用于搜索预算分配；不是该动作的真实概率或 Q 值。",
            "match": [
                "N(s",
                "访问次数",
                "PUCT",
                "UCB"
            ],
            "articles": [
                "21-alphago",
                "41-muzero"
            ]
        }
    ],
    "llm": [
        {
            "id": "llm-query",
            "symbol": "Q",
            "meaning": "注意力中的查询矩阵",
            "type": "矩阵",
            "scope": "缩放点积注意力",
            "note": "由输入经查询投影得到；不是 RL 的动作价值。",
            "match": [
                "QK",
                "Attention}(Q",
                "Attention(Q",
                "查询矩阵",
                "$Q$ 为查询",
                "查询和键",
                "查询、键"
            ]
        },
        {
            "id": "llm-key",
            "symbol": "K",
            "meaning": "供查询匹配的键矩阵",
            "type": "矩阵",
            "scope": "缩放点积注意力",
            "note": "与 Q 的点积形成注意力分数；不是 Kalman 增益。",
            "match": [
                "QK",
                "Attention}(Q",
                "Attention(Q",
                "键矩阵",
                "$K$ 为键",
                "查询和键",
                "查询、键"
            ]
        },
        {
            "id": "llm-value",
            "symbol": "V",
            "meaning": "被注意力权重加权读取的值矩阵",
            "type": "矩阵",
            "scope": "缩放点积注意力",
            "note": "这里的 Value 是被读取的表示，不是强化学习状态价值。",
            "match": [
                "Attention}(Q",
                "Attention(Q",
                "值矩阵",
                "$V$ 为值",
                "对值加权",
                "QK"
            ]
        },
        {
            "id": "llm-key-width",
            "symbol": "dₖ",
            "meaning": "每个注意力头的键／查询维度",
            "type": "正整数",
            "scope": "缩放点积注意力",
            "note": "分母 √dₖ 控制点积的尺度；不一定等于模型隐藏维度。",
            "match": [
                "d_k",
                "d_{k}",
                "键维度",
                "键的维度"
            ]
        },
        {
            "id": "llm-attention-mask",
            "symbol": "M",
            "meaning": "加入注意力分数中的掩码",
            "type": "矩阵",
            "scope": "Transformer 注意力",
            "note": "因果掩码阻止读取未来位置；掩码值的具体形式依实现。",
            "match": [
                "+M",
                "+ M",
                "掩码",
                "mask"
            ],
            "articles": [
                "015-transformer",
                "019-transformer-xl",
                "033-longformer",
                "038-bigbird"
            ]
        },
        {
            "id": "llm-additive-weight",
            "symbol": "αᵢⱼ",
            "meaning": "输出位置 i 读取源位置 j 的归一化权重",
            "type": "标量权重",
            "scope": "加性注意力",
            "note": "该权重不是学习率；权重可视化不自动构成因果解释。",
            "match": [
                "\\alpha_{ij}",
                "alpha[j]",
                "对齐权重",
                "归一化权重"
            ],
            "articles": [
                "007-attention"
            ]
        },
        {
            "id": "llm-token-probability",
            "symbol": "pθ(xₜ|x<t)",
            "meaning": "给定此前 token 时预测下一 token 的条件概率",
            "type": "条件概率",
            "scope": "自回归语言建模",
            "note": "训练常最大化正确 token 的概率；自由生成时此前 token 来自模型。",
            "match": [
                "x_{<t}",
                "x_<t",
                "x_{< t}",
                "下一 token",
                "下一个 token",
                "下一个词",
                "自回归"
            ]
        },
        {
            "id": "llm-loss",
            "symbol": "ℒ / L",
            "meaning": "当前任务定义的训练损失",
            "type": "标量目标",
            "scope": "模型训练",
            "note": "交叉熵、蒸馏与偏好目标的 L 含义不同；先读本节具体公式。",
            "match": [
                "\\mathcal L",
                "\\mathcal{L}",
                "训练损失",
                "损失函数"
            ]
        },
        {
            "id": "llm-parameters",
            "symbol": "θ",
            "meaning": "模型的可学习参数",
            "type": "参数向量",
            "scope": "语言建模与偏好优化",
            "note": "θref、θold 等下标表示参考或旧参数，不能忽略下标。",
            "match": [
                "p_\\theta",
                "\\pi_\\theta",
                "模型参数",
                "参数 θ",
                "参数θ"
            ]
        },
        {
            "id": "llm-lora-matrices",
            "symbol": "ΔW = BA",
            "meaning": "以两个低秩矩阵的乘积表示权重增量",
            "type": "矩阵分解",
            "scope": "LoRA",
            "note": "r 是适配秩，A、B 的尺寸依原权重方向约定；不是训练全部 W。",
            "match": [
                "\\Delta W",
                "ΔW",
                "BA",
                "低秩"
            ],
            "articles": [
                "047-lora",
                "074-qlora"
            ]
        },
        {
            "id": "llm-dpo-beta",
            "symbol": "β",
            "meaning": "控制策略相对参考模型偏离程度的系数",
            "type": "正标量超参数",
            "scope": "DPO 的 KL 正则化推导与损失",
            "note": "β 不是整个网站统一的学习率或采样温度；解释依当前目标约定。",
            "match": [
                "\\beta",
                "βlog",
                "KL",
                "参考模型"
            ],
            "articles": [
                "075-dpo"
            ]
        },
        {
            "id": "llm-preference-pair",
            "symbol": "y_w / y_l",
            "meaning": "同一输入下偏好更高 / 更低的回答",
            "type": "输出序列对",
            "scope": "成对偏好训练",
            "note": "胜出回答只表示在这对样本中更被偏好，不保证绝对正确。",
            "match": [
                "y_w",
                "y_l",
                "y_{w}",
                "y_{l}",
                "偏好对"
            ],
            "articles": [
                "075-dpo"
            ]
        },
        {
            "id": "llm-kl",
            "symbol": "D_KL(π∥πref)",
            "meaning": "当前策略相对参考策略的分布差异",
            "type": "非负标量",
            "scope": "偏好与强化学习对齐",
            "note": "KL 有方向性；逐 token 或整段序列的估计形式需要核对。",
            "match": [
                "D_{KL}",
                "D_{\\mathrm{KL}}",
                "D_\\mathrm{KL}",
                "KL 散度",
                "KL散度"
            ],
            "articles": [
                "054-instructgpt",
                "065-constitutional",
                "075-dpo",
                "080-rlaif",
                "086-deepseekmath",
                "094-r1"
            ]
        }
    ],
    "robot-learn": [
        {
            "id": "robot-policy",
            "symbol": "π(a|s)",
            "meaning": "给定状态时的动作概率分布",
            "type": "条件概率／密度",
            "scope": "随机策略",
            "note": "连续动作中的 π 通常是概率密度；一次具体动作由分布采样。",
            "match": [
                "\\pi(a",
                "\\pi_\\theta",
                "\\pi_θ",
                "π(a",
                "随机策略",
                "动作概率"
            ]
        },
        {
            "id": "robot-action-value",
            "symbol": "Qπ(s,a)",
            "meaning": "在 s 先做 a，随后按 π 行动的期望回报",
            "type": "标量函数",
            "scope": "动作价值",
            "note": "Q* 表示最优后续行为的价值；这里的 Q 不是注意力查询或噪声协方差。",
            "match": [
                "Q(s",
                "Q^",
                "Q_\\theta",
                "Q_θ",
                "动作价值",
                "Q 值",
                "Q值"
            ]
        },
        {
            "id": "robot-state-value",
            "symbol": "Vπ(s)",
            "meaning": "从 s 开始按 π 行动的期望回报",
            "type": "标量函数",
            "scope": "状态价值",
            "note": "V 对接下来按策略选择的动作取平均；不同于指定动作后的 Q。",
            "match": [
                "V^",
                "V(s",
                "V_\\phi",
                "V_φ",
                "状态价值",
                "状态值"
            ]
        },
        {
            "id": "robot-reward",
            "symbol": "rₜ",
            "meaning": "当前一步的奖励反馈",
            "type": "标量",
            "scope": "交互与 Bellman 目标",
            "note": "奖励的时间下标约定可能是 rₜ 或 rₜ₊₁；以本文定义为准。",
            "match": [
                "r_t",
                "r_{t",
                "即时奖励",
                "单步奖励"
            ]
        },
        {
            "id": "robot-return",
            "symbol": "Gₜ",
            "meaning": "从当前时刻开始累计的后续回报",
            "type": "标量随机变量",
            "scope": "蒙特卡洛与策略梯度",
            "note": "是多个未来奖励的累计，不是即时奖励，也不是 V 的预测值。",
            "match": [
                "G_t",
                "G_{t",
                "Gₜ",
                "后续回报",
                "蒙特卡洛回报"
            ]
        },
        {
            "id": "robot-observation",
            "symbol": "oₜ / Oₜ",
            "meaning": "当前观测或一段观测历史",
            "type": "向量／图像／序列",
            "scope": "视觉运动策略",
            "note": "观测可以包含图像和本体状态；大写 O 有时特指堆叠历史。",
            "match": [
                "o_t",
                "O_t",
                "o_{t",
                "O_{t",
                "观测历史",
                "视觉输入"
            ]
        },
        {
            "id": "robot-action",
            "symbol": "aₜ",
            "meaning": "当前动作或控制命令",
            "type": "向量",
            "scope": "机器人动作接口",
            "note": "先核对单位、坐标和频率；目标位姿与关节力矩不是同一种动作。",
            "match": [
                "a_t",
                "a_{t",
                "动作向量",
                "控制命令"
            ]
        },
        {
            "id": "robot-action-chunk",
            "symbol": "Aₜ / aₜ:ₜ₊H",
            "meaning": "从当前时刻起的一段未来动作",
            "type": "时间序列／张量",
            "scope": "动作分块",
            "note": "这里 A 表示动作段，不是强化学习的优势函数。",
            "match": [
                "A_t",
                "A_{t",
                "动作段",
                "动作块",
                "action chunk"
            ],
            "articles": [
                "061-diffusion-policy",
                "062-act",
                "075-dp3",
                "080-octo",
                "085-rdt",
                "087-pi0",
                "089-fast",
                "091-openvla-oft",
                "093-pi05",
                "095-smolvla"
            ]
        },
        {
            "id": "robot-dmp-tau",
            "symbol": "τ",
            "meaning": "调整运动快慢的时间尺度",
            "type": "正标量",
            "scope": "DMP 动力系统",
            "note": "τ 在本篇不是采样轨迹；与其他方程中的时间缩放约定需一起看。",
            "match": [
                "\\tau",
                "时间尺度"
            ],
            "articles": [
                "001-dmp"
            ]
        },
        {
            "id": "robot-dmp-goal",
            "symbol": "g / y",
            "meaning": "目标位置 / 当前期望位置",
            "type": "标量或向量",
            "scope": "DMP 离散运动",
            "note": "y 是生成器的期望轨迹，真实机器人是否跟上还取决于底层控制。",
            "match": [
                "g-y",
                "g-y)",
                "目标位置",
                "期望位置",
                "\\dot y"
            ],
            "articles": [
                "001-dmp"
            ]
        },
        {
            "id": "robot-dmp-forcing",
            "symbol": "f / Ψᵢ / wᵢ",
            "meaning": "形状项 / 局部基函数 / 学习权重",
            "type": "函数／参数",
            "scope": "DMP 轨迹形状",
            "note": "2002 年原文和后来的常见 DMP 方程并不完全相同；以本篇版本为准。",
            "match": [
                "\\Psi",
                "w_i",
                "形状项",
                "非线性项",
                "强迫项"
            ],
            "articles": [
                "001-dmp"
            ]
        },
        {
            "id": "robot-trajectory-tau",
            "symbol": "τ",
            "meaning": "示范或策略产生的整段轨迹",
            "type": "时间序列",
            "scope": "轨迹分布与奖励学习",
            "note": "只在轨迹概率／回报语境下使用；DMP τ 与流匹配 τ 是不同量。",
            "match": [
                "p(\\tau)",
                "R(\\tau)",
                "\\tau_i",
                "轨迹 τ",
                "轨迹τ"
            ],
            "articles": [
                "002-apprenticeship",
                "003-maxent-irl",
                "004-power",
                "005-pi2",
                "012-guided-cost",
                "015-gail"
            ]
        },
        {
            "id": "robot-diffusion-time",
            "symbol": "t / k",
            "meaning": "机器人执行时刻 / 去噪迭代等级",
            "type": "两个不同的时间索引",
            "scope": "Diffusion Policy",
            "note": "k 改变同一动作段的噪声等级，不表示机器人已经执行一步。",
            "match": [
                "扩散时间",
                "机器人时间",
                "去噪",
                "A_t^k",
                "A_t^0"
            ],
            "articles": [
                "061-diffusion-policy",
                "075-dp3",
                "085-rdt"
            ]
        },
        {
            "id": "robot-diffusion-noise",
            "symbol": "ε / εθ",
            "meaning": "加入的噪声 / 网络预测的噪声",
            "type": "动作维度的张量",
            "scope": "动作扩散训练",
            "note": "训练噪声预测误差不等于直接对所有专家动作取平均。",
            "match": [
                "\\epsilon",
                "噪声预测",
                "预测噪声"
            ],
            "articles": [
                "061-diffusion-policy",
                "075-dp3",
                "085-rdt"
            ]
        },
        {
            "id": "robot-diffusion-horizons",
            "symbol": "Tₒ / Tₚ / Tₐ",
            "meaning": "观测历史长度 / 预测动作长度 / 实际执行长度",
            "type": "正整数",
            "scope": "Diffusion Policy 滚动执行",
            "note": "通常执行长度不大于预测长度；更长执行片段会推迟反馈修正。",
            "match": [
                "T_o",
                "T_p",
                "T_a",
                "观测历史",
                "执行长度"
            ],
            "articles": [
                "061-diffusion-policy"
            ]
        },
        {
            "id": "robot-flow-time",
            "symbol": "u / τ",
            "meaning": "连接噪声与动作分布的插值时间",
            "type": "通常在 [0,1] 的标量",
            "scope": "π₀ 流匹配",
            "note": "本篇区分官方实现 u 与论文 τ 的反向约定；不是 DMP 时间尺度或机器人执行时刻。",
            "match": [
                "X_u",
                "X_\\tau",
                "u=1",
                "插值",
                "时间约定"
            ],
            "articles": [
                "087-pi0"
            ]
        },
        {
            "id": "robot-flow-velocity",
            "symbol": "vθ(Xᵤ,o,u)",
            "meaning": "把插值样本沿生成路径移动的预测向量场",
            "type": "与动作段同维度的向量场",
            "scope": "π₀ 流匹配",
            "note": "这里 velocity 描述生成路径上的变化，不直接等于机器人真实关节速度。",
            "match": [
                "v_\\theta",
                "向量场",
                "\\epsilon-A"
            ],
            "articles": [
                "087-pi0"
            ]
        },
        {
            "id": "robot-demonstration-data",
            "symbol": "𝒟 / 𝒟E",
            "meaning": "训练数据集 / 专家示范集",
            "type": "样本集合",
            "scope": "模仿学习",
            "note": "记录里是否有状态、图像、动作和成功标签，依具体数据集而定。",
            "match": [
                "\\mathcal D",
                "\\mathcal{D}",
                "示范集",
                "专家数据",
                "示范数据集"
            ]
        }
    ],
    "robot-classic": [
        {
            "id": "classic-joints",
            "symbol": "q / q̇",
            "meaning": "关节构型 / 关节速度",
            "type": "向量",
            "scope": "机器人运动学与动力学",
            "note": "q 不是概率；旋转关节与移动关节的单位不同。",
            "match": [
                "q_1",
                "q_2",
                "q_i",
                "\\dot q",
                "J(q)",
                "关节角",
                "关节构型"
            ]
        },
        {
            "id": "classic-jacobian",
            "symbol": "J(q)",
            "meaning": "当前构型处的速度雅可比矩阵",
            "type": "矩阵",
            "scope": "微分运动学与力映射",
            "note": "J 不是 RL 的期望回报目标；行列维度由任务坐标与关节数决定。",
            "match": [
                "J(q)",
                "\\dot x=J",
                "雅可比",
                "Jacobian"
            ]
        },
        {
            "id": "classic-pseudoinverse",
            "symbol": "J†",
            "meaning": "雅可比的 Moore–Penrose 伪逆",
            "type": "矩阵",
            "scope": "冗余机械臂的局部速度求解",
            "note": "不是一般意义上的全局非线性逆运动学；奇异附近还要考虑阻尼。",
            "match": [
                "J^\\dagger",
                "J†",
                "伪逆"
            ],
            "articles": [
                "004-resolved-rate",
                "012-manipulability",
                "016-damped-ik",
                "050-task-priority"
            ]
        },
        {
            "id": "classic-rigid-pose",
            "symbol": "T = [R,p;0,1]",
            "meaning": "旋转与平移组成的齐次刚体变换",
            "type": "4×4 矩阵",
            "scope": "三维坐标变换",
            "note": "R 在几何语境是旋转矩阵，不是 Kalman 测量噪声协方差。",
            "match": [
                "齐次",
                "旋转矩阵",
                "刚体变换",
                "SE(3)",
                "SE( 3 )"
            ]
        },
        {
            "id": "classic-kalman-state",
            "symbol": "x̂⁻ / x̂⁺",
            "meaning": "测量融合前的预测 / 融合后的状态估计",
            "type": "状态向量",
            "scope": "Kalman 预测与修正",
            "note": "上标 −、+ 是更新阶段，不是正负位置；不同书也用 k|k−1 与 k|k。",
            "match": [
                "\\hat x",
                "\\hat{x}",
                "预测状态",
                "状态估计",
                "x估计"
            ],
            "articles": [
                "002-kalman"
            ]
        },
        {
            "id": "classic-kalman-P",
            "symbol": "P",
            "meaning": "状态估计误差的协方差",
            "type": "对称半正定矩阵",
            "scope": "Kalman 滤波",
            "note": "小 P 表示模型认为自己不确定性小；统计假设错误时仍可能过度自信。",
            "match": [
                "P^-",
                "P^+",
                "P_minus",
                "误差协方差",
                "状态协方差"
            ],
            "articles": [
                "002-kalman"
            ]
        },
        {
            "id": "classic-kalman-Q",
            "symbol": "Q",
            "meaning": "过程噪声的协方差",
            "type": "对称半正定矩阵",
            "scope": "Kalman 状态预测",
            "note": "它描述未建模扰动的不确定性，不是 RL 动作价值或 MPC 代价权重。",
            "match": [
                "+Q",
                "+ Q",
                "Q_k",
                "过程噪声",
                "动力学F/B/Q",
                "其协方差"
            ],
            "articles": [
                "002-kalman"
            ]
        },
        {
            "id": "classic-kalman-R",
            "symbol": "R",
            "meaning": "测量噪声的协方差",
            "type": "对称半正定矩阵",
            "scope": "Kalman 测量融合",
            "note": "这里 R 不是旋转矩阵；设小只代表更相信测量，不让传感器本身更准。",
            "match": [
                "+R",
                "+ R",
                "R_k",
                "测量噪声",
                "测量模型H/R",
                "其协方差"
            ],
            "articles": [
                "002-kalman"
            ]
        },
        {
            "id": "classic-kalman-K",
            "symbol": "K",
            "meaning": "将测量创新映射为状态修正的 Kalman 增益",
            "type": "矩阵",
            "scope": "Kalman 修正",
            "note": "增益由预测不确定性与测量模型共同决定，不是传感器固定权重。",
            "match": [
                "K_k",
                "K=",
                "K =",
                "增益",
                "Kalman gain"
            ],
            "articles": [
                "002-kalman"
            ]
        },
        {
            "id": "classic-kalman-innovation",
            "symbol": "z−H x̂⁻",
            "meaning": "实际测量与预测测量的差（创新）",
            "type": "测量空间向量",
            "scope": "Kalman 修正与模型检查",
            "note": "创新长期有偏或有未解释相关性，可能提示模型、同步或噪声设定有误。",
            "match": [
                "创新",
                "z-H",
                "z_k-H",
                "z−H"
            ],
            "articles": [
                "002-kalman"
            ]
        },
        {
            "id": "classic-kalman-models",
            "symbol": "F / H",
            "meaning": "状态转移矩阵 / 测量矩阵",
            "type": "矩阵",
            "scope": "线性 Kalman 模型",
            "note": "F 把状态推到下一时刻，H 把状态映射到可测量量。",
            "match": [
                "Fx",
                "F\\hat",
                "HP",
                "测量模型",
                "状态转移"
            ],
            "articles": [
                "002-kalman"
            ]
        },
        {
            "id": "classic-torque",
            "symbol": "τ",
            "meaning": "施加于关节的力矩或广义力",
            "type": "向量",
            "scope": "机器人动力学与阻抗控制",
            "note": "不是 RL 轨迹，也不是 DMP 时间尺度；转动关节通常用 N·m。",
            "match": [
                "\\tau=",
                "\\tau =",
                "关节力矩",
                "驱动力矩"
            ],
            "articles": [
                "005-newton-euler",
                "010-featherstone",
                "013-impedance",
                "018-operational-space",
                "019-adaptive-control",
                "080-wholebody-qp",
                "094-cheetah-mpc"
            ]
        },
        {
            "id": "classic-impedance",
            "symbol": "K / D",
            "meaning": "期望刚度 / 阻尼",
            "type": "标量或矩阵",
            "scope": "阻抗控制",
            "note": "这里 K 不是 Kalman 增益；参数含义依控制坐标和方程形式而定。",
            "match": [
                "K(x_d",
                "D(",
                "刚度",
                "阻尼"
            ],
            "articles": [
                "013-impedance"
            ]
        },
        {
            "id": "classic-astar-cost",
            "symbol": "f(n)=g(n)+h(n)",
            "meaning": "已走代价加剩余代价的启发式估计",
            "type": "标量代价",
            "scope": "A* 图搜索",
            "note": "h 可接受不等于任何闭集实现都自动最优；还需核对一致性或重新打开节点的处理。",
            "match": [
                "g(n)",
                "h(n)",
                "f(n)",
                "启发式",
                "估价"
            ],
            "articles": [
                "003-astar"
            ]
        },
        {
            "id": "classic-mpc-state-input",
            "symbol": "xₖ / uₖ",
            "meaning": "预测状态 / 待优化控制输入",
            "type": "向量",
            "scope": "模型预测控制",
            "note": "Cheetah MPC 的 u 是足端接触力，不能自动当成关节力矩。",
            "match": [
                "x_{k+1}",
                "u_k",
                "u_{k}",
                "状态方程",
                "控制序列"
            ],
            "articles": [
                "094-cheetah-mpc"
            ]
        },
        {
            "id": "classic-mpc-weights",
            "symbol": "Qₖ / Rₖ",
            "meaning": "状态跟踪误差 / 控制输入的代价权重",
            "type": "半正定／正定权重矩阵",
            "scope": "MPC 二次代价",
            "note": "它们在本篇是设计者选择的优化权重，不是 Kalman 过程／测量噪声。",
            "match": [
                "Q_k",
                "R_k",
                "代价权重",
                "跟踪",
                "二次规划"
            ],
            "articles": [
                "094-cheetah-mpc"
            ]
        },
        {
            "id": "classic-contact-friction",
            "symbol": "μ",
            "meaning": "摩擦系数",
            "type": "无量纲非负标量",
            "scope": "接触与摩擦约束",
            "note": "与确定性策略 μθ 无关；摩擦锥线性近似还要核对保守程度。",
            "match": [
                "摩擦系数",
                "\\mu f",
                "\\mu\\lambda",
                "摩擦锥"
            ],
            "articles": [
                "030-grasp-quality",
                "034-force-closure",
                "036-impulse-contact",
                "072-contact-implicit",
                "075-contact-trajopt",
                "080-wholebody-qp",
                "094-cheetah-mpc"
            ]
        },
        {
            "id": "classic-factor-residual",
            "symbol": "rᵢ(x) / Σᵢ",
            "meaning": "第 i 个约束的残差 / 测量不确定性",
            "type": "向量 / 协方差矩阵",
            "scope": "因子图与非线性最小二乘",
            "note": "残差 r 不是奖励；白化或信息矩阵影响不同测量的权重。",
            "match": [
                "残差",
                "\\Sigma",
                "马氏",
                "信息矩阵"
            ],
            "articles": [
                "053-graphslam",
                "057-isam",
                "063-g2o",
                "068-isam2",
                "083-imu-preintegration",
                "092-vinsmono",
                "097-liosam"
            ]
        },
        {
            "id": "classic-occupancy-probability",
            "symbol": "p(mᵢ|z₁:ₜ)",
            "meaning": "结合观测后第 i 格被占据的概率",
            "type": "[0,1] 的标量",
            "scope": "占据栅格",
            "note": "未知、空闲与占据应区分；概率阈值是后续决策约定。",
            "match": [
                "p(m",
                "m_i",
                "占据概率",
                "对数几率"
            ],
            "articles": [
                "025-occupancy",
                "074-octomap"
            ]
        }
    ]
};
