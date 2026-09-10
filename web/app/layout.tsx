// File: web/app/layout.tsx
import "./globals.css";
import { Inter, IBM_Plex_Mono } from "next/font/google";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap",
});

export const metadata = {
  title: "Rederive — incremental compilation for cognition",
  description: "Agent-consumable due-diligence memory that re-derives only what changed. Built on Sibyl Memory + x402 on Base.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
