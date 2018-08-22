import {ValidTiles} from "./setupGrid";

interface Cell {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Options<E> {
  elements: E[];
  getPriority: (e: E) => number;
}

interface OptionalOptions<E> {
  modifyCost: (element: E, cell: Cell) => number;
}

const defaultOpts: OptionalOptions<any> = {
  modifyCost: () => 1,
};

export type UserOpts<E> = Options<E> & Partial<OptionalOptions<E>>;

interface GridInfo {
  width: number;
  height: number;
  tiles: ValidTiles;
}

const distribute = <E>(userOpts: UserOpts<E>, grid: GridInfo) => {
  const opts = {
    ...defaultOpts,
    ...userOpts,
  };
};

export default distribute;
