const { GAME_TYPES, validateGameChallenge } = require('./game-engine');

function defaultTypeProgress() {
  return { completions: 0, activeRound: null, recentSignatures: [] };
}

function createDefaultGameProgress() {
  return {
    byType: GAME_TYPES.reduce((result, type) => ({
      ...result,
      [type]: defaultTypeProgress(),
    }), {}),
    rewardedRoundIds: [],
  };
}

function validStrings(value, limit) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => typeof item === 'string' && item.length > 0))]
    .slice(0, limit);
}

function validRound(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && typeof value.id === 'string' && value.id.length > 0
    && typeof value.signature === 'string' && value.signature.length > 0;
}

function roundMatchesScope(round, scope = {}) {
  if (!validRound(round)) return false;
  const schoolStage = scope.schoolStage === 'junior' ? 'junior' : 'primary';
  const grade = Number(scope.grade);
  return round.schoolStage === schoolStage && Number(round.grade) === grade;
}

function canResumeSavedRound(round, scope = {}, type) {
  if (!roundMatchesScope(round, scope) || !GAME_TYPES.includes(type)) return false;
  const challenge = round.challenge;
  return Boolean(challenge)
    && round.type === type
    && challenge.type === type
    && challenge.schoolStage === round.schoolStage
    && Number(challenge.grade) === Number(round.grade)
    && challenge.schoolStage === (scope.schoolStage === 'junior' ? 'junior' : 'primary')
    && Number(challenge.grade) === Number(scope.grade)
    && round.signature === challenge.signature
    && validateGameChallenge(challenge).valid;
}

function normalizeGameProgress(value = {}) {
  const byTypeSource = value && typeof value.byType === 'object' ? value.byType : {};
  return {
    byType: GAME_TYPES.reduce((result, type) => {
      const source = byTypeSource[type] && typeof byTypeSource[type] === 'object'
        ? byTypeSource[type]
        : {};
      const completions = Number(source.completions);
      result[type] = {
        completions: Number.isInteger(completions) && completions >= 0 ? completions : 0,
        activeRound: validRound(source.activeRound) ? source.activeRound : null,
        recentSignatures: validStrings(source.recentSignatures, 10),
      };
      return result;
    }, {}),
    rewardedRoundIds: validStrings(value && value.rewardedRoundIds, 100),
  };
}

function ensureType(type) {
  if (!GAME_TYPES.includes(type)) throw new Error(`Unsupported game type: ${type}`);
}

function replaceType(gameProgress, type, nextTypeProgress) {
  const normalized = normalizeGameProgress(gameProgress);
  return {
    ...normalized,
    byType: {
      ...normalized.byType,
      [type]: nextTypeProgress,
    },
  };
}

function startOrResumeRound(gameProgress, type, createRound, canResumeRound = validRound) {
  ensureType(type);
  const normalized = normalizeGameProgress(gameProgress);
  const current = normalized.byType[type];
  if (current.activeRound && canResumeRound(current.activeRound)) {
    return { gameProgress: normalized, round: current.activeRound, resumed: true };
  }
  const round = createRound();
  if (!validRound(round) || !canResumeRound(round)) throw new Error('Generated game round is invalid');
  return {
    gameProgress: replaceType(normalized, type, { ...current, activeRound: round }),
    round,
    resumed: false,
    replaced: Boolean(current.activeRound),
  };
}

function updateActiveRound(gameProgress, type, round) {
  ensureType(type);
  if (!validRound(round)) throw new Error('Active game round is invalid');
  const normalized = normalizeGameProgress(gameProgress);
  return replaceType(normalized, type, {
    ...normalized.byType[type],
    activeRound: round,
  });
}

function completeRound(gameProgress, type, round) {
  ensureType(type);
  if (!validRound(round)) throw new Error('Completed game round is invalid');
  const normalized = normalizeGameProgress(gameProgress);
  if (normalized.rewardedRoundIds.includes(round.id)) {
    const current = normalized.byType[type];
    const recovered = current.activeRound && current.activeRound.id === round.id
      ? replaceType(normalized, type, { ...current, activeRound: null })
      : normalized;
    return { gameProgress: recovered, rewarded: false };
  }
  const current = normalized.byType[type];
  const recentSignatures = [
    round.signature,
    ...current.recentSignatures.filter((signature) => signature !== round.signature),
  ].slice(0, 10);
  const next = replaceType(normalized, type, {
    completions: current.completions + 1,
    activeRound: null,
    recentSignatures,
  });
  next.rewardedRoundIds = [
    round.id,
    ...normalized.rewardedRoundIds.filter((id) => id !== round.id),
  ].slice(0, 100);
  return { gameProgress: next, rewarded: true };
}

function abandonRound(gameProgress, type) {
  ensureType(type);
  const normalized = normalizeGameProgress(gameProgress);
  return replaceType(normalized, type, {
    ...normalized.byType[type],
    activeRound: null,
  });
}

module.exports = {
  GAME_TYPES,
  createDefaultGameProgress,
  normalizeGameProgress,
  startOrResumeRound,
  updateActiveRound,
  completeRound,
  abandonRound,
  roundMatchesScope,
  canResumeSavedRound,
};
