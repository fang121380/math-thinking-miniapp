const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const miniprogram = path.join(root, 'miniprogram');
const projectConfig = path.join(root, 'project.config.json');
const expectedPages = [
  'pages/intro/intro',
  'pages/test/test',
  'pages/result/result',
  'pages/home/home',
  'pages/question/question',
  'pages/analysis/analysis',
  'pages/games/games',
  'pages/game/game',
  'pages/growth/growth',
  'pages/mine/mine',
  'pages/practice/practice',
];

const expectedSubpackages = [
  { root: 'packages/junior', pages: ['mission/mission'] },
];

test('app.json declares the complete accepted page set', () => {
  const config = JSON.parse(fs.readFileSync(path.join(miniprogram, 'app.json'), 'utf8'));
  assert.deepEqual(config.pages, expectedPages);
  assert.deepEqual(config.subpackages, expectedSubpackages);
});

test('release configuration limits search indexing and handles client updates', () => {
  const sitemap = JSON.parse(fs.readFileSync(path.join(miniprogram, 'sitemap.json'), 'utf8'));
  const app = fs.readFileSync(path.join(miniprogram, 'app.js'), 'utf8');
  assert.deepEqual(sitemap.rules, [
    { action: 'allow', page: 'pages/intro/intro' },
    { action: 'disallow', page: '*' },
  ]);
  assert.match(app, /wx\.getUpdateManager\(\)/);
  assert.match(app, /onUpdateReady/);
  assert.match(app, /applyUpdate/);
});

test('every reachable page enables the shared child-safe share card', () => {
  const declaredRoutes = expectedPages.concat(expectedSubpackages.flatMap((subpackage) => (
    subpackage.pages.map((page) => `${subpackage.root}/${page}`)
  )));
  const share = fs.readFileSync(path.join(miniprogram, 'utils/share.js'), 'utf8');

  assert.match(share, /path:\s*'\/pages\/intro\/intro'/);
  assert.match(share, /imageUrl:\s*'\/assets\/app-icon-1024\.png'/);
  declaredRoutes.forEach((route) => {
    const source = fs.readFileSync(path.join(miniprogram, `${route}.js`), 'utf8');
    assert.match(source, /onShareAppMessage\(\)/, `${route} must enable friend sharing`);
    assert.match(source, /buildShareMessage\(\)/, `${route} must use the shared share card`);
  });
});

test('daily practice saves knowledge review state and home renders a mission focus', () => {
  const question = fs.readFileSync(path.join(miniprogram, 'pages/question/question.js'), 'utf8');
  const homeJs = fs.readFileSync(path.join(miniprogram, 'pages/home/home.js'), 'utf8');
  const homeWxml = fs.readFileSync(path.join(miniprogram, 'pages/home/home.wxml'), 'utf8');
  assert.match(question, /applyAdaptiveOutcome/);
  assert.match(question, /knowledgeState:\s*adaptiveProgress\.knowledgeState/);
  assert.match(homeJs, /describeMissionFocus/);
  assert.match(homeJs, /missionFocus/);
  assert.match(homeWxml, /\{\{missionFocus\}\}/);
});

test('home lets a child choose a daily review or challenge path before starting', () => {
  const homeJs = fs.readFileSync(path.join(miniprogram, 'pages/home/home.js'), 'utf8');
  const homeWxml = fs.readFileSync(path.join(miniprogram, 'pages/home/home.wxml'), 'utf8');
  assert.match(homeJs, /chooseMissionMode\(event\)/);
  assert.match(homeJs, /normalizeDailyMissionMode/);
  assert.match(homeJs, /getJourneyFocus/);
  assert.match(homeWxml, /data-mode="review"/);
  assert.match(homeWxml, /data-mode="challenge"/);
  assert.match(homeWxml, /\{\{journeyFocus\.label\}\}/);
});

test('question page returns a fresh daily task to the home path choice', () => {
  const question = fs.readFileSync(path.join(miniprogram, 'pages/question/question.js'), 'utf8');
  assert.match(question, /dailyMissionMode/);
  assert.match(question, /dailyQuestionIds\.length/);
  assert.match(question, /url: '\/pages\/home\/home'/);
});

test('growth page renders a local weekly mission and milestone feedback', () => {
  const growth = fs.readFileSync(path.join(miniprogram, 'pages/growth/growth.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/growth/growth.wxml'), 'utf8');
  assert.match(growth, /getWeeklyMission/);
  assert.match(growth, /getMilestoneBadges/);
  assert.match(growth, /weeklyMission/);
  assert.match(growth, /milestoneRows/);
  assert.match(wxml, /\{\{weeklyMission\.completedDays\}\}/);
  assert.match(wxml, /wx:for="\{\{milestoneRows\}\}"/);
});

test('home presents a daily theme and dismissible content update while growth celebrates recovery', () => {
  const homeJs = fs.readFileSync(path.join(miniprogram, 'pages/home/home.js'), 'utf8');
  const homeWxml = fs.readFileSync(path.join(miniprogram, 'pages/home/home.wxml'), 'utf8');
  const growthJs = fs.readFileSync(path.join(miniprogram, 'pages/growth/growth.js'), 'utf8');
  const growthWxml = fs.readFileSync(path.join(miniprogram, 'pages/growth/growth.wxml'), 'utf8');

  assert.match(homeJs, /getDailyTheme/);
  assert.match(homeJs, /dismissContentNotice/);
  assert.match(homeJs, /seenContentVersion/);
  assert.match(homeWxml, /dailyTheme\.title/);
  assert.match(homeWxml, /showContentNotice/);
  assert.match(homeWxml, /bindtap="dismissContentNotice"/);
  assert.match(growthJs, /recoveryWins/);
  assert.match(growthWxml, /recoveryWins/);
});

test('growth and games provide optional local learning guidance without rankings', () => {
  const growthJs = fs.readFileSync(path.join(miniprogram, 'pages/growth/growth.js'), 'utf8');
  const growthWxml = fs.readFileSync(path.join(miniprogram, 'pages/growth/growth.wxml'), 'utf8');
  const gamesJs = fs.readFileSync(path.join(miniprogram, 'pages/games/games.js'), 'utf8');
  const gamesWxml = fs.readFileSync(path.join(miniprogram, 'pages/games/games.wxml'), 'utf8');
  const gameJs = fs.readFileSync(path.join(miniprogram, 'pages/game/game.js'), 'utf8');
  assert.match(growthJs, /buildLearningJourney/);
  assert.match(growthWxml, /wx:for="\{\{journeyRows\}\}"/);
  assert.match(gamesJs, /pickRecommendedGameType/);
  assert.match(gamesWxml, /适合现在练一练/);
  assert.match(gameJs, /gameJourneyCounts/);
  assert.doesNotMatch(growthWxml + gamesWxml, /排行榜|排名|leaderboard/i);
});

test('project configuration is valid JSON for DevTools upload', () => {
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(projectConfig, 'utf8')));
});

test('every declared page has JavaScript, JSON, WXML, and WXSS files', () => {
  const declaredRoutes = expectedPages.concat(expectedSubpackages.flatMap((subpackage) => (
    subpackage.pages.map((page) => `${subpackage.root}/${page}`)
  )));
  declaredRoutes.forEach((route) => {
    ['js', 'json', 'wxml', 'wxss'].forEach((extension) => {
      assert.equal(fs.existsSync(path.join(miniprogram, `${route}.${extension}`)), true, `${route}.${extension}`);
    });
  });
});

test('every page binds runtime safe-area padding at the root', () => {
  const declaredRoutes = expectedPages.concat(expectedSubpackages.flatMap((subpackage) => (
    subpackage.pages.map((page) => `${subpackage.root}/${page}`)
  )));
  declaredRoutes.forEach((route) => {
    const wxml = fs.readFileSync(path.join(miniprogram, `${route}.wxml`), 'utf8');
    assert.match(
      wxml,
      /<view class="page[^\"]*"[^>]*style="padding-top: \{\{safeTop\}\}px;"/,
      `${route} should bind safeTop`,
    );
  });
});

test('question page exposes choice, fill, and problem states', () => {
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/question/question.wxml'), 'utf8');
  assert.match(wxml, /question\.type === 'choice'/);
  assert.match(wxml, /question\.type === 'fill'/);
  assert.match(wxml, /question\.type === 'problem'/);
});

test('numeric questions tell learners when an answer unit can be entered', () => {
  const questionWxml = fs.readFileSync(path.join(miniprogram, 'pages/question/question.wxml'), 'utf8');
  const testWxml = fs.readFileSync(path.join(miniprogram, 'pages/test/test.wxml'), 'utf8');

  assert.match(questionWxml, /question\.answerUnit \? '填写答案和单位' : '填写答案'/);
  assert.match(questionWxml, /question\.answerUnit \? '最后答案和单位' : '最后答案'/);
  assert.match(testWxml, /question\.answerUnit \? '填写答案和单位' : '填写答案'/);
  assert.match(testWxml, /question\.answerUnit \? '写下最后答案和单位' : '写下最后答案，可以只填数字'/);
});

test('question and diagnostic pages pass answer specs to the shared comparator', () => {
  const questionJs = fs.readFileSync(path.join(miniprogram, 'pages/question/question.js'), 'utf8');
  const testJs = fs.readFileSync(path.join(miniprogram, 'pages/test/test.js'), 'utf8');
  const comparatorCall = /answersEquivalent\(\s*answer,\s*question\.answer,\s*question\.answerUnit,\s*question\.answerSpec\s*\)/;

  assert.match(questionJs, comparatorCall);
  assert.match(testJs, comparatorCall);
});

test('home and question pages render the saved daily goal instead of a hard-coded total', () => {
  const homeJs = fs.readFileSync(path.join(miniprogram, 'pages/home/home.js'), 'utf8');
  const homeWxml = fs.readFileSync(path.join(miniprogram, 'pages/home/home.wxml'), 'utf8');
  const questionJs = fs.readFileSync(path.join(miniprogram, 'pages/question/question.js'), 'utf8');
  const questionWxml = fs.readFileSync(path.join(miniprogram, 'pages/question/question.wxml'), 'utf8');
  const analysisJs = fs.readFileSync(path.join(miniprogram, 'pages/analysis/analysis.js'), 'utf8');

  assert.match(homeWxml, /共 \{\{total\}\} 题/);
  assert.match(questionWxml, /\{\{index \+ 1\}\} \/ \{\{total\}\}/);
  assert.match(homeJs, /dailyQuestionIds\s*\.map/);
  assert.match(homeJs, /\.slice\(windowStart, windowStart \+ 3\)/);
  assert.match(questionJs, /index >= total - 1/);
  assert.doesNotMatch(questionJs, /\(\(index \+ 1\) \/ 3\)/);
  assert.doesNotMatch(analysisJs, /Math\.min\(this\.data\.nextIndex, 2\)/);
});

test('number puzzle keeps the empty tile visually blank', () => {
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/game/game.wxml'), 'utf8');
  assert.match(wxml, /\{\{item === null \? '' : item\}\}/);
});

test('analysis page visibly includes cause, steps, and retry action', () => {
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/analysis/analysis.wxml'), 'utf8');
  assert.match(wxml, /错因分析/);
  assert.match(wxml, /分步解析/);
  assert.match(wxml, /同类题/);
});

test('wrong answers can use a guarded small-step recovery flow', () => {
  const question = fs.readFileSync(path.join(miniprogram, 'pages/question/question.js'), 'utf8');
  const analysis = fs.readFileSync(path.join(miniprogram, 'pages/analysis/analysis.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/analysis/analysis.wxml'), 'utf8');
  assert.match(question, /buildRecoverySet/);
  assert.match(question, /recovery=remix/);
  assert.match(question, /contentBankVersion/);
  assert.match(question, /recordRecoveryWin\(\s*progress\.recoveryWins,\s*this\.isRecovery && correct && this\.recoveryStage === 'remix'/);
  assert.match(analysis, /startRecovery/);
  assert.match(analysis, /recovery=\$\{stage\}/);
  assert.match(analysis, /recoveryActionLabel/);
  assert.match(wxml, /bindtap="startRecovery"/);
});

test('new learners select a grade before the concise RJB diagnostic begins', () => {
  const introJs = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.js'), 'utf8');
  const introWxml = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.wxml'), 'utf8');

  assert.match(introJs, /initialGradeConfirmed/);
  assert.match(introJs, /selectInitialGrade\(event\)/);
  assert.match(introJs, /confirmInitialGrade/);
  assert.match(introWxml, /选择你的学习舞台/);
  assert.match(introWxml, /人教版/);
  assert.match(introWxml, /wx:for="\{\{gradeOptions\}\}"/);
  assert.match(introWxml, /data-grade="\{\{item\.value\}\}"/);
  assert.match(introWxml, /5 道起点小测/);
});

test('diagnostic page selects and persists one resumable five-question attempt', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'pages/test/test.js'), 'utf8');
  assert.match(pageJs, /prepareDiagnosticAttempt/);
  assert.match(pageJs, /ENTRY_DIAGNOSTIC_COUNT/);
  assert.match(pageJs, /this\.questions/);
  assert.match(pageJs, /diagnosticQuestionIds/);
  assert.match(pageJs, /diagnosticInProgress/);
  assert.doesNotMatch(pageJs, /total:\s*8/);
  assert.doesNotMatch(pageJs, /questions\.length !== 8/);
  assert.doesNotMatch(pageJs, /index >= diagnosticQuestions\.length - 1/);
});

test('visible product branding is Fan Math throughout the mini program', () => {
  const sourceFiles = [
    path.join(miniprogram, 'app.js'),
    path.join(miniprogram, 'sitemap.json'),
    projectConfig,
    ...expectedPages.map((route) => path.join(miniprogram, `${route}.wxml`)),
  ];
  const source = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /小思路/);
  assert.match(source, /梵数学/);
});

test('learner-facing headers render the selected textbook and grade dynamically', () => {
  ['home', 'result', 'growth', 'games'].forEach((page) => {
    const js = fs.readFileSync(path.join(miniprogram, `pages/${page}/${page}.js`), 'utf8');
    const wxml = fs.readFileSync(path.join(miniprogram, `pages/${page}/${page}.wxml`), 'utf8');
    assert.match(js, /learningLabel/, `${page} should calculate a learning label`);
    assert.match(wxml, /\{\{learningLabel\}\}/, `${page} should render a learning label`);
    assert.doesNotMatch(wxml, /人教版\s*·\s*四年级/, `${page} should not hard-code RJB grade four`);
  });
});

test('mine page exposes persisted difficulty, goal, textbook, and grade controls', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.wxml'), 'utf8');

  assert.match(wxml, /bindtap="changeDifficulty"/);
  assert.match(wxml, /bindtap="changeDailyGoal"/);
  assert.match(wxml, /bindchange="selectTextbook"/);
  assert.match(wxml, /bindtap="selectGrade"/);
  assert.match(pageJs, /dailyQuestionIds: \[\]/);
  assert.match(pageJs, /dailySetDate: ''/);
  assert.match(pageJs, /题库建设中/);
});

test('mine page exposes validated local progress backup and restore actions', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.wxml'), 'utf8');
  assert.match(pageJs, /serializeProgressBackup/);
  assert.match(pageJs, /parseProgressBackup/);
  assert.match(pageJs, /wx\.setClipboardData/);
  assert.match(pageJs, /wx\.getClipboardData/);
  assert.match(pageJs, /当前学习记录会替换/);
  assert.match(pageJs, /this\.soundEnabled = progress\.soundEnabled/);
  assert.match(wxml, /bindtap="exportProgress"/);
  assert.match(wxml, /bindtap="importProgress"/);
});

test('mine page gives current learning a meaningful first-viewport card', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.wxml'), 'utf8');
  const css = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.wxss'), 'utf8');
  assert.match(pageJs, /currentLearningTitle/);
  assert.match(pageJs, /currentLearningSummary/);
  assert.match(wxml, /current-learning-card/);
  assert.match(wxml, /\{\{currentLearningTitle\}\}/);
  assert.match(wxml, /\{\{currentLearningSummary\}\}/);
  assert.match(wxml, /练习设置/);
  assert.match(css, /\.mine-hero\s*\{[^}]*min-height:\s*220rpx;/s);
  assert.match(css, /\.current-learning-card\s*\{/);
});

test('child-facing pages use the non-destructive colored rabbit asset', () => {
  const asset = path.join(miniprogram, 'assets/thinking-rabbit-color.png');
  assert.equal(fs.existsSync(asset), true);
  ['pages/intro/intro.wxml', 'pages/home/home.wxml', 'pages/mine/mine.wxml'].forEach((relative) => {
    const source = fs.readFileSync(path.join(miniprogram, relative), 'utf8');
    assert.match(source, /\/assets\/thinking-rabbit-color\.png/);
    assert.doesNotMatch(source, /src="\/assets\/thinking-rabbit\.png"/);
  });
});

test('games page filters the catalogue by grade and routes dynamic game rows', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'pages/games/games.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/games/games.wxml'), 'utf8');
  assert.match(wxml, /wx:for="\{\{games\}\}"/);
  assert.match(wxml, /data-type="\{\{item\.type\}\}"/);
  assert.ok((wxml.match(/bindtap="openGame"/g) || []).length >= 2);
  assert.match(pageJs, /\?type=\$\{type\}/);
  assert.match(pageJs, /getGamesForGrade\(progress\.grade,\s*progress\.schoolStage\)/);
  assert.match(pageJs, /pickDailyGameType/);
  assert.match(pageJs, /navigation_failed/);
});

test('junior games hub routes to a dedicated thinking-mission page', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'pages/games/games.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/games/games.wxml'), 'utf8');
  assert.match(pageJs, /schoolStage === 'junior'/);
  assert.match(pageJs, /\/packages\/junior\/mission\/mission/);
  assert.match(pageJs, /hubTitle/);
  assert.match(wxml, /\{\{hubTitle\}\}/);
  assert.match(wxml, /\{\{hubCopy\}\}/);
});

test('mission page renders independent junior interaction formats and recovery actions', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'packages/junior/mission/mission.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'packages/junior/mission/mission.wxml'), 'utf8');
  assert.match(pageJs, /generateMission/);
  assert.match(pageJs, /evaluateMission/);
  assert.match(pageJs, /startOrResumeRound/);
  assert.match(pageJs, /selectWorkspaceCard\(event\)/);
  assert.match(pageJs, /toggleCoordinateCell\(event\)/);
  assert.match(pageJs, /toggleEvidence\(event\)/);
  assert.match(pageJs, /selectConclusion\(event\)/);
  assert.match(wxml, /format === 'transform'/);
  assert.match(wxml, /format === 'coordinate'/);
  assert.match(wxml, /format === 'proof-chain'/);
  assert.match(wxml, /format === 'data-board'/);
  assert.match(wxml, /bindtap="checkMission"/);
  assert.match(wxml, /bindtap="hint"/);
  assert.match(wxml, /bindtap="retryLoad"/);
});

test('shared game page exposes board, mode, partition, and recovery actions', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'pages/game/game.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/game/game.wxml'), 'utf8');
  assert.match(wxml, /type === 'puzzle'/);
  assert.match(wxml, /mode === 'choice'/);
  assert.match(wxml, /type === 'partition'/);
  assert.match(wxml, /bindtap="resetGame"/);
  assert.match(wxml, /bindtap="hint"/);
  assert.match(wxml, /bindtap="checkAnswer"/);
  assert.match(wxml, /bindtap="nextRound"/);
  assert.match(wxml, /bindtap="retryLoad"/);
  assert.match(wxml, /class="game-actions \{\{complete \? 'complete-actions' : ''\}\}"/);
  assert.match(pageJs, /startOrResumeRound/);
  assert.match(pageJs, /updateActiveRound/);
  assert.match(pageJs, /completeRound/);
  assert.match(pageJs, /getGameMeta/);
  assert.match(pageJs, /String\(this\.data\.selectedAnswer\)/);
  assert.match(pageJs, /activityMessage/);
});

test('shared primary game page renders build, matching, and route modes', () => {
  const pageJs = fs.readFileSync(path.join(miniprogram, 'pages/game/game.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/game/game.wxml'), 'utf8');
  assert.match(wxml, /mode === 'construct'/);
  assert.match(wxml, /mode === 'matching'/);
  assert.match(wxml, /mode === 'route'/);
  assert.match(wxml, /bindtap="selectConstructToken"/);
  assert.match(wxml, /bindtap="selectMatchingCard"/);
  assert.match(wxml, /bindtap="advanceRoute"/);
  assert.match(pageJs, /selectConstructToken\(event\)/);
  assert.match(pageJs, /selectMatchingCard\(event\)/);
  assert.match(pageJs, /advanceRoute\(event\)/);
});

test('game choice buttons center their labels vertically', () => {
  const commonCss = fs.readFileSync(path.join(miniprogram, 'app.wxss'), 'utf8');
  const gameCss = fs.readFileSync(path.join(miniprogram, 'pages/game/game.wxss'), 'utf8');
  assert.match(commonCss, /^button\s*\{[^}]*display:\s*flex;/ms);
  assert.match(commonCss, /^button\s*\{[^}]*align-items:\s*center;/ms);
  assert.match(commonCss, /^button\s*\{[^}]*justify-content:\s*center;/ms);
  assert.match(gameCss, /\.choice-button\s*\{[^}]*min-height:\s*86rpx;/s);
});

test('sound settings, local reminder, and bundled audio are wired to real behavior', () => {
  const mineJs = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.js'), 'utf8');
  const homeJs = fs.readFileSync(path.join(miniprogram, 'pages/home/home.js'), 'utf8');
  const homeWxml = fs.readFileSync(path.join(miniprogram, 'pages/home/home.wxml'), 'utf8');
  const questionJs = fs.readFileSync(path.join(miniprogram, 'pages/question/question.js'), 'utf8');
  const gameJs = fs.readFileSync(path.join(miniprogram, 'pages/game/game.js'), 'utf8');
  const introJs = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.js'), 'utf8');

  assert.match(mineJs, /soundEnabled/);
  assert.match(mineJs, /reminderEnabled/);
  assert.match(mineJs, /store\.save/);
  assert.match(mineJs, /activityMessage\('save_failed'\)/);
  assert.match(homeJs, /shouldShowLearningReminder/);
  assert.match(homeWxml, /wx:if="\{\{showReminder\}\}"/);
  assert.match(questionJs, /createAudioFeedback/);
  assert.match(gameJs, /createAudioFeedback/);
  assert.match(introJs, /createAudioFeedback/);
  ['correct.wav', 'wrong.wav', 'complete.wav'].forEach((filename) => {
    assert.equal(fs.existsSync(path.join(miniprogram, 'assets/audio', filename)), true, filename);
  });
});

test('sound feedback is shared by every learner interaction and starts enabled', () => {
  const settings = fs.readFileSync(path.join(miniprogram, 'utils/learning-settings.js'), 'utf8');
  assert.match(settings, /soundEnabled:\s*true/);
  [
    'pages/question/question.js',
    'pages/test/test.js',
    'pages/intro/intro.js',
    'pages/home/home.js',
    'pages/practice/practice.js',
    'pages/analysis/analysis.js',
    'pages/growth/growth.js',
    'pages/game/game.js',
  ].forEach((relative) => {
    const source = fs.readFileSync(path.join(miniprogram, relative), 'utf8');
    assert.match(source, /createAudioFeedback/, `${relative} should create shared sound feedback`);
  });
  ['tap.wav', 'move.wav', 'streak.wav'].forEach((filename) => {
    assert.equal(fs.existsSync(path.join(miniprogram, 'assets/audio', filename)), true, filename);
  });
  const mission = fs.readFileSync(path.join(miniprogram, 'packages/junior/mission/mission.js'), 'utf8');
  assert.match(mission, /createAudioFeedback/);
  assert.match(mission, /preloadKinds/);
});

test('interactive selection handlers trigger audio before rendering state changes', () => {
  const pages = [
    ['question/question.js', 'chooseOption'],
    ['question/question.js', 'showHint'],
    ['test/test.js', 'chooseOption'],
    ['test/test.js', 'toggleHint'],
    ['practice/practice.js', 'selectTopic'],
    ['practice/practice.js', 'selectType'],
    ['practice/practice.js', 'selectDifficulty'],
    ['practice/practice.js', 'selectGoal'],
    ['home/home.js', 'dismissReminder'],
    ['intro/intro.js', 'selectInitialStage'],
    ['game/game.js', 'moveTile'],
    ['game/game.js', 'selectPattern'],
    ['game/game.js', 'togglePartitionCell'],
    ['../packages/junior/mission/mission.js', 'selectWorkspaceCard'],
    ['../packages/junior/mission/mission.js', 'toggleCoordinateCell'],
    ['../packages/junior/mission/mission.js', 'toggleEvidence'],
    ['../packages/junior/mission/mission.js', 'selectConclusion'],
  ];
  pages.forEach(([relative, handler]) => {
    const source = fs.readFileSync(path.join(miniprogram, 'pages', relative), 'utf8');
    const start = source.indexOf(`${handler}(`);
    const end = source.indexOf('\n  },', start);
    const body = source.slice(start, end);
    const audioIndex = body.indexOf("this.audio.play(") >= 0
      ? body.indexOf("this.audio.play(")
      : body.indexOf('this.playSound(');
    assert.ok(audioIndex >= 0, `${relative}:${handler} should play feedback`);
    assert.ok(audioIndex < body.indexOf('this.setData('), `${relative}:${handler} should play before setData`);
  });
});

test('mine page exposes a separately persisted background music switch', () => {
  const mineJs = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.js'), 'utf8');
  const mineWxml = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.wxml'), 'utf8');
  const settings = fs.readFileSync(path.join(miniprogram, 'utils/learning-settings.js'), 'utf8');
  assert.match(settings, /bgmEnabled:\s*false/);
  assert.match(mineJs, /toggleBgm/);
  assert.match(mineJs, /switchBgmTrack/);
  assert.match(mineWxml, /bindchange="toggleBgm"/);
  assert.match(mineWxml, /bindtap="switchBgmTrack"/);
  const { BGM_TRACKS } = require('../miniprogram/utils/background-music');
  assert.equal(BGM_TRACKS.length, 10);
  BGM_TRACKS.forEach((track) => assert.match(track.source, /^\/assets\/audio\/bgm\/[^/]+\.mp3$/));
});

test('main package and bundled media stay inside true-device limits', () => {
  const listFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });
  const config = JSON.parse(fs.readFileSync(path.join(miniprogram, 'app.json'), 'utf8'));
  const subpackageRoots = (config.subpackages || []).map((item) => path.join(miniprogram, item.root));
  const files = listFiles(miniprogram).filter((file) => !subpackageRoots.some((root) => file.startsWith(`${root}${path.sep}`)));
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const mediaBytes = files
    .filter((file) => /\.(png|jpe?g|gif|webp|wav|mp3|aac|m4a)$/i.test(file))
    .reduce((sum, file) => sum + fs.statSync(file).size, 0);

  assert.ok(totalBytes < 1.75 * 1024 * 1024, `main package is ${totalBytes} bytes`);
  assert.ok(mediaBytes < 1.3 * 1024 * 1024, `main package media is ${mediaBytes} bytes`);
});

test('junior-only mission generation stays in the junior subpackage', () => {
  const missionEngine = path.join(miniprogram, 'packages', 'junior', 'mission-engine.js');
  const missionPage = fs.readFileSync(path.join(miniprogram, 'packages', 'junior', 'mission', 'mission.js'), 'utf8');
  assert.ok(fs.existsSync(missionEngine));
  assert.match(missionPage, /require\('\.\.\/mission-engine'\)/);
});

test('licensed compact BGM files live in the main package for true-device playback', () => {
  const config = JSON.parse(fs.readFileSync(path.join(miniprogram, 'app.json'), 'utf8'));
  assert.equal((config.subpackages || []).some((item) => item.root.startsWith('music/')), false);
  const musicDirectory = path.join(miniprogram, 'assets/audio/bgm');
  const files = fs.readdirSync(musicDirectory).filter((file) => file.endsWith('.mp3'));
  assert.deepEqual(files.sort(), [
    'bach-cello-prelude.mp3',
    'bach-minuet.mp3',
    'bach-prelude-c-major.mp3',
    'beethoven-eroica-scherzo.mp3',
    'beethoven-pathetique.mp3',
    'fur-elise.mp3',
    'mozart-sonata-14.mp3',
    'ode-to-joy.mp3',
    'tchaikovsky-piano-concerto.mp3',
    'turkish-march.mp3',
  ]);
  files.forEach((file) => {
    const music = path.join(musicDirectory, file);
    assert.ok(fs.statSync(music).size < 180 * 1024, `${file} is too large for the main package`);
  });
});

test('navigation and settings use dedicated feedback roles', () => {
  ['pages/home/home.js', 'pages/games/games.js', 'pages/growth/growth.js', 'pages/mine/mine.js'].forEach((relative) => {
    const source = fs.readFileSync(path.join(miniprogram, relative), 'utf8');
    assert.match(source, /createAudioFeedback/, `${relative} should prepare interaction audio`);
    assert.match(source, /audio\.play\('navigate'\)/, `${relative} should use navigation feedback`);
  });
  const mine = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.js'), 'utf8');
  assert.match(mine, /audio\.play\('setting'\)/);
});

test('route progress flexes to the number of steps instead of reserving four fixed tracks', () => {
  const css = fs.readFileSync(path.join(miniprogram, 'pages/game/game.wxss'), 'utf8');
  assert.match(css, /\.route-progress\s*\{[^}]*display:\s*flex;/s);
  assert.match(css, /\.route-dot\s*\{[^}]*flex:\s*1;/s);
  assert.doesNotMatch(css, /\.route-progress\s*\{[^}]*grid-template-columns:\s*repeat\(4,/s);
});

test('pages release prepared audio pools when hidden or unloaded', () => {
  [
    'home/home.js',
    'games/games.js',
    'growth/growth.js',
    'mine/mine.js',
    'practice/practice.js',
    'analysis/analysis.js',
    'question/question.js',
    'test/test.js',
    'intro/intro.js',
    'game/game.js',
    '../packages/junior/mission/mission.js',
  ].forEach((relative) => {
    const source = fs.readFileSync(path.join(miniprogram, 'pages', relative), 'utf8');
    assert.match(source, /disposeAudio\(\)/, `${relative} should define audio cleanup`);
    assert.match(source, /this\.audio\.destroy\(\)/, `${relative} should destroy audio contexts`);
    assert.match(source, /onUnload\(\)/, `${relative} should clean up on unload`);
  });
});

test('every learning activity has child-facing load, save, or navigation failure feedback', () => {
  [
    'pages/intro/intro.js',
    'pages/test/test.js',
    'pages/result/result.js',
    'pages/home/home.js',
    'pages/question/question.js',
    'pages/analysis/analysis.js',
    'pages/games/games.js',
    'pages/game/game.js',
    'packages/junior/mission/mission.js',
    'pages/growth/growth.js',
    'pages/mine/mine.js',
  ].forEach((relative) => {
    const source = fs.readFileSync(path.join(miniprogram, relative), 'utf8');
    assert.match(source, /activityMessage/, `${relative} should use child-facing activity errors`);
  });
  const diagnostic = fs.readFileSync(path.join(miniprogram, 'pages/test/test.js'), 'utf8');
  assert.match(diagnostic, /save_failed/);
  assert.match(diagnostic, /navigation_failed/);
});

test('all question-consuming pages resolve the active progress scope dynamically', () => {
  [
    'home/home.js',
    'test/test.js',
    'question/question.js',
    'practice/practice.js',
    'growth/growth.js',
    'analysis/analysis.js',
    'result/result.js',
  ].forEach((relative) => {
    const source = fs.readFileSync(path.join(miniprogram, 'pages', relative), 'utf8');
    assert.match(source, /getQuestionBank/, `${relative} should import the scoped bank selector`);
    assert.match(source, /getQuestionBank\(progress\)/, `${relative} should resolve the current progress scope`);
    assert.doesNotMatch(
      source,
      /const\s*\{[^}]*\b(?:diagnosticQuestions|practiceQuestions)\b[^}]*\}\s*=\s*require\(['"]\.\.\/\.\.\/utils\/question-bank['"]\)/s,
      `${relative} should not import the primary static arrays`,
    );
  });
});

test('mistake analysis resolves historical questions from the recorded scope first', () => {
  const source = fs.readFileSync(path.join(miniprogram, 'pages/analysis/analysis.js'), 'utf8');
  assert.match(source, /record\.schoolStage/);
  assert.match(source, /record\.textbookId/);
  assert.match(source, /record\.grade/);
  assert.match(source, /getQuestionBank\(mistakeScope\)/);
});

test('intro requires a school stage before showing its matching initial grades', () => {
  const source = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.wxml'), 'utf8');
  assert.match(source, /schoolStageOptions/);
  assert.match(source, /getGradeOptions/);
  assert.match(source, /selectInitialStage/);
  assert.match(source, /confirmInitialLearningLevel/);
  assert.match(wxml, /bindtap="selectInitialStage"/);
  assert.match(wxml, /wx:if="\{\{selectedSchoolStage\}\}"/);
  assert.ok(wxml.indexOf('selectInitialStage') < wxml.indexOf('selectInitialGrade'));
});

test('intro presents distinct primary and junior learning-stage cards', () => {
  const source = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.wxml'), 'utf8');
  const css = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.wxss'), 'utf8');
  assert.match(source, /stageCards/);
  assert.match(source, /成长岛闯关/);
  assert.match(source, /思维实验室/);
  assert.match(wxml, /stage-card/);
  assert.match(wxml, /\{\{item\.title\}\}/);
  assert.match(wxml, /data-stage="\{\{item\.value\}\}"/);
  assert.match(wxml, /wx:if="\{\{selectedSchoolStage\}\}"/);
  assert.match(css, /\.stage-card\.selected/);
});

test('intro grade choices meet the touch target and muted-text contrast baseline', () => {
  const css = fs.readFileSync(path.join(miniprogram, 'pages/intro/intro.wxss'), 'utf8');
  assert.match(css, /\.grade-button\s*\{[^}]*min-height:\s*104rpx/s);
  assert.match(css, /\.grade-picker-copy\s*\{[^}]*color:\s*#657168/s);
});

test('mine renders stage-aware grade and textbook controls', () => {
  const source = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(miniprogram, 'pages/mine/mine.wxml'), 'utf8');
  assert.match(source, /schoolStageOptions/);
  assert.match(source, /getGradeOptions\(progress\.schoolStage\)/);
  assert.match(source, /getTextbookOptions\(progress\.schoolStage\)/);
  assert.match(source, /store\.changeSchoolStage\(progress, schoolStage\)/);
  assert.match(source, /getLearningMap\(progress\.textbookId, progress\.grade, progress\.schoolStage, progress\.learningTerm\)/);
  assert.match(wxml, /bindtap="changeSchoolStage"/);
  assert.match(wxml, /wx:for="\{\{schoolStageOptions\}\}"/);
});

test('runtime modules avoid unsupported collection convenience APIs', () => {
  const listJavaScript = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listJavaScript(target) : entry.name.endsWith('.js') ? [target] : [];
  });
  listJavaScript(miniprogram).forEach((file) => {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /Object\.fromEntries|\.flatMap\(|\.matchAll\(|\.at\(-1\)/, path.relative(miniprogram, file));
  });
});
