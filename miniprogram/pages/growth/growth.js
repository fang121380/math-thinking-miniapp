const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { activityMessage } = require('../../utils/activity-feedback');
const { getTextbookOption } = require('../../utils/textbook-catalog');
const { getWeeklyMission, getMilestoneBadges } = require('../../utils/learning-milestones');
const { getQuestionBank } = require('../../utils/question-bank');
const { buildLearningJourney } = require('../../utils/learning-journey');
const { buildShareMessage } = require('../../utils/share');
const { filterRecordsForLearningScope } = require('../../utils/learning-scope');

const labels = { calculation: '运算理解', problem: '解决问题', geometry: '图形观察', pattern: '数据规律', data: '数据分析' };

function todayKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function buildMilestoneRows(progress, date) {
  const badges = getMilestoneBadges(progress, date);
  const earned = badges.filter((item) => item.earned).slice(0, 3).map((item) => ({
    ...item,
    state: 'earned',
    stateText: '已获得',
  }));
  const next = badges.find((item) => !item.earned);
  return next ? [...earned, { ...next, state: 'next', stateText: '下一枚' }] : earned;
}

Page({
  data: {
    progress: {},
    abilityRows: [],
    mistakes: [],
    weeklyMission: { targetDays: 3, completedDays: 0, progressPercent: 0, nextCopy: '' },
    milestoneRows: [],
    journeyRows: [],
    recoveryWins: 0,
    safeTop: getSafeTop(),
    learningLabel: '人教版 · 4年级',
  },
  onShow() {
    this.disposeAudio();
    try {
      const progress = createProgressStore().load();
      const { practiceQuestions } = getQuestionBank(progress);
      this.soundEnabled = progress.soundEnabled;
      this.audio = createAudioFeedback({ isEnabled: () => this.soundEnabled, eager: true, preloadKinds: ['tap', 'navigate'] });
      syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
      const abilityRows = Object.keys(labels).map((key) => ({ key, label: labels[key], score: progress.abilities[key] || 0 }));
      const mistakes = filterRecordsForLearningScope(progress.mistakes, progress).slice(0, 3);
      const date = todayKey();
      const weeklyMission = getWeeklyMission(progress, date);
      this.setData({
        progress,
        abilityRows,
        mistakes,
        weeklyMission: {
          ...weeklyMission,
          progressPercent: Math.min(100, Math.round((weeklyMission.completedDays / weeklyMission.targetDays) * 100)),
        },
        milestoneRows: buildMilestoneRows(progress, date),
        journeyRows: buildLearningJourney(progress, practiceQuestions),
        recoveryWins: progress.recoveryWins,
        learningLabel: `${getTextbookOption(progress.textbookId).label} · ${progress.grade}年级`,
      });
    } catch (error) {
      wx.showToast({ title: activityMessage('load_failed'), icon: 'none' });
    }
  },
  onHide() { this.disposeAudio(); },
  onUnload() { this.disposeAudio(); },
  disposeAudio() {
    if (!this.audio) return;
    this.audio.destroy();
    this.audio = null;
  },
  viewAnalysis(event) { this.audio.play('navigate'); wx.navigateTo({ url: `/pages/analysis/analysis?id=${event.currentTarget.dataset.id}&next=0`, fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) }); },
  goHome() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/home/home' }); },
  goGames() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/games/games' }); },
  goGrowth() {},
  goMine() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/mine/mine' }); },
  onShareAppMessage() { return buildShareMessage(); },
});
