# Question Bank Expansion Design

## Goal

Bring the local Grade 4 People's Education Press question bank to a release-ready baseline without using unreviewed third-party content. Keep all student progress local and retain the existing diagnostic, daily practice, mistake analysis, and game flows.

## Scope

- Keep the eight diagnostic slots and their comparable result model.
- Expand daily-practice content from 24 questions to at least 80 original questions.
- Remove duplicate prompts between diagnostic and daily-practice pools.
- Ensure every covered knowledge point has at least four daily-practice variants.
- Balance upper and lower semester coverage and include number sense, geometry, calculation, data, and problem-solving topics.
- Keep choice, fill, and application questions in every daily set of three or more questions.
- Retry a mistake with a different same-topic, same-type variant whenever one exists.

## Content Model

Questions remain local JavaScript data. Each item has an ID, grade, term, unit, knowledge point, ability, type, difficulty, prompt, answer, hint, solution, and common mistakes.

The bank is organized by Grade 4 textbook units rather than one growing undifferentiated list. Release `2026.07.16.1` contains 32 diagnostic questions and 84 daily-practice questions. The bank manifest is the single published content version. Any content update changes the manifest version and update date, which regenerates the learner's unfinished daily set safely while preserving completed history and mistakes.

## Daily Selection

1. Select the requested number of unique question IDs.
2. Preserve choice, fill, and application coverage for every set of at least three questions.
3. Prioritize weak knowledge points and unseen variants.
4. Use at least four knowledge points in a ten-question set when alternatives exist.
5. Limit one knowledge point to two questions per ten-question set when alternatives exist.
6. Do not use any prompt that also appears in the diagnostic pool.

## Mistake Retry

The retry selector excludes the original question ID first. It chooses an unseen matching knowledge-point and type variant, then falls back to another matching variant only when the pool is exhausted.

## Future Content Updates

For every new content release:

1. Add reviewed original questions to the appropriate unit group.
2. Add each item's answer, hint, solution steps, difficulty, and two likely mistakes.
3. Increase `question-bank-manifest.version` and update its date and catalog counts.
4. Run content tests for required fields, unique IDs, unique prompts, type coverage, answer validity, and minimum variants per knowledge point.
5. Run the full test suite and verify a new daily set plus a mistake retry in WeChat DevTools.

This creates a controlled local content release process. A future reviewed remote content pack may use the same schema, but no external question source, account, or network dependency is added in this release.

## Testing

- Content tests fail on duplicate prompts, missing metadata, bad answer/option pairs, and weak knowledge-point coverage.
- Selection tests prove daily-set variety, balanced question types, and topic caps.
- Retry tests prove a wrong answer does not immediately repeat the original question when a sibling variant exists.
- Existing storage and adaptive-selection tests continue to pass.
