"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bell,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  Sparkles,
  Brain,
  Settings,
  DollarSign,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  User,
  SlidersHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/uiSlice";
import { clearCredentials } from "@/store/slices/authSlice";
import { useLogoutMutation } from "@/store/api/authApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Groups", href: "/groups", icon: Users },
      { label: "Activity", href: "/activity", icon: Bell },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
      { label: "Budgets", href: "/budgets", icon: PiggyBank },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "AI",
    items: [
      { label: "Smart Categorize", href: "/categorize", icon: Sparkles },
      { label: "Insights", href: "/insights", icon: Brain },
    ],
  },
];

const bottomNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

const getInitials = (name: string | undefined): string => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar = ({ mobileOpen, onMobileClose }: SidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const collapsed = !useAppSelector((s) => s.ui.sidebarOpen);
  const user = useAppSelector((s) => s.auth.user);
  const [logout] = useLogoutMutation();

  const handleLogout = useCallback(async () => {
    try {
      await logout().unwrap();
    } catch {
      /* proceed even if the API call fails */
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    dispatch(clearCredentials());
    router.push("/login");
  }, [logout, dispatch, router]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      onMobileClose();
    }
  }, [pathname, onMobileClose]);

  // Keyboard shortcut: [ toggles sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "[" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        dispatch(toggleSidebar());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
          "transition-colors duration-150",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            active
              ? "text-primary"
              : "text-muted-foreground group-hover:text-accent-foreground"
          )}
        />
        <span
          className={cn(
            "truncate",
            collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
          )}
        >
          {item.label}
        </span>
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b px-4",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <DollarSign className="h-5 w-5" />
        </div>
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            collapsed
              ? "w-0 opacity-0 overflow-hidden"
              : "w-auto opacity-100"
          )}
        >
          Splitwise
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p
                className={cn(
                  "mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70",
                  collapsed && "h-0 opacity-0 overflow-hidden mb-0"
                )}
              >
                {section.title}
              </p>
              {collapsed && (
                <Separator className="mb-2 opacity-50" />
              )}
              <div className="flex flex-col gap-1">
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t">
        <div className="px-3 py-3">
          <div className="flex flex-col gap-1">
            {bottomNav.map(renderNavItem)}
          </div>
        </div>

        <Separator />

        {/* User profile */}
        <div className={cn("px-3 py-3", collapsed && "px-2")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-2 text-left",
                  "hover:bg-accent",
                  collapsed && "justify-center"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/10">
                  <AvatarImage
                    src={user?.avatar ?? undefined}
                    alt={user?.name}
                  />
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "min-w-0 flex-1",
                    collapsed
                      ? "w-0 opacity-0 overflow-hidden"
                      : "w-auto opacity-100"
                  )}
                >
                  <p className="truncate text-sm font-medium">
                    {user?.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email ?? ""}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={collapsed ? "right" : "top"}
              align="start"
              className="w-56"
            >
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name ?? "User"}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email ?? ""}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t px-3 py-2 lg:block">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(toggleSidebar())}
                className={cn(
                  "w-full text-muted-foreground hover:text-foreground",
                  collapsed ? "justify-center" : "justify-start"
                )}
              >
                {collapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronsLeft className="h-4 w-4 mr-2" />
                    <span className="text-xs">Collapse</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="font-medium">
                Expand sidebar
                <span className="ml-2 text-xs text-muted-foreground">
                  Ctrl+[
                </span>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r bg-sidebar-background text-sidebar-foreground",
          "transition-transform duration-300 ease-in-out lg:hidden",
          "shadow-2xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 border-r bg-sidebar-background text-sidebar-foreground lg:block",
          "transition-[width] duration-200 ease-in-out",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
