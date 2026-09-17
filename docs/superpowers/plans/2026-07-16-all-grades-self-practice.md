# 全年级题库与自主练习 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让一至六年级均有原创、可解析、可随机的题库，并让学生在完成每日任务后按专题、题型和难度继续自主练习。

**Architecture:** 题库按年级拆分为独立模块，由统一入口聚合。自适应模块保留每日集逻辑，并新增独立的 `buildSelfPracticeSet` 过滤器；页面把每日任务和自主练习的会话状态分开存储。

**Tech Stack:** 原生微信小程序 WXML/WXSS/JavaScript，Node.js 内置 test runner。

## Global Constraints

- 仅使用原创、本地维护的人教版小学数学题目。
- 每题必须有题干、答案、提示、分步解析、知识点总结和易错点总结。
- 全局题干唯一；不复用摸底题作为每日练习题。
- 每个年级至少 32 道摸底题和 48 道每日练习题，三种题型、三个难度都要覆盖。
- 自主练习不改变每日任务题目、完成数或日期。

---

### Task 1: 建立全年级题目契约与校验

**Files:**
- Modify: `miniprogram/utils/question-bank.js`
- Modify: `miniprogram/utils/question-bank-manifest.js`
- Modify: `tests/question-bank.test.js`

**Interfaces:**
- Produces: `validateQuestion(question)` 验证 `knowledgeSummary`、`mistakeSummary`、三类题型和分步解析。
- Produces: `questionBankManifest.enabledGrades` 为 `[1, 2, 3, 4, 5, 6]`。

- [ ] **Step 1: 写失败测试**

```js
test('every enabled grade has unique explained practice questions', () => {
  [1, 2, 3, 4, 5, 6].forEach((grade) => {
    const questions = practiceQuestions.filter((item) => item.grade === grade);
    assert.ok(questions.length >= 48);
    assert.deepEqual([...new Set(questions.map((item) => item.type))].sort(), ['choice', 'fill', 'problem']);
    assert.ok(questions.every((item) => item.knowledgeSummary && item.mistakeSummary.length));
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/question-bank.test.js`
Expected: FAIL，因为目前只有四年级题库且没有知识点总结字段。

- [ ] **Step 3: 实现最小契约改动**

```js
const requiredFields = ['grade', 'term', 'unit', 'knowledgePoint', 'type', 'difficulty', 'prompt', 'answer', 'hint', 'knowledgeSummary', 'mistakeSummary'];
```

并将清单启用年级和题量更新为真实的聚合结果。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/question-bank.test.js`
Expected: 契约测试通过，或只因全年级内容尚未加入而保留预期失败。

### Task 2: 按年级增加原创题库

**Files:**
- Create: `miniprogram/utils/question-bank-grade-1.js`
- Create: `miniprogram/utils/question-bank-grade-2.js`
- Create: `miniprogram/utils/question-bank-grade-3.js`
- Create: `miniprogram/utils/question-bank-grade-5.js`
- Create: `miniprogram/utils/question-bank-grade-6.js`
- Modify: `miniprogram/utils/question-bank-content.js`
- Modify: `miniprogram/utils/question-bank.js`
- Modify: `tests/question-bank.test.js`

**Interfaces:**
- Each grade module exports `{ diagnosticQuestions, practiceQuestions }`.
- Every module uses shared `createQuestion({ grade, ... })` and returns grade-correct metadata.

- [ ] **Step 1: 写失败测试**

```js
test('diagnostic questions are grade scoped with eight four-variant slots', () => {
  [1, 2, 3, 4, 5, 6].forEach((grade) => {
    const questions = diagnosticQuestions.filter((item) => item.grade === grade);
    assert.equal(new Set(questions.map((item) => item.diagnosticSlot)).size, 8);
    assert.equal(questions.length, 32);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/question-bank.test.js`
Expected: FAIL，非四年级诊断题数量为零。

- [ ] **Step 3: 实现年级模块**

每个年级写 8 个上下册知识槽位，每槽位 4 个难度递进变式；每日练习写至少 16 道选择、16 道填空、16 道应用大题，题干、答案、解析、知识总结和易错提醒均由题目本身提供。

- [ ] **Step 4: 运行题库测试确认通过**

Run: `node --test tests/question-bank.test.js`
Expected: 六个年级均达到 32 道摸底题和 48 道练习题，题干全局唯一。

### Task 3: 开放年级选择并按年级摸底

**Files:**
- Modify: `miniprogram/utils/learning-settings.js`
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `miniprogram/pages/test/test.js`
- Modify: `tests/adaptive.test.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- `gradeOptions` 中 1 到 6 均为 `available: true`。
- `buildDiagnosticSet(bank, profile, context)` 与每日集一样按 `context.grade` 过滤。

- [ ] **Step 1: 写失败测试**

```js
test('selected grade controls diagnostic and daily questions', () => {
  const selected = buildDailySet(practiceQuestions, { grade: 2, dailyGoal: 3 }, { grade: 2, goal: 3 });
  assert.ok(selected.every((item) => item.grade === 2));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/adaptive.test.js tests/storage.test.js`
Expected: FAIL，因为设置规范化目前只允许四年级。

- [ ] **Step 3: 实现年级过滤**

开放全部年级设置值；在摸底页面将诊断题筛选为当前年级，再保存本年级独立的诊断题 ID。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/adaptive.test.js tests/storage.test.js`
Expected: 二年级和六年级均只抽取本年级题目。

### Task 4: 自主练习筛选与独立会话

**Files:**
- Create: `miniprogram/pages/practice/practice.js`
- Create: `miniprogram/pages/practice/practice.json`
- Create: `miniprogram/pages/practice/practice.wxml`
- Create: `miniprogram/pages/practice/practice.wxss`
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/utils/adaptive.js`
- Modify: `miniprogram/utils/storage.js`
- Modify: `miniprogram/pages/home/home.js`
- Modify: `miniprogram/pages/home/home.wxml`
- Modify: `miniprogram/pages/question/question.js`
- Modify: `tests/adaptive.test.js`
- Modify: `tests/page-contract.test.js`

**Interfaces:**
- `buildSelfPracticeSet(bank, profile, filters)` accepts `{ grade, knowledgePoint, type, difficultyMode, goal }` and returns `{ questions, mode }`.
- `mode` is `new` when unseen filtered questions exist and `review` when the filtered bank is exhausted.
- `selfPracticeQuestionIds` is separate from `dailyQuestionIds`.

- [ ] **Step 1: 写失败测试**

```js
test('self practice filters by grade, topic, type and difficulty without changing daily ids', () => {
  const result = buildSelfPracticeSet(practiceQuestions, profile, {
    grade: 5, knowledgePoint: 'decimal_multiply', type: 'fill', difficultyMode: 'easy', goal: 3,
  });
  assert.ok(result.questions.every((item) => item.grade === 5 && item.type === 'fill' && item.difficulty === 1));
  assert.deepEqual(profile.dailyQuestionIds, originalDailyIds);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/adaptive.test.js tests/page-contract.test.js`
Expected: FAIL，因为不存在自主练习构建器和页面路由。

- [ ] **Step 3: 实现筛选页和独立会话**

筛选页显示当前年级专题、题型、难度和题量。题目页通过 `source=self-practice` 保存答题结果但不递增每日完成数；筛选无题时显示可恢复提示，耗尽时生成复习集并标记 `mode: 'review'`。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/adaptive.test.js tests/page-contract.test.js`
Expected: 筛选、耗尽复习和每日任务隔离全部通过。

### Task 5: 展示知识总结和易错提醒并回归

**Files:**
- Modify: `miniprogram/pages/question/question.wxml`
- Modify: `miniprogram/pages/question/question.wxss`
- Modify: `miniprogram/pages/analysis/analysis.js`
- Modify: `miniprogram/pages/analysis/analysis.wxml`
- Modify: `miniprogram/pages/analysis/analysis.wxss`
- Modify: `tests/page-contract.test.js`
- Modify: `docs/question-bank-catalog.md`

**Interfaces:**
- Question feedback consumes `question.knowledgeSummary` and `question.mistakeSummary`.
- Mistake analysis consumes the stored summaries in addition to `reason` and `solutionSteps`.

- [ ] **Step 1: 写失败测试**

```js
test('question and analysis pages expose knowledge and mistake summaries', () => {
  assert.match(questionWxml, /知识点总结/);
  assert.match(questionWxml, /易错提醒/);
  assert.match(analysisWxml, /知识点总结/);
  assert.match(analysisWxml, /易错提醒/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/page-contract.test.js`
Expected: FAIL，因为页面尚未展示两个总结区块。

- [ ] **Step 3: 实现反馈区块和目录文档**

答题结果区显示“知识点总结”“易错提醒”；错题页同时显示本次错因、两个总结和重练入口。目录更新为六年级可用、按年级统计题量和自主练习规则。

- [ ] **Step 4: 运行完整回归**

Run: `node --test tests/*.test.js`
Expected: 所有测试通过，且没有题干重复、缺失解析或跨年级抽题。
