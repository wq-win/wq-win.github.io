(function (global) {
    global.SITE = {
        name: 'MyLog',
        origin: 'https://wq-win.github.io',
        github: 'https://github.com/wq-win',
        repo: 'https://github.com/wq-win/wq-win.github.io',
        issues: 'https://github.com/wq-win/wq-win.github.io/issues/new',
        email: '643797037@qq.com',
        series: [
            { id: 'rl', href: 'rl/index.html', label: '强化学习 60 篇', short: '强化学习' },
            { id: 'llm', href: 'llm/index.html', label: '大语言模型 100 篇', short: '大语言模型' },
            { id: 'robot-learn', href: 'robot-learn/index.html', label: '机器人学习 100 篇', short: '机器人学习' },
            { id: 'robot-classic', href: 'robot-classic/index.html', label: '机器人经典基础 100 篇', short: '机器人经典' }
        ],
        demos: [
            { group: '休闲', href: 'game/sudoku.html', title: 'Sudoku' },
            { group: '休闲', href: 'game/jianghu-slay.html', title: '江湖 Slay' },
            { group: '强化学习', cat: 'rl', file: 'q-learning', href: 'game/rl/q-learning.html', title: 'Q-learning 迷宫' },
            { group: '强化学习', cat: 'rl', file: 'value-iteration', href: 'game/rl/value-iteration.html', title: '价值迭代' },
            { group: '强化学习', cat: 'rl', file: 'policy-gradient', href: 'game/rl/policy-gradient.html', title: 'REINFORCE 倒立摆' },
            { group: '强化学习', cat: 'rl', file: 'cliff', href: 'game/rl/cliff.html', title: '悬崖：SARSA vs Q' },
            { group: '大语言模型', cat: 'llm', file: 'attention', href: 'game/llm/attention.html', title: '注意力可视化' },
            { group: '大语言模型', cat: 'llm', file: 'positional', href: 'game/llm/positional.html', title: '正弦位置编码' },
            { group: '大语言模型', cat: 'llm', file: 'softmax', href: 'game/llm/softmax.html', title: 'Softmax 与温度' },
            { group: '大语言模型', cat: 'llm', file: 'bpe', href: 'game/llm/bpe.html', title: 'BPE 分词' },
            { group: '机器人经典', cat: 'robot-classic', file: 'astar', href: 'game/robot-classic/astar.html', title: 'A* 与 Dijkstra' },
            { group: '机器人经典', cat: 'robot-classic', file: 'rrt', href: 'game/robot-classic/rrt.html', title: 'RRT 绕障' },
            { group: '机器人经典', cat: 'robot-classic', file: 'kalman', href: 'game/robot-classic/kalman.html', title: 'Kalman 跟踪' },
            { group: '机器人经典', cat: 'robot-classic', file: 'potential', href: 'game/robot-classic/potential.html', title: '人工势场' },
            { group: '机器人经典', cat: 'robot-classic', file: 'pid', href: 'game/robot-classic/pid.html', title: 'PID 跟踪' },
            { group: '机器人经典', cat: 'robot-classic', file: 'icp', href: 'game/robot-classic/icp.html', title: 'ICP 点云配准' },
            { group: '机器人学习', cat: 'robot-learn', file: 'dmp', href: 'game/robot-learn/dmp.html', title: 'DMP 运动基元' },
            { group: '机器人学习', cat: 'robot-learn', file: 'dagger', href: 'game/robot-learn/dagger.html', title: '行为克隆 vs DAgger' },
            { group: '机器人学习', cat: 'robot-learn', file: 'domain-rand', href: 'game/robot-learn/domain-rand.html', title: '域随机化' }
        ]
    };
})(window);
