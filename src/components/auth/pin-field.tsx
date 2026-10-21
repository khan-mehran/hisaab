"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = React.ComponentProps<"input"> & { invalid?: boolean };

/** 6-digit numeric PIN input with a show/hide toggle. */
export function PinField({ invalid, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="••••••"
        aria-invalid={invalid || undefined}
        className="h-10 pr-10 text-center text-lg tracking-[0.5em] num"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide PIN" : "Show PIN"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
