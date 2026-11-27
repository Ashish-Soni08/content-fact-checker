/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // flagsmith-nodejs pulls in pino/thread-stream, which must not be bundled.
  serverExternalPackages: ["flagsmith-nodejs", "pino", "thread-stream"],
 
}

export default nextConfig