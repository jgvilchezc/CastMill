import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const fontHeading = Syne({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const fontSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://cast-mill.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Castmill — Turn Audio Into Culture",
    template: "%s | Castmill",
  },
  description:
    "Upload one podcast episode. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds.",
  keywords: [
    "podcast",
    "AI content generation",
    "podcast to blog",
    "podcast repurposing",
    "content multiplier",
    "newsletter from podcast",
    "tweet thread generator",
  ],
  authors: [{ name: "Castmill" }],
  creator: "Castmill",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Castmill",
    title: "Castmill — Turn Audio Into Culture",
    description:
      "Upload one podcast episode. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Castmill — Turn Audio Into Culture",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Castmill — Turn Audio Into Culture",
    description:
      "Upload one podcast episode. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds.",
    images: ["/opengraph-image"],
    creator: "@castmill",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontHeading.variable} antialiased`}
      >
        <Providers attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
