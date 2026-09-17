# 小思路微信小程序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可在微信开发者工具中运行的四年级数学思维训练小程序，包含摸底、自适应每日三题、错题分析、游戏和成长记录。

**Architecture:** 原生微信小程序负责页面与本地交互；`question-bank.js` 保存结构化原创题；`adaptive.js` 负责评分、选题和难度调整；`storage.js` 封装微信本地存储。页面只消费这些纯逻辑模块，纯逻辑通过 Node 内置测试运行。

**Tech Stack:** WXML、WXSS、JavaScript、微信小程序本地存储、Node.js `node:test`。

---

### Task 1: 结构化题库

**Files:**
- Create: `miniprogram/utils/question-bank.js`
- Test: `tests/question-bank.test.js`

- [ ] 编写失败测试，验证摸底题数量、题型配比和必需字段。
- [ ] 运行 `npm test -- tests/question-bank.test.js`，预期因模块不存在而失败。
- [ ] 写入 8 道摸底题与不少于 9 道日常题，题型覆盖 `choice`、`fill`、`problem`。
- [ ] 再运行测试，预期全部通过。

### Task 2: 自适应与错题分析逻辑

**Files:**
- Create: `miniprogram/utils/adaptive.js`
- Test: `tests/adaptive.test.js`

- [ ] 编写失败测试，覆盖能力评分、每日三题配比、薄弱点优先、难度升降和错题记录。
- [ ] 运行测试并确认失败原因是函数尚不存在。
- [ ] 实现 `scoreDiagnostic`、`buildDailySet`、`updateSkillState` 和 `createMistakeRecord`。
- [ ] 再运行测试，预期全部通过。

### Task 3: 小程序骨架与页面

**Files:**
- Create: `project.config.json`
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/pages/*/*.{js,json,wxml,wxss}`
- Test: `tests/project-structure.test.js`

- [ ] 先写项目结构测试，验证 10 个声明路由及配套文件存在。
- [ ] 运行测试并确认因路由文件缺失而失败。
- [ ] 创建原生页面，复刻已选定的成长路线视觉，并实现页面跳转与题型状态。
- [ ] 运行结构测试，预期通过。

### Task 4: 本地进度闭环

**Files:**
- Create: `miniprogram/utils/storage.js`
- Modify: `miniprogram/pages/test/test.js`
- Modify: `miniprogram/pages/question/question.js`
- Modify: `miniprogram/pages/analysis/analysis.js`
- Modify: `miniprogram/pages/growth/growth.js`
- Test: `tests/storage.test.js`

- [ ] 编写失败测试，验证空数据回退、保存进度和错题去重。
- [ ] 实现可注入存储适配器的纯函数，并在页面中接入 `wx.getStorageSync` 与 `wx.setStorageSync`。
- [ ] 完成测试、重新运行全套测试。

### Task 5: 资源、编译和视觉验收

**Files:**
- Create: `miniprogram/assets/thinking-rabbit.png`
- Create: `miniprogram/assets/SOURCES.md`
- Create: `codex_showcase/preview-checklist.md`
- Create: `design-qa.md`

- [ ] 从公开来源重新下载 CC0 小兔子素材并记录来源。
- [ ] 导入微信开发者工具，检查配置、路由、资源和控制台。
- [ ] 走通摸底到错题分析的主流程并记录截图。
- [ ] 对照选定视觉稿检查 390px 宽度下的间距、颜色、文字和底部导航。
- [ ] 只有 `design-qa.md` 写明 `final result: passed` 后才完成交付。
