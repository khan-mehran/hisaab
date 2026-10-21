import {
  CreditCardIcon,
  HandCoinsIcon,
  HandHeartIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  VaultIcon,
  ReceiptIcon,
  SendIcon,
  ShapesIcon,
  UsersIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/expenses", label: "Expenses", icon: ReceiptIcon },
  { href: "/sent", label: "Sent", icon: SendIcon },
  { href: "/charity", label: "Charity", icon: HandHeartIcon },
  { href: "/debt", label: "Debt", icon: HandCoinsIcon },
  { href: "/installments", label: "Installments", icon: CreditCardIcon },
  { href: "/others", label: "Others", icon: ShapesIcon },
  { href: "/savings/personal", label: "Personal Savings", icon: VaultIcon },
  { href: "/savings/family", label: "Family Savings", icon: UsersIcon },
];

/** Items pinned to the mobile bottom bar; the rest live in the More drawer. */
export const MOBILE_PRIMARY = ["/", "/expenses", "/sent", "/debt"];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
