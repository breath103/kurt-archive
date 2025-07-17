/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/vi/**',
      },
    ],
  },
  i18n: {
    locales: ['en', 'ko'],
    defaultLocale: 'en',
  },
};

module.exports = nextConfig;
