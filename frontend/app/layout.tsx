import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Agent AI — Human-in-the-Loop Agentic Platform",
  description: "Multi-agent orchestration for autonomous institutional service delivery with human governance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#020817" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
