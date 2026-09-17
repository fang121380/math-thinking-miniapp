const DOMAINS = [
  { key: 'calculation', label: '计算思路' },
  { key: 'geometry', label: '图形观察' },
  { key: 'pattern', label: '规律发现' },
  { key: 'problem', label: '解决问题' },
];

function normalizeDomain(value) {
  if (value === 'data') return 'pattern';
  return DOMAINS.some((item) => item.key === value) ? value : '';
}

function normalizeScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 70;
}

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

function stateFor(ability, masteredCount) {
  if (ability >= 85 || masteredCount >= 4) return { state: 'growing', stateText: '正在变强' };
  if (ability >= 70 || masteredCount >= 2) return { state: 'using', stateText: '会用了' };
  return { state: 'meeting', stateText: '认识了' };
}

function nextActionFor(row) {
  if (row.state === 'growing') return '挑战一道综合题';
  if (row.state === 'using') return '换一种方法再练一题';
  return `先从一道${row.label}小题开始`;
}

function buildKnowledgeAbilityMap(questions) {
  return (Array.isArray(questions) ? questions : []).reduce((result, item) => {
    if (!item || !item.knowledgePoint || result[item.knowledgePoint]) return result;
    const domain = normalizeDomain(item.ability);
    if (domain) result[item.knowledgePoint] = domain;
    return result;
  }, {});
}

function buildLearningJourney(progress = {}, questions = []) {
  const knowledgeAbility = buildKnowledgeAbilityMap(questions);
  const knowledgeState = progress.knowledgeState && typeof progress.knowledgeState === 'object'
    ? progress.knowledgeState
    : {};
  const initialDomainCounts = DOMAINS.reduce((counts, item) => {
    counts[item.key] = 0;
    return counts;
  }, {});
  const masteredByDomain = Object.keys(knowledgeState).reduce((counts, knowledgePoint) => {
    const domain = knowledgeAbility[knowledgePoint];
    const mastery = Number((knowledgeState[knowledgePoint] || {}).mastery);
    if (domain && Number.isFinite(mastery) && mastery >= 65) counts[domain] += 1;
    return counts;
  }, initialDomainCounts);
  const abilities = progress.abilities && typeof progress.abilities === 'object' ? progress.abilities : {};
  const gameJourneyCounts = progress.gameJourneyCounts && typeof progress.gameJourneyCounts === 'object'
    ? progress.gameJourneyCounts
    : {};

  return DOMAINS.map((domain) => {
    const ability = normalizeScore(abilities[domain.key]);
    const masteredCount = masteredByDomain[domain.key];
    const state = stateFor(ability, masteredCount);
    const row = {
      ...domain,
      ability,
      masteredCount,
      gameCount: normalizeCount(gameJourneyCounts[domain.key]),
      ...state,
    };
    return { ...row, nextAction: nextActionFor(row) };
  });
}

function getJourneyFocus(progress, questions) {
  const rows = buildLearningJourney(progress, questions);
  return [...rows].sort((left, right) => (
    left.ability - right.ability
    || left.masteredCount - right.masteredCount
    || DOMAINS.findIndex((item) => item.key === left.key) - DOMAINS.findIndex((item) => item.key === right.key)
  ))[0];
}

module.exports = {
  DOMAINS,
  buildLearningJourney,
  getJourneyFocus,
};
