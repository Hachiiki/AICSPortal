import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto_Condensed, Roboto } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { DevBanner } from "@/components/DevBanner";
import { ThemePaletteScript } from "@/components/ThemePaletteScript";
import { ThemePaletteSync } from "@/components/ThemePaletteSync";
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
        className={`${geistSans.variable} ${geistMono.variable} ${robotoCondensed.variable} ${roboto.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {/* Theme engine (dark-theme plan §3, Phase 1): class strategy on
            <html>, system default, aics_theme storage key matching the
            aics_cookie_consent convention, no cross-fade on switches.
            The pre-paint script sets .dark before first paint (no FOUC);
            suppressHydrationWarning above covers the class/style it
            writes. Body colors come from the @layer base rule
            (bg-background text-ink), identical to the removed hardcoded
            utilities in light mode.

            Palette layer (theme expansion): ThemePaletteScript runs even
            earlier — it restores the stored dark-family palette (or saved
            custom vars) before first paint too, and ThemePaletteSync
            keeps the palette consistent whenever the theme changes
            elsewhere (topbar/login toggles). Both stay inert in light
            mode, so light rendering is unchanged. */}
        <ThemePaletteScript />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="aics_theme"
          disableTransitionOnChange
        >
          <ThemePaletteSync />
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
        </ThemeProvider>
      </body>
    </html>
  );
}
