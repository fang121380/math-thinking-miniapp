const fs = require('node:fs');
const path = require('node:path');
const { practiceQuestions } = require('../../miniprogram/utils/question-bank');

const OUTPUT_PATH = path.join(__dirname, '..', 'qa', '2026-09-20-grade4-thinking-review-queue.md');

function renderGrade4ThinkingReviewReport(questions = practiceQuestions) {
  const rows = questions
    .filter((question) => question.id.startsWith('p-thinking-g4-'))
    .sort((left, right) => left.id.localeCompare(right.id));
  const lines = [
    '# 四年级上册思维题人工复核队列',
    '',
    '生成日期：2026-09-20。范围：人教版四年级上册 36 道代表题。',
    '',
    '> 本文件由脚本生成，是待人工复核队列，不代表教师或教研人员已经审核。勾选结果应由实际复核人员填写。',
    '',
    `待复核：${rows.length} 道；已确认：0 道。`,
    '',
  ];

  rows.forEach((question, index) => {
    const solution = question.solution || {};
    const options = Array.isArray(question.options) && question.options.length
      ? question.options.join(' / ')
      : '无';
    const mistakes = Array.isArray(question.misconception)
      ? question.misconception.join(' / ')
      : String(question.misconception || '未标注');
    lines.push(
      `## ${index + 1}. ${question.id}`,
      '',
      '- [ ] 待人工复核',
      `- 知识点：${question.knowledgePoint}；题型：${question.type}；思维任务：${question.taskType}`,
      `- 题目：${question.prompt}`,
      `- 选项：${options}`,
      `- 答案：${question.answer}`,
      `- 提示：${question.hint}`,
      `- 解析：${(solution.steps || []).join(' / ')}`,
      `- 易错点：${mistakes}`,
      '- [ ] 数学结论与答案正确',
      '- [ ] 题意清楚且无歧义',
      '- [ ] 难度符合四年级上册',
      '- [ ] 干扰项唯一且有效（非选择题勾选不适用）',
      '- [ ] 提示与解析能帮助学生理解',
      '',
    );
  });

  return `${lines.join('\n')}\n`;
}

function writeGrade4ThinkingReviewReport(outputPath = OUTPUT_PATH) {
  const report = renderGrade4ThinkingReviewReport();
  fs.writeFileSync(outputPath, report);
  return outputPath;
}

if (require.main === module) {
  writeGrade4ThinkingReviewReport();
}

module.exports = {
  OUTPUT_PATH,
  renderGrade4ThinkingReviewReport,
  writeGrade4ThinkingReviewReport,
};
