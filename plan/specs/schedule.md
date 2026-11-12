# Schedule

**Scope is fixed at the full plan.** The schedule is a guide, not a requirement. Work hours are volatile, so ~3 hrs/week is a baseline; do more when possible and see how far it gets.
Hours are the real unit; week numbers are projections that slide with actual pace.
**Rule of thumb:** one 1–2 hr task per session.

## Estimated hours per task

| Phase | Tasks | Est. hrs | Cumulative hrs | Projected weeks (@3/wk) |
|---|---|---|---|---|
| 1 Backend foundations | 1.1 (2) 1.2 (1) 1.3 (1) 1.4 (1.5) 1.5 (1) 1.6 (1.5) 1.7 (1.5) 1.8 (1.5) 1.9 (1.5) 1.10 (2) 1.11 (1.5) | 16 | 16 | 1–6 |
| 2 Preliminary UI | 2.1 (1) 2.2 (1) 2.x (4) 2.y (2.5) 2.z (1) 2.3 (1.5) 2.4 (2) 2.5 (2) 2.6 (2.5) 2.7 (3.5) 2.8 (1.5) 2.9 (1.5) 2.10 (1.5) | 25.5 | 41.5 | 7–14 |
| 3 Algorithm, access, security | 3.1 (1.5) 3.2 (1.5) 3.3 (1.5) 3.4 (1.5) 3.5 (1.5) 3.6 (2) 3.7 (2) 3.8 (1.5) | 13 | 54.5 | 15–18 |
| 4 UI updates | 4.1 (2) 4.3 (1.5) 4.4 (3) 4.5 (2) 4.6 (1.5) | 10 | 64.5 | 19–22 |
| 5 Testing & deploy | 5.1 (1) 5.2 (1) 5.3 (1) 5.4 (2) 5.x (1.5) 5.5 (2) 5.6 (2.5) | 11 | ~75.5 | 23–25 |
| 6 Buffer / write-up | 6.1–6.3 | 6–12 | ~81.5–87.5 | 26–29 |

**Projected finish: ~week 27–29** (vs. week 16 at 6 hrs/week). Estimates include reviewing and testing agent output; they are guesses until real pace data accumulates.

**Re-estimated 2026-11-02, after Phase 1 and Tasks 2.1–2.2:** added 2.x visual design foundation (3 hrs) and 5.x frontend deployment (1.5 hrs); raised 2.7, 4.1 and 4.4 because Sigma.js is renderer-only, so the force layout, hierarchical layout and collapse/expand are assembled by hand instead of coming built in.

**Re-estimated 2026-11-04, after the UI mock-ups:** Phase 2 grew from 14.5 to 24.5 hrs and the projected finish moved by about two weeks. Added: 2.y backend work (marriage year, relatives endpoint, member counts), 2.8 Members page, 2.9 Member page, 2.10 Landing page; 2.x grew to 4 hrs for the Tailwind foundation, and 2.4–2.6 grew because the screens and add/edit/delete flows are richer than the old plain forms. Removed 4.2 (covered by 2.5, 2.6 and 2.9) and trimmed 4.6 to a consistency pass.

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
| 2026-10-21 | 1.3 Neo4j connection | 1.5 | 0.75 | Built, tested against real AuraDB |
| 2026-10-21 | 1.4 Seed script (20 people) | 1.5 | 0.5 | First version had a cousin-structure bug, caught and fixed; verified Eli/Ivy share grandparents |

## Open
- Hard deadline date: **TBD**. Not needed while scope is fixed, but it decides when cuts would become necessary.
