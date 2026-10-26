import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Karaoke Studio — Professional Performance Suite',
  description: 'Cross-platform Live Karaoke with Zero-Latency DSP, Synchronized Lyrics, and Studio Vocal Chain for Hollywood, Bollywood, and Global Repertoires.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#07080a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-studio-950 text-white min-h-screen antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
