// Internal curriculum contract used by question generation and quality checks.
// It intentionally describes only the core, grade-appropriate scope that this
// app publishes. Publisher-specific chapter names can be updated here without
// changing question-selection code.

const PRIMARY_EDITION_IDS = ['rjb', 'bsd', 'suj', 'qd', 'sh', 'xsb', 'hebei', 'xiang'];
const JUNIOR_EDITION_IDS = ['jr-rjb', 'jr-bsd', 'jr-suk', 'jr-huk', 'jr-luj', 'jr-xj', 'jr-hsd', 'jr-zj'];

const PRIMARY_EDITION_META = {
  rjb: { unitKey: 'concept', chapterPrefix: '概念与运算', form: 'symbolic' },
  bsd: { unitKey: 'explore', chapterPrefix: '观察与探索', form: 'operation' },
  suj: { unitKey: 'relation', chapterPrefix: '数量关系', form: 'application' },
  qd: { unitKey: 'context', chapterPrefix: '生活情境', form: 'data', schoolSystem: '6-3' },
  sh: { unitKey: 'activity', chapterPrefix: '数学活动', form: 'representation', schoolSystem: '5-4' },
  xsb: { unitKey: 'practice', chapterPrefix: '实践与推理', form: 'diagram' },
  hebei: { unitKey: 'method', chapterPrefix: '生活问题', form: 'strategy' },
  xiang: { unitKey: 'pattern', chapterPrefix: '规律与表达', form: 'pattern' },
};

const PRIMARY_TOPICS = {
  1: [
    ['add_within_20', '20以内加法', '上册'], ['subtract_within_20', '20以内减法', '上册'],
    ['add_within_100', '整十数加减', '下册'], ['money_count', '认识人民币', '下册'],
    ['clock_reading', '认识钟表', '下册'], ['shape_recognition', '认识图形', '上册'],
    ['length_compare', '比较长短', '下册'], ['pattern_addition', '找数的规律', '下册'],
  ],
  2: [
    ['add_subtract_100', '100以内加减法', '上册'], ['multiplication_table', '表内乘法', '上册'],
    ['division_table', '表内除法', '下册'], ['number_within_10000', '万以内数', '下册'],
    ['length_unit', '长度单位', '上册'], ['time_duration', '时间计算', '下册'],
    ['angle_right', '直角认识', '上册'], ['data_compare', '数据整理', '下册'],
  ],
  3: [
    ['multiply_two_digit', '两位数乘法', '上册'], ['division_remainder', '有余数除法', '上册'],
    ['fraction_compare', '分数初步', '上册'], ['rectangle_perimeter_g3', '长方形周长', '上册'],
    ['mass_convert', '质量单位', '下册'], ['area_rectangle_g3', '长方形面积', '下册'],
    ['decimal_tenths', '小数初步', '下册'], ['average_g3', '数据规律', '下册'],
  ],
  4: [
    ['division_estimation', '除法估算', '上册'], ['multiply_estimation', '乘法估算', '上册'],
    ['view_from_direction', '观察物体', '上册'], ['number_pattern', '规律推理', '下册'],
    ['division_exact', '两位数除法', '上册'], ['average', '平均数', '下册'],
    ['two_step_division_problem', '两步应用题', '下册'], ['decimal_money_problem', '小数生活应用', '下册'],
  ],
  5: [
    ['decimal_multiply', '小数乘法', '上册'], ['decimal_divide', '小数除法', '上册'],
    ['factor_multiple', '因数与倍数', '上册'], ['fraction_add', '分数加减法', '下册'],
    ['area_rectangle_g5', '多边形面积', '上册'], ['volume_cuboid', '长方体体积', '下册'],
    ['unit_conversion_g5', '单位换算', '下册'], ['average_g5', '统计与平均数', '下册'],
  ],
  6: [
    ['fraction_multiply', '分数乘法', '上册'], ['fraction_divide', '分数除法', '上册'],
    ['ratio', '比的应用', '上册'], ['percent', '百分数', '上册'],
    ['circle', '圆的周长', '上册'], ['proportion', '比例关系', '下册'],
    ['negative_number', '负数', '下册'], ['volume_cone', '圆锥体积', '下册'],
  ],
};

// Only catalogued differences with a source record belong here. The 2022 RJB
// grade-four lower-volume table of contents places "观察物体（二）" in unit 2.
const PRIMARY_EDITION_TOPIC_OVERRIDES = {
  rjb: {
    4: {
      view_from_direction: [
        'view_from_direction',
        '观察物体',
        '下册',
        '第2单元 观察物体（二）',
        '02',
      ],
    },
  },
};

const JUNIOR_EDITION_META = {
  'jr-rjb': { unitKey: 'concept', chapterPrefix: '概念建构', form: 'symbolic' },
  'jr-bsd': { unitKey: 'explore', chapterPrefix: '观察探索', form: 'table' },
  'jr-suk': { unitKey: 'model', chapterPrefix: '数量建模', form: 'application' },
  'jr-huk': { unitKey: 'experiment', chapterPrefix: '实验观察', form: 'record' },
  'jr-luj': { unitKey: 'practice', chapterPrefix: '实践检验', form: 'decision', schoolSystem: '5-4' },
  'jr-xj': { unitKey: 'pattern', chapterPrefix: '规律表达', form: 'pattern' },
  'jr-hsd': { unitKey: 'argument', chapterPrefix: '合作论证', form: 'argument' },
  'jr-zj': { unitKey: 'engineering', chapterPrefix: '探究建模', form: 'constraint' },
};

const JUNIOR_SOURCE_ALIGNED_EDITIONS = new Set(['jr-luj']);

const JUNIOR_TOPICS = {
  7: [
    ['rational_number', '有理数', '上册'], ['algebraic_expression', '整式与代数式', '上册'],
    ['linear_equation', '一元一次方程', '上册'], ['angle_line', '直线与角', '下册'],
    ['triangle_intro', '三角形初步', '下册'], ['data_statistics', '数据统计', '下册'],
    ['inequality_intro', '不等式初步', '下册'], ['coordinate_plane', '平面直角坐标系', '下册'],
  ],
  8: [
    ['congruent_triangle', '全等三角形', '上册'], ['axis_symmetry', '轴对称', '上册'],
    ['linear_function', '一次函数', '下册'], ['fraction_expression', '分式', '下册'],
    ['pythagorean', '勾股定理', '上册'], ['data_analysis', '数据分析', '下册'],
    ['real_number', '实数', '上册'], ['geometry_proof', '几何证明', '下册'],
  ],
  9: [
    ['quadratic_function', '二次函数', '上册'], ['circle', '圆', '上册'],
    ['similar_triangle', '相似三角形', '上册'], ['right_triangle', '锐角三角函数', '下册'],
    ['probability', '概率', '下册'], ['quadratic_equation', '一元二次方程', '上册'],
    ['geometry_comprehensive', '几何综合', '下册'], ['data_inference', '数据推断', '下册'],
  ],
};

// Publisher-specific term routing. Preserve topic-key order so shared junior
// question generation retains stable chapter and display-label indexes.
const JUNIOR_EDITION_TOPICS = {
  'jr-rjb': {
    7: [
      ['rational_number', '\u6709\u7406\u6570', '\u4e0a\u518c'], ['algebraic_expression', '\u6574\u5f0f\u4e0e\u4ee3\u6570\u5f0f', '\u4e0a\u518c'],
      ['linear_equation', '\u4e00\u5143\u4e00\u6b21\u65b9\u7a0b', '\u4e0a\u518c'], ['angle_line', '\u51e0\u4f55\u56fe\u5f62\u4e0e\u89d2', '\u4e0a\u518c'],
      ['triangle_intro', '\u4e09\u89d2\u5f62\u521d\u6b65', '\u4e0b\u518c'], ['data_statistics', '\u6570\u636e\u7edf\u8ba1', '\u4e0b\u518c'],
      ['inequality_intro', '\u4e0d\u7b49\u5f0f\u521d\u6b65', '\u4e0b\u518c'], ['coordinate_plane', '\u5e73\u9762\u76f4\u89d2\u5750\u6807\u7cfb', '\u4e0b\u518c'],
    ],
  },
  // Source-aligned LuJ five-four topics. Entries intentionally include only
  // concepts with a matching junior question model; unsupported source
  // chapters are not relabelled as a different model.
  'jr-luj': {
    7: [
      ['triangle_intro', '\u4e09\u89d2\u5f62', '\u4e0a\u518c', '\u7b2c\u4e00\u7ae0 \u4e09\u89d2\u5f62', '01'],
      ['congruent_triangle', '\u56fe\u5f62\u7684\u5168\u7b49', '\u4e0a\u518c', '\u7b2c\u4e00\u7ae0 \u4e09\u89d2\u5f62', '01'],
      ['axis_symmetry', '\u8f74\u5bf9\u79f0', '\u4e0a\u518c', '\u7b2c\u4e8c\u7ae0 \u8f74\u5bf9\u79f0', '02'],
      ['pythagorean', '\u52fe\u80a1\u5b9a\u7406', '\u4e0a\u518c', '\u7b2c\u4e09\u7ae0 \u52fe\u80a1\u5b9a\u7406', '03'],
      ['real_number', '\u5b9e\u6570', '\u4e0a\u518c', '\u7b2c\u56db\u7ae0 \u5b9e\u6570', '04'],
      ['coordinate_plane', '\u4f4d\u7f6e\u4e0e\u5750\u6807', '\u4e0a\u518c', '\u7b2c\u4e94\u7ae0 \u4f4d\u7f6e\u4e0e\u5750\u6807', '05'],
      ['linear_function', '\u4e00\u6b21\u51fd\u6570', '\u4e0a\u518c', '\u7b2c\u516d\u7ae0 \u4e00\u6b21\u51fd\u6570', '06'],
      ['probability', '\u6982\u7387\u521d\u6b65', '\u4e0b\u518c', '\u7b2c\u4e5d\u7ae0 \u6982\u7387\u521d\u6b65', '09'],
      ['geometry_proof', '\u4e09\u89d2\u5f62\u7684\u6709\u5173\u8bc1\u660e', '\u4e0b\u518c', '\u7b2c\u5341\u7ae0 \u4e09\u89d2\u5f62\u7684\u6709\u5173\u8bc1\u660e', '10'],
      ['inequality_intro', '\u4e00\u5143\u4e00\u6b21\u4e0d\u7b49\u5f0f\u548c\u4e00\u5143\u4e00\u6b21\u4e0d\u7b49\u5f0f\u7ec4', '\u4e0b\u518c', '\u7b2c\u5341\u4e00\u7ae0 \u4e00\u5143\u4e00\u6b21\u4e0d\u7b49\u5f0f\u548c\u4e00\u5143\u4e00\u6b21\u4e0d\u7b49\u5f0f\u7ec4', '11'],
    ],
    8: [
      ['fraction_expression', '\u5206\u5f0f\u4e0e\u5206\u5f0f\u65b9\u7a0b', '\u4e0a\u518c', '\u7b2c\u4e8c\u7ae0 \u5206\u5f0f\u4e0e\u5206\u5f0f\u65b9\u7a0b', '02'],
      ['data_analysis', '\u6570\u636e\u7684\u5206\u6790', '\u4e0a\u518c', '\u7b2c\u4e09\u7ae0 \u6570\u636e\u7684\u5206\u6790', '03'],
      ['real_number', '\u4e8c\u6b21\u6839\u5f0f', '\u4e0b\u518c', '\u7b2c\u4e03\u7ae0 \u4e8c\u6b21\u6839\u5f0f', '07'],
      ['quadratic_equation', '\u4e00\u5143\u4e8c\u6b21\u65b9\u7a0b', '\u4e0b\u518c', '\u7b2c\u516b\u7ae0 \u4e00\u5143\u4e8c\u6b21\u65b9\u7a0b', '08'],
      ['similar_triangle', '\u56fe\u5f62\u7684\u76f8\u4f3c', '\u4e0b\u518c', '\u7b2c\u4e5d\u7ae0 \u56fe\u5f62\u7684\u76f8\u4f3c', '09'],
    ],
    9: [
      ['right_triangle', '\u76f4\u89d2\u4e09\u89d2\u5f62\u7684\u8fb9\u89d2\u5173\u7cfb', '\u4e0a\u518c', '\u7b2c\u4e8c\u7ae0 \u76f4\u89d2\u4e09\u89d2\u5f62\u7684\u8fb9\u89d2\u5173\u7cfb', '02'],
      ['quadratic_function', '\u4e8c\u6b21\u51fd\u6570', '\u4e0a\u518c', '\u7b2c\u4e09\u7ae0 \u4e8c\u6b21\u51fd\u6570', '03'],
      ['quadratic_equation', '\u4e8c\u6b21\u51fd\u6570\u4e0e\u4e00\u5143\u4e8c\u6b21\u65b9\u7a0b', '\u4e0a\u518c', '\u7b2c\u4e09\u7ae0 \u4e8c\u6b21\u51fd\u6570', '03'],
      ['circle', '\u5706', '\u4e0b\u518c', '\u7b2c\u4e94\u7ae0 \u5706', '05'],
      ['probability', '\u5bf9\u6982\u7387\u7684\u8fdb\u4e00\u6b65\u8ba4\u8bc6', '\u4e0b\u518c', '\u7b2c\u516d\u7ae0 \u5bf9\u6982\u7387\u7684\u8fdb\u4e00\u6b65\u8ba4\u8bc6', '06'],
      ['data_inference', '\u7edf\u8ba1\u6d3b\u52a8\u2014\u2014\u89c6\u529b\u7684\u53d8\u5316', '\u4e0b\u518c', '\u7edf\u8ba1\u6d3b\u52a8\u2014\u2014\u89c6\u529b\u7684\u53d8\u5316', '07'],
    ],
  },
};

function normalizeGrade(grade, minimum, maximum) {
  const value = Number(grade);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : null;
}

function buildScope(stage, editionId, grade, topic, meta, topicList) {
  if (!topic || !meta) return null;
  const [key, label, term, sourceChapterLabel, sourceChapterOrder] = topic;
  const chapterIndex = (topicList || (stage === 'primary' ? PRIMARY_TOPICS : JUNIOR_TOPICS)[grade])
    .findIndex((item) => item[0] === key) + 1;
  const chapterOrder = sourceChapterOrder || String(chapterIndex).padStart(2, '0');
  const chapterId = `${editionId}-g${grade}-${meta.unitKey}-${chapterOrder}`;
  const sourceAligned = stage !== 'junior' || JUNIOR_SOURCE_ALIGNED_EDITIONS.has(editionId);
  return {
    schoolStage: stage,
    textbookId: editionId,
    grade,
    topicKey: key,
    topicLabel: label,
    term,
    chapterId,
    // Do not present a generated category such as “concept building” as a
    // publisher chapter. Unverified editions show the topic itself until a
    // chapter-level mapping has been reviewed.
    chapterLabel: sourceChapterLabel || label,
    editionUnitKey: `${editionId}-g${grade}-${meta.unitKey}`,
    modelForm: meta.form,
    curriculumAlignment: sourceAligned ? 'source-aligned' : 'topic-aligned',
    ...(meta.schoolSystem ? { schoolSystem: meta.schoolSystem } : {}),
  };
}

function getPrimaryCurriculumTopics(textbookId, grade) {
  const safeGrade = normalizeGrade(grade, 1, 6);
  const meta = PRIMARY_EDITION_META[textbookId];
  if (!safeGrade || !meta) return [];
  const baseTopics = PRIMARY_TOPICS[safeGrade];
  const topicOverrides = ((PRIMARY_EDITION_TOPIC_OVERRIDES[textbookId] || {})[safeGrade]) || {};
  const topics = baseTopics.map((topic) => topicOverrides[topic[0]] || topic);
  return topics.map((topic) => buildScope('primary', textbookId, safeGrade, topic, meta, topics));
}

function getJuniorCurriculumTopics(textbookId, grade) {
  const safeGrade = normalizeGrade(grade, 7, 9);
  const meta = JUNIOR_EDITION_META[textbookId];
  if (!safeGrade || !meta) return [];
  const editionTopics = JUNIOR_EDITION_TOPICS[textbookId];
  const topics = (editionTopics && editionTopics[safeGrade]) || JUNIOR_TOPICS[safeGrade];
  return topics.map((topic) => buildScope('junior', textbookId, safeGrade, topic, meta, topics));
}

function getCurriculumScope(schoolStage, textbookId, grade, topicKey) {
  const topics = schoolStage === 'junior'
    ? getJuniorCurriculumTopics(textbookId, grade)
    : getPrimaryCurriculumTopics(textbookId, grade);
  return topics.find((topic) => topic.topicKey === topicKey) || null;
}

function getCurriculumTopics(schoolStage, textbookId, grade) {
  return schoolStage === 'junior'
    ? getJuniorCurriculumTopics(textbookId, grade)
    : getPrimaryCurriculumTopics(textbookId, grade);
}

module.exports = {
  PRIMARY_EDITION_IDS,
  JUNIOR_EDITION_IDS,
  JUNIOR_EDITION_META,
  PRIMARY_TOPICS,
  PRIMARY_EDITION_TOPIC_OVERRIDES,
  JUNIOR_TOPICS,
  JUNIOR_EDITION_TOPICS,
  getPrimaryCurriculumTopics,
  getJuniorCurriculumTopics,
  getCurriculumScope,
  getCurriculumTopics,
};
