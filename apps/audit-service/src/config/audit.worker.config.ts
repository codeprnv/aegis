/**
 * Configuration parameters for the BullMQ Anomaly Worker in the Audit Service.
 */
export interface AuditWorkerConfig {
  /**
   * Maximum number of concurrent telemetry event processing jobs.
   */
  concurrency: number;
  /**
   * Timeout in milliseconds for worker draining before forced termination.
   */
  drainTimeoutMs: number;
}

export const auditWorkerConfig: AuditWorkerConfig = {
  concurrency: parseInt(process.env.AUDIT_WORKER_CONCURRENCY || '5', 10),
  drainTimeoutMs: 10000,
};
