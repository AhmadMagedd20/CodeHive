/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // @node-rs/argon2 ships native binaries; keep it external to server bundle.
    serverComponentsExternalPackages: ["@node-rs/argon2"],

    /**
     * Strip Prisma engine binaries that can never run on the deploy target.
     *
     * Prisma ships a query engine per platform plus a WASM engine per database.
     * Nearly every route imports Prisma, so each one was dragging in ~20 MB of
     * dead weight — including a 16 MB **macOS** `.dylib` on Linux servers, and
     * MySQL/SQLite engines for an app that only speaks PostgreSQL.
     *
     * This matters beyond tidiness: Next.js gives a route its own serverless
     * function once its bundle grows past the grouping threshold, and Vercel's
     * Hobby plan allows only 12 functions per deployment. Smaller bundles mean
     * fewer functions, and faster cold starts either way.
     *
     * Only genuinely unreachable files are listed. The Linux engine Vercel
     * actually uses (`libquery_engine-*linux*` / `rhel`) is deliberately NOT
     * excluded — removing it would break every database call at runtime.
     */
    outputFileTracingExcludes: {
      "*": [
        "**/node_modules/**/@prisma/client/**/libquery_engine-darwin*",
        "**/node_modules/**/.prisma/client/libquery_engine-darwin*",
        "**/node_modules/**/@prisma/client/**/query_engine-windows*",
        "**/node_modules/**/.prisma/client/query_engine-windows*",
        "**/node_modules/**/@prisma/client/runtime/query_engine_bg.mysql.wasm",
        "**/node_modules/**/@prisma/client/runtime/query_engine_bg.sqlite.wasm",
        // Type declarations are build-time only and never read at runtime.
        "**/node_modules/**/.prisma/client/index.d.ts",
        // The Prisma CLI and its engine downloads are a devDependency; nothing
        // in the running app imports them.
        "**/node_modules/**/prisma/build/**",
        "**/node_modules/**/@prisma/engines/**",
      ],
    },
  },
};

export default nextConfig;
