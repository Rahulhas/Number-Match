import type { Board, DifficultyProfile, Match } from "./types";
import { findMatches } from "./matchEngine";
import { hashSeed, mulberry32 } from "./random";

function blankRow() {
  return Array<number | null>(9).fill(null);
}

function occupiedCells(board: Board) {
  const cells: { row: number; col: number; value: number }[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < 9; c++) {
      const value = board[r][c];
      if (value !== null) cells.push({ row: r, col: c, value });
    }
  }
  return cells;
}

function partner(value: number) {
  return 10 - value;
}

function hasNewRowMatch(board: Board, rowIndex: number) {
  return findMatches(board).some(m => m.a.row === rowIndex || m.b.row === rowIndex);
}

export function addDeterministicRow(
  board: Board,
  profile: DifficultyProfile,
  level: number,
  addCount: number,
  consecutiveUnhelpfulAdds: number
): { board: Board; rescued: boolean; stragglerHelped: boolean } {
  const rng = mulberry32(hashSeed(level, 1000 + addCount * 31));
  const next = board.map(row => [...row]);
  const newRow = blankRow();
  const newRowIndex = next.length;
  next.push(newRow);

  // First priority: clear a one-cell straggler already on the board.
  const straggler = occupiedCells(board).find(cell =>
    board[cell.row].filter(v => v !== null).length === 1
  );
  let stragglerHelped = false;
  if (straggler) {
    const col = straggler.col < 8 ? straggler.col + 1 : 0;
    newRow[col] = partner(straggler.value);
    stragglerHelped = true;
  }

  // Rescue after two unhelpful additions: plant a legal sum-10 pair without forcing 5+5.
  const rescued = consecutiveUnhelpfulAdds >= 2;
  if (rescued) {
    const a = newRow.findIndex(v => v === null);
    const b = a < 8 ? a + 1 : a - 1;
    newRow[a] = 1;
    newRow[b] = 9;
  }

  // Fill the remaining row with four guaranteed pairs whenever possible.
  // This keeps every Add Row useful while friction changes where/which values appear.
  const occupied = occupiedCells(board);
  const availableCols = Array.from({ length: 9 }, (_, c) => c).filter(c => newRow[c] === null);
  let cursor = 0;
  while (availableCols.length - cursor >= 2) {
    const c1 = availableCols[cursor++];
    const c2 = availableCols[cursor++];
    const source = occupied.length ? occupied[Math.floor(rng() * occupied.length)] : { value: 5 };
    const value = Math.max(1, Math.min(9, source.value));
    newRow[c1] = value;
    newRow[c2] = partner(value);
  }

  // If one slot remains, choose a controlled decoy.
  for (let c = 0; c < 9; c++) {
    if (newRow[c] === null) newRow[c] = 1 + Math.floor(rng() * 9);
  }

  // Final safety: the appended row must participate in at least one legal match,
  // but it should never be forced into the visible 5+5 pattern.
  if (!hasNewRowMatch(next, newRowIndex)) {
    newRow[0] = 1;
    newRow[1] = 9;
  }

  return { board: next, rescued, stragglerHelped };
}
