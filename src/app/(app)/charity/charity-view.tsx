"use client";

import { HandHeartIcon } from "lucide-react";
import { PoolLedger } from "@/components/app/pool-ledger";
import { useCharity } from "@/lib/queries";
import { charitySchema, RELATIONSHIPS } from "@/lib/validation/schemas";
import { formatDate, todayISO } from "@/lib/dates";

export function CharityView() {
  return (
    <PoolLedger
      pool="charity"
      entity="charity_entries"
      title="Charity"
      description="Charity given from the amount you allocated on the Sent page."
      icon={HandHeartIcon}
      noun="Charity"
      query={useCharity()}
      schema={charitySchema}
      fields={[
        { name: "entry_date", label: "Date", type: "date", half: true },
        {
          name: "relationship",
          label: "Relationship",
          type: "select",
          half: true,
          placeholder: "Choose",
          options: RELATIONSHIPS.map((r) => ({ value: r, label: r })),
        },
        { name: "name", label: "Name", type: "text", placeholder: "Who received it" },
        { name: "amount_pkr", label: "Amount", type: "money", currency: "PKR" },
      ]}
      columns={[
        { header: "Date", className: "num", cell: (r) => formatDate(r.entry_date) },
        { header: "Name", className: "font-medium", cell: (r) => r.name },
      ]}
      trailingColumns={[
        {
          header: "Relationship",
          cell: (r) => (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{r.relationship}</span>
          ),
        },
      ]}
      emptyValues={() => ({ entry_date: todayISO(), name: "", amount_pkr: "", relationship: undefined as string | undefined })}
      toForm={(r) => ({
        entry_date: r.entry_date,
        name: r.name,
        amount_pkr: String(Number(r.amount_pkr)),
        relationship: r.relationship,
      })}
    />
  );
}
