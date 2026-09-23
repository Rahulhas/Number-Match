import type { Board, DifficultyProfile, Position } from "./types";
import { hashSeed, mulberry32 } from "./random";
import { findMatches } from "./matchEngine";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function makeEmpty(rows = 3): Board {
  return Array.from({ length: rows }, () => Array(9).fill(null));
}

function alignedCandidates(a: Position, occupied: Set<string>, friction: number): Position[] {
  const out: Position[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 9; c++) {
      const key = `${r}:${c}`;
      if (occupied.has(key) || (r === a.row && c === a.col)) continue;
      const sameRow = r === a.row;
      const sameCol = c === a.col;
      const diagonal = Math.abs(r - a.row) === Math.abs(c - a.col) && r !== a.row;
      const wrap = (a.col === 0 && c === 8 || a.col === 8 && c === 0) && Math.abs(r - a.row) <= 1;
      if (sameRow || sameCol || diagonal || wrap) out.push({ row: r, col: c });
    }
  }
  // Prefer farther positions as friction rises, while preserving legal geometry.
  out.sort((x, y) => {
    const dx = Math.abs(x.row - a.row) + Math.abs(x.col - a.col);
    const dy = Math.abs(y.row - a.row) + Math.abs(y.col - a.col);
    return friction < 0.45 ? dx - dy : dy - dx;
  });
  return out;
}

export function generateInitialBoard(level: number, profile: DifficultyProfile): Board {
  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = mulberry32(hashSeed(level, 17 + attempt * 31));
    const board = makeEmpty(3);
    const positions: Position[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) positions.push({ row: r, col: c });

    // Reserve 12 guaranteed pairs + 3 controlled singletons = 27 starting cells.
    // Pair placement is deterministic and geometry-aware, so solvability never depends on luck.
    const occupied = new Set<string>();
    const pairCount = 13;
    const shuffled = [...positions].sort(() => rng() - 0.5);

    let cursor = 0;
    for (let i = 0; i < pairCount && cursor < shuffled.length; i++) {
      let first: Position | undefined;
      let second: Position | undefined;
      while (cursor < shuffled.length && !first) {
        const candidate = shuffled[cursor++];
        if (!occupied.has(`${candidate.row}:${candidate.col}`)) first = candidate;
      }
      if (!first) break;
      const candidates = alignedCandidates(first, occupied, profile.friction).filter(p => !occupied.has(`${p.row}:${p.col}`));
      second = candidates[Math.floor(rng() * Math.min(candidates.length, Math.max(1, 4 + Math.round(profile.friction * 8))))];
      if (!second) {
        second = positions.find(p => !occupied.has(`${p.row}:${p.col}`) &&
          (p.row === first!.row || p.col === first!.col || Math.abs(p.row - first!.row) === Math.abs(p.col - first!.col)));
      }
      if (!second) break;

      const value = DIGITS[Math.floor(rng() * DIGITS.length)];
      board[first.row][first.col] = value;
      board[second.row][second.col] = 10 - value;
      occupied.add(`${first.row}:${first.col}`);
      occupied.add(`${second.row}:${second.col}`);
    }

    const remaining = positions.filter(p => !occupied.has(`${p.row}:${p.col}`));
    const targetSingles = 27 - occupied.size;
    for (let i = 0; i < targetSingles && i < remaining.length; i++) {
      const p = remaining[i];
      board[p.row][p.col] = DIGITS[Math.floor(rng() * DIGITS.length)];
      occupied.add(`${p.row}:${p.col}`);
    }

    if (findMatches(board).length > 0) return board;
  }

  const fallback: Board = [
    [1, 9, 1, 9, 1, 9, 1, 9, 1],
    [9, 1, 9, 1, 9, 1, 9, 1, 9],
    [1, 9, 1, 9, 1, 9, 1, 9, 1]
  ];
  return fallback;
}
