# 崇拜幻灯片格式统一工具 · church-slide-fixer

一个**纯浏览器端**的小工具：检查并统一 ProPresenter 7 演示文稿（`.proPlaylist`）里的字体，
修复「Windows 制作、Mac 播放」时常见的字体不一致问题。文件**不会上传任何服务器**。

## 解决什么问题

每周不同的人在 Windows 上用 ProPresenter 制作主日崇拜幻灯片，播放时用的是 Mac。常见问题：

- **字体在 Mac 上缺失** —— Windows 上用的品牌字体（如锐黑体 Tensentype RuiHeiJ）Mac 没装，
  ProPresenter 会自动替换成别的字体，导致上屏效果和制作时不一样。
- **字体元数据不一致** —— 同一个字体，家族名字段有时存显示名（`Tensentype RuiHeiJ`），
  有时存 PostScript 名（`Tensentype-RuiHeiJ-W4`），这种跨平台差异会让字体匹配出问题。

本工具会：

1. **统一字体** —— 把主内容文字统一映射到一个 Mac 系统自带的字体（默认 **PingFang SC 苹方**），
   计时器、字幕等非歌词元素保持不动。
2. **修复字体元数据** —— 消除 Windows/Mac 之间家族名不一致。
3. **（可选）统一字号** —— 默认**不改字号**；如需要可选择按同框 / 每篇 / 全局统一。

## 使用方法

打开网页 → 拖入 `.proPlaylist` 文件 → 查看检查报告 → 按需调整选项 → 点「应用并生成文件」→
下载修复后的文件。**原始文件不会被改动**，生成的是新文件。

> 建议先在 Mac 的 ProPresenter 里打开新文件确认显示正常，再替换原文件。

## 隐私

全部处理都在你的浏览器本地完成，教会的崇拜文件**不会离开你的电脑**，不上传、不缓存到任何服务器。

## 它是怎么工作的

`.proPlaylist` 是一个 ZIP，里面的 `.pro` 文档是 **Protocol Buffers 二进制**（没有公开的 schema）。
本工具用一个**无需 schema 的编解码器**：只改动认识的字段（字体名、家族名、字号，以及同步的 RTF 副本），
其余字节原样保留 —— 因此不会丢失任何未知数据，也不会破坏文件结构。这一无损特性有测试逐字节验证。

## 本地开发

```bash
npm install
npm run dev      # 本地开发服务器
npm run build    # 生产构建，输出到 dist/
npm test         # 运行测试
```

> 集成测试会读取 `.local-fixtures/` 下的真实 `.proPlaylist`（该目录已被 gitignore，**不会入库**）。
> 没有该文件时，相关集成测试会自动跳过。**请勿把真实崇拜文件提交到公开仓库。**

## 部署到 GitHub Pages

仓库已包含 `.github/workflows/deploy.yml`：推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 Pages。

一次性设置：仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
构建时 `BASE_PATH` 会自动取仓库名，站点地址为 `https://<用户名>.github.io/<仓库名>/`。

## 技术栈

Vite · React · TypeScript · Tailwind CSS · JSZip · Vitest。核心逻辑（`src/lib/`）与框架无关、可单测。
