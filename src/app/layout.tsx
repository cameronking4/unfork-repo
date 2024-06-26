import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import '../styles/globals.css';

import { ContextProvider } from '@/components/context-provider';
import Header from '@/components/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Un-Fork Repo',
  description: 'Unlink the parent from your forked github repository.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="/icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
        <script
          src="https://beamanalytics.b-cdn.net/beam.min.js"
          data-token="a07e2826-5910-4684-9e69-0ec4388a0509"
          async
        ></script>
      </head>
      <body className={inter.className}>
        <ContextProvider>
          <main className="w-full">
            <div className="p-4 mt-10 flex w-full flex-col space-y-6 items-center justify-center text-start">
              <div className="max-w-5xl flex w-full flex-col">
                <Header />
                {children}
              </div>
            </div>
          </main>
        </ContextProvider>
      </body>
    </html>
  );
}
