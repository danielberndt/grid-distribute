import {double, power} from "../lib/number";

describe("basics", () => {
  it("double", () => {
    expect(double(2)).toBe(4);
  });

  it("power", () => {
    expect(power(2, 4)).toBe(16);
  });
});
