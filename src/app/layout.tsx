import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Palmera Core",
  description: "Núcleo de ERP modular agnóstico e inteligente.",
};

import { SessionProvider } from "@/components/providers/SessionProvider";
import { GlobalErrorProvider } from "@/components/GlobalErrorPopup";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <GlobalErrorBoundary>
            <GlobalErrorProvider>{children}</GlobalErrorProvider>
          </GlobalErrorBoundary>
        </SessionProvider>
      </body>
    </html>
  );
}
