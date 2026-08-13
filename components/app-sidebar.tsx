"use client";
import { useMemo } from "react";
import Logo from "@/components/ui/logo";
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
import { useAuth, type Role } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
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
  Settings01Icon,
  SunriseIcon,
  FileValidationIcon,
  ShieldUserIcon,
} from "@hugeicons/core-free-icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconSvgElement;
  exact?: boolean;
  roles?: Role[];
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
    items: [
      { href: "/feed", label: "Social Feed", icon: UserMultipleIcon, roles: ["admin"] },
      { href: "/motivations", label: "Daily Motivations", icon: SunriseIcon, roles: ["admin"] },
      {
        href: "/screenings",
        label: "Screening Results",
        icon: FileValidationIcon,
        roles: ["admin"],
      },
    ],
  },
  {
    label: "Clinical Providers",
    items: [
      { href: "/doctors", label: "Physicians Registry", icon: StethoscopeIcon, roles: ["admin"] },
      { href: "/appointments", label: "Appointment Book", icon: CalendarCheckIcon },
    ],
  },
  {
    label: "System & Engagement",
    items: [
      { href: "/alerts", label: "Push Alerts Dispatch", icon: FlagIcon, roles: ["admin"] },
      { href: "/users", label: "User Management", icon: ShieldUserIcon, roles: ["admin"] },
      { href: "/copilot", label: "AI Copilot", icon: BotIcon, roles: ["admin"] },
      { href: "/settings", label: "App Settings", icon: Settings01Icon, roles: ["admin"] },
    ],
  },
];

const roleLabel: Record<Role, string> = {
  admin: "Administrator",
  medical: "Medical Practitioner",
};

export function AppSidebar() {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();

  const visibleGroups = useMemo(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.roles || (role && item.roles.includes(role))),
      }))
      .filter((group) => group.items.length > 0);
  }, [role]);

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
                <span className="text-xs text-muted-foreground">Management System</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {visibleGroups.map((group) => (
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
        <div className="flex items-center justify-between gap-2 border-t px-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">{role ? roleLabel[role] : "Signed in"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
