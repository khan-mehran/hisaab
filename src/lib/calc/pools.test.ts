import { describe, expect, it } from "vitest";
import { exceedsPool, poolStatus, sendTotals, validateAllocation } from "./pools";

const send = (over: Partial<Parameters<typeof sendTotals>[0][number]> = {}) => ({
  amount_qar: 1500,
  charity_qar: 200,
  debt_qar: 300,
  installments_qar: 0,
  others_qar: 0,
  rate_qar_pkr: 77.4,
  ...over,
});

describe("validateAllocation", () => {
  it("computes the family portion as the remainder", () => {
    expect(validateAllocation({ amount: 1500, charity: 200, debt: 300 })).toEqual({
      ok: true,
      partsQar: 500,
      familyQar: 1000,
      excessQar: 0,
    });
  });

  it("allows parts that use the whole amount", () => {
    const r = validateAllocation({ amount: 100, charity: 25, debt: 25, installments: 25, others: 25 });
    expect(r.ok).toBe(true);
    expect(r.familyQar).toBe(0);
  });

  it("rejects parts that exceed the amount and reports the excess", () => {
    const r = validateAllocation({ amount: 100, charity: 80, debt: 30.5 });
    expect(r.ok).toBe(false);
    expect(r.excessQar).toBe(10.5);
  });

  it("treats missing parts as 0", () => {
    expect(validateAllocation({ amount: 250 }).familyQar).toBe(250);
  });
});

describe("sendTotals", () => {
  it("acceptance: 1500 QAR with 200 charity and 300 debt fills the cards", () => {
    const t = sendTotals([send()]);
    expect(t.total).toEqual({ qar: 1500, pkr: 116100 });
    expect(t.charity).toEqual({ qar: 200, pkr: 15480 });
    expect(t.debt).toEqual({ qar: 300, pkr: 23220 });
    expect(t.installments).toEqual({ qar: 0, pkr: 0 });
    expect(t.family).toEqual({ qar: 1000, pkr: 77400 });
  });

  it("converts each send at its own locked rate", () => {
    const t = sendTotals([send({ charity_qar: 100, debt_qar: 0, rate_qar_pkr: 70 }), send({ charity_qar: 100, debt_qar: 0, rate_qar_pkr: 80 })]);
    expect(t.charity).toEqual({ qar: 200, pkr: 15000 });
    expect(t.total.pkr).toBe(1500 * 70 + 1500 * 80);
  });

  it("returns zeros for no sends", () => {
    expect(sendTotals([]).total).toEqual({ qar: 0, pkr: 0 });
  });
});

describe("poolStatus", () => {
  it("reports allocated, used and remaining", () => {
    expect(poolStatus(15480, 5000)).toEqual({ allocated: 15480, used: 5000, remaining: 10480, percentUsed: 32, over: false });
  });

  it("flags an over-used pool and caps the progress at 100%", () => {
    const s = poolStatus(1000, 1500);
    expect(s.remaining).toBe(-500);
    expect(s.over).toBe(true);
    expect(s.percentUsed).toBe(100);
  });

  it("handles an empty pool", () => {
    expect(poolStatus(0, 0)).toMatchObject({ remaining: 0, percentUsed: 0, over: false });
    expect(poolStatus(0, 10).percentUsed).toBe(100);
  });
});

describe("exceedsPool", () => {
  it("warns only when the entry is more than what is left", () => {
    expect(exceedsPool(10480, 10480)).toBe(false);
    expect(exceedsPool(10480, 10480.01)).toBe(true);
  });

  it("ignores the old amount when editing an entry", () => {
    // 1000 left; editing a 5000 entry to 5800 only adds 800.
    expect(exceedsPool(1000, 5800, 5000)).toBe(false);
    expect(exceedsPool(1000, 6500, 5000)).toBe(true);
  });
});
