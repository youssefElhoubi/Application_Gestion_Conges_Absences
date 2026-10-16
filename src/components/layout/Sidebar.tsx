"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarRange,
  Briefcase,
  Clock,
  Sparkles,
  Building2,
  Sliders,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Layers,
  HelpCircle,
  UserCheck,
  PlusCircle,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: "primary" | "warning" | "default";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
  {
    label: "ESPACE COLLABORATEUR",
    items: [
      { title: "Mon Espace Congés", href: "/portal", icon: CalendarCheck },
      { title: "Mes Demandes", href: "/portal/requests", icon: CalendarDays },
      { title: "Déposer un congé", href: "/portal/requests/new", icon: PlusCircle },
      { title: "Mon Profil & Droits", href: "/portal/profile", icon: UserCheck },
    ],
  },
  {
    label: "GESTION RH & ADMIN",
    items: [
      { title: "Tableau de bord RH", href: "/", icon: LayoutDashboard },
      { title: "Collaborateurs", href: "/employees", icon: Users },
      { title: "Toutes les absences", href: "/absences", icon: Layers, badge: "3", badgeVariant: "warning" },
      { title: "Calendrier mensuel", href: "/calendar", icon: CalendarRange },
    ],
  },
  {
    label: "SOLDES & CRÉDITS",
    items: [
      { title: "Soldes de congés", href: "/leave-balances", icon: Briefcase },
      { title: "Crédits récupération", href: "/recovery-credits", icon: Clock },
      { title: "Jours fériés légaux", href: "/holidays", icon: Sparkles },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [
      { title: "Sites de travail", href: "/sites", icon: Building2 },
      { title: "Règles & Paramètres", href: "/rules", icon: Sliders },
      { title: "Administration", href: "/admin", icon: ShieldCheck },
    ],
  },
];

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  className,
}) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky flex flex-col h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shrink-0 select-none z-30",
        collapsed ? "w-18" : "w-64",
        className
      )}
      aria-label="Navigation principale"
    >
      {/* Brand Header */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border/60 justify-between">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 overflow-hidden transition-all duration-200 group",
            collapsed && "justify-center w-full"
          )}
        >
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-tight text-sidebar-foreground truncate">
                AbsenceRH <span className="text-[10px] uppercase font-bold text-primary tracking-wider ml-1 bg-primary/10 px-1.5 py-0.5 rounded">MA</span>
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                Gestion des Congés
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Items Scrollable List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 scrollbar-thin">
        {navigationGroups.map((group, groupIdx) => (
          <div key={group.label || groupIdx} className="space-y-1">
            {!collapsed && (
              <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                {group.label}
              </h2>
            )}
            {collapsed && (
              <div className="h-px bg-sidebar-border/60 my-2 mx-1" />
            )}

            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group relative",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />

                      {!collapsed && (
                        <span className="truncate flex-1">{item.title}</span>
                      )}

                      {!collapsed && item.badge && (
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

                      {/* Tooltip for collapsed state */}
                      {collapsed && (
                        <span className="sr-only">{item.title}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Sidebar Footer & Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border/60 flex flex-col gap-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-sidebar-accent/30 text-xs text-muted-foreground">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">Loi n° 65-99</p>
              <p className="text-[10px] text-muted-foreground truncate">Code du travail marocain</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors w-full",
            collapsed && "justify-center px-2"
          )}
          aria-label={collapsed ? "Agrandir le menu latéral" : "Réduire le menu latéral"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Réduire le menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
