# Web stack upgrade

Upgrade each direct dependency to the latest stable version supported by the rest of the portal stack. Verify newer major versions as a separate batch and document any compatibility limits.

1. Record the clean-install baseline and compare CI and Vercel's dependency resolution.
2. Upgrade Next.js, React, React DOM, and the matching Next.js ESLint configuration. Check sign-in, sign-out, protected routes, and role navigation.
3. Update Tailwind and its PostCSS plugin together. Review Radix, shadcn/ui, icons, motion, and the other UI dependencies. Compare the portal on mobile and desktop.
4. Update MongoDB, auth and validation libraries, PDFs, analytics, and the remaining runtime dependencies. Exercise grade submission and release on a test database, plus announcement uploads and PDFs.
5. Test the latest compatible compiler, linter, test tooling, and Node LTS. Verify lint, typecheck, the production build, authorization and other existing tests, and Vercel Preview.

Use this branch and draft PR for the full upgrade. After verification, merge into `main-full-dev` and sync the local development branch where possible.
