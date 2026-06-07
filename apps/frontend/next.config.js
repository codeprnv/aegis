//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily bypassing withNx wrapper to prevent Next.js from
  // crashing when the Nx Console extension locks the project-graph cache
  nx: {},
};

module.exports = nextConfig;
