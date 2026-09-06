import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Starfield from "@/components/Starfield";

const nunito = localFont({
  src: "../fonts/nunito.woff2",
  variable: "--font-nunito",
  display: "swap",
  weight: "200 1000",
});

export const metadata: Metadata = {
  title: "Blake's Reading Jackpot",
  description: "Every minute you read is a spin. Every spin pays points.",
  applicationName: "Reading Jackpot",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Jackpot" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1230",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <Starfield />
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
