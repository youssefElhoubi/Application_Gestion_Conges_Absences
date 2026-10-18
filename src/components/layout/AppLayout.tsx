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

export const AppLayout: React.FC<AppLayoutProps> = ({ children, className }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Restore sidebar preference from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("absencemanager_sidebar_collapsed");
      if (stored !== null) {
        setSidebarCollapsed(stored === "true");
      }
    } catch {
      // Ignore localStorage read errors in SSR or restricted contexts
    }
  }, []);

  // Redirect to login if unauthenticated on protected pages
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("absencemanager_sidebar_collapsed", String(next));
      } catch {
        // Ignore write errors
      }
      return next;
    });
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
