import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto_Condensed, Roboto } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  title: "AICS Portal — Login",
  description:
    "Secure student, faculty, and staff portal for the Asian Institute of Computer Studies (AICS).",
  keywords: ["AICS", "Asian Institute of Computer Studies", "portal", "login", "student portal"],
  authors: [{ name: "AICS IT Office" }],
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
        {children}
        <Toaster richColors position="top-center" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
