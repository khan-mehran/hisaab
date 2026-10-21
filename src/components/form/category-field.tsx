"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SelectField } from "./select-field";

const CUSTOM = "__custom__";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  presets: readonly string[];
  invalid?: boolean;
};

/** Preset categories plus a "Custom…" option that reveals a free-text input. */
export function CategoryField({ id, value, onChange, presets, invalid }: Props) {
  const [custom, setCustom] = useState(() => Boolean(value) && !presets.includes(value));

  return (
    <div className="grid gap-2">
      <SelectField
        id={id}
        value={custom ? CUSTOM : value}
        invalid={invalid && !custom}
        placeholder="Choose a category"
        options={[...presets.map((p) => ({ value: p, label: p })), { value: CUSTOM, label: "Custom…" }]}
        onChange={(v) => {
          if (v === CUSTOM) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(v);
          }
        }}
      />
      {custom && (
        <Input
          autoFocus
          value={value}
          maxLength={60}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a category, e.g. Mobile bill"
          aria-label="Custom category"
          aria-invalid={invalid || undefined}
          className="h-10"
        />
      )}
    </div>
  );
}
