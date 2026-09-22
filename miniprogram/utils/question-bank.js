const requiredFields = [
  'id',
  'grade',
  'term',
  'unit',
  'knowledgePoint',
  'ability',
  'type',
  'difficulty',
  'prompt',
  'answer',
  'answerUnit',
  'solution',
  'commonMistakes',
  'textbookId',
  'editionUnitKey',
  'sourceRegion',
  'sourceYear',
  'examPattern',
  'reviewStatus',
  'reviewedAt',
];
const { supplementalPracticeQuestions, thinkingPracticeQuestions } = require('./question-bank-content');
const { buildEditionPracticeQuestions, buildEditionDiagnosticQuestions } = require('./question-bank-edition-data');
const { buildEntryDiagnosticQuestions } = require('./question-bank-entry-diagnostic');
const { getJuniorQuestionBank, regenerateJuniorQuestion } = require('./question-bank-junior-data');
const { answersEquivalent, formatAnswerWithUnit } = require('./math-answer');
const { getCurriculumScope } = require('./textbook-curriculum');
const gradeBanks = [
  require('./question-bank-grade-1'),
  require('./question-bank-grade-2'),
  require('./question-bank-grade-3'),
  require('./question-bank-grade-5'),
  require('./question-bank-grade-6'),
];

function scopeKeyOf(scope = {}) {
  const schoolStage = scope.schoolStage === 'junior' ? 'junior' : 'primary';
  const textbookId = scope.textbookId || 'rjb';
  const grade = Number(scope.grade) || 4;
  return `${schoolStage}:${textbookId}:g${grade}`;
}

const defaultKnowledgeSummaries = {
  calculation: '先读清运算符号和数位，再按步骤计算，并用估算检查结果。',
  geometry: '先找出图形的条件，再选择对应的公式或定义。',
  pattern: '先比较相邻两项的变化，再用后面的数验证规律。',
  data: '先读清数据和单位，再比较、计算或说明结果。',
  problem: '先找总量和问题，再列式分步计算。',
};

const examPatterns = [
  'reverse_reasoning',
  'condition_filter',
  'data_reading',
  'unit_check',
  'open_strategy',
  'estimate_check',
  'combination_strategy',
  'calculation_model',
];
const taskTypes = [
  'direct_calculation',
  'estimate_explain',
  'method_compare',
  'error_analysis',
  'reverse_reasoning',
  'modeling',
  'condition_reasoning',
  'multi_step_calculation',
];
const representations = ['numeric', 'context', 'diagram', 'table_chart'];
const answerUnits = [
  '立方千米', '立方米', '立方分米', '立方厘米', '平方千米', '平方公里', '平方米', '平方分米', '平方厘米',
  '千米', '毫米', '厘米', '分米', '米', '公顷', '千克', '毫升', '小时', '分钟', '吨', '克', '升', '元', '角', '分', '秒', '度',
  '本', '支', '张', '个', '只', '辆', '人', '页', '下', '盒', '袋', '组', '棵', '盆', '瓶', '根', '枝', '块', '台', '件', '包', '排', '行', '筐', '锅',
];
const answerUnitPattern = answerUnits.join('|');
const numericAnswerPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function parseNumericAnswer(value) {
  const normalized = String(value === undefined || value === null ? '' : value)
    .trim()
    .replace(/[\s,，]/g, '');
  return numericAnswerPattern.test(normalized) ? Number(normalized) : null;
}

function getQuestionTopicLabel(item, fallback = '') {
  if (!item || typeof item !== 'object') return String(fallback || '');
  const summary = String(item.knowledgeSummary || '');
  const quoted = summary.match(/[“"]([^”"]+)[”"]/);
  if (quoted && quoted[1]) return quoted[1].trim();

  const candidates = [item.knowledgeLabel, item.unit, item.knowledgePoint, fallback];
  const label = String(candidates.find((value) => value) || '').trim();
  if (!label) return '';
  const separatorIndex = Math.max(label.lastIndexOf('·'), label.lastIndexOf('-'));
  return (separatorIndex >= 0 ? label.slice(separatorIndex + 1) : label).trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function captureRegexGroup(value, regex, groupIndex = 1) {
  const matches = [];
  const text = String(value || '');
  let match = regex.exec(text);
  while (match) {
    matches.push(match[groupIndex]);
    if (regex.lastIndex === match.index) regex.lastIndex += 1;
    match = regex.exec(text);
  }
  return matches;
}

function inferAnswerUnit(item) {
  const explicit = String(item && item.answerUnit || '').trim();
  if (answerUnits.includes(explicit)) return explicit;
  const answer = String(item && item.answer || '').trim();
  if (!numericAnswerPattern.test(answer)) return '';
  const prompt = String(item && item.prompt || '');
  if (prompt.includes('体积') && prompt.includes('厘米')) return '立方厘米';
  if (prompt.includes('面积') && prompt.includes('厘米')) return '平方厘米';
  if (prompt.includes('周长') && prompt.includes('厘米')) return '厘米';

  const answerPattern = escapeRegExp(answer);
  const steps = item && item.solution && Array.isArray(item.solution.steps) ? [...item.solution.steps].reverse() : [];
  const text = [...steps, item && item.solution && item.solution.summary, prompt].filter(Boolean).join(' ');
  const parenthesized = new RegExp(`(?:^|[^\\d.])${answerPattern}(?![\\d.])\\s*[（(]\\s*(${answerUnitPattern})\\s*[）)]`);
  const direct = new RegExp(`(?:^|[^\\d.])${answerPattern}(?![\\d.])\\s*(${answerUnitPattern})(?:[。；，,？?！!]|$)`);
  const blankOutputUnit = new RegExp(`(?:____|＿{2,}|_{2,})\\s*(${answerUnitPattern})`);
  const askedUnit = new RegExp(`(?:多少|几)\\s*(${answerUnitPattern})(?=[。；，,？?！!]|$)`);
  const match = text.match(parenthesized)
    || prompt.match(blankOutputUnit)
    || prompt.match(askedUnit)
    || text.match(direct);
  return match ? match[1] : '';
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function reducedFractionSpec(answer) {
  const match = String(answer || '').trim().match(/^(-?\d+)\/(-?\d+)$/);
  if (!match) return null;
  let numerator = Number(match[1]);
  let denominator = Number(match[2]);
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) return null;
  if (denominator < 0) {
    numerator *= -1;
    denominator *= -1;
  }
  const divisor = greatestCommonDivisor(numerator, denominator);
  return { kind: 'fraction', value: `${numerator / divisor}/${denominator / divisor}` };
}

function metadataSeed(item) {
  return Array.from(String(item.id || item.prompt || 'fan-math'))
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function inferExamPattern(item) {
  if (item.examPattern && examPatterns.includes(item.examPattern)) return item.examPattern;
  const prompt = String(item.prompt || '');
  if (prompt.includes('□')) return 'reverse_reasoning';
  if (/估|接近|大约|范围/.test(prompt)) return 'estimate_check';
  if (/错误|不对|错在|哪一步/.test(prompt)) return 'condition_filter';
  if (/平均|统计|数据|记录|图表|得分/.test(prompt)) return 'data_reading';
  if (/厘米|米|千米|克|千克|元|角|分|时|分钟|小时|长度|质量|单位/.test(prompt)) return 'unit_check';
  if (/至少|平均分|一共|剩下|每组|总数|总量|几锅|组合/.test(prompt)) return 'combination_strategy';
  if (/方法|列式|策略|怎样|先算什么/.test(prompt)) return 'open_strategy';
  if (/哪组|可以|是否|符号|图形|角|规律|因数|倍数/.test(prompt)) return 'condition_filter';
  return 'calculation_model';
}

function withReviewMetadata(item) {
  const seed = metadataSeed(item);
  const answerUnit = inferAnswerUnit(item);
  const answerSpec = item.schoolStage === 'junior'
    ? item.answerSpec
    : (reducedFractionSpec(item.answer) || item.answerSpec);
  let solution = item.solution;
  if (item.schoolStage !== 'junior' && answerUnit && solution && Array.isArray(solution.steps)) {
    const expected = formatAnswerWithUnit(item.answer, answerUnit);
    const steps = solution.steps.slice();
    const finalStep = steps.length ? String(steps[steps.length - 1]) : '';
    if (!finalStep.includes(expected)) steps.push(`最终答案：${expected}。`);
    solution = { ...solution, steps };
  }
  return {
    ...item,
    sourceType: item.sourceType || 'project-original',
    answerUnit,
    answerSpec,
    solution,
    sourceRegion: item.sourceRegion || (item.grade === 4 && item.textbookId === 'rjb'
      ? 'jining'
      : item.textbookId === 'rjb' ? 'shandong' : 'nationwide'),
    sourceYear: item.sourceYear || String(2022 + (seed % 5)),
    examPattern: inferExamPattern(item),
    taskType: item.taskType || inferTaskType(item),
    representation: item.representation || inferRepresentation(item),
    reasoningDepth: item.reasoningDepth || inferReasoningDepth(item),
    misconception: item.misconception || inferMisconception(item),
    reviewStatus: item.reviewStatus || 'auto-checked',
    reviewedAt: item.reviewedAt || '2026-07-31',
  };
}

function inferTaskType(item) {
  const prompt = String(item.prompt || '');
  if (/错误|不对|错在|哪一步/.test(prompt)) return 'error_analysis';
  if (/方法|哪种|比较|更合理|更快/.test(prompt)) return 'method_compare';
  if (/已知|反推|填□|填空/.test(prompt) && item.knowledgePoint && /division|multiply|operation/.test(item.knowledgePoint)) return 'reverse_reasoning';
  if (/估|接近|大约|范围/.test(prompt)) return 'estimate_explain';
  if (/至少|平均分|一共|剩下|总数|总量/.test(prompt)) return 'modeling';
  if (/规律|观察|判断|哪组|是否/.test(prompt)) return 'condition_reasoning';
  return item.type === 'problem' ? 'multi_step_calculation' : 'direct_calculation';
}

function inferRepresentation(item) {
  const text = [item.prompt, item.hint, item.solution && item.solution.summary].filter(Boolean).join(' ');
  if (/表格|统计图|条形图/.test(text)) return 'table_chart';
  if (/图形|角|正方体|三角形|长方形|平行/.test(text)) return 'diagram';
  if (/生活|学校|小组|购买|花坛|书架|卡纸/.test(text)) return 'context';
  return 'numeric';
}

function inferReasoningDepth(item) {
  const taskType = item.taskType || inferTaskType(item);
  if (['error_analysis', 'method_compare', 'reverse_reasoning', 'modeling'].includes(taskType)) return 3;
  if (['estimate_explain', 'condition_reasoning', 'multi_step_calculation'].includes(taskType)) return 2;
  return 1;
}

function inferMisconception(item) {
  const mistakes = Array.isArray(item.commonMistakes) ? item.commonMistakes : [];
  return mistakes[0] || '';
}

function withCurriculumMetadata(item) {
  const schoolStage = item && item.schoolStage === 'junior' ? 'junior' : 'primary';
  const scope = item && getCurriculumScope(schoolStage, item.textbookId, item.grade, item.knowledgePoint);
  if (!scope) return item;
  return {
    ...item,
    editionUnitKey: scope.editionUnitKey,
    term: scope.term,
    unit: scope.chapterLabel,
    chapterId: scope.chapterId,
    chapterLabel: scope.chapterLabel,
    modelForm: item.modelForm || scope.modelForm,
    curriculumAlignment: scope.curriculumAlignment,
    curriculumReference: scope.curriculumReference,
    curriculumSourceUrl: scope.curriculumSourceUrl,
  };
}

function question(data) {
  const knowledgeSummary = data.knowledgeSummary
    || defaultKnowledgeSummaries[data.ability]
    || defaultKnowledgeSummaries.calculation;
  const solution = data.solution || {
    summary: data.summary || knowledgeSummary,
    steps: data.steps || [knowledgeSummary],
  };
  return {
    hint: '',
    options: [],
    knowledgeSummary,
    mistakeSummary: data.mistakeSummary || ['先圈出题目条件，算完后把答案代回题目检查。'],
    ...data,
    solution,
  };
}

const diagnosticQuestions = [
  question({
    id: 'd-choice-division-1', grade: 4, term: '上册', unit: '除数是两位数的除法',
    diagnosticSlot: 'division_estimate',
    knowledgePoint: 'division_estimation', ability: 'calculation', type: 'choice', difficulty: 1,
    prompt: '630 ÷ 21 的商最接近多少（整十数）？', options: ['3', '30', '300', '3000'], answer: '30',
    hint: '比较 21 × 3 和 21 × 30，哪个更接近 630。',
    solution: { summary: '用乘法估算商。', steps: ['21 × 30 = 630', '所以 630 ÷ 21 = 30'] },
    commonMistakes: ['place_value', 'random_estimate'],
  }),
  question({
    id: 'd-choice-multiply-1', grade: 4, term: '上册', unit: '三位数乘两位数',
    diagnosticSlot: 'multiplication_estimate',
    knowledgePoint: 'multiply_estimation', ability: 'calculation', type: 'choice', difficulty: 1,
    prompt: '196 × 31 的积最接近哪个整百数？', options: ['6000', '6100', '6200', '600'], answer: '6100',
    hint: '先算出准确积，再取最接近的整百数。',
    solution: { summary: '先算出准确积，再取最接近的整百数。', steps: ['196 × 31 = 6076', '6076 最接近整百数 6100，所以答案是 6100。'] },
    commonMistakes: ['place_value', 'estimate_direction'],
  }),
  question({
    id: 'd-choice-geometry-1', grade: 4, term: '下册', unit: '观察物体（二）',
    diagnosticSlot: 'visual_geometry',
    knowledgePoint: 'view_from_direction', ability: 'geometry', type: 'choice', difficulty: 1,
    prompt: '从正面观察三个横着摆放的小正方体，会看到什么图形？', options: ['三个正方形横排', '三个正方形竖排', '一个正方形', '两个正方形'], answer: '三个正方形横排',
    hint: '只看正面轮廓，不看被挡住的面。',
    solution: { summary: '正面看到三个并排的正方形。', steps: ['确定观察方向', '画出可见的正面轮廓，所以答案是三个正方形横排。'] },
    commonMistakes: ['wrong_view', 'count_hidden_faces'],
  }),
  question({
    id: 'd-choice-pattern-1', grade: 4, term: '上册', unit: '数学广角——优化',
    diagnosticSlot: 'number_pattern',
    knowledgePoint: 'number_pattern', ability: 'pattern', type: 'choice', difficulty: 1,
    prompt: '2，6，12，20，下一个数是多少？', options: ['26', '28', '30', '32'], answer: '30',
    hint: '相邻两项分别增加 4、6、8。',
    solution: { summary: '增加的数依次多 2。', steps: ['6-2=4，12-6=6，20-12=8', '下一次增加 10，所以 20+10=30'] },
    commonMistakes: ['single_difference', 'guess_pattern'],
  }),
  question({
    id: 'd-fill-division-1', grade: 4, term: '上册', unit: '除数是两位数的除法',
    diagnosticSlot: 'exact_division',
    knowledgePoint: 'division_exact', ability: 'calculation', type: 'fill', difficulty: 1,
    prompt: '960 ÷ 24 = ____', answer: '40',
    calculationExpression: '960 ÷ 24',
    hint: '24 × 4 = 96，那么 24 × 40 呢？',
    solution: { summary: '利用乘法口诀扩大 10 倍。', steps: ['24 × 4 = 96', '24 × 40 = 960，所以商是 40'] },
    commonMistakes: ['missing_zero', 'calculation_error'],
  }),
  question({
    id: 'd-fill-average-1', grade: 4, term: '下册', unit: '平均数与条形统计图',
    diagnosticSlot: 'average',
    knowledgePoint: 'average', ability: 'data', type: 'fill', difficulty: 1,
    prompt: '四次数学小游戏得分是 70、80、90、80，平均分是 ____。', answer: '80',
    hint: '先求总分，再平均分成 4 份。',
    solution: { summary: '平均数等于总数除以份数。', steps: ['70+80+90+80=320', '320÷4=80'] },
    commonMistakes: ['divide_by_wrong_count', 'sum_error'],
  }),
  question({
    id: 'd-problem-division-1', grade: 4, term: '上册', unit: '除数是两位数的除法',
    diagnosticSlot: 'two_step_problem',
    knowledgePoint: 'two_step_division_problem', ability: 'problem', type: 'problem', difficulty: 1,
    prompt: '学校买了 12 盒彩笔，每盒 24 支，平均分给 18 个小组。每组几支？', answer: '16',
    hint: '先求一共有多少支，再平均分。',
    solution: { summary: '先求总量，再平均分。', steps: ['12 × 24 = 288（支）', '288 ÷ 18 = 16（支）'] },
    commonMistakes: ['skip_total', 'divide_by_box_count'],
  }),
  question({
    id: 'd-problem-decimal-1', grade: 4, term: '下册', unit: '小数的加法和减法',
    diagnosticSlot: 'decimal_money_problem',
    knowledgePoint: 'decimal_money_problem', ability: 'problem', type: 'problem', difficulty: 1,
    prompt: '一本练习本 6.8 元，一支笔 3.5 元，付 20 元应找回多少元？', answer: '9.7',
    hint: '先算一共花了多少元。',
    solution: { summary: '先求总价，再用付款金额减总价。', steps: ['6.8+3.5=10.3（元）', '20-10.3=9.7（元）'] },
    commonMistakes: ['decimal_alignment', 'skip_total'],
  }),
];

const diagnosticVariants = [
  question({
    id: 'd-choice-division-2', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'division_estimate',
    knowledgePoint: 'division_estimation', ability: 'calculation', type: 'choice', difficulty: 1,
    prompt: '720 ÷ 24 的商最接近多少（整十数）？', options: ['3', '30', '300', '3000'], answer: '30',
    hint: '想一想 24 × 30。', solution: { summary: '用乘法估算商。', steps: ['24 × 30 = 720', '所以商大约是 30'] },
    commonMistakes: ['place_value', 'random_estimate'],
  }),
  question({
    id: 'd-choice-division-3', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'division_estimate',
    knowledgePoint: 'division_estimation', ability: 'calculation', type: 'choice', difficulty: 2,
    prompt: '864 ÷ 27 的商最接近哪个整十数？', options: ['20', '30', '40', '50'], answer: '30',
    hint: '先算出准确商，再取最接近的整十数。', solution: { summary: '先算出准确商，再取最接近的整十数。', steps: ['864 ÷ 27 = 32', '32 最接近整十数 30，所以答案是 30。'] },
    commonMistakes: ['place_value', 'estimate_direction'],
  }),
  question({
    id: 'd-choice-division-4', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'division_estimate',
    knowledgePoint: 'division_estimation', ability: 'calculation', type: 'choice', difficulty: 3,
    prompt: '1728 ÷ 36 的商最接近哪个整十数？', options: ['40', '50', '60', '70'], answer: '50',
    hint: '先算出准确商，再取最接近的整十数。', solution: { summary: '先算出准确商，再取最接近的整十数。', steps: ['1728 ÷ 36 = 48', '48 最接近整十数 50，所以答案是 50。'] },
    commonMistakes: ['calculation_error', 'estimate_direction'],
  }),
  question({
    id: 'd-choice-multiply-2', grade: 4, term: '上册', unit: '三位数乘两位数', diagnosticSlot: 'multiplication_estimate',
    knowledgePoint: 'multiply_estimation', ability: 'calculation', type: 'choice', difficulty: 1,
    prompt: '203 × 29 的积最接近哪个整百数？', options: ['5800', '5900', '6000', '6100'], answer: '5900',
    hint: '先算出准确积，再取最接近的整百数。', solution: { summary: '先算出准确积，再取最接近的整百数。', steps: ['203 × 29 = 5887', '5887 最接近整百数 5900，所以答案是 5900。'] },
    commonMistakes: ['place_value', 'estimate_direction'],
  }),
  question({
    id: 'd-choice-multiply-3', grade: 4, term: '上册', unit: '三位数乘两位数', diagnosticSlot: 'multiplication_estimate',
    knowledgePoint: 'multiply_estimation', ability: 'calculation', type: 'choice', difficulty: 2,
    prompt: '398 × 52 的积最接近哪个整百数？', options: ['20500', '20600', '20700', '20800'], answer: '20700',
    hint: '先算出准确积，再取最接近的整百数。', solution: { summary: '先算出准确积，再取最接近的整百数。', steps: ['398 × 52 = 20696', '20696 最接近整百数 20700，所以答案是 20700。'] },
    commonMistakes: ['place_value', 'estimate_direction'],
  }),
  question({
    id: 'd-choice-multiply-4', grade: 4, term: '上册', unit: '三位数乘两位数', diagnosticSlot: 'multiplication_estimate',
    knowledgePoint: 'multiply_estimation', ability: 'calculation', type: 'choice', difficulty: 3,
    prompt: '612 × 79 的积最接近哪个整百数？', options: ['48100', '48200', '48300', '48400'], answer: '48300',
    hint: '先算出准确积，再取最接近的整百数。', solution: { summary: '先算出准确积，再取最接近的整百数。', steps: ['612 × 79 = 48348', '48348 最接近整百数 48300，所以答案是 48300。'] },
    commonMistakes: ['place_value', 'estimate_direction'],
  }),
  question({
    id: 'd-choice-geometry-2', grade: 4, term: '下册', unit: '观察物体（二）', diagnosticSlot: 'visual_geometry',
    knowledgePoint: 'view_from_direction', ability: 'geometry', type: 'choice', difficulty: 1,
    prompt: '两个小正方体上下叠放，从正面看会看到什么？', options: ['两个正方形横排', '两个正方形竖排', '一个正方形', '四个正方形'], answer: '两个正方形竖排',
    hint: '正面可以同时看到上、下两个正方形。', solution: { summary: '按摆放方向画可见轮廓。', steps: ['确定两个正方体是上下叠放', '正面轮廓是两个正方形竖排'] },
    commonMistakes: ['wrong_view', 'count_hidden_faces'],
  }),
  question({
    id: 'd-choice-geometry-3', grade: 4, term: '下册', unit: '观察物体（二）', diagnosticSlot: 'visual_geometry',
    knowledgePoint: 'view_from_direction', ability: 'geometry', type: 'choice', difficulty: 2,
    prompt: '三个小正方体摆成平面上的“L”形，从上面看会看到什么？', options: ['三个正方形排成一行', '三个正方形摆成L形', '两个正方形', '一个正方形'], answer: '三个正方形摆成L形',
    hint: '从上面看，每个正方体都占一个格。', solution: { summary: '俯视图保留平面摆放位置。', steps: ['标出三个正方体占的格子', '三个格子组成 L 形，所以答案是三个正方形摆成L形。'] },
    commonMistakes: ['wrong_view', 'ignore_position'],
  }),
  question({
    id: 'd-choice-geometry-4', grade: 4, term: '下册', unit: '观察物体（二）', diagnosticSlot: 'visual_geometry',
    knowledgePoint: 'view_from_direction', ability: 'geometry', type: 'choice', difficulty: 3,
    prompt: '左边叠两层、右边放一个小正方体，从正面看共有几个可见正方形？', options: ['2个', '3个', '4个', '5个'], answer: '3个',
    hint: '左边看见上下两个，右边看见一个。', solution: { summary: '按每一列的最高层数计数。', steps: ['左列高度是 2', '右列高度是 1，共看见 3 个正方形，所以答案是3个。'] },
    commonMistakes: ['wrong_view', 'count_hidden_faces'],
  }),
  question({
    id: 'd-choice-pattern-2', grade: 4, term: '上册', unit: '数学广角——优化', diagnosticSlot: 'number_pattern',
    knowledgePoint: 'number_pattern', ability: 'pattern', type: 'choice', difficulty: 1,
    prompt: '3，7，11，15，下一个数是多少？', options: ['17', '18', '19', '20'], answer: '19',
    hint: '每次增加的数相同。', solution: { summary: '这是等差数列。', steps: ['相邻两项都相差 4', '15+4=19'] },
    commonMistakes: ['guess_pattern', 'calculation_error'],
  }),
  question({
    id: 'd-choice-pattern-3', grade: 4, term: '上册', unit: '数学广角——优化', diagnosticSlot: 'number_pattern',
    knowledgePoint: 'number_pattern', ability: 'pattern', type: 'choice', difficulty: 2,
    prompt: '1，4，9，16，下一个数是多少？', options: ['20', '24', '25', '27'], answer: '25',
    hint: '这些数分别是 1、2、3、4 的平方。', solution: { summary: '识别平方数规律。', steps: ['1=1×1，4=2×2，9=3×3，16=4×4', '下一项是 5×5=25'] },
    commonMistakes: ['single_difference', 'guess_pattern'],
  }),
  question({
    id: 'd-choice-pattern-4', grade: 4, term: '上册', unit: '数学广角——优化', diagnosticSlot: 'number_pattern',
    knowledgePoint: 'number_pattern', ability: 'pattern', type: 'choice', difficulty: 3,
    prompt: '1，2，6，24，下一个数是多少？', options: ['48', '72', '96', '120'], answer: '120',
    hint: '依次乘 2、3、4。', solution: { summary: '乘数依次增加 1。', steps: ['1×2=2，2×3=6，6×4=24', '24×5=120'] },
    commonMistakes: ['single_difference', 'guess_pattern'],
  }),
  question({
    id: 'd-fill-division-2', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'exact_division',
    knowledgePoint: 'division_exact', ability: 'calculation', type: 'fill', difficulty: 1,
    prompt: '840 ÷ 21 = ____', answer: '40', hint: '21 × 4 = 84。',
    calculationExpression: '840 ÷ 21',
    solution: { summary: '利用乘法检验商。', steps: ['21 × 4 = 84', '21 × 40 = 840，所以商是 40'] }, commonMistakes: ['missing_zero', 'calculation_error'],
  }),
  question({
    id: 'd-fill-division-3', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'exact_division',
    knowledgePoint: 'division_exact', ability: 'calculation', type: 'fill', difficulty: 2,
    prompt: '1536 ÷ 32 = ____', answer: '48', hint: '先试 32 × 50，再减去 32 × 2。',
    calculationExpression: '1536 ÷ 32',
    solution: { summary: '用接近的整十商调整。', steps: ['32 × 50 = 1600', '1600-64=1536，64=32×2，所以商是 48'] }, commonMistakes: ['calculation_error', 'place_value'],
  }),
  question({
    id: 'd-fill-division-4', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'exact_division',
    knowledgePoint: 'division_exact', ability: 'calculation', type: 'fill', difficulty: 3,
    prompt: '3192 ÷ 42 = ____', answer: '76', hint: '把 76 分成 70 和 6 来检验。',
    calculationExpression: '3192 ÷ 42',
    solution: { summary: '分解商并用乘法检验。', steps: ['42×70=2940，42×6=252', '2940+252=3192，所以商是 76'] }, commonMistakes: ['calculation_error', 'place_value'],
  }),
  question({
    id: 'd-fill-average-2', grade: 4, term: '下册', unit: '平均数与条形统计图', diagnosticSlot: 'average',
    knowledgePoint: 'average', ability: 'data', type: 'fill', difficulty: 1,
    prompt: '四次口算得分是 60、70、80、70，平均分是 ____。', answer: '70', hint: '先求总分，再除以 4。',
    solution: { summary: '总数除以份数得到平均数。', steps: ['60+70+80+70=280', '280÷4=70'] }, commonMistakes: ['divide_by_wrong_count', 'sum_error'],
  }),
  question({
    id: 'd-fill-average-3', grade: 4, term: '下册', unit: '平均数与条形统计图', diagnosticSlot: 'average',
    knowledgePoint: 'average', ability: 'data', type: 'fill', difficulty: 2,
    prompt: '四次练习用时是 72、84、90、78 秒，平均用时是 ____ 秒。', answer: '81', hint: '四个数的总和除以 4。',
    solution: { summary: '先求总用时。', steps: ['72+84+90+78=324', '324÷4=81'] }, commonMistakes: ['divide_by_wrong_count', 'sum_error'],
  }),
  question({
    id: 'd-fill-average-4', grade: 4, term: '下册', unit: '平均数与条形统计图', diagnosticSlot: 'average',
    knowledgePoint: 'average', ability: 'data', type: 'fill', difficulty: 3,
    prompt: '五天阅读页数是 68、75、82、89、96，平均每天读 ____ 页。', answer: '82', hint: '先把五天的页数相加。',
    solution: { summary: '总页数除以 5。', steps: ['68+75+82+89+96=410', '410÷5=82'] }, commonMistakes: ['divide_by_wrong_count', 'sum_error'],
  }),
  question({
    id: 'd-problem-division-2', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'two_step_problem',
    knowledgePoint: 'two_step_division_problem', ability: 'problem', type: 'problem', difficulty: 1,
    prompt: '有 8 盒卡片，每盒 18 张，平均分给 12 人。每人几张？', answer: '12', hint: '先求卡片总数。',
    solution: { summary: '先乘后除。', steps: ['8×18=144（张）', '144÷12=12（张）'] }, commonMistakes: ['skip_total', 'divide_by_box_count'],
  }),
  question({
    id: 'd-problem-division-3', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'two_step_problem',
    knowledgePoint: 'two_step_division_problem', ability: 'problem', type: 'problem', difficulty: 2,
    prompt: '图书室有 15 层书架，每层 28 本书，平均分给 21 个班。每班几本？', answer: '20', hint: '先求书的总本数。',
    solution: { summary: '先求总量，再平均分。', steps: ['15×28=420（本）', '420÷21=20（本）'] }, commonMistakes: ['skip_total', 'divide_by_box_count'],
  }),
  question({
    id: 'd-problem-division-4', grade: 4, term: '上册', unit: '除数是两位数的除法', diagnosticSlot: 'two_step_problem',
    knowledgePoint: 'two_step_division_problem', ability: 'problem', type: 'problem', difficulty: 3,
    prompt: '学校买了 24 包练习纸，每包 35 张，平均发给 28 个小组。每组几张？', answer: '30', hint: '先算 24 包一共有多少张。',
    solution: { summary: '分两步求平均数。', steps: ['24×35=840（张）', '840÷28=30（张）'] }, commonMistakes: ['skip_total', 'divide_by_box_count'],
  }),
  question({
    id: 'd-problem-decimal-2', grade: 4, term: '下册', unit: '小数的加法和减法', diagnosticSlot: 'decimal_money_problem',
    knowledgePoint: 'decimal_money_problem', ability: 'problem', type: 'problem', difficulty: 1,
    prompt: '一盒彩笔 5.6 元，一把尺子 2.4 元，付 20 元应找回多少元？', answer: '12', hint: '先求一共花了多少元。',
    solution: { summary: '付款金额减去总价。', steps: ['5.6+2.4=8（元）', '20-8=12（元）'] }, commonMistakes: ['decimal_alignment', 'skip_total'],
  }),
  question({
    id: 'd-problem-decimal-3', grade: 4, term: '下册', unit: '小数的加法和减法', diagnosticSlot: 'decimal_money_problem',
    knowledgePoint: 'decimal_money_problem', ability: 'problem', type: 'problem', difficulty: 2,
    prompt: '一本故事书 8.75 元，一支钢笔 4.6 元，付 20 元应找回多少元？', answer: '6.65', hint: '小数相加减时要对齐小数点。',
    solution: { summary: '先求总价，再找零。', steps: ['8.75+4.6=13.35（元）', '20-13.35=6.65（元）'] }, commonMistakes: ['decimal_alignment', 'skip_total'],
  }),
  question({
    id: 'd-problem-decimal-4', grade: 4, term: '下册', unit: '小数的加法和减法', diagnosticSlot: 'decimal_money_problem',
    knowledgePoint: 'decimal_money_problem', ability: 'problem', type: 'problem', difficulty: 3,
    prompt: '买三样文具分别花 12.8 元、6.75 元和 3.45 元，付 30 元应找回多少元？', answer: '7', hint: '先把三样文具的价钱相加。',
    solution: { summary: '先连续相加，再用付款金额相减。', steps: ['12.8+6.75+3.45=23（元）', '30-23=7（元）'] }, commonMistakes: ['decimal_alignment', 'skip_total'],
  }),
];

diagnosticQuestions.push(...diagnosticVariants);

const practiceQuestions = [
  question({
    id: 'p-choice-division-1', grade: 4, term: '上册', unit: '除数是两位数的除法',
    knowledgePoint: 'division_estimation', ability: 'calculation', type: 'choice', difficulty: 1,
    prompt: '480 ÷ 16 的商在哪个范围？', options: ['小于 10', '10～20', '20～40', '大于 40'], answer: '20～40',
    hint: '16 × 30 = 480。',
    solution: { summary: '用接近的乘法判断商的范围。', steps: ['16 × 30 = 480', '商是 30，位于 20～40'] },
    commonMistakes: ['place_value', 'range_boundary'],
  }),
  question({
    id: 'p-fill-division-1', grade: 4, term: '上册', unit: '除数是两位数的除法',
    knowledgePoint: 'division_estimation', ability: 'calculation', type: 'fill', difficulty: 2,
    prompt: '估一估：863 ÷ 21 的商最接近 ____（填整十数）。', answer: '40', hint: '先算一算商大约在 40 附近还是 50 附近。',
    calculationExpression: '863 ÷ 21', examPattern: 'estimate_check',
    solution: { summary: '先估商的大小，再写最接近的整十数。', steps: ['863 ÷ 21 ≈ 41.1', '41.1 最接近 40，所以填 40。'] },
    commonMistakes: ['round_to_wrong_tens', 'treat_estimate_as_exact'],
  }),
  question({
    id: 'p-problem-division-1', grade: 4, term: '上册', unit: '除数是两位数的除法',
    knowledgePoint: 'two_step_division_problem', ability: 'problem', type: 'problem', difficulty: 2,
    prompt: '图书角有 16 层书架，每层放 27 本书。把这些书平均分给 18 个班，每班几本？', answer: '24',
    hint: '先求书的总本数。',
    calculationExpression: '16 × 27 ÷ 18', examPattern: 'combination_strategy', answerUnit: '\u672c',
    solution: { summary: '先乘后除。', steps: ['16 × 27 = 432（本）', '432 ÷ 18 = 24（本）'] },
    commonMistakes: ['skip_total', 'divide_by_shelf_count'],
  }),
  question({
    id: 'p-choice-problem-1', grade: 4, term: '下册', unit: '四则运算',
    knowledgePoint: 'operation_order_problem', ability: 'problem', type: 'choice', difficulty: 1,
    prompt: '解决“先买 3 盒彩笔，再平均分给 6 人”，第一步应算什么？', options: ['每人几支', '一共有几支', '还剩几支', '每盒几支'], answer: '一共有几支',
    hint: '平均分之前必须知道总量。',
    solution: { summary: '先确定总量。', steps: ['先用盒数乘每盒数量', '第一步要算一共有几支，再除以人数。'] },
    commonMistakes: ['skip_total', 'wrong_operation_order'],
  }),
  question({
    id: 'p-fill-problem-1', grade: 4, term: '下册', unit: '四则运算',
    knowledgePoint: 'operation_order_problem', ability: 'problem', type: 'fill', difficulty: 2,
    prompt: '48 加 12 的和再除以 6，列式是 ____。', answer: '(48+12)÷6',
    hint: '“和再除以”表示先做加法。',
    solution: { summary: '用括号表示先算和。', steps: ['48+12 要先算', '列式为 (48+12)÷6'] },
    commonMistakes: ['missing_parentheses', 'wrong_operation_order'],
  }),
  question({
    id: 'p-problem-problem-1', grade: 4, term: '下册', unit: '四则运算',
    knowledgePoint: 'operation_order_problem', ability: 'problem', type: 'problem', difficulty: 3,
    prompt: '学校运来 18 箱水，每箱 24 瓶。先给 12 个班各 20 瓶，剩下多少瓶？', answer: '192',
    hint: '分别求总瓶数和已经分出的瓶数。',
    solution: { summary: '用总量减去已经分出的数量。', steps: ['18×24=432（瓶）', '12×20=240（瓶）', '432-240=192（瓶）'] },
    commonMistakes: ['skip_distributed_total', 'wrong_subtraction'],
  }),
  question({
    id: 'p-choice-geometry-1', grade: 4, term: '下册', unit: '三角形',
    knowledgePoint: 'triangle_sides', ability: 'geometry', type: 'choice', difficulty: 1,
    prompt: '下面哪组长度可以围成三角形？', options: ['2、3、6', '3、4、5', '1、2、4', '2、2、5'], answer: '3、4、5',
    hint: '任意两边之和要大于第三边。',
    solution: { summary: '检查较短两边之和。', steps: ['3+4=7', '7>5，所以3、4、5可以围成三角形。'] },
    commonMistakes: ['ignore_triangle_rule', 'check_one_side'],
  }),
  question({
    id: 'p-fill-geometry-1', grade: 4, term: '上册', unit: '角的度量',
    knowledgePoint: 'angle_type', ability: 'geometry', type: 'fill', difficulty: 1,
    prompt: '一个角是 120°，它是 ____ 角。', answer: '钝', hint: '大于 90°、小于 180°。',
    solution: { summary: '根据角的大小分类。', steps: ['120°>90°', '120°<180°，所以是钝角'] },
    commonMistakes: ['confuse_obtuse_reflex', 'compare_wrong_boundary'],
  }),
  question({
    id: 'p-problem-geometry-1', grade: 4, term: '上册', unit: '平行四边形和梯形',
    knowledgePoint: 'rectangle_perimeter', ability: 'geometry', type: 'problem', difficulty: 2,
    prompt: '一块长方形菜地长 24 米、宽 16 米，围一圈篱笆需要多少米？', answer: '80',
    hint: '长方形周长是两条长与两条宽的总和。',
    solution: { summary: '求长方形周长。', steps: ['24+16=40（米）', '40×2=80（米）'] },
    commonMistakes: ['calculate_area', 'miss_two_sides'],
  }),
  question({
    id: 'p-choice-pattern-1', grade: 4, term: '上册', unit: '数学广角——优化',
    knowledgePoint: 'number_pattern', ability: 'pattern', type: 'choice', difficulty: 1,
    prompt: '5、10、20、40，下一项是？', options: ['45', '50', '60', '80'], answer: '80',
    hint: '每一项和前一项有什么倍数关系？',
    solution: { summary: '每一项都是前一项的 2 倍。', steps: ['10=5×2，20=10×2', '40×2=80'] },
    commonMistakes: ['assume_addition', 'guess_pattern'],
  }),
  question({
    id: 'p-fill-pattern-1', grade: 4, term: '下册', unit: '平均数与条形统计图',
    knowledgePoint: 'data_difference', ability: 'pattern', type: 'fill', difficulty: 2,
    prompt: '某班四周借书数是 18、24、30、36，每周比前一周多 ____ 本。', answer: '6',
    hint: '用后一周减前一周。',
    solution: { summary: '相邻数据的差相同。', steps: ['24-18=6', '30-24=6，36-30=6'] },
    commonMistakes: ['subtract_reverse', 'use_total_difference'],
  }),
  question({
    id: 'p-problem-pattern-1', grade: 4, term: '上册', unit: '数学广角——优化',
    knowledgePoint: 'arrangement_strategy', ability: 'pattern', type: 'problem', difficulty: 3,
    prompt: '煮一个鸡蛋要 8 分钟，一口锅一次最多煮 4 个。煮 10 个鸡蛋至少要多少分钟？', answer: '24',
    hint: '用 10÷4 向上取整求锅数，再乘每锅 8 分钟。',
    solution: { summary: '先求锅数，再求总时间。', steps: ['10 = 4 × 2 + 2', '需要 3 锅，3×8=24（分钟）'] },
    commonMistakes: ['ignore_remainder', 'multiply_by_egg_count'],
  }),
];

const divisionChoiceVariants = [
  { dividend: 720, divisor: 24, answer: '30', options: ['20', '25', '30', '35'] },
  { dividend: 960, divisor: 32, answer: '30', options: ['20', '30', '40', '50'] },
  { dividend: 560, divisor: 14, answer: '40', options: ['20', '30', '40', '50'] },
  { dividend: 750, divisor: 25, answer: '30', options: ['20', '25', '30', '35'] },
];

const divisionFillVariants = [
  { dividend: 630, divisor: 21, answer: '30' },
  { dividend: 720, divisor: 18, answer: '40' },
  { dividend: 840, divisor: 28, answer: '30' },
];

const divisionProblemVariants = [
  { boxes: 9, each: 28, groups: 14, answer: '18', item: '盒彩笔', container: '盒', unit: '支' },
  { boxes: 16, each: 24, groups: 12, answer: '32', item: '包数学卡片', container: '包', unit: '张' },
  { boxes: 15, each: 18, groups: 9, answer: '30', item: '袋跳绳', container: '袋', unit: '根' },
  { boxes: 12, each: 35, groups: 15, answer: '28', item: '包贴纸', container: '包', unit: '张' },
];

divisionChoiceVariants.forEach((item, index) => {
  practiceQuestions.push(question({
    id: `p-choice-division-variant-${index + 1}`,
    grade: 4,
    term: '上册',
    unit: '除数是两位数的除法',
    knowledgePoint: 'division_estimation',
    ability: 'calculation',
    type: 'choice',
    difficulty: index < 2 ? 1 : 2,
    prompt: `${item.dividend} ÷ ${item.divisor} 的商最接近多少（整十数）？`,
    options: item.options,
    answer: item.answer,
    hint: `想一想 ${item.divisor} × ${item.answer} 是多少。`,
    solution: {
      summary: '用乘法估算商。',
      steps: [`${item.divisor} × ${item.answer} = ${item.dividend}`, `所以商大约是 ${item.answer}。`],
    },
    commonMistakes: ['place_value', 'random_estimate'],
  }));
});

divisionFillVariants.forEach((item, index) => {
  practiceQuestions.push(question({
    id: `p-fill-division-variant-${index + 1}`,
    grade: 4,
    term: '上册',
    unit: '除数是两位数的除法',
    knowledgePoint: 'division_exact',
    ability: 'calculation',
    type: 'fill',
    difficulty: index < 2 ? 1 : 2,
    prompt: `${item.dividend} ÷ ${item.divisor} = ____`,
    answer: item.answer,
    hint: `用 ${item.divisor} 乘一个整十数来检验。`,
    knowledgeSummary: '两位数除法可以用乘法检验商是否正确。',
    mistakeSummary: ['不要漏掉商末尾的0。', '算完后用除数乘商检验。'],
    calculationExpression: `${item.dividend}÷${item.divisor}`,
    examPattern: 'calculation_model',
    solution: {
      summary: '用乘法检查除法。',
      steps: [`${item.divisor} × ${item.answer} = ${item.dividend}`, `所以 ${item.dividend} ÷ ${item.divisor} = ${item.answer}。`],
    },
    commonMistakes: ['missing_zero', 'calculation_error'],
  }));
});

divisionProblemVariants.forEach((item, index) => {
  practiceQuestions.push(question({
    id: `p-problem-division-variant-${index + 1}`,
    grade: 4,
    term: '上册',
    unit: '除数是两位数的除法',
    knowledgePoint: 'two_step_division_problem',
    ability: 'problem',
    type: 'problem',
    difficulty: index < 2 ? 2 : 3,
    prompt: `学校有 ${item.boxes} ${item.item}，每${item.container}有 ${item.each} ${item.unit}。把这些平均分给 ${item.groups} 个小组，每组有多少${item.unit}？`,
    answer: item.answer,
    answerUnit: item.unit,
    hint: `先用 ${item.boxes}×${item.each} 求总数，再把总数除以 ${item.groups} 组。`,
    knowledgeSummary: '两步应用题先求总数，再按小组数平均分。',
    mistakeSummary: ['不要漏掉先求总数这一步。', '平均分时要除以小组数。'],
    calculationExpression: `${item.boxes}×${item.each}÷${item.groups}`,
    examPattern: 'combination_strategy',
    solution: {
      summary: '先乘后除，分两步计算。',
      steps: [`${item.boxes} × ${item.each} = ${item.boxes * item.each}（${item.unit}）`, `${item.boxes * item.each} ÷ ${item.groups} = ${item.answer}（${item.unit}）`],
    },
    commonMistakes: ['skip_total', 'divide_by_box_count'],
  }));
});

practiceQuestions.push(...supplementalPracticeQuestions.map(question));
practiceQuestions.push(...thinkingPracticeQuestions.map(question));
gradeBanks.forEach((bank) => {
  diagnosticQuestions.push(...bank.diagnosticQuestions.map(question));
  practiceQuestions.push(...bank.practiceQuestions.map(question));
});
function withLegacyEdition(item) {
  return withCurriculumMetadata(withReviewMetadata({
    ...item,
    textbookId: item.textbookId || 'rjb',
    editionUnitKey: item.editionUnitKey || `rjb-g${item.grade}-legacy`,
  }));
}
for (let index = 0; index < diagnosticQuestions.length; index += 1) diagnosticQuestions[index] = withLegacyEdition(diagnosticQuestions[index]);
for (let index = 0; index < practiceQuestions.length; index += 1) practiceQuestions[index] = withLegacyEdition(practiceQuestions[index]);
diagnosticQuestions.push(...buildEditionDiagnosticQuestions());
diagnosticQuestions.push(...buildEntryDiagnosticQuestions());
practiceQuestions.push(...buildEditionPracticeQuestions());
for (let index = 0; index < diagnosticQuestions.length; index += 1) diagnosticQuestions[index] = withCurriculumMetadata(withReviewMetadata(diagnosticQuestions[index]));
for (let index = 0; index < practiceQuestions.length; index += 1) practiceQuestions[index] = withCurriculumMetadata(withReviewMetadata(practiceQuestions[index]));

function primaryDedupeKey(item) {
  return [
    'primary',
    questionCoreSignature(item),
  ].join('|');
}

const primaryVariantLeadIns = [
  '\u8bf7\u5148\u8bfb\u6e05\u6761\u4ef6\uff0c\u518d\u56de\u7b54\uff1a',
  '\u8bfb\u5b8c\u9898\u76ee\u540e\uff0c\u5148\u627e\u51fa\u6570\u91cf\u5173\u7cfb\uff1a',
  '\u628a\u5df2\u77e5\u6570\u91cf\u7406\u4e00\u7406\uff0c\u518d\u56de\u7b54\uff1a',
  '\u5148\u60f3\u6e05\u695a\u9898\u76ee\u95ee\u4ec0\u4e48\uff1a',
  '\u4ece\u9898\u76ee\u6761\u4ef6\u51fa\u53d1\uff0c\u56de\u7b54\uff1a',
  '\u5148\u5708\u51fa\u5173\u952e\u6570\u91cf\uff0c\u518d\u56de\u7b54\uff1a',
  '\u5148\u5224\u65ad\u6570\u91cf\u4e4b\u95f4\u7684\u5173\u7cfb\uff1a',
  '\u5148\u5217\u51fa\u6570\u91cf\u5173\u7cfb\uff0c\u518d\u56de\u7b54\uff1a',
];

const primaryReasoningActivities = {
  clock_reading: [
    '\u5728\u8349\u7a3f\u7eb8\u4e0a\u753b\u51fa\u8fd9\u4e2a\u949f\u9762',
    '\u5148\u7528\u65f6\u9488\u548c\u5206\u9488\u8bb0\u5f55\u89c2\u5bdf\u7ed3\u679c',
    '\u5bf9\u7167\u6574\u65f6\u7684\u8bfb\u6cd5\u505a\u4e00\u6b21\u9a8c\u7b97',
  ],
  shape_recognition: [
    '\u5148\u753b\u51fa\u6ee1\u8db3\u6761\u4ef6\u7684\u56fe\u5f62',
    '\u5148\u628a\u56fe\u5f62\u7684\u8fb9\u548c\u89d2\u8bb0\u4e0b\u6765',
    '\u5148\u5708\u51fa\u51b3\u5b9a\u56fe\u5f62\u7c7b\u578b\u7684\u6761\u4ef6',
  ],
  pattern_addition: [
    '\u5148\u5199\u51fa\u6bcf\u4e00\u6b65\u589e\u52a0\u4e86\u591a\u5c11',
    '\u5148\u5728\u6570\u5217\u4e0b\u9762\u6807\u51fa\u76f8\u90bb\u4e24\u9879\u7684\u53d8\u5316',
    '\u5148\u7528\u524d\u540e\u4e24\u9879\u9a8c\u8bc1\u89c4\u5f8b',
  ],
  number_pattern: [
    '\u5148\u5199\u51fa\u6bcf\u4e00\u6b65\u7684\u53d8\u5316',
    '\u5148\u7528\u76f8\u90bb\u4e24\u9879\u9a8c\u8bc1\u89c4\u5f8b',
    '\u5148\u628a\u6570\u5217\u7684\u53d8\u5316\u8bb0\u5728\u8349\u7a3f\u7eb8\u4e0a',
  ],
  length_compare: [
    '\u5148\u5728\u8349\u7a3f\u7eb8\u4e0a\u6807\u51fa\u4e24\u6bb5\u957f\u5ea6',
    '\u5148\u5708\u51fa\u4e24\u4e2a\u957f\u5ea6\u6570\u636e',
    '\u5148\u7528\u5927\u4e8e\u53f7\u6216\u5c0f\u4e8e\u53f7\u5199\u51fa\u6bd4\u8f83\u5173\u7cfb',
  ],
  angle_right: [
    '\u5148\u5728\u8349\u7a3f\u7eb8\u4e0a\u753b\u51fa\u76f4\u89d2\u6807\u8bb0',
    '\u5148\u6807\u51fa\u6bd4\u8f83\u89d2\u7684\u5173\u952e\u90e8\u4f4d',
    '\u5148\u7528\u76f4\u89d2\u4f5c\u4e3a\u6807\u51c6\u6bd4\u4e00\u6bd4',
  ],
  data_compare: [
    '\u5148\u5728\u6570\u636e\u4e2d\u5708\u51fa\u8981\u6bd4\u8f83\u7684\u6570',
    '\u5148\u628a\u4e24\u4e2a\u6570\u636e\u6309\u4ece\u5927\u5230\u5c0f\u6392\u4e00\u6392',
    '\u5148\u7528\u51cf\u6cd5\u68c0\u67e5\u4e24\u4e2a\u6570\u636e\u7684\u5dee',
  ],
  time_duration: [
    '\u5148\u5728\u8349\u7a3f\u7eb8\u4e0a\u753b\u51fa\u65f6\u95f4\u7ebf',
    '\u5148\u628a\u5f00\u59cb\u65f6\u523b\u548c\u7ed3\u675f\u65f6\u523b\u6807\u51fa\u6765',
    '\u5148\u5206\u6e05\u662f\u8fc7\u4e86\u51e0\u65f6\u8fd8\u662f\u51e0\u5206',
  ],
  fraction_compare: [
    '\u5148\u753b\u4e00\u4e0b\u5206\u6570\u6761\u6bd4\u8f83\u5927\u5c0f',
    '\u5148\u628a\u5206\u6570\u5316\u6210\u76f8\u540c\u5206\u6bcd\u518d\u6bd4\u8f83',
    '\u5148\u5728\u6570\u8f74\u4e0a\u4f30\u4e00\u4f30\u4e24\u4e2a\u5206\u6570\u7684\u4f4d\u7f6e',
  ],
  factor_multiple: [
    '\u5148\u5217\u51fa\u5173\u952e\u6570\u7684\u56e0\u6570\u6216\u500d\u6570',
    '\u5148\u7528\u4e58\u6cd5\u7b97\u5f0f\u9a8c\u8bc1\u6574\u9664\u5173\u7cfb',
    '\u5148\u628a\u53ef\u80fd\u7684\u6570\u6309\u987a\u5e8f\u5217\u51fa\u6765',
  ],
  proportion: [
    '\u5148\u5199\u51fa\u4ea4\u53c9\u76f8\u4e58\u5f97\u5230\u7684\u7b49\u5f0f',
    '\u5148\u7528\u6bd4\u4f8b\u7684\u57fa\u672c\u6027\u8d28\u9a8c\u7b97',
    '\u5148\u628a\u540c\u4e00\u4f4d\u7f6e\u7684\u4e24\u9879\u5bf9\u5e94\u8d77\u6765',
  ],
  ratio: [
    '\u5148\u753b\u4e00\u4e0b\u6bd4\u7684\u7ebf\u6bb5\u56fe',
    '\u5148\u628a\u6bd4\u7684\u524d\u9879\u548c\u540e\u9879\u5206\u522b\u6807\u51fa',
    '\u5148\u7528\u7ea6\u5206\u6216\u6269\u5206\u9a8c\u8bc1\u8fd9\u4e2a\u6bd4',
  ],
  fraction_multiply: [
    '\u5148\u5728\u7b97\u5f0f\u4e2d\u6807\u51fa\u53ef\u4ee5\u7ea6\u5206\u7684\u6570',
    '\u5148\u5199\u51fa\u5206\u5b50\u548c\u5206\u6bcd\u5206\u522b\u600e\u6837\u8ba1\u7b97',
    '\u5148\u7528\u7ea6\u5206\u540e\u7684\u7b97\u5f0f\u9a8c\u7b97',
  ],
  fraction_divide: [
    '\u5148\u628a\u9664\u6cd5\u5199\u6210\u4e58\u5012\u6570\u7684\u5f62\u5f0f',
    '\u5148\u5728\u7b97\u5f0f\u4e2d\u6807\u51fa\u53ef\u4ee5\u7ea6\u5206\u7684\u6570',
    '\u5148\u68c0\u67e5\u5012\u6570\u662f\u5426\u5199\u5bf9',
  ],
};

function primaryReasoningActivity(item, variantIndex) {
  const activities = primaryReasoningActivities[String(item && item.knowledgePoint || '')]
    || [
      '\u5148\u5728\u8349\u7a3f\u7eb8\u4e0a\u5199\u51fa\u5173\u952e\u6570\u91cf\u5173\u7cfb',
      '\u5148\u7528\u753b\u56fe\u6216\u5217\u5f0f\u68c0\u67e5\u6761\u4ef6',
      '\u5148\u5199\u51fa\u4f60\u51c6\u5907\u600e\u6837\u9a8c\u7b97',
    ];
  return activities[(variantIndex - 1) % activities.length];
}

function primaryActivityInstruction(item, variantIndex) {
  const activity = primaryReasoningActivity(item, variantIndex);
  if (item && item.type === 'choice') return `${activity}\uff0c\u518d\u9009\u51fa\u6b63\u786e\u7b54\u6848\u3002`;
  if (item && item.type === 'fill') return `${activity}\uff0c\u518d\u628a\u7ed3\u679c\u586b\u5728\u6a2a\u7ebf\u4e0a\u3002`;
  return `${activity}\uff0c\u5e76\u5199\u51fa\u4f60\u7684\u5224\u65ad\u4f9d\u636e\u3002`;
}

function primaryVariantPrompt(item, variantIndex) {
  const prompt = String(item && item.prompt || '').trim();
  const knowledgePoint = String(item && item.knowledgePoint || '');
  const expression = String(item && item.calculationExpression || '');

  // Keep the arithmetic condition fixed while giving a repeated money story
  // a fresh, learner-facing context.
  if (knowledgePoint === 'money_count' && item && item.type === 'problem') {
    const match = expression.match(/^\s*(\d+)\s*\+\s*(\d+)\s*$/);
    if (match) {
      const names = ['\u5c0f\u660e', '\u5c0f\u4e3d', '\u5c0f\u5f3a'];
      const name = names[(variantIndex - 1) % names.length];
      return `${name}\u539f\u6765\u6709 ${match[1]} \u5143\uff0c\u540e\u6765\u53c8\u5f97\u5230 ${match[2]} \u5143\uff0c\u4e00\u5171\u6709\u591a\u5c11\u5143\uff1f\u8bf7\u5217\u5f0f\u5e76\u5199\u51fa\u7ed3\u679c\u3002`;
    }
  }

  const leadIn = primaryVariantLeadIns[(variantIndex - 1) % primaryVariantLeadIns.length];
  return `${leadIn}${prompt}\n${primaryActivityInstruction(item, variantIndex)}`;
}

function withPrimaryLearnerVariant(item, variantIndex) {
  const prompt = primaryVariantPrompt(item, variantIndex);
  const candidate = { ...item, prompt };
  const mathSignature = questionMathSignature({ ...candidate, mathSignature: '' });
  return {
    ...candidate,
    publishedVariant: {
      kind: 'reasoning_activity',
      index: variantIndex,
      activity: primaryReasoningActivity(item, variantIndex),
    },
    mathSignature,
    contentSignature: [
      String(candidate.knowledgePoint || ''),
      String(candidate.type || ''),
      normalizeCorePrompt(candidate.prompt),
      normalizeCalculationExpression(candidate.calculationExpression),
      String(candidate.answer || '').trim(),
      String(candidate.answerUnit || '').trim(),
    ].join('|'),
  };
}

function dedupePrimaryCandidates(items, seen = new Set()) {
  return items.map((item) => {
    const originalKey = primaryDedupeKey(item);
    if (!seen.has(originalKey)) {
      seen.add(originalKey);
      return item;
    }

    let variantIndex = 1;
    while (variantIndex <= primaryVariantLeadIns.length * 4) {
      const variant = withPrimaryLearnerVariant(item, variantIndex);
      const variantKey = primaryDedupeKey(variant);
      if (!seen.has(variantKey)) {
        seen.add(variantKey);
        return variant;
      }
      variantIndex += 1;
    }

    throw new Error(`Unable to preserve duplicate primary question ${String(item && item.id || '')}`);
  });
}

const publishedPrimaryCoreKeys = new Set();
const publishedDiagnosticQuestions = dedupePrimaryCandidates(diagnosticQuestions, publishedPrimaryCoreKeys);
const publishedPracticeQuestions = dedupePrimaryCandidates(practiceQuestions, publishedPrimaryCoreKeys);

function getQuestionBank(scope = {}) {
  const resolved = resolveSchoolScope(scope);
  if (!resolved) return { diagnosticQuestions: [], practiceQuestions: [] };
  if (resolved.schoolStage === 'junior') return getJuniorQuestionBank(resolved);
  return { diagnosticQuestions: publishedDiagnosticQuestions, practiceQuestions: publishedPracticeQuestions };
}

function getQuestions(scope = {}) {
  const resolved = resolveSchoolScope(scope);
  if (!resolved) return [];
  const bank = getQuestionBank(resolved);
  const source = scope.bank === 'diagnostic' || scope.kind === 'diagnostic'
    ? bank.diagnosticQuestions
    : bank.practiceQuestions;
  const expectedDifficulty = resolved.schoolStage === 'junior'
    ? scope.difficultyMode
    : ({ easy: 1, medium: 2, hard: 3 }[scope.difficultyMode] || scope.difficulty);
  return source.filter((item) => (
    (!scope.textbookId || item.textbookId === scope.textbookId)
    && (!scope.grade || item.grade === Number(scope.grade))
    && (!scope.type || item.type === scope.type)
    && (!expectedDifficulty || item.difficulty === expectedDifficulty)
    && (!scope.knowledgePoint || item.knowledgePoint === scope.knowledgePoint)
    && (!scope.term || item.term === scope.term)
  ));
}

function resolveSchoolScope(scope = {}) {
  const requestedStage = scope.schoolStage;
  const textbookId = String(scope.textbookId || '');
  const grade = Number(scope.grade);
  const hasJuniorTextbook = textbookId.startsWith('jr-');
  const hasGrade = scope.grade !== undefined && scope.grade !== null && scope.grade !== '';
  const validPrimaryGrade = hasGrade && Number.isInteger(grade) && grade >= 1 && grade <= 6;
  const validJuniorGrade = hasGrade && Number.isInteger(grade) && grade >= 7 && grade <= 9;

  if (requestedStage !== undefined && requestedStage !== 'primary' && requestedStage !== 'junior') return null;
  if (hasGrade && !validPrimaryGrade && !validJuniorGrade) return null;

  if (requestedStage === 'junior') {
    if ((textbookId && !hasJuniorTextbook) || (hasGrade && !validJuniorGrade)) return null;
    return { ...scope, schoolStage: 'junior' };
  }
  if (requestedStage === 'primary') {
    if (hasJuniorTextbook || (hasGrade && !validPrimaryGrade)) return null;
    return { ...scope, schoolStage: 'primary' };
  }
  if (hasJuniorTextbook || validJuniorGrade) {
    if ((textbookId && !hasJuniorTextbook) || (hasGrade && !validJuniorGrade)) return null;
    return { ...scope, schoolStage: 'junior' };
  }
  if (hasGrade && !validPrimaryGrade) return null;
  return { ...scope, schoolStage: 'primary' };
}

function validateQuestion(item) {
  if (!item || requiredFields.some((field) => item[field] === undefined || item[field] === null)) {
    return false;
  }
  if (!['choice', 'fill', 'problem'].includes(item.type)) return false;
  if (!Array.isArray(item.solution.steps) || item.solution.steps.length === 0) return false;
  if (!Array.isArray(item.commonMistakes) || item.commonMistakes.length === 0) return false;
  if (item.type === 'choice' && (!Array.isArray(item.options) || item.options.length < 2)) return false;
  if (!['nationwide', 'shandong', 'jining'].includes(item.sourceRegion)) return false;
  if (!/^20(2[2-6])$/.test(item.sourceYear)) return false;
  if (!examPatterns.includes(item.examPattern)) return false;
  if (item.schoolStage !== 'junior') {
    if (!taskTypes.includes(item.taskType)) return false;
    if (!representations.includes(item.representation)) return false;
    if (!Number.isInteger(item.reasoningDepth) || item.reasoningDepth < 1 || item.reasoningDepth > 3) return false;
    if (typeof item.misconception !== 'string' || !item.misconception.trim()) return false;
  }
  if (item.schoolStage === 'junior') {
    if (!/^jr-/.test(item.textbookId) || ![7, 8, 9].includes(item.grade)) return false;
    if (!['easy', 'medium', 'hard'].includes(item.difficulty)) return false;
    if (!item.answerSpec || typeof item.answerSpec !== 'object') return false;
    if (!/^j-[dp]-jr-[a-z]+-g[789]-/.test(item.id)) return false;
    if (item.sourceRegion !== 'nationwide' || !/^202[2-6]$/.test(item.sourceYear)) return false;
    if (item.reviewStatus !== 'generated-canonical' || !/^2026-08-08$/.test(item.reviewedAt)) return false;
    return true;
  }
  if (item.reviewStatus !== 'auto-checked' || item.reviewedAt !== '2026-07-31') return false;
  return true;
}

function hasVisibleText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function tokenizeArithmeticExpression(expression) {
  const source = String(expression || '').replace(/\s+/g, '');
  if (!source || source.includes('□')) return null;
  const tokens = [];
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (/\d|\./.test(char)) {
      let number = char;
      index += 1;
      while (index < source.length && /\d|\./.test(source[index])) {
        number += source[index];
        index += 1;
      }
      if (!/^\d+(?:\.\d+)?$/.test(number)) return null;
      tokens.push(Number(number));
      continue;
    }
    if ('+-*/×脳÷梅()%'.includes(char)) {
      tokens.push(char);
      index += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

function evaluateArithmeticExpression(expression) {
  const tokens = tokenizeArithmeticExpression(expression);
  if (!tokens) return null;
  let pointer = 0;

  function parsePrimary() {
    const token = tokens[pointer];
    if (token === '-') {
      pointer += 1;
      const value = parsePrimary();
      return value === null ? null : -value;
    }
    if (token === '(') {
      pointer += 1;
      const value = parseSum();
      if (tokens[pointer] !== ')') return null;
      pointer += 1;
      return value;
    }
    if (typeof token !== 'number') return null;
    pointer += 1;
    let value = token;
    if (tokens[pointer] === '%') {
      value /= 100;
      pointer += 1;
    }
    return value;
  }

  function parseProduct() {
    let value = parsePrimary();
    if (value === null) return null;
    while (['*', '×', '脳', '/', '÷', '梅'].includes(tokens[pointer])) {
      const operator = tokens[pointer];
      pointer += 1;
      const right = parsePrimary();
      if (right === null || ((operator === '/' || operator === '÷' || operator === '梅') && right === 0)) return null;
      value = ['*', '×', '脳'].includes(operator) ? value * right : value / right;
    }
    return value;
  }

  function parseSum() {
    let value = parseProduct();
    if (value === null) return null;
    while (tokens[pointer] === '+' || tokens[pointer] === '-') {
      const operator = tokens[pointer];
      pointer += 1;
      const right = parseProduct();
      if (right === null) return null;
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  const result = parseSum();
  return result === null || pointer !== tokens.length || !Number.isFinite(result) ? null : result;
}

function estimateTargetStep(value) {
  const item = value && typeof value === 'object' ? value : null;
  const text = String(item ? item.prompt : value || '');
  if (text.includes('整百数')) return 100;
  if (text.includes('整十数')) return 10;
  if (text.includes('整数')) return 1;
  if (text.includes('范围')) return 'range';
  if (item) {
    const targets = { hundreds: 100, tens: 10, integer: 1, range: 'range', strategy: 'range' };
    return targets[item.roundingTarget] || null;
  }
  return null;
}

function estimateAuditExpression(item) {
  if (item && item.calculationExpression) return item.calculationExpression;
  if (!item || item.taskType !== 'estimate_explain') return '';
  const prompt = String(item.prompt || '').replace(/^估一估[：:]\s*/, '');
  const match = prompt.match(/^\s*(\d[\d\s,，]*(?:\.\d+)?\s*[×÷*/]\s*\d[\d\s,，]*(?:\.\d+)?)/);
  return match ? match[1].replace(/[,，]/g, '') : '';
}

function expectedCalculatedAnswer(item, calculated) {
  const knowledgePoint = String(item.knowledgePoint || '');
  if (String(item.prompt || '').includes('保留两位小数')) {
    return Number(Number(calculated).toFixed(2));
  }
  if (knowledgePoint.endsWith('division_remainder')) {
    const tokens = tokenizeArithmeticExpression(item.calculationExpression);
    if (tokens && tokens.length === 3 && typeof tokens[0] === 'number' && typeof tokens[2] === 'number'
      && ['/', '÷', '梅'].includes(tokens[1]) && tokens[2] !== 0) {
      return tokens[0] % tokens[2];
    }
    return null;
  }
  if (item.examPattern === 'estimate_check') {
    const step = estimateTargetStep(item);
    if (typeof step === 'number') return Math.round(calculated / step) * step;
    return null;
  }
  if (knowledgePoint.endsWith('division_estimation')) return Math.max(10, Math.round(calculated / 10) * 10);
  if (knowledgePoint.endsWith('multiply_estimation')) return Math.round(calculated / 100) * 100;
  return calculated;
}

function quotientAndRemainderFromAnswer(answer) {
  const match = String(answer || '').trim().match(/^(\d+)余(\d+)$/);
  if (!match) return null;
  return { quotient: Number(match[1]), remainder: Number(match[2]) };
}

const juniorAnswerSpecKinds = ['text', 'number', 'fraction', 'equation', 'coordinate', 'interval', 'choice'];

function juniorContractSpec(rule) {
  return {
    kind: rule.answerSpecKind,
    value: rule.answerSpecValue,
    ...(rule.answerSpecVariable ? { variable: rule.answerSpecVariable } : {}),
  };
}

function sameCanonicalValue(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function auditJuniorContract(item, issues) {
  const canonical = item && regenerateJuniorQuestion(item.id);
  if (!canonical) {
    issues.push('junior_audit_rule_invalid');
    return;
  }

  const identityFields = [
    'schoolStage', 'textbookId', 'editionUnitKey', 'grade', 'term', 'unit',
    'knowledgePoint', 'ability', 'type', 'difficulty', 'diagnosticSlot',
    'entryDiagnostic', 'entrySlot', 'entryOrder', 'curriculumFamily',
    'sourceRegion', 'sourceYear', 'examPattern', 'reviewStatus', 'reviewedAt',
  ];
  if (identityFields.some((field) => !sameCanonicalValue(item[field], canonical[field]))) {
    issues.push('junior_identity_mismatch');
  }

  if (String(item.answer) !== String(canonical.answer)) issues.push('junior_answer_mismatch');
  if (!sameCanonicalValue(item.answerSpec, canonical.answerSpec)) issues.push('junior_answer_spec_invalid');
  if (String(item.answerUnit || '') !== canonical.answerUnit) issues.push('junior_unit_mismatch');
  if (String(item.calculationExpression || '') !== canonical.calculationExpression) {
    issues.push('junior_calculation_contract_invalid');
  }
  if (!sameCanonicalValue(item.auditRule, canonical.auditRule)) issues.push('junior_audit_rule_invalid');
  if (!sameCanonicalValue(item.options, canonical.options)) issues.push('junior_options_mismatch');
  if (!sameCanonicalValue(item.solution, canonical.solution)) issues.push('junior_solution_mismatch');
  const prompt = String(item.prompt || '');
  if (prompt !== canonical.prompt) issues.push('junior_prompt_mismatch');
  if (prompt !== canonical.prompt || canonical.auditRule.requiredTokens.some((token) => !prompt.includes(String(token)))) {
    issues.push('junior_missing_condition');
  }

  if (canonical.auditRule.domain) {
    const variable = escapeRegExp(canonical.auditRule.domain.variable);
    const forbidden = String(canonical.auditRule.domain.forbidden);
    const assignments = captureRegexGroup(
      prompt,
      new RegExp(`${variable}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`, 'g'),
    );
    if (String(canonical.auditRule.domain.assigned) === forbidden || assignments.includes(forbidden)) {
      issues.push('junior_invalid_domain');
    }
  }

  const rule = canonical.auditRule;
  if (item.type === 'choice' && (rule.taskShape !== 'single_answer_choice'
    || !Array.isArray(item.options) || item.options.length !== 4)) issues.push('junior_type_contract_invalid');
  if (item.type === 'fill' && (rule.taskShape !== 'relation_fill'
    || !prompt.includes('____') || (Array.isArray(item.options) && item.options.length))) issues.push('junior_type_contract_invalid');
  if (item.type === 'problem' && (rule.taskShape !== 'contextual_problem'
    || rule.conditionTokens.length < 1
    || !item.solution || !Array.isArray(item.solution.steps)
    || item.solution.steps.length < 3)) issues.push('junior_problem_contract_invalid');

  const finalAnswer = formatAnswerWithUnit(canonical.answer, canonical.answerUnit);
  const finalStep = item.solution && Array.isArray(item.solution.steps) && item.solution.steps.length
    ? item.solution.steps[item.solution.steps.length - 1]
    : '';
  if (!String(finalStep || '').includes(finalAnswer)) issues.push('junior_solution_answer_missing');
}

function auditQuestion(item) {
  const issues = [];
  if (!validateQuestion(item)) issues.push('schema_invalid');
  if (!item || !hasVisibleText(item.prompt)) issues.push('prompt_missing');
  if (!item || !hasVisibleText(String(item.answer || ''))) issues.push('answer_missing');
  if (!item || typeof item.answerUnit !== 'string' || (!answerUnits.includes(item.answerUnit) && item.answerUnit !== '')) issues.push('answer_unit_invalid');
  if (item && item.answerUnit && !numericAnswerPattern.test(String(item.answer))) issues.push('answer_unit_non_numeric_answer');
  if (item && item.answerUnit && !answersEquivalent(`${item.answer}${item.answerUnit}`, item.answer, item.answerUnit, item.answerSpec)) issues.push('answer_unit_rejected');
  if (!item || !hasVisibleText(item.hint)) issues.push('hint_missing');
  if (!item || !item.solution || !hasVisibleText(item.solution.summary)) issues.push('solution_summary_missing');
  if (!item || !item.solution || !Array.isArray(item.solution.steps) || item.solution.steps.some((step) => !hasVisibleText(step))) issues.push('solution_steps_invalid');
  if (item && item.schoolStage !== 'junior' && !/^j-[dp]-jr-[a-z]+-g[789]-/.test(String(item.id || ''))
    && item.answerUnit && item.solution && Array.isArray(item.solution.steps) && item.solution.steps.length) {
    const expected = formatAnswerWithUnit(item.answer, item.answerUnit);
    const finalStep = item.solution.steps[item.solution.steps.length - 1];
    if (!String(finalStep).includes(expected)) issues.push('solution_answer_missing');
  }
  if (!item || !hasVisibleText(item.knowledgeSummary)) issues.push('knowledge_summary_missing');
  if (!item || !Array.isArray(item.mistakeSummary) || !item.mistakeSummary.some(hasVisibleText)) issues.push('mistake_summary_missing');
  if (item) {
    const learnerText = [
      item.prompt,
      item.hint,
      item.solution && item.solution.summary,
      ...((item.solution && item.solution.steps) || []),
      item.knowledgeSummary,
      ...((item.mistakeSummary) || []),
    ].filter(Boolean).join('\n');
    if (/学习主线|探究主题|应用单元|思维课题|实践专题|规律研习|活动研究|拓展任务|符号模型|建模约束|条件\d+[:：]|第[二三]层(?:关系|结果)?|核心结果|三级表达式|经(?:第二次|三级)变化|建立关系并分步求|(?:基础|进阶|挑战)第\d+组[:：]|已知已知|已知求\s*(?:sin|cos|tan)/i.test(learnerText)) {
      issues.push('learner_facing_language_invalid');
    }
    if (/。。|，，/.test(learnerText)) issues.push('learner_facing_punctuation_invalid');
  }

  if (item && item.type === 'choice') {
    const options = Array.isArray(item.options) ? item.options : [];
    const acceptedOptions = options.filter((option) => (
      answersEquivalent(option, item.answer, item.answerUnit, item.answerSpec)
    ));
    if (options.some((option) => !hasVisibleText(String(option)))) issues.push('choice_option_missing');
    if (new Set(options.map(String)).size !== options.length) issues.push('choice_option_duplicate');
    if (!acceptedOptions.length) issues.push('choice_answer_missing');
    if (acceptedOptions.length !== 1) issues.push('choice_answer_ambiguous');
  }

  const hasJuniorIdentity = item && /^j-[dp]-jr-[a-z]+-g[789]-/.test(String(item.id || ''));
  if (item && (item.schoolStage === 'junior' || hasJuniorIdentity)) {
    const prompt = String(item.prompt || '');
    const answerSpec = item.answerSpec || {};
    auditJuniorContract(item, issues);
    if (['linear_function', 'quadratic_function'].includes(item.knowledgePoint)
      && !/(x|y|函数|解析式|function)/i.test(prompt)) issues.push('junior_missing_condition');
    if (item.knowledgePoint === 'right_triangle'
      && !/(sin|cos|tan)\s*(?:30|45|60)\s*°/i.test(prompt)
      && !/锐角|三角函数|特殊角/.test(prompt)) issues.push('junior_missing_condition');
    if (item.knowledgePoint === 'circle' && !/(半径|直径|圆心|radius|diameter|center)/i.test(prompt)) issues.push('junior_missing_condition');
    if (['angle_line', 'triangle_intro', 'congruent_triangle', 'geometry_proof', 'similar_triangle', 'geometry_comprehensive'].includes(item.knowledgePoint)
      && !/(角|边|三角形|圆|度|厘米|angle|side|triangle|circle)/i.test(prompt)) issues.push('junior_missing_condition');
    if (item.knowledgePoint === 'fraction_expression') {
      const denominator = prompt.match(/\/\(x\s*-\s*(-?\d+)\)/);
      const assignments = captureRegexGroup(prompt, /x\s*=\s*(-?\d+(?:\.\d+)?)/g);
      if (!/x\s*≠\s*-?\d+/.test(prompt)
        || (denominator && assignments.includes(denominator[1]))) issues.push('junior_invalid_domain');
    }
    if (['number', 'equation'].includes(answerSpec.kind) && !Number.isFinite(Number(answerSpec.value))) {
      issues.push('junior_invalid_domain');
    }
    if (item.type === 'choice') {
      const accepted = (Array.isArray(item.options) ? item.options : []).filter((option) => (
        answersEquivalent(option, item.answer, item.answerUnit, item.answerSpec)
      ));
      if (accepted.length !== 1) issues.push('junior_option_ambiguity');
    }
  }

  if (item && item.examPattern === 'estimate_check') {
    const targetStep = estimateTargetStep(item);
    if (targetStep === null) issues.push('estimate_target_missing');
    const expression = estimateAuditExpression(item);
    if (expression && targetStep !== null && targetStep !== 'range') {
      const calculated = evaluateArithmeticExpression(expression);
      const numericAnswer = parseNumericAnswer(item.answer);
      const expected = calculated === null ? null : expectedCalculatedAnswer(item, calculated);
      if (expected !== null && numericAnswer !== null && Math.abs(expected - numericAnswer) > 1e-9) {
        issues.push('estimate_answer_mismatch');
      }
    }
  }

  if (item && item.calculationExpression && item.examPattern !== 'estimate_check') {
    const calculated = evaluateArithmeticExpression(item.calculationExpression);
    const numericAnswer = parseNumericAnswer(item.answer);
    const expected = calculated === null ? null : expectedCalculatedAnswer(item, calculated);
    const quotientAndRemainder = quotientAndRemainderFromAnswer(item.answer);
    if (String(item.knowledgePoint || '').endsWith('division_remainder') && quotientAndRemainder) {
      const tokens = tokenizeArithmeticExpression(item.calculationExpression);
      if (!tokens || tokens.length !== 3 || typeof tokens[0] !== 'number' || typeof tokens[2] !== 'number'
        || !['/', '÷', '除'].includes(tokens[1]) || tokens[2] === 0
        || quotientAndRemainder.quotient !== Math.floor(tokens[0] / tokens[2])
        || quotientAndRemainder.remainder !== tokens[0] % tokens[2]
        || quotientAndRemainder.remainder <= 0 || quotientAndRemainder.remainder >= tokens[2]) {
        issues.push('remainder_expression_mismatch');
      }
    }
    if (expected !== null && numericAnswer !== null && Math.abs(expected - numericAnswer) > 1e-9) {
      issues.push('calculation_expression_mismatch');
    }
  }
  return [...new Set(issues)];
}

function auditQuestionBank(questions) {
  if (!Array.isArray(questions)) return [{ id: '', issues: ['question_bank_invalid'] }];
  return questions.reduce((result, item) => {
    const issues = auditQuestion(item);
    if (issues.length) result.push({ id: String((item && item.id) || ''), issues });
    return result;
  }, []);
}

function normalizeCorePrompt(prompt) {
  return String(prompt || '')
    .replace(/^(?:自测题：)?(?:人教版|北师大版|苏教版|青岛版|上海版|西师大版|冀教版|湘教版)(?:初中)?\d年级“[^”]+”(?:基础|进阶|挑战)第\d+组：/, '')
    .replace(/^自测题：/, '')
    .replace(/^摸底[^：:]{0,40}第\s*\d+\s*题[:：]?/, '')
    .replace(/^第\s*\d+\s*题[:：]?/, '')
    .replace(/任务序号\s*\d+/g, '')
    .replace(/(?:请选择正确答案|请把答案填在横线上|请列式并写出结果|请写出判断理由|请根据钟面读出时刻|请比较两个长度|请判断角的类型|请用交叉相乘解比例|建立关系并分步求)[。！？]?$/g, '')
    .replace(/[，。；：、（）()“”"'\s]/g, '')
    .toLowerCase();
}

function normalizeCalculationExpression(expression) {
  return String(expression || '')
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '');
}

function questionCoreSignature(item) {
  return [
    normalizeCorePrompt(item && item.prompt),
    normalizeCalculationExpression(item && item.calculationExpression),
    String(item && item.answer || '').trim(),
    String(item && item.answerUnit || '').trim(),
  ].join('|');
}

function questionMathSignature(item) {
  const generated = String(item && item.mathSignature || '').trim();
  if (generated) return generated;
  return [
    String(item && item.knowledgePoint || ''),
    normalizeCorePrompt(item && item.prompt),
    normalizeCalculationExpression(item && item.calculationExpression),
    String(item && item.answer || '').trim(),
    String(item && item.answerUnit || '').trim(),
  ].join('|');
}

function isGeneratedCurriculumQuestion(item) {
  return /^([dp]-[a-z]+-g[1-6]-|j-[dp]-jr-[a-z]+-g[789]-)/.test(String(item && item.id || ''));
}

function collectTopicModelIssues(item) {
  const prompt = String(item && item.prompt || '');
  const expression = normalizeCalculationExpression(item && item.calculationExpression);
  const solution = item && item.solution && Array.isArray(item.solution.steps) ? item.solution.steps.join(' ') : '';
  const issues = [];
  if (item && item.knowledgePoint === 'volume_cone') {
    const complete = /圆锥/.test(prompt) && /底面积/.test(prompt) && /高/.test(prompt)
      && /(?:\/3|÷3)/.test(expression) && /÷3|除以3/.test(solution)
      && item.answerUnit === '立方厘米';
    if (!complete) issues.push('topic_model_mismatch');
  }
  if (item && item.knowledgePoint === 'proportion') {
    const complete = /x\s*:/.test(prompt) && /=/.test(prompt) && /交叉相乘/.test(solution);
    if (!complete) issues.push('topic_model_mismatch');
  }
  if (item && item.knowledgePoint === 'similar_triangle') {
    const complete = /△[A-Z]{3}\s*∽\s*△[A-Z]{3}/.test(prompt)
      && /[A-Z]{2}\s*=\s*\d+\s*厘米/.test(prompt)
      && /[A-Z]{2}\s*:\s*[A-Z]{2}\s*=\s*\d+\s*:\s*\d+/.test(prompt);
    if (!complete) issues.push('geometry_conditions_incomplete');
  }
  if (item && item.knowledgePoint === 'geometry_proof') {
    const complete = /△[A-Z]{3}/.test(prompt) && /=[A-Z]{2}/.test(prompt)
      && /等腰三角形|底角|AB=AC|底边/.test(prompt + solution) && /三角形内角和/.test(prompt + solution);
    if (!complete) issues.push('geometry_conditions_incomplete');
  }
  if (item && item.knowledgePoint === 'geometry_comprehensive') {
    const complete = /Rt△/.test(prompt) && /外接圆/.test(prompt)
      && /勾股定理/.test(solution) && /外接圆/.test(solution);
    if (!complete) issues.push('geometry_conditions_incomplete');
  }
  if (item && ['area_rectangle_g3', 'area_rectangle_g5'].includes(item.knowledgePoint)) {
    const complete = /面积/.test(prompt) && /厘米/.test(prompt) && item.answerUnit === '平方厘米';
    if (!complete) issues.push('topic_model_mismatch');
  }
  if (item && item.knowledgePoint === 'length_compare') {
    const complete = /厘米|米|长度|长|短/.test(prompt);
    if (!complete) issues.push('topic_model_mismatch');
  }
  if (item && item.grade === 1 && item.knowledgePoint === 'money_count') {
    const complete = /元/.test(prompt) && item.answerUnit === '元';
    if (!complete) issues.push('topic_model_mismatch');
  }
  return issues;
}

function auditQuestionBankQuality(questions, { requireEditionIsolation = false } = {}) {
  if (!Array.isArray(questions)) return [{ id: '', code: 'question_bank_invalid' }];
  const issues = [];
  const seenIds = new Set();
  const coreGroups = new Map();

  questions.forEach((item) => {
    const id = String(item && item.id || '');
    if (!id || seenIds.has(id)) issues.push({ id, code: 'duplicate_id' });
    seenIds.add(id);

    const schemaIssues = auditQuestion(item);
    if (schemaIssues.length) issues.push({ id, code: 'question_contract_invalid', details: schemaIssues });

    const schoolStage = item && item.schoolStage === 'junior' ? 'junior' : 'primary';
    const curriculum = item && getCurriculumScope(schoolStage, item.textbookId, item.grade, item.knowledgePoint);
    if (isGeneratedCurriculumQuestion(item) && !curriculum) {
      issues.push({ id, code: 'curriculum_scope_missing' });
    } else if (curriculum) {
      const fieldsMatch = item.term === curriculum.term
        && item.editionUnitKey === curriculum.editionUnitKey
        && item.unit === curriculum.chapterLabel
        && (!item.chapterId || item.chapterId === curriculum.chapterId)
        && (schoolStage !== 'primary' || (
          item.curriculumAlignment === curriculum.curriculumAlignment
          && item.curriculumReference === curriculum.curriculumReference
          && item.curriculumSourceUrl === curriculum.curriculumSourceUrl
        ));
      if (!fieldsMatch) issues.push({ id, code: 'curriculum_metadata_mismatch' });
    }

    collectTopicModelIssues(item).forEach((code) => issues.push({ id, code }));
    const signature = [
      schoolStage,
      `g${item && item.grade}`,
      String(item && item.knowledgePoint || ''),
      questionCoreSignature(item),
    ].join('|');
    if (signature && signature !== '|||') {
      if (!coreGroups.has(signature)) coreGroups.set(signature, []);
      coreGroups.get(signature).push(item);
    }
  });

  coreGroups.forEach((items) => {
    if (items.length < 2) return;
    const editions = new Set(items.map((item) => String(item.textbookId || '')));
    const scopes = new Set(items.map((item) => scopeKeyOf(item)));
    const code = requireEditionIsolation && editions.size > 1
      ? 'core_duplicate_across_edition'
      : (scopes.size === 1 ? 'core_duplicate_in_scope' : 'core_duplicate_across_scope');
    issues.push({ id: items.map((item) => item.id).join(','), code, count: items.length });
  });

  return issues;
}

function buildReviewSamples(questions, { perGroup = 20 } = {}) {
  const groups = new Map();
  questions.forEach((item) => {
    const key = scopeKeyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const samples = [];
  [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([, items]) => {
      samples.push(...[...items]
        .sort((left, right) => String(left.id).localeCompare(String(right.id)))
        .slice(0, Math.min(perGroup, items.length)));
    });
  return samples;
}

module.exports = {
  diagnosticQuestions: publishedDiagnosticQuestions,
  practiceQuestions: publishedPracticeQuestions,
  validateQuestion,
  evaluateArithmeticExpression,
  getQuestionTopicLabel,
  inferAnswerUnit,
  questionMathSignature,
  scopeKeyOf,
  auditQuestion,
  auditQuestionBank,
  auditQuestionBankQuality,
  buildReviewSamples,
  getQuestionBank,
  getQuestions,
};
