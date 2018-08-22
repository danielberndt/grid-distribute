import setupGrid from "../index";

describe("distribute", () => {
  it("works with one element", () => {
    const grid = setupGrid({width: 4, height: 3});
    const elements = [{prio: 2}];
    const result = grid.distribute({elements, getPriority: e => e.prio});
    expect(result).toMatchSnapshot();
  });

  it("works with two identical elements", () => {
    const grid = setupGrid({width: 4, height: 3});
    const elements = [{prio: 2}, {prio: 2}];
    const result = grid.distribute({elements, getPriority: e => e.prio});
    expect(result).toMatchSnapshot();
  });

  it("works with many elements", () => {
    const grid = setupGrid({width: 4, height: 3});
    const elements = [{prio: 2}, {prio: 2}, {prio: 1}, {prio: 4}, {prio: 0.5}];
    const result = grid.distribute({elements, getPriority: e => e.prio});
    expect(result).toMatchSnapshot();
  });
});
