export interface ValidTiles {
  [area: number]: {areaRatio: number; tiles: Array<{width: number; height: number}>};
}

export interface Cell {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Solution<E> {
  position: Cell;
  element: E;
}
