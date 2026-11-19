import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads pdf.js workers at runtime; keep it out of the server bundle
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // The proxy buffers request bodies (default 10 MB); uploads allow up to 25 MB
  experimental: {
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
