/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nftstorage.link'
      },
      {
        protocol: 'https',
        hostname: 'arweave.net'
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com'
      }
    ]
  },
  webpack: (config, { isServer }) => {
    // Handle browser-specific modules and polyfills
    if (!isServer) {
      // Client-side specific configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    } else {
      // Server-side specific configuration
      config.externals = [
        '@swc/helpers',
        'encoding',
        ...Array.isArray(config.externals) ? config.externals : [],
        'bufferutil',
        'utf-8-validate',
      ];
    }

    // Basic optimization settings that work for both client and server
    config.optimization = {
      ...config.optimization,
      minimize: !isServer, // Only minimize client-side bundles
      splitChunks: isServer ? false : {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            reuseExistingChunk: true,
          },
        },
      },
    };

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 