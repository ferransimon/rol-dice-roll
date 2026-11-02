import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/ui/BottomNav";
import { Toast } from "@/components/ui/Toast";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dados",
  description: "Tiradas de dados para rol: d20, reservas, percentil, Fate, Genesys y más.",
  applicationName: "Dados",
  appleWebApp: { capable: true, title: "Dados", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1b24" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Aplica el tema antes de pintar para evitar el parpadeo.
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('dados-app')||'{}');var t=(s.state&&s.state.settings&&s.state.settings.theme)||'auto';if(t==='auto')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nunito.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <Providers>
          <div className="mx-auto flex min-h-dvh max-w-xl flex-col pt-safe">{children}</div>
          <Toast />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
