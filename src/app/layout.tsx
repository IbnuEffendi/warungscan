import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WarungScan - Kasir & Stok Warung",
  description: "Aplikasi kasir pintar dan restok belanja via foto struk untuk warung mandiri.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WarungScan",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#15803d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full bg-slate-100 select-none">
      <body className="min-h-full flex flex-col font-sans text-slate-900 bg-slate-100 antialiased">
        <div className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto min-h-screen bg-white shadow-2xl flex flex-col relative border-x border-slate-200/80">
          {children}
        </div>
      </body>
    </html>
  );
}
