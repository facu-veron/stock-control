/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: false,
  },
}

export default nextConfig
