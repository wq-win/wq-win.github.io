# 杂货找三消 · 独立验收说明

## 交付范围

- 页面：`game/grocery-triple.html`。只新增本游戏文件；不改入口、共用全屏逻辑或 package 脚本。
- 8 个固定原创关卡，数量依次为 18 / 24 / 27 / 30 / 36 / 42 / 45 / 48 件；种类为 3 / 4 / 4 / 5 / 6 / 7 / 7 / 8；层数为 1 / 2 / 2 / 2 / 3 / 3 / 3 / 3。
- 8 组本地原创 SVG：杯子、香蕉、面包、牛奶瓶、袜子、苹果、果酱、小刷子。不同轮廓与细节可直接辨认，不使用 emoji、外部字体、图像或 API。
- 七格暂存篮；第三件同类立即从逻辑状态清除，随后才检查七格失败。全部物品与暂存篮清空才胜利。没有道具、撤销、商城、养成或排行。

## 规则与几何

`grocery-triple-engine.js` 是独立的纯状态引擎，不依赖 DOM。删除集合为 ID 数组与 Set，48 件不会出现 32 位掩码别名。

每件物品在逻辑桌面上占一个 44 × 44 的不透明方形纸垫。整张纸垫与图案使用固定的小角度旋转。引擎 `corners()` 计算与 CSS 一致的四个旋转顶点，`intersects()` 使用分离轴定理精确判断旋转方形的相交。`blockers` 记录所有更高层相交物品；只要存在未移除的 blocker，整张底层物品都不可交互。相同层的方形不相交。第 5–8 关还有跨相邻堆叠的实际遮挡关系。装饰投影不算实体遮挡。

最窄手机不缩小可点击卡片；桌面按空间放大。暂存篮是展示区，不可点击，因此允许七格在窄屏内缩小。全屏、横竖屏切换只重新布局，不改变当前关卡。

## 独立自动化测试

执行：

```sh
node tools/grocery-triple-test.js
node tools/grocery-triple-ui-test.js
node tools/grocery-triple-contrast-test.js
```

### Node：通过

- 8 关固定通关证书逐步重放；每一步只能选取当前可用的顶层物品，最后全部胜利。
- `solve()` 初始局返回经重放验证的证书；8 关临近结束状态另走通用 DFS 搜索并通关。
- 第 2–8 关全部找到并重放真实的七格失败分支。3 类教学关最多留 6 件，不人为制造失败。
- 320 局随机合法选择，每一步都把“是否可点”与全部存活上层物品的精确旋转几何重新比对。
- 所有旋转后顶点位于逻辑桌面内；同层无相交；遮挡边只从低层指向高层，因此无环。
- 第七件凑齐三件时先消除再判断失败、同一件不可重复拿取、终局不可继续操作、非法 ID 不修改状态、超过 31 的 ID 不别名。

### happy-dom：通过

- 点击式重放全部 8 关，胜利、下一关、第 8 关回到第一关、失败与重试、下拉选关、重新整理。
- 所有剩余按钮的 disabled 状态与引擎可用集合一致，遮挡物品不可点。
- 初始损坏 JSON、null、错误字段/越界关卡、禁用 localStorage 均可正常游玩；合法进度恢复。
- 跳到第 8 关仅通一关时只报本篮完成，不误报八关全部完成；确实完成八关才显示总完成文案。
- 全屏 fallback 与 Escape 保留局面并回焦；横竖屏移动同一暂存篮 DOM，不产生重复 ID。
- 普通动画飞入、忙碌时防重复点击、飞行中重开/选关、延迟回调失效与幽灵元素清理。
- 真实通关路径先积累 6 件，第 7 件形成三消：动画中显示 7 件与 3 个消失目标，逻辑保持 playing，动画后留下 4 件，绝不闪现失败。
- 原生 button/select 语义、可聚焦控件、live status、无外部资源依赖。

### 文字对比度：通过

所有信息文字组合达到 WCAG AA 普通文字标准。最小测得 5.21:1，正文 9.23:1，主行动按钮 6.99:1。装饰性印章底纹和图案不作为文字信息。

## 真实浏览器检查

由上级任务独立完成，不能以 happy-dom 代替布局或真实点击验证。要求七尺寸：1366×768、390×844、844×390、360×640、640×360、320×568、667×375。

检查核心区域一屏、根节点无横向/纵向溢出、可点击目标至少 44×44、实际遮挡与解锁、可用顶层命中、动画、第七件先消除、键盘、全屏/回退、减动效。

## 浏览器 QA 动作 API

```js
GroceryTripleUI.start(0); // 0–7，完整重开所选关
GroceryTripleUI.state; // 防止外部意外变更的状态副本
GroceryTripleUI.busy; // 动画尚未结束时为 true
GroceryTripleUI.pick(id); // 与点击同一路径，不绕过遮挡/容量规则
GroceryTriple.levels[0].solution; // 当前固定证书，物品 ID 数组
GroceryTriple.available(GroceryTripleUI.state); // 当前可取物品
```

浏览器自动重放时使用真实按钮或 `pick`，每步等待 busy=false。减动效环境中 pick 同步完成。真实失败示例：第 2 关 `start(1)` 后依次取 `[1,0,3,17,2,5,4]`，应得到七格失败。

## 精确交付文件

1. `game/grocery-triple.html`
2. `game/assets/grocery-triple.css`
3. `game/js/grocery-triple-engine.js`
4. `game/js/grocery-triple-levels.js`
5. `game/js/grocery-triple.js`
6. `tools/grocery-triple-test.js`
7. `tools/grocery-triple-ui-test.js`
8. `tools/grocery-triple-contrast-test.js`
9. `tools/grocery-triple-qa.md`

没有提交、推送或公开写入。测试用 node_modules 符号链接不是交付文件，不应加入版本控制。

## Final integration browser verification — 2026-10-19
Cloud Chromium: all seven requested viewports fit without page scrolling and active controls meet 44px. Real button clicks completed levels 2 and 8; level 2 seven-slot failure was verified. Level 8 does not falsely claim all eight levels complete. Rotated polygon blockers were checked against rendered top-layer hit targets. Desktop height overflow found during QA was corrected before freeze. Screenshots and measurements are in the separate release evidence bundle.
