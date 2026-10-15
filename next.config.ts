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
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self)" },
        ],
      },
    ]
  },
};

export default nextConfig;
