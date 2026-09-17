const { getJuniorLearningMap } = require('./junior-high-curriculum');
const { getPrimaryCurriculumTopics } = require('./textbook-curriculum');

const textbookOptions = [
  { value: 'rjb', label: '人教版', available: true, focus: '重视基础概念与分步计算' },
  { value: 'bsd', label: '北师大版', available: true, focus: '重视观察、操作与表达' },
  { value: 'suj', label: '苏教版', available: true, focus: '重视数量关系与应用' },
  { value: 'qd', label: '青岛版（六三制）', available: true, schoolSystem: '6-3', focus: '六三制（小学六年、初中三年）适配：重视生活情境和探究' },
  { value: 'sh', label: '沪教版（五四制）', available: true, schoolSystem: '5-4', focus: '五四制（小学五年、初中四年）适配：重视数学活动与思考' },
  { value: 'xsb', label: '西师大版', available: true, focus: '重视动手实践和推理' },
  { value: 'hebei', label: '冀教版', available: true, focus: '重视生活问题与方法' },
  { value: 'xiang', label: '湘教版', available: true, focus: '重视规律发现和表达' },
];

const juniorTextbookOptions = [
  { value: 'jr-rjb', label: '人教版初中', available: true, focus: '重视概念建构、符号表达与分步推理' },
  { value: 'jr-bsd', label: '北师大版初中', available: true, focus: '重视观察、操作和多种表示之间的转换' },
  { value: 'jr-suk', label: '苏科版初中', available: true, focus: '重视数量关系、模型意识和实际应用' },
  { value: 'jr-huk', label: '沪科版初中', available: true, focus: '重视问题情境、实验观察和数学解释' },
  { value: 'jr-luj', label: '\u9c81\u6559\u7248\uff08\u4e94\u56db\u5236\uff09', available: true, schoolSystem: '5-4', focus: '\u4e94\u56db\u5236\uff08\u5c0f\u5b66\u4e94\u5e74\u3001\u521d\u4e2d\u56db\u5e74\uff09\uff1a\u521d\u4e2d\u6570\u5b66\u8303\u56f4\u6309\u9c81\u6559\u7248\uff08\u4e94\u56db\u5236\uff09\u516c\u5f00\u76ee\u5f55\u5339\u914d' },
  { value: 'jr-xj', label: '湘教版初中', available: true, focus: '重视规律发现、表达交流和变式思考' },
  { value: 'jr-hsd', label: '华师大版初中', available: true, focus: '重视数学活动、合作讨论和说理表达' },
  { value: 'jr-zj', label: '浙教版初中', available: true, focus: '重视探究建模、逻辑推理和开放问题' },
];

const editionPrefixes = {
  rjb: '数与运算', bsd: '观察与探索', suj: '数量关系', qd: '生活情境',
  sh: '数学活动', xsb: '实践与推理', hebei: '生活中的数学', xiang: '规律与表达',
};

const gradeThemes = {
  1: { term: '上、下册', unit: '20以内数的认识与加减', points: ['数的组成', '加减法含义'], summary: '先用小棒或画图看清数量变化，再用加法或减法表达。' },
  2: { term: '上、下册', unit: '表内乘除与数感', points: ['乘法意义', '平均分'], summary: '把相同加数改写成乘法，平均分时想乘法口诀检查。' },
  3: { term: '上、下册', unit: '乘除运算与分数初步', points: ['多位数运算', '分数意义'], summary: '先分清单位和数量关系，运算后用估算或逆运算检查。' },
  4: { term: '上、下册', unit: '四则运算与小数初步', points: ['运算顺序', '小数意义'], summary: '先找清楚每一步要解决什么，再按顺序计算并检查小数点位置。' },
  5: { term: '上、下册', unit: '小数、分数与图形', points: ['小数运算', '分数关系'], summary: '把复杂问题拆成清楚的小步骤，注意单位、进率和数量关系。' },
  6: { term: '上、下册', unit: '分数、比与综合应用', points: ['分数运算', '比例思想'], summary: '先确定“谁和谁相比”，再选择合适的运算，用结果回到题意检查。' },
};

function getTextbookOptions(schoolStage) {
  return schoolStage === 'junior' ? juniorTextbookOptions : textbookOptions;
}

function inferSchoolStage(textbookId, schoolStage) {
  if (schoolStage === 'junior' || schoolStage === 'primary') return schoolStage;
  return String(textbookId || '').startsWith('jr-') ? 'junior' : 'primary';
}

function getTextbookOption(textbookId, schoolStage) {
  const options = getTextbookOptions(inferSchoolStage(textbookId, schoolStage));
  return options.find((item) => item.value === textbookId && item.available) || options[0];
}

function getPrimaryLearningMap(textbookId, grade, learningTerm) {
  const edition = getTextbookOption(textbookId);
  const safeGrade = Math.min(6, Math.max(1, Number(grade) || 4));
  const theme = gradeThemes[safeGrade];
  const prefix = editionPrefixes[edition.value];
  const curriculum = getPrimaryCurriculumTopics(edition.value, safeGrade);
  const schoolSystemHint = edition.schoolSystem === '5-4'
    ? '五四制（小学五年、初中四年）'
    : edition.schoolSystem === '6-3'
      ? '六三制（小学六年、初中三年）'
      : '';
  const selectedTopics = ['上册', '下册'].includes(learningTerm)
    ? curriculum.filter((topic) => topic.term === learningTerm)
    : curriculum;
  return {
    textbookId: edition.value,
    textbookLabel: edition.label,
    grade: safeGrade,
    term: learningTerm || '上册、下册',
    unitLabel: `${prefix}：${learningTerm ? `${learningTerm}${theme.unit}` : theme.unit}`,
    editionUnitKey: curriculum[0] ? curriculum[0].editionUnitKey : `${edition.value}-g${safeGrade}-core`,
    knowledgePoints: selectedTopics.map((topic) => topic.topicLabel),
    summary: schoolSystemHint ? `${schoolSystemHint}。${edition.focus}。${theme.summary}` : `${edition.focus}。${theme.summary}`,
    ...(edition.schoolSystem ? { schoolSystem: edition.schoolSystem } : {}),
  };
}

function getJuniorCatalogLearningMap(textbookId, grade, learningTerm) {
  const edition = getTextbookOption(textbookId, 'junior');
  const map = getJuniorLearningMap(edition.value, grade, learningTerm);
  const schoolSystemHint = edition.schoolSystem === '5-4'
    ? '\u4e94\u56db\u5236\uff08\u5c0f\u5b66\u4e94\u5e74\u3001\u521d\u4e2d\u56db\u5e74\uff09'
    : '';

  return {
    ...map,
    textbookLabel: edition.label,
    unitLabel: map.unitLabel.replace(map.textbookLabel, edition.label),
    summary: schoolSystemHint ? `${schoolSystemHint}\u3002${map.summary}` : map.summary,
    ...(edition.schoolSystem ? { schoolSystem: edition.schoolSystem } : {}),
  };
}

function getLearningMap(textbookId, grade, schoolStage, learningTerm) {
  const stage = schoolStage === 'junior' || Number(grade) >= 7
    ? 'junior'
    : inferSchoolStage(textbookId, schoolStage);
  return stage === 'junior'
    ? getJuniorCatalogLearningMap(textbookId, grade, learningTerm)
    : getPrimaryLearningMap(textbookId, grade, learningTerm);
}

const learningMaps = {};
textbookOptions.forEach((edition) => {
  [1, 2, 3, 4, 5, 6].forEach((grade) => {
    learningMaps[`${edition.value}-${grade}`] = getLearningMap(edition.value, grade);
  });
});

module.exports = {
  textbookOptions,
  juniorTextbookOptions,
  getTextbookOptions,
  inferSchoolStage,
  learningMaps,
  getTextbookOption,
  getPrimaryLearningMap,
  getJuniorCatalogLearningMap,
  getLearningMap,
};
