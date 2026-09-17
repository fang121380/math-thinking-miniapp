# Fan Math Brand, Settings, And Diagnostic Bank Design

## Goal

Turn the current fourth-grade preview into a configurable "梵数学" learning app with selectable difficulty and daily goals, varied diagnostic attempts, a reviewable versioned question bank, and a colored rabbit mascot.

## Brand And Visual Direction

- Replace every visible "小思路" label with "梵数学".
- Preserve the current quiet green/coral interface and compact settings layout.
- Replace the monochrome rabbit with a soft colored children's illustration that preserves its pose and transparent background.
- Keep the existing safe-area behavior on all phone screens.

## Learning Settings

- Difficulty modes: `easy`, `medium`, `hard`, shown as `简易`, `适中`, `困难`.
- Daily goals: 3, 5, or 10 questions.
- Textbook selector: People's Education Press (`rjb`) is the active edition.
- Grade selector shows grades 1-6. Grade 4 is enabled; other grades are visibly marked as under construction and cannot silently serve grade-4 content.
- Changing difficulty or daily goal invalidates the saved daily set and regenerates it on the next visit to Today.

## Difficulty Rules

- Easy prefers difficulty 1 questions.
- Medium prefers difficulty 1-2 questions.
- Hard prefers difficulty 2-4 questions.
- Weak knowledge points remain the first ranking signal inside the selected difficulty range.
- Fallback selection may broaden the range only when a requested type has no eligible question.

## Daily Goal Rules

- Every set of at least 3 questions includes choice, fill, and application formats.
- Additional questions are selected without duplicate IDs, prioritizing unseen and weak-point questions.
- Same learner/date/settings reuse the saved set; changed date or settings generate a new set.
- Progress and completion UI use the selected goal rather than a hard-coded total of 3.

## Diagnostic Rules

- Keep eight diagnostic slots so results remain comparable: division estimate, multiplication estimate, visual geometry, number pattern, exact division, average, two-step problem, and decimal-money problem.
- Each slot contains equivalent original variants tagged by difficulty.
- One attempt selects one variant per slot using learner ID, attempt number, and selected difficulty.
- Leaving an unfinished attempt preserves its questions. Starting a new attempt after completion increments the attempt number and generates another equivalent set.

## Question Bank Organization

- Keep the first release local and original; do not import an unverified free third-party bank.
- Add a manifest with bank version, update date, edition, enabled grades, and content provenance.
- Add a human-readable catalog documenting counts by diagnostic/practice, type, knowledge point, and difficulty.
- Preserve a future boundary for a reviewed remote content package without adding network or cloud dependencies now.

## Data And Privacy

- Store settings, learner key, diagnostic attempt state, and progress locally.
- Do not collect names, phone numbers, school information, or other student personal data.
- Do not add AppSecret or cloud credentials to frontend code.

## Acceptance

- Settings persist after page navigation and app restart.
- Difficulty materially changes eligible questions.
- Daily goal changes the generated set and progress total to 3, 5, or 10.
- Two completed diagnostic attempts have different IDs while preserving the same eight assessment slots.
- All visible branding says "梵数学".
- Colored rabbit renders with transparent edges and no watermark.
- Automated tests and WeChat DevTools preview pass on a cutout phone simulator.
