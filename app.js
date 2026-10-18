(() => {
  const $ = (id) => document.getElementById(id);
  const day = (n) => Math.max(1, Math.min(30, Number(n) || 1));
  const money = (n) => new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(Math.round(n));
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const dateFor = (n) => { const d = new Date(monthStart); d.setDate(Math.min(n, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d.toISOString().slice(0, 10); };
  const dateDay = (v) => Math.max(1, Math.min(30, Number((v || '').slice(-2)) || 1));
  const sample = {
    opening: 650, buffer: 150,
    income: [{ name: 'Monthly allowance', amount: 700, day: 8 }, { name: 'Part-time shift pay', amount: 320, day: 19 }],
    expense: [{ name: 'Room & utilities', amount: 480, day: 2 }, { name: 'Food & groceries', amount: 280, day: 6 }, { name: 'Transport', amount: 65, day: 4 }, { name: 'Phone plan', amount: 25, day: 11 }, { name: 'Subscriptions', amount: 18, day: 15 }],
    oneoff: [{ name: 'Textbook & lab materials', amount: 95, day: 5 }]
  };
  let data;
  try { data = JSON.parse(localStorage.getItem('monthwise-data')) || structuredClone(sample); } catch { data = structuredClone(sample); }
  if (!data.income) data = structuredClone(sample);
  const collections = { income: 'incomeList', expense: 'expenseList', oneoff: 'oneoffList' };

  function save() { try { localStorage.setItem('monthwise-data', JSON.stringify(data)); } catch { /* Calculator still works if storage is unavailable. */ } }
  function clean(s) { return String(s || '').slice(0, 50); }
  function renderList(type) {
    const host = $(collections[type]); host.replaceChildren();
    data[type].forEach((item, i) => {
      const row = document.createElement('div'); row.className = 'entry';
      row.innerHTML = '<input type="text" aria-label="' + (type === 'income' ? 'Income' : 'Expense') + ' name" maxlength="50" placeholder="Description"><input type="number" min="0" step="5" inputmode="decimal" aria-label="Amount in Singapore dollars" placeholder="S$ amount"><input type="number" min="1" max="30" step="1" inputmode="numeric" aria-label="Day of month" placeholder="Day 1–30"><button class="remove-entry" type="button" aria-label="Remove entry">×</button>';
      const [name, amount, dayInput, remove] = row.children;
      name.value = item.name; amount.value = item.amount; dayInput.value = item.day;
      name.addEventListener('input', () => { data[type][i].name = clean(name.value); update(); });
      amount.addEventListener('input', () => { data[type][i].amount = Math.max(0, Number(amount.value) || 0); update(); });
      dayInput.addEventListener('input', () => { data[type][i].day = day(dayInput.value); update(); });
      remove.addEventListener('click', () => { data[type].splice(i, 1); renderAll(); });
      host.append(row);
    });
  }
  function add(type) {
    data[type].push({ name: '', amount: 0, day: type === 'income' ? 15 : 1 });
    renderAll(); const inputs = $(collections[type]).lastElementChild.querySelector('input'); inputs.focus();
  }
  function renderAll() { for (const t of Object.keys(collections)) renderList(t); $('opening').value = data.opening; $('buffer').value = data.buffer; update(); }
  function events(delay = 0) {
    const list = [];
    data.income.forEach((x, i) => list.push({ day: Math.min(30, day(x.day) + (i === 0 ? delay : 0)), amount: Number(x.amount) || 0, label: x.name, kind: 'in' }));
    data.expense.forEach(x => list.push({ day: day(x.day), amount: -(Number(x.amount) || 0), label: x.name, kind: 'out' }));
    data.oneoff.forEach(x => list.push({ day: day(x.day), amount: -(Number(x.amount) || 0), label: x.name, kind: 'out' }));
    list.sort((a, b) => a.day - b.day || a.amount - b.amount);
    return list;
  }
  function calculate(delay = 0) {
    const days = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, balance: Number(data.opening) || 0, events: [] }));
    let bal = Number(data.opening) || 0; const evs = events(delay); let j = 0;
    for (const d of days) {
      while (j < evs.length && evs[j].day === d.day) { d.events.push(evs[j]); j++; }
      bal += d.events.reduce((s, e) => s + e.amount, 0); d.balance = bal;
    }
    let min = { day: 1, balance: Number(data.opening) || 0 };
    days.forEach(d => { if (d.balance < min.balance) min = { day: d.day, balance: d.balance }; });
    return { days, end: bal, min, evs };
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function draw(result) {
    const svg = $('cashChart'), W = 720, H = 250, left = 54, right = 16, top = 17, bottom = 25;
    const vals = result.days.map(x => x.balance).concat([Number(data.buffer) || 0]);
    let low = Math.min(0, ...vals), high = Math.max(100, ...vals);
    const pad = (high - low) * .12 || 50; low -= pad; high += pad;
    const x = d => left + (d - 1) * (W - left - right) / 29;
    const y = v => top + (high - v) * (H - top - bottom) / (high - low);
    const points = result.days.map(d => `${x(d.day).toFixed(1)},${y(d.balance).toFixed(1)}`).join(' ');
    const zeroY = y(0); const bufY = y(Number(data.buffer) || 0);
    const minX = x(result.min.day), minY = y(result.min.balance);
    const yTicks = Array.from({ length: 4 }, (_, i) => low + (high - low) * i / 3);
    const grid = yTicks.map(v => `<line x1="${left}" x2="${W-right}" y1="${y(v)}" y2="${y(v)}" stroke="#ecece5"/><text x="${left-8}" y="${y(v)+3}" text-anchor="end" fill="#989d94" font-family="DM Mono" font-size="9">${Math.round(v)}</text>`).join('');
    const eventMarks = result.days.filter(d => d.events.length).map(d => `<circle cx="${x(d.day)}" cy="${y(d.balance)}" r="3.2" fill="#fffefa" stroke="#397c60" stroke-width="2"><title>Day ${d.day}: ${esc(d.events.map(e => `${e.label || 'Entry'} ${money(Math.abs(e.amount))}`).join(', ') )}; balance ${money(d.balance)}</title></circle>`).join('');
    svg.innerHTML = `<defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4b906e" stop-opacity=".22"/><stop offset="1" stop-color="#4b906e" stop-opacity=".01"/></linearGradient></defs>${grid}<line x1="${left}" x2="${W-right}" y1="${zeroY}" y2="${zeroY}" stroke="#d8d9d1" stroke-dasharray="3 4"/><line x1="${left}" x2="${W-right}" y1="${bufY}" y2="${bufY}" stroke="#cf976d" stroke-dasharray="5 4"/><text x="${W-right}" y="${bufY-5}" text-anchor="end" fill="#b37c56" font-family="DM Mono" font-size="8">BUFFER</text><polygon points="${left},${H-bottom} ${points} ${W-right},${H-bottom}" fill="url(#chartFill)"/><polyline points="${points}" fill="none" stroke="#347b5b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${eventMarks}<circle cx="${minX}" cy="${minY}" r="5" fill="#e57e64" stroke="#fffefa" stroke-width="2"/><text x="${minX}" y="${minY-11}" text-anchor="middle" fill="#a4513d" font-family="DM Mono" font-size="9">LOW</text>`;
    svg.setAttribute('aria-label', `Projected balance starts at ${money(Number(data.opening) || 0)}, reaches a low of ${money(result.min.balance)} on day ${result.min.day}, and ends at ${money(result.end)}.`);
  }
  function insights(r) {
    const buffer = Number(data.buffer) || 0, below = r.min.balance < buffer, negative = r.min.balance < 0;
    let title, desc, chips = [];
    if (negative) { title = `Your balance may go below zero on day ${r.min.day}.`; desc = `On the dates entered, outflows arrive before enough cash is available. Your modelled low is ${money(r.min.balance)}. Consider checking timing, available support, or whether any dates or estimates need updating.`; chips = ['Check payment dates', 'Review one-off costs']; }
    else if (below) { title = `Your balance dips below your ${money(buffer)} buffer.`; desc = `The lowest point is ${money(r.min.balance)} on day ${r.min.day}. Your month-end balance is ${money(r.end)}, but the path between now and then crosses your chosen cushion.`; chips = ['Test a delayed expense', 'Review buffer amount']; }
    else { title = `Your listed cash stays above your buffer.`; desc = `The lowest point is ${money(r.min.balance)} on day ${r.min.day}, compared with your ${money(buffer)} reference buffer. Try a delay or add a surprise expense to see how sensitive the plan is.`; chips = ['Try the delay slider', 'Add a surprise cost']; }
    $('insightTitle').textContent = title; $('insightText').textContent = desc;
    $('insightActions').innerHTML = chips.map(x => `<span class="action-chip">${x}</span>`).join('');
    const firstStress = r.days.find(d => d.balance < buffer);
    $('chartCaption').textContent = firstStress ? `Your balance first moves below the ${money(buffer)} reference buffer on day ${firstStress.day}. Hover over the dots to inspect your entries.` : `Your projected balance stays at or above the ${money(buffer)} reference buffer in this example. Hover over the dots to inspect entries.`;
  }
  function update() {
    data.opening = Math.max(0, Number($('opening').value) || 0); data.buffer = Math.max(0, Number($('buffer').value) || 0);
    const current = calculate(); $('endingBalance').textContent = money(current.end); $('lowestBalance').textContent = money(current.min.balance); $('lowestNote').textContent = `on day ${current.min.day}`; $('endingNote').textContent = current.end < 0 ? 'projected below zero' : 'after listed activity';
    draw(current); insights(current);
    const delay = Number($('delayDays').value) || 0, stressed = calculate(delay); $('delayLabel').textContent = `${delay} ${delay === 1 ? 'day' : 'days'}`; $('scenarioLowest').textContent = money(stressed.min.balance);
    const delta = stressed.min.balance - current.min.balance; $('scenarioDelta').textContent = delay === 0 ? 'No payment delay applied' : delta < -0.5 ? `${money(Math.abs(delta))} lower than your current plan` : delta > .5 ? `${money(delta)} higher (timing shifts the low point)` : 'Same lowest point in this scenario';
    save();
  }
  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => add(b.dataset.add)));
  $('opening').addEventListener('input', update); $('buffer').addEventListener('input', update); $('delayDays').addEventListener('input', update);
  $('sampleBtn').addEventListener('click', () => { data = structuredClone(sample); renderAll(); });
  $('resetBtn').addEventListener('click', () => { data = { opening: 0, buffer: 0, income: [], expense: [], oneoff: [] }; localStorage.removeItem('monthwise-data'); renderAll(); });
  document.querySelectorAll('.hint').forEach(b => b.addEventListener('click', () => $('helpDialog').showModal()));
  $('helpDialog').querySelector('.dialog-close').addEventListener('click', e => { e.preventDefault(); $('helpDialog').close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('helpDialog').open) $('helpDialog').close(); });
  renderAll();
})();
