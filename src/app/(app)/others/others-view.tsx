"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, ShapesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { PoolCard } from "@/components/app/pool-card";
import { PoolWarning, usePool } from "@/components/app/pool-warning";
import { Money } from "@/components/app/amount";
import { RowActions } from "@/components/app/row-actions";
import { TableEmpty, TableError, TableSkeleton } from "@/components/app/table-states";
import { EntityFormDialog } from "@/components/form/entity-form-dialog";
import { OthersBatchDialog } from "./others-batch-dialog";
import { useAction, useOthers } from "@/lib/queries";
import { deleteEntity, saveEntity, saveOthersBatch } from "../actions";
import { otherEntrySchema } from "@/lib/validation/schemas";
import { parseAmount, round2 } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

export function OthersView() {
  const query = useOthers();
  const { status, allocatedQar, loading } = usePool("others");
  const saveBatch = useAction(saveOthersBatch);
  const save = useAction(saveEntity, "Entry updated");
  const remove = useAction(deleteEntity, "Entry deleted");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Tables<"other_entries"> | null>(null);

  const rows = query.data ?? [];
  const total = round2(rows.reduce((s, r) => s + Number(r.amount_pkr), 0));
  const COLS = 4;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Others"
        description="Other spending from the amount you allocated on the Sent page."
        actions={
          <Button onClick={() => setAdding(true)}>
            <PlusIcon /> Add
          </Button>
        }
      />

      <PoolCard title="Others" icon={ShapesIcon} status={status} allocatedQar={allocatedQar} loading={loading} />

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="text-right">Amount (PKR)</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableSkeleton columns={COLS} />
            ) : query.error ? (
              <TableError columns={COLS} message={query.error.message} />
            ) : !rows.length ? (
              <TableEmpty columns={COLS} icon={ShapesIcon} title="No entries yet" description="Tap Add to record one or more expenses at once." />
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="num">{formatDate(r.entry_date)}</TableCell>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right font-medium"><Money value={Number(r.amount_pkr)} currency="PKR" /></TableCell>
                  <TableCell>
                    <RowActions onEdit={() => setEditing(r)} onDelete={() => remove.mutateAsync(["other_entries", r.id]).then(() => true, () => false)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!!rows.length && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold"><Money value={total} currency="PKR" /></TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      <OthersBatchDialog
        open={adding}
        onOpenChange={setAdding}
        remaining={status.remaining}
        onSubmit={(values) =>
          saveBatch.mutateAsync([values]).then(() => {
            toast.success(values.items.length > 1 ? `${values.items.length} entries added` : "Entry added");
            return true;
          }, () => false)
        }
      />

      <EntityFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit entry"
        schema={otherEntrySchema}
        fields={[
          { name: "entry_date", label: "Date", type: "date" },
          { name: "label", label: "Label", type: "text" },
          { name: "amount_pkr", label: "Amount", type: "money", currency: "PKR" },
        ]}
        defaultValues={
          editing
            ? { entry_date: editing.entry_date, label: editing.label, amount_pkr: String(Number(editing.amount_pkr)) }
            : { entry_date: "", label: "", amount_pkr: "" }
        }
        renderExtra={(values) => (
          <PoolWarning label="others" remaining={status.remaining} amount={parseAmount(values.amount_pkr as string)} previousAmount={Number(editing?.amount_pkr ?? 0)} />
        )}
        onSubmit={(values) => save.mutateAsync(["other_entries", values, editing!.id]).then(() => true, () => false)}
      />
    </div>
  );
}
