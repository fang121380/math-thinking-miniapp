const DAY_MS = 24 * 60 * 60 * 1000;

const DAILY_THEMES = [
  { id: 'number-sense', title: '数感快车', copy: '用灵活的数字感觉，找到更快的思路。', ability: 'calculation', label: '数感日' },
  { id: 'shape-watch', title: '图形观察站', copy: '看看图形里的边、角和隐藏关系。', ability: 'geometry', label: '观察日' },
  { id: 'pattern-detective', title: '规律侦探', copy: '像侦探一样，找出变化的线索。', ability: 'pattern', label: '规律日' },
  { id: 'life-math', title: '生活小管家', copy: '把数学方法用在身边的小问题里。', ability: 'problem', label: '应用日' },
  { id: 'data-lookout', title: '数据小观察', copy: '先读懂数据，再做出有根据的判断。', ability: 'data', label: '数据日' },
  { id: 'estimate-challenge', title: '估算挑战', copy: '先想一想答案大约在哪儿，再动笔计算。', ability: 'calculation', label: '估算日' },
  { id: 'strategy-lab', title: '策略实验室', copy: '试试换一种办法，把难题拆成小步骤。', ability: 'problem', label: '策略日' },
];

function isDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function getDailyTheme(date) {
  if (!isDateKey(date)) return { ...DAILY_THEMES[0] };
  const [year, month, day] = String(date).split('-').map(Number);
  const offset = Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
  const index = ((offset % DAILY_THEMES.length) + DAILY_THEMES.length) % DAILY_THEMES.length;
  return { ...DAILY_THEMES[index] };
}

module.exports = {
  DAILY_THEMES,
  getDailyTheme,
};
