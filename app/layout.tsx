import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "光和建材 営業日報・週報",
  description: "光和建材 営業日報・週報Webアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
