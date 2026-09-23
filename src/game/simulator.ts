import { Board } from "./types";
import { getDifficultyProfile } from "./difficulty";
import { generateInitialBoard } from "./generator";
import { addDeterministicRow } from "./addRowEngine";
import { findMatches, removeMatch, countCells } from "./matchEngine";

export type SimulationResult = {
  completed: boolean;
  seconds: number;
  adds: number;
  matches: number;
};

function chooseSimulatedMove(matches: ReturnType<typeof findMatches>, level: number, step: number) {
  // Calibration player: always chooses a legal move, with a deterministic
  // preference for harder-to-see geometry. This measures the algorithm,
  // not random clicking or a player failing to use an available match.
  const ranked = [...matches].sort((a, b) => {
    const score = (m: typeof a) =>
      (m.direction === "diagonal" ? 3 : 0) +
      (m.direction === "wrap" ? 2 : 0) +
      (m.kind === "sum10" ? 1 : 0) +
      ((m.a.row + m.b.row + m.a.col + m.b.col + level + step) % 2);
    return score(b) - score(a);
  });
  return ranked[0];
}

export function simulateLevel(level: number, seedOffset = 0): SimulationResult {
  const profile = getDifficultyProfile(level);
  let board = generateInitialBoard(level + seedOffset, profile);
  let seconds = 0;
  let adds = 0;
  let matches = 0;
  let unhelpfulAdds = 0;
  let steps = 0;

  while (countCells(board) > 0 && steps < 500) {
    const legal = findMatches(board);

    if (legal.length) {
      const chosen = chooseSimulatedMove(legal, level, steps);
      board = removeMatch(board, chosen);
      matches++;
      seconds += 0.65 + profile.friction * 0.75;
    } else if (adds < 6) {
      const result = addDeterministicRow(board, profile, level, adds, unhelpfulAdds);
      board = result.board;
      adds++;
      seconds += 2.5 + profile.friction * 2;
      unhelpfulAdds = result.rescued || result.stragglerHelped ? 0 : unhelpfulAdds + 1;
    } else {
      return { completed: false, seconds, adds, matches };
    }
    steps++;
  }

  return { completed: countCells(board) === 0, seconds, adds, matches };
}

export function monteCarlo(level: number, runs = 100) {
  const profile = getDifficultyProfile(level);
  const results = Array.from({ length: runs }, (_, i) => simulateLevel(level, i + 1));
  const completed = results.filter(r => r.completed);
  const withinTarget = completed.filter(r => r.seconds <= profile.targetSeconds).length;
  const avg = completed.length
    ? completed.reduce((sum, r) => sum + r.seconds, 0) / completed.length
    : 0;

  return {
    level,
    targetSeconds: profile.targetSeconds,
    runs,
    completionRate: completed.length / runs,
    withinTargetRate: withinTarget / runs,
    averageSeconds: Number(avg.toFixed(1))
  };
}
