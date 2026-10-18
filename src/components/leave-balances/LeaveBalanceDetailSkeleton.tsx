"use client";

import * as React from "react";
import { PageContainer } from "@/src/components/layout/PageContainer";

export function LeaveBalanceDetailSkeleton() {
  return (
    <PageContainer>
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-muted/50 rounded-2xl border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted/40 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-80 bg-muted/30 rounded-2xl" />
          <div className="lg:col-span-2 h-80 bg-muted/30 rounded-2xl" />
        </div>
      </div>
    </PageContainer>
  );
}
