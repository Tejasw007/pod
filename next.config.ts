import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads pdf.js workers at runtime; keep it out of the server bundle
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
