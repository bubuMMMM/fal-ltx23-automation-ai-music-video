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
        hostname: "v3.fal.media",
      },
      {
        protocol: "https",
        hostname: "**.fal.ai",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["fluent-ffmpeg", "music-metadata"],
  },
}

module.exports = nextConfig
