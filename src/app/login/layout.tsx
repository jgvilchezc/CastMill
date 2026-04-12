import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Access your Expandcast dashboard. Log in to transform your videos and podcasts into multi-channel social media content, blog posts, and newsletters.",
  alternates: {
    canonical: "https://expandcast.com/login",
  },
  openGraph: {
    title: "Log In to Expandcast",
    description: "Access your Expandcast dashboard to transform your audio and video content.",
    url: "https://expandcast.com/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}