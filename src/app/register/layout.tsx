import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account",
  description: "Join Expandcast to automatically generate viral clips, blog posts, newsletters, and social threads from your videos. Sign up for your account today.",
  alternates: {
    canonical: "https://expandcast.com/register",
  },
  openGraph: {
    title: "Create an Expandcast Account",
    description: "Join Expandcast to automatically generate content from your videos and podcasts.",
    url: "https://expandcast.com/register",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}