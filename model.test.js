const assert = require('node:assert/strict');
const { project, rescue } = require('./model.js');

const sample = {
  opening: 750, buffer: 150,
  income: [{ name: 'Allowance', amount: 650, day: 8 }, { name: 'Pay', amount: 300, day: 19 }],
  expense: [
    { name: 'Room', amount: 420, day: 2 }, { name: 'Transport', amount: 45, day: 3 },
    { name: 'Groceries', amount: 90, day: 6 }, { name: 'Phone', amount: 25, day: 11 },
    { name: 'Food', amount: 180, day: 14 }
  ],
  oneoff: [{ name: 'Optional purchase', amount: 160, day: 4, flexible: true, latestDay: 20 }]
};

const baseline = project(sample);
assert.equal(baseline.min.balance, 35);
assert.equal(baseline.min.day, 6);
assert.equal(baseline.end, 780);
const plan = rescue(sample);
assert.equal(plan.gap, 115);
assert.equal(plan.best.to, 9); // Avoid day 8, when income and expense order is unknown.
assert.equal(plan.best.after.min.balance, 195);
assert.equal(plan.best.remainingGap, 0);
assert.equal(sample.oneoff[0].day, 4); // Suggestions never change the data.

const delayed = rescue(sample, 7);
assert.equal(delayed.before.min.balance, -170);
assert.equal(delayed.gap, 320);
assert.equal(delayed.best.remainingGap, 160);
assert.equal(delayed.best.to, 16); // Day 15 is the delayed income day.

const outside = project({ opening: 20, income: [{ amount: 50, day: 28 }], expense: [], oneoff: [] }, { delay: 7 });
assert.equal(outside.end, 20); // Income beyond day 30 is not silently moved to day 30.

const fixed = { opening: 100, buffer: 70, income: [], expense: [{ name: 'Rent', amount: 80, day: 2 }], oneoff: [] };
assert.equal(rescue(fixed).best, null); // Unmarked essential expense stays fixed.
console.log('Monthwise model checks passed.');
