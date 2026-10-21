"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  COUNTRIES,
  COUNTRY_CODES,
  sanitizeLocalInput,
  type CountryCode,
} from "@/lib/phone";

const items = Object.fromEntries(COUNTRY_CODES.map((code) => [code, `+${code}`]));

type Props = {
  country: CountryCode;
  onCountryChange: (code: CountryCode) => void;
  inputProps: React.ComponentProps<"input">;
  invalid?: boolean;
};

/** Country-code dropdown joined to a phone number input. */
export function PhoneField({ country, onCountryChange, inputProps, invalid }: Props) {
  const { onChange, ...rest } = inputProps;

  return (
    <div className="flex gap-2">
      <Select
        items={items}
        value={country}
        onValueChange={(value) => value && onCountryChange(value as CountryCode)}
      >
        <SelectTrigger
          aria-label="Country code"
          // data-[size] variant sets the height, so override it at the same specificity.
          className="w-[6.5rem] shrink-0 data-[size=default]:h-10"
        >
          <span className="rounded bg-muted px-1 text-[0.65rem] font-semibold text-muted-foreground">
            {COUNTRIES[country].short}
          </span>
          <SelectValue className="num" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((code) => (
            <SelectItem key={code} value={code}>
              <span className="num">+{code}</span>
              <span className="text-muted-foreground">{COUNTRIES[code].name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={COUNTRIES[country].example}
        aria-invalid={invalid || undefined}
        className="h-10 num"
        {...rest}
        // Keep only the digits the selected country allows (8 for Qatar, 10 for Pakistan).
        // No maxLength: it would cut a pasted "+974..." before it can be cleaned.
        onChange={(event) => {
          event.target.value = sanitizeLocalInput(country, event.target.value);
          onChange?.(event);
        }}
      />
    </div>
  );
}
