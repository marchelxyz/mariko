/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  // Удаляем env, так как NEXT_PUBLIC_ переменные автоматически доступны в Next.js
  // Переменная NEXT_PUBLIC_API_URL должна быть установлена в Vercel Environment Variables
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
