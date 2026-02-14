import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Prestimo - AI エージェントのコスト見積もり",
    template: "%s | Prestimo",
  },
  description:
    "AIエージェントの月額ランニングコストを、マルチエージェント構成を考慮して概算。根拠ある上限値を30秒で算出。",
  openGraph: {
    title: "Prestimo - AI エージェントのコスト見積もり",
    description:
      "AIエージェントの月額ランニングコストを、根拠ある上限値で30秒算出",
    url: "https://prestimo.io",
    siteName: "Prestimo",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prestimo - AI エージェントのコスト見積もり",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prestimo - AI エージェントのコスト見積もり",
    description:
      "AIエージェントの月額ランニングコストを、根拠ある上限値で30秒算出",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://prestimo.io"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6" role="main">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
