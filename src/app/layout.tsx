import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppLayout } from "@/src/components/layout/AppLayout";
import React, { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AbsenceHR Maroc — Gestion des Congés & Absences",
  description: "Plateforme d'entreprise pour la gestion des congés, absences et droits de récupération conformément au Code du Travail marocain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <Suspense fallback={null}>
          <AppLayout>{children}</AppLayout>
        </Suspense>
      </body>
    </html>
  );
}
