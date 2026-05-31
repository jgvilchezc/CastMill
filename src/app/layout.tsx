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

const siteUrl = "https://expandcast.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Expandcast — Expand Your Content. Multiply Your Reach.",
    template: "%s | Expandcast",
  },
  description:
    "Drop any video or audio. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds. For every type of creator.",
  authors: [{ name: "Expandcast" }],
  creator: "Expandcast",
  verification: {
    google: "1vQxDT_Wye7AJ1B4OTnO4anta1CuL4_ON-bQVuw7Ifs",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Expandcast",
    title: "Expandcast — Expand Your Content. Multiply Your Reach.",
    description:
      "Drop any video or audio. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Expandcast — Expand Your Content. Multiply Your Reach.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Expandcast — Expand Your Content. Multiply Your Reach.",
    description:
      "Drop any video or audio. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds.",
    images: ["/opengraph-image"],
    creator: "@expandcast",
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Expandcast",
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
      sameAs: ["https://twitter.com/expandcast"],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Expandcast",
      description:
        "Drop any video or audio. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds.",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: "Expandcast",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "Drop any video or audio. Automatically generate viral clips, blog posts, newsletters, and social threads in seconds. For every type of creator.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Expandcast" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
