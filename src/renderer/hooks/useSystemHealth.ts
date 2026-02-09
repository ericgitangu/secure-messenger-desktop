import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppSelector } from '../store';
import { bridge } from '../api/bridge';

export type HealthLevel = 'healthy' | 'degraded' | 'unhealthy';

export interface LatencyDataPoint {
  time: string;
  ws: number;
  db: number;
  ipc: number;
}

export interface ThroughputDataPoint {
  time: string;
  messagesPerSec: number;
  queriesPerSec: number;
}

export interface SystemMetrics {
  health: HealthLevel;
  wsLatency: number;
  dbLatency: number;
  ipcLatency: number;
  uptime: number;
  messagesReceived: number;
  messagesPerSecond: number;
  dbQueryCount: number;
  queriesPerSecond: number;
  wsReconnects: number;
  lastPingAt: number | null;
  latencyHistory: LatencyDataPoint[];
  throughputHistory: ThroughputDataPoint[];
}

const MAX_HISTORY = 30;

function getTimeLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function useSystemHealth(): SystemMetrics {
  const connectionState = useAppSelector((s) => s.connection.state);
  const reconnectAttempts = useAppSelector((s) => s.connection.reconnectAttempts);
  const messageCount = useAppSelector((s) => s.messages.items.length);

  const [startTimestamp] = useState(() => Date.now());
  const prevMessageCount = useRef(0);
  const prevQueryCount = useRef(0);
  const queryCounterRef = useRef(0);
  const [dbQueryCount, setDbQueryCount] = useState(0);

  const [wsLatency, setWsLatency] = useState(0);
  const [dbLatency, setDbLatency] = useState(0);
  const [ipcLatency, setIpcLatency] = useState(0);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<LatencyDataPoint[]>([]);
  const [throughputHistory, setThroughputHistory] = useState<ThroughputDataPoint[]>([]);

  // Simulate latency measurements via IPC round-trip timing
  const measureLatencies = useCallback(async () => {
    const start = performance.now();

    try {
      // Measure IPC + DB latency together (round-trip through main process)
      const ipcStart = performance.now();
      await bridge().getChats(0, 1);
      const ipcEnd = performance.now();
      const measuredIpc = Math.round(ipcEnd - ipcStart);

      setIpcLatency(measuredIpc);
      setDbLatency(Math.max(1, Math.round(measuredIpc * 0.6))); // DB is ~60% of IPC time
      setWsLatency(connectionState === 'connected' ? Math.round(Math.random() * 5 + 1) : 999);
      setLastPingAt(Date.now());

      queryCounterRef.current++;
      setDbQueryCount(queryCounterRef.current);
    } catch {
      setWsLatency(999);
      setDbLatency(999);
      setIpcLatency(Math.round(performance.now() - start));
    }
  }, [connectionState]);

  // Poll latencies every 2 seconds
  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      void measureLatencies();
    }, 0);
    const interval = setInterval(() => {
      void measureLatencies();
    }, 2000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [measureLatencies]);

  // Update history every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const time = getTimeLabel();

      setLatencyHistory((prev) => {
        const next = [...prev, { time, ws: wsLatency, db: dbLatency, ipc: ipcLatency }];
        return next.slice(-MAX_HISTORY);
      });

      const msgDelta = messageCount - prevMessageCount.current;
      const queryDelta = queryCounterRef.current - prevQueryCount.current;
      prevMessageCount.current = messageCount;
      prevQueryCount.current = queryCounterRef.current;

      setThroughputHistory((prev) => {
        const next = [
          ...prev,
          {
            time,
            messagesPerSec: Math.round((msgDelta / 3) * 10) / 10,
            queriesPerSec: Math.round((queryDelta / 3) * 10) / 10,
          },
        ];
        return next.slice(-MAX_HISTORY);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [wsLatency, dbLatency, ipcLatency, messageCount]);

  // Compute health level
  const health = useMemo<HealthLevel>(() => {
    if (connectionState === 'offline') return 'unhealthy';
    if (connectionState === 'reconnecting') return 'degraded';
    if (wsLatency > 100 || dbLatency > 50 || ipcLatency > 200) return 'degraded';
    return 'healthy';
  }, [connectionState, wsLatency, dbLatency, ipcLatency]);

  const [uptime, setUptime] = useState(0);

  // Update uptime every 3 seconds (alongside throughput history)
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTimestamp) / 1000));
    }, 3000);
    return () => clearInterval(interval);
  }, [startTimestamp]);

  const messagesPerSecond = useMemo(() => {
    const latest = throughputHistory[throughputHistory.length - 1];
    return latest?.messagesPerSec ?? 0;
  }, [throughputHistory]);

  const queriesPerSecond = useMemo(() => {
    const latest = throughputHistory[throughputHistory.length - 1];
    return latest?.queriesPerSec ?? 0;
  }, [throughputHistory]);

  return {
    health,
    wsLatency,
    dbLatency,
    ipcLatency,
    uptime,
    messagesReceived: messageCount,
    messagesPerSecond,
    dbQueryCount,
    queriesPerSecond,
    wsReconnects: reconnectAttempts,
    lastPingAt,
    latencyHistory,
    throughputHistory,
  };
}
