"use client";

import * as React from "react";
import Link from "next/link";
import {
  Layers,
  Users,
  CalendarDays,
  UserCheck,
  ArrowRight,
} from "lucide-react";

export function DashboardQuickNavigation() {
  const actions = [
    {
      title: "Registre des Absences",
      description: "Valider, filtrer ou régulariser les demandes de congés et absences",
      href: "/absences",
      icon: Layers,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Gestion des Collaborateurs",
      description: "Effectifs, fiches individuelles, compteurs et droits acquis",
      href: "/employees",
      icon: Users,
      color: "text-primary bg-primary/10 border-primary/20",
    },
    {
      title: "Planning & Calendrier",
      description: "Visualisation mensuelle des présences et des jours fériés",
      href: "/calendar",
      icon: CalendarDays,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Mon Espace Collaborateur",
      description: "Accéder au portail personnel en tant que salarié",
      href: "/portal",
      icon: UserCheck,
      color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Raccourcis & Modules Opérationnels
        </h2>
        <span className="text-xs text-muted-foreground">
          Navigation directe vers les espaces de gestion
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.href}
              href={act.href}
              className="group block rounded-2xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-md transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${act.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>

              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {act.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {act.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
