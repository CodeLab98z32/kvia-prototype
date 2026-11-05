import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { AppStateProvider } from "@/lib/state";

export const metadata: Metadata = {
  title: "Kvia — Tender matching for SMEs",
  description: "Prototype of the Tender Matching flagship service for the AI Adoption and Innovation Centre. Synthetic company data, real Doffin notices (snapshot 2026-10-26).",
  robots: { index: false, follow: false },
};

// Applies the stored theme before first paint (follows the system on first visit).
const themeInit = `try{var t=localStorage.getItem('kvia.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <AppStateProvider>
            <AppShell>{children}</AppShell>
          </AppStateProvider>
        </Suspense>
      </body>
    </html>
  );
}
