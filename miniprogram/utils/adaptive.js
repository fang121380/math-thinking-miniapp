const abilityLabels = {
  calculation: '运算理解',
  problem: '解决问题',
  geometry: '图形观察',
  pattern: '数据规律',
  data: '数据规律',
};

const { version: CONTENT_BANK_VERSION } = require('./question-bank-manifest');
const { getDailyTheme } = require('./daily-theme');
const { formatAnswerWithUnit } = require('./math-answer');
const { scopeKeyOf } = require('./question-bank');
const { questionContentSignature } = require('./question-content-signature');

const mistakeReasons = {
  skip_total: '漏掉了“先求总量”这一步，需要先算出全部数量再平均分。',
  divide_by_box_count: '把盒数当成了平均分的份数，没有对应题目中的“小组”。',
  place_value: '没有判断商或积的位数，容易少写或多写一个 0。',
  missing_zero: '根据较小算式推算时漏写了扩大后的 0。',
  calculation_error: '计算过程出现错误，建议用乘法或估算检查。',
  wrong_operation_order: '没有按题意确定先算什么、再算什么。',
  default: '答案与题意不一致，重新标出条件和问题后再分步计算。',
};

const reviewIntervals = [0, 1, 3, 7, 14];

function clampInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function addDays(date, days) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(timestamp)) return '';
  return new Date(timestamp + days * 86400000).toISOString().slice(0, 10);
}

function normalizeKnowledgeRecord(current = {}) {
  return {
    mastery: clampInteger(current.mastery, 0, 100, 50),
    reviewStage: clampInteger(current.reviewStage, 0, 4, 0),
    nextReviewDate: isDateKey(current.nextReviewDate) ? current.nextReviewDate : '',
    lastPracticedDate: isDateKey(current.lastPracticedDate) ? current.lastPracticedDate : '',
  };
}

function updateKnowledgeState(current, result, date) {
  const previous = normalizeKnowledgeRecord(current);
  const practicedDate = isDateKey(date) ? date : previous.lastPracticedDate;
  if (!practicedDate) return previous;

  if (result.correct && !result.usedHint) {
    const reviewStage = Math.min(4, previous.reviewStage + 1);
    return {
      mastery: Math.min(100, previous.mastery + 15),
      reviewStage,
      nextReviewDate: addDays(practicedDate, reviewIntervals[reviewStage]),
      lastPracticedDate: practicedDate,
    };
  }

  if (result.correct) {
    return {
      mastery: Math.min(100, previous.mastery + 7),
      reviewStage: 0,
      nextReviewDate: addDays(practicedDate, 1),
      lastPracticedDate: practicedDate,
    };
  }

  return {
    mastery: Math.max(0, previous.mastery - 18),
    reviewStage: 0,
    nextReviewDate: addDays(practicedDate, 1),
    lastPracticedDate: practicedDate,
  };
}

function getDueKnowledgePoints(knowledgeState, date) {
  if (!knowledgeState || typeof knowledgeState !== 'object' || !isDateKey(date)) return [];
  return Object.entries(knowledgeState)
    .filter(([, item]) => isDateKey(item && item.nextReviewDate) && item.nextReviewDate <= date)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([knowledgePoint]) => knowledgePoint);
}

function percentage(records) {
  if (records.length === 0) return 70;
  const correct = records.filter((record) => record.correct).length;
  const hints = records.filter((record) => record.usedHint).length;
  return Math.max(0, Math.round((correct / records.length) * 100 - hints * 5));
}

function scoreDiagnostic(responses, questions) {
  const responseMap = responses.reduce((result, response) => {
    result[response.questionId] = response;
    return result;
  }, {});
  const abilities = {};
  const knowledge = {};

  questions.forEach((item) => {
    const response = responseMap[item.id] || { correct: false, usedHint: false };
    if (!abilities[item.ability]) abilities[item.ability] = [];
    if (!knowledge[item.knowledgePoint]) knowledge[item.knowledgePoint] = [];
    abilities[item.ability].push(response);
    knowledge[item.knowledgePoint].push(response);
  });

  const abilityScores = Object.entries(abilities).reduce((result, [name, records]) => {
    result[name] = percentage(records);
    return result;
  }, {});
  if (abilityScores.data !== undefined && abilityScores.pattern === undefined) {
    abilityScores.pattern = abilityScores.data;
  }

  const knowledgeScores = Object.entries(knowledge)
    .map(([name, records]) => ({ name, score: percentage(records) }))
    .sort((a, b) => a.score - b.score);

  const weakAbilities = Object.entries(abilityScores)
    .filter(([, score]) => score < 70)
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);

  return {
    abilities: abilityScores,
    abilityLabels,
    weakAbilities,
    weakKnowledgePoints: knowledgeScores.slice(0, 2).map((item) => item.name),
    level: 1,
  };
}

function hashSeed(seedText) {
  return Array.from(String(seedText)).reduce(
    (value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
}

function seededShuffle(items, seedText) {
  return [...items]
    .map((item) => ({ item, order: hashSeed(`${seedText}:${item.id}`) }))
    .sort((left, right) => left.order - right.order)
    .map(({ item }) => item);
}

function selectCandidates(candidates, completedIds) {
  const unseen = candidates.filter((item) => !completedIds.has(item.id));
  return unseen.length ? unseen : candidates;
}

function matchesDifficulty(item, mode) {
  if (typeof item.difficulty === 'string') return item.difficulty === mode;
  if (mode === 'easy') return item.difficulty === 1;
  if (mode === 'hard') return item.difficulty === 3;
  return item.difficulty === 2;
}

function difficultyRank(value) {
  if (typeof value === 'string') return ({ easy: 1, medium: 2, hard: 3 }[value] || 2);
  return Number(value) || 2;
}

function normalizeDailyMissionMode(value) {
  return value === 'challenge' ? 'challenge' : 'review';
}

function isThinkingPattern(item) {
  return Boolean(item && item.examPattern && item.examPattern !== 'calculation_model');
}

function seenQuestionIds(profile) {
  return new Set([
    ...(Array.isArray(profile.completedIds) ? profile.completedIds : []),
    ...(Array.isArray(profile.servedQuestionIds) ? profile.servedQuestionIds : []),
  ]);
}

function seenQuestionContentSignatures(profile) {
  return new Set(Array.isArray(profile.servedQuestionSignatures)
    ? profile.servedQuestionSignatures.filter((item) => typeof item === 'string' && item)
    : []);
}

function rankCandidates(candidates, weakKnowledgePoints, completedIds, seedText, dueKnowledgePoints = [], knowledgeState = {}) {
  return seededShuffle(candidates, seedText).sort((left, right) => {
    const seenDifference = Number(completedIds.has(left.id)) - Number(completedIds.has(right.id));
    if (seenDifference) return seenDifference;

    const dueDifference = Number(dueKnowledgePoints.includes(right.knowledgePoint))
      - Number(dueKnowledgePoints.includes(left.knowledgePoint));
    if (dueDifference) return dueDifference;

    const weakDifference = Number(weakKnowledgePoints.includes(right.knowledgePoint))
      - Number(weakKnowledgePoints.includes(left.knowledgePoint));
    if (weakDifference) return weakDifference;

    const masteryDifference = Number((knowledgeState[left.knowledgePoint] || {}).mastery || 50)
      - Number((knowledgeState[right.knowledgePoint] || {}).mastery || 50);
    if (masteryDifference) return masteryDifference;

    return 0;
  });
}

function buildDailySet(bank, profile, context = {}) {
  const types = ['choice', 'fill', 'problem'];
  const completedIds = seenQuestionIds(profile);
  const completedContentSignatures = seenQuestionContentSignatures(profile);
  const weak = profile.weakKnowledgePoints || [];
  const learnerId = context.learnerId || profile.learnerId || 'local-learner';
  const date = context.date || profile.dailySetDate || 'today';
  const difficultyMode = context.difficultyMode || profile.difficultyMode || 'medium';
  const missionMode = normalizeDailyMissionMode(context.missionMode || profile.dailyMissionMode);
  const requestedGoal = Number(context.goal || profile.dailyGoal || 3);
  const goal = [3, 5, 10].includes(requestedGoal) ? requestedGoal : 3;
  const grade = Number(context.grade || profile.grade || 4);
  const textbookId = context.textbookId || profile.textbookId || 'rjb';
  const schoolStage = context.schoolStage || profile.schoolStage || 'primary';
  const learningTerm = context.learningTerm || profile.learningTerm || '上册';
  const scopeKey = scopeKeyOf({ schoolStage, textbookId, grade });
  const themeAbility = context.themeAbility || getDailyTheme(date).ability;
  const knowledgeState = profile.knowledgeState || {};
  const dueKnowledgePoints = getDueKnowledgePoints(knowledgeState, date);
  const dailySetNonce = Number.isInteger(context.dailySetNonce)
    ? context.dailySetNonce
    : (Number.isInteger(profile.dailySetNonce) ? profile.dailySetNonce : 0);
  const gradeBank = bank.filter((item) => (
    scopeKeyOf(item) === scopeKey && item.term === learningTerm
  ));
  const selected = [];
  const selectedIds = new Set();
  const selectedContentSignatures = new Set();
  const selectedKnowledgeCounts = {};
  const knowledgeCap = goal >= 10 ? 2 : Number.POSITIVE_INFINITY;

  function choose(pool, type, index) {
    const ranked = rankCandidates(
      pool,
      weak,
      completedIds,
      `${learnerId}:${scopeKey}:${date}:${dailySetNonce}:${missionMode}:${difficultyMode}:${goal}:${type}:${index}`,
      dueKnowledgePoints,
      knowledgeState,
    );
    const isFresh = (item) => (
      !completedIds.has(item.id)
      && !completedContentSignatures.has(questionContentSignature(item))
      && !selectedContentSignatures.has(questionContentSignature(item))
    );
    return ranked.find(
      (item) => isFresh(item) && (selectedKnowledgeCounts[item.knowledgePoint] || 0) < knowledgeCap,
    ) || ranked.find(isFresh) || ranked.find(
      (item) => !completedIds.has(item.id) && !selectedContentSignatures.has(questionContentSignature(item)),
    ) || ranked.find(
      (item) => (selectedKnowledgeCounts[item.knowledgePoint] || 0) < knowledgeCap,
    ) || ranked[0];
  }

  function add(chosen) {
    if (!chosen || selectedIds.has(chosen.id)) return;
    selected.push(chosen);
    selectedIds.add(chosen.id);
    selectedContentSignatures.add(questionContentSignature(chosen));
    selectedKnowledgeCounts[chosen.knowledgePoint] = (selectedKnowledgeCounts[chosen.knowledgePoint] || 0) + 1;
  }

  if (missionMode === 'review' && dueKnowledgePoints.length) {
    const dueCandidates = gradeBank.filter((item) => (
      dueKnowledgePoints.includes(item.knowledgePoint)
      && !selectedIds.has(item.id)
      && matchesDifficulty(item, difficultyMode)
    ));
    const fallbackDueCandidates = dueCandidates.length
      ? dueCandidates
      : gradeBank.filter((item) => dueKnowledgePoints.includes(item.knowledgePoint) && !selectedIds.has(item.id));
    add(choose(fallbackDueCandidates, 'due', 0));
  }

  if (missionMode === 'challenge' && selected.length < goal) {
    const thinkingCandidates = gradeBank.filter((item) => (
      !selectedIds.has(item.id)
      && matchesDifficulty(item, difficultyMode)
      && isThinkingPattern(item)
    ));
    add(choose(thinkingCandidates, 'thinking', selected.length));
  }

  for (let index = selected.length; index < goal; index += 1) {
    const selectedTypes = new Set(selected.map((item) => item.type));
    const missingTypes = types.filter((type) => !selectedTypes.has(type));
    const type = missingTypes.length ? missingTypes[0] : types[index % types.length];
    const availableForType = gradeBank.filter(
      (item) => item.type === type && !selectedIds.has(item.id),
    );
    const eligible = availableForType.filter((item) => matchesDifficulty(item, difficultyMode));
    const standardPool = eligible.length ? eligible : availableForType;
    const themePool = selected.some((item) => item.ability === themeAbility)
      ? []
      : standardPool.filter((item) => item.ability === themeAbility);
    const pool = themePool.length ? themePool : standardPool;
    add(choose(pool, type, index));
  }

  return selected;
}

function chooseRecoveryCandidate(candidates, original, stage, context, excludedIds = new Set()) {
  const available = candidates.filter((item) => !excludedIds.has(item.id));
  const learnerId = context.learnerId || 'local-learner';
  const date = context.date || 'today';
  const scopeKey = context.scopeKey || scopeKeyOf(original);
  const ordered = seededShuffle(available, `${learnerId}:recovery:${scopeKey}:${date}:${original.id}:${stage}`);
  const originalDifficulty = difficultyRank(original.difficulty);

  if (stage === 'bridge') {
    const easier = ordered.filter((item) => difficultyRank(item.difficulty) < originalDifficulty);
    if (easier.length) return easier[0];
    const sameLevelDifferentPattern = ordered.filter((item) => (
      difficultyRank(item.difficulty) === originalDifficulty
      && item.examPattern !== original.examPattern
    ));
    return sameLevelDifferentPattern[0]
      || ordered.find((item) => difficultyRank(item.difficulty) === originalDifficulty)
      || null;
  }

  const sameLevel = ordered.filter((item) => difficultyRank(item.difficulty) === originalDifficulty);
  const differentPattern = sameLevel.filter((item) => (
    item.examPattern !== original.examPattern
    && item.examPattern !== (context.bridgeQuestion && context.bridgeQuestion.examPattern)
  ));
  if (differentPattern.length) return differentPattern[0];
  const differentFromOriginal = sameLevel.filter((item) => item.examPattern !== original.examPattern);
  return differentFromOriginal[0] || sameLevel[0] || null;
}

function buildRecoverySet(bank, original, profile = {}, context = {}) {
  if (!original || !original.id) return null;
  const scopeKey = scopeKeyOf(original);
  const matching = bank.filter((item) => (
    item.id !== original.id
    && scopeKeyOf(item) === scopeKey
    && item.knowledgePoint === original.knowledgePoint
  ));
  const bridgeQuestion = chooseRecoveryCandidate(matching, original, 'bridge', {
    ...context,
    learnerId: context.learnerId || profile.learnerId,
    scopeKey,
  });
  if (!bridgeQuestion) return null;
  const remixQuestion = chooseRecoveryCandidate(matching, original, 'remix', {
    ...context,
    learnerId: context.learnerId || profile.learnerId,
    bridgeQuestion,
    scopeKey,
  }, new Set([bridgeQuestion.id]));
  return remixQuestion ? { bridgeQuestion, remixQuestion } : null;
}

function describeMissionFocus(profile, questions, date) {
  const dueKnowledgePoints = getDueKnowledgePoints(profile.knowledgeState || {}, date);
  if (questions.some((item) => dueKnowledgePoints.includes(item.knowledgePoint))) return 'review';
  if (questions.some((item) => (profile.weakKnowledgePoints || []).includes(item.knowledgePoint))) return 'strengthen';
  if (questions.some((item) => item.examPattern && item.examPattern !== 'calculation_model')) return 'explore';
  return 'challenge';
}

function buildSelfPracticeSet(bank, profile, filters = {}) {
  const grade = Number(filters.grade || profile.grade || 4);
  const knowledgePoint = filters.knowledgePoint || 'all';
  const type = filters.type || 'all';
  const difficultyMode = filters.difficultyMode || profile.difficultyMode || 'medium';
  const goal = [3, 5, 10].includes(Number(filters.goal)) ? Number(filters.goal) : 3;
  const completedIds = seenQuestionIds(profile);
  const completedContentSignatures = seenQuestionContentSignatures(profile);
  const textbookId = filters.textbookId || profile.textbookId || 'rjb';
  const schoolStage = filters.schoolStage || profile.schoolStage || 'primary';
  const learningTerm = filters.learningTerm || profile.learningTerm || '上册';
  const scopeKey = scopeKeyOf({ schoolStage, textbookId, grade });
  const filtered = bank.filter((item) => (
    scopeKeyOf(item) === scopeKey
    && item.term === learningTerm
    && (knowledgePoint === 'all' || item.knowledgePoint === knowledgePoint)
    && (type === 'all' || item.type === type)
    && matchesDifficulty(item, difficultyMode)
  ));
  const unseenById = filtered.filter((item) => !completedIds.has(item.id));
  const unseen = unseenById.filter((item) => !completedContentSignatures.has(questionContentSignature(item)));
  const candidates = unseen.length ? unseen : (unseenById.length ? unseenById : filtered);
  const mode = unseen.length ? 'new' : 'review';
  const learnerId = filters.learnerId || profile.learnerId || 'local-learner';
  const attemptNonce = filters.attemptNonce || 0;
  const ordered = seededShuffle(candidates, `${learnerId}:self:${scopeKey}:${learningTerm}:${knowledgePoint}:${type}:${difficultyMode}:${attemptNonce}`);

  return {
    questions: ordered.slice(0, goal),
    mode,
    availableCount: candidates.length,
  };
}

function resolveDailyQuestionIds(bank, profile, date) {
  const savedIds = Array.isArray(profile.dailyQuestionIds) ? profile.dailyQuestionIds : [];
  const goal = [3, 5, 10].includes(Number(profile.dailyGoal)) ? Number(profile.dailyGoal) : 3;
  const scopeKey = scopeKeyOf(profile);
  const learningTerm = profile.learningTerm || '上册';
  const savedQuestionsExist = savedIds.length === goal && savedIds.every(
    (id) => bank.some((item) => (
      item.id === id && scopeKeyOf(item) === scopeKey && item.term === learningTerm
    )),
  );
  if (profile.dailySetDate === date && savedQuestionsExist) return savedIds;
  return buildDailySet(bank, profile, {
    learnerId: profile.learnerId,
    date,
    difficultyMode: profile.difficultyMode,
    goal,
    grade: profile.grade,
    textbookId: profile.textbookId,
    schoolStage: profile.schoolStage,
    learningTerm,
    dailySetNonce: profile.dailySetNonce,
  }).map((item) => item.id);
}

function updateSkillState(current, result) {
  const next = {
    level: current.level || 1,
    consecutiveCorrect: current.consecutiveCorrect || 0,
    consecutiveWrong: current.consecutiveWrong || 0,
  };

  if (result.correct && !result.usedHint) {
    next.consecutiveCorrect += 1;
    next.consecutiveWrong = 0;
    if (next.consecutiveCorrect >= 3) {
      next.level = Math.min(4, next.level + 1);
      next.consecutiveCorrect = 0;
    }
    return next;
  }

  if (!result.correct) {
    next.consecutiveCorrect = 0;
    next.consecutiveWrong += 1;
    if (next.consecutiveWrong >= 2) {
      next.level = Math.max(1, next.level - 1);
      next.consecutiveWrong = 0;
    }
    return next;
  }

  next.consecutiveCorrect = 0;
  next.consecutiveWrong = 0;
  return next;
}

function updateWeakKnowledgePoints(current, knowledgePoint, nextSkill, result) {
  const existing = Array.isArray(current) ? current.filter(Boolean) : [];
  const withoutCurrent = existing.filter((item) => item !== knowledgePoint);
  if (!result.correct) return [knowledgePoint, ...withoutCurrent].slice(0, 8);
  if (!result.usedHint && Number(nextSkill.level) >= 2) return withoutCurrent;
  return existing;
}

function recordDailyCompletion(profile, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return {
      ...profile,
      completionDates: Array.isArray(profile.completionDates) ? profile.completionDates : [],
    };
  }
  const completionDates = [...new Set([
    ...(Array.isArray(profile.completionDates) ? profile.completionDates : []),
    date,
  ])].sort().slice(-120);
  const completed = new Set(completionDates);
  let cursor = Date.parse(`${date}T00:00:00Z`);
  let streakDays = 0;
  while (completed.has(new Date(cursor).toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor -= 86400000;
  }
  return { ...profile, completionDates, streakDays };
}

function recordRecoveryWin(current, completedFinalStep) {
  const existing = Number(current);
  const recoveryWins = Number.isFinite(existing) ? Math.max(0, Math.round(existing)) : 0;
  return completedFinalStep ? recoveryWins + 1 : recoveryWins;
}

function inferMistakeCode(item, studentAnswer) {
  if (item.knowledgePoint === 'two_step_division_problem' && String(studentAnswer) === '12') {
    return 'skip_total';
  }
  return item.commonMistakes[0] || 'default';
}

function createMistakeRecord(item, studentAnswer, practiceBank) {
  const mistakeCode = inferMistakeCode(item, studentAnswer);
  const scopeKey = scopeKeyOf(item);
  const retry = practiceBank.find((candidate) => (
    candidate.id !== item.id
    && scopeKeyOf(candidate) === scopeKey
    && candidate.knowledgePoint === item.knowledgePoint
    && candidate.type === item.type
  )) || practiceBank.find((candidate) => (
    candidate.id !== item.id
    && scopeKeyOf(candidate) === scopeKey
    && candidate.type === item.type
  ));

  return {
    id: `mistake-${item.id}`,
    questionId: item.id,
    prompt: item.prompt,
    studentAnswer: String(studentAnswer),
    correctAnswer: formatAnswerWithUnit(item.answer, item.answerUnit),
    mistakeCode,
    reason: mistakeReasons[mistakeCode] || mistakeReasons.default,
    solutionSummary: item.solution.summary,
    solutionSteps: item.solution.steps,
    knowledgeSummary: item.knowledgeSummary || '',
    mistakeSummary: item.mistakeSummary || [],
    retryQuestionId: retry ? retry.id : '',
    knowledgePoint: item.knowledgePoint,
    ability: item.ability,
    schoolStage: item.schoolStage === 'junior' ? 'junior' : 'primary',
    textbookId: item.textbookId || 'rjb',
    grade: Number(item.grade) || 4,
    editionUnitKey: item.editionUnitKey || `rjb-g${item.grade}-legacy`,
    createdAt: Date.now(),
  };
}

module.exports = {
  abilityLabels,
  CONTENT_BANK_VERSION,
  scoreDiagnostic,
  buildDailySet,
  buildRecoverySet,
  buildSelfPracticeSet,
  normalizeDailyMissionMode,
  describeMissionFocus,
  resolveDailyQuestionIds,
  matchesDifficulty,
  hashSeed,
  seededShuffle,
  updateSkillState,
  updateWeakKnowledgePoints,
  updateKnowledgeState,
  getDueKnowledgePoints,
  recordDailyCompletion,
  recordRecoveryWin,
  createMistakeRecord,
};
