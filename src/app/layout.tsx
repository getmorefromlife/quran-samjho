import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quran Samjho",
  description: "قرآن سمجھو — A minimal, Zen-mode Quran recitation and translation reader.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
