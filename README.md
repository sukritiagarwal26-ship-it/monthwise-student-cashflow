# Monthwise — Student Cash Flow Lab

**A private, browser-based cash-flow planner for university students in Singapore.** Monthwise helps a student explore how the timing of allowances, pay, bills, and one-off costs can create a low-balance point even when the month-end total appears comfortable.

This is an independent student project and a learning prototype. It is not an NUS product, financial advice, or a validated student-support service.

## The question

> Can a student’s month look balanced overall and still run short before their next payment arrives?

Traditional monthly budgets add income and expenses. Monthwise applies cash-flow accounting event by event, making the timing and lowest balance visible. A delay slider explores a simple “what if the first income arrives later?” scenario.

## Try it

Open `index.html` in a modern browser, or publish this folder as a static site using GitHub Pages. No build step, server, account, or API key is required.

The sample is fictional and illustrative. Select **Sample NUS student** to restore it. **Reset example** clears the local browser data and leaves an empty model.

## How the model works

For each day \(t\) in a 30-day planning month:

```text
closing_balance[t] = closing_balance[t - 1]
                   + sum(income events on day t)
                   - sum(expense events on day t)
```

The opening balance is the available cash on day 1. Events entered on the same day are combined for that day’s closing balance; the app does not model an intraday ordering. The month-end balance is the day-30 balance. The low point is the minimum among the opening balance and the 30 daily closing balances. The safety buffer is a user-selected reference threshold, not an expense or a recommendation.

The scenario slider shifts the first listed income event by 0–21 days, capped at day 30. The scenario shows the resulting low balance alongside the baseline. It is a deterministic sensitivity check, not a probability forecast. If there are no income events, moving the slider has no effect.

## Assumptions and limits

- The planning horizon is 30 days, with event dates expressed as day 1–30.
- Entries are estimates supplied by the user. The sample figures do not describe actual NUS students.
- No probability, seasonality, borrowing, interest, inflation, taxes, exchange rates, or automatic recurring events are modelled.
- A below-zero result means the entered schedule would require more cash than the opening balance and listed inflows provide. It does not establish that a payment will be missed.
- The tool does not determine eligibility for bursaries, loans, emergency grants, or other support.
- An unexpected cost can be added under “One-off this month”; the tool does not invent or infer spending.

## Privacy

All calculations run in the browser. Entries are stored in that browser’s `localStorage` so the same device can retain the working example. No financial entries are transmitted to a server by the application. Use **Reset example** to clear the app’s saved values in this browser. Avoid entering account numbers or other identifying information.

## Product choices

- **Timing before totals:** show the within-month low point, not just surplus/deficit.
- **Scenario testing over advice:** let people change dates and amounts without telling them what they ought to do.
- **Plain-language limitations:** disclose the 30-day horizon, buffer definition, scenario logic, and unmodelled factors near the analysis.
- **Local-first privacy:** keep personal numbers on-device and remove the need for accounts or back-end data storage.
- **User research as the next step:** the concept should be refined through opt-in conversations with students. This repository does not claim that interviews or usability testing have taken place.

## Roadmap

1. Conduct voluntary, non-sensitive discovery conversations with a small range of students; ask about planning challenges, not account balances.
2. Check whether the day-by-day view, terms, and assumptions make sense to users.
3. Add optional recurring events and a selectable planning horizon only if feedback shows they solve a real need.
4. Seek appropriate campus support-resource links and maintain them from official sources if adding a support directory.
5. Document user feedback and changes without publishing personal stories or financial details.

## Files

- `index.html` — page content and app structure
- `styles.css` — responsive visual design
- `app.js` — local calculation, scenario, chart, and browser persistence

## Accessibility and compatibility

The interface uses semantic sections, keyboard-operable inputs and buttons, visible focus styles, chart text alternatives, and a responsive layout. It is designed for current desktop and mobile browsers. A production release should receive manual screen-reader and device testing.

## License

MIT. See [LICENSE](LICENSE).
