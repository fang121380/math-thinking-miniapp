# 本地开发环境

准备日期：2026-09-17。

## 已准备的环境

- 系统：macOS，Apple Silicon（arm64）。
- Node.js：v24.15.0；npm：12.0.2；Git：2.54.0。
- 微信开发者工具：ARM64 安装包版本 2.02.2608070，安装于 `/Applications/wechatwebdevtools.app`。
- 项目无 npm 第三方依赖，测试使用 Node.js 内置测试运行器，无需执行 `npm install`。
- 当前项目目录：`/Users/andrew/Documents/ChatGPT/梵数学`。

微信开发者工具安装包来自腾讯下载域名，SHA-256 与 Homebrew Cask 发布的校验值一致；应用通过 `codesign --verify --deep --strict` 检查。

## 源码来源

源码从上游仓库根目录的 `math-thinking-miniapp-source.zip` 展开，保留工作区原有 `.git`。

- 上游：<https://github.com/fang121380/math-thinking-miniapp>
- 下载时上游提交：`66d9c274d3b5555476b4700090e899e3467e8b14`
- 源码 ZIP SHA-256：`4361d7983491c7c38360e3efa1b3f7e09ce1dc62d9384f7b5c54bd2c80feadd7`

当前工作区直接维护展开后的源码、测试与 CI 工作流；尚未配置远程仓库。上游主要以 ZIP 交付，未来同步时需要比较包内源码。

开发和 CI 使用 `.nvmrc` 中的 Node.js 24。新检出先运行 `npm run setup`，从 `project.config.example.json` 生成本机配置。该命令保留已有配置；实际 AppID 留在 Git 忽略的 `project.config.json` 中。

## 验证命令

在项目根目录执行：

```sh
npm test
npm run audit:questions
npm run prepare:upload
```

首次环境验证结果：418 项测试通过；审计 21,261 道题，错误为 0。

## 打开小程序

1. 打开“微信开发者工具”，完成首次扫码登录（如工具要求）。
2. 导入上述项目根目录，不是单独导入 `miniprogram/`。
3. 配置中的 `miniprogramRoot` 已指向 `miniprogram/`。模板使用 `touristappid`，本机保留导入时设置的 AppID。真机预览和发布需要相应的小程序 AppID 与开发者权限。
4. 点击编译，检查页面、交互和音频。

用户已确认手动导入项目。命令行仍提示“服务端口已关闭”，尚未验证模拟器编译或真机运行。

在工具的“设置 → 安全设置”开启服务端口后，可使用：

```sh
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project "$PWD" --lang zh
```

如工具启用了 CLI 访问令牌，按工具提示在本机配置；不要把令牌、个人 AppID、私有项目配置或日志提交到仓库。
