import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Fix for RxJS module resolution issue with Node.js v23
  webpack: (config) => {
    // Add fallback for the missing scheduler/animationFrameProvider module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'scheduler/animationFrameProvider': false,
    };
    return config;
  },
  // Turbopack configuration (moved from experimental.turbo to turbopack as it's now stable)
  turbopack: {
    resolveAlias: {
      // For Turbopack, we need to provide a path rather than a boolean
      'scheduler/animationFrameProvider': require.resolve('./src/lib/empty-module.js'),
    },
  },
};

export default nextConfig;
