import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // BUG-016 closed (2026-10-15): `tsc --noEmit` is clean for all app
    // code (skills/.agents/.superdesign/db are tsconfig-excluded sandbox
    // dirs, not source). Type errors now fail the build in CI and Vercel.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["*.space-z.ai"],
  async headers() {
    // BUG-016 baseline headers. CSP stays report-only / deferred until script
    // sources (Next inline bootstrap) are enumerated; start with these.
    // HSTS added with the compliance pass (2026-10-20): production runs
    // HTTPS on Vercel; 2-year max-age with preload opt-in is safe for a
    // single-domain deployment.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ]
  },
};

export default nextConfig;
