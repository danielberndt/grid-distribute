import distribute, {UserOptions} from "./distribute";
import {ValidTiles} from "./types";

interface GridOptions {
  width: number;
  height: number;
}

interface OptionalGridOptions {
  maxRatio: number;
  minRatio: number;
}

type FullGridOptions = GridOptions & OptionalGridOptions;

const findValidTiles = ({width, height, minRatio, maxRatio}: FullGridOptions) => {
  const tiles: ValidTiles = {};
  const fullArea = width * height;
  for (let w = width; w >= 1; w -= 1) {
    for (let h = height; h >= 1; h -= 1) {
      const ratio = w / h;
      if (ratio >= minRatio && ratio <= maxRatio) {
        const dim = {width: w, height: h};
        const info = tiles[w * h];
        if (info) {
          info.tiles.push(dim);
        } else {
          tiles[w * h] = {areaRatio: (w * h) / fullArea, tiles: [dim]};
        }
      }
    }
  }
  return tiles;
};

const defaultGridOpts: OptionalGridOptions = {
  maxRatio: 2,
  minRatio: 0.5,
};

const setupGrid = (userOpts: GridOptions & Partial<OptionalGridOptions>) => {
  const opts = {
    ...defaultGridOpts,
    ...userOpts,
  };

  const tiles = findValidTiles(opts);

  return {
    tiles,
    distribute: <E>(distUserOpts: UserOptions<E>) =>
      distribute(distUserOpts, {tiles, width: opts.width, height: opts.height}),
  };
};

export default setupGrid;
