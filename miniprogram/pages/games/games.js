const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const { GAME_TYPES, getGamesForGrade, getGameMeta, pickDailyGameType, pickRecommendedGameType } = require('../../utils/game-engine');
const { activityMessage } = require('../../utils/activity-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { getTextbookOption } = require('../../utils/textbook-catalog');
const { buildShareMessage } = require('../../utils/share');

function todayKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function hubCopyFor(schoolStage) {
  return schoolStage === 'junior'
    ? {
      eyebrow: '今日思维任务',
      title: '思维任务',
      copy: '完成建模、推理、坐标和数据判断，保留你的思考过程。',
      startLabel: '开始任务',
      activityUnit: '次任务',
      navLabel: '任务',
    }
    : {
      eyebrow: '今日成长岛',
      title: '成长岛闯关',
      copy: '每局 1 - 3 分钟，动手操作，发现数学规律。',
      startLabel: '开始闯关',
      activityUnit: '局',
      navLabel: '闯关',
    };
}

Page({
  data: {
    stars: 0,
    safeTop: getSafeTop(),
    grade: 4,
    schoolStage: 'primary',
    recommendedType: 'puzzle',
    recommendedName: '数字拼图',
    games: [],
    learningLabel: '人教版 · 4年级',
    hubEyebrow: '今日成长岛',
    hubTitle: '成长岛闯关',
    hubCopy: '每局 1 - 3 分钟，动手操作，发现数学规律。',
    startLabel: '开始闯关',
    activityUnit: '局',
    navActivityLabel: '闯关',
  },
  onShow() {
    this.disposeAudio();
    try {
      const store = createProgressStore();
      const progress = store.ensureLearner(store.load());
      this.soundEnabled = progress.soundEnabled;
      this.audio = createAudioFeedback({ isEnabled: () => this.soundEnabled, eager: true, preloadKinds: ['navigate'] });
      syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
      const gradeGames = getGamesForGrade(progress.grade, progress.schoolStage);
      const recommendedType = pickRecommendedGameType(progress, todayKey(), gradeGames.map((game) => game.type))
        || pickDailyGameType(progress.learnerId, todayKey(), gradeGames.map((game) => game.type));
      const availableGames = gradeGames.map((game) => ({
        ...game,
        completions: (progress.gameProgress.byType[game.type] || { completions: 0 }).completions,
        recommended: game.type === recommendedType,
      }));
      const recommended = getGameMeta(recommendedType);
      const hub = hubCopyFor(progress.schoolStage);
      this.setData({
        stars: progress.stars,
        grade: progress.grade,
        schoolStage: progress.schoolStage,
        learningLabel: `${getTextbookOption(progress.textbookId).label} · ${progress.grade}年级`,
        recommendedType,
        recommendedName: recommended ? recommended.name : '随机挑战',
        games: availableGames,
        hubEyebrow: hub.eyebrow,
        hubTitle: hub.title,
        hubCopy: hub.copy,
        startLabel: hub.startLabel,
        activityUnit: hub.activityUnit,
        navActivityLabel: hub.navLabel,
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
  openGame(event) {
    const type = (event.currentTarget && event.currentTarget.dataset.type) || this.data.recommendedType;
    if (!GAME_TYPES.includes(type) || !this.data.games.some((game) => game.type === type)) {
      wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' });
      return;
    }
    const destination = this.data.schoolStage === 'junior' ? '/packages/junior/mission/mission' : '/pages/game/game';
    this.audio.play('navigate');
    wx.navigateTo({
      url: `${destination}?type=${type}&schoolStage=${this.data.schoolStage}&grade=${this.data.grade}`,
      fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
    });
  },
  goHome() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/home/home' }); },
  goGames() {},
  goGrowth() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/growth/growth' }); },
  goMine() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/mine/mine' }); },
  onShareAppMessage() { return buildShareMessage(); },
});
