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

/* result: [
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
*/
```
