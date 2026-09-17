const { getJuniorEditionProfile } = require('./textbook-edition-profiles');
const { JUNIOR_TOPICS, getJuniorCurriculumTopics } = require('./textbook-curriculum');

const TOPIC_EMPHASIS = {
  rational_number: '\u7528\u6570\u8f74\u548c\u76f8\u53cd\u6570\u89e3\u91ca\u6b63\u8d1f\u6570\u8fd0\u7b97\u3002', algebraic_expression: '\u628a\u6570\u91cf\u5173\u7cfb\u51c6\u786e\u5730\u5199\u6210\u4ee3\u6570\u5f0f\u3002', linear_equation: '\u6839\u636e\u7b49\u91cf\u5173\u7cfb\u5217\u65b9\u7a0b\u5e76\u68c0\u9a8c\u89e3\u3002', angle_line: '\u4ece\u89d2\u7684\u5173\u7cfb\u4e2d\u8fdb\u884c\u6709\u4f9d\u636e\u7684\u63a8\u7406\u3002', triangle_intro: '\u8bc6\u522b\u4e09\u89d2\u5f62\u7684\u8fb9\u89d2\u5173\u7cfb\u548c\u57fa\u672c\u6027\u8d28\u3002', data_statistics: '\u6574\u7406\u6570\u636e\u5e76\u7528\u7edf\u8ba1\u91cf\u8868\u8fbe\u7ed3\u8bba\u3002', inequality_intro: '\u628a\u6bd4\u8f83\u5173\u7cfb\u8f6c\u5316\u4e3a\u4e0d\u7b49\u5f0f\u3002', coordinate_plane: '\u7528\u6709\u5e8f\u6570\u5bf9\u63cf\u8ff0\u5e73\u9762\u4e2d\u7684\u4f4d\u7f6e\u3002', congruent_triangle: '\u4f9d\u636e\u6761\u4ef6\u5224\u65ad\u5168\u7b49\u5e76\u786e\u5b9a\u5bf9\u5e94\u8fb9\u89d2\u3002', axis_symmetry: '\u5229\u7528\u5bf9\u79f0\u6027\u8d28\u89c2\u5bdf\u56fe\u5f62\u4e2d\u7684\u4e0d\u53d8\u91cf\u3002', linear_function: '\u5728\u89e3\u6790\u5f0f\u3001\u8868\u683c\u548c\u56fe\u50cf\u95f4\u5efa\u7acb\u8054\u7cfb\u3002', fraction_expression: '\u5173\u6ce8\u5206\u6bcd\u4e0d\u4e3a\u96f6\u7684\u53d6\u503c\u6761\u4ef6\u3002', pythagorean: '\u5728\u76f4\u89d2\u4e09\u89d2\u5f62\u4e2d\u9009\u62e9\u5408\u9002\u7684\u8fb9\u957f\u5173\u7cfb\u3002', data_analysis: '\u6839\u636e\u6570\u636e\u7684\u96c6\u4e2d\u8d8b\u52bf\u548c\u6ce2\u52a8\u505a\u5224\u65ad\u3002', real_number: '\u7406\u89e3\u5e73\u65b9\u6839\u3001\u7acb\u65b9\u6839\u4e0e\u6570\u8f74\u4f4d\u7f6e\u3002', geometry_proof: '\u7528\u5df2\u77e5\u6761\u4ef6\u7ec4\u7ec7\u5b8c\u6574\u7684\u63a8\u7406\u6b65\u9aa4\u3002', quadratic_function: '\u7406\u89e3\u629b\u7269\u7ebf\u7684\u5f00\u53e3\u3001\u9876\u70b9\u548c\u53d8\u5316\u8d8b\u52bf\u3002', circle: '\u56f4\u7ed5\u5706\u5fc3\u3001\u534a\u5f84\u3001\u5f26\u548c\u5207\u7ebf\u6784\u5efa\u51e0\u4f55\u5173\u7cfb\u3002', similar_triangle: '\u7528\u5bf9\u5e94\u8fb9\u6210\u6bd4\u4f8b\u89e3\u51b3\u6d4b\u91cf\u95ee\u9898\u3002', right_triangle: '\u5728\u76f4\u89d2\u4e09\u89d2\u5f62\u4e2d\u5efa\u7acb\u8fb9\u89d2\u6570\u91cf\u5173\u7cfb\u3002', probability: '\u7528\u7b49\u53ef\u80fd\u7ed3\u679c\u5206\u6790\u968f\u673a\u4e8b\u4ef6\u3002', quadratic_equation: '\u9009\u62e9\u5408\u9002\u65b9\u6cd5\u6c42\u6839\u5e76\u4ee3\u56de\u68c0\u9a8c\u3002', geometry_comprehensive: '\u628a\u76f8\u4f3c\u3001\u5706\u548c\u76f4\u89d2\u5173\u7cfb\u4e32\u6210\u63a8\u7406\u94fe\u3002', data_inference: '\u533a\u5206\u6837\u672c\u7ed3\u8bba\u4e0e\u603b\u4f53\u63a8\u65ad\u7684\u8fb9\u754c\u3002',
};

const JUNIOR_GRADE_TOPICS = {};
Object.keys(JUNIOR_TOPICS).forEach((grade) => {
  JUNIOR_GRADE_TOPICS[grade] = JUNIOR_TOPICS[grade]
    .map(([key, label]) => ({ key, label, emphasis: TOPIC_EMPHASIS[key] }));
});

const GRADE_TOPIC_LABELS = {
  7: ['\u6570\u8f74\u4e0e\u76f8\u53cd\u6570', '\u5f0f\u7684\u503c', '\u7b49\u91cf\u5173\u7cfb', '\u76f4\u7ebf\u4e0e\u89d2\u5ea6', '\u4e09\u89d2\u5f62\u5185\u89d2', '\u5e73\u5747\u6570', '\u6574\u6570\u89e3\u4e0e\u8fb9\u754c', '\u5750\u6807\u53d8\u6362'],
  8: ['\u5168\u7b49\u5224\u5b9a', '\u8f74\u5bf9\u79f0\u6027\u8d28', '\u56fe\u50cf\u4e0e\u89e3\u6790\u5f0f', '\u5206\u5f0f\u5b9a\u4e49\u57df', '\u52fe\u80a1\u5173\u7cfb', '\u4e2d\u4f4d\u6570\u4e0e\u6ce2\u52a8', '\u5e73\u65b9\u6839\u4e0e\u7acb\u65b9\u6839', '\u51e0\u4f55\u63a8\u7406\u94fe'],
  9: ['\u56fe\u50cf\u4e0e\u6700\u503c', '\u534a\u5f84\u3001\u5f26\u4e0e\u5207\u7ebf', '\u6bd4\u4f8b\u6d4b\u91cf', '\u7279\u6b8a\u89d2\u4e09\u89d2\u6bd4', '\u968f\u673a\u4e8b\u4ef6', '\u65b9\u7a0b\u7684\u6839', '\u5706\u4e0e\u76f8\u4f3c\u7efc\u5408', '\u6837\u672c\u4f30\u8ba1'],
};

const TOPIC_LABEL_DETAILS = {
  rational_number: '\u6570\u8f74\u4e0e\u76f8\u53cd\u6570', algebraic_expression: '\u5f0f\u7684\u503c', linear_equation: '\u7b49\u91cf\u5173\u7cfb', angle_line: '\u76f4\u7ebf\u4e0e\u89d2\u5ea6',
  triangle_intro: '\u4e09\u89d2\u5f62\u5185\u89d2', data_statistics: '\u5e73\u5747\u6570', inequality_intro: '\u6574\u6570\u89e3\u4e0e\u8fb9\u754c', coordinate_plane: '\u5750\u6807\u53d8\u6362',
  congruent_triangle: '\u5168\u7b49\u5224\u5b9a', axis_symmetry: '\u8f74\u5bf9\u79f0\u6027\u8d28', linear_function: '\u56fe\u50cf\u4e0e\u89e3\u6790\u5f0f', fraction_expression: '\u5206\u5f0f\u5b9a\u4e49\u57df',
  pythagorean: '\u52fe\u80a1\u5173\u7cfb', data_analysis: '\u4e2d\u4f4d\u6570\u4e0e\u6ce2\u52a8', real_number: '\u5e73\u65b9\u6839\u4e0e\u7acb\u65b9\u6839', geometry_proof: '\u51e0\u4f55\u63a8\u7406\u94fe',
  quadratic_function: '\u56fe\u50cf\u4e0e\u6700\u503c', circle: '\u534a\u5f84\u3001\u5f26\u4e0e\u5207\u7ebf', similar_triangle: '\u6bd4\u4f8b\u6d4b\u91cf', right_triangle: '\u7279\u6b8a\u89d2\u4e09\u89d2\u6bd4',
  probability: '\u968f\u673a\u4e8b\u4ef6', quadratic_equation: '\u65b9\u7a0b\u7684\u6839', geometry_comprehensive: '\u5706\u4e0e\u76f8\u4f3c\u7efc\u5408', data_inference: '\u6837\u672c\u4f30\u8ba1',
};

const GRADE_UNIT_LABELS = {
  7: '\u6570\u4e0e\u5f0f\u3001\u65b9\u7a0b\u548c\u57fa\u7840\u51e0\u4f55',
  8: '\u51fd\u6570\u3001\u4e09\u89d2\u5f62\u4e0e\u8bc1\u660e',
  9: '\u4e8c\u6b21\u51fd\u6570\u3001\u5706\u4e0e\u7efc\u5408\u5e94\u7528',
};

function normalizeJuniorGrade(grade) {
  return Math.min(9, Math.max(7, Number(grade) || 7));
}

function getJuniorTopics(textbookId, grade) {
  const safeGrade = normalizeJuniorGrade(grade);
  const profile = getJuniorEditionProfile(textbookId, safeGrade);
  return getJuniorCurriculumTopics(profile.textbookId, safeGrade).map((scope, index) => ({
    key: scope.topicKey,
    // Display the real curriculum topic, never an internal generation mode.
    label: scope.topicLabel,
    emphasis: `${profile.focus}\uff1b${TOPIC_EMPHASIS[scope.topicKey]}`,
    context: profile.contexts[index % profile.contexts.length],
    term: scope.term,
    chapterId: scope.chapterId,
    chapterLabel: scope.chapterLabel,
    editionUnitKey: scope.editionUnitKey,
    modelForm: scope.modelForm,
  }));
}

function getJuniorLearningMap(textbookId, grade, learningTerm) {
  const safeGrade = normalizeJuniorGrade(grade);
  const profile = getJuniorEditionProfile(textbookId, safeGrade);
  const topics = getJuniorTopics(profile.textbookId, safeGrade);
  const selectedTopics = ['上册', '下册'].includes(learningTerm)
    ? topics.filter((topic) => topic.term === learningTerm)
    : topics;
  return {
    schoolStage: 'junior',
    textbookId: profile.textbookId,
    textbookLabel: profile.textbookLabel,
    grade: safeGrade,
    term: learningTerm || '\u4e0a\u518c\u3001\u4e0b\u518c',
    unitLabel: `${profile.textbookLabel}\uff1a${GRADE_UNIT_LABELS[safeGrade]}`,
    editionUnitKey: topics[0].editionUnitKey,
    knowledgePoints: selectedTopics.map((topic) => topic.label),
    summary: `${profile.focus}\u3002${profile.gradeEmphasis[safeGrade]}`,
  };
}

module.exports = {
  JUNIOR_GRADE_TOPICS,
  GRADE_TOPIC_LABELS,
  getJuniorTopics,
  getJuniorLearningMap,
};
