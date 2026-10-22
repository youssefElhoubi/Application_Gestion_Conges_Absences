"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/src/contexts/AuthContext";
import { cn } from "@/src/lib/utils";

export interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const subscribeSidebar = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getSidebarSnapshot = (): boolean => {
  try {
    return localStorage.getItem("absencemanager_sidebar_collapsed") === "true";
  } catch {
    return false;
  }
};

const getSidebarServerSnapshot = (): boolean => false;

export const AppLayout: React.FC<AppLayoutProps> = ({ children, className }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const storedCollapsed = React.useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot
  );
  const [collapsedOverride, setCollapsedOverride] = React.useState<boolean | null>(null);
  const sidebarCollapsed = collapsedOverride ?? storedCollapsed;
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Redirect to login if unauthenticated on protected pages
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const toggleSidebarCollapse = () => {
    const next = !sidebarCollapsed;
    setCollapsedOverride(next);
    try {
      localStorage.setItem("absencemanager_sidebar_collapsed", String(next));
    } catch {
      // Ignore write errors
    }
  };

  // Dedicated layout for authentication pages (Login)
  if (pathname === '/login') {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      {/* Mobile Drawer Navigation */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          className="fixed inset-y-0 left-0 z-40"
        />
      </div>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[margin] duration-300 ease-in-out",
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        )}
      >
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />

        <div className="flex min-w-0 flex-1 flex-col">
          {children}
        </div>
      </div>

    </div>
  );
};
