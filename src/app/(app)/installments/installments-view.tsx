"use client";

import { CreditCardIcon } from "lucide-react";
import { PoolLedger } from "@/components/app/pool-ledger";
import { useInstallments } from "@/lib/queries";
import { installmentSchema } from "@/lib/validation/schemas";
import { formatDate, todayISO } from "@/lib/dates";

export function InstallmentsView() {
  return (
    <PoolLedger
      pool="installments"
      entity="installments"
      title="Installments"
      description="Installments paid from the amount you allocated on the Sent page."
      icon={CreditCardIcon}
      noun="Installment"
      query={useInstallments()}
      schema={installmentSchema}
      fields={[
        { name: "entry_date", label: "Date", type: "date", half: true },
        { name: "amount_pkr", label: "Amount", type: "money", currency: "PKR", half: true },
        { name: "title", label: "Title", type: "text", placeholder: "e.g. Motorbike, Committee" },
        { name: "note", label: "Note", type: "text", placeholder: "Optional" },
      ]}
      columns={[
        { header: "Date", className: "num", cell: (r) => formatDate(r.entry_date) },
        { header: "Title", className: "font-medium", cell: (r) => r.title },
      ]}
      trailingColumns={[
        { header: "Note", className: "max-w-56 truncate text-muted-foreground", cell: (r) => r.note || "—" },
      ]}
      emptyValues={() => ({ entry_date: todayISO(), title: "", amount_pkr: "", note: "" })}
      toForm={(r) => ({
        entry_date: r.entry_date,
        title: r.title,
        amount_pkr: String(Number(r.amount_pkr)),
        note: r.note ?? "",
      })}
    />
  );
}
