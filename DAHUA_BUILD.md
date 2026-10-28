# 大话强化学习算法：维护与验证

这个独立系列只有五篇原文：DDPG、PPO、TD3、SAC、TQC。系列导读来自原稿的 README，不扩写既有论文或英语系列。

- `dahua-rl/posts/`：原始 UTF-8 Markdown 与 4 组 PNG/SVG。文件名、内容及相对图片结构原样保留。
- `dahua-rl/source-manifest.json`：原始 ZIP 与 14 个文件的 SHA256；构建前逐一检查。
- `dahua-rl/catalog.json`：五篇的公开路径、原文标题和导读中的问题。
- `tools/build-dahua.cjs`：复用本站 Markdown/本地 KaTeX 渲染器，生成导读与五篇静态 HTML。只转换发布后的相对路径，并将连续的 `[1][2]` 分别链接到各自参考资料，防止被 Markdown 误合为一个引用；不修改原稿。

```sh
npm ci
npm run build:dahua
npm run test:dahua
git diff --check
```

`npm run build` 和 `npm test` 已包含新系列。搜索与 sitemap 仍由 `tools/build-site-data.py` 统一生成；新系列不计入既有论文审校、论文数量或相关论文图。

正文和全部 217 个公式在构建时写入 HTML，无需 JavaScript 或 CDN 即可阅读。导读和 TD3 关系图使用与本站一致的 Mermaid CDN；无网络时保留可读的关系图源码。静态篇间导航、引用、原图不依赖脚本。

自动检查覆盖源文件逐字一致、6 页的标题/章节/公式/引用/图片/本地链接、篇间导航、首页入口、搜索、浅色/深色样式及移动菜单。DOM 测试不替代真实浏览器的像素与横向溢出检查。
