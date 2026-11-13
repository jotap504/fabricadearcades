import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker/VPS deploy (Vercel ignores it).
  output: 'standalone',
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  // The admin layout is a client component (cannot export metadata), so keep
  // private areas out of search indexes via a response header as well.
  async headers() {
    return [
      {
        source: '/:path(admin|api|checkout|mi-cuenta|login|registrarse|registro-distribuidor|fabricante|auth)/:rest*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google avatars
      },
    ],
  },
};

export default nextConfig;
