# Learning Retention Foundation Design

## Goal

Give a primary-school learner a fresh, meaningful reason to return without using rankings, streak pressure, chat, payment, or cloud accounts. The first retention release turns existing daily practice, mistake recovery, and content-versioning systems into three visible loops: a daily theme, an earned recovery record, and a one-time notice when new reviewed content ships.

## Product Principle

The child should be able to answer three questions at a glance:

1. What is interesting about today's short task?
2. What can I do when I make a mistake?
3. What progress did I make by coming back?

The app already has textbook/grade-specific question selection, review and challenge modes, five-question entry diagnostics, local mastery, weekly goals, milestones, and a two-step recovery flow. This release connects those existing capabilities rather than adding a separate reward currency or another page.

## Scope

### Daily theme

Add a deterministic seven-day theme rotation, based on local date. Each theme has a short child-facing title, a one-sentence invitation, a focus ability, and an accent label. The rotation is shared by all grades, but selected questions remain strictly limited to the learner's chosen textbook, grade, difficulty, daily goal, type coverage, and unseen-first rules.

The daily selector should prefer one eligible question in the theme ability when doing so does not displace a due review or the challenge-mode thinking question. A missing theme candidate must fall back to the existing selection logic. The saved daily IDs remain stable for the day.

### Recovery record

Keep the existing explanation -> small-step -> same-kind retry chain. Persist one compact `recoveryWins` total when a learner correctly completes the final recovery step. Do not award an extra daily star, change daily completion, erase the original mistake, or count a partial recovery as a win.

The growth page should show this number as positive evidence that mistakes can be repaired. It must not frame errors as failure or show a leaderboard.

### Content-release notice

Use the existing local question-bank manifest as the release source. Add child-readable release notes to the bundled manifest and persist the last acknowledged content version. On a version the learner has not acknowledged, Home shows one dismissible notice. Dismissing it saves the current version. No network request, update endpoint, or remote loading is required; the existing offline fallback remains unchanged.

## Data and Error Handling

- New local fields: `recoveryWins` (non-negative integer) and `seenContentVersion` (string).
- Missing or malformed values normalize to safe defaults.
- A future question bank with no release notes simply does not show the notice.
- A theme with no valid question in the selected pool uses existing daily-selection fallback and never returns a blank task.
- Existing histories, stars, mistakes, settings, selected textbook, grade, and diagnostic records remain intact.

## UX Boundaries

- No new page or bottom navigation item.
- Home uses one compact theme line and one optional update notice; it must remain readable on small screens and preserve the safe-area layout.
- Growth uses one compact recovery stat alongside its existing weekly mission and milestone rows.
- Copy is specific and encouraging, not manipulative: no missed-day warning, countdown, ranking, or “limited-time” pressure.

## Testing

- Theme rotation is deterministic, validates dates, and exposes seven distinct child-facing themes.
- Daily selection keeps type coverage, selected textbook/grade/difficulty, no duplicate IDs, and due-review/challenge guarantees while selecting a theme-ability question whenever an eligible slot exists.
- Storage repairs invalid recovery and content-notice fields.
- A final correct recovery increments exactly once; wrong or bridge-stage answers do not increment it.
- Content notice appears only for a newer unseen local content version and persists dismissal.
- Project structure, package-size, existing adaptive, question-bank, audio, game, and storage tests remain green.

## Delivery Sequence

1. Pure daily-theme selection and storage validation.
2. Question-page recovery-win persistence.
3. Home and growth presentation, including accessibility labels and failure feedback.
4. Full Node regression suite and local DevTools compile check. No preview upload or publish action is part of this work.
