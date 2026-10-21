import { describe, expect, it } from "vitest";
import { formatMoney, parseAmount, qarToPkr, round2, toPkr, toQar } from "./currency";

const rates = { qarPkr: 77.4, usdQar: 3.64 };

describe("formatMoney", () => {
  it("formats QAR and PKR as the spec shows", () => {
    expect(formatMoney(5000, "QAR")).toBe("QAR 5,000");
    expect(formatMoney(387000, "PKR")).toBe("Rs 387,000");
  });

  it("keeps decimals for QAR but not PKR", () => {
    expect(formatMoney(1500.5, "QAR")).toBe("QAR 1,500.5");
    expect(formatMoney(116100.4, "PKR")).toBe("Rs 116,100");
  });

  it("supports lakh grouping", () => {
    expect(formatMoney(1935000, "PKR", "en-IN")).toBe("Rs 19,35,000");
  });

  it("puts the sign before the currency", () => {
    expect(formatMoney(-200, "QAR")).toBe("-QAR 200");
  });
});

describe("conversions", () => {
  it("converts QAR to PKR with 2-decimal rounding", () => {
    expect(qarToPkr(1500, 77.4)).toBe(116100);
    expect(qarToPkr(1.005, 1)).toBe(1.01);
  });

  it("converts any currency to QAR and PKR", () => {
    expect(toQar(5000, "QAR", rates)).toBe(5000);
    expect(toQar(77400, "PKR", rates)).toBe(1000);
    expect(toQar(1000, "USD", rates)).toBe(3640);
    expect(toPkr(1000, "USD", rates)).toBe(281736);
    expect(toPkr(500, "PKR", rates)).toBe(500);
  });

  it("round2 handles float noise", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe("parseAmount", () => {
  it("accepts grouped and decimal input", () => {
    expect(parseAmount("1,500.50")).toBe(1500.5);
    expect(parseAmount(" 20 000 ")).toBe(20000);
    expect(parseAmount(42)).toBe(42);
  });

  it("returns NaN for anything else", () => {
    for (const bad of ["", ".", "abc", "1.2.3", "-5", undefined, null]) {
      expect(parseAmount(bad as string)).toBeNaN();
    }
  });
});
