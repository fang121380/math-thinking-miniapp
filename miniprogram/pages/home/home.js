const { getQuestionBank } = require('../../utils/question-bank');
const {
  buildDailySet,
  resolveDailyQuestionIds,
  describeMissionFocus,
  normalizeDailyMissionMode,
  CONTENT_BANK_VERSION,
} = require('../../utils/adaptive');
const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const { shouldShowLearningReminder } = require('../../utils/learning-reminder');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { activityMessage } = require('../../utils/activity-feedback');
const { getTextbookOption } = require('../../utils/textbook-catalog');
const { getJourneyFocus } = require('../../utils/learning-journey');
const { getDailyTheme } = require('../../utils/daily-theme');
const questionBankManifest = require('../../utils/question-bank-manifest');
const { buildShareMessage } = require('../../utils/share');

const stepLabels = {
  choice: { type: '选择题', description: '先理解题意和方法', icon: 'check' },
  fill: { type: '填空题', description: '独立完成关键计算', icon: 'text-cursor-input' },
  problem: { type: '应用大题', description: '分步解决生活问题', icon: 'notebook-pen' },
};

const missionFocusLabels = {
  review: '今天先复习学过的内容',
  strengthen: '今天重点练不熟的地方',
  explore: '今天换种思路试一试',
  challenge: '今天完成综合小挑战',
};

function todayKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

Page({
  data: {
    safeTop: getSafeTop(),
    stars: 0,
    currentIndex: 0,
    currentLabel: '选择题',
    total: 3,
    dailyComplete: false,
    showMissionChoice: false,
    journeyFocus: { label: '计算思路', stateText: '认识了' },
    steps: [],
    showReminder: false,
    reminderText: '',
    dailyTheme: { label: '数感日', title: '数感快车', copy: '用灵活的数字感觉，找到更快的思路。' },
    showContentNotice: false,
    contentNotice: { title: '', copy: '' },
    loadError: '',
    learningLabel: '人教版 · 4年级',
  },

  onShow() {
    this.disposeAudio();
    try {
    const store = createProgressStore();
    let progress = store.ensureLearner(store.load());
    const { practiceQuestions } = getQuestionBank(progress);
    this.soundEnabled = progress.soundEnabled;
    this.audio = createAudioFeedback({ isEnabled: () => this.soundEnabled, eager: true, preloadKinds: ['tap', 'navigate', 'streak'] });
    syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
    if (!progress.initialGradeConfirmed) {
      wx.redirectTo({ url: '/pages/intro/intro' });
      return;
    }
    if (!progress.diagnosticComplete) {
      wx.redirectTo({ url: '/pages/intro/intro' });
      return;
    }

    const today = todayKey();
    const dailyTheme = getDailyTheme(today);
    const releaseNote = questionBankManifest.releaseNote;
    const needsNewSet = progress.dailySetDate !== today || progress.contentBankVersion !== CONTENT_BANK_VERSION;
    if (needsNewSet) {
      progress = store.save({
        ...progress,
        dailySetDate: today,
        dailyQuestionIds: [],
        dailySetNonce: 0,
        dailyMissionMode: '',
        dailyCompleted: 0,
        contentBankVersion: CONTENT_BANK_VERSION,
      });
    }
    const showMissionChoice = !progress.dailyMissionMode && !progress.dailyQuestionIds.length;
    const dailyQuestionIds = showMissionChoice
      ? []
      : resolveDailyQuestionIds(practiceQuestions, progress, today);
    if (!showMissionChoice && progress.dailyQuestionIds.join(',') !== dailyQuestionIds.join(',')) {
      progress = store.save({ ...progress, dailyQuestionIds });
    }
    const dailyQuestions = dailyQuestionIds
      .map((id) => practiceQuestions.find((item) => item.id === id))
      .filter(Boolean);
    progress = store.rememberServedQuestions(progress, dailyQuestions);
    const missionFocus = showMissionChoice
      ? '先选一条适合你的路线'
      : missionFocusLabels[describeMissionFocus(progress, dailyQuestions, today)];
    const total = dailyQuestions.length || progress.dailyGoal;
    const completed = Math.min(progress.dailyCompleted || 0, total);
    const dailyComplete = total > 0 && completed >= total;
    const currentIndex = dailyComplete ? total - 1 : completed;
    const allSteps = dailyQuestions.map((question, index) => {
      const item = stepLabels[question.type];
      const state = index < completed ? 'done' : index === currentIndex ? 'current' : 'locked';
      return {
        ...item,
        id: question.id,
        state,
        stateText: state === 'done' ? '已完成' : state === 'current' ? '正在做' : '下一题',
      };
    });
    const windowStart = Math.max(0, Math.min(currentIndex, total - 3));
    const steps = allSteps.slice(windowStart, windowStart + 3);
    const showReminder = shouldShowLearningReminder(progress, today);
    const showContentNotice = Boolean(
      releaseNote
      && releaseNote.version === CONTENT_BANK_VERSION
      && progress.seenContentVersion !== releaseNote.version,
    );
    if (showReminder) progress = store.save({ ...progress, lastReminderDate: today });
    if (showReminder) this.audio.play('streak');

    this.setData({
      stars: progress.stars,
      learningLabel: `${getTextbookOption(progress.textbookId).label} · ${progress.grade}年级`,
      missionFocus,
      showMissionChoice,
      journeyFocus: getJourneyFocus(progress, practiceQuestions),
      currentIndex,
      currentLabel: dailyComplete ? '今日训练' : (allSteps[currentIndex] || stepLabels.choice).type,
      total,
      dailyComplete,
      steps,
      showReminder,
      reminderText: `今天还没开始，先完成 ${total} 题吧`,
      dailyTheme,
      showContentNotice,
      contentNotice: releaseNote || { title: '', copy: '' },
      loadError: '',
    });
    } catch (error) {
      this.setData({ loadError: activityMessage('load_failed') });
      wx.showToast({ title: activityMessage('load_failed'), icon: 'none' });
    }
  },

  onHide() { this.disposeAudio(); },
  onUnload() { this.disposeAudio(); },
  onShareAppMessage() {
    return buildShareMessage();
  },
  disposeAudio() {
    if (!this.audio) return;
    this.audio.destroy();
    this.audio = null;
  },

  dismissReminder() { this.audio.play('tap'); this.setData({ showReminder: false }); },
  dismissContentNotice() {
    this.audio.play('tap');
    try {
      const releaseNote = questionBankManifest.releaseNote;
      if (!releaseNote || releaseNote.version !== CONTENT_BANK_VERSION) {
        this.setData({ showContentNotice: false });
        return;
      }
      const store = createProgressStore();
      const progress = store.load();
      store.save({ ...progress, seenContentVersion: releaseNote.version });
      this.setData({ showContentNotice: false });
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },
  retryLoad() { this.onShow(); },

  chooseMissionMode(event) {
    this.audio.play('tap');
    try {
      const mode = normalizeDailyMissionMode(event.currentTarget.dataset.mode);
      const store = createProgressStore();
      let progress = store.ensureLearner(store.load());
      const { practiceQuestions } = getQuestionBank(progress);
      if (progress.dailyCompleted > 0) return;
      const today = todayKey();
      const dailySetNonce = Date.now() + Math.floor(Math.random() * 1000000);
      const dailyQuestionIds = buildDailySet(practiceQuestions, { ...progress, dailySetNonce }, {
        learnerId: progress.learnerId,
        date: today,
        dailySetNonce,
        missionMode: mode,
      }).map((item) => item.id);
      if (!dailyQuestionIds.length) {
        wx.showToast({ title: '今天的练习准备中，请稍后再试', icon: 'none' });
        return;
      }
      progress = store.save({
        ...progress,
        dailySetDate: today,
        dailyQuestionIds,
        dailySetNonce,
        dailyMissionMode: mode,
        dailyCompleted: 0,
        contentBankVersion: CONTENT_BANK_VERSION,
      });
      store.rememberServedQuestions(progress, dailyQuestionIds
        .map((id) => practiceQuestions.find((item) => item.id === id))
        .filter(Boolean));
      this.onShow();
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  startCurrent() {
    this.audio.play('navigate');
    if (this.data.showMissionChoice) {
      wx.showToast({ title: '先选一种今天的练习方式', icon: 'none' });
      return;
    }
    if (this.data.dailyComplete) {
      wx.navigateTo({ url: '/pages/practice/practice', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
      return;
    }
    wx.navigateTo({
      url: `/pages/question/question?index=${this.data.currentIndex}`,
      fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
    });
  },

  goHome() {},
  goGames() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/games/games' }); },
  goGrowth() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/growth/growth' }); },
  goMine() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/mine/mine' }); },
  goPractice() { this.audio.play('navigate'); wx.navigateTo({ url: '/pages/practice/practice', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) }); },
});
