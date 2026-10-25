import type { NextConfig } from "next";

const gatewayUrl = process.env.GATEWAY_URL ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only talks to this app; /api/* is forwarded to the API gateway.
  rewrites() {
    return [{ source: "/api/:path*", destination: `${gatewayUrl}/api/:path*` }];
  },
};

export default nextConfig;
