//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl =
      process.env.API_GATEWAY_URL || 'http://127.0.0.1:8080';
    return [
      {
        source: '/v1/:path*',
        destination: `${backendUrl}/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
