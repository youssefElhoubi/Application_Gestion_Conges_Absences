"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Sparkles,
  User,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/src/components/ui/card";

export interface BalanceQuickActionsCardProps {
  employeeId: string;
}

export function BalanceQuickActionsCard({
  employeeId,
}: BalanceQuickActionsCardProps) {
  const encodedId = encodeURIComponent(employeeId);

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-3 border-b border-border/70">
        <CardTitle className="text-sm font-bold">Actions et Navigation</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-1.5 text-xs">
        <Link
          href={`/employees/${encodedId}`}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
        >
          <span className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            Consulter le dossier collaborateur
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href={`/absences?search=${encodedId}&employeeId=${encodedId}`}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            Toutes les absences du collaborateur
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href={`/recovery-credits?search=${encodedId}&employeeId=${encodedId}`}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            Grand livre des crédits de récupération
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/leave-balances"
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-foreground font-medium group"
        >
          <span className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            Retour à la vue consolidée des soldes
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardContent>
    </Card>
  );
}
