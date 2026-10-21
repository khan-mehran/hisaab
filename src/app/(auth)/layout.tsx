import { WalletIcon } from "lucide-react";

/** Shared frame for login and signup: brand mark above a centred card. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Soft maroon glow behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl dark:bg-primary/25"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <WalletIcon className="size-6" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold tracking-tight">Hisaab</p>
            <p className="text-sm text-muted-foreground">Salary in QAR, family in PKR</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
