# grid-distribute

## Setup

```sh
npm install
```

## Usage:

```js
import setupGrid from "grid-distribute";

const grid = setupGrid({width: 4, height: 3});

const elements = [{prio: 2}, {prio: 4}, {prio: 2}];
const result = grid.distribute({elements, getPriority: e => e.prio});
```

the result will look like this:

```js
[
  {
    position: {top: 0, left: 0, width: 4, height: 2},
    element: {prio: 4}
  },
  {
    position: {top: 2, left: 0, width: 2, height: 2},
    element: {prio: 2}
  }
  {
    position: {top: 2, left: 2, width: 2, height: 2},
    element: {prio: 2}
  }
]
```

## API

### `setupGrid({width, height, maxRatio, minRatio}) => Grid`

Calling `setupGrid` will find all valid tile sizes and returns a `Grid` object which you can use to distrbute your elements.

#### `width`, `height` [required]

Amount of rows and columns of your grid.

#### `minRatio` default: `0.5`, `maxRatio` default: `2`

When determining all valid tile sizes, you can use `minRatio` and `maxRatio` to prevent tiles with weird aspect ratios. A tile which is 3 columns wide and 2 rows high has a ratio of `3/2 -> 1.5`

### `Grid.distribute(options) => ElementWithPosition[]`

This function performs an [A*](https://en.wikipedia.org/wiki/A*_search_algorithm)-like search through the solution space and returns a solution in which elements are paired with positions.

The return value has the shape `[{element, position: {top, left, width, height}},...]` where element is the original element that you passed into the `elements` argument.

There is no guarantee that all elements will be placed onto the grid, pass a high `skipMultiplier` to the options, will favour solutions that fit as many elements as possible though.

#### option: `elements: E[]` [required]

Pass a list of arbitrary objects that need to be put onto the grid.

#### option: `getPriority: (e: E) => number` [required]

Pass a callback that extracts a priority value for an `element`. Priorities will be normalized by the algorithm, so it can be any number. Elements with higher priority will be assigned tiles with greater area.

#### options `costOfUnexplored: (e: E) => number` default: `() => 0.5`

This option deterimines the greedines of the algorithm by assigning an estimated cost to elements that haven't been placed yet. The `cost` needs to be between `0` and `1`. Setting this value to `0` will perform an exhaustive search returning the optimal solution given the passed parameters. This will result in thousands of iterations even for few elements placed on a grid. Setting this value to `1` will lead to very few iteration cycles leading to a sub-optimal solution since backtracking is deemed too expensive due to the high cost of unexplored solutions.

#### options `costOfEmptyCell: number` default: `0.75`

This option determines the cost of an empty cell in the final solution.

#### options `ratioDiffWeight: number` default: `0.1`

`ratioDiff` refers to the relative size of the normalized element priority and the the ratio of the assigned tile area compared to the whole grid size.

Here's an example: Let's assume there are two elements `e1` with a prio of `3` and `e2` with a prio of `1`. The normalized prios are `0.75` and `0.25` respectively.

Now we try to determine the cost for assigning `e1` to a 3x2 tile on a 3x3 grid.
the tile takes up `6` of the `9` grid cells. So its ratio is abot `0.66`. The ratio diff is determined by `1 - Math.max(tileRatio / elementRatio, elementRatio / tileRatio)`. So in our case it's `0.1111`. If the `elementRatio` would be half as big as the `tileRatio` or vice versa, the ratioDiff would be `0.5`

The `ratioDiffWeight` determines the weight of the `ratioDiff` when estimating the cost of placing this element. Setting it to `0` would mean that a ratio difference would not matter, and higher values would encourage solutions in which the `ratioDiff` is as small as possible at the expense of more iterations.

#### options `costsOfPlacement: ({element, cell, grid, ratioDiffMultiplier}) => number[]` default: `defaultCostsOfPlacement`

Determine the cost multipliers when placing an element on a grid. The cost multipliers are an array of numbers in the range of `0` to `1`. These values get averraged. Higher values indicate a sub-optimal placement for the given element, whereas a cost of `0` would indicate a perfect placement.

The `defaultCostsOfPlacement` can be imported via `import {defaultCostsOfPlacement} from "grid-distribute"` and used as a basis for more specific cost calculations.

It returns the weighted `ratioDiff` explained above, as well as costs for the horizontal and vertical distance from the center. This favours solutions in which higher prio elements will be closer to the center.

Here's the description of the of the callback arguments:

**`element: E`** the element that was just placed on the grid

**`cell: {left, top, height, width}`** the position of the element on the grid

**`grid: {height, width}`** width and height of the grid

**`ratioDiffMultiplier`: number`** the cost as determined by the `ratioDiff` and the `ratioDiffWeight`

#### options `skipMultiplier: (element: E) => number` default: `1`

This option determines the cost of not placing the given element on the grid.

### A note on costs:

The costs applied to an element are multiplied with the relative priority of that element. This means that higher-prio elements tend to be placed more favourably than lower-prio elements if you the same costs are applied to them.
