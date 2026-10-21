import { describe, expect, it } from "vitest";
import { computeBalance, EMPTY_TOTALS, salaryForMonth } from "./balance";

describe("computeBalance", () => {
  it("is 0 before any salary is saved, even with spending", () => {
    expect(computeBalance(null, { ...EMPTY_TOTALS, expensesQar: 300 })).toBe(0);
  });

  it("equals the salary when nothing has been spent", () => {
    expect(computeBalance(5000, EMPTY_TOTALS)).toBe(5000);
  });

  it("subtracts expenses, sends and both savings", () => {
    const totals = { expensesQar: 1200, sentQar: 1500, personalSavingsQar: 500, familySavingsQar: 250.5 };
    expect(computeBalance(5000, totals)).toBe(1549.5);
  });

  it("acceptance: a 1500 QAR send reduces a 5000 salary by exactly 1500", () => {
    expect(computeBalance(5000, { ...EMPTY_TOTALS, sentQar: 1500 })).toBe(3500);
  });

  it("can go negative when spending exceeds salary", () => {
    expect(computeBalance(1000, { ...EMPTY_TOTALS, expensesQar: 1200.25 })).toBe(-200.25);
  });

  it("avoids floating point drift", () => {
    expect(computeBalance(0.3, { ...EMPTY_TOTALS, expensesQar: 0.1, sentQar: 0.2 })).toBe(0);
  });
});

describe("salaryForMonth", () => {
  const incomes = [
    { month: "2026-08-01", amount_qar: 4500 },
    { month: "2026-10-01", amount_qar: 5000 },
  ];

  it("uses the salary saved for that month", () => {
    expect(salaryForMonth(incomes, "2026-10")?.amount_qar).toBe(5000);
  });

  it("carries the latest earlier salary forward", () => {
    expect(salaryForMonth(incomes, "2026-09")?.amount_qar).toBe(4500);
    expect(salaryForMonth(incomes, "2027-01")?.amount_qar).toBe(5000);
  });

  it("returns null before the first salary", () => {
    expect(salaryForMonth(incomes, "2026-07")).toBeNull();
    expect(salaryForMonth([], "2026-10")).toBeNull();
  });
});
