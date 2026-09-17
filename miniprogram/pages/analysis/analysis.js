const { createProgressStore } = require('../../utils/storage');
const { getQuestionBank } = require('../../utils/question-bank');
const { getSafeTop } = require('../../utils/layout');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { activityMessage } = require('../../utils/activity-feedback');
const { version: CONTENT_BANK_VERSION } = require('../../utils/question-bank-manifest');
const { buildShareMessage } = require('../../utils/share');

function getUsableRecoveryState(progress, questionId, practiceQuestions) {
  const state = progress.recoveryState;
  const stages = ['explain', 'bridge', 'remix'];
  if (!state || state.originalQuestionId !== questionId || state.contentBankVersion !== CONTENT_BANK_VERSION) return null;
  if (!stages.includes(state.stage)) return null;
  const questionIds = [state.originalQuestionId, state.bridgeQuestionId, state.remixQuestionId];
  return questionIds.every((id) => practiceQuestions.some((item) => item.id === id)) ? state : null;
}

Page({
  data: { record: null, nextIndex: 0, source: '', safeTop: getSafeTop() },

  onLoad(options) {
    try {
      const progress = createProgressStore().load();
      const activeBank = getQuestionBank(progress);
      this.soundEnabled = progress.soundEnabled;
      this.audio = createAudioFeedback({ isEnabled: () => this.soundEnabled, eager: true, preloadKinds: ['tap', 'navigate'] });
      syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
      const record = progress.mistakes.find((item) => item.id === options.id) || progress.mistakes[0];
      if (!record) {
        wx.showToast({ title: '暂时没有可查看的错题', icon: 'none' });
        wx.redirectTo({ url: '/pages/home/home', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
        return;
      }
      const mistakeScope = {
        schoolStage: record.schoolStage || progress.schoolStage,
        textbookId: record.textbookId || progress.textbookId,
        grade: record.grade || progress.grade,
      };
      const historicalBank = getQuestionBank(mistakeScope);
      const sourceQuestion = [
        ...historicalBank.diagnosticQuestions,
        ...historicalBank.practiceQuestions,
        ...activeBank.diagnosticQuestions,
        ...activeBank.practiceQuestions,
      ].find((item) => item.id === record.questionId);
      const recoveryState = getUsableRecoveryState(progress, record.questionId, activeBank.practiceQuestions);
      if (progress.recoveryState && progress.recoveryState.originalQuestionId === record.questionId && !recoveryState) {
        createProgressStore().save({ ...progress, recoveryState: null });
      }
      this.recoveryState = recoveryState;
      this.setData({
        record: {
          ...record,
          knowledgeSummary: record.knowledgeSummary || sourceQuestion?.knowledgeSummary || '',
          mistakeSummary: record.mistakeSummary || sourceQuestion?.mistakeSummary || [],
        },
        nextIndex: Number(options.next || 0), source: options.source || '',
        hasRecovery: Boolean(recoveryState),
        recoveryActionLabel: recoveryState && recoveryState.stage === 'remix' ? '同类再试' : recoveryState && recoveryState.stage === 'bridge' ? '再试一次小台阶题' : '小台阶题',
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

  goBack() { this.audio.play('navigate'); wx.navigateBack({ fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) }); },
  retrySimilar() {
    this.audio.play('navigate');
    const { retryQuestionId } = this.data.record;
    wx.redirectTo({ url: `/pages/question/question?id=${retryQuestionId}${this.data.source === 'self' ? '&source=self' : ''}`, fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
  },
  startRecovery() {
    this.audio.play('navigate');
    try {
      const store = createProgressStore();
      const progress = store.load();
      const { practiceQuestions } = getQuestionBank(progress);
      const recoveryState = getUsableRecoveryState(progress, this.data.record.questionId, practiceQuestions);
      if (!recoveryState) {
        store.save({ ...progress, recoveryState: null });
        this.setData({ hasRecovery: false });
        wx.showToast({ title: '补会练习暂时不可用', icon: 'none' });
        return;
      }
      const stage = recoveryState.stage === 'remix' ? 'remix' : 'bridge';
      store.save({ ...progress, recoveryState: { ...recoveryState, stage } });
      wx.redirectTo({
        url: `/pages/question/question?recovery=${stage}`,
        fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
      });
    } catch (error) {
      wx.showToast({ title: activityMessage('load_failed'), icon: 'none' });
    }
  },
  continueLearning() {
    this.audio.play('navigate');
    try {
      const progress = createProgressStore().load();
      const isSelfPractice = this.data.source === 'self';
      const total = isSelfPractice ? progress.selfPracticeQuestionIds.length : progress.dailyQuestionIds.length;
      const url = this.data.nextIndex >= total
        ? (isSelfPractice ? '/pages/practice/practice' : '/pages/growth/growth')
        : `/pages/question/question?index=${Math.max(0, this.data.nextIndex)}${isSelfPractice ? '&source=self' : ''}`;
      wx.redirectTo({ url, fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
    } catch (error) {
      wx.showToast({ title: activityMessage('load_failed'), icon: 'none' });
    }
  },
  onShareAppMessage() { return buildShareMessage(); },
});
