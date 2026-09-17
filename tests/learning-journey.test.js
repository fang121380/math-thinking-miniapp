const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildLearningJourney,
  getJourneyFocus,
} = require('../miniprogram/utils/learning-journey');

const questions = [
  { id: 'calc-1', knowledgePoint: 'multiplication', ability: 'calculation' },
  { id: 'calc-2', knowledgePoint: 'division', ability: 'calculation' },
  { id: 'shape-1', knowledgePoint: 'perimeter', ability: 'geometry' },
  { id: 'pattern-1', knowledgePoint: 'sequence', ability: 'pattern' },
  { id: 'problem-1', knowledgePoint: 'two-step', ability: 'problem' },
];

test('learning journey turns local ability and mastery into positive child-facing states', () => {
  const rows = buildLearningJourney({
    abilities: { calculation: 82, geometry: 58, pattern: 72, problem: 74 },
    knowledgeState: {
      multiplication: { mastery: 71 },
      division: { mastery: 43 },
      perimeter: { mastery: 42 },
    },
    gameJourneyCounts: { calculation: 1, geometry: 2, pattern: 0, problem: 0 },
  }, questions);

  assert.equal(rows.length, 4);
  assert.equal(rows.find((row) => row.key === 'calculation').stateText, '会用了');
  assert.equal(rows.find((row) => row.key === 'geometry').stateText, '认识了');
  assert.equal(rows.find((row) => row.key === 'geometry').gameCount, 2);
  assert.ok(rows.every((row) => row.nextAction));
});

test('journey focus uses the lowest current domain with stable tie-breaking', () => {
  const progress = {
    abilities: { calculation: 70, geometry: 55, pattern: 55, problem: 80 },
    knowledgeState: {},
    gameJourneyCounts: {},
  };
  assert.equal(getJourneyFocus(progress, questions).key, 'geometry');
});
