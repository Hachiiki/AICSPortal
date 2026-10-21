import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto_Condensed, Roboto } from "next/font/google";
import "./globals.css";
import { DevBanner } from "@/components/DevBanner";
import { getAppEnv } from "@/lib/env";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { ConsentGate } from "@/components/legal/ConsentGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Roboto Condensed (700) for ID card display text (names, numbers, headings)
const robotoCondensed = Roboto_Condensed({
  variable: "--font-id-display",
  subsets: ["latin"],
  weight: ["700"],
});

// Roboto (400, 500) for ID card body text (address)
const roboto = Roboto({
  variable: "--font-id-body",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  // SSR default — what logged-out users and pre-hydration tabs show.
  // Authenticated titles are managed client-side by
  // src/lib/aics/page-titles.ts ("Dashboard | AICS Portal", ...).
  title: "Login | AICS Portal",
  description:
    "Student, faculty, and staff portal for the Asian Institute of Computer Studies (AICS). An independent, student-built project.",
  keywords: ["AICS", "Asian Institute of Computer Studies", "portal", "login", "student portal"],
  authors: [{ name: "Willard James Paluga" }],
  icons: {
    icon: "/aics-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${robotoCondensed.variable} ${roboto.variable} font-sans antialiased bg-white text-slate-900`}
        suppressHydrationWarning
      >
        <DevBanner appEnv={getAppEnv()} />
        {children}
        <Toaster richColors position="bottom-right" />
        {/* Analytics beacons are cookieless but still send usage events
            to Vercel (US), so they are consent-gated and off until
            opt-in. See /legal/cookies. */}
        <ConsentGate>
          <Analytics />
          <SpeedInsights />
        </ConsentGate>
        <CookieConsent />
      </body>
    </html>
  );
}
