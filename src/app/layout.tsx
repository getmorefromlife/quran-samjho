import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quran Samjho",
  description: "قرآن سمجھو — A community service initiative by Syed Imon Rizvi (Mercer and Mills) to read, understand, and reflect on the Holy Quran. Interfaith dialogue and humanitarian work for world peace.",
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
