# Grade Game Expansion Design

## Goal

Replace the current three-game experience with a grade-aware set of short mathematics and logic games. Each round must work offline, react immediately to touch, avoid recently completed challenges, and remain understandable to primary-school learners.

## Scope

The games page shows one recommendation plus the games available to the learner's selected grade. A learner can enter any available game and play a generated round lasting about one to three minutes. Existing stars, game history, sound preference, retry states, and safe-area layout remain intact.

## Grade Catalogue

Grades 1-2 receive Number Chain, Calculation Match, Shape Hunt, Change Maker, and Order Maze. Grades 3-4 receive Number Puzzle, Pattern Detective, Shape Partition, Target Number, and Calculation Sprint. Grades 5-6 receive Fraction Match, Unit Station, Ratio Reasoning, Logic Seats, and Math Cipher.

The catalogue is data-driven. Each game definition declares its grade range, name, icon, generator, interaction mode, and learning tags. The page selects only matching definitions, so future games can be added without rewriting navigation or progress storage.

## Round Generation And Progress

Each game generator accepts difficulty, seeded random input, and recent challenge signatures. It returns a solvable challenge with a unique signature, clear instruction, answer, explanation, and any needed choices or board data. Generators retry to avoid the latest ten completed signatures for that game.

Difficulty starts at easy, becomes medium after three completions, and hard after seven completions. It is tracked independently for each game. An unfinished round resumes after leaving the page. A completed round awards one star only once, then clears its active state and records its signature.

## Interaction

The game screen has one compact header, the challenge area, a short feedback band, and at most three actions. Every tappable board item uses immediate local state updates before persistence. Valid interactions play a short confirmation sound; invalid interactions explain the next action without blocking the learner. Retry, hint, next round, load failure, invalid selection, and save failure are supported for every interaction mode.

Existing puzzle, pattern, and partition rules are retained but corrected and simplified. The puzzle only accepts legal adjacent moves; pattern selection is visibly selected before checking; partition feedback says whether count or connectedness needs adjustment. New games use selection, ordering, matching, or input-free arithmetic interactions suitable for touch screens.

## Audio

Audio feedback is shared by the entire mini program, including daily questions, self practice, diagnostic tests, games, navigation actions, reminders, and learning completion. It provides separate bundled clips for tap, valid move, correct answer, wrong answer, completion, and streak/milestone. Clips are short and distinct: tap is light, valid is a rising tick, correct is a bright two-note confirmation, wrong is a low short tone, complete is a longer fanfare, and milestone is a higher three-note chime.

The helper creates a fresh context per event and does not destroy a just-started sound when rapid taps occur. It respects the existing sound setting, recovers from loading or decoding errors without crashing the game, and warns once only when enabled sound cannot be played.

## UI

The games page uses a simple single-column list with small icons, short descriptions, grade-appropriate labels, completion counts, and a recommended entry. The individual game page removes decorative content and keeps fixed board sizes, clear selected states, pressed states, and readable status text. Layout uses the current safe-area top inset and responsive grid constraints so it remains usable on compact phones.

## Verification

Automated tests cover every generator for reproducibility, valid answers, variation, recent-signature exclusion, difficulty progression, per-game persistence, and one-time rewards. Audio tests cover all sound roles, disabled sound, rapid playback, synchronous failures, and asynchronous failures. Page contract tests verify grade filtering, each interaction mode, and audio calls in every learning flow.

Manual WeChat DevTools testing covers grades 1, 4, and 6; each game type; a correct completion; an incorrect action; hint; reset; leave-and-resume; sound enabled and disabled; and a compact simulator safe area.
