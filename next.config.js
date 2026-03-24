/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "*.fal.media",
      },
      {
        protocol: "https",
        hostname: "fal-cdn.batuhan-941.workers.dev",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // Increase timeout for video generation API routes
  serverExternalPackages: ["fluent-ffmpeg"],
}

module.exports = nextConfig
