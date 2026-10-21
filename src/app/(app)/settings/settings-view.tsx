"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DatabaseIcon,
  Loader2Icon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  RefreshCwIcon,
  SunIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserXIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/app/page-header";
import { RateNote } from "@/components/app/rate-note";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { SelectField } from "@/components/form/select-field";
import { useAction, useProfile } from "@/lib/queries";
import { deleteAccount, deleteAllData, refreshRate, updateSettings } from "../actions";
import { CURRENCIES, type Currency, type NumberLocale } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function SettingsView() {
  return (
    <div className="grid max-w-3xl gap-5">
      <PageHeader title="Settings" description="Preferences, exchange rate and your data." />
      <PreferencesCard />
      <RateCard />
      <DangerCard />
    </div>
  );
}

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function PreferencesCard() {
  const { data: profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const save = useAction(updateSettings, "Settings saved");

  const current = {
    salary_currency: profile?.salary_currency ?? "QAR",
    number_locale: profile?.number_locale ?? "en-US",
  };
  const update = (patch: Partial<typeof current>) => save.mutate([{ ...current, ...patch }]);

  const themes = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: MonitorIcon },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PaletteIcon className="size-4 text-primary" /> Preferences</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Row title="Default salary currency" description="Pre-selected when you enter your salary.">
          <SelectField
            value={current.salary_currency}
            onChange={(v) => update({ salary_currency: v as Currency })}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            className="w-32"
          />
        </Row>
        <Separator />
        <Row title="Theme" description="Light, dark, or follow your device.">
          <div className="inline-flex rounded-lg border p-0.5" role="radiogroup" aria-label="Theme">
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={theme === t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  theme === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </Row>
        <Separator />
        <Row title="Number format" description="How large amounts are grouped.">
          <SelectField
            value={current.number_locale}
            onChange={(v) => update({ number_locale: v as NumberLocale })}
            options={[
              { value: "en-US", label: "1,234,567", hint: "International" },
              { value: "en-IN", label: "12,34,567", hint: "Lakh / crore" },
            ]}
            className="w-52"
          />
        </Row>
      </CardContent>
    </Card>
  );
}

function RateCard() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const refresh = async () => {
    setPending(true);
    try {
      const result = await refreshRate();
      if (!result.ok) throw new Error(result.error);
      await queryClient.invalidateQueries({ queryKey: ["rate"] });
      const state = queryClient.getQueryState(["rate"]);
      if (state?.status === "error") throw new Error("Couldn't reach the rate provider");
      toast.success("Exchange rate refreshed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><RefreshCwIcon className="size-4 text-primary" /> Exchange rate</CardTitle>
        <CardDescription>Live QAR → PKR market rate, cached for an hour.</CardDescription>
      </CardHeader>
      <CardContent>
        <Row title="Current rate" description="Used for every new conversion. Saved sends keep the rate they were sent at.">
          <div className="flex items-center gap-3">
            <RateNote className="text-sm" />
            <Button variant="outline" size="sm" onClick={refresh} disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />} Refresh
            </Button>
          </div>
        </Row>
      </CardContent>
    </Card>
  );
}

function DangerCard() {
  const [dialog, setDialog] = useState<"data" | "account" | null>(null);
  const wipe = useAction(deleteAllData, "All your data was deleted");
  const queryClient = useQueryClient();

  return (
    <Card className="ring-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive"><TriangleAlertIcon className="size-4" /> Danger zone</CardTitle>
        <CardDescription>These actions can&apos;t be undone.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Row title="Delete all data" description="Removes salary, expenses, sends, debts, savings and every other entry. Your account stays.">
          <Button variant="destructive" onClick={() => setDialog("data")}>
            <DatabaseIcon /> Delete data
          </Button>
        </Row>
        <Separator />
        <Row title="Delete account" description="Permanently deletes your account and all of its data.">
          <Button variant="destructive" onClick={() => setDialog("account")}>
            <UserXIcon /> Delete account
          </Button>
        </Row>
      </CardContent>

      <ConfirmDialog
        open={dialog === "data"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Delete all your data?"
        description="Every entry you've added will be permanently removed. Your login stays."
        confirmLabel="Delete all data"
        typeToConfirm="DELETE"
        onConfirm={() => wipe.mutateAsync([]).then(() => true, () => false)}
      />
      <ConfirmDialog
        open={dialog === "account"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Delete your account?"
        description={<>Your account and all of its data will be permanently deleted. <Trash2Icon className="inline size-3.5" /></>}
        confirmLabel="Delete account"
        typeToConfirm="DELETE"
        onConfirm={async () => {
          queryClient.clear();
          const result = await deleteAccount(); // redirects to /signup on success
          if (result && !result.ok) toast.error(result.error);
          return false;
        }}
      />
    </Card>
  );
}
