const fs = require('node:fs');
const path = require('node:path');
const { practiceQuestions, buildReviewSamples } = require('../../miniprogram/utils/question-bank');
const { getTextbookOption } = require('../../miniprogram/utils/textbook-catalog');

const samples = buildReviewSamples(practiceQuestions, { perGroup: 20 });
const sections = samples.reduce((result, question) => {
  const key = `${getTextbookOption(question.textbookId).label} ${question.grade}年级`;
  if (!result[key]) result[key] = [];
  result[key].push(question);
  return result;
}, {});

const lines = [
  '# Question Bank Review Sample',
  '',
  'Generated locally. This is an audit queue, not a claim of human review.',
  '',
];

Object.entries(sections).forEach(([label, questions]) => {
  lines.push(`## ${label}`, '');
  questions.forEach((question, index) => {
    lines.push(
      `${index + 1}. ${question.prompt}`,
      `   - Answer: ${question.answer}`,
      `   - Pattern: ${question.examPattern}; reference: ${question.sourceRegion}/${question.sourceYear}; status: ${question.reviewStatus}`,
      `   - Solution: ${question.solution.steps.join(' / ')}`,
      '',
    );
  });
});

fs.writeFileSync(path.join(__dirname, '..', 'question-bank-review-sample.md'), `${lines.join('\n')}\n`);
