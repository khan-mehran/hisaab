"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SettingsIcon, UserIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/queries";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isActive, MOBILE_PRIMARY, NAV_ITEMS, type NavItem } from "./nav";
import { UserMenu } from "./user-menu";
import { MonthProvider } from "./month-context";
import { InstallPrompt } from "./install-prompt";

const COLLAPSED_KEY = "sidebar-collapsed";

/**
 * Signed-in layout: collapsible sidebar on desktop; on mobile a slide-in
 * menu from the top bar, bottom navigation and a More drawer.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { data: profile } = useProfile();

  // Remember whether the desktop sidebar was closed (per-device convenience).
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after hydration
      if (localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggleSidebar = () => {
    // Desktop collapses the sidebar; smaller screens open it as a slide-in menu.
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setMenuOpen(true);
      return;
    }
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const primary = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
  const secondary = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));
  const moreActive = secondary.some((i) => isActive(pathname, i.href)) || ["/profile", "/settings"].includes(pathname);

  return (
    <MonthProvider>
      <div className="flex min-h-dvh flex-1">
        {/* Desktop sidebar: full width, or an icon-only rail when collapsed. */}
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r bg-sidebar transition-[width] duration-200 lg:block",
            collapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <SidebarContent pathname={pathname} collapsed={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <MenuIcon className="lg:hidden" />
                {collapsed ? <PanelLeftOpenIcon className="hidden lg:block" /> : <PanelLeftCloseIcon className="hidden lg:block" />}
              </Button>
              <div className="min-w-0 leading-tight">
                <p className="text-xs text-muted-foreground">Welcome back</p>
                {profile ? (
                  <p className="truncate font-heading font-semibold tracking-tight">{profile.name}</p>
                ) : (
                  <Skeleton className="mt-1 h-4 w-28" />
                )}
              </div>
            </div>
            <UserMenu />
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pb-10">
            <InstallPrompt />
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          {primary.map((item) => (
            <BottomLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium", moreActive ? "text-primary" : "text-muted-foreground")}
          >
            <MenuIcon className="size-5" />
            More
          </button>
        </nav>

        {/* Mobile slide-in menu with the full sidebar */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-72 bg-sidebar p-0 sm:max-w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 px-4">
              {[...secondary, { href: "/profile", label: "Profile", icon: UserIcon }, { href: "/settings", label: "Settings", icon: SettingsIcon }].map(
                (item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium transition-colors",
                        active ? "border-primary/40 bg-primary/10 text-primary" : "hover:bg-muted",
                      )}
                    >
                      <item.icon className="size-5" />
                      {item.label}
                    </Link>
                  );
                },
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MonthProvider>
  );
}

/**
 * Brand, main navigation, then Profile and Settings. Shared by the desktop
 * sidebar (optionally collapsed to icons) and the mobile slide-in menu.
 */
function SidebarContent({
  pathname,
  collapsed = false,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex h-full flex-col", collapsed ? "w-[4.5rem]" : "w-64")}>
      <Brand className={cn("py-5", collapsed ? "justify-center px-0" : "px-5")} iconOnly={collapsed} onClick={onNavigate} />
      <nav className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-3" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} iconOnly={collapsed} onClick={onNavigate} />
        ))}
      </nav>
      <div className="space-y-0.5 border-t p-3">
        <SideLink item={{ href: "/profile", label: "Profile", icon: UserIcon }} active={pathname === "/profile"} iconOnly={collapsed} onClick={onNavigate} />
        <SideLink item={{ href: "/settings", label: "Settings", icon: SettingsIcon }} active={pathname === "/settings"} iconOnly={collapsed} onClick={onNavigate} />
      </div>
    </div>
  );
}

function Brand({ className, iconOnly, onClick }: { className?: string; iconOnly?: boolean; onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} title={iconOnly ? "Hisaab" : undefined} className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/25">
        <WalletIcon className="size-4" />
      </span>
      {!iconOnly && <span className="font-heading text-lg font-semibold tracking-tight whitespace-nowrap">Hisaab</span>}
    </Link>
  );
}

function SideLink({
  item,
  active,
  iconOnly,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  iconOnly?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      // Icon-only links keep an accessible name and show the label on hover.
      aria-label={iconOnly ? item.label : undefined}
      title={iconOnly ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg py-2 text-sm font-medium whitespace-nowrap transition-colors",
        iconOnly ? "justify-center px-0" : "px-3",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      {!iconOnly && item.label}
    </Link>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn("flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium", active ? "text-primary" : "text-muted-foreground")}
    >
      <span className={cn("rounded-full px-3 py-0.5 transition-colors", active && "bg-primary/10")}>
        <item.icon className="size-5" />
      </span>
      {item.label}
    </Link>
  );
}
