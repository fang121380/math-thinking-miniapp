# 数学思维小程序

一个面向小学阶段的微信小程序数学练习与思维训练项目，包含自适应练习、诊断活动、学习旅程、进度记录和互动思维游戏。

## 功能

- 按年级和课程范围组织学习内容
- 诊断练习与自适应练习流程
- 每日练习、错题复习和学习里程碑
- 支持本地进度保存的数学思维游戏
- 自动内容审计与题源准入检查

## 本地运行

1. 使用微信开发者工具打开本仓库。
2. 从仓库根目录导入项目，`project.config.json` 会将开发者工具指向 `miniprogram/`。
3. 将 `touristappid` 替换为你自己的微信小程序 AppID。
4. 在微信开发者工具中点击“编译”。

项目不依赖后端服务，也不要求配置环境变量。

## 验证

请使用 Node.js 18 或更高版本：

```powershell
npm test
npm run audit:questions
```

`npm run prepare:upload` 会连续执行两项检查，是打包或分发新题库前的必经校验。

## 项目结构

```text
miniprogram/  小程序页面、资源和学习引擎
scripts/      题库审计与合规题源导入工具
tests/        Node.js 单元、契约和内容质量测试
docs/         课程、题源准入与质量保证文档
```

## 内容规范

当前题库由项目编写并依据课程结构生成，不复刻商业练习册或完整试卷。外部题目只有在具备明确兼容许可并完成教材映射后，才能进入审核流程。详见 [docs/question-source-admission.md](docs/question-source-admission.md)。

仓库明确排除未审核的外部题源候选、本地私有小程序配置、音频源文件工作稿和诊断日志。

## 参与贡献

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。题目内容修改必须通过题源准入和审计规则后才能合并。

## 许可证

源代码采用 [MIT 许可证](LICENSE)。随项目发布的媒体许可见 `miniprogram/assets/SOURCES.md`。

## 下载与安装包

下载 [数学思维小程序源码安装包](release/math-thinking-miniapp-source.zip)，解压后使用微信开发者工具导入。安装包不包含个人 AppID 和私有配置，请按“本地运行”章节配置后再编译。
