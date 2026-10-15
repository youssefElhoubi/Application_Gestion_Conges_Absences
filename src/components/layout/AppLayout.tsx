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
    <div className={cn("min-h-screen flex bg-background text-foreground antialiased", className)}>
      {/* Mobile Drawer Navigation (Small/Medium screens) */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Desktop Collapsible Sidebar (Large screens) */}
      <div className="hidden lg:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
};
