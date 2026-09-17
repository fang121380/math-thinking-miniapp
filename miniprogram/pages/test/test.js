const { getQuestionBank } = require('../../utils/question-bank');
const { scoreDiagnostic, createMistakeRecord } = require('../../utils/adaptive');
const { prepareDiagnosticAttempt, ENTRY_DIAGNOSTIC_COUNT } = require('../../utils/diagnostic');
const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const { canonicalizeMathAnswer, answersEquivalent, formatChoiceOption } = require('../../utils/math-answer');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { activityMessage } = require('../../utils/activity-feedback');
const { buildShareMessage } = require('../../utils/share');
const { learningSessionKey } = require('../../utils/learning-scope');

function withChoiceLabels(question) {
  if (!question || question.type !== 'choice') return question;
  return {
    ...question,
    displayOptions: (question.options || []).map((value) => ({
      value,
      label: formatChoiceOption(value, question.answerUnit),
    })),
  };
}

Page({
  data: {
    safeTop: getSafeTop(),
    index: 0,
    total: 0,
    progressPercent: 0,
    question: null,
    answer: '',
    showHint: false,
    usedHint: false,
  },

  onLoad() {
    try {
      const store = createProgressStore();
      const progress = store.ensureLearner(store.load());
      if (!progress.initialGradeConfirmed) {
        wx.redirectTo({ url: '/pages/intro/intro', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
        return;
      }
      this.initializeAttempt();
    } catch (error) {
      wx.showToast({ title: activityMessage('load_failed'), icon: 'none' });
      wx.navigateBack({ fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
    }
  },

  onUnload() { this.disposeAudio(); },
  disposeAudio() {
    if (!this.audio) return;
    this.audio.destroy();
    this.audio = null;
  },

  initializeAttempt() {
    this.store = createProgressStore();
    const progress = this.store.ensureLearner(this.store.load());
    this.diagnosticSessionKey = learningSessionKey(progress);
    const { diagnosticQuestions, practiceQuestions } = getQuestionBank(progress);
    this.practiceQuestions = practiceQuestions;
    this.soundEnabled = progress.soundEnabled;
    this.audio = createAudioFeedback({ isEnabled: () => this.soundEnabled, eager: true, preloadKinds: ['tap', 'correct', 'wrong', 'complete', 'navigate'] });
    syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
    const attempt = prepareDiagnosticAttempt(diagnosticQuestions, progress);
    if (attempt.questions.length !== ENTRY_DIAGNOSTIC_COUNT) {
      wx.showToast({ title: '摸底题暂时不可用', icon: 'none' });
      wx.navigateBack({ fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
      return;
    }

    this.questions = attempt.questions;
    this.responses = [...attempt.responses];
    this.attempt = attempt.attempt;
    if (attempt.isNew) {
      this.store.save({
        ...progress,
        diagnosticAttempt: attempt.attempt,
        diagnosticInProgress: true,
        diagnosticCurrentIndex: 0,
        diagnosticQuestionIds: attempt.questionIds,
        diagnosticResponses: [],
      });
    }

    this.setData({
      index: attempt.currentIndex,
      total: attempt.questions.length,
      question: withChoiceLabels(attempt.questions[attempt.currentIndex]),
      progressPercent: ((attempt.currentIndex + 1) / attempt.questions.length) * 100,
      answer: '',
      showHint: false,
      usedHint: false,
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
  },

  chooseOption(event) {
    this.audio.play('tap');
    this.setData({ answer: event.currentTarget.dataset.value });
  },

  onAnswerInput(event) {
    this.setData({ answer: event.detail.value });
  },

  toggleHint() {
    this.audio.play('tap');
    this.setData({ showHint: true, usedHint: true });
  },

  submitAnswer() {
    try {
      this.submitAnswerSafely();
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
    }
  },

  submitAnswerSafely() {
    const { answer, question, usedHint, index } = this.data;
    if (!canonicalizeMathAnswer(answer)) {
      wx.showToast({ title: '先写下答案', icon: 'none' });
      return;
    }

    const currentProgress = this.store.load();
    if (this.diagnosticSessionKey && this.diagnosticSessionKey !== learningSessionKey(currentProgress)) {
      wx.showToast({ title: '学习设置已更新，请重新开始摸底', icon: 'none' });
      wx.redirectTo({
        url: '/pages/intro/intro',
        fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
      });
      return;
    }

    const correct = answersEquivalent(answer, question.answer, question.answerUnit, question.answerSpec);
    this.audio.play(correct ? 'correct' : 'wrong');
    this.responses = this.responses.filter((item) => item.questionId !== question.id);
    this.responses.push({ questionId: question.id, correct, usedHint });
    if (!correct) {
      const record = createMistakeRecord(question, answer, this.practiceQuestions);
      this.store.addMistake(record);
    }

    if (index >= this.questions.length - 1) {
      const current = this.store.load();
      const profile = scoreDiagnostic(this.responses, this.questions);
      this.store.save({
        ...current,
        ...profile,
        diagnosticComplete: true,
        diagnosticInProgress: false,
        diagnosticCurrentIndex: this.questions.length,
        diagnosticAttempt: this.attempt,
        diagnosticQuestionIds: this.questions.map((item) => item.id),
        diagnosticResponses: this.responses,
      });
      this.audio.play('complete');
      wx.redirectTo({ url: '/pages/result/result', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
      return;
    }

    const nextIndex = index + 1;
    const current = this.store.load();
    this.store.save({
      ...current,
      diagnosticAttempt: this.attempt,
      diagnosticInProgress: true,
      diagnosticCurrentIndex: nextIndex,
      diagnosticQuestionIds: this.questions.map((item) => item.id),
      diagnosticResponses: this.responses,
    });
    this.setData({
      index: nextIndex,
      question: withChoiceLabels(this.questions[nextIndex]),
      progressPercent: ((nextIndex + 1) / this.questions.length) * 100,
      answer: '',
      showHint: false,
      usedHint: false,
    });
  },
  onShareAppMessage() { return buildShareMessage(); },
});
