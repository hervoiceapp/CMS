"use client"
import Logo from "@/components/ui/logo"
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DashboardCircleIcon,
  MedicalFileIcon,
  PodcastIcon,
  Video01Icon,
  UserMultipleIcon,
  StethoscopeIcon,
  CalendarCheckIcon,
  FlagIcon,
  BotIcon,
} from "@hugeicons/core-free-icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconSvgElement;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Ecosystem Status",
    items: [{ href: "/", label: "Dashboard", icon: DashboardCircleIcon, exact: true }],
  },
  {
    label: "Media & Copywriting",
    items: [
      { href: "/articles", label: "Article & Guides", icon: MedicalFileIcon },
      { href: "/podcasts", label: "Podcast Episodes", icon: PodcastIcon },
      { href: "/videos", label: "Therapy Videos", icon: Video01Icon },
    ],
  },
  {
    label: "Community & Support",
    items: [{ href: "/feed", label: "Social Feed", icon: UserMultipleIcon }],
  },
  {
    label: "Clinical Providers",
    items: [
      { href: "/doctors", label: "Physicians Registry", icon: StethoscopeIcon },
      { href: "/appointments", label: "Appointment Book", icon: CalendarCheckIcon },
    ],
  },
  {
    label: "System & Engagement",
    items: [
      { href: "/alerts", label: "Push Alerts Dispatch", icon: FlagIcon },
      { href: "/copilot", label: "AI Copilot", icon: BotIcon },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lgtext-sm font-bold text-primary-foreground">
                <Logo className="size-8" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">HerVoice</span>
                <span className="text-xs text-muted-foreground">
                  Management System
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <HugeiconsIcon icon={item.icon} size={20} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
