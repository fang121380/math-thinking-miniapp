const { getQuestionBank } = require('../../utils/question-bank');
const {
  buildRecoverySet,
  resolveDailyQuestionIds,
  applyAdaptiveOutcome,
  recordDailyCompletion,
  recordRecoveryWin,
  createMistakeRecord,
  CONTENT_BANK_VERSION,
} = require('../../utils/adaptive');
const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const { canonicalizeMathAnswer, answersEquivalent, formatChoiceOption } = require('../../utils/math-answer');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { activityMessage } = require('../../utils/activity-feedback');
const { buildShareMessage } = require('../../utils/share');
const { learningSessionKey, isSameLearningScope } = require('../../utils/learning-scope');

const typeLabels = { choice: '选择题', fill: '填空题', problem: '应用大题' };
const levelLabels = { choice: '理解', fill: '掌握', problem: '综合' };

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

function todayKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function getRecoveryState(progress, stage, practiceQuestions) {
  const state = progress.recoveryState;
  if (!state || state.contentBankVersion !== CONTENT_BANK_VERSION || state.stage !== stage) return null;
  const questionIds = [state.originalQuestionId, state.bridgeQuestionId, state.remixQuestionId];
  if (!questionIds.every((id) => practiceQuestions.some((item) => item.id === id))) return null;
  return state;
}

function belongsToActiveSession(question, progress) {
  return Boolean(question)
    && isSameLearningScope(question, progress)
    && question.term === progress.learningTerm;
}

function nextLearningUrl(progress, source, nextIndex) {
  const isSelfPractice = source === 'self';
  const total = isSelfPractice ? progress.selfPracticeQuestionIds.length : progress.dailyQuestionIds.length;
  if (nextIndex >= total) return isSelfPractice ? '/pages/practice/practice' : '/pages/growth/growth';
  return `/pages/question/question?index=${Math.max(0, nextIndex)}${isSelfPractice ? '&source=self' : ''}`;
}

Page({
  data: {
    safeTop: getSafeTop(),
    index: 0,
    question: {},
    typeLabel: '',
    levelLabel: '',
    total: 3,
    progressPercent: 33,
    answer: '',
    work: '',
    selectedAnswer: '',
    showHint: false,
    usedHint: false,
    sourceLabel: '今日练习',
    feedback: null,
  },

  onLoad(options) {
    try {
      this.initializeQuestion(options);
    } catch (error) {
      wx.showToast({ title: activityMessage('load_failed'), icon: 'none' });
      wx.redirectTo({ url: '/pages/home/home', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
    }
  },

  onUnload() { this.disposeAudio(); },
  disposeAudio() {
    if (!this.audio) return;
    this.audio.destroy();
    this.audio = null;
  },

  initializeQuestion(options) {
    const store = createProgressStore();
    let progress = store.ensureLearner(store.load());
    this.questionSessionKey = learningSessionKey(progress);
    const { practiceQuestions: allPracticeQuestions } = getQuestionBank(progress);
    const practiceQuestions = allPracticeQuestions.filter((item) => belongsToActiveSession(item, progress));
    this.practiceQuestions = practiceQuestions;
    this.soundEnabled = progress.soundEnabled;
    this.audio = createAudioFeedback({
      isEnabled: () => this.soundEnabled,
      onError: () => this.notifyAudioFailure(),
      eager: true,
      preloadKinds: ['tap', 'correct', 'wrong', 'navigate'],
    });
    syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
    this.recoveryStage = ['bridge', 'remix'].includes(options.recovery) ? options.recovery : '';
    this.isRecovery = Boolean(this.recoveryStage);
    this.isRetry = Boolean(options.id) && !this.isRecovery;
    this.isSelfPractice = options.source === 'self';
    this.recoveryState = null;
    let question;
    let index = Number(options.index || 0);

    if (this.isRecovery) {
      const recoveryState = getRecoveryState(progress, this.recoveryStage, practiceQuestions);
      if (!recoveryState) {
        store.save({ ...progress, recoveryState: null });
        wx.showToast({ title: '补会练习暂时不可用', icon: 'none' });
        wx.redirectTo({
          url: progress.recoveryState && progress.recoveryState.source === 'self' ? '/pages/practice/practice' : '/pages/home/home',
          fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
        });
        return;
      }
      this.recoveryState = recoveryState;
      this.isSelfPractice = recoveryState.source === 'self';
      const recoveryQuestionId = this.recoveryStage === 'bridge'
        ? recoveryState.bridgeQuestionId
        : recoveryState.remixQuestionId;
      question = practiceQuestions.find((item) => item.id === recoveryQuestionId);
      index = 0;
    } else if (options.id) {
      question = practiceQuestions.find((item) => item.id === options.id);
      index = 0;
    } else if (this.isSelfPractice) {
      const ids = progress.selfPracticeQuestionIds || [];
      index = Number(options.index || progress.selfPracticeIndex || 0);
      question = practiceQuestions.find((item) => item.id === ids[index]);
    } else {
      const today = todayKey();
      const needsNewSet = progress.dailySetDate !== today || progress.contentBankVersion !== CONTENT_BANK_VERSION;
      if (needsNewSet || (!progress.dailyMissionMode && !progress.dailyQuestionIds.length)) {
        wx.showToast({ title: '先选一种今天的练习方式', icon: 'none' });
        wx.redirectTo({
          url: '/pages/home/home',
          fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
        });
        return;
      }
      const ids = resolveDailyQuestionIds(practiceQuestions, progress, today);
      if (progress.dailyQuestionIds.join(',') !== ids.join(',')) {
        progress = store.save({ ...progress, dailyQuestionIds: ids });
      }
      progress = store.rememberServedQuestions(progress, ids
        .map((id) => practiceQuestions.find((item) => item.id === id))
        .filter(Boolean));
      question = practiceQuestions.find((item) => item.id === ids[index]);
    }

    if (!question) {
      wx.showToast({
        title: options.id ? '请切回原教材和年级再练这题' : '题目暂时不可用',
        icon: 'none',
      });
      wx.redirectTo({ url: '/pages/home/home', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
      return;
    }

    const total = this.isRecovery || this.isRetry
      ? 1
      : this.isSelfPractice ? progress.selfPracticeQuestionIds.length : progress.dailyQuestionIds.length;
    this.setData({
      index,
      total,
      question: withChoiceLabels(question),
      typeLabel: typeLabels[question.type],
      levelLabel: this.isRecovery ? (this.recoveryStage === 'bridge' ? '小台阶题' : '同类再试') : this.isRetry ? '同类再练' : this.isSelfPractice ? (progress.selfPracticeMode === 'review' ? '复习题' : '自主练习') : levelLabels[question.type],
      sourceLabel: this.isRecovery ? '补会练习' : this.isSelfPractice ? '自主练习' : '今日练习',
      progressPercent: this.isRecovery || this.isRetry ? 100 : ((index + 1) / total) * 100,
      answer: '',
      work: '',
      selectedAnswer: '',
      showHint: false,
      usedHint: false,
      feedback: null,
      nextLabel: '',
    });
  },

  goBack() { wx.navigateBack({ fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) }); },
  notifyAudioFailure() {
    if (!this.soundEnabled || this.audioWarned) return;
    this.audioWarned = true;
    wx.showToast({ title: activityMessage('audio_failed'), icon: 'none' });
  },
  chooseOption(event) {
    const value = event.currentTarget.dataset.value;
    this.audio.play('tap');
    this.setData({ selectedAnswer: value, answer: value });
  },
  onAnswerInput(event) { this.setData({ answer: event.detail.value }); },
  onWorkInput(event) { this.setData({ work: event.detail.value }); },
  showHint() { this.audio.play('tap'); this.setData({ showHint: true, usedHint: true }); },

  submitAnswer() {
    const { question, answer, usedHint, index, total } = this.data;
    if (!canonicalizeMathAnswer(answer)) {
      wx.showToast({ title: '先填写答案', icon: 'none' });
      return;
    }

    const store = createProgressStore();
    const progress = store.load();
    if (this.questionSessionKey && this.questionSessionKey !== learningSessionKey(progress)) {
      wx.showToast({ title: '学习设置已更新，请从新题目开始', icon: 'none' });
      wx.redirectTo({
        url: this.isSelfPractice ? '/pages/practice/practice' : '/pages/home/home',
        fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
      });
      return;
    }

    const correct = answersEquivalent(answer, question.answer, question.answerUnit, question.answerSpec);
    const { practiceQuestions: allPracticeQuestions } = getQuestionBank(progress);
    const practiceQuestions = allPracticeQuestions.filter((item) => belongsToActiveSession(item, progress));
    this.practiceQuestions = practiceQuestions;
    const activeRecovery = this.isRecovery ? getRecoveryState(progress, this.recoveryStage, practiceQuestions) : null;
    if (this.isRecovery && !activeRecovery) {
      wx.showToast({ title: '补会练习暂时不可用', icon: 'none' });
      wx.redirectTo({ url: this.isSelfPractice ? '/pages/practice/practice' : '/pages/home/home' });
      return;
    }
    const adaptiveProgress = applyAdaptiveOutcome(
      progress,
      question,
      { correct, usedHint },
      todayKey(),
    );
    const completedIds = Array.from(new Set([...progress.completedIds, question.id]));
    const dailyCompleted = this.isRecovery || this.isRetry || this.isSelfPractice ? progress.dailyCompleted : Math.max(progress.dailyCompleted, index + 1);
    const earnedStars = correct && !this.isRecovery && !this.isRetry && !this.isSelfPractice && index >= total - 1 ? 1 : 0;
    const recoveryWins = recordRecoveryWin(
      progress.recoveryWins,
      this.isRecovery && correct && this.recoveryStage === 'remix',
    );
    const completionProgress = !this.isRecovery && !this.isRetry && !this.isSelfPractice && index >= total - 1
      ? recordDailyCompletion(progress, todayKey())
      : progress;

    const record = correct || this.isRecovery ? null : createMistakeRecord(question, answer, practiceQuestions);
    const mistakes = record
      ? [record, ...progress.mistakes.filter((item) => item.id !== record.id)]
      : progress.mistakes;
    let recoveryState = progress.recoveryState;
    if (this.isRecovery && correct) {
      this.recoveryReturn = { source: activeRecovery.source, nextIndex: activeRecovery.nextIndex };
      recoveryState = this.recoveryStage === 'bridge'
        ? { ...activeRecovery, stage: 'remix' }
        : null;
    }
    if (!this.isRecovery && record) {
      const recovery = buildRecoverySet(practiceQuestions, question, progress, {
        learnerId: progress.learnerId,
        date: todayKey(),
      });
      recoveryState = recovery ? {
        originalQuestionId: question.id,
        bridgeQuestionId: recovery.bridgeQuestion.id,
        remixQuestionId: recovery.remixQuestion.id,
        stage: 'explain',
        source: this.isSelfPractice ? 'self' : 'daily',
        nextIndex: index + 1,
        contentBankVersion: CONTENT_BANK_VERSION,
      } : null;
    }
    try {
      store.save({
        ...completionProgress,
        completedIds,
        dailyCompleted,
        stars: progress.stars + earnedStars,
        recoveryWins,
        selfPracticeIndex: this.isRecovery ? progress.selfPracticeIndex : this.isSelfPractice ? Math.min(index + 1, total) : progress.selfPracticeIndex,
        skillState: adaptiveProgress.skillState,
        knowledgeState: adaptiveProgress.knowledgeState,
        weakKnowledgePoints: adaptiveProgress.weakKnowledgePoints,
        level: adaptiveProgress.level,
        mistakes,
        recoveryState,
      });
    } catch (error) {
      wx.showToast({ title: activityMessage('save_failed'), icon: 'none' });
      return;
    }

    const played = this.audio.play(correct ? 'correct' : 'wrong');
    if (this.soundEnabled && !played) this.notifyAudioFailure();

    if (!correct) {
      const mistakeId = this.isRecovery ? `mistake-${activeRecovery.originalQuestionId}` : record.id;
      const source = this.isRecovery ? activeRecovery.source : this.isSelfPractice ? 'self' : '';
      const nextIndex = this.isRecovery ? activeRecovery.nextIndex : index + 1;
      wx.redirectTo({
        url: `/pages/analysis/analysis?id=${mistakeId}&next=${nextIndex}${source === 'self' ? '&source=self' : ''}`,
        fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
      });
      return;
    }

    this.setData({
      feedback: { knowledgeSummary: question.knowledgeSummary, mistakeSummary: question.mistakeSummary },
      nextLabel: this.isRecovery
        ? (this.recoveryStage === 'bridge' ? '同类再试' : this.isSelfPractice ? '返回自主练习' : '继续原来的练习')
        : this.isRetry || index >= total - 1 ? (this.isSelfPractice ? '返回自主练习' : '查看成长') : '下一题',
    });
    wx.showToast({ title: '思路正确', icon: 'success', duration: 700 });
  },

  continueAfterFeedback() {
    this.audio.play('navigate');
    const { index, total } = this.data;
    if (this.isRecovery) {
      if (this.recoveryStage === 'bridge') {
        wx.redirectTo({ url: '/pages/question/question?recovery=remix', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
        return;
      }
      const progress = createProgressStore().load();
      const recoveryReturn = this.recoveryReturn || { source: this.isSelfPractice ? 'self' : 'daily', nextIndex: 0 };
      wx.redirectTo({
        url: nextLearningUrl(progress, recoveryReturn.source, recoveryReturn.nextIndex),
        fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
      });
      return;
    }
    if (this.isRetry || index >= total - 1) {
      wx.redirectTo({ url: this.isSelfPractice ? '/pages/practice/practice' : '/pages/growth/growth', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
      return;
    }
    wx.redirectTo({ url: `/pages/question/question?index=${index + 1}${this.isSelfPractice ? '&source=self' : ''}`, fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
  },
  onShareAppMessage() { return buildShareMessage(); },
});
