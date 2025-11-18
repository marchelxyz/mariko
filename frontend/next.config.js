/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  webpack: (config, { isServer }) => {
    // Исключаем @twa-dev/sdk из серверной сборки
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@twa-dev/sdk');
    }
    return config;
  },
}

module.exports = nextConfig
