# Number Match Game Algorithm Writeup

## Overview

The game engine is designed to be deterministic, board-aware, and safe under repeated Add Row use. Instead of relying on uncontrolled randomness, the system derives board state from the level number and the current board condition. This makes the game reproducible while still creating the sense of variability expected from a puzzle progression.

## 1. Board generation

Each level begins with a 9-column, 3-row board. The generator derives a stable seed from the level number and then creates a board by:

- planting guaranteed legal match structures;
- filling the remaining cells with controlled decoys;
- validating that at least one legal match exists before the board is handed to the player.

This ensures the starting setup is playable and consistent from run to run.

## 2. Match evaluation

A move is valid when:

- both cells contain numbers;
- the values are equal, or their sum is 10;
- the paired cells are aligned on a supported horizontal, vertical, diagonal, or approved wrap-around line.

Empty cells are preserved and never compacted. This matters because the engine must reason about the true board state rather than an implicit collapsed grid.

## 3. Add Row logic

Each level gives the player six Add Row actions. Before a new row is added, the engine checks the live board and enforces a priority order:

1. Straggler cleanup: if a row has only one remaining number, the engine creates a partner for it.
2. Rescue: if the player has used two consecutive Add Rows without a useful recovery, the engine inserts a guaranteed playable line.
3. Helpful pair generation: otherwise, the system creates a useful match and then fills the rest of the row with controlled decoys.
4. Safety validation: the resulting row is rejected if it creates a dead or unplayable board.

This keeps the game from drifting into a state where the player has no legal moves available.

## 4. Difficulty model

The difficulty profile follows a sawtooth pattern:

- Levels 1–5 rise in pressure.
- Level 6 offers a relief step.
- Levels 7–10 increase again.
- Level 11 returns to a lower pressure state.

This creates a rhythm of rising challenge and brief recovery, while keeping the pressure curve predictable and testable.

## 5. Simulation and calibration

The simulator in src/game/simulator.ts runs deterministic scenarios against the engine to estimate:

- completion time;
- completion rate;
- Add Row usage;
- average time-to-solve.

These measured values are used to tune the difficulty curve toward the target band without relying on uncontrolled randomness.

## 6. Why the engine is stable

The project avoids an arbitrary RNG-driven puzzle model. The board is generated from a deterministic seed and the current state of the board itself. That means each level is reproducible, testable, and easier to validate with automated checks.

In short, the algorithm balances fairness, solvability, controlled challenge, and deterministic reproducibility.
