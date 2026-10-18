"use client";

import * as React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { cn } from "@/src/lib/utils";

export interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, className }) => {
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

  return (
    <div className={cn("min-h-screen bg-background text-foreground antialiased", className)}>
      {/* Mobile Drawer Navigation (Small/Medium screens) */}

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
