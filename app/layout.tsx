import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tourneo",
  description: "Créez et gérez facilement vos tournois.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5430749057269196"
          crossOrigin="anonymous"
        />
      </head>

      <body className="min-h-full flex flex-col">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2500,
            style: {
              background: "#111827",
              color: "#fff",
              border: "1px solid #2563eb",
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}
