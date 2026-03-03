import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata = {
  title: 'Sales Dojo',
  description: 'AI-powered sales roleplay training',
  manifest: '/manifest.json',
  themeColor: '#111111',
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
