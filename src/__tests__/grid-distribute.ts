import setupGrid from "../index";

describe("distribute", () => {
  it("works", () => {
    const grid = setupGrid({width: 4, height: 3});
    console.log("grid", grid);
  });
});
