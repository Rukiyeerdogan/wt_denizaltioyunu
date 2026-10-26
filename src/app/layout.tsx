import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aqua Abyss - Çok Oyunculu Denizaltı Macerası',
  description: 'Zamana karşı yarış, denizaltını yönlendirerek tropik balıkları, incileri ve batık hazineleri topla. Canlı liderlik tablosu ve çok oyunculu oda sistemi ile arkadaşlarınla yarış!',
  keywords: ['denizaltı oyunu', 'multiplayer web oyunu', 'nextjs oyun', 'canlı skor tablosu', 'aqua abyss'],
  authors: [{ name: 'Aqua Abyss Studio' }],
  openGraph: {
    title: 'Aqua Abyss - Çok Oyunculu Denizaltı Macerası',
    description: 'Derin deniz hazinelerini topla, zehirli engellerden kaç ve canlı liderlik tablosunda yerini al!',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#030811',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
