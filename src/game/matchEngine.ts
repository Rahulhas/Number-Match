import { Board, Match, Position } from "./types";

function relation(a: number, b: number): Match["kind"] | null {
  if (a === b) return "same";
  if (a + b === 10) return "sum10";
  return null;
}

function isDiagonal(a: Position, b: Position) {
  return Math.abs(a.row - b.row) === Math.abs(a.col - b.col) && a.row !== b.row;
}

function isWrap(a: Position, b: Position, cols: number) {
  if (cols < 2) return false;
  const sameRowEdge = a.row === b.row &&
    ((a.col === 0 && b.col === cols - 1) || (b.col === 0 && a.col === cols - 1));
  const adjacentRowEdge =
    (a.col === cols - 1 && b.col === 0 && Math.abs(a.row - b.row) === 1) ||
    (b.col === cols - 1 && a.col === 0 && Math.abs(a.row - b.row) === 1);
  return sameRowEdge || adjacentRowEdge;
}

function direction(a: Position, b: Position, cols: number): Match["direction"] | null {
  if (a.row === b.row) return "horizontal";
  if (a.col === b.col) return "vertical";
  if (isDiagonal(a, b)) return "diagonal";
  if (isWrap(a, b, cols)) return "wrap";
  return null;
}

export function findMatches(board: Board): Match[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 9;
  const occupied: Position[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== null) occupied.push({ row: r, col: c });
    }
  }

  const matches: Match[] = [];
  for (let i = 0; i < occupied.length; i++) {
    for (let j = i + 1; j < occupied.length; j++) {
      const a = occupied[i], b = occupied[j];
      const kind = relation(board[a.row][a.col]!, board[b.row][b.col]!);
      if (!kind) continue;
      const dir = direction(a, b, cols);
      if (!dir) continue;
      matches.push({ a, b, kind, direction: dir });
    }
  }
  return matches;
}

export function removeMatch(board: Board, match: Match): Board {
  const next = board.map(row => [...row]);
  next[match.a.row][match.a.col] = null;
  next[match.b.row][match.b.col] = null;
  return compactBoard(next);
}

export function compactBoard(board: Board): Board {
  return board.filter(row => row.some(cell => cell !== null));
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

export function countCells(board: Board) {
  return board.flat().filter(v => v !== null).length;
}

export function hasMatch(board: Board) {
  return findMatches(board).length > 0;
}

export function ensureBoardPlayable(board: Board): Board {
  const next = compactBoard(cloneBoard(board));
  if (findMatches(next).length > 0) return next;

  const rows = next.length || 1;
  const cols = next[0]?.length ?? 9;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (next[r] && next[r][c] === null && next[r][c + 1] === null) {
        next[r][c] = 1;
        next[r][c + 1] = 9;
        return next;
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (!next[r] || next[r][c] === null || next[r][c + 1] === null) continue;
      const a = next[r][c];
      const b = next[r][c + 1];
      next[r][c] = 1;
      next[r][c + 1] = 9;
      if (findMatches(next).length > 0) return next;
      next[r][c] = a;
      next[r][c + 1] = b;
    }
  }

  const fallbackRow = Array<number | null>(9).fill(null);
  fallbackRow[0] = 1;
  fallbackRow[1] = 9;
  next.push(fallbackRow);
  return next;
}

export function scoreMatch(match: Match): number {
  return match.kind === "sum10" ? 2 : 1;
}
