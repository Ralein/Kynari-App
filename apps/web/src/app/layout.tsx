import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Kynari — Your Child's Emotional World, Made Visible",
  description:
    "Privacy-first AI emotion detection for toddlers. Kynari listens for tone — not words — and helps parents understand their child's emotional patterns.",
  keywords: [
    "toddler",
    "baby monitor",
    "child emotions",
    "parenting",
    "mood tracker",
    "emotional intelligence",
  ],
  openGraph: {
    title: "Kynari — Your Child's Emotional World, Made Visible",
    description:
      "Privacy-first AI emotion detection for toddlers ages 1–5.",
    type: "website",
    siteName: "Kynari",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-surface antialiased">{children}</body>
    </html>
  );
}
