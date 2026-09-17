const DAY_MS = 24 * 60 * 60 * 1000;

function isDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dateToTimestamp(value) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function timestampToDate(timestamp) {
  const date = new Date(timestamp);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function todayKey() {
  return timestampToDate(Date.now());
}

function uniqueCompletedDates(value, latestDate) {
  if (!Array.isArray(value)) return [];
  const latestTimestamp = dateToTimestamp(latestDate);
  return [...new Set(value.filter((item) => (
    isDateKey(item) && dateToTimestamp(item) <= latestTimestamp
  )))].sort();
}

function getWeeklyMission(progress = {}, date = todayKey()) {
  const currentDate = isDateKey(date) ? date : todayKey();
  const currentTimestamp = dateToTimestamp(currentDate);
  const weekday = new Date(currentTimestamp).getUTCDay();
  const offsetFromMonday = weekday === 0 ? 6 : weekday - 1;
  const weekStartTimestamp = currentTimestamp - offsetFromMonday * DAY_MS;
  const weekStart = timestampToDate(weekStartTimestamp);
  const completedDays = uniqueCompletedDates(progress.completionDates, currentDate)
    .filter((item) => dateToTimestamp(item) >= weekStartTimestamp)
    .length;
  const targetDays = 3;
  const complete = completedDays >= targetDays;
  const remaining = Math.max(0, targetDays - completedDays);

  return {
    weekStart,
    targetDays,
    completedDays,
    complete,
    nextCopy: complete
      ? '本周小目标完成了，明天也可以回来试试。'
      : `再完成 ${remaining} 天，就能完成本周小目标。`,
  };
}

function getMilestoneBadges(progress = {}, date = todayKey()) {
  const completedIds = Array.isArray(progress.completedIds) ? progress.completedIds : [];
  const completedDates = uniqueCompletedDates(progress.completionDates, isDateKey(date) ? date : todayKey());
  const knowledgeState = progress.knowledgeState && typeof progress.knowledgeState === 'object' && !Array.isArray(progress.knowledgeState)
    ? progress.knowledgeState
    : {};
  const stars = Number.isFinite(Number(progress.stars)) ? Number(progress.stars) : 0;
  const hasAdvancedReview = Object.values(knowledgeState).some((record) => (
    record && Number(record.reviewStage) >= 2
  ));

  return [
    {
      id: 'first_steps',
      title: '开始思考',
      copy: '完成 3 题，收下第一枚思维徽章。',
      earned: completedIds.length >= 3,
    },
    {
      id: 'steady_practice',
      title: '稳定练习',
      copy: '学习满 3 天，让思路慢慢变稳。',
      earned: completedDates.length >= 3,
    },
    {
      id: 'review_master',
      title: '复习达人',
      copy: '把一个知识点复习得更扎实。',
      earned: hasAdvancedReview,
    },
    {
      id: 'star_collector',
      title: '思路收集者',
      copy: '完成 3 次每日训练，收集 3 颗思维星。',
      earned: stars >= 3,
    },
  ];
}

module.exports = {
  getWeeklyMission,
  getMilestoneBadges,
};
