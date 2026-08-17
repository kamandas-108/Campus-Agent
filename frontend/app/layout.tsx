import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Agent AI — Human-in-the-Loop Agentic Platform",
  description: "Multi-agent orchestration for autonomous institutional service delivery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0f1e" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: "#0a0f1e", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
