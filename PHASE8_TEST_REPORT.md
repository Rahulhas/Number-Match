# Phase 8 — Deterministic Engine Test Report

## Source basis
The Phase 8 validation follows the supplied assignment requirements: 9-column dynamic grid, three filled starting rows, six Add Row uses, deterministic seeding, Rescue after two unhelpful Add Rows, Straggler Cleanup, sawtooth difficulty, and 95% target-time probability as the calibration goal.

## Tests executed
1. TypeScript compilation of all `src/game` engine files using `tsconfig.game.json`.
2. Determinism test for Levels 1–11.
3. Initial board cell-count test: 27 occupied cells.
4. Initial solvability test: at least one legal match.
5. Six Add Row contract test.
6. Add Row dead-board prevention test.
7. Rescue test after two unhelpful additions.
8. Sawtooth target-time profile test.
9. 200 deterministic simulation runs per level for calibration smoke testing.

## Results
- Deterministic 27-cell starts: PASS.
- Initial legal match exists for Levels 1–11: PASS.
- Six Add Row operations preserve a playable board: PASS.
- Rescue creates an immediate legal match: PASS.
- Sawtooth target-time anchors: PASS.
- 95% target-time probability: NOT YET MET.

## Calibration snapshot (200 runs/level)
The current engine is between roughly 67% and 82% completion in the calibration model. This is deliberately recorded as a failing calibration gate rather than presenting the result as 95%.

The next tuning task is to reconcile the assignment's 27-cell starting state and 9-cell Add Row behavior with the agreed matching semantics before claiming the 95% requirement. The engine must not simply inflate the simulated success rate by changing the acceptance criterion.

## Phase 8 gate
**Engine correctness: PASS**

**95% calibration gate: FAIL / tuning required**
