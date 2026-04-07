import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body"
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

export const metadata: Metadata = {
  title: "FinBoard AI",
  description: "A clean financial board for scanner, swing predictions, and market chat."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
