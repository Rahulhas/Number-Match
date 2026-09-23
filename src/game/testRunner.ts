import { generateInitialBoard } from "./generator";
import { getDifficultyProfile } from "./difficulty";
import { findMatches, removeMatch, countCells, ensureBoardPlayable } from "./matchEngine";
import { addDeterministicRow } from "./addRowEngine";
import { monteCarlo } from "./simulator";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function runPhase8Tests() {
  const report: string[] = [];

  // Determinism + solvability.
  for (let level = 1; level <= 11; level++) {
    const profile = getDifficultyProfile(level);
    const a = generateInitialBoard(level, profile);
    const b = generateInitialBoard(level, profile);
    assert(JSON.stringify(a) === JSON.stringify(b), `Level ${level} is not deterministic`);
    assert(countCells(a) === 27, `Level ${level} does not start with 27 cells`);
    assert(findMatches(a).length > 0, `Level ${level} starts dead`);
  }
  report.push("PASS: deterministic 27-cell solvable starts for Levels 1–11");

  // Add Row contract + six-use flow.
  let board = generateInitialBoard(1, getDifficultyProfile(1));
  for (let i = 0; i < 6; i++) {
    const before = countCells(board);
    const result = addDeterministicRow(board, getDifficultyProfile(1), 1, i, i >= 2 ? 2 : 0);
    board = result.board;
    assert(countCells(board) >= before + 1, `Add Row ${i + 1} failed to add cells`);
    assert(board.length === 3 + i + 1, `Add Row ${i + 1} did not append one row`);
    assert(findMatches(board).length > 0, `Add Row ${i + 1} left a dead board`);
  }
  report.push("PASS: six Add Row operations preserve a playable board");

  // Rescue must create an immediate match in the appended row.
  const base = generateInitialBoard(1, getDifficultyProfile(1));
  const rescued = addDeterministicRow(base, getDifficultyProfile(1), 1, 2, 2);
  const rescueMatches = findMatches(rescued.board).filter(m => m.a.row === 3 || m.b.row === 3);
  assert(rescueMatches.length > 0, "Rescue did not create an immediate new-row match");
  assert(rescued.rescued, "Rescue flag was not reported");
  report.push("PASS: Rescue creates an immediate legal match after two unhelpful Add Rows");

  // Dead-board recovery: removing the final legal move must never leave a stuck board.
  const trapBoard: Array<Array<number | null>> = [
    [5, 5, null, null, null, null, null, null, null],
    [2, 4, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null]
  ];
  const legal = findMatches(trapBoard);
  assert(legal.length > 0, "Trap board should contain a legal move");
  const recovered = ensureBoardPlayable(removeMatch(trapBoard, legal[0]));
  assert(findMatches(recovered).length > 0, "Board recovery did not restore a legal move");
  report.push("PASS: dead-board recovery keeps the board playable");

  const partialRowBoard: Array<Array<number | null>> = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [2, null, 4, 5, 6, 7, 8, 9, 1],
    [9, 8, 7, 6, 5, 4, 3, 2, 1]
  ];
  const compacted = removeMatch(partialRowBoard, { a: { row: 0, col: 0 }, b: { row: 0, col: 1 }, kind: "same", direction: "horizontal" });
  assert(compacted.length === 3, "Only a fully empty row should be removed");
  assert(compacted[0].slice(2).every(cell => cell !== null), "A row that still has content must remain");
  assert(compacted[1].includes(null), "A partially empty row should remain in play");
  report.push("PASS: only fully empty rows are removed");

  // Calibration smoke test.
  const calibration = Array.from({ length: 11 }, (_, i) => monteCarlo(i + 1, 200));
  const monotonicWave = calibration[0].targetSeconds < calibration[1].targetSeconds &&
    calibration[1].targetSeconds < calibration[2].targetSeconds &&
    calibration[2].targetSeconds < calibration[3].targetSeconds &&
    calibration[3].targetSeconds < calibration[4].targetSeconds &&
    calibration[5].targetSeconds < calibration[4].targetSeconds &&
    calibration[6].targetSeconds < calibration[7].targetSeconds &&
    calibration[7].targetSeconds < calibration[8].targetSeconds &&
    calibration[8].targetSeconds < calibration[9].targetSeconds &&
    calibration[10].targetSeconds < calibration[9].targetSeconds;
  assert(monotonicWave, "Sawtooth target-time anchors are inconsistent");
  report.push("PASS: sawtooth target-time profile verified");

  return { report, calibration };
}

if (require.main === module) {
  const result = runPhase8Tests();
  console.log(result.report.join("\n"));
  console.log(JSON.stringify(result.calibration, null, 2));
}
