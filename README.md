# Number Match — Phase 7

React Native/Expo prototype implementing the deterministic difficulty system from the supplied assignment and the agreed reference-game behavior.

## Locked behavior

- 9-column board.
- Initial board: 3 filled rows.
- Empty cells remain empty after a match; numbers do not compact.
- Valid matches:
  - equal numbers;
  - two numbers summing to 10.
- Matching supports horizontal, vertical, both diagonals, and the agreed wrap-around cases.
- Empty cells do not block a line.
- Add Row adds exactly 9 numbers.
- Six Add Row uses per level.
- Add Row is deterministic and board-aware rather than uncontrolled RNG.
- Rescue trigger after two consecutive Add Rows without a useful match.
- Straggler cleanup prioritizes rows with one remaining number.
- Sawtooth difficulty:
  - 1–5 rises;
  - 6 relief;
  - 7–10 rises;
  - 11 relief.
- Visible count-up timer is informational only.
- Completion opens a Next Level modal.
- Level generation uses a deterministic seed derived from level number.
- A Monte-Carlo calibration helper is included for target-time validation.

## Run

```bash
npm install
npm start
```

Then press `a` for Android in the Expo terminal, or run:

```bash
npm run android
```

For an APK, configure an Expo/EAS Android build after installing the dependencies.

## Algorithm summary

1. Build a level profile from the sawtooth difficulty curve.
2. Generate a deterministic 3-row board.
3. Plant guaranteed solvable match structures.
4. Add controlled decoys according to the profile.
5. Validate that at least one legal match exists.
6. During Add Row, inspect the live board.
7. Prioritize:
   - straggler cleanup,
   - rescue if the player has used two rows without finding a useful match,
   - otherwise a controlled helpful match plus decoys.
8. The simulator models player choice and estimates completion time so profiles can be tuned toward the assignment's target-time bands.

The timer displayed to the player is not used as a win/loss condition.

## Phase 8 validation
Run the engine-only validation with:

```bash
tsc -p tsconfig.game.json
node dist-game/testRunner.js
```

The validation currently passes deterministic generation, initial solvability, six Add Row safety, Rescue, and the sawtooth profile. The 95% target-time calibration gate is intentionally not marked complete yet; the current simulation is below that requirement and is recorded in `PHASE8_TEST_REPORT.md`.
