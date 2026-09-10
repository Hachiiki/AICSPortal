import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // BUG-016: keep true until `npx tsc --noEmit` is clean (FitText null-check open).
    // TODO: set to false once type errors are fixed so type errors fail the build.
    ignoreBuildErrors: true,
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
