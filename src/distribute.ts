import {TypedPriorityQueue} from "typedpriorityqueue";

interface Options<E> {
  elements: E[];
  getPriority: (e: E) => number;
}

interface OptionalOptions<E> {
  modifyCost: (element: E, cell: Cell) => number;
}

export type UserOpts<E> = Options<E> & Partial<OptionalOptions<E>>;

interface GridInfo {
  width: number;
  height: number;
  tiles: ValidTiles;
}

/*
cost policy:

if no element is placed the total cost is 1.
if all elements are placed perfectly the total cost is 0.

Assume an element has a ratio of 0.3. Placing it at the perfect spot, would reduce the cost at 0.3.
Not placing it all has a cost of 0.3. So assigning a cost to placing an element has to be in the
interval of [0, ratio]

*/

interface ElementWithRatio<E> {
  element: E;
  ratio: number;
}

interface PositionedTreeState<E> {
  type: "positioned";
  cost: number;
  gridMask: Uint8Array;
  remainingElements: Array<ElementWithRatio<E>>;
  solution: Array<Solution<E>>;
}

interface UnpositionedTreeState<E> {
  type: "unpositioned";
  cost: number;
  findPositions: () => Array<PositionedTreeState<E>>;
}

interface FinishedTreeState<E> {
  type: "finished";
  cost: number;
  solution: Array<Solution<E>>;
}

type TreeState<E> = PositionedTreeState<E> | UnpositionedTreeState<E>;

const meanMultipliers = (muls: number[]) => 1 - muls.reduce((n1, n2) => (1 - n1) * (1 - n2), 0);

const isFree = (
  left: number,
  top: number,
  width: number,
  height: number,
  gridMask: Uint8Array,
  grid: GridInfo
) => {
  for (let x = left; x < left + width; x += 1) {
    for (let y = top; y < top + height; y += 1) {
      if (gridMask[y * grid.width + x] === 1) return false;
    }
  }
  return true;
};

// const drawGrid = (mask: Uint8Array, width: number) => {
//   const s = [];
//   for (let y = 0; y < mask.length / width; y += 1) {
//     for (let x = 0; x < width; x += 1) s.push(mask[y * width + x] ? "X" : "0");
//     s.push("\n");
//   }
//   console.log(s.join(""));
// };

interface FindPositionsArgs<E> {
  state: PositionedTreeState<E>;
  ratioDiffMultiplier: number;
  tiles: Array<{width: number; height: number}>;
  elementWithRatio: ElementWithRatio<E>;
  grid: GridInfo;
}
const findPositions = <E>({
  state,
  ratioDiffMultiplier,
  tiles,
  elementWithRatio,
  grid,
}: FindPositionsArgs<E>) => {
  const validPositions: Array<PositionedTreeState<E>> = [];
  tiles.forEach(({width, height}) => {
    for (let left = 0; left <= grid.width - width; left += 1) {
      for (let top = 0; top <= grid.height - height; top += 1) {
        if (isFree(left, top, width, height, state.gridMask, grid)) {
          const xDistanceFromCenter = Math.abs(0.5 - (left + width / 2) / grid.width) * 0.02;
          const yDistanceFromCenter = Math.abs(0.5 - (top + height / 2) / grid.height) * 0.02;
          const costsMultipliers = [ratioDiffMultiplier, xDistanceFromCenter, yDistanceFromCenter];
          const gridMask = new Uint8Array(state.gridMask);
          for (let x = left; x < left + width; x += 1) {
            for (let y = top; y < top + height; y += 1) {
              gridMask[y * grid.width + x] = 1;
            }
          }

          validPositions.push({
            type: "positioned",
            cost: state.cost + meanMultipliers(costsMultipliers) * elementWithRatio.ratio,
            gridMask,
            remainingElements: state.remainingElements.slice(1),
            solution: [
              ...state.solution,
              {
                position: {
                  left,
                  top,
                  width,
                  height,
                },
                element: elementWithRatio.element,
              },
            ],
          });
        }
      }
    }
  });
  if (validPositions.length === 0) {
    validPositions.push({
      type: "positioned",
      cost: state.cost + elementWithRatio.ratio,
      gridMask: state.gridMask,
      remainingElements: state.remainingElements.slice(1),
      solution: state.solution,
    });
  }
  return validPositions;
};

const explore = <E>(state: TreeState<E>, add: (newState: TreeState<E>) => void, grid: GridInfo) => {
  if (state.type === "unpositioned") {
    state.findPositions().forEach(s => add(s));
  } else {
    const elementWithRatio = state.remainingElements[0];
    if (!elementWithRatio) return;
    const {ratio} = elementWithRatio;
    Object.values(grid.tiles).forEach(({areaRatio, tiles}) => {
      const ratioDiff = Math.max(areaRatio / ratio, ratio / areaRatio);
      // ratioDiff: 2 if tileRatio is twice or half as big as elementRatio
      // dont add cost if ratioDiff = 1
      // if ratioDiff = 1 -> (1 - 1) * elementRatio -> 0 * elementRatio
      // if ratioDiff = 3 -> (1 - 0.33) * elementRatio -> 0.66 * elementRatio
      // if ratioDiff = 10 -> (1 - 0.1) * elementRatio -> 0.9 * elementRatio
      const ratioDiffMultiplier = (1 - 1 / ratioDiff) * 0.1;
      add({
        type: "unpositioned",
        cost: state.cost + ratioDiffMultiplier * ratio,
        findPositions: () =>
          findPositions({state, ratioDiffMultiplier, tiles, elementWithRatio, grid}),
      });
    });
  }
};

const defaultOpts: OptionalOptions<any> = {
  modifyCost: () => 1,
};

const distribute = <E>(userOpts: UserOpts<E>, grid: GridInfo) => {
  const opts = {
    ...defaultOpts,
    ...userOpts,
  };

  let prioSum = 0;
  const elsWithPrio = opts.elements.map(e => {
    const prio = opts.getPriority(e);
    prioSum += prio;
    return {element: e, ratio: prio};
  });
  elsWithPrio.sort((s1, s2) => s2.ratio - s1.ratio);
  elsWithPrio.forEach(ewp => (ewp.ratio = ewp.ratio / prioSum));

  const initialState: TreeState<E> = {
    type: "positioned",
    cost: 0,
    gridMask: new Uint8Array(grid.width * grid.height),
    remainingElements: elsWithPrio,
    solution: [],
  };

  const queue = new TypedPriorityQueue<TreeState<E> | FinishedTreeState<E>>(
    (s1, s2) => s1.cost < s2.cost
  );
  queue.add(initialState);
  // let iterationCount = 0;
  while (true) {
    // iterationCount += 1;
    const next = queue.poll();
    if (!next) return null;
    if (next.type === "finished") {
      // console.log("iterations", iterationCount);
      return next.solution;
    }
    if (next.type === "positioned" && next.remainingElements.length === 0) {
      let openSpots = 0;
      next.gridMask.forEach(c => (openSpots += 1 - c));
      queue.add({
        type: "finished",
        cost: next.cost + (openSpots / (grid.width * grid.height)) * 0.5,
        solution: next.solution,
      });
    }
    explore(next, s => queue.add(s), grid);
  }
};

export default distribute;
