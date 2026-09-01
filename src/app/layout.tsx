import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, Inter } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";
import { CurrencyProvider } from "@/components/CurrencyProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#0F0F1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "REACH — Resources · Entrepreneurs · Access · Capital · Horizons",
  description: "A global verified ecosystem connecting Investors, Startup Builders, and Tech Talent — securely across borders.",
  keywords: ["REACH", "investment", "startup", "talent", "entrepreneurs", "resources", "capital", "jobs", "hiring", "DeFi", "FinTech", "Africa", "global"],
  openGraph: {
    title: "REACH",
    description: "Resources · Entrepreneurs · Access · Capital · Horizons · Talent",
    type: "website",
    images: ["/logo-icon.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/logo-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-precomposed.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
};

import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import CookieConsentBanner from "@/components/CookieConsentBanner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${outfit.variable} ${inter.variable}`}>
      <body className={inter.className}>
        <CurrencyProvider>
          <Web3Provider>
            {children}
            <PwaInstallPrompt />
            <CookieConsentBanner />
          </Web3Provider>
        </CurrencyProvider>
      </body>
    </html>
  );
}