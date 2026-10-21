import { describe, expect, it } from "vitest";
import { findPersonByName, personLedger, summarizePeople, validatePayment } from "./debts";

const people = [
  { id: "p1", name: "Hamza Friend" },
  { id: "p2", name: "Hamza Cousin" },
  { id: "p3", name: "Taashuq Hussain" },
];
const debt = (id: string, person_id: string, amount_pkr: number, debt_date: string, kind: "taken" | "given" = "taken") => ({
  id,
  person_id,
  kind,
  amount_pkr,
  debt_date,
});
const pay = (id: string, person_id: string, amount_pkr: number, paid_on: string, kind: "taken" | "given" = "taken") => ({
  id,
  person_id,
  kind,
  amount_pkr,
  paid_on,
});

describe("summarizePeople", () => {
  it("acceptance: Hamza 50,000 taken, 20,000 paid in Nov leaves 30,000", () => {
    const s = summarizePeople([people[0]], [debt("d1", "p1", 50000, "2026-10-01")], [pay("x1", "p1", 20000, "2026-11-03")], "taken");
    expect(s.months).toEqual(["2026-11"]);
    expect(s.rows[0]).toMatchObject({ total: 50000, paid: 20000, remaining: 30000, cleared: false, byMonth: { "2026-11": 20000 } });
    expect(s.totals).toEqual({ total: 50000, paid: 20000, remaining: 30000, byMonth: { "2026-11": 20000 } });
  });

  it("adds up several debts and installment payments for the same person", () => {
    const s = summarizePeople(
      people,
      [debt("d1", "p1", 75000, "2026-02-12"), debt("d2", "p1", 5000, "2026-08-01"), debt("d3", "p2", 100000, "2026-06-17")],
      [pay("x1", "p1", 30000, "2026-07-10"), pay("x2", "p1", 26000, "2026-07-25"), pay("x3", "p1", 10000, "2026-09-01")],
      "taken",
    );
    expect(s.rows.map((r) => r.person.name)).toEqual(["Hamza Friend", "Hamza Cousin"]);
    expect(s.rows[0]).toMatchObject({ total: 80000, paid: 66000, remaining: 14000, entries: 2, firstDate: "2026-02-12", lastActivity: "2026-09-01" });
    expect(s.rows[0].byMonth).toEqual({ "2026-07": 56000, "2026-09": 10000 });
    expect(s.months).toEqual(["2026-07", "2026-09"]);
    expect(s.totals).toMatchObject({ total: 180000, paid: 66000, remaining: 114000 });
  });

  it("marks a fully paid person as cleared", () => {
    const s = summarizePeople(people, [debt("d1", "p3", 1000, "2026-01-01")], [pay("x1", "p3", 400, "2026-02-01"), pay("x2", "p3", 600, "2026-03-01")], "taken");
    expect(s.rows[0]).toMatchObject({ remaining: 0, cleared: true });
  });

  it("keeps taken and given separate for the same person", () => {
    const debts = [debt("d1", "p1", 1000, "2026-01-01", "taken"), debt("d2", "p1", 500, "2026-01-02", "given")];
    const payments = [pay("x1", "p1", 200, "2026-02-01", "given")];
    expect(summarizePeople(people, debts, payments, "taken").rows[0]).toMatchObject({ total: 1000, paid: 0 });
    expect(summarizePeople(people, debts, payments, "given").rows[0]).toMatchObject({ total: 500, paid: 200, remaining: 300 });
  });

  it("leaves out people with no debt of that kind and handles no data", () => {
    expect(summarizePeople(people, [debt("d1", "p1", 1, "2026-01-01", "given")], [], "taken").rows).toEqual([]);
    expect(summarizePeople([], [], [], "taken")).toEqual({ months: [], rows: [], totals: { total: 0, paid: 0, remaining: 0, byMonth: {} } });
  });
});

describe("personLedger", () => {
  it("lists debts and payments by date with a running balance", () => {
    const ledger = personLedger(
      [{ ...debt("d1", "p1", 75000, "2026-02-12"), note: "Bike" }, debt("d2", "p1", 5000, "2026-08-01")],
      [pay("x1", "p1", 56000, "2026-07-10"), pay("x2", "p1", 24000, "2026-08-01")],
      "p1",
      "taken",
    );
    expect(ledger.map((e) => [e.type, e.date, e.amount, e.balance])).toEqual([
      ["debt", "2026-02-12", 75000, 75000],
      ["payment", "2026-07-10", 56000, 19000],
      ["debt", "2026-08-01", 5000, 24000], // debt before payment on the same day
      ["payment", "2026-08-01", 24000, 0],
    ]);
    expect(ledger[0]).toMatchObject({ note: "Bike" });
  });

  it("only includes the chosen person and kind", () => {
    const ledger = personLedger([debt("d1", "p1", 10, "2026-01-01"), debt("d2", "p2", 10, "2026-01-01"), debt("d3", "p1", 10, "2026-01-01", "given")], [], "p1", "taken");
    expect(ledger.map((e) => e.id)).toEqual(["d1"]);
  });
});

describe("findPersonByName", () => {
  it("matches ignoring case and extra spaces", () => {
    expect(findPersonByName(people, "  hamza   FRIEND ")?.id).toBe("p1");
    expect(findPersonByName(people, "Hamza")).toBeUndefined();
    expect(findPersonByName(people, "   ")).toBeUndefined();
  });
});

describe("validatePayment", () => {
  it("allows a payment up to the remaining amount", () => {
    expect(validatePayment(30000, 20000)).toBeNull();
    expect(validatePayment(30000, 30000)).toBeNull();
  });

  it("prevents paying more than what is remaining", () => {
    expect(validatePayment(30000, 30000.01)).toMatch(/more than the remaining/);
  });

  it("rejects zero, negative and invalid amounts", () => {
    expect(validatePayment(100, 0)).not.toBeNull();
    expect(validatePayment(100, -5)).not.toBeNull();
    expect(validatePayment(100, Number.NaN)).not.toBeNull();
  });

  it("rejects payments on a cleared debt", () => {
    expect(validatePayment(0, 10)).toMatch(/already cleared/);
  });
});
