/** Provide the Next.js configuration for the static frontend. */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendOrigin = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }];
  },
};

export default nextConfig;
