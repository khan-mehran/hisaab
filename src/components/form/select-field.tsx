"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string; hint?: string };

type Props = {
  id?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  invalid?: boolean;
  className?: string;
};

/** Controlled dropdown built on the shadcn (Base UI) Select. */
export function SelectField({ id, value, onChange, options, placeholder = "Select…", invalid, className }: Props) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select items={items} value={value || null} onValueChange={(v) => v != null && onChange(String(v))}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn("w-full data-[size=default]:h-10", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
            {o.hint && <span className="text-muted-foreground">{o.hint}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
