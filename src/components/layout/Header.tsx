"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  Search,
  ChevronRight,
  User,
  HelpCircle,
  LogOut,
  Check,
  Building,
  Calendar,
  Briefcase,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/contexts/AuthContext";

export interface HeaderProps {
  onOpenMobileNav: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav, className }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbMap: Record<string, string> = {
    portal: "Espace Collaborateur",
    requests: "Mes Demandes",
    new: "Nouvelle Demande",
    profile: "Mon Profil & Droits",
    employees: "Collaborateurs",
    absences: "Demandes d'absence",
    calendar: "Calendrier mensuel",
    "leave-balances": "Soldes de congés",
    "recovery-credits": "Crédits récupération",
    holidays: "Jours fériés légaux",
    sites: "Sites de travail",
    rules: "Règles & Paramètres",
    admin: "Administration",
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-background/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 transition-colors",
        className
      )}
    >
      {/* Left: Mobile Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Ouvrir le menu de navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb Trail */}
        <nav aria-label="Fil d'Ariane" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link
            href="/"
            className="hover:text-foreground font-medium transition-colors"
          >
            Accueil
          </Link>
          {pathSegments.length > 0 && (
            <>
              {pathSegments.map((segment, index) => {
                const isLast = index === pathSegments.length - 1;
                const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
                const label = breadcrumbMap[segment] || segment;

                return (
                  <React.Fragment key={href}>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                    {isLast ? (
                      <span className="font-semibold text-foreground truncate max-w-[150px]">
                        {label}
                      </span>
                    ) : (
                      <Link
                        href={href}
                        className="hover:text-foreground transition-colors truncate max-w-[120px]"
                      >
                        {label}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* Right: Search, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Trigger */}
        <button
          type="button"
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/50 hover:bg-muted border border-border/60 rounded-md transition-colors"
          title="Recherche rapide"
          aria-label="Recherche rapide"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Recherche...</span>
          <kbd className="hidden md:inline text-[10px] font-mono bg-card px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </kbd>
        </button>

        {/* Active Site Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-md">
          <Building className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">Siège Casablanca</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-card p-3 shadow-lg z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                <span className="text-xs font-semibold text-foreground">
                  Notifications
                </span>
                <span className="text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1">
                  <Check className="h-3 w-3" /> Tout marquer comme lu
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer">
                  <p className="font-medium text-foreground">Demande d&apos;absence en attente</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Amine Alami a demandé 3 jours de congé payé.
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                    Il y a 15 minutes
                  </span>
                </div>
                <div className="p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                  <p className="font-medium text-foreground">Crédit de récupération accordé</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Jour férié travaillé validé pour Fatima Zahra.
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 mt-1 block">
                    Il y a 2 heures
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Menu Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-full sm:rounded-md hover:bg-muted transition-colors text-left"
            aria-label="Menu utilisateur"
            aria-expanded={userMenuOpen}
          >
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase">
              {user?.fullName
                ? user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                : user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="hidden sm:flex flex-col min-w-0 pr-1">
              <span className="text-xs font-semibold text-foreground truncate leading-tight">
                {user?.fullName || user?.email || "Utilisateur"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight">
                {user?.role === "ADMIN"
                  ? "Administrateur Système"
                  : user?.role === "HR_MANAGER"
                  ? "Responsable RH"
                  : user?.role === "SUPERVISOR"
                  ? "Superviseur / Manager"
                  : "Collaborateur"}
              </span>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card p-1.5 shadow-lg z-50 animate-fadeIn text-xs">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="font-semibold text-foreground truncate">
                  {user?.fullName || "Utilisateur"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                  {user?.role} • {user?.employeeId || "COMPTE"}
                </span>
              </div>

              <Link
                href="/portal"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-primary/10 text-primary font-medium transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Mon Espace Collaborateur</span>
              </Link>
              <Link
                href="/portal/requests"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted transition-colors text-foreground"
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Mes Demandes de congé</span>
              </Link>
              <Link
                href="/portal/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted transition-colors text-foreground"
              >
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>Mon Profil & Droits</span>
              </Link>
              <a
                href="#guide"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted transition-colors text-foreground"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <span>Code du travail (Loi 65-99)</span>
              </a>

              <div className="h-px bg-border my-1" />

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-destructive/10 text-destructive w-full text-left transition-colors font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Se déconnecter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
