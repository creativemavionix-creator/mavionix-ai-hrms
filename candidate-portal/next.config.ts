import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Keep ws and its native addons out of webpack bundling — they need to
  // run as native Node modules on the server side
  serverExternalPackages: ["ws", "bufferutil", "utf-8-validate", "node-edge-tts"],
}

export default nextConfig
