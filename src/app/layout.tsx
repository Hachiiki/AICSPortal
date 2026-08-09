import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AICS Portal — Login",
  description:
    "Secure student, faculty, and staff portal for the Asian Institute of Computer Studies (AICS).",
  keywords: ["AICS", "Asian Institute of Computer Studies", "portal", "login", "student portal"],
  authors: [{ name: "AICS IT Office" }],
  icons: {
    icon: "/aics/logo.svg",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-slate-900`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
