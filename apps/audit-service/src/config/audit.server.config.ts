/**
 * Configuration parameters for the HTTP server runtime of the Audit Service.
 */
export interface AuditServerConfig {
  /**
   * The network port on which the Express HTTP server listens.
   */
  port: number;
  /**
   * Network interface binding address.
   */
  host: string;
  /**
   * Maximum grace period in milliseconds to allow in-flight connections to drain during shutdown.
   */
  shutdownTimeoutMs: number;
}

export const auditServerConfig: AuditServerConfig = {
  port: parseInt(process.env.AUDIT_SERVICE_PORT || '6004', 10),
  host: process.env.HOST || '0.0.0.0',
  shutdownTimeoutMs: 10000,
};
