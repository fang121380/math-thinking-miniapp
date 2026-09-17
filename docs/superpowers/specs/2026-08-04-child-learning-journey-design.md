# Child Learning Journey Design

## Goal

Turn Fan Math from a set of exercises into a short child-facing learning loop: choose a path, solve a task, recover from a mistake in small steps, and see meaningful progress. The product should help a learner feel capable without hiding weak areas or relying on rankings, streak pressure, virtual currency, or social competition.

## Product Position

`每天 5 分钟，找到适合自己的数学思路。`

The primary learner is a child in grades 1 through 6. Parents may later see outcomes, but this release optimizes the child experience first. It keeps the current textbook, grade, difficulty, self-practice, mistake review, and weekly-goal systems.

## Scope

This release modifies existing home, question, analysis, growth, games, storage, and learning-selection flows. It does not add a new page, public leaderboard, chat, payment, account login, cloud synchronization, actual push notifications, or remote analytics.

## 1. Daily Path Choice

The home page presents two short, child-readable starting routes before the first unfinished task:

- `复习一下`: prioritizes due reviews and weak knowledge points.
- `挑战一下`: prioritizes current-grade reasoning patterns at the selected difficulty, while still preserving all selected question types.

Rules:

- The selected path is saved for the current day and does not change on revisiting the home page.
- A day, textbook, grade, or difficulty change clears the saved path and generates a fresh set.
- All daily sets retain current safeguards: selected textbook and grade only, unique IDs, type coverage, unseen-first selection, and user-selected goals of 3, 5, or 10 questions.
- Challenge mode must not silently exceed the learner's selected difficulty. It changes question form and topic mix, not the configured difficulty ceiling.

## 2. Mistake Recovery Chain

An incorrect daily or self-practice answer keeps its existing mistake record, then opens a compact recovery sequence in the analysis page:

1. `看懂这一步`: the existing cause and solution remain visible.
2. `小台阶题`: one easier, same-knowledge-point item. If no easier unused item exists, use a different-form item at the original difficulty.
3. `同类再试`: one unused item at the original difficulty and knowledge point, preferring a different `examPattern` from the original and bridge item.
4. `补会了`: after both recovery questions are correct, return to the next scheduled daily question or the self-practice list.

Rules:

- Recovery questions never replace a scheduled daily question and never award a daily-completion star.
- A correct recovery answer updates existing mastery state; an incorrect recovery answer keeps the learner on the explanation path and offers a retry without a technical error.
- If two safe variants cannot be found, the page retains the existing analysis and retry behavior rather than showing a blank state.
- Original mistakes remain visible until the learner later completes a normal same-topic retry correctly. A short recovery is evidence of progress, not automatic mistake deletion.

## 3. Thought Journey

The existing colored rabbit becomes a compact progress signal on the home and growth pages. It has four non-competitive routes:

- `计算思路`
- `图形观察`
- `规律发现`
- `解决问题`

Journey progress is derived from the existing ability and knowledge-mastery state; no separate points currency is stored. A route has three child-facing states:

- `认识了`
- `会用了`
- `正在变强`

Each route is based on the relevant ability score plus the count of knowledge points whose mastery is at least 65. The UI shows the next attainable route, not a missed-day warning. The growth page summarizes one statement such as `这周，你把“规律发现”练得更熟了`.

## 4. Game-Led Practice

Each game receives a lightweight focus label from the existing four ability domains. Game recommendation scores available games against current weak abilities and rotates ties by learner and day.

Rules:

- A game remains optional and keeps its current 1-3 minute format.
- Completing a game contributes to the related thought-route display, but does not directly increase textbook knowledge mastery or replace daily questions.
- A child returning from a game sees a relevant next learning route instead of an unrelated random recommendation.

## 5. Age Adaptation

The logic is common across grades; wording and density adapt by grade band:

- Grades 1-2: default three-question mission, short copy, visual route emphasized.
- Grades 3-4: balance review, reasoning, and immediate recovery.
- Grades 5-6: include more challenge-mode reasoning and multi-step verification.

This release does not add text-to-speech or a separate visual-manipulation engine. Those are future grade 1-2 accessibility work.

## Local Data

Add only compact local fields:

- `dailyMissionMode`: `review` or `challenge` for the saved day.
- `recoveryState`: active original ID, bridge ID, remix ID, stage, and return context.
- `gameJourneyCounts`: completion counts by ability domain, used only for journey display.

The app continues to store learning data only on device. Changing textbook or grade clears active daily and recovery state. Corrupt or missing state falls back safely.

## Error Handling

- No suitable recovery variant: show normal analysis and the existing retry action.
- Saved recovery question is unavailable after a content update: clear recovery state, show a child-facing message, and return safely to the next activity.
- Bad game metadata or unavailable game: retain the current random valid recommendation and show existing navigation feedback on failure.

## Testing

- Review and challenge paths are stable per learner/day and obey textbook, grade, type, difficulty, and non-repetition rules.
- Recovery selection returns safe bridge/remix variants with no duplicate IDs; fallback behavior is explicit.
- Recovery answers update mastery but do not alter daily completion or award a daily star.
- Journey status is deterministic from normalized progress and handles empty/corrupt state.
- Weak abilities influence game recommendation without making a game mandatory.
- Existing daily set, self-practice, mistake, audio, game, package-size, and project-structure tests remain green.

## Success Criteria

- A new learner can enter a first task in one tap after onboarding.
- A wrong answer offers a next action in one tap and never leaves a child at a dead end.
- A child can name one current strength and one next path from the growth page.
- The feature works offline, contains no social comparison, and does not expand the main package beyond the current true-device limit.
