/**
 * Database transaction configuration for Prisma operations in IAM.
 */
export const IAM_TRANSACTION_OPTIONS = {
  maxWait: 5000, // 5 seconds
  timeout: 5000, // 5 seconds
} as const;
