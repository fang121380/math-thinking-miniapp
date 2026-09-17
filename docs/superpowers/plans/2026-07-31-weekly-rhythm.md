# Weekly Rhythm And Milestones Implementation Plan

**Goal:** Turn existing local progress into a calm weekly return loop on the growth page.

**Architecture:** A new pure `learning-milestones.js` utility derives current-week progress and badge rows from normalized progress. `growth.js` maps those values into its view model; `growth.wxml` renders one weekly target and compact badge rows.

## Tasks

1. Write failing unit tests for weekly date boundaries, duplicate dates, and badge thresholds.
2. Implement the pure milestone utility with no wx dependency.
3. Write a failing structure test for the growth-page integration.
4. Render the weekly mission and up to three earned/next badge rows with a small progress track.
5. Run `npm test` and package-size checks.
