# Weekly Rhythm And Milestones

## Goal

Give a primary-school learner a small, visible reason to return without making missed days feel like failure. The existing growth page should answer: what has changed this week, what can I do next, and what learning behavior is worth celebrating?

## Scope

- Keep the existing growth page and add no new navigation level.
- Calculate a local weekly mission from completed learning dates.
- Show up to three earned thinking badges and one attainable next badge.
- Keep all calculation on-device. Do not add ranking, social comparison, network analytics, push notifications, virtual currency, or paid rewards.

## Weekly Mission

- A week starts on Monday and uses the local date supplied to the pure helper.
- The mission is complete after learning on 3 different days in the current week.
- The display is `已完成 X / 3 天`; future dates and dates outside the week do not count.
- Copy is encouraging: no missed-day warning and no claim that the learner failed a streak.

## Milestones

The system derives badges from existing local progress. It displays earned badges first, then the closest unearned one.

- `开始思考`: complete 3 questions.
- `稳定练习`: complete practice on 3 different dates.
- `复习达人`: independently advance any knowledge point to review stage 2.
- `思路收集者`: earn 3 daily-mission stars.

Badge rows contain a concise title and child-facing description. They never imply that a learner is behind another learner.

## Acceptance

- Week boundaries, duplicates, future dates, and old dates produce correct weekly progress.
- Badge eligibility is deterministic and safely handles missing or corrupt progress fields.
- The growth page renders mission copy and badge data using the existing safe-area and error handling patterns.
- No mini-program source or media exceeds the existing true-device package limits.
