# Deterministic Difficulty Algorithm — Phase 7

## 1. Initial board

Each level starts with a 9-column, 3-row board. A deterministic seed is derived from the level number, so the same level is reproducible. The generator plants guaranteed legal match structures and then fills remaining cells with controlled decoys.

The generator validates that the final board has at least one legal match.

## 2. Match model

A pair is legal when:
- both cells contain numbers;
- the values are equal, or their sum is 10;
- the cells lie on a supported horizontal, vertical, diagonal, or agreed wrap-around line.

Empty cells are preserved and do not compact.

## 3. Add Row

Each level has six Add Row uses. Before generating a row, the engine inspects the live board.

Priority:
1. If a row has only one remaining number, create a partner for that straggler.
2. If the player has used two consecutive Add Rows without a useful recovery, trigger Rescue and plant an immediate legal pair.
3. Otherwise generate a useful pair according to the current friction value, then fill remaining positions with controlled decoys.

The row is checked before being committed so an Add Row does not accidentally create a dead board.

## 4. Sawtooth difficulty

The difficulty profile is generated from the assignment anchors:
- Level 1: easy, 45-second target, high match density.
- Level 3: normal, 90-second target.
- Level 5: hard, 150-second target, more decoys.
- Level 6: relief, approximately Level 3 difficulty.
- Levels 7–10: increasing pressure above the Level 5 peak.
- Level 11: relief.

The target time is a calibration target, not a countdown.

## 5. Probability calibration

`src/game/simulator.ts` contains a Monte-Carlo helper. It runs many deterministic level simulations with varied seeds, measures completion time, completion rate, Add Row use, and average time, and exposes the fraction completed within the target.

This is the validation layer to tune the difficulty profiles toward the assignment's required probability band. The player-facing timer is informational only.

## 6. Why this avoids uncontrolled RNG

Random-looking boards are still deterministic because the seed is derived from level and generation event. The generator chooses numbers only after inspecting the current board and difficulty profile. This keeps the experience reproducible while allowing controlled variation between levels and simulations.
