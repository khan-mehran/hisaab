import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  /** "primary" renders the maroon highlight card (e.g. Balance). */
  tone?: "default" | "primary";
  footer?: React.ReactNode;
  loading?: boolean;
  className?: string;
};

/** Summary card: icon + title on top, amount(s) below. */
export function StatCard({ title, icon: Icon, children, tone = "default", footer, loading, className }: Props) {
  const primary = tone === "primary";
  return (
    <Card
      className={cn(
        "gap-3 p-4",
        primary &&
          "bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),black_25%)] text-primary-foreground ring-0 shadow-lg shadow-primary/20",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            primary ? "bg-white/15" : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-[color-mix(in_oklch,var(--primary),white_35%)]",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className={cn("text-sm font-medium", primary ? "text-primary-foreground/85" : "text-muted-foreground")}>
          {title}
        </span>
      </div>
      {loading ? (
        <div className="grid gap-1.5">
          <Skeleton className={cn("h-7 w-32", primary && "bg-white/20")} />
          <Skeleton className={cn("h-3 w-20", primary && "bg-white/20")} />
        </div>
      ) : (
        <div className={cn(primary && "[&_.text-muted-foreground]:text-primary-foreground/75")}>{children}</div>
      )}
      {footer && !loading && (
        <div className={cn("text-xs", primary ? "text-primary-foreground/75" : "text-muted-foreground")}>{footer}</div>
      )}
    </Card>
  );
}
