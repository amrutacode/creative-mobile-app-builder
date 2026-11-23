import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AuthDialogProvider } from "@/components/providers/auth-dialog-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AppForge — AI Mobile App Builder",
  description: "Describe your idea and let AppForge generate a working mobile app in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ margin: 0, padding: 0 }}>
        <AuthDialogProvider>{children}</AuthDialogProvider>
      </body>
    </html>
  );
}
