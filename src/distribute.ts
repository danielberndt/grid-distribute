import {TypedPriorityQueue} from "typedpriorityqueue";
import {Solution, ValidTiles, Cell} from "./types";

interface Options<E> {
  elements: E[];
  getPriority: (e: E) => number;
}

interface CostsOfPlacementArg<E> {
  element: E;
  position: Cell;
  grid: GridInfo;
  ratioDiffMultiplier: number;
}

interface OptionalOptions<E> {
  costOfUnexplored: (element: E) => number;
  costOfEmptyCell: number;
  ratioDiffWeight: number;
  costsOfPlacement: (opts: CostsOfPlacementArg<E>) => number[];
  skipMultiplier: (element: E) => number;
}

export type UserOptions<E> = Options<E> & Partial<OptionalOptions<E>>;
type FullOptions<E> = Options<E> & OptionalOptions<E>;

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
  realCost: number;
  estimatedCost: number;
  gridMask: Uint8Array;
  remainingElements: Array<ElementWithRatio<E>>;
  solution: Array<Solution<E>>;
}

interface UnpositionedTreeState<E> {
  type: "unpositioned";
  realCost: number;
  estimatedCost: number;
  findPositions: () => Array<PositionedTreeState<E>>;
}

interface FinishedTreeState<E> {
  type: "finished";
  realCost: number;
  estimatedCost: number;
  solution: Array<Solution<E>>;
}

type TreeState<E> = PositionedTreeState<E> | UnpositionedTreeState<E>;

const meanMultipliers = (muls: number[]) => 1 - muls.reduce((p, n) => p * (1 - n), 1);
const costOfRemaining = <E>(elements: Array<ElementWithRatio<E>>, opts: FullOptions<E>) =>
  elements.reduce((sum, el) => sum + el.ratio * opts.costOfUnexplored(el.element), 0);

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
  opts: FullOptions<E>;
}
const findPositions = <E>({
  state,
  ratioDiffMultiplier,
  tiles,
  elementWithRatio,
  grid,
  opts,
}: FindPositionsArgs<E>) => {
  const validPositions: Array<PositionedTreeState<E>> = [];
  // console.log(`  find ${tiles[0].width * tiles[0].height} area`);
  const remaining = state.remainingElements.slice(1);
  const remainingCost = costOfRemaining(remaining, opts);
  tiles.forEach(({width, height}) => {
    for (let left = 0; left <= grid.width - width; left += 1) {
      for (let top = 0; top <= grid.height - height; top += 1) {
        if (isFree(left, top, width, height, state.gridMask, grid)) {
          const gridMask = new Uint8Array(state.gridMask);
          for (let x = left; x < left + width; x += 1) {
            for (let y = top; y < top + height; y += 1) {
              gridMask[y * grid.width + x] = 1;
            }
          }
          const position = {left, top, width, height};
          const costsMultipliers = opts.costsOfPlacement({
            ratioDiffMultiplier,
            element: elementWithRatio.element,
            position,
            grid,
          });
          const cost = state.realCost + meanMultipliers(costsMultipliers) * elementWithRatio.ratio;

          validPositions.push({
            type: "positioned",
            realCost: cost,
            estimatedCost: cost + remainingCost,
            gridMask,
            remainingElements: remaining,
            solution: [
              ...state.solution,
              {
                position,
                element: elementWithRatio.element,
              },
            ],
          });
        }
      }
    }
  });
  if (validPositions.length === 0) {
    const cost =
      state.realCost + opts.skipMultiplier(elementWithRatio.element) * elementWithRatio.ratio;
    validPositions.push({
      type: "positioned",
      realCost: cost,
      estimatedCost: cost + remainingCost,
      gridMask: state.gridMask,
      remainingElements: remaining,
      solution: state.solution,
    });
  }
  return validPositions;
};

const explore = <E>(
  state: TreeState<E>,
  add: (newState: TreeState<E>) => void,
  grid: GridInfo,
  opts: FullOptions<E>
) => {
  if (state.type === "unpositioned") {
    state.findPositions().forEach(s => add(s));
  } else {
    const elementWithRatio = state.remainingElements[0];
    if (!elementWithRatio) return;
    const {ratio} = elementWithRatio;
    Object.values(grid.tiles).forEach(({areaRatio, tiles}) => {
      const ratioDiff = 1 - Math.min(areaRatio / ratio, ratio / areaRatio);
      // ratioDiff: 2 if tileRatio is twice or half as big as elementRatio
      // dont add cost if ratioDiff = 1
      // if ratioDiff = 1 -> (1 - 1) * elementRatio -> 0 * elementRatio
      // if ratioDiff = 3 -> (1 - 0.33) * elementRatio -> 0.66 * elementRatio
      // if ratioDiff = 10 -> (1 - 0.1) * elementRatio -> 0.9 * elementRatio
      const ratioDiffMultiplier = ratioDiff * opts.ratioDiffWeight;
      add({
        type: "unpositioned",
        realCost: state.realCost,
        estimatedCost:
          state.realCost +
          ratioDiffMultiplier * ratio +
          costOfRemaining(state.remainingElements.slice(1), opts),
        findPositions: () =>
          findPositions({state, ratioDiffMultiplier, tiles, elementWithRatio, grid, opts}),
      });
    });
  }
};

export const defaultCostsOfPlacement = <E>(opts: CostsOfPlacementArg<E>) => {
  const {ratioDiffMultiplier, position, grid} = opts;
  const xDistanceFromCenter =
    Math.abs(0.5 - (position.left + position.width / 2) / grid.width) * 0.02;
  const yDistanceFromCenter =
    Math.abs(0.5 - (position.top + position.height / 2) / grid.height) * 0.02;
  return [ratioDiffMultiplier, xDistanceFromCenter, yDistanceFromCenter];
};

const defaultOpts: OptionalOptions<any> = {
  costOfUnexplored: () => 0.5,
  costOfEmptyCell: 0.75,
  ratioDiffWeight: 0.1,
  costsOfPlacement: defaultCostsOfPlacement,
  skipMultiplier: () => 1,
};

const distribute = <E>(userOpts: UserOptions<E>, grid: GridInfo) => {
  const opts = {...defaultOpts, ...userOpts};

  let prioSum = 0;
  let minPrio = 0;
  const elsWithPrio = opts.elements.map(e => {
    const prio = opts.getPriority(e);
    minPrio = Math.min(prio, minPrio);
    prioSum += prio;
    return {element: e, ratio: prio};
  });
  if (minPrio < 0) {
    elsWithPrio.forEach(ewp => {
      ewp.ratio = ewp.ratio - minPrio;
      prioSum -= minPrio;
    });
  }
  elsWithPrio.sort((s1, s2) => s2.ratio - s1.ratio);
  elsWithPrio.forEach(ewp => (ewp.ratio = ewp.ratio / prioSum));

  const initialState: TreeState<E> = {
    type: "positioned",
    realCost: 0,
    estimatedCost: costOfRemaining(elsWithPrio, opts),
    gridMask: new Uint8Array(grid.width * grid.height),
    remainingElements: elsWithPrio,
    solution: [],
  };

  const queue = new TypedPriorityQueue<TreeState<E> | FinishedTreeState<E>>(
    (s1, s2) => s1.estimatedCost < s2.estimatedCost
  );
  queue.add(initialState);
  // let iterationCount = 0;
  while (true) {
    // iterationCount += 1;
    const next = queue.poll();
    if (!next) return null;
    // console.log(`[head] estd: ${next.estimatedCost.toFixed(3)} real: ${next.realCost.toFixed(3)}`);
    // if (next.type === "positioned") {
    //   drawGrid(next.gridMask, grid.width);
    // }
    if (next.type === "finished") {
      // console.log("finished", next.estimatedCost.toFixed(3));
      // console.log("iterations", iterationCount);
      return next.solution;
    }
    if (next.type === "positioned" && next.remainingElements.length === 0) {
      let openSpots = 0;
      next.gridMask.forEach(c => (openSpots += 1 - c));
      const cost = next.realCost + (openSpots / (grid.width * grid.height)) * opts.costOfEmptyCell;
      queue.add({
        type: "finished",
        realCost: cost,
        estimatedCost: cost,
        solution: next.solution,
      });
    }
    explore(next, s => queue.add(s), grid, opts);
  }
};

export default distribute;
