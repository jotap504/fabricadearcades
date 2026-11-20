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
      // Baseline security headers. gamepad=(self) keeps the Gamepad API working for the
      // same-origin fightstick tester iframe; X-Frame-Options only allows that same-origin framing.
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), gamepad=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
      // Static media from /public: cache for a week in browsers/CDN instead of revalidating each visit.
      {
        source: '/:dir(vinilos|logos|manuales|tester|t-molding)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
    // WebP only: AVIF encodes slower and the VPS container is memory-limited.
    formats: ['image/webp'],
    qualities: [70, 75],
    minimumCacheTTL: 60 * 60 * 24 * 31,
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
