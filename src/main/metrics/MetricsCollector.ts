import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Prometheus-compatible metrics collector for Electron main process.
 *
 * Collects application-level metrics:
 * - Message throughput (counter)
 * - DB query latency (histogram)
 * - IPC call latency (histogram)
 * - WebSocket connection state (gauge)
 * - Active connections (gauge)
 *
 * In production, these would be scraped by Prometheus/Grafana.
 * For the assessment, they're exposed via IPC for the System Health modal.
 */

const register = new Registry();

// Collect Node.js default metrics (CPU, memory, event loop)
collectDefaultMetrics({ register });

// --- Application Metrics ---

export const messagesReceivedTotal = new Counter({
  name: 'messenger_messages_received_total',
  help: 'Total number of messages received via WebSocket',
  registers: [register],
});

export const messagesStoredTotal = new Counter({
  name: 'messenger_messages_stored_total',
  help: 'Total number of messages written to SQLite',
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: 'messenger_db_query_duration_seconds',
  help: 'SQLite query duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const ipcCallDuration = new Histogram({
  name: 'messenger_ipc_call_duration_seconds',
  help: 'IPC handler duration in seconds',
  labelNames: ['channel'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const wsConnectionState = new Gauge({
  name: 'messenger_ws_connection_state',
  help: 'WebSocket connection state (1=connected, 0.5=reconnecting, 0=offline)',
  registers: [register],
});

export const activeWsConnections = new Gauge({
  name: 'messenger_ws_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const encryptionOperations = new Counter({
  name: 'messenger_encryption_operations_total',
  help: 'Total encryption/decryption operations',
  labelNames: ['operation'],
  registers: [register],
});

export const dbRowCount = new Gauge({
  name: 'messenger_db_row_count',
  help: 'Number of rows in database tables',
  labelNames: ['table'],
  registers: [register],
});

export { register };

/** Get all metrics as Prometheus text format */
export async function getMetricsText(): Promise<string> {
  return register.metrics();
}
