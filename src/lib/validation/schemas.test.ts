import { describe, expect, it } from "vitest";
import { debtCreateSchema, debtPaymentSchema, expenseSchema, otherBatchSchema, sendSchema } from "./schemas";
import { signupSchema } from "./auth";
import { phoneToEmail, sanitizeLocalInput, toE164 } from "@/lib/phone";

describe("sendSchema", () => {
  const base = { sent_date: "2026-10-05", amount_qar: "1500", charity_qar: "200", debt_qar: "300", bank: "HBL" };

  it("accepts a valid send and parses amounts", () => {
    const r = sendSchema.parse(base);
    expect(r).toMatchObject({ amount_qar: 1500, charity_qar: 200, debt_qar: 300, installments_qar: 0, others_qar: 0 });
  });

  it("rejects parts larger than the amount", () => {
    expect(sendSchema.safeParse({ ...base, amount_qar: "400" }).success).toBe(false);
  });

  it("requires a positive amount and a known bank", () => {
    expect(sendSchema.safeParse({ ...base, amount_qar: "0" }).success).toBe(false);
    expect(sendSchema.safeParse({ ...base, amount_qar: "-5" }).success).toBe(false);
    expect(sendSchema.safeParse({ ...base, bank: "XYZ" }).success).toBe(false);
  });
});

describe("expenseSchema", () => {
  it("stores monthly expenses on the 1st and drops date_to", () => {
    const r = expenseSchema.parse({ period: "monthly", date_from: "2026-10", category: "Room rent", amount_qar: "1200" });
    expect(r).toMatchObject({ date_from: "2026-10-01", date_to: null, reason: null });
  });

  it("requires a valid week range for weekly expenses", () => {
    const week = { period: "weekly", date_from: "2026-10-05", category: "Food", amount_qar: 90 };
    expect(expenseSchema.safeParse(week).success).toBe(false);
    expect(expenseSchema.safeParse({ ...week, date_to: "2026-10-04" }).success).toBe(false);
    expect(expenseSchema.parse({ ...week, date_to: "2026-10-11" }).date_to).toBe("2026-10-11");
  });
});

describe("otherBatchSchema", () => {
  it("accepts several label/amount rows at once", () => {
    const r = otherBatchSchema.parse({
      entry_date: "2026-10-10",
      items: [
        { label: "Electricity", amount_pkr: "4,500" },
        { label: "Gas", amount_pkr: "1200" },
      ],
    });
    expect(r.items.map((i) => i.amount_pkr)).toEqual([4500, 1200]);
  });

  it("rejects an empty batch or a blank label", () => {
    expect(otherBatchSchema.safeParse({ entry_date: "2026-10-10", items: [] }).success).toBe(false);
    expect(otherBatchSchema.safeParse({ entry_date: "2026-10-10", items: [{ label: " ", amount_pkr: "1" }] }).success).toBe(false);
  });
});

describe("debt schemas", () => {
  const person = "6f1c1a8e-3c4b-4b8e-9a51-2f0c3f5d7a10";

  it("payments need a person, kind and positive amount", () => {
    const ok = { person_id: person, kind: "taken", paid_on: "2026-11-03", amount_pkr: "20000" };
    expect(debtPaymentSchema.parse(ok).amount_pkr).toBe(20000);
    expect(debtPaymentSchema.safeParse({ ...ok, person_id: "1" }).success).toBe(false);
    expect(debtPaymentSchema.safeParse({ ...ok, kind: "lent" }).success).toBe(false);
    expect(debtPaymentSchema.safeParse({ ...ok, amount_pkr: "0" }).success).toBe(false);
  });

  it("a new debt needs a name or an existing person", () => {
    const base = { kind: "taken", debt_date: "2026-10-01", amount_pkr: "50000" };
    expect(debtCreateSchema.safeParse({ ...base, person_name: "Hamza" }).success).toBe(true);
    expect(debtCreateSchema.safeParse({ ...base, person_id: person }).success).toBe(true);
    expect(debtCreateSchema.safeParse({ ...base, person_name: "  " }).success).toBe(false);
    expect(debtCreateSchema.safeParse(base).success).toBe(false);
  });
});

describe("signup and phone", () => {
  const valid = { name: "Mehran Khan", country: "974", phone: "33371470", pin: "102030", confirmPin: "102030" };

  it("accepts a valid Qatar signup", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched or non-6-digit PINs and short numbers", () => {
    expect(signupSchema.safeParse({ ...valid, confirmPin: "102031" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, pin: "12345", confirmPin: "12345" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, phone: "3337147" }).success).toBe(false);
  });

  it("maps phone numbers to the synthetic login email", () => {
    expect(toE164("974", "3337 1470")).toBe("+97433371470");
    expect(toE164("92", "03001234567")).toBe("+923001234567");
    expect(phoneToEmail("+97455123456")).toBe("97455123456@expense.local");
    expect(sanitizeLocalInput("974", "+974 3337 1470 99")).toBe("33371470");
  });
});
