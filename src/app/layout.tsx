import type { Metadata } from "next";
// NOTA build: sin next/font/google (Turbopack en Vercel fallaba resolviendo su
// loader interno). Tipografías del sistema vía --font-outfit/--font-mono en
// globals.css: cero fetch en build, mismo layout.
import "./globals.css";

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
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Restaura el tema guardado antes del primer pintado. Por defecto claro. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){document.documentElement.classList.remove("dark")}}})();`,
          }}
        />
      </head>
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
