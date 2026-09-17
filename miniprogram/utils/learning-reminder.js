function shouldShowLearningReminder(progress, today) {
  return Boolean(
    progress
    && progress.reminderEnabled
    && Number(progress.dailyCompleted || 0) === 0
    && progress.lastReminderDate !== today,
  );
}

module.exports = { shouldShowLearningReminder };
