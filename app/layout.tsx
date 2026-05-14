import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: {
    default: 'BandSix | NSW HSC results, reimagined.',
    template: '%s | BandSix',
  },
  description: 'Explore NSW HSC Distinguished Achievers, school rankings, course rankings, and calculate your estimated ATAR.',
  keywords: ['HSC', 'NSW', 'ATAR', 'Distinguished Achievers', 'All-round Achievers', 'Band 6', 'school rankings', 'NESA'],
  authors: [{ name: 'BandSix' }],
  openGraph: {
    title: 'BandSix | NSW HSC results, reimagined.',
    description: 'Explore NSW HSC Distinguished Achievers, school rankings, course rankings, and calculate your estimated ATAR.',
    type: 'website',
    locale: 'en_AU',
    siteName: 'BandSix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BandSix | NSW HSC results, reimagined.',
    description: 'Explore NSW HSC Distinguished Achievers, school rankings, course rankings, and calculate your estimated ATAR.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#060611',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className="dark">
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
