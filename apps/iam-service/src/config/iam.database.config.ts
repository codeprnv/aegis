/**
 * Database transaction configuration for Prisma operations in IAM.
 */
export const IAM_TRANSACTION_OPTIONS = {
  maxWait: 5000, // 5 seconds
  timeout: 10000, // 10 seconds
} as const;
