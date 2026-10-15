"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  PlusCircle,
  User,
  Building2,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { PortalProfileData } from "@/src/lib/api/portal-client";

export interface PortalHeaderProps {
  data?: PortalProfileData | null;
  onOpenNewRequest?: () => void;
  className?: string;
}

export function PortalHeader({ data, onOpenNewRequest, className }: PortalHeaderProps) {
  const pathname = usePathname();

  const employeeName = data?.employee?.fullName || "Collaborateur";
  const jobTitle = data?.employee?.jobTitle || "Collaborateur";
  const siteName = data?.employee?.site?.name || "Siège";
  const employeeId = data?.employee?.employeeId;

  const tabs = [
    { label: "Vue d'ensemble", href: "/portal", icon: LayoutDashboard },
    { label: "Mes Demandes", href: "/portal/requests", icon: CalendarDays },
    { label: "Déposer un congé", href: "/portal/requests/new", icon: PlusCircle },
    { label: "Mon Profil & Droits", href: "/portal/profile", icon: User },
  ];

  return (
    <div className={cn("space-y-4 mb-6", className)}>
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-background to-muted/40 border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Espace Collaborateur Libre-Service
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Bonjour, {employeeName.split(" ")[0]} 👋
          </h1>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Briefcase className="h-3.5 w-3.5 text-primary" /> {jobTitle}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {siteName}
            </span>
            {employeeId && (
              <>
                <span>•</span>
                <span className="font-mono text-xs text-muted-foreground">Matricule: {employeeId}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenNewRequest ? (
            <Button
              onClick={onOpenNewRequest}
              leftIcon={<PlusCircle className="h-4 w-4" />}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              Déposer une demande
            </Button>
          ) : (
            <Link href="/portal/requests/new">
              <Button
                leftIcon={<PlusCircle className="h-4 w-4" />}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
              >
                Déposer une demande
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
