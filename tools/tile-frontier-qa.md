# 翻格筑城：本地实现与验证

## 文件范围

- `game/tile-frontier.html`
- `game/assets/tile-frontier.css`
- `game/js/tile-frontier-engine.js`
- `game/js/tile-frontier-levels.js`
- `game/js/tile-frontier.js`
- `tools/tile-frontier-test.js`
- `tools/tile-frontier-ui-test.js`
- `tools/tile-frontier-contrast-test.js`
- 本说明

游戏实现独立于其他游戏；入口和测试命令已统一集成。无外部字体、图片、请求或运行时依赖；美术由本地内联 SVG 绘制。测试使用仓库已有的 happy-dom。开发时 node_modules 为工作区内符号链接，不属于交付文件。

## 规则与界面约定

- 地图固定 5 × 5；仅上下左右连通。所有关卡固定，不随机重排。
- 点击与己方相邻的未知格直接翻开。空地/林地会归属己方；林地首次翻开一次性给木材。敌据点只会显露，不会自动归属。
- 点击己方空地只选择，不耗行动。操作区提供 2 木伐木场和 3 木兵营。
- 伐木场在建造之后每 3 次有效行动产 1 木，各建筑独立计数，建造当步不计。格子底部三点表示计数。
- 点击兵营格或其招募按钮会花 2 木、1 行动招 2 兵。
- 点击敌据点只选择；点攻占按钮花 1 行动及与守军相等的兵力。
- 每个有效翻格、建造、招兵、攻占恰好花 1 行动；无效操作、选择、切换全屏、规则面板不花行动。
- 最后一次行动占领全部据点优先获胜。预算耗尽未达目标，或尚有预算却已无合法动作时，明确失败并可重试。
- 只保存关卡索引和已通关列表，不保存中途盘面。坏数据和存储拒绝不影响玩法。
- 重开/选关递增动画 epoch 并清空计时器和飞入粒子。减少动态效果模式不创建动画计时器。

## 引擎 API

浏览器：`window.TileFrontier`；Node：`require('../game/js/tile-frontier-engine.js')`，然后 `configure(require('../game/js/tile-frontier-levels.js'))`。

- `create(index)`：创建独立游戏状态，index 为 0–5。
- `neighbors(id)`：相邻格列表，id = row × 5 + column，row/column 从 0 开始。
- `reason(state, action)`：合法操作返回空字符串，否则返回提示；不修改状态。
- `available(state)`：全部当前合法操作。
- `act(state, action)`：同步修改状态并返回 `{ok, type, id, harvested, produced, producers, spentWood, spentTroops, status}`；无效操作返回 `{ok:false, reason}` 并完全不改变状态。
- `solution(index)`：返回手工设计的可执行通关解副本。
- `replay(index, actions?)`：重放给定操作，默认用关卡通关解，返回 `{state, results, valid}`。

动作格式：

- `{type:'reveal', id:17}`
- `{type:'build', id:21, building:'mill'}` 或 `building:'barracks'`
- `{type:'recruit', id:21}`
- `{type:'attack', id:12}`

状态中 `status` 为 `playing / won / lost`；终局 `endReason` 为 `captured / budget / blocked`。

## 六关验证结果

| 关卡 | 主题 | 证书行动 / 预算 | 结束木材 / 兵力 |
| --- | --- | --- | --- |
| 林间第一旗 | 教学 | 6 / 8 | 0 / 0 |
| 让森林生长 | 生产投资 | 16 / 17 | 0 / 0 |
| 两边的炊烟 | 两处分岔 | 12 / 14 | 0 / 0 |
| 先过这道关 | 据点堵路 | 9 / 9 | 0 / 0 |
| 木料的远近 | 投资取舍 | 13 / 14 | 0 / 0 |
| 三面旗归来 | 三据点综合 | 20 / 22 | 0 / 0 |

策略验证：

- 第 2 关没有林地；初始 7 木少于兵营 + 所需招兵的 9 木，因此必须投资生产。证书至少产出 4 木，覆盖伐木场自身成本。
- 第 4 关正面处理堵路据点可在第 9 步获胜；额外花两步绕远会失败。
- 第 5 关同时验证了早建伐木场与绕到西侧林地两种 13 步胜法。第三次招兵后才追加伐木场，会因木材与剩余行动不足失败。
- 固定种子各 250 局随机合法动作：第 1 关 3 次胜利，其余各 0。该样本用于避免无规划即可普遍通关，并不作为最优解证明。

## 本地自动测试

```sh
node tools/tile-frontier-test.js
node tools/tile-frontier-ui-test.js
node tools/tile-frontier-contrast-test.js
```

结果：全部通过。

- 引擎 10 组：地图邻接、拒绝操作无副作用、林地只采一次、建造/招兵/攻占成本、独立生产时钟、六关证书、末步胜利优先、无合法动作死局、策略反例、固定种子随机局。
- UI：六关逐步真实 DOM 点击通关、下一关、重开、失败、选择无消耗、键盘焦点、直接跳第六关不虚报“六关完成”、规则面板、全屏与 Escape 状态保留、坏存档、存储不可用、重开/选关取消动画、减少动态效果。
- 对比度：10 组关键信息正文 ≥ 4.5:1（最低 4.77:1）；4 组交互/生产标记 ≥ 3:1（最低 3.62:1）。

## 真实浏览器验证

实际云 Chromium（非物理手机）验证了 1366×768、390×844、844×390、360×640、640×360、320×568、667×375。全部可见交互目标至少44×44 CSS px，文档无横向或纵向溢出，控制在视口内。

实际点击完成第1关（6行动）、第2关（16行动）和第6关（20行动）；验证行动用尽失败、重试、规则开关、全屏回退与Escape。直接跳第6关只显示该关完成，不误称六关全部完成。桌面、手机、短横屏与最小竖屏已保存截图。

全屏使用禁用原生全屏的iframe验证页面铺满回退。未声称在物理手机、所有系统字体缩放或所有原生全屏实现上测试。
