# Monthwise — Student Cash Flow Lab

**A browser-based student cash-flow simulator with a Rescue Planner.**

Monthwise asks a practical finance question: *Can a month finish with cash left over, yet leave a student short before the next payment arrives?* It turns an estimated 30-day schedule into a daily balance path, finds the lowest point, and checks whether a feasible change to a user-marked flexible cost can protect a chosen safety buffer.

This is an independent learning project by **Sukriti Agarwal**, developed with AI assistance. It does not provide financial advice. No user research or professional review is claimed. The example budget is fictional.

## Run it

Open `index.html` in a modern browser. No build step, account, bank connection, API key, or server is required. To run the calculation checks, use `node model.test.js` with Node.js 18 or later.

## What makes it useful

- **A month-end balance and a lowest balance:** shows why a positive monthly total can hide a timing gap.
- **A delayed-income scenario:** moves the first listed income by 0–21 days. Payments delayed past day 30 are excluded from this month's projection.
- **A Rescue Planner:** checks every later date up to the user's latest allowed date for each expense they explicitly mark as flexible. It reports the best single move, its exact effect on the lowest balance, and whether it fully closes the buffer gap.
- **An exact opening-cash gap:** the difference between the chosen buffer and the lowest modelled balance. Adding that much cash at the start would raise every daily balance by the same amount; this is an arithmetic comparison, not advice to borrow.
- **Local storage:** entries remain in the browser on the device in use. No financial entries are sent to a server by this application.

A cash-flow budget tracks the *timing* of income and expenses, as explained by the [US Consumer Financial Protection Bureau](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf). Forecast balance charts already exist in commercial software such as [Quicken Simplifi](https://support.simplifi.quicken.com/en/articles/3357429-using-projected-cash-flow). Monthwise's portfolio focus is the student-specific, transparent Rescue Planner, rather than a claim that balance forecasting is new.

## Fictional example

The sample opens with S$750 and a S$150 safety buffer. It finishes at **S$780**, but reaches **S$35 on day 6**. The optional S$160 purchase is marked movable from day 4 through day 20. Moving it to **day 9** yields a lowest balance of **S$195**, above the buffer. Day 8 is deliberately not suggested because income arrives that day and the app cannot know which transaction would happen first.

If the allowance is delayed seven days, the low becomes **−S$170**. Moving the optional purchase to day 16 improves it to **−S$10**, but **S$160 of the S$150-buffer gap remains**. The site reports that the single move does not solve the whole problem.

## Calculation

For each day from 1 to 30:

```text
closing balance = previous closing balance
                + income received that day
                - expenses paid that day
```

The opening balance is available before day 1. The reported low point is the minimum of the opening balance and the 30 daily closing balances. Same-day transactions are combined. The chart does not model the order of payments within a day. The Rescue Planner excludes moves onto a day with modelled income to avoid implying that an expense can safely be paid before that income arrives.

The buffer gap is `max(0, safety buffer − lowest balance)`. For each flexible expense with a latest day later than its current day, the planner projects every possible new day. It first prefers a single move that closes the entire gap; otherwise it shows the move that leaves the smallest gap. It never moves a cost that the user has not marked flexible, never combines multiple moves, and never claims that a partial improvement solves the gap.

## Assumptions and limitations

- The horizon is a fixed 30-day planning month. The dates are day numbers, not calendar dates.
- All amounts and dates are estimates supplied by the user. The sample is illustrative and does not describe students generally.
- Expenses are entered as one event each. Recurrence, taxes, interest, overdraft fees, exchange rates, borrowing, and bank account balances are not modelled.
- A safety buffer is a personal reference amount. Crossing it is not the same as missing a bill. A negative projected balance signals a cash need under the entered assumptions; it does not predict an actual missed payment.
- The planner searches only one movable expense at a time. It does not weigh disruption, fees, contractual dates, or the practical cost of changing a payment. Users must decide whether a listed move is genuinely possible.
- A delayed income date is a deterministic scenario, not a probability estimate. No forecast of future earnings or spending is made.

## Privacy and accessibility

The application has no backend and stores the working schedule in browser `localStorage`. **Reset example** clears saved entries for this version from that browser and leaves an empty schedule. The site loads fonts from Google Fonts; financial values are not included in those font requests. The interface supports keyboard input, labelled controls, visible focus, responsive layouts, reduced motion, chart text alternatives, and textual outcomes. Manual screen-reader and device testing would still be needed before treating it as a production tool.

## Files

- `index.html` — interface and explanatory content
- `styles.css` — responsive design
- `model.js` — pure projection and Rescue Planner calculations
- `app.js` — browser interaction, chart, and local persistence
- `model.test.js` — checks for the sample, delayed income, end-of-horizon behavior, and fixed expenses
- `LICENSE` — MIT license

