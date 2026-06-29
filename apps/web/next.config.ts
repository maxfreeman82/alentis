import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@teranga/types', '@teranga/scoring'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
