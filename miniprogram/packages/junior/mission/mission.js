const { createProgressStore } = require('../../../utils/storage');
const { getSafeTop } = require('../../../utils/layout');
const {
  GAME_TYPES,
  getGameMeta,
  getGamesForGrade,
  createSeededRandom,
  difficultyForCompletions,
} = require('../../../utils/game-engine');
const {
  generateMission,
  validateMission,
  createMissionPlayer,
  evaluateMission,
  getMissionHint,
} = require('../mission-engine');
const {
  startOrResumeRound,
  updateActiveRound,
  completeRound,
} = require('../../../utils/game-progress');
const { activityMessage } = require('../../../utils/activity-feedback');
const { createAudioFeedback } = require('../../../utils/audio-feedback');
const { syncBackgroundMusic } = require('../../../utils/background-music');
const { buildShareMessage } = require('../../../utils/share');

const DIFFICULTY_LABELS = { easy: '简易', medium: '适中', hard: '挑战' };
const FORMAT_LABELS = {
  transform: '变形链',
  coordinate: '坐标图',
  'proof-chain': '条件链',
  'data-board': '数据工作台',
};

function persistedJourneyAbility(ability) {
  return ability === 'data' ? 'pattern' : ability;
}

function selectedMissionDifficulty(progress, typeProgress) {
  const preferred = progress && progress.difficultyMode;
  return DIFFICULTY_LABELS[preferred] ? preferred : difficultyForCompletions(typeProgress.completions);
}

function canResumeMissionRound(round, progress, type) {
  return Boolean(
    round
      && round.type === type
      && round.schoolStage === 'junior'
      && Number(round.grade) === Number(progress.grade)
      && round.challenge
      && round.challenge.type === type
      && round.challenge.schoolStage === 'junior'
      && Number(round.challenge.grade) === Number(progress.grade)
      && round.signature === round.challenge.signature
      && validateMission(round.challenge).valid,
  );
}

function localFeedback(reason) {
  const feedback = {
    sequence_incomplete: '推理链还没排完，把关键步骤继续放进去。',
    sequence_incorrect: '这一步的顺序不对，撤回后从已知条件开始。',
    selection_incomplete: '还要补一个满足条件的坐标。',
    selection_incorrect: '选中的坐标里有不符合条件的点，撤回后再试。',
    selection_invalid: '有坐标不在当前任务内，重新选择吧。',
    evidence_and_conclusion_missing: '先选支持结论的证据，再选择结论。',
    evidence_incorrect: '证据还不完整或有多余项，重新检查数据。',
    conclusion_incorrect: '证据选对了，再根据它们判断结论。',
  };
  return feedback[reason] || activityMessage('load_failed');
}

Page({
  data: {
    safeTop: getSafeTop(),
    type: '',
    missionName: '思维任务',
    missionIcon: '/assets/icons/notebook-pen.svg',
    difficultyLabel: DIFFICULTY_LABELS.easy,
    format: '',
    formatLabel: '',
    loading: true,
    loadError: '',
    challengeTitle: '',
    instruction: '',
    workspaceCards: [],
    orderedCards: [],
    coordinateCells: [],
    coordinateSelectedCount: 0,
    coordinateTargetCount: 0,
    evidenceCards: [],
    conclusionChoices: [],
    selectedConclusionId: '',
    feedbackText: '',
    feedbackKind: '',
    complete: false,
    pendingCompletion: false,
    showRetrySave: false,
  },

  onLoad(options = {}) {
    this.type = GAME_TYPES.includes(options.type) ? options.type : '';
    this.requestedSchoolStage = options.schoolStage;
    this.requestedGrade = Number(options.grade);
    this.store = createProgressStore();
    this.audio = createAudioFeedback({
      isEnabled: () => Boolean(this.progress && this.progress.soundEnabled),
      onError: () => this.notifyAudioFailure(),
      eager: true,
      preloadKinds: ['tap', 'move', 'correct', 'wrong', 'complete', 'navigate'],
    });
    this.loadRound();
  },

  onUnload() { this.disposeAudio(); },
  disposeAudio() {
    if (!this.audio) return;
    this.audio.destroy();
    this.audio = null;
  },

  createRound(progress) {
    const typeProgress = progress.gameProgress.byType[this.type] || { completions: 0, recentSignatures: [] };
    const difficulty = selectedMissionDifficulty(progress, typeProgress);
    const seed = [progress.learnerId, this.type, Date.now(), Math.random(), typeProgress.completions].join(':');
    const challenge = generateMission(this.type, {
      grade: progress.grade,
      difficulty,
      rng: createSeededRandom(seed),
      recentSignatures: typeProgress.recentSignatures,
    });
    if (!challenge || !validateMission(challenge).valid) throw new Error('Mission generation failed');
    return {
      id: `${this.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: this.type,
      signature: challenge.signature,
      schoolStage: 'junior',
      grade: progress.grade,
      challenge,
      player: createMissionPlayer(challenge),
    };
  },

  loadRound() {
    this.setData({ loading: true, loadError: '', feedbackText: '', complete: false, showRetrySave: false });
    try {
      const loaded = this.store.ensureLearner(this.store.load());
      const available = getGamesForGrade(loaded.grade, loaded.schoolStage);
      if (loaded.schoolStage !== 'junior' || !available.length) throw new Error('Mission scope unavailable');
      const routeScopeMismatch = (this.requestedSchoolStage && this.requestedSchoolStage !== loaded.schoolStage)
        || (Number.isFinite(this.requestedGrade) && this.requestedGrade !== loaded.grade);
      if (!available.some((item) => item.type === this.type)) this.type = available[0].type;
      const meta = getGameMeta(this.type);
      if (!meta) throw new Error('Mission type unavailable');
      const result = startOrResumeRound(
        loaded.gameProgress,
        this.type,
        () => this.createRound(loaded),
        (round) => canResumeMissionRound(round, loaded, this.type),
      );
      this.progress = loaded;
      this.gameProgress = result.gameProgress;
      this.round = result.round;
      syncBackgroundMusic(loaded.bgmEnabled, loaded.bgmTrackIndex);
      if (!result.resumed && !this.commitGameProgress(result.gameProgress)) this.showFeedback('save_failed');
      this.setData({ type: this.type, missionName: meta.name, missionIcon: meta.icon });
      this.renderRound(result.round);
      if (result.replaced || routeScopeMismatch) this.showFeedback('game_round_replaced', 'hint');
    } catch (error) {
      this.setData({ loading: false, loadError: activityMessage('load_failed') });
    }
  },

  renderRound(round) {
    const { challenge, player } = round;
    const format = challenge.format;
    const common = {
      loading: false,
      loadError: '',
      format,
      formatLabel: FORMAT_LABELS[format] || '思维任务',
      difficultyLabel: DIFFICULTY_LABELS[challenge.difficulty] || DIFFICULTY_LABELS.easy,
      challengeTitle: challenge.title,
      instruction: challenge.instruction,
      workspaceCards: [],
      orderedCards: [],
      coordinateCells: [],
      coordinateSelectedCount: 0,
      coordinateTargetCount: 0,
      evidenceCards: [],
      conclusionChoices: [],
      selectedConclusionId: '',
      complete: false,
      pendingCompletion: false,
    };
    if (format === 'transform' || format === 'proof-chain') {
      const orderedIds = Array.isArray(player.orderedIds) ? player.orderedIds : [];
      const used = new Set(orderedIds);
      const cardById = (challenge.cards || []).reduce((result, card) => ({ ...result, [card.id]: card }), {});
      this.setData({
        ...common,
        workspaceCards: (challenge.cards || []).map((card) => ({ ...card, used: used.has(card.id) })),
        orderedCards: orderedIds.map((id, index) => ({
          id,
          index,
          text: cardById[id] ? cardById[id].text : '需要重新选择这一步',
        })),
      });
      return;
    }
    if (format === 'coordinate') {
      const selected = new Set(Array.isArray(player.selectedIds) ? player.selectedIds : []);
      this.setData({
        ...common,
        coordinateCells: (challenge.cells || []).map((cell) => ({ ...cell, selected: selected.has(cell.id) })),
        coordinateSelectedCount: selected.size,
        coordinateTargetCount: (challenge.requiredIds || []).length,
      });
      return;
    }
    const selectedEvidence = new Set(Array.isArray(player.selectedEvidenceIds) ? player.selectedEvidenceIds : []);
    this.setData({
      ...common,
      evidenceCards: (challenge.evidenceCards || []).map((card) => ({ ...card, selected: selectedEvidence.has(card.id) })),
      conclusionChoices: (challenge.conclusionChoices || []).map((choice) => ({
        ...choice,
        selected: String(player.conclusionId || '') === String(choice.id),
      })),
      selectedConclusionId: player.conclusionId || '',
    });
  },

  commitGameProgress(gameProgress, starsDelta = 0, countJourney = false) {
    try {
      const meta = countJourney ? getGameMeta(this.type) : null;
      const ability = persistedJourneyAbility(meta && meta.ability);
      const gameJourneyCounts = ability ? {
        ...this.progress.gameJourneyCounts,
        [ability]: Number(this.progress.gameJourneyCounts[ability] || 0) + 1,
      } : this.progress.gameJourneyCounts;
      const saved = this.store.save({
        ...this.progress,
        gameProgress,
        stars: this.progress.stars + starsDelta,
        gameJourneyCounts,
      });
      this.progress = saved;
      this.gameProgress = saved.gameProgress;
      return true;
    } catch (error) {
      return false;
    }
  },

  persistPlayer(player) {
    const round = { ...this.round, player };
    const nextGameProgress = updateActiveRound(this.gameProgress, this.type, round);
    this.round = round;
    this.gameProgress = nextGameProgress;
    if (!this.commitGameProgress(nextGameProgress)) {
      this.showFeedback('save_failed');
      return false;
    }
    return true;
  },

  showFeedback(code, kind = 'error') {
    const feedbackText = activityMessage(code);
    this.setData({ feedbackText, feedbackKind: kind, showRetrySave: code === 'save_failed' });
    if (kind === 'error') wx.showToast({ title: feedbackText, icon: 'none' });
  },

  playSound(kind) {
    const enabled = Boolean(this.progress && this.progress.soundEnabled);
    const played = this.audio && this.audio.play(kind);
    if (enabled && !played && !this.audioWarned) this.notifyAudioFailure();
  },

  notifyAudioFailure() {
    if (!this.progress || !this.progress.soundEnabled || this.audioWarned) return;
    this.audioWarned = true;
    wx.showToast({ title: activityMessage('audio_failed'), icon: 'none' });
  },

  goBack() {
    this.playSound('navigate');
    wx.navigateBack({
      fail: () => wx.redirectTo({
        url: '/pages/games/games',
        fail: () => wx.showToast({ title: activityMessage('navigation_failed'), icon: 'none' }),
      }),
    });
  },

  retryLoad() { this.loadRound(); },

  resetMission() {
    if (!this.round || this.data.complete || this.data.pendingCompletion) return;
    this.playSound('tap');
    if (this.persistPlayer(createMissionPlayer(this.round.challenge))) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '', complete: false, showRetrySave: false });
    }
  },

  selectWorkspaceCard(event) {
    if (this.data.complete || this.data.loading) return;
    const id = event.currentTarget.dataset.id;
    const cards = this.round.challenge.cards || [];
    const orderedIds = [...(this.round.player.orderedIds || [])];
    if (!cards.some((card) => card.id === id) || orderedIds.includes(id)) return;
    this.playSound('tap');
    if (this.persistPlayer({ ...this.round.player, orderedIds: [...orderedIds, id] })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  removeWorkspaceCard(event) {
    if (this.data.complete || this.data.loading) return;
    const index = Number(event.currentTarget.dataset.index);
    const orderedIds = [...(this.round.player.orderedIds || [])];
    if (!Number.isInteger(index) || index < 0 || index >= orderedIds.length) return;
    orderedIds.splice(index, 1);
    this.playSound('tap');
    if (this.persistPlayer({ ...this.round.player, orderedIds })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  toggleCoordinateCell(event) {
    if (this.data.complete || this.data.loading) return;
    const id = event.currentTarget.dataset.id;
    const cells = this.round.challenge.cells || [];
    if (!cells.some((cell) => cell.id === id)) return;
    const selectedIds = new Set(this.round.player.selectedIds || []);
    if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
    this.playSound('tap');
    if (this.persistPlayer({ ...this.round.player, selectedIds: [...selectedIds] })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  toggleEvidence(event) {
    if (this.data.complete || this.data.loading) return;
    const id = event.currentTarget.dataset.id;
    const cards = this.round.challenge.evidenceCards || [];
    if (!cards.some((card) => card.id === id)) return;
    const selectedEvidenceIds = new Set(this.round.player.selectedEvidenceIds || []);
    if (selectedEvidenceIds.has(id)) selectedEvidenceIds.delete(id); else selectedEvidenceIds.add(id);
    this.playSound('tap');
    if (this.persistPlayer({ ...this.round.player, selectedEvidenceIds: [...selectedEvidenceIds] })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  selectConclusion(event) {
    if (this.data.complete || this.data.loading) return;
    const id = event.currentTarget.dataset.id;
    const choices = this.round.challenge.conclusionChoices || [];
    if (!choices.some((choice) => choice.id === id)) return;
    this.playSound('tap');
    if (this.persistPlayer({ ...this.round.player, conclusionId: id })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  checkMission() {
    if (!this.round || this.data.complete || this.data.loading) return;
    const result = evaluateMission(this.round.challenge, this.round.player);
    if (result.complete) {
      this.finishMission();
      return;
    }
    this.playSound('wrong');
    this.setData({ feedbackText: localFeedback(result.reason), feedbackKind: 'error' });
  },

  hint() {
    if (!this.round || this.data.complete || this.data.loading) return;
    this.playSound('tap');
    this.setData({
      feedbackText: `提示：${getMissionHint(this.round.challenge, this.round.player)}`,
      feedbackKind: 'hint',
    });
  },

  finishMission() {
    const result = completeRound(this.gameProgress, this.type, this.round);
    const starDelta = result.rewarded ? 1 : 0;
    if (!this.commitGameProgress(result.gameProgress, starDelta, result.rewarded)) {
      this.setData({ complete: true, pendingCompletion: true });
      this.showFeedback('save_failed');
      return;
    }
    this.setData({
      complete: true,
      pendingCompletion: false,
      feedbackText: result.rewarded ? '任务完成，获得 1 颗思维星' : '这项任务已经完成',
      feedbackKind: 'success',
      showRetrySave: false,
    });
    this.playSound('correct');
    this.playSound('complete');
  },

  retrySave() {
    if (this.data.pendingCompletion) {
      this.finishMission();
      return;
    }
    if (this.round) this.persistPlayer(this.round.player);
  },

  nextMission() {
    if (!this.data.complete || this.data.pendingCompletion) {
      this.showFeedback('save_failed');
      return;
    }
    this.loadRound();
  },
  onShareAppMessage() { return buildShareMessage(); },
});
