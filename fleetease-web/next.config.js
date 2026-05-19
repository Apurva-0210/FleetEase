/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    // Enable styled-components optimizations
    styledComponents: true,
  },
  images: {
    domains: ['res.cloudinary.com', 'localhost'], // Add your image domains here
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Optimize moment.js locales
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^\/\*\*.+\*\*\/\s+require\('moment\/locale\/.+'\)/,
      contextRegExp: /moment$/
    }));

    // Optimize lodash imports
    if (!isServer) {
      config.resolve.alias['lodash'] = 'lodash-es';
    }

    return config;
  },
};

// Security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

module.exports = withBundleAnalyzer(nextConfig);
