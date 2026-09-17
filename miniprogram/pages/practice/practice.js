const { getQuestionBank } = require('../../utils/question-bank');
const { buildSelfPracticeSet } = require('../../utils/adaptive');
const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { activityMessage } = require('../../utils/activity-feedback');
const { buildShareMessage } = require('../../utils/share');
const { learningSessionKey, isSameLearningScope } = require('../../utils/learning-scope');

const typeOptions = [
  { value: 'all', label: '全部题型' },
  { value: 'choice', label: '选择题' },
  { value: 'fill', label: '填空题' },
  { value: 'problem', label: '应用大题' },
];
const difficultyOptions = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '适中' },
  { value: 'hard', label: '困难' },
];

Page({
  data: { safeTop: getSafeTop(), schoolStage: 'primary', grade: 4, learningTerm: '上册', topics: [], selectedTopic: 'all', selectedType: 'all', selectedDifficulty: 'medium', selectedGoal: 3, typeOptions, difficultyOptions, goals: [3, 5, 10] },
  onLoad() {
    try {
      const store = createProgressStore();
      const progress = store.ensureLearner(store.load());
      const { practiceQuestions } = getQuestionBank(progress);
      this.soundEnabled = progress.soundEnabled;
      this.audio = createAudioFeedback({ isEnabled: () => this.soundEnabled, eager: true, preloadKinds: ['tap', 'navigate'] });
      syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
      this.refreshPracticeScope(progress, practiceQuestions);
      this.practiceReady = true;
    } catch (error) { wx.showToast({ title: activityMessage('load_failed'), icon: 'none' }); }
  },
  onShow() {
    if (!this.practiceReady) return;
    try {
      this.refreshPracticeScope();
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
  refreshPracticeScope(progress, practiceQuestions) {
    const store = createProgressStore();
    const activeProgress = progress || store.ensureLearner(store.load());
    const activeQuestions = practiceQuestions || getQuestionBank(activeProgress).practiceQuestions;
    const nextSessionKey = learningSessionKey(activeProgress);
    const scopeChanged = Boolean(this.practiceSessionKey && this.practiceSessionKey !== nextSessionKey);
    const topics = [...new Map(activeQuestions.filter((item) => (
      isSameLearningScope(item, activeProgress)
      && item.term === activeProgress.learningTerm
    )).map((item) => [item.knowledgePoint, { value: item.knowledgePoint, label: item.unit }])).values()];
    const availableTopics = new Set(topics.map((item) => item.value));
    const selectedTopic = scopeChanged || !availableTopics.has(this.data.selectedTopic)
      ? 'all'
      : this.data.selectedTopic;
    this.practiceSessionKey = nextSessionKey;
    this.setData({
      schoolStage: activeProgress.schoolStage,
      grade: activeProgress.grade,
      learningTerm: activeProgress.learningTerm,
      topics: [{ value: 'all', label: '全部专题' }, ...topics],
      selectedTopic,
      selectedDifficulty: scopeChanged ? activeProgress.difficultyMode : this.data.selectedDifficulty,
    });
  },
  goBack() { this.audio.play('navigate'); wx.navigateBack({ fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) }); },
  selectTopic(event) { this.audio.play('tap'); this.setData({ selectedTopic: event.currentTarget.dataset.value }); },
  selectType(event) { this.audio.play('tap'); this.setData({ selectedType: event.currentTarget.dataset.value }); },
  selectDifficulty(event) { this.audio.play('tap'); this.setData({ selectedDifficulty: event.currentTarget.dataset.value }); },
  selectGoal(event) { this.audio.play('tap'); this.setData({ selectedGoal: Number(event.currentTarget.dataset.value) }); },
  startPractice() {
    this.audio.play('navigate');
    try {
      const store = createProgressStore();
      const progress = store.ensureLearner(store.load());
      const { practiceQuestions } = getQuestionBank(progress);
      if (this.practiceSessionKey && this.practiceSessionKey !== learningSessionKey(progress)) {
        this.refreshPracticeScope(progress, practiceQuestions);
        wx.showToast({ title: '学习设置已更新，请重新选择专题', icon: 'none' });
        return;
      }
      const filters = { schoolStage: progress.schoolStage, grade: progress.grade, textbookId: progress.textbookId, learningTerm: progress.learningTerm, knowledgePoint: this.data.selectedTopic, type: this.data.selectedType, difficultyMode: this.data.selectedDifficulty, goal: this.data.selectedGoal, attemptNonce: Date.now() + Math.floor(Math.random() * 1000000) };
      const result = buildSelfPracticeSet(practiceQuestions, progress, filters);
      if (!result.questions.length) { wx.showToast({ title: '这个条件下暂时没有题，换个选择试试', icon: 'none' }); return; }
      const questionIds = result.questions.map((item) => item.id);
      const next = store.save({ ...progress, selfPracticeQuestionIds: questionIds, selfPracticeIndex: 0, selfPracticeMode: result.mode, selfPracticeFilters: filters });
      store.rememberServedQuestions(next, result.questions);
      if (result.mode === 'review') wx.showToast({ title: '新题已完成，开始复习', icon: 'none' });
      wx.navigateTo({ url: '/pages/question/question?source=self', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
    } catch (error) { wx.showToast({ title: activityMessage('save_failed'), icon: 'none' }); }
  },
  onShareAppMessage() { return buildShareMessage(); },
});
