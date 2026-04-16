import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://kal-do-espetinho.vercel.app'),
  title: "Kal do Espetinho",
  description: "O melhor churrasco e petiscaria da região! Confira nosso cardápio online.",
  openGraph: {
    title: "Kal do Espetinho",
    description: "Confira nosso cardápio completo e faça o seu pedido online!",
    url: "https://kal-do-espetinho.vercel.app",
    siteName: "Kal do Espetinho",
    images: [{ url: "https://kal-do-espetinho.vercel.app/og-logo.png?v=2", width: 800, height: 800, alt: "Kal do Espetinho Logo" }],
    type: "website",
  },
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
