import type { Metadata } from 'next'
import './globals.css'
import { AuthGuard } from '@/lib/auth-guard'

export const metadata: Metadata = {
  title: 'BudżetApp',
  description:
    'Inteligentna aplikacja do zarządzania budżetem domowym z rozpoznawaniem paragonów za pomocą AI',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BudżetApp',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <head>
        <meta name="theme-color" content="#6c5ce7" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="BudżetApp" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="bg-[#0a0a0a] text-[#ededed]">
        <AuthGuard>{children}</AuthGuard>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}

function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.log('Service Worker registration failed:', err);
              });
            });
          }
        `,
      }}
    />
  )
}
