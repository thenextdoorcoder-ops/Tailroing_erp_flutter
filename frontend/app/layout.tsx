import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import PwaRegister from '@/components/PwaRegister';
import IdleTimeout from '@/components/IdleTimeout';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from 'react-hot-toast';
import DocumentTitleUpdater from '@/components/DocumentTitleUpdater';
import NavigationProgress from '@/components/NavigationProgress';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ktownaariworks.store';

export const metadata: Metadata = {
  title: "KTown Aari Works | Premium Aari Materials and Designer Blouses",
  description: "Shop premium designer sarees, custom blouses, chudis, and high-quality tailoring materials. Expert Aari work and custom tailoring services at KTown Aari Works.",
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "KTown Aari Works | Premium Aari Materials and Designer Blouses",
    description: "Shop premium designer sarees, custom blouses, and tailoring materials. Expert Aari work at KTown Aari Works.",
    url: baseUrl,
    siteName: "KTown Aari Works",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KTown Aari Works | Premium Aari Materials",
    description: "Shop premium designer sarees, custom blouses, and tailoring materials.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/api/manifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#db2777" />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Skip-to-content for keyboard and screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-pink-600 focus:text-white focus:rounded-md focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <NavigationProgress />
                <DocumentTitleUpdater />
                <PwaRegister />
                <IdleTimeout />
                {children}
                <Toaster />
                <HotToaster position="bottom-center" toastOptions={{ style: { fontSize: '14px', fontWeight: 600 } }} />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
