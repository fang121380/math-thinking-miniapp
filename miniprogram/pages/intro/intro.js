const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const { activityMessage } = require('../../utils/activity-feedback');
const { getGradeOptions, schoolStageOptions } = require('../../utils/learning-settings');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { buildShareMessage } = require('../../utils/share');

const stageCards = schoolStageOptions.map((item) => ({
  ...item,
  title: item.value === 'primary' ? '成长岛闯关' : '思维实验室',
  description: item.value === 'primary'
    ? '短关卡，动手发现数学规律'
    : '用推理和建模完成数学任务',
  gradeLabel: item.value === 'primary' ? '1 - 6 年级' : '7 - 9 年级',
  icon: item.value === 'primary'
    ? '/assets/thinking-rabbit-color.png'
    : '/assets/icons/chart-no-axes-column-increasing.svg',
}));

Page({
  data: {
    hasProgress: false,
    diagnosticInProgress: false,
    initialGradeConfirmed: false,
    stageCards,
    selectedSchoolStage: '',
    gradeOptions: [],
    safeTop: getSafeTop(),
  },

  onShow() {
    this.disposeAudio();
    try {
      this.store = createProgressStore();
      const progress = this.store.load();
      this.progress = progress;
      this.soundEnabled = progress.soundEnabled;
      this.audioWarned = false;
      this.audio = createAudioFeedback({
        isEnabled: () => this.soundEnabled,
        onError: () => this.notifyAudioFailure(),
        eager: true,
        preloadKinds: ['tap', 'navigate'],
      });
      const selectedSchoolStage = progress.initialGradeConfirmed
        ? progress.schoolStage
        : this.data.selectedSchoolStage;
      this.setData({
        hasProgress: progress.diagnosticComplete,
        diagnosticInProgress: progress.diagnosticInProgress,
        initialGradeConfirmed: progress.initialGradeConfirmed,
        selectedSchoolStage,
        gradeOptions: selectedSchoolStage ? getGradeOptions(selectedSchoolStage) : [],
      });
    } catch (error) {
      wx.showToast({ title: activityMessage('load_failed'), icon: 'none' });
    }
  },

  onUnload() { this.disposeAudio(); },
  disposeAudio() {
    if (!this.audio) return;
    this.audio.destroy();
    this.audio = null;
  },

  playSound(kind) {
    const enabled = Boolean(this.soundEnabled);
    const played = this.audio && this.audio.play(kind);
    if (enabled && !played && !this.audioWarned) this.notifyAudioFailure();
  },

  notifyAudioFailure() {
    if (!this.soundEnabled || this.audioWarned) return;
    this.audioWarned = true;
    wx.showToast({ title: activityMessage('audio_failed'), icon: 'none' });
  },

  selectInitialStage(event) {
    const schoolStage = event.currentTarget.dataset.stage;
    if (!stageCards.some((item) => item.value === schoolStage)) return;
    this.playSound('tap');
    this.setData({ selectedSchoolStage: schoolStage, gradeOptions: getGradeOptions(schoolStage) });
  },

  selectInitialGrade(event) {
    try {
      const grade = Number(event.currentTarget.dataset.grade);
      const schoolStage = this.data.selectedSchoolStage;
      if (!schoolStage || !this.data.gradeOptions.some((item) => item.value === grade)) {
        wx.showToast({ title: '请选择正确的年级', icon: 'none' });
        return;
      }
      if (this.isSelectingGrade) return;
      this.isSelectingGrade = true;
      this.playSound('navigate');
      const confirmInitialGrade = this.store.confirmInitialLearningLevel.bind(this.store);
      const progress = confirmInitialGrade(this.store.load(), schoolStage, grade);
      this.progress = progress;
      this.setData({
        initialGradeConfirmed: progress.initialGradeConfirmed,
        hasProgress: false,
        diagnosticInProgress: false,
      });
      this.startTest({
        silent: true,
        onFail: () => { this.isSelectingGrade = false; },
      });
    } catch (error) {
      this.isSelectingGrade = false;
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  startTest(options = {}) {
    if (!this.data.initialGradeConfirmed) {
      wx.showToast({ title: '先选好年级再开始', icon: 'none' });
      return;
    }
    if (!options.silent) this.playSound('navigate');
    wx.navigateTo({
      url: '/pages/test/test',
      fail: () => {
        if (typeof options.onFail === 'function') options.onFail();
        wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' });
      },
    });
  },

  continueHome() {
    this.playSound('navigate');
    wx.redirectTo({ url: '/pages/home/home', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
  },
  onShareAppMessage() { return buildShareMessage(); },
});
