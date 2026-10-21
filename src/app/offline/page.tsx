import type { Metadata } from "next";
import { WifiOffIcon } from "lucide-react";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "Offline · Hisaab" };

/** Precached by the service worker and shown when a page can't load offline. */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <WifiOffIcon className="size-8" />
      </span>
      <div className="grid gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
        <p className="max-w-sm text-muted-foreground">
          Hisaab needs an internet connection to load your latest numbers. Check your connection and try again.
        </p>
      </div>
      <RetryButton />
    </main>
  );
}
