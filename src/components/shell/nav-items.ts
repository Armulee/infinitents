import {
  BarChart3,
  Brain,
  FlaskConical,
  Inbox,
  Factory,
  LayoutDashboard,
  Send,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
}

/** Information architecture per design.md */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, shortcut: "G D" },
  { label: "Content Queue", href: "/queue", icon: Inbox, shortcut: "G Q" },
  { label: "Viral Lab", href: "/viral-lab", icon: FlaskConical, shortcut: "G V" },
  { label: "Content Factory", href: "/factory", icon: Factory, shortcut: "G F" },
  { label: "Brand Brain", href: "/brand-brain", icon: Brain, shortcut: "G B" },
  { label: "Publishing Center", href: "/publishing", icon: Send, shortcut: "G P" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, shortcut: "G A" },
  { label: "Settings", href: "/settings", icon: Settings, shortcut: "G S" },
];

/** Bottom navigation (mobile) shows the five most-used destinations. */
export const MOBILE_NAV = ["/dashboard", "/queue", "/viral-lab", "/factory", "/analytics"];
