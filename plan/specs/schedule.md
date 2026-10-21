# Schedule

**Scope is fixed at the full plan.** The schedule is a guide, not a requirement. Work hours are volatile, so ~3 hrs/week is a baseline; do more when possible and see how far it gets.
Hours are the real unit; week numbers are projections that slide with actual pace.
**Rule of thumb:** one 1–2 hr task per session.

## Estimated hours per task

| Phase | Tasks | Est. hrs | Cumulative hrs | Projected weeks (@3/wk) |
|---|---|---|---|---|
| 1 Backend foundations | 1.1 (2) 1.2 (1) 1.3 (1) 1.4 (1.5) 1.5 (1) 1.6 (1.5) 1.7 (1.5) 1.8 (1.5) 1.9 (1.5) 1.10 (2) 1.11 (1.5) | 16 | 16 | 1–6 |
| 2 Preliminary UI | 2.1 (1) 2.2 (1) 2.3 (1.5) 2.4 (1.5) 2.5 (1.5) 2.6 (1.5) 2.7 (2) | 10 | 26 | 7–9 |
| 3 Algorithm, access, security | 3.1 (1.5) 3.2 (1.5) 3.3 (1.5) 3.4 (1.5) 3.5 (1.5) 3.6 (2) 3.7 (2) 3.8 (1.5) | 13 | 39 | 10–13 |
| 4 UI updates | 4.1 (1) 4.2 (1.5) 4.3 (1.5) 4.4 (2) 4.5 (2) 4.6 (2) | 10 | 49 | 14–16 |
| 5 Testing & deploy | 5.1 (1) 5.2 (1) 5.3 (1) 5.4 (2) 5.5 (2) 5.6 (2.5) | 9.5 | ~58.5 | 17–20 |
| 6 Buffer / write-up | 6.1–6.3 | 6–12 | ~65–70 | 21–24 |

**Projected finish: ~week 22–24** (vs. week 16 at 6 hrs/week). Estimates include reviewing and testing agent output; they are guesses until Phase 1 gives real data.

## Re-estimate checkpoints
- After Task 1.1 (Cypher spike): was it faster or slower than 2 hrs? Adjust Phase 3 up or down.
- After Phase 1: compare actual vs. estimated hours; recompute the finish date.

## Fallback cut order (not active — only if you later decide to trade scope for time)
Scope is not being cut now. If that changes, cut in this order:
1. 5.5 E2E test — 2 hrs
2. 4.4 Branch collapse/expand — 2 hrs
3. 4.1 Traditional layout / second view mode — 1 hr (+ ~1 hr of related polish)
4. Owner-only access (skip 3.5, 3.6, 3.7, 4.5) — ~7.5 hrs (~2.5 weeks). The true floor.

Cutting 1–3 saves ~5 hrs (~1.5 weeks); adding 4 saves ~4 weeks total.

## Actuals log
Add a row each session. Use it to recompute the projected finish at each checkpoint.

| Date | Task | Est. hrs | Actual hrs | Notes |
|---|---|---|---|---|
| 2026-10-20 | 1.1 Cypher spike | 2 | 1.5 | Done; found direct-line (distance 0) rule and path-explosion pitfall |
| 2026-10-20 | 1.2 Python scaffold | 1 | 0.75 | Done by agent; time = reviewing + running it |

## Open
- Hard deadline date: **TBD**. Not needed while scope is fixed, but it decides when cuts would become necessary.
