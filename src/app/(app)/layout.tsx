import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/app/app-shell";

/**
 * Layout for every signed-in page. The proxy guarantees a session here.
 * Everything inside depends on the current date and the user's data, so it
 * renders at request time behind Suspense; the static shell is the skeleton.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1">
      <div className="hidden w-64 shrink-0 border-r bg-sidebar lg:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b" />
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 pt-5 lg:px-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
