# Adaptive Question Bank And Safe Area Design

## Goal

Make practice questions vary across learners and sessions while continuing to target weak knowledge points. Keep all content local and original for this preview. Ensure every custom-navigation page clears phone status bars, camera cutouts, and home indicators.

## Scope

- Replace first-match selection with seeded, learner-specific selection.
- Track a local learner key, seen question IDs, daily set date, and bank version.
- Expand the local practice bank with original variants for every supported knowledge point and each required question type.
- Preserve choice, fill, and application questions in every daily set.
- Prefer weak knowledge points, then level-appropriate questions, then unseen variants.
- Reset only the daily progress at the start of a new day; preserve learning history and mistakes.
- Add a content-bank version so a later app update can introduce new variants without clearing student progress.
- Add top safe-area padding to `.page.no-nav` so custom headers clear status bars and camera cutouts.

## Non-Goals

- No cloud database, remote question downloads, account login, or collection of personal student information.
- No copied commercial question-bank content.
- No automatic server-side content updates. Those require a reviewed content service in a later phase.

## Selection Flow

1. On first launch, create and persist a random local learner key.
2. Build a daily seed from the learner key, current date, and content-bank version.
3. For choice, fill, and application types, rank candidates by weak knowledge point, level, and whether the learner has seen them.
4. Seeded-shuffle the best candidate group, so the selection is stable for one learner on one day but differs across learners and future days.
5. Save the chosen IDs for that day and append completed IDs to history after submission.
6. When the current bank is exhausted, allow old variants back in only after preferring all unseen variants.

## Safety Area

All pages that use the custom `.page-head` header receive top padding of `env(safe-area-inset-top)` plus a base visual gutter. Regular tab pages retain their existing safe-area behavior. Bottom navigation remains safe-area aware.

## Validation

- Unit tests prove different learner keys produce different valid daily sets.
- Unit tests prove repeated selection avoids seen IDs while alternatives exist.
- Unit tests prove the same learner and date get a stable daily set.
- Unit tests prove all daily sets still contain choice, fill, and application questions.
- Static test asserts no-navigation pages use the shared safe-area class.
- DevTools visual check on an iPhone cutout simulator confirms custom headers begin below the system status area.
