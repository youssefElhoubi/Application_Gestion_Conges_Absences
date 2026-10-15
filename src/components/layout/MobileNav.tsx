"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Layers, User, LogOut } from "lucide-react";
import { navigationGroups } from "./Sidebar";
import { cn } from "@/src/lib/utils";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  // Close when pathname changes
  React.useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll when mobile nav is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl flex flex-col z-50 animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">
                AbsenceHR <span className="text-[10px] uppercase font-bold text-primary ml-1 bg-primary/10 px-1.5 py-0.5 rounded">MA</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Gestion des Congés
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                {group.label}
              </h2>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate flex-1">{item.title}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                              item.badgeVariant === "warning"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : "bg-primary/15 text-primary"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* User Quick Info & Logout */}
        <div className="p-3 border-t border-sidebar-border/60 bg-sidebar-accent/20">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">RH Manager</p>
                <p className="text-[10px] text-muted-foreground truncate">admin@entreprise.ma</p>
              </div>
            </div>
            <button
              type="button"
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
