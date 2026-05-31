import type { MetadataRoute } from "next";

const siteUrl = "https://expandcast.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/auth/",
        "/dashboard/",
        "/settings/",
        "/episode/",
        "/upload/",
        "/chat/",
        "/channel/",
        "/transcribe/",
        "/instagram/",
        "/tiktok/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
