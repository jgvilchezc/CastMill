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
  keywords: [
    "content repurposing",
    "AI content generation",
    "video to blog",
    "podcast repurposing",
    "content multiplier",
    "YouTube to newsletter",
    "tweet thread generator",
    "content creator tools",
    "viral clips",
    "social media automation",
  ],
  authors: [{ name: "Expandcast" }],
  creator: "Expandcast",
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
