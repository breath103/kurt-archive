import '../styles/globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';

const font = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kurt Lee',
  description: 'Software Engineer, Startup Founder, AWS Serverless Hero',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-7QJNCN56BF"
        />
        <Script
          id="googleAnalytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-7QJNCN56BF');
            `,
          }}
        />
      </head>
      <body className={font.className}>{children}</body>
    </html>
  );
}
