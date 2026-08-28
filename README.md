# Shotcraft Carousel 3D

一个独立、纯代码驱动的 `carousel-3d` 球星卡生成器。用户上传 3–8 张竖版图片，调整颜色、空间和运动参数，然后下载完整的 Remotion 源码与素材 ZIP。

这个仓库**只包含一张视觉卡片**：`carousel-3d`。它不包含 Video Shotcraft 的模板目录、模板索引或其他视觉效果。

## 功能

- 3–8 张 PNG / JPEG / WEBP 卡片上传、排序和删除
- 浏览器实时 CSS 3D 环形运动预览
- 主题色驱动的 OKLCH 自动配色
- 主背景、撞色光晕、主题光晕可单独覆盖或恢复跟随
- 顺时针 / 逆时针、速度、半径、透视和开场卡片控制
- 卡片尺寸、圆角、俯仰和图片适配控制
- 生成可复制代码和可下载 ZIP
- 输出固定为 1080×1920、30fps，并严格完成一整圈

## 本地运行

需要 Node.js 20 或更高版本。仓库本身没有第三方运行依赖。

```powershell
npm start
```

打开：<http://127.0.0.1:4762>

如需在同一局域网展示：

```powershell
npm start -- --lan
```

服务使用固定端口 `4762`，端口冲突时会直接失败，不会自动切换端口。

## 验证

```powershell
npm test
```

测试会确认：

- 仓库没有混入视觉模板库目录
- 页面只暴露 `carousel-3d` 工作流
- 颜色关系满足最低 AA 对比度
- Remotion 项目和 manifest 能正确生成
- ZIP 结构有效

## 生成项目

网页生成的 ZIP 中包含：

- `src/CardCarousel3D.tsx`
- `src/Root.tsx`
- `public/cards/`
- `project-manifest.json`
- 独立 `package.json`、README 和许可证文件

解压后运行：

```powershell
npm install
npm run start
```

在 Remotion Studio 中预览，或使用生成项目内的 `npm run render` 输出视频。

本仓库本身不会上传素材、渲染视频或调用 AI 服务。

## 来源与许可证

Carousel 3D 的运动结构基于 [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) 的 `carousel-3d` 参考实现整理。上游采用 Apache License 2.0，详见 [LICENSE](LICENSE) 和 [NOTICE.md](NOTICE.md)。
