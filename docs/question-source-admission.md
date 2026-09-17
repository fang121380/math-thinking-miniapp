# 题目来源准入规则

题库默认只收录 `sourceType: "project-original"` 的项目原创题。`sourceRegion`、`sourceYear` 和 `examPattern` 仅记录考法参考范围，不表示转载任何地区试卷或网络原题。

如确需录入外部题，唯一允许的类型为 `sourceType: "licensed-external"`，并且每题必须提供：

- `sourceName`、`sourceUrl`（HTTPS）和 `sourceId`；
- `sourceLicense`：仅可为 `CC0-1.0`、`CC-BY-4.0`、`CC-BY-SA-4.0`、`MIT`、`Public-Domain`、`Publisher-Written-Permission` 或 `Purchased-License`；
- `sourceRightsEvidence`（HTTPS 授权证据链接）和完整 `sourceAttribution`；
- 与题目一致的 `sourceTextbookMapping`：`textbookId`、`grade`、`editionUnitKey`；
- `reviewStatus` 与 `reviewedAt` 审校记录。

爬取题、未知授权题、无授权题、仅限非商用（`NC`）授权题一律不能通过 `npm run audit:questions`，也不能通过 `npm run prepare:upload` 上传。
