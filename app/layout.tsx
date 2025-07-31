import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Parheheon HKBP Riau 2025 - Sistem Absensi Digital',
  description: 'Sistem absensi digital modern untuk acara Parheheon HKBP Riau 2025. Fitur QR Code dan Barcode scanner untuk pencatatan kehadiran peserta yang akurat dan efisien.',
  keywords: 'Parheheon, HKBP, Riau, 2025, absensi, digital, QR Code, barcode, scanner, kehadiran, peserta, gereja, kristen',
  authors: [{ name: 'HKBP Riau' }],
  creator: 'HKBP Riau',
  publisher: 'HKBP Riau',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://parheheon-hkbp-riau-2025.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Parheheon HKBP Riau 2025 - Sistem Absensi Digital',
    description: 'Sistem absensi digital modern untuk acara Parheheon HKBP Riau 2025. Fitur QR Code dan Barcode scanner untuk pencatatan kehadiran peserta yang akurat dan efisien.',
    url: 'https://parheheon-hkbp-riau-2025.vercel.app',
    siteName: 'Parheheon HKBP Riau 2025',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Parheheon HKBP Riau 2025 - Sistem Absensi Digital',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Parheheon HKBP Riau 2025 - Sistem Absensi Digital',
    description: 'Sistem absensi digital modern untuk acara Parheheon HKBP Riau 2025.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <head>
        {/* Primary favicon with data URL for immediate loading */}
        <link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZDEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGVhNWU5O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMjg0Yzc7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICAKICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgZmlsbD0idXJsKCNncmFkMSkiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgCiAgPHBhdGggZD0iTTEyIDggTDIwIDggTDIwIDEyIEwyNCAxMiBMMjQgMjAgTDIwIDIwIEwyMCAyNCBMMTIgMjQgTDEyIDIwIEw4IDIwIEw4IDEyIEwxMiAxMiBaIiAKICAgICAgICAgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIvPgogIAogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjIiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K" type="image/svg+xml" />
        <link rel="shortcut icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZDEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGVhNWU5O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMjg0Yzc7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICAKICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgZmlsbD0idXJsKCNncmFkMSkiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgCiAgPHBhdGggZD0iTTEyIDggTDIwIDggTDIwIDEyIEwyNCAxMiBMMjQgMjAgTDIwIDIwIEwyMCAyNCBMMTIgMjQgTDEyIDIwIEw4IDIwIEw4IDEyIEwxMiAxMiBaIiAKICAgICAgICAgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIvPgogIAogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjIiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K" type="image/svg+xml" />
        
        {/* Fallback favicons for different browsers */}
        <link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZDEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGVhNWU5O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMwMjg0Yzc7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICAKICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNSIgZmlsbD0idXJsKCNncmFkMSkiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgCiAgPHBhdGggZD0iTTEyIDggTDIwIDggTDIwIDEyIEwyNCAxMiBMMjQgMjAgTDIwIDIwIEwyMCAyNCBMMTIgMjQgTDEyIDIwIEw4IDIwIEw4IDEyIEwxMiAxMiBaIiAKICAgICAgICAgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIvPgogIAogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjIiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuOCIvPgo8L3N2Zz4K" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        
        {/* Apple touch icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" sizes="180x180" />
        
        {/* Android icons */}
        <link rel="icon" href="/android-chrome-192x192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/android-chrome-512x512.png" type="image/png" sizes="512x512" />
        
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme colors */}
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-TileImage" content="/mstile-144x144.png" />
        
        {/* Application metadata */}
        <meta name="application-name" content="Parheheon HKBP Riau 2025" />
        <meta name="apple-mobile-web-app-title" content="Parheheon HKBP" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
