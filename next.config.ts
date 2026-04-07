import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const coiHeaders = [
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    return [
      { source: "/channel/:path*", headers: coiHeaders },
      { source: "/episode/:path*", headers: coiHeaders },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
  serverExternalPackages: ["groq-sdk"],
};

export default nextConfig;
