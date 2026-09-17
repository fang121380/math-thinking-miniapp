# Multi-Edition Textbook Design

## Goal

Let a learner choose a commonly used primary-school mathematics textbook edition and receive matching unit information, original curriculum-aligned questions, learning cards, and mistake analysis. The Mine page must make the selected textbook meaningful rather than displaying an empty "learning content" heading.

## Editions

The first release supports eight editions: People's Education Press (`rjb`), Beijing Normal University Press (`bsd`), Jiangsu Education Press (`suj`), Qingdao Press (`qd`), Shanghai Education Press (`sh`), Southwest Normal University Press (`xsb`), Hebei Education Press (`hebei`), and Hunan Education Press (`xiang`). The default remains `rjb` for the Qufu learner profile.

Each edition covers grades 1 through 6. It has a grade-and-term unit catalogue with a visible unit title, concept list, short learning card, and original question set. Content is authored for the curriculum concept and edition unit sequence; no scanned textbook pages, copyrighted exercise books, or copied test papers are included.

## Data Model

`textbook-catalog.js` owns edition metadata and the 48 edition/grade learning maps. A map entry declares the active term, current unit, unit label, knowledge-point labels, and a concise learning-card summary.

Every question has `textbookId`, `editionUnitKey`, and the existing grade, knowledge point, question type, answer, solution, and common-mistake metadata. Existing RJB records are explicitly marked `rjb`. New edition records use distinct IDs and prompts even where the underlying concept is shared.

The published question bank exports edition-aware diagnostic and practice collections. Selection functions always filter by `progress.textbookId` and `progress.grade`; no cross-edition fallback is permitted. If a stored legacy question lacks an edition, it is treated as `rjb` for migration compatibility.

## Learner Flow

The Mine page retains the textbook picker but displays eight choices. Directly below the learning goal, the previous empty "learning content" section becomes a compact current-learning card: edition, grade, term, current unit, knowledge-point count, and unit summary. The large hero no longer pushes this information below the first viewport.

Selecting a new textbook clears only the unfinished daily and self-practice sets, then regenerates matching edition questions. Completed question history and stars remain. Mistakes carry their textbook ID and edition unit so their analysis can state the source edition; the Growth page shows only the selected edition's mistakes by default.

Daily learning, diagnostic selection, self practice, retry questions, and question analysis all consume the same edition-aware bank. The Games area remains grade-aware only because its questions train general mathematical thinking rather than textbook order.

## Error Handling

Invalid, unavailable, or legacy textbook IDs normalize to `rjb`. A missing content mapping produces a child-facing recovery message and does not silently serve another edition's question. Changing edition never loses learner identity, stars, sound settings, or prior mistake records.

## Testing

Tests verify all eight editions appear in settings; every edition has all six grades mapped; each edition/grade has original choice, fill, and problem questions with explanations; selection never mixes textbook IDs; changing editions resets only active question sets; current-learning card data matches the selected edition; and legacy RJB progress normalizes correctly.

Visual checks verify the Mine first viewport presents the current-learning card below the daily goal without an empty heading or overlap on a compact phone simulator.
