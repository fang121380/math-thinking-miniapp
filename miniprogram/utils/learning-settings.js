const difficultyOptions = [
  { value: 'easy', label: '简易' },
  { value: 'medium', label: '适中' },
  { value: 'hard', label: '困难' },
];

const dailyGoalOptions = [3, 5, 10];

const learningTermOptions = [
  { value: '上册', label: '上册' },
  { value: '下册', label: '下册' },
];

const { textbookOptions, getTextbookOptions } = require('./textbook-catalog');
const { BGM_TRACKS } = require('./background-music');

const schoolStageOptions = [
  { value: 'primary', label: '\u5c0f\u5b66' },
  { value: 'junior', label: '\u521d\u4e2d' },
];

const gradeOptionsByStage = {
  primary: [1, 2, 3, 4, 5, 6],
  junior: [7, 8, 9],
};

function getGradeOptions(stage) {
  const grades = gradeOptionsByStage[stage] || gradeOptionsByStage.primary;
  return grades.map((value) => ({
    value,
    label: `${value}\u5e74\u7ea7`,
    available: true,
  }));
}

const gradeOptions = getGradeOptions('primary');

const DEFAULT_LEARNING_SETTINGS = {
  difficultyMode: 'medium',
  dailyGoal: 3,
  textbookId: 'rjb',
  schoolStage: 'primary',
  grade: 4,
  learningTerm: '上册',
  soundEnabled: true,
  bgmEnabled: false,
  bgmTrackIndex: 0,
  reminderEnabled: true,
};

function normalizeLearningSettings(value = {}) {
  const difficultyMode = difficultyOptions.some((item) => item.value === value.difficultyMode)
    ? value.difficultyMode
    : DEFAULT_LEARNING_SETTINGS.difficultyMode;
  const dailyGoal = dailyGoalOptions.includes(Number(value.dailyGoal))
    ? Number(value.dailyGoal)
    : DEFAULT_LEARNING_SETTINGS.dailyGoal;
  const incomingGrade = Number(value.grade);
  const schoolStage = schoolStageOptions.some((item) => item.value === value.schoolStage)
    ? value.schoolStage
    : DEFAULT_LEARNING_SETTINGS.schoolStage;
  const stageTextbookOptions = getTextbookOptions(schoolStage);
  const textbookId = stageTextbookOptions.some((item) => item.value === value.textbookId && item.available)
    ? value.textbookId
    : stageTextbookOptions[0].value;
  const stageGradeOptions = getGradeOptions(schoolStage);
  const grade = stageGradeOptions.some((item) => item.value === incomingGrade && item.available)
    ? incomingGrade
    : (schoolStage === DEFAULT_LEARNING_SETTINGS.schoolStage
      ? DEFAULT_LEARNING_SETTINGS.grade
      : gradeOptionsByStage[schoolStage][0]);
  const learningTerm = learningTermOptions.some((item) => item.value === value.learningTerm)
    ? value.learningTerm
    : DEFAULT_LEARNING_SETTINGS.learningTerm;
  const soundEnabled = typeof value.soundEnabled === 'boolean'
    ? value.soundEnabled
    : DEFAULT_LEARNING_SETTINGS.soundEnabled;
  const bgmEnabled = typeof value.bgmEnabled === 'boolean'
    ? value.bgmEnabled
    : DEFAULT_LEARNING_SETTINGS.bgmEnabled;
  const bgmTrackIndex = BGM_TRACKS.some((track, index) => index === Number(value.bgmTrackIndex))
    ? Number(value.bgmTrackIndex)
    : DEFAULT_LEARNING_SETTINGS.bgmTrackIndex;
  const reminderEnabled = typeof value.reminderEnabled === 'boolean'
    ? value.reminderEnabled
    : DEFAULT_LEARNING_SETTINGS.reminderEnabled;
  return {
    difficultyMode,
    dailyGoal,
    textbookId,
    schoolStage,
    grade,
    learningTerm,
    soundEnabled,
    bgmEnabled,
    bgmTrackIndex,
    reminderEnabled,
  };
}

module.exports = {
  DEFAULT_LEARNING_SETTINGS,
  difficultyOptions,
  dailyGoalOptions,
  learningTermOptions,
  textbookOptions,
  schoolStageOptions,
  getGradeOptions,
  gradeOptions,
  normalizeLearningSettings,
};
