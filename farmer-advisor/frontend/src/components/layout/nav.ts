import { CloudSun, ClipboardList, MapPin, MessageCircle } from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  Icon: typeof CloudSun;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", Icon: CloudSun },
  { href: "/chat", label: "Ask", Icon: MessageCircle },
  { href: "/farm", label: "My farm", Icon: MapPin },
  { href: "/cases", label: "Cases", Icon: ClipboardList, roles: ["extension_officer", "admin"] },
];

export function visibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
