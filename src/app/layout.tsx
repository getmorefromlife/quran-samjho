import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = "https://getmorefromlife.github.io/quran-samjho";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Quran Samjho",
  description: "قرآن سمجھو — A community service initiative by Syed Imon Rizvi (Mercer and Mills) to read, understand, and reflect on the Holy Quran. Interfaith dialogue and humanitarian work for world peace.",
  icons: {
    icon: "/quran-samjho/logo.png",
    apple: "/quran-samjho/logo.png",
  },
  openGraph: {
    title: "Quran Samjho — قرآن سمجھو",
    description: "Read, understand, and reflect on the Holy Quran. Arabic, Urdu (Jawadi & Najafi), and English (Qarai) translations. A community service by Syed Imon Rizvi (Mercer and Mills).",
    url: BASE_URL,
    siteName: "Quran Samjho",
    images: [
      {
        url: "/logo.png",
        width: 1254,
        height: 1254,
        alt: "Quran Samjho logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Quran Samjho — قرآن سمجھو",
    description: "Read, understand, and reflect on the Holy Quran. A community service by Syed Imon Rizvi (Mercer and Mills).",
    images: ["/logo.png"],
  },
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
