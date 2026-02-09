import { useState, useEffect, useRef, useCallback } from 'react';

export interface PrometheusMetrics {
  messagesReceived: number;
  messagesStored: number;
  wsConnectionState: number;
  activeWsConnections: number;
  encryptionOps: number;
  dbRowCounts: { chats: number; messages: number };
  processMemoryMb: number;
  heapUsedMb: number;
  cpuUser: number;
  eventLoopLag: number;
  throughputHistory: Array<{ time: string; received: number; stored: number }>;
  loading: boolean;
  error: string | null;
}

const MAX_HISTORY = 30;

function parseMetricValue(text: string, name: string, labels?: string): number {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = labels
    ? new RegExp(
        `^${escapedName}\\{${labels.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\s+(\\S+)`,
        'm',
      )
    : new RegExp(`^${escapedName}\\s+(\\S+)`, 'm');
  const match = text.match(pattern);
  return match ? parseFloat(match[1]) : 0;
}

function getTimeLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function usePrometheusMetrics(): PrometheusMetrics {
  const [metrics, setMetrics] = useState<
    Omit<PrometheusMetrics, 'throughputHistory' | 'loading' | 'error'>
  >({
    messagesReceived: 0,
    messagesStored: 0,
    wsConnectionState: 0,
    activeWsConnections: 0,
    encryptionOps: 0,
    dbRowCounts: { chats: 0, messages: 0 },
    processMemoryMb: 0,
    heapUsedMb: 0,
    cpuUser: 0,
    eventLoopLag: 0,
  });
  const [throughputHistory, setThroughputHistory] = useState<
    PrometheusMetrics['throughputHistory']
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevReceived = useRef(0);
  const prevStored = useRef(0);

  const fetchMetrics = useCallback(async () => {
    try {
      const baseUrl =
        typeof window !== 'undefined' && window.location
          ? `${window.location.protocol}//${window.location.host}`
          : '';
      const res = await fetch(`${baseUrl}/metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      const received = parseMetricValue(text, 'messenger_messages_received_total');
      const stored = parseMetricValue(text, 'messenger_messages_stored_total');
      const wsState = parseMetricValue(text, 'messenger_ws_connection_state');
      const wsActive = parseMetricValue(text, 'messenger_ws_active_connections');
      const encryptOps = parseMetricValue(
        text,
        'messenger_encryption_operations_total',
        'operation="encrypt"',
      );
      const decryptOps = parseMetricValue(
        text,
        'messenger_encryption_operations_total',
        'operation="decrypt"',
      );
      const chatRows = parseMetricValue(text, 'messenger_db_row_count', 'table="chats"');
      const msgRows = parseMetricValue(text, 'messenger_db_row_count', 'table="messages"');
      const rssBytes = parseMetricValue(text, 'process_resident_memory_bytes');
      const heapBytes = parseMetricValue(text, 'nodejs_heap_size_used_bytes');
      const cpuUser = parseMetricValue(text, 'process_cpu_user_seconds_total');
      const eventLoopLag = parseMetricValue(text, 'nodejs_eventloop_lag_seconds');

      setMetrics({
        messagesReceived: received,
        messagesStored: stored,
        wsConnectionState: wsState,
        activeWsConnections: wsActive,
        encryptionOps: encryptOps + decryptOps,
        dbRowCounts: { chats: chatRows, messages: msgRows },
        processMemoryMb: Math.round((rssBytes / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((heapBytes / 1024 / 1024) * 10) / 10,
        cpuUser: Math.round(cpuUser * 100) / 100,
        eventLoopLag: Math.round(eventLoopLag * 1000 * 100) / 100,
      });

      // Compute throughput delta
      const receivedDelta = received - prevReceived.current;
      const storedDelta = stored - prevStored.current;
      prevReceived.current = received;
      prevStored.current = stored;

      // Only add to history after first fetch (skip initial delta)
      if (receivedDelta >= 0 && storedDelta >= 0 && !loading) {
        setThroughputHistory((prev) => {
          const next = [
            ...prev,
            {
              time: getTimeLabel(),
              received: Math.round((receivedDelta / 5) * 10) / 10,
              stored: Math.round((storedDelta / 5) * 10) / 10,
            },
          ];
          return next.slice(-MAX_HISTORY);
        });
      }

      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    const initial = setTimeout(() => {
      void fetchMetrics();
    }, 500);
    const interval = setInterval(() => {
      void fetchMetrics();
    }, 5000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [fetchMetrics]);

  return { ...metrics, throughputHistory, loading, error };
}
