import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "iVest — Invest in Innovation. Build the Future.",
  description: "A global verified investment ecosystem connecting investors and builders — securely, across borders.",
  keywords: ["investment", "startup", "investors", "builders", "DeFi", "FinTech", "Africa", "global"],
  openGraph: {
    title: "iVest",
    description: "Invest in Innovation. Build the Future.",
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
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}