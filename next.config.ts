import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
    ] }];
  },
};

export default nextConfig;
