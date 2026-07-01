import { describe, it, expect } from "vitest";
import { toCsv } from "./export-csv";

describe("toCsv", () => {
  it("joins headers and rows with the default semicolon delimiter and CRLF", () => {
    const csv = toCsv(["A", "B"], [["1", "2"], ["3", "4"]]);
    expect(csv).toBe("A;B\r\n1;2\r\n3;4");
  });

  it("quotes cells containing the delimiter, quotes, or newlines", () => {
    const csv = toCsv(
      ["X"],
      [["a;b"], ['he said "hi"'], ["line1\nline2"]],
    );
    expect(csv).toBe(
      'X\r\n"a;b"\r\n"he said ""hi"""\r\n"line1\nline2"',
    );
  });

  it("renders null/undefined as empty and coerces numbers", () => {
    const csv = toCsv(["A", "B", "C"], [[null, undefined, 2026]]);
    expect(csv).toBe("A;B;C\r\n;;2026");
  });

  it("neutralizes leading formula characters to prevent CSV injection", () => {
    const csv = toCsv(
      ["V"],
      [["=SUM(A1)"], ["+1"], ["-1"], ["@cmd"]],
    );
    expect(csv).toBe("V\r\n'=SUM(A1)\r\n'+1\r\n'-1\r\n'@cmd");
  });

  it("supports a custom delimiter", () => {
    const csv = toCsv(["A", "B"], [["1", "2"]], ",");
    expect(csv).toBe("A,B\r\n1,2");
  });
});
