# Number Match Game

Number Match Game is a deterministic number-matching puzzle built with React Native and Expo. The game keeps a controlled, reproducible board state while enforcing the matching rules, level pressure, and Add Row safety logic described in the project specification.

## Core rules

- Board size is 9 columns.
- Each level begins with a 3-row board.
- Empty cells remain empty after a match; they do not compact.
- Valid matches are:
  - equal numbers;
  - two numbers that sum to 10.
- Matches can form horizontally, vertically, diagonally, and in the approved wrap-around cases.
- Empty cells do not block a valid line.
- Each level allows six Add Row actions.
- Add Row is deterministic and board-aware instead of using unbounded random placement.
- Rescue logic triggers after two consecutive Add Rows without a useful recovery.
- Straggler cleanup prioritizes rows with a single remaining number.
- The visible countdown timer is informational only and is not used as a win/loss condition.

## Gameplay flow

1. A level profile is generated from the sawtooth difficulty curve.
2. A deterministic starting board is created.
3. The generator plants legal match structures and fills the rest with controlled decoys.
4. The board is validated to ensure the level is solvable before play begins.
5. When the player uses Add Row, the board is inspected first to avoid dead states.
6. The engine chooses a helpful move, a rescue move, or a straggler cleanup move depending on the board state.
7. The simulator can estimate completion time and tune the difficulty profile toward the expected time bands.

## Getting started

```bash
npm install
npm start
```

Then run the app in the Expo terminal, or launch Android directly with:

```bash
npm run android
```

## Validation

Run the engine validation with:

```bash
npx tsc -p tsconfig.game.json
node dist-game/testRunner.js
```

This verifies the generator, solvability checks, Add Row safety, rescue behavior, and difficulty profile logic.

## Project structure

- App.tsx — app shell and UI entry
- src/game — deterministic game engine, difficulty profile, and test logic
- tsconfig.game.json — engine-only TypeScript validation config
- package.json — project scripts and dependencies

## Notes

This project focuses on deterministic logic and reproducible level behavior. The level generation remains stable across runs, which makes simulation and validation much easier than a fully random board system.
