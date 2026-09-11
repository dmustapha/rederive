// File: web/app/layout.tsx
import "./globals.css";
import { Inter, IBM_Plex_Mono } from "next/font/google";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://rederive.xyz"),
  title: "Rederive — incremental compilation for cognition",
  description: "Agent-consumable due-diligence memory that re-derives only what changed. Built on Sibyl Memory + x402 on Base.",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/logo.png", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Rederive — incremental compilation for cognition",
    description: "An AI that researches once, remembers in Sibyl Memory, and only re-checks what changed. Paid per answer with x402 on Base.",
    url: "https://rederive.xyz",
    siteName: "Rederive",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
