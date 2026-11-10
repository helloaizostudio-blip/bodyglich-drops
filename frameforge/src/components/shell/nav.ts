import {
  AudioLines,
  BarChart3,
  Clapperboard,
  Film,
  FolderOpen,
  Globe2,
  Home,
  LayoutPanelLeft,
  PenLine,
  Send,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon; match?: string[] };

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home", icon: Home, match: ["/episodes"] },
  { href: "/characters", label: "Character Lab", short: "Cast", icon: Users },
  { href: "/story", label: "Story Engine", short: "Story", icon: PenLine },
  { href: "/storyboard", label: "Storyboard Studio", short: "Board", icon: LayoutPanelLeft },
  { href: "/world", label: "World Builder", short: "World", icon: Globe2 },
  { href: "/assets", label: "Asset Library", short: "Assets", icon: FolderOpen },
  { href: "/animation", label: "Animation Studio", short: "Animate", icon: Clapperboard },
  { href: "/audio", label: "Audio Studio", short: "Audio", icon: AudioLines },
  { href: "/editor", label: "Video Editor", short: "Editor", icon: Film },
  { href: "/publishing", label: "Publishing Center", short: "Publish", icon: Send },
  { href: "/analytics", label: "Analytics", short: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/" || (item.match ?? []).some((m) => pathname.startsWith(m));
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
