/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // @node-rs/argon2 ships native binaries; keep it external to server bundle.
    serverComponentsExternalPackages: ["@node-rs/argon2"],
  },
};

export default nextConfig;
