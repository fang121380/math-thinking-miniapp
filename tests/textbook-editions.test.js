const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  textbookOptions,
  getTextbookOptions,
  getLearningMap,
  getTextbookOption,
} = require('../miniprogram/utils/textbook-catalog');
const {
  diagnosticQuestions,
  practiceQuestions,
  validateQuestion,
  getQuestionBank,
  getQuestionTopicLabel,
} = require('../miniprogram/utils/question-bank');
const {
  buildDailySet,
  buildSelfPracticeSet,
  createMistakeRecord,
} = require('../miniprogram/utils/adaptive');
const { selectDiagnosticSet } = require('../miniprogram/utils/diagnostic');
const { createProgressStore, defaultProgress } = require('../miniprogram/utils/storage');
const {
  getEditionGradeProfile,
  getJuniorEditionProfile,
} = require('../miniprogram/utils/textbook-edition-profiles');
const { getJuniorTopics } = require('../miniprogram/utils/junior-high-curriculum');

const textbookIds = ['rjb', 'bsd', 'suj', 'qd', 'sh', 'xsb', 'hebei', 'xiang'];
const juniorTextbookIds = ['jr-rjb', 'jr-bsd', 'jr-suk', 'jr-huk', 'jr-luj', 'jr-xj', 'jr-hsd', 'jr-zj'];

function memoryAdapter(initialValue) {
  let value = initialValue;
  return { get() { return value; }, set(next) { value = next; } };
}

test('catalogue exposes eight selectable editions and six current-learning maps each', () => {
  assert.deepEqual(textbookOptions.map((item) => item.value), textbookIds);
  textbookIds.forEach((textbookId) => {
    assert.equal(getTextbookOption(textbookId).available, true);
    for (let grade = 1; grade <= 6; grade += 1) {
      const map = getLearningMap(textbookId, grade);
      assert.equal(map.textbookId, textbookId);
      assert.equal(map.grade, grade);
      assert.ok(map.unitLabel.length > 1);
      assert.ok(map.editionUnitKey.startsWith(`${textbookId}-g${grade}-`));
      assert.ok(map.knowledgePoints.length >= 2);
      assert.ok(map.summary.length > 5);
    }
  });
});

test('stage-aware textbook options keep the primary textbook API compatible', () => {
  assert.deepEqual(getTextbookOptions('primary').map((item) => item.value), textbookIds);
  assert.deepEqual(getTextbookOptions().map((item) => item.value), textbookIds);
  assert.deepEqual(textbookOptions.map((item) => item.value), textbookIds);
  assert.deepEqual(getLearningMap('rjb', 4), getLearningMap('rjb', 4, 'primary'));
});

test('namespaced junior textbook IDs infer the junior stage without an explicit setting', () => {
  const edition = getTextbookOption('jr-bsd');
  const map = getLearningMap('jr-bsd', 6);
  assert.equal(edition.value, 'jr-bsd');
  assert.equal(map.schoolStage, 'junior');
  assert.equal(map.textbookId, 'jr-bsd');
  assert.equal(map.grade, 7);
});

test('every edition has a distinct junior curriculum map for grades seven to nine', () => {
  const options = getTextbookOptions('junior');
  assert.deepEqual(options.map((item) => item.value), juniorTextbookIds);

  const signatures = [];
  options.forEach((edition) => [7, 8, 9].forEach((grade) => {
    const map = getLearningMap(edition.value, grade, 'junior');
    const topics = getJuniorTopics(edition.value, grade);
    const profile = getJuniorEditionProfile(edition.value, grade);
    assert.equal(map.schoolStage, 'junior');
    assert.equal(map.textbookId, edition.value);
    assert.equal(map.grade, grade);
    const minimumTopicCount = edition.value === 'jr-luj' ? 5 : 8;
    assert.ok(map.knowledgePoints.length >= minimumTopicCount);
    assert.equal(topics.length, map.knowledgePoints.length);
    assert.ok(topics.every((topic) => topic.key && topic.label && topic.emphasis));
    assert.match(map.unitLabel, new RegExp(edition.label));
    assert.equal(profile.textbookId, edition.value);
    assert.equal(profile.grade, grade);
    assert.ok(profile.promptFamilies.length >= 3);
    signatures.push(JSON.stringify({
      unit: map.unitLabel,
      key: map.editionUnitKey,
      topics: map.knowledgePoints,
      families: profile.promptFamilies,
    }));
  }));
  assert.equal(new Set(signatures).size, 24);
});

test('every edition and grade owns explained choice, fill, and problem questions', () => {
  textbookIds.forEach((textbookId) => {
    for (let grade = 1; grade <= 6; grade += 1) {
      const questions = practiceQuestions.filter((item) => item.textbookId === textbookId && item.grade === grade);
      assert.deepEqual([...new Set(questions.map((item) => item.type))].sort(), ['choice', 'fill', 'problem']);
      assert.ok(questions.length >= 12, `${textbookId} grade ${grade} needs enough variants for a 10-question goal`);
      questions.forEach((item) => {
        assert.equal(validateQuestion(item), true);
        assert.ok(item.editionUnitKey.startsWith(`${textbookId}-g${grade}-`));
        assert.ok(item.knowledgeSummary.length > 5);
        assert.ok(item.mistakeSummary.length > 0);
      });
    }
  });
});

test('edition-grade profiles and question prompt families are genuinely distinct', () => {
  for (let grade = 1; grade <= 6; grade += 1) {
    const signatures = textbookIds.map((textbookId) => getEditionGradeProfile(textbookId, grade).promptFamilies.join('|'));
    assert.equal(new Set(signatures).size, textbookIds.length, `grade ${grade} profiles must not share one template order`);

    const promptSignatures = textbookIds.map((textbookId) => practiceQuestions
      .filter((item) => item.textbookId === textbookId && item.grade === grade)
      .map((item) => item.curriculumFamily)
      .join('|'));
    assert.equal(new Set(promptSignatures).size, textbookIds.length, `grade ${grade} banks must use distinct prompt families`);
  }
});

test('one edition-grade never reuses the same generated calculation across question types', () => {
  textbookIds.forEach((textbookId) => {
    for (let grade = 1; grade <= 6; grade += 1) {
      const generated = practiceQuestions.filter((item) => (
        item.textbookId === textbookId
        && item.grade === grade
        && item.id.startsWith(`p-${textbookId}-g${grade}-`)
      ));
      const coreExpressions = generated.map((item) => item.calculationExpression).filter(Boolean);
      assert.equal(new Set(coreExpressions).size, coreExpressions.length, `${textbookId} grade ${grade} repeats a calculation template`);
    }
  });
});

test('daily sets preserve an active order but change with a fresh attempt nonce', () => {
  const profile = {
    learnerId: 'nonce-learner', textbookId: 'qd', grade: 4, difficultyMode: 'medium', dailyGoal: 10,
    completedIds: [], dailySetDate: '', dailyQuestionIds: [], dailySetNonce: 1,
  };
  const first = buildDailySet(practiceQuestions, profile, { date: '2026-07-17', goal: 10 }).map((item) => item.id);
  const repeated = buildDailySet(practiceQuestions, profile, { date: '2026-07-17', goal: 10 }).map((item) => item.id);
  const next = buildDailySet(practiceQuestions, { ...profile, dailySetNonce: 2 }, { date: '2026-07-17', goal: 10 }).map((item) => item.id);
  assert.deepEqual(repeated, first);
  assert.notDeepEqual(next, first);
  assert.ok(next.every((id) => id.includes('-qd-g4-')));
});

test('practice and diagnostic selectors never mix the selected textbook edition', () => {
  textbookIds.forEach((textbookId) => {
    const profile = { learnerId: `edition-${textbookId}`, textbookId, grade: 4, difficultyMode: 'medium', dailyGoal: 3, completedIds: [] };
    const daily = buildDailySet(practiceQuestions, profile, { goal: 3, date: '2026-07-17' });
    const selfPractice = buildSelfPracticeSet(practiceQuestions, profile, { goal: 3 });
    const diagnostic = selectDiagnosticSet(diagnosticQuestions, { ...profile, attempt: 1 });
    assert.equal(daily.length, 3);
    assert.equal(selfPractice.questions.length, 3);
    assert.ok(daily.every((item) => item.textbookId === textbookId));
    assert.ok(selfPractice.questions.every((item) => item.textbookId === textbookId));
    assert.equal(diagnostic.length, 5);
    assert.ok(diagnostic.every((item) => item.textbookId === textbookId));
  });
});

test('edition topic practice can fill a three-question easy set', () => {
  const profile = { learnerId: 'bsd-easy', textbookId: 'bsd', grade: 4, difficultyMode: 'easy', completedIds: [] };
  const knowledgePoint = practiceQuestions.find((item) => item.textbookId === 'bsd' && item.grade === 4 && item.type === 'choice' && item.difficulty === 1).knowledgePoint;
  const result = buildSelfPracticeSet(practiceQuestions, profile, {
    textbookId: 'bsd', grade: 4, knowledgePoint, type: 'choice', difficultyMode: 'easy', goal: 3,
  });
  assert.equal(result.questions.length, 3);
  assert.ok(result.questions.every((item) => item.difficulty === 1));
});

test('switching editions clears only active sets and keeps history, stars, and mistake edition data', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const rjbQuestion = practiceQuestions.find((item) => item.textbookId === 'rjb' && item.grade === 4 && item.type === 'problem');
  const mistake = createMistakeRecord(rjbQuestion, '0', practiceQuestions);
  const changed = store.changeTextbook({
    ...defaultProgress(),
    textbookId: 'rjb',
    stars: 6,
    completedIds: [rjbQuestion.id],
    mistakes: [mistake],
    dailyQuestionIds: [rjbQuestion.id],
    selfPracticeQuestionIds: [rjbQuestion.id],
    diagnosticQuestionIds: [rjbQuestion.id],
    diagnosticInProgress: true,
  }, 'bsd');
  assert.equal(changed.textbookId, 'bsd');
  assert.equal(changed.stars, 6);
  assert.deepEqual(changed.completedIds, [rjbQuestion.id]);
  assert.equal(changed.mistakes[0].textbookId, 'rjb');
  assert.deepEqual(changed.dailyQuestionIds, []);
  assert.deepEqual(changed.selfPracticeQuestionIds, []);
  assert.deepEqual(changed.diagnosticQuestionIds, []);
  assert.equal(changed.diagnosticInProgress, false);
});

test('learning pages bind selected-edition maps, filters, mistakes, and result BGM sync', () => {
  const root = path.join(__dirname, '..', 'miniprogram', 'pages');
  const mine = fs.readFileSync(path.join(root, 'mine', 'mine.js'), 'utf8');
  const practice = fs.readFileSync(path.join(root, 'practice', 'practice.js'), 'utf8');
  const growth = fs.readFileSync(path.join(root, 'growth', 'growth.js'), 'utf8');
  const result = fs.readFileSync(path.join(root, 'result', 'result.js'), 'utf8');
  assert.match(mine, /getLearningMap/);
  assert.match(mine, /changeTextbook/);
  assert.match(practice, /textbookId: progress\.textbookId/);
  assert.match(growth, /filterRecordsForLearningScope\(progress\.mistakes, progress\)/);
  assert.match(result, /syncBackgroundMusic\(progress\.bgmEnabled, progress\.bgmTrackIndex\)/);
});

test('result and growth expose the fifth data ability', () => {
  const root = path.join(__dirname, '..', 'miniprogram', 'pages');
  const result = fs.readFileSync(path.join(root, 'result', 'result.js'), 'utf8');
  const growth = fs.readFileSync(path.join(root, 'growth', 'growth.js'), 'utf8');
  assert.match(result, /data:\s*['"]/);
  assert.match(growth, /data:\s*['"]/);
});

test('junior weak topics resolve to distinct subject labels', () => {
  assert.equal(typeof getQuestionTopicLabel, 'function');
  const bank = getQuestionBank({ schoolStage: 'junior', textbookId: 'jr-rjb', grade: 8 }).diagnosticQuestions;
  const first = bank.find((item) => item.knowledgePoint === 'real_number');
  const second = bank.find((item) => item.knowledgePoint === 'linear_function');
  const labels = [getQuestionTopicLabel(first), getQuestionTopicLabel(second)];
  assert.ok(labels.every(Boolean));
  assert.equal(new Set(labels).size, 2);
  assert.notEqual(labels[0], 'symbolic');
  assert.notEqual(labels[1], 'symbolic');
});
