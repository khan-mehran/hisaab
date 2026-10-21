"use client";

import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "./page-header";
import { PoolCard } from "./pool-card";
import { PoolWarning, usePool } from "./pool-warning";
import { Money } from "./amount";
import { RowActions } from "./row-actions";
import { TableEmpty, TableError, TableSkeleton } from "./table-states";
import { EntityFormDialog, type FieldDef } from "@/components/form/entity-form-dialog";
import { useAction } from "@/lib/queries";
import { deleteEntity, saveEntity } from "@/app/(app)/actions";
import type { PoolKey } from "@/lib/calc/pools";
import { parseAmount, round2 } from "@/lib/currency";

type Row = { id: string; amount_pkr: number };

export type Column<R> = { header: string; className?: string; cell: (row: R) => React.ReactNode };

type Props<R extends Row, V extends Record<string, unknown>> = {
  pool: PoolKey;
  entity: "charity_entries" | "installments";
  title: string;
  description: string;
  icon: LucideIcon;
  noun: string;
  query: UseQueryResult<R[]>;
  schema: z.ZodType;
  fields: FieldDef[];
  /** Columns before the amount column. */
  columns: Column<R>[];
  /** Columns after the amount column. */
  trailingColumns?: Column<R>[];
  emptyValues: () => V;
  toForm: (row: R) => V;
};

/**
 * Shared layout for pool-backed pages (Charity, Installments): pool card,
 * Add button, table with totals, edit/delete and an over-pool warning.
 */
export function PoolLedger<R extends Row, V extends Record<string, unknown>>({
  pool,
  entity,
  title,
  description,
  icon,
  noun,
  query,
  schema,
  fields,
  columns,
  trailingColumns = [],
  emptyValues,
  toForm,
}: Props<R, V>) {
  const { status, allocatedQar, loading } = usePool(pool);
  const save = useAction(saveEntity);
  const remove = useAction(deleteEntity, `${noun} deleted`);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<R | null>(null);

  const rows = query.data ?? [];
  const total = round2(rows.reduce((s, r) => s + Number(r.amount_pkr), 0));
  const cols = columns.length + trailingColumns.length + 2;

  return (
    <div className="grid gap-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <PlusIcon /> Add
          </Button>
        }
      />

      <PoolCard title={title} icon={icon} status={status} allocatedQar={allocatedQar} loading={loading} />

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header} className={c.className}>{c.header}</TableHead>
              ))}
              <TableHead className="text-right">Amount (PKR)</TableHead>
              {trailingColumns.map((c) => (
                <TableHead key={c.header} className={c.className}>{c.header}</TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableSkeleton columns={cols} />
            ) : query.error ? (
              <TableError columns={cols} message={query.error.message} />
            ) : !rows.length ? (
              <TableEmpty columns={cols} icon={icon} title={`No ${noun.toLowerCase()} entries yet`} description="Tap Add to record one. It's deducted from the pool." />
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  {columns.map((c) => (
                    <TableCell key={c.header} className={c.className}>{c.cell(r)}</TableCell>
                  ))}
                  <TableCell className="text-right font-medium"><Money value={Number(r.amount_pkr)} currency="PKR" /></TableCell>
                  {trailingColumns.map((c) => (
                    <TableCell key={c.header} className={c.className}>{c.cell(r)}</TableCell>
                  ))}
                  <TableCell>
                    <RowActions
                      onEdit={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                      onDelete={() => remove.mutateAsync([entity, r.id]).then(() => true, () => false)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!!rows.length && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={columns.length} className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold"><Money value={total} currency="PKR" /></TableCell>
                <TableCell colSpan={trailingColumns.length + 1} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      <EntityFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${noun.toLowerCase()}` : `Add ${noun.toLowerCase()}`}
        schema={schema}
        fields={fields}
        defaultValues={editing ? toForm(editing) : emptyValues()}
        renderExtra={(values) => (
          <PoolWarning
            label={title.toLowerCase()}
            remaining={status.remaining}
            amount={parseAmount(values.amount_pkr as string)}
            previousAmount={editing ? Number(editing.amount_pkr) : 0}
          />
        )}
        onSubmit={(values) =>
          save.mutateAsync([entity, values as never, editing?.id]).then(() => {
            toast.success(editing ? `${noun} updated` : `${noun} added`);
            return true;
          }, () => false)
        }
      />
    </div>
  );
}
