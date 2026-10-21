import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

/** Placeholder rows while a table loads. */
export function TableSkeleton({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }, (_, c) => (
            <TableCell key={c}>
              <Skeleton className="h-4 w-full max-w-28" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Friendly message for a table with no rows. */
export function TableEmpty({
  columns,
  title,
  description,
  icon: Icon = InboxIcon,
}: {
  columns: number;
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="py-12">
        <div className="flex flex-col items-center gap-2 text-center whitespace-normal">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-5" />
          </span>
          <p className="font-medium">{title}</p>
          {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Error row with the safe message from the query. */
export function TableError({ columns, message }: { columns: number; message: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="py-8 text-center text-sm text-destructive whitespace-normal">
        {message}
      </TableCell>
    </TableRow>
  );
}
