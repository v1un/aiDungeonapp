import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Mystic Chatways',
  description: 'An immersive, chat-centric text-based RPG powered by AI.',
  keywords: ['AI RPG', 'text adventure', 'interactive fiction', 'AI storytelling'],
  authors: [{ name: 'Mystic Chatways Team' }],
};

export const viewport: Viewport = {
  themeColor: '#8865FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased overflow-x-hidden bg-[url('/subtle-pattern.png')] bg-repeat bg-fixed">
        <div className="min-h-screen bg-background/95 backdrop-blur-sm">
          {children}
          <Toaster />
        </div>
      </body>
    </html>
  );
}
