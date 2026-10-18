(() => {
  const model = window.MonthwiseModel;
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  const clampDay = n => Math.min(30, Math.max(1, Math.floor(Number(n) || 1)));
  const nonnegative = n => Math.max(0, Number(n) || 0);
  const sample = {
    opening: 750, buffer: 150,
    income: [{ name: 'Monthly allowance', amount: 650, day: 8 }, { name: 'Part-time pay', amount: 300, day: 19 }],
    expense: [{ name: 'Room and utilities', amount: 420, day: 2 }, { name: 'Transport', amount: 45, day: 3 }, { name: 'Groceries', amount: 90, day: 6 }, { name: 'Phone plan', amount: 25, day: 11 }, { name: 'Food later in month', amount: 180, day: 14 }],
    oneoff: [{ name: 'Optional weekend purchase', amount: 160, day: 4, flexible: true, latestDay: 20 }]
  };
  const storageKey = 'monthwise-rescue-v2';
  const collections = { income: 'incomeList', expense: 'expenseList', oneoff: 'oneoffList' };
  let data;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    data = saved && Array.isArray(saved.income) && Array.isArray(saved.expense) && Array.isArray(saved.oneoff) ? saved : structuredClone(sample);
  } catch { data = structuredClone(sample); }

  function save() { try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* Works without browser storage. */ } }
  function renderList(type) {
    const host = $(collections[type]);
    host.replaceChildren();
    data[type].forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'entry-block';
      const fields = document.createElement('div');
      fields.className = 'entry';
      fields.innerHTML = '<input type="text" maxlength="50" placeholder="Description"><input type="number" min="0" step="1" inputmode="decimal" placeholder="S$"><input type="number" min="1" max="30" step="1" inputmode="numeric" placeholder="Day"><button class="remove-entry" type="button">×</button>';
      const [name, amount, when, remove] = fields.children;
      name.setAttribute('aria-label', `${type === 'income' ? 'Income' : 'Expense'} ${i + 1} description`);
      amount.setAttribute('aria-label', `${type === 'income' ? 'Income' : 'Expense'} ${i + 1} amount in Singapore dollars`);
      when.setAttribute('aria-label', `${type === 'income' ? 'Income' : 'Expense'} ${i + 1} day of month`);
      remove.setAttribute('aria-label', `Remove ${type === 'income' ? 'income' : 'expense'} ${i + 1}`);
      name.value = item.name || ''; amount.value = nonnegative(item.amount); when.value = clampDay(item.day);
      name.addEventListener('input', () => { item.name = name.value.slice(0, 50); update(); });
      amount.addEventListener('input', () => { item.amount = nonnegative(amount.value); update(); });
      when.addEventListener('input', () => {
        item.day = clampDay(when.value);
        if (item.flexible && item.latestDay < item.day) { item.latestDay = item.day; renderList(type); }
        update();
      });
      remove.addEventListener('click', () => { data[type].splice(i, 1); renderAll(); });
      row.append(fields);
      if (type !== 'income') {
        const flexibility = document.createElement('div'); flexibility.className = 'flexibility';
        const label = document.createElement('label'); label.className = 'flex-toggle';
        const check = document.createElement('input'); check.type = 'checkbox'; check.checked = !!item.flexible;
        const words = document.createElement('span'); words.textContent = 'I could move this payment';
        label.append(check, words); flexibility.append(label);
        const latestLabel = document.createElement('label'); latestLabel.className = 'latest-label';
        latestLabel.textContent = 'Latest day';
        const latestInput = document.createElement('input'); latestInput.type = 'number'; latestInput.min = '1'; latestInput.max = '30'; latestInput.step = '1'; latestInput.inputMode = 'numeric'; latestInput.value = clampDay(item.latestDay || item.day); latestInput.setAttribute('aria-label', `Latest possible day for ${item.name || 'expense ' + (i + 1)}`);
        latestLabel.append(latestInput); flexibility.append(latestLabel);
        latestLabel.hidden = !item.flexible;
        check.addEventListener('change', () => { item.flexible = check.checked; item.latestDay = Math.max(clampDay(item.day), clampDay(latestInput.value)); latestInput.value = item.latestDay; latestLabel.hidden = !check.checked; update(); });
        latestInput.addEventListener('input', () => { item.latestDay = Math.max(clampDay(item.day), clampDay(latestInput.value)); update(); });
        row.append(flexibility);
      }
      host.append(row);
    });
  }
  function renderAll() {
    for (const type of Object.keys(collections)) renderList(type);
    $('opening').value = nonnegative(data.opening);
    $('buffer').value = nonnegative(data.buffer);
    update();
  }
  function add(type) {
    data[type].push({ name: '', amount: 0, day: type === 'income' ? 15 : 1, flexible: false, latestDay: type === 'income' ? 15 : 1 });
    renderList(type); update();
    $(collections[type]).lastElementChild.querySelector('input').focus();
  }
  function esc(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function draw(result) {
    const svg = $('cashChart'), W = 720, H = 250, left = 54, right = 16, top = 17, bottom = 25;
    const values = result.days.map(d => d.balance).concat([nonnegative(data.buffer), nonnegative(data.opening)]);
    let low = Math.min(0, ...values), high = Math.max(100, ...values);
    const pad = (high - low) * 0.12 || 50; low -= pad; high += pad;
    const x = d => left + (d - 1) * (W - left - right) / 29;
    const y = value => top + (high - value) * (H - top - bottom) / (high - low);
    const points = result.days.map(d => `${x(d.day).toFixed(1)},${y(d.balance).toFixed(1)}`).join(' ');
    const grid = Array.from({ length: 4 }, (_, i) => low + (high - low) * i / 3).map(v => `<line x1="${left}" x2="${W-right}" y1="${y(v)}" y2="${y(v)}" stroke="#ecece5"/><text x="${left-8}" y="${y(v)+3}" text-anchor="end" fill="#69736b" font-family="DM Mono" font-size="9">${Math.round(v)}</text>`).join('');
    const marks = result.days.filter(d => d.events.length).map(d => `<circle cx="${x(d.day)}" cy="${y(d.balance)}" r="3.2" fill="#fffefa" stroke="#397c60" stroke-width="2"><title>Day ${d.day}: ${esc(d.events.map(e => `${e.name} ${money(e.amount)}`).join(', '))}; closing balance ${money(d.balance)}</title></circle>`).join('');
    const minDay = Math.max(1, result.min.day);
    svg.innerHTML = `<defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4b906e" stop-opacity=".22"/><stop offset="1" stop-color="#4b906e" stop-opacity=".01"/></linearGradient></defs>${grid}<line x1="${left}" x2="${W-right}" y1="${y(0)}" y2="${y(0)}" stroke="#d8d9d1" stroke-dasharray="3 4"/><line x1="${left}" x2="${W-right}" y1="${y(nonnegative(data.buffer))}" y2="${y(nonnegative(data.buffer))}" stroke="#a9633d" stroke-dasharray="5 4"/><text x="${W-right}" y="${y(nonnegative(data.buffer))-5}" text-anchor="end" fill="#a9633d" font-family="DM Mono" font-size="8">BUFFER</text><polygon points="${left},${H-bottom} ${points} ${W-right},${H-bottom}" fill="url(#chartFill)"/><polyline points="${points}" fill="none" stroke="#347b5b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${marks}<circle cx="${x(minDay)}" cy="${y(result.min.balance)}" r="5" fill="#d4674d" stroke="#fffefa" stroke-width="2"/>`;
    svg.setAttribute('aria-label', `Projected balance starts at ${money(nonnegative(data.opening))}, reaches a low of ${money(result.min.balance)} ${result.min.day === 0 ? 'before day 1' : 'on day ' + result.min.day}, and ends at ${money(result.end)}.`);
  }
  function insights(result) {
    const buffer = nonnegative(data.buffer);
    const first = result.days.find(d => d.balance < buffer);
    const title = result.min.balance < 0 ? `Cash could run short on day ${result.min.day}.` : first ? `Your balance crosses your ${money(buffer)} buffer.` : 'Your listed cash stays above your buffer.';
    const desc = first ? `The first day below your buffer is day ${first.day}. The lowest balance is ${money(result.min.balance)} on day ${result.min.day}, even though the month ends at ${money(result.end)}.` : `The lowest balance is ${money(result.min.balance)} ${result.min.day === 0 ? 'at the start' : 'on day ' + result.min.day}. Test a delayed payment to see how sensitive this plan is.`;
    $('insightTitle').textContent = title; $('insightText').textContent = desc;
    $('insightActions').replaceChildren();
    $('chartCaption').textContent = first ? `First below your ${money(buffer)} buffer: day ${first.day}. The chart shows daily closing balances; same-day payments are combined.` : `The projected balance stays at or above your ${money(buffer)} buffer. The chart shows daily closing balances.`;
  }
  function renderRescue(plan, delay) {
    const host = $('rescueResults'); host.replaceChildren();
    const line = (tag, className, value) => { const el = document.createElement(tag); el.className = className; el.textContent = value; host.append(el); return el; };
    $('rescueContext').textContent = delay ? `With the first income delayed ${delay} ${delay === 1 ? 'day' : 'days'}` : 'With income arriving as entered';
    if (![...data.income, ...data.expense, ...data.oneoff].length) {
      line('p', 'rescue-status', 'Add income and costs to start planning.');
      line('p', 'rescue-explain', 'The planner will check only the expenses you mark as movable.');
      return;
    }
    if (plan.gap <= 0.005) {
      line('p', 'rescue-status success', `Your balance stays at or above your ${money(plan.buffer)} buffer in this scenario.`);
      line('p', 'rescue-explain', 'Try delaying income or adding a cost to see when a rescue plan becomes useful.');
      return;
    }
    line('p', 'rescue-status', `Buffer gap: ${money(plan.gap)} across ${plan.daysBelowBuffer} ${plan.daysBelowBuffer === 1 ? 'day' : 'days'}.`);
    line('p', 'rescue-explain', `The exact extra cash needed at the start of this scenario is ${money(plan.gap)}. That would raise every projected balance by the same amount.`);
    if (plan.best) {
      const best = plan.best;
      const card = document.createElement('div'); card.className = 'rescue-option';
      const title = document.createElement('strong'); title.textContent = best.remainingGap <= 0.005 ? 'One move closes the gap' : 'Best single move found';
      const detail = document.createElement('p'); detail.textContent = `Move “${best.name}” from day ${best.from} to day ${best.to}. Lowest balance: ${money(plan.before.min.balance)} → ${money(best.after.min.balance)}.`;
      const result = document.createElement('span'); result.className = 'rescue-outcome'; result.textContent = best.remainingGap <= 0.005 ? `Buffer protected in this scenario` : `${money(best.remainingGap)} still below your buffer`;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'apply-btn'; button.textContent = 'Apply this date change';
      button.addEventListener('click', () => { data[best.type][best.index].day = best.to; renderAll(); $('rescuePlanner').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      card.append(title, detail, result, button); host.append(card);
      if (plan.candidates.length > 1) line('p', 'rescue-small', `${plan.candidates.length - 1} other flexible ${plan.candidates.length === 2 ? 'expense' : 'expenses'} checked. This shows the best single change under the dates you allowed.`);
    } else {
      line('p', 'rescue-explain', 'No single marked expense can improve this low point. Mark a genuinely movable cost and its latest day, or revise your starting cash and dates.');
    }
    line('p', 'rescue-small', 'These are arithmetic scenarios, not a recommendation to miss essential payments or borrow money.');
  }
  function update() {
    data.opening = nonnegative($('opening').value); data.buffer = nonnegative($('buffer').value);
    const current = model.project(data);
    $('endingBalance').textContent = money(current.end);
    $('lowestBalance').textContent = money(current.min.balance);
    $('lowestNote').textContent = current.min.day === 0 ? 'before day 1' : `on day ${current.min.day}`;
    $('endingNote').textContent = current.end < 0 ? 'projected below zero' : 'after listed activity';
    draw(current); insights(current);
    const delay = Number($('delayDays').value) || 0;
    const stressed = model.project(data, { delay });
    $('delayLabel').textContent = `${delay} ${delay === 1 ? 'day' : 'days'}`;
    $('scenarioLowest').textContent = money(stressed.min.balance);
    const delta = stressed.min.balance - current.min.balance;
    $('scenarioDelta').textContent = delay === 0 ? 'No delay applied' : delta < -0.005 ? `${money(-delta)} lower than the current plan` : delta > 0.005 ? `${money(delta)} higher as timing changes` : 'Same lowest point in this scenario';
    $('delayFootnote').textContent = data.income.length && clampDay(data.income[0].day) + delay > 30 ? 'The delayed payment falls after day 30, so this 30-day projection excludes it.' : 'Only the first listed income payment moves; other dates stay as entered.';
    renderRescue(model.rescue(data, delay), delay);
    save();
  }
  document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => add(button.dataset.add)));
  $('opening').addEventListener('input', update); $('buffer').addEventListener('input', update); $('delayDays').addEventListener('input', update);
  $('sampleBtn').addEventListener('click', () => { data = structuredClone(sample); $('delayDays').value = '0'; renderAll(); });
  $('resetBtn').addEventListener('click', () => { data = { opening: 0, buffer: 0, income: [], expense: [], oneoff: [] }; $('delayDays').value = '0'; try { localStorage.removeItem(storageKey); } catch {} renderAll(); });
  document.querySelectorAll('.hint').forEach(button => button.addEventListener('click', () => $('helpDialog').showModal()));
  renderAll();
})();
