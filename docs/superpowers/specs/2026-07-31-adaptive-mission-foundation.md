# Adaptive Mission Foundation

## Goal

Make each learner receive a short daily math mission that mixes weak-point practice, scheduled review, current learning, and one reasoning-style question. The learner should see progress without pressure to preserve an unbroken streak.

## Scope

This batch changes the local learning engine and existing daily-practice screens only. It does not add networking, personal-data collection, leaderboards, paid rewards, social features, a new map page, or changes to the published question wording.

## Learner State

`knowledgeState[knowledgePoint]` is local-only and contains:

- `mastery`: integer from 0 to 100, starting at 50.
- `reviewStage`: integer from 0 to 4.
- `nextReviewDate`: `YYYY-MM-DD` or an empty string.
- `lastPracticedDate`: `YYYY-MM-DD` or an empty string.

An independent correct answer adds 15 mastery points and advances review stages through 1, 3, 7, and 14 day intervals. A correct answer after a hint adds 7 points and schedules a one-day review. A wrong answer subtracts 18 points, resets review stage to zero, and schedules a one-day review. Values are clamped to 0 through 100.

## Daily Mission

Daily goals remain selectable as 3, 5, or 10 questions. The five-question mission targets this order when matching unseen questions exist:

1. a due review;
2. a weak knowledge point;
3. current curriculum practice;
4. a second due or weak item using a different type;
5. a reasoning-style item using a different question pattern.

Three- and ten-question missions retain every existing question type. Selection never mixes textbook editions or grades, prefers unseen questions, respects the selected difficulty while candidates exist, and cannot repeat an ID in one mission.

## Feedback And Measurement

Every submitted answer updates one knowledge state record. The app writes only compact local events: date, answered count, correct count, hint count, and completed-mission flag. No network request, identity data, advertising, global comparison, or external analytics is added in this batch.

The home screen names the next mission focus using short child-facing text: review, strengthen, explore, or challenge. It never displays a failure streak or a punitive missed-day state.

## Acceptance

- New state normalizes safely when absent or corrupt.
- Correct, hinted-correct, and wrong answers create the documented review schedules.
- A due review takes priority in a five-question daily mission when a matching unused question exists.
- Daily missions preserve edition, grade, type coverage, uniqueness, and saved same-day order.
- Existing daily, self-practice, mistake, and game tests remain green.
