import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Restaurante da Jonitas",
  description: "Sistema Administrativo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&family=Oswald:wght@500;700&display=swap" rel="stylesheet" />
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <Script
          id="tailwind-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                corePlugins: {
                  preflight: false,
                },
                theme: {
                  extend: {
                    fontFamily: {
                      sans: ['Montserrat', 'sans-serif'],
                      display: ['Oswald', 'sans-serif'],
                    },
                    colors: {
                      neon: {
                        400: '#fb923c',
                        500: '#f97316',
                        600: '#ea580c',
                      }
                    },
                    boxShadow: {
                      'neon': '0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3)',
                      'neon-strong': '0 0 15px rgba(249, 115, 22, 0.7), 0 0 30px rgba(249, 115, 22, 0.5)',
                    }
                  }
                }
              }
            `
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
