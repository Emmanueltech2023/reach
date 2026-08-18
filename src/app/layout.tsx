import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";
import { CurrencyProvider } from "@/components/CurrencyProvider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "REACH — Resources · Entrepreneurs · Access · Capital · Horizons",
  description: "A global verified investment ecosystem connecting Resources, Entrepreneurs, Access, Capital, and Horizons — securely, across borders.",
  keywords: ["REACH", "investment", "startup", "entrepreneurs", "resources", "capital", "horizons", "access", "DeFi", "FinTech", "Africa", "global"],
  openGraph: {
    title: "REACH",
    description: "Resources · Entrepreneurs · Access · Capital · Horizons",
    type: "website",
  },
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <CurrencyProvider>
          <Web3Provider>
            {children}
          </Web3Provider>
        </CurrencyProvider>
      </body>
    </html>
  );
}