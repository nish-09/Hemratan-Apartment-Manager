import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hemratan Apartment Manager | One community. One connected platform.',
  description: 'Production-grade residential society management platform for Hemratan Apartments.',
  keywords: ['residential management', 'society management', 'apartment manager', 'visitor log', 'maintenance billing'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="min-h-screen bg-[#EAE5FA] text-[#20243A] flex flex-col p-2 sm:p-4 md:p-6 lg:p-8 antialiased selection:bg-[#C9F36B] selection:text-[#20243A]">
        {children}
      </body>
    </html>
  );
}
