const { createProgressStore } = require('../../utils/storage');
const {
  difficultyOptions,
  dailyGoalOptions,
  learningTermOptions,
  getGradeOptions,
  schoolStageOptions,
} = require('../../utils/learning-settings');
const { getSafeTop } = require('../../utils/layout');
const { activityMessage } = require('../../utils/activity-feedback');
const { BGM_TRACKS, syncBackgroundMusic } = require('../../utils/background-music');
const { getLearningMap, getTextbookOptions } = require('../../utils/textbook-catalog');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { buildShareMessage } = require('../../utils/share');

Page({
  data: {
    soundEnabled: true,
    bgmEnabled: false,
    bgmTrackIndex: 0,
    bgmTrackLabel: BGM_TRACKS[0].label,
    reminderEnabled: true,
    safeTop: getSafeTop(),
    difficultyOptions,
    dailyGoalOptions,
    learningTermOptions,
    schoolStageOptions,
    schoolStage: 'primary',
    textbookOptions: getTextbookOptions('primary'),
    textbookLabels: getTextbookOptions('primary').map((item) => item.label),
    textbookIndex: 0,
    gradeOptions: getGradeOptions('primary'),
    difficultyMode: 'medium',
    dailyGoal: 3,
    learningTerm: '上册',
    textbookId: 'rjb',
    textbookLabel: '人教版',
    grade: 4,
    gradeLabel: '四年级',
    currentLearningTitle: '人教版 · 四年级',
    currentLearningMeta: '每日 3 题 · 选择、填空、应用题',
    currentLearningSummary: '围绕计算、图形和规律，安排适合当前年级的数学思维训练。',
  },

  onShow() {
    this.disposeAudio();
    try {
      const progress = createProgressStore().load();
      this.soundEnabled = progress.soundEnabled;
      this.audio = createAudioFeedback({ isEnabled: () => this.soundEnabled, eager: true, preloadKinds: ['navigate', 'setting'] });
      this.syncSettings(progress);
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

  syncSettings(progress) {
    const textbookOptions = getTextbookOptions(progress.schoolStage);
    const gradeOptions = getGradeOptions(progress.schoolStage);
    const textbookIndex = Math.max(
      0,
      textbookOptions.findIndex((item) => item.value === progress.textbookId),
    );
    const textbook = textbookOptions[textbookIndex];
    const learning = getLearningMap(progress.textbookId, progress.grade, progress.schoolStage, progress.learningTerm);
    this.setData({
      schoolStage: progress.schoolStage,
      textbookOptions,
      textbookLabels: textbookOptions.map((item) => item.label),
      gradeOptions,
      difficultyMode: progress.difficultyMode,
      dailyGoal: progress.dailyGoal,
      learningTerm: progress.learningTerm,
      textbookId: progress.textbookId,
      textbookLabel: textbook.label,
      textbookIndex,
      grade: progress.grade,
      gradeLabel: `${progress.grade}年级`,
      currentLearningTitle: `${textbook.label} · ${progress.grade}年级 · ${learning.term}`,
      currentLearningMeta: `${learning.unitLabel} · ${learning.knowledgePoints.length} 个知识点`,
      currentLearningSummary: learning.summary,
      soundEnabled: progress.soundEnabled,
      bgmEnabled: progress.bgmEnabled,
      bgmTrackIndex: progress.bgmTrackIndex,
      bgmTrackLabel: BGM_TRACKS[progress.bgmTrackIndex].label,
      reminderEnabled: progress.reminderEnabled,
    });
    syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
  },

  saveLearningSettings(changes) {
    try {
      const store = createProgressStore();
      const progress = store.load();
      const changed = Object.keys(changes).some((key) => progress[key] !== changes[key]);
      if (!changed) return;
      const next = store.save({
        ...progress,
        ...changes,
        dailySetDate: '',
        dailyQuestionIds: [],
        dailySetNonce: 0,
        dailyCompleted: 0,
      });
      this.syncSettings(next);
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  savePreference(changes) {
    try {
      const store = createProgressStore();
      const next = store.save({ ...store.load(), ...changes });
      this.syncSettings(next);
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  changeDifficulty(event) {
    this.audio.play('setting');
    this.saveLearningSettings({ difficultyMode: event.currentTarget.dataset.value });
  },

  changeDailyGoal(event) {
    this.audio.play('setting');
    this.saveLearningSettings({ dailyGoal: Number(event.currentTarget.dataset.value) });
  },

  changeLearningTerm(event) {
    const learningTerm = event.currentTarget.dataset.value;
    if (learningTerm === this.data.learningTerm) return;
    this.audio.play('setting');
    try {
      const store = createProgressStore();
      this.syncSettings(store.changeLearningTerm(store.load(), learningTerm));
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  selectTextbook(event) {
    this.audio.play('setting');
    const textbookOptions = this.data.textbookOptions;
    const selected = textbookOptions[Number(event.detail.value)] || textbookOptions[0];
    try {
      const store = createProgressStore();
      const progress = store.load();
      this.syncSettings(store.changeTextbook(progress, selected.value));
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  selectGrade(event) {
    const grade = Number(event.currentTarget.dataset.value);
    const option = this.data.gradeOptions.find((item) => item.value === grade);
    if (!option || !option.available) {
      wx.showToast({ title: `${grade}年级题库建设中`, icon: 'none' });
      return;
    }
    this.audio.play('setting');
    try {
      const store = createProgressStore();
      const progress = store.load();
      this.syncSettings(store.changeGrade(progress, grade));
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  changeSchoolStage(event) {
    const schoolStage = event.currentTarget.dataset.value;
    if (schoolStage === this.data.schoolStage) return;
    this.audio.play('setting');
    try {
      const store = createProgressStore();
      const progress = store.load();
      this.syncSettings(store.changeSchoolStage(progress, schoolStage));
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  toggleSound(event) { this.audio.play('setting'); this.savePreference({ soundEnabled: event.detail.value }); },
  toggleBgm(event) { this.audio.play('setting'); this.savePreference({ bgmEnabled: event.detail.value }); },
  switchBgmTrack() {
    try {
      this.audio.play('setting');
      const store = createProgressStore();
      const progress = store.load();
      this.savePreference({ bgmTrackIndex: (progress.bgmTrackIndex + 1) % BGM_TRACKS.length });
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },
  toggleReminder(event) { this.audio.play('setting'); this.savePreference({ reminderEnabled: event.detail.value }); },
  clearProgress() {
    this.audio.play('setting');
    wx.showModal({
      title: '重新开始学习？',
      content: '摸底结果、星星和错题记录都会被清除。',
      confirmText: '确认清除',
      confirmColor: '#df6a51',
      success: (result) => {
        if (!result.confirm) return;
        try {
          createProgressStore().clear();
          wx.removeStorageSync('mathThinkingDailyQuestionIds');
          wx.redirectTo({
            url: '/pages/intro/intro',
            fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
          });
        } catch (error) {
          wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '确认窗口没打开，请再点一次', icon: 'none' }),
    });
  },
  goHome() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/home/home' }); },
  goGames() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/games/games' }); },
  goGrowth() { this.audio.play('navigate'); wx.redirectTo({ url: '/pages/growth/growth' }); },
  goPractice() { this.audio.play('navigate'); wx.navigateTo({ url: '/pages/practice/practice', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) }); },
  goMine() {},
  onShareAppMessage() { return buildShareMessage(); },
});
