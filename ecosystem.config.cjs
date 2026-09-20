/**
 * @file ecosystem.config.cjs
 * @description PM2 process supervisor configuration for multi-service container deployment.
 * Enforces per-service V8 max-old-space-size memory partitioning, automatic crash recovery,
 * and unified log aggregation inside a single 512MB RAM bounded container.
 */

module.exports = {
  apps: [
    {
      name: 'iam-service',
      script: 'apps/iam-service/dist/main.js',
      node_args: '--max-old-space-size=110',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'audit-service',
      script: 'apps/audit-service/dist/main.js',
      node_args: '--max-old-space-size=110',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'notification-service',
      script: 'apps/notification-service/dist/main.js',
      node_args: '--max-old-space-size=80',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'api-gateway',
      script: 'apps/api-gateway/dist/main.js',
      node_args: '--max-old-space-size=110',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
