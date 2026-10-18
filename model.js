/* Pure calculations shared by the site and its checks. No personal data leaves the browser. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.MonthwiseModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const HORIZON = 30;
  const amount = value => Math.max(0, Number(value) || 0);
  const day = value => Math.min(HORIZON, Math.max(1, Math.floor(Number(value) || 1)));

  function project(data, options = {}) {
    const delay = Math.max(0, Math.floor(Number(options.delay) || 0));
    const move = options.move;
    const dailyEvents = Array.from({ length: HORIZON + 1 }, () => []);
    for (const type of ['income', 'expense', 'oneoff']) {
      (data[type] || []).forEach((item, index) => {
        let when = day(item.day);
        if (type === 'income' && index === 0) when += delay;
        if (move && move.type === type && move.index === index) when = day(move.toDay);
        if (when > HORIZON) return; // A delayed payment beyond the horizon does not arrive this month.
        dailyEvents[when].push({ type, index, name: String(item.name || 'Entry'), amount: amount(item.amount) });
      });
    }
    const opening = amount(data.opening);
    let balance = opening;
    let min = { day: 0, balance: opening };
    const days = [];
    for (let d = 1; d <= HORIZON; d++) {
      const events = dailyEvents[d];
      balance += events.reduce((sum, event) => sum + (event.type === 'income' ? event.amount : -event.amount), 0);
      days.push({ day: d, balance, events });
      if (balance < min.balance) min = { day: d, balance };
    }
    return { days, end: balance, min };
  }

  function rescue(data, delay = 0) {
    const before = project(data, { delay });
    const buffer = amount(data.buffer);
    const gap = Math.max(0, buffer - before.min.balance);
    const candidates = [];
    if (gap > 0) {
      for (const type of ['expense', 'oneoff']) {
        (data[type] || []).forEach((item, index) => {
          if (!item.flexible || amount(item.amount) <= 0) return;
          const from = day(item.day);
          const latest = day(item.latestDay || from);
          let best = null;
          for (let to = from + 1; to <= latest; to++) {
            const after = project(data, { delay, move: { type, index, toDay: to } });
            // Avoid a same-day recommendation when receipt and payment order is unknown.
            if (after.days[to - 1].events.some(event => event.type === 'income')) continue;
            const improvement = after.min.balance - before.min.balance;
            if (improvement <= 0.005) continue;
            const trial = { type, index, name: String(item.name || 'Flexible cost'), from, to, after, improvement, remainingGap: Math.max(0, buffer - after.min.balance) };
            // Prefer a move that fully closes the gap; among those, the earliest date.
            if (!best || (best.remainingGap > 0 && trial.remainingGap === 0) ||
                (best.remainingGap > 0 && trial.remainingGap < best.remainingGap - 0.005)) best = trial;
          }
          if (best) candidates.push(best);
        });
      }
    }
    candidates.sort((a, b) => a.remainingGap - b.remainingGap || (a.to - a.from) - (b.to - b.from) || b.improvement - a.improvement);
    return { before, buffer, gap, candidates, best: candidates[0] || null, daysBelowBuffer: before.days.filter(d => d.balance < buffer).length };
  }

  return { HORIZON, project, rescue };
});
