import type {NextConfig} from 'next';

const isProd = process.env.NODE_ENV === 'production';
const isGitHubPages = process.env.GITHUB_ACTIONS;

const nextConfig: NextConfig = {
  /* config options here */
  output: isGitHubPages ? 'export' : undefined,
  trailingSlash: isGitHubPages ? true : false,
  basePath: isGitHubPages ? '/picture-tales' : '',
  assetPrefix: isGitHubPages ? '/picture-tales/' : '',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: isGitHubPages ? true : false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
