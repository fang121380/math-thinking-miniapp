const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const { activityMessage } = require('../../utils/activity-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { getQuestionBank, getQuestionTopicLabel } = require('../../utils/question-bank');
const { getTextbookOption } = require('../../utils/textbook-catalog');
const { buildShareMessage } = require('../../utils/share');

const labels = {
  calculation: '运算理解',
  problem: '解决问题',
  geometry: '图形观察',
  pattern: '数据规律',
  data: '数据分析',
};

Page({
  data: {
    abilityRows: [], dailyGoal: 3, safeTop: getSafeTop(), learningLabel: '人教版 · 4年级',
    resultCopy: '已经完成摸底，接下来会优先安排需要加强的知识点。',
    planTitle: '均衡巩固基础与思维',
  },

  onShow() {
    try {
      const progress = createProgressStore().load();
      const { diagnosticQuestions } = getQuestionBank(progress);
      syncBackgroundMusic(progress.bgmEnabled, progress.bgmTrackIndex);
      const abilityRows = Object.keys(labels).map((key) => ({
        key,
        label: labels[key],
        score: progress.abilities[key] || 0,
        weak: (progress.abilities[key] || 0) < 70,
      }));
      const weakTopicLabels = (progress.weakKnowledgePoints || []).map((knowledgePoint) => {
        const source = diagnosticQuestions.find((item) => (
          item.knowledgePoint === knowledgePoint
          && item.grade === progress.grade
          && item.textbookId === progress.textbookId
        ));
        return getQuestionTopicLabel(source, knowledgePoint);
      }).filter(Boolean).slice(0, 2);
      const planTitle = weakTopicLabels.length ? weakTopicLabels.join(' + ') : '均衡巩固基础与思维';
      this.setData({
        abilityRows,
        dailyGoal: progress.dailyGoal,
        learningLabel: `${getTextbookOption(progress.textbookId).label} · ${progress.grade}年级`,
        resultCopy: weakTopicLabels.length
          ? `接下来重点练习${weakTopicLabels.join('和')}，做对后会逐步提高难度。`
          : '各项表现比较均衡，接下来会交替练习不同类型的题目。',
        planTitle,
      });
    } catch (error) {
      wx.showToast({ title: activityMessage('load_failed'), icon: 'none' });
    }
  },

  startLearning() {
    wx.redirectTo({ url: '/pages/home/home', fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }) });
  },
  onShareAppMessage() { return buildShareMessage(); },
});
