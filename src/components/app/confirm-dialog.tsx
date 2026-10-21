"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  /** Resolves true to close the dialog. */
  onConfirm: () => Promise<boolean>;
  /** When set, the user must type this word to enable the confirm button. */
  typeToConfirm?: string;
};

/** Destructive confirmation dialog with a pending state. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, typeToConfirm }: Props) {
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState("");
  const blocked = typeToConfirm ? typed.trim().toUpperCase() !== typeToConfirm : false;

  const confirm = async () => {
    setPending(true);
    try {
      if (await onConfirm()) {
        onOpenChange(false);
        setTyped("");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {typeToConfirm && (
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`Type ${typeToConfirm} to confirm`}
            aria-label={`Type ${typeToConfirm} to confirm`}
            autoComplete="off"
            className="h-10"
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={pending || blocked}>
            {pending && <Loader2Icon className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
