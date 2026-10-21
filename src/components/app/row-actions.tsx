"use client";

import { useState } from "react";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "./confirm-dialog";

type Props = {
  onEdit?: () => void;
  /** Resolves true when the delete succeeded. */
  onDelete?: () => Promise<boolean>;
  deleteTitle?: string;
  deleteDescription?: string;
  /** Extra menu items rendered above Edit. */
  children?: React.ReactNode;
};

/** "..." menu with Edit and a confirmed Delete. */
export function RowActions({
  onEdit,
  onDelete,
  deleteTitle = "Delete this entry?",
  deleteDescription = "This can't be undone.",
  children,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Row actions" />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          {children}
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              {(onEdit || children) && <DropdownMenuSeparator />}
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {onDelete && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={deleteTitle}
          description={deleteDescription}
          confirmLabel="Delete"
          onConfirm={onDelete}
        />
      )}
    </>
  );
}
