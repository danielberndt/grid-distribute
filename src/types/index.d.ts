type ValidTiles = {
  [area: number]: {areaRatio: number; tiles: {width: number; height: number}[]};
};

interface Cell {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Solution<E> {
  position: Cell;
  element: E;
}
