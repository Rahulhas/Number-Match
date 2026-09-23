export type Cell = number | null;
export type Board = Cell[][];

export type Position = {
  row: number;
  col: number;
};

export type Match = {
  a: Position;
  b: Position;
  kind: "same" | "sum10";
  direction: "horizontal" | "vertical" | "diagonal" | "wrap";
};

export type DifficultyProfile = {
  level: number;
  targetSeconds: number;
  density: number;
  friction: number;
  addRowPressure: number;
  idealAdds: number;
  relief: boolean;
};
