const { createProgressStore } = require('../../utils/storage');
const { getSafeTop } = require('../../utils/layout');
const {
  GAME_TYPES,
  getGameMeta,
  getGamesForGrade,
  createSeededRandom,
  difficultyForCompletions,
  generateChallenge,
  constructTokensMatch,
  solvePuzzleNextMove,
  evaluatePartition,
} = require('../../utils/game-engine');
const {
  startOrResumeRound,
  updateActiveRound,
  completeRound,
  canResumeSavedRound,
} = require('../../utils/game-progress');
const { activityMessage } = require('../../utils/activity-feedback');
const { createAudioFeedback } = require('../../utils/audio-feedback');
const { syncBackgroundMusic } = require('../../utils/background-music');
const { buildShareMessage } = require('../../utils/share');

const GAME_META = {
  puzzle: { name: '数字拼图', icon: '/assets/icons/grid-3x3.svg' },
  pattern: { name: '规律侦探', icon: '/assets/icons/search.svg' },
  partition: { name: '图形分割', icon: '/assets/icons/layers.svg' },
};

const DIFFICULTY_LABELS = { easy: '简易', medium: '适中', hard: '困难' };

function initialPlayer(challenge) {
  if (challenge.mode === 'construct') return { placedTokenIds: [] };
  if (challenge.mode === 'matching') return { selectedCardId: '', matchedPairIds: [], moves: 0 };
  if (challenge.mode === 'route') return { checkpoint: 0, mistakes: 0 };
  if (challenge.type === 'puzzle') return { tiles: [...challenge.tiles], moves: 0 };
  if (challenge.type === 'partition') return { selectedKeys: [] };
  return { selectedAnswer: null };
}

function solvedPuzzle(tiles) {
  return tiles.length === 9
    && tiles.slice(0, 8).every((value, index) => value === index + 1)
    && tiles[8] === null;
}

function selectedRoundDifficulty(progress, typeProgress) {
  const preferred = progress && progress.difficultyMode;
  return DIFFICULTY_LABELS[preferred] ? preferred : difficultyForCompletions(typeProgress.completions);
}

Page({
  data: {
    safeTop: getSafeTop(),
    type: 'puzzle',
    mode: '',
    gameName: GAME_META.puzzle.name,
    gameIcon: GAME_META.puzzle.icon,
    difficultyLabel: DIFFICULTY_LABELS.easy,
    loading: true,
    loadError: '',
    challengeTitle: '',
    instruction: '',
    tiles: [],
    moves: 0,
    sequence: [],
    choices: [],
    selectedAnswer: null,
    partitionCells: [],
    partitionGridStyle: '',
    selectedCount: 0,
    targetCount: 0,
    constructTray: [],
    constructPalette: [],
    constructTargetCount: 0,
    matchingCards: [],
    matchingPairsDone: 0,
    matchingPairsTotal: 0,
    routePrompt: '',
    routeChoices: [],
    routeDots: [],
    routeCheckpoint: 0,
    routeTotal: 0,
    feedbackText: '',
    feedbackKind: '',
    complete: false,
    pendingCompletion: false,
    showRetrySave: false,
  },

  onLoad(options = {}) {
    const type = GAME_TYPES.includes(options.type) ? options.type : 'puzzle';
    const gameMeta = getGameMeta(type) || GAME_META.puzzle;
    this.type = type;
    this.requestedSchoolStage = options.schoolStage;
    this.requestedGrade = Number(options.grade);
    this.store = createProgressStore();
    this.audio = createAudioFeedback({
      isEnabled: () => Boolean(this.progress && this.progress.soundEnabled),
      onError: () => this.notifyAudioFailure(),
      eager: true,
      preloadKinds: ['tap', 'move', 'correct', 'wrong', 'complete', 'navigate'],
    });
    this.setData({ type, gameName: gameMeta.name, gameIcon: gameMeta.icon });
    this.loadRound();
  },

  onUnload() { this.disposeAudio(); },
  disposeAudio() {
    if (!this.audio) return;
    this.audio.destroy();
    this.audio = null;
  },

  createRound(progress) {
    const typeProgress = progress.gameProgress.byType[this.type];
    const difficulty = selectedRoundDifficulty(progress, typeProgress);
    const seed = [progress.learnerId, this.type, Date.now(), Math.random(), typeProgress.completions].join(':');
    const challenge = {
      ...generateChallenge(this.type, {
        difficulty,
        schoolStage: progress.schoolStage,
        grade: progress.grade,
        rng: createSeededRandom(seed),
        recentSignatures: typeProgress.recentSignatures,
      }),
      schoolStage: progress.schoolStage,
      grade: progress.grade,
    };
    return {
      id: `${this.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: this.type,
      signature: challenge.signature,
      schoolStage: progress.schoolStage,
      grade: progress.grade,
      challenge,
      player: initialPlayer(challenge),
    };
  },

  loadRound() {
    this.setData({ loading: true, loadError: '', feedbackText: '', complete: false, showRetrySave: false });
    try {
      const loaded = this.store.ensureLearner(this.store.load());
      const availableGames = getGamesForGrade(loaded.grade, loaded.schoolStage);
      if (!availableGames.length) throw new Error('No games available for the active learning scope');
      const routeScopeMismatch = (this.requestedSchoolStage && this.requestedSchoolStage !== loaded.schoolStage)
        || (Number.isFinite(this.requestedGrade) && this.requestedGrade !== loaded.grade);
      if (!availableGames.some((game) => game.type === this.type)) {
        this.type = availableGames[0].type;
        const replacementMeta = getGameMeta(this.type);
        this.setData({ type: this.type, gameName: replacementMeta.name, gameIcon: replacementMeta.icon });
      }
      const result = startOrResumeRound(
        loaded.gameProgress,
        this.type,
        () => this.createRound(loaded),
        (round) => canResumeSavedRound(round, loaded, this.type),
      );
      this.progress = loaded;
      syncBackgroundMusic(loaded.bgmEnabled, loaded.bgmTrackIndex);
      this.gameProgress = result.gameProgress;
      this.round = result.round;
      if (!result.resumed && !this.commitGameProgress(result.gameProgress)) this.showFeedback('save_failed');
      this.renderRound(result.round);
      if (result.replaced || routeScopeMismatch) this.showFeedback('game_round_replaced', 'hint');
    } catch (error) {
      this.setData({ loading: false, loadError: activityMessage('load_failed') });
    }
  },

  renderRound(round) {
    const { challenge, player } = round;
    const mode = challenge.mode || '';
    const common = {
      loading: false,
      loadError: '',
      mode,
      challengeTitle: challenge.title,
      instruction: challenge.instruction,
      difficultyLabel: DIFFICULTY_LABELS[challenge.difficulty] || DIFFICULTY_LABELS.easy,
      complete: false,
      pendingCompletion: false,
      sequence: [],
      choices: [],
      selectedAnswer: null,
      partitionCells: [],
      partitionGridStyle: '',
      selectedCount: 0,
      targetCount: 0,
      constructTray: [],
      constructPalette: [],
      constructTargetCount: 0,
      matchingCards: [],
      matchingPairsDone: 0,
      matchingPairsTotal: 0,
      routePrompt: '',
      routeChoices: [],
      routeDots: [],
      routeCheckpoint: 0,
      routeTotal: 0,
      feedbackText: challenge.repeatExhausted ? activityMessage('game_review_round') : '',
      feedbackKind: challenge.repeatExhausted ? 'hint' : '',
    };
    if (mode === 'construct') {
      const placed = new Set(player.placedTokenIds || []);
      const paletteById = (challenge.palette || []).reduce((result, token) => ({ ...result, [token.id]: token }), {});
      this.setData({
        ...common,
        constructTray: (player.placedTokenIds || []).map((id, index) => ({
          id,
          index,
          label: paletteById[id] ? paletteById[id].label : '?',
        })),
        constructPalette: (challenge.palette || []).map((token) => ({ ...token, used: placed.has(token.id) })),
        constructTargetCount: (challenge.expectedTokenIds || []).length,
      });
      return;
    }
    if (mode === 'matching') {
      const matchedPairIds = new Set(player.matchedPairIds || []);
      const pairCount = new Set((challenge.cards || []).map((card) => card.pairId)).size;
      this.setData({
        ...common,
        matchingCards: (challenge.cards || []).map((card) => ({
          ...card,
          selected: player.selectedCardId === card.id,
          matched: matchedPairIds.has(card.pairId),
        })),
        matchingPairsDone: matchedPairIds.size,
        matchingPairsTotal: pairCount,
        moves: player.moves || 0,
      });
      return;
    }
    if (mode === 'route') {
      const checkpoint = Math.max(0, Number(player.checkpoint) || 0);
      const routeSteps = challenge.routeSteps || [];
      const step = routeSteps[checkpoint];
      this.setData({
        ...common,
        routePrompt: step ? step.prompt : '',
        routeChoices: step ? step.choices : [],
        routeDots: routeSteps.map((routeStep, index) => ({
          id: routeStep.id,
          done: index < checkpoint,
          current: index === checkpoint,
        })),
        routeCheckpoint: checkpoint,
        routeTotal: routeSteps.length,
      });
      return;
    }
    if (this.type === 'puzzle') {
      this.setData({ ...common, tiles: [...player.tiles], moves: player.moves || 0 });
      return;
    }
    if (this.type !== 'partition') {
      this.setData({
        ...common,
        mode: 'choice',
        sequence: [...(challenge.sequence || [])],
        choices: [...challenge.choices],
        selectedAnswer: player.selectedAnswer,
      });
      return;
    }
    const selected = new Set(player.selectedKeys || []);
    const partitionCells = challenge.cells.map((cell) => ({
      ...cell,
      selected: selected.has(cell.key),
      style: `grid-row:${cell.row + 1};grid-column:${cell.column + 1};`,
    }));
    this.setData({
      ...common,
      partitionCells,
      partitionGridStyle: `grid-template-columns:repeat(${challenge.columns}, 1fr);grid-template-rows:repeat(${challenge.rows}, 1fr);`,
      selectedCount: selected.size,
      targetCount: challenge.targetCount,
    });
  },

  commitGameProgress(gameProgress, starsDelta = 0, countJourney = false) {
    try {
      const gameMeta = countJourney ? getGameMeta(this.type) : null;
      const ability = gameMeta && gameMeta.ability;
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

  showFeedback(code, kind = 'error', context = {}) {
    const feedbackText = activityMessage(code, context);
    this.setData({ feedbackText, feedbackKind: kind, showRetrySave: code === 'save_failed' });
    if (kind === 'error') wx.showToast({ title: feedbackText, icon: 'none' });
  },

  playSound(kind) {
    const enabled = Boolean(this.progress && this.progress.soundEnabled);
    const played = this.audio.play(kind);
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

  resetGame() {
    if (!this.round || this.data.complete || this.data.pendingCompletion) return;
    const player = initialPlayer(this.round.challenge);
    this.playSound('tap');
    if (this.persistPlayer(player)) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '', complete: false, showRetrySave: false });
    }
  },

  moveTile(event) {
    if (this.data.complete || this.data.loading) return;
    const index = Number(event.currentTarget.dataset.index);
    const tiles = [...this.data.tiles];
    const emptyIndex = tiles.indexOf(null);
    const sameRow = Math.floor(index / 3) === Math.floor(emptyIndex / 3);
    const adjacent = (sameRow && Math.abs(index - emptyIndex) === 1) || Math.abs(index - emptyIndex) === 3;
    if (!adjacent || tiles[index] === null) {
      this.playSound('wrong');
      this.showFeedback('invalid_puzzle_move');
      return;
    }
    [tiles[index], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[index]];
    const player = { tiles, moves: this.data.moves + 1 };
    this.playSound('move');
    if (solvedPuzzle(tiles)) {
      this.round = { ...this.round, player };
      this.finishRound();
      return;
    }
    if (this.persistPlayer(player)) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  selectPattern(event) {
    if (this.data.complete || this.data.loading) return;
    const rawValue = event.currentTarget.dataset.value;
    const selectedAnswer = typeof rawValue === 'string' && Number.isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
    this.playSound('tap');
    if (this.persistPlayer({ selectedAnswer })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  togglePartitionCell(event) {
    if (this.data.complete || this.data.loading) return;
    const key = event.currentTarget.dataset.key;
    const selected = new Set(this.round.player.selectedKeys || []);
    if (selected.has(key)) selected.delete(key); else selected.add(key);
    this.playSound('tap');
    if (this.persistPlayer({ selectedKeys: [...selected] })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  selectConstructToken(event) {
    if (this.data.complete || this.data.loading) return;
    const id = event.currentTarget.dataset.id;
    const challenge = this.round.challenge;
    const palette = challenge.palette || [];
    const placedTokenIds = [...(this.round.player.placedTokenIds || [])];
    if (!palette.some((token) => token.id === id) || placedTokenIds.includes(id)) return;
    this.playSound('tap');
    if (this.persistPlayer({ placedTokenIds: [...placedTokenIds, id] })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  removeConstructToken(event) {
    if (this.data.complete || this.data.loading) return;
    const index = Number(event.currentTarget.dataset.index);
    const placedTokenIds = [...(this.round.player.placedTokenIds || [])];
    if (!Number.isInteger(index) || index < 0 || index >= placedTokenIds.length) return;
    placedTokenIds.splice(index, 1);
    this.playSound('tap');
    if (this.persistPlayer({ placedTokenIds })) {
      this.renderRound(this.round);
      this.setData({ feedbackText: '', feedbackKind: '' });
    }
  },

  selectMatchingCard(event) {
    if (this.data.complete || this.data.loading) return;
    const id = event.currentTarget.dataset.id;
    const challenge = this.round.challenge;
    const cards = challenge.cards || [];
    const card = cards.find((item) => item.id === id);
    const player = this.round.player;
    const matchedPairIds = new Set(player.matchedPairIds || []);
    if (!card || matchedPairIds.has(card.pairId)) return;
    if (!player.selectedCardId || player.selectedCardId === id) {
      this.playSound('tap');
      if (this.persistPlayer({ ...player, selectedCardId: player.selectedCardId === id ? '' : id })) {
        this.renderRound(this.round);
        this.setData({ feedbackText: '', feedbackKind: '' });
      }
      return;
    }
    const selectedCard = cards.find((item) => item.id === player.selectedCardId);
    const moves = Number(player.moves || 0) + 1;
    if (selectedCard && selectedCard.pairId === card.pairId) {
      matchedPairIds.add(card.pairId);
      const nextPlayer = { selectedCardId: '', matchedPairIds: [...matchedPairIds], moves };
      this.playSound('correct');
      if (!this.persistPlayer(nextPlayer)) return;
      if (matchedPairIds.size === new Set(cards.map((item) => item.pairId)).size) {
        this.finishRound();
        return;
      }
      this.renderRound(this.round);
      this.setData({ feedbackText: '配对成功，继续找下一对。', feedbackKind: 'success' });
      return;
    }
    this.playSound('wrong');
    if (this.persistPlayer({ selectedCardId: '', matchedPairIds: [...matchedPairIds], moves })) {
      this.renderRound(this.round);
      this.showFeedback('matching_wrong');
    }
  },

  advanceRoute(event) {
    if (this.data.complete || this.data.loading) return;
    const id = event.currentTarget.dataset.id;
    const challenge = this.round.challenge;
    const checkpoint = Number(this.round.player.checkpoint || 0);
    const step = (challenge.routeSteps || [])[checkpoint];
    const choice = step && (step.choices || []).find((item) => item.id === id);
    if (!step || !choice) return;
    if (choice.id !== step.answerId) {
      this.playSound('wrong');
      if (this.persistPlayer({ checkpoint, mistakes: Number(this.round.player.mistakes || 0) + 1 })) {
        this.renderRound(this.round);
        this.showFeedback('route_wrong');
      }
      return;
    }
    const nextCheckpoint = checkpoint + 1;
    this.playSound('move');
    if (!this.persistPlayer({ checkpoint: nextCheckpoint, mistakes: Number(this.round.player.mistakes || 0) })) return;
    if (nextCheckpoint >= challenge.routeSteps.length) {
      this.finishRound();
      return;
    }
    this.renderRound(this.round);
    this.setData({ feedbackText: '这一步走对了，继续前进。', feedbackKind: 'success' });
  },

  checkAnswer() {
    if (this.data.complete || this.data.loading) return;
    const challenge = this.round.challenge;
    if (challenge.mode === 'construct') {
      const placed = this.round.player.placedTokenIds || [];
      if (!placed.length) {
        this.showFeedback('construct_unfinished');
        return;
      }
      if (!constructTokensMatch(challenge, placed)) {
        this.playSound('wrong');
        this.showFeedback('construct_wrong');
        return;
      }
      this.finishRound();
      return;
    }
    if (challenge.mode === 'choice') {
      if (this.data.selectedAnswer === null) {
        this.showFeedback('pattern_unselected');
        return;
      }
      if (String(this.data.selectedAnswer) !== String(challenge.answer)) {
        this.playSound('wrong');
        this.showFeedback('pattern_wrong');
        return;
      }
      this.finishRound();
      return;
    }
    if (this.type === 'partition') {
      const selectedKeys = this.round.player.selectedKeys || [];
      const result = evaluatePartition(challenge.cells, selectedKeys);
      if (!result.complete) {
        this.playSound('wrong');
        const difference = challenge.targetCount - selectedKeys.length;
        this.showFeedback(result.reason === 'count' ? 'partition_count' : result.reason, 'error', { difference });
        return;
      }
      this.finishRound();
    }
  },

  hint() {
    if (!this.round || this.data.loading || this.data.complete) return;
    const challenge = this.round.challenge;
    this.playSound('tap');
    if (challenge.mode === 'construct') {
      const placed = this.round.player.placedTokenIds || [];
      if (challenge.type === 'logic-seats') {
        const hasAdjacentClue = String(challenge.instruction || '').includes('紧挨');
        const nextStep = hasAdjacentClue
          ? '再按“紧挨”的条件排好相邻座位。'
          : '再安排剩下的中间位置。';
        this.setData({
          feedbackText: placed.length
            ? `提示：检查最左、最右的位置是否正确，${nextStep}`
            : `提示：先找“最左边”和“最右边”的同学放好，${nextStep}`,
          feedbackKind: 'hint',
        });
        return;
      }
      this.setData({
        feedbackText: placed.length
          ? '提示：检查等号两边是否相等，运算顺序也要正确。'
          : '提示：先摆出等号，保证等式两边表示同一个数量。',
        feedbackKind: 'hint',
      });
      return;
    }
    if (challenge.mode === 'matching') {
      const remaining = new Set((challenge.cards || []).map((card) => card.pairId)).size - (this.round.player.matchedPairIds || []).length;
      if (challenge.type === 'shape-hunt') {
        this.setData({
          feedbackText: `提示：还剩 ${remaining} 对，先读清卡片上的边、角、直角等特征，再找只符合这一组特征的图形。`,
          feedbackKind: 'hint',
        });
        return;
      }
      this.setData({ feedbackText: `提示：还剩 ${remaining} 对，先找表达同一个结果的两张卡。`, feedbackKind: 'hint' });
      return;
    }
    if (challenge.mode === 'route') {
      const step = (challenge.routeSteps || [])[this.round.player.checkpoint || 0];
      this.setData({ feedbackText: `提示：${step ? step.hint : challenge.explanation}`, feedbackKind: 'hint' });
      return;
    }
    if (this.type === 'puzzle') {
      const tileIndex = solvePuzzleNextMove(this.data.tiles);
      if (tileIndex === null) {
        this.showFeedback('hint_unavailable');
        return;
      }
      this.setData({ feedbackText: `试试移动数字 ${this.data.tiles[tileIndex]}`, feedbackKind: 'hint' });
      return;
    }
    if (this.type !== 'partition') {
      this.setData({ feedbackText: `提示：${challenge.explanation}`, feedbackKind: 'hint' });
      return;
    }
    const remaining = challenge.targetCount - this.data.selectedCount;
    this.setData({
      feedbackText: remaining > 0
        ? `还要选 ${remaining} 格，注意选中和没选的格子都要连在一起`
        : '检查一下：选中和没选的格子都要各自连在一起',
      feedbackKind: 'hint',
    });
  },

  finishRound() {
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
      feedbackText: result.rewarded ? '完成！获得 1 颗思维星' : '这一局已经完成',
      feedbackKind: 'success',
      showRetrySave: false,
    });
    this.playSound('correct');
    this.playSound('complete');
  },

  retrySave() {
    if (this.data.pendingCompletion) {
      this.finishRound();
      return;
    }
    if (this.round) this.persistPlayer(this.round.player);
  },

  nextRound() {
    if (!this.data.complete || this.data.pendingCompletion) {
      this.showFeedback('save_failed');
      return;
    }
    this.loadRound();
  },
  onShareAppMessage() { return buildShareMessage(); },
});
