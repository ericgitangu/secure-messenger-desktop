import { useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  X,
  Database,
  Radio,
  ArrowLeftRight,
  Clock,
  MessageSquare,
  Zap,
  RefreshCcw,
  Shield,
  HeartPulse,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import type { SystemMetrics, HealthLevel } from '../hooks/useSystemHealth';

interface SystemHealthModalProps {
  open: boolean;
  onClose: () => void;
  metrics: SystemMetrics;
}

const healthColors: Record<HealthLevel, string> = {
  healthy: '#22c55e',
  degraded: '#f59e0b',
  unhealthy: '#ef4444',
};

function MetricCard({
  icon,
  label,
  value,
  unit,
  status,
}: {
  icon: React.ReactElement;
  label: string;
  value: string | number;
  unit: string;
  status: 'good' | 'warn' | 'bad';
}) {
  const statusColor = useMemo(() => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'warn': return '#f59e0b';
      case 'bad': return '#ef4444';
    }
  }, [status]);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: 180,
      }}
    >
      <Box sx={{ color: statusColor }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"Roboto Mono", monospace' }}>
          {value}
          <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
            {unit}
          </Typography>
        </Typography>
      </Box>
    </Box>
  );
}

function ServiceStatus({ name, latency, icon }: { name: string; latency: number; icon: React.ReactElement }) {
  const status = useMemo(() => {
    if (latency > 200) return 'unhealthy' as const;
    if (latency > 50) return 'degraded' as const;
    return 'healthy' as const;
  }, [latency]);

  const healthIcon = useMemo(() => {
    switch (status) {
      case 'healthy': return <HeartPulse size={14} />;
      case 'degraded': return <Activity size={14} />;
      case 'unhealthy': return <AlertTriangle size={14} />;
    }
  }, [status]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="body2">{name}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="caption"
          sx={{ fontFamily: '"Roboto Mono", monospace', color: 'text.secondary' }}
        >
          {latency}ms
        </Typography>
        <Chip
          icon={healthIcon}
          label={status}
          size="small"
          color={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'error'}
          variant="outlined"
          sx={{ textTransform: 'capitalize', height: 24, fontSize: '0.7rem' }}
        />
      </Box>
    </Box>
  );
}

export function SystemHealthModal({ open, onClose, metrics }: SystemHealthModalProps) {
  const uptimeFormatted = useMemo(() => {
    const h = Math.floor(metrics.uptime / 3600);
    const m = Math.floor((metrics.uptime % 3600) / 60);
    const s = metrics.uptime % 60;
    return `${h}h ${m}m ${s}s`;
  }, [metrics.uptime]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          borderRadius: 3,
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ color: healthColors[metrics.health] }}>
            <HeartPulse size={24} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              System Health
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Real-time infrastructure monitoring
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        {/* Metric Cards Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5, mb: 3 }}>
          <MetricCard
            icon={<Radio size={20} />}
            label="WS Latency"
            value={metrics.wsLatency}
            unit="ms"
            status={metrics.wsLatency < 10 ? 'good' : metrics.wsLatency < 50 ? 'warn' : 'bad'}
          />
          <MetricCard
            icon={<Database size={20} />}
            label="DB Latency"
            value={metrics.dbLatency}
            unit="ms"
            status={metrics.dbLatency < 10 ? 'good' : metrics.dbLatency < 50 ? 'warn' : 'bad'}
          />
          <MetricCard
            icon={<ArrowLeftRight size={20} />}
            label="IPC Round-trip"
            value={metrics.ipcLatency}
            unit="ms"
            status={metrics.ipcLatency < 20 ? 'good' : metrics.ipcLatency < 100 ? 'warn' : 'bad'}
          />
          <MetricCard
            icon={<MessageSquare size={20} />}
            label="Throughput"
            value={metrics.messagesPerSecond}
            unit="msg/s"
            status={metrics.messagesPerSecond > 0 ? 'good' : 'warn'}
          />
          <MetricCard
            icon={<Clock size={20} />}
            label="Uptime"
            value={uptimeFormatted}
            unit=""
            status="good"
          />
          <MetricCard
            icon={<RefreshCcw size={20} />}
            label="Reconnects"
            value={metrics.wsReconnects}
            unit=""
            status={metrics.wsReconnects === 0 ? 'good' : metrics.wsReconnects < 3 ? 'warn' : 'bad'}
          />
          <MetricCard
            icon={<Zap size={20} />}
            label="Queries/sec"
            value={metrics.queriesPerSecond}
            unit="q/s"
            status="good"
          />
          <MetricCard
            icon={<Shield size={20} />}
            label="Encryption"
            value="AES-256"
            unit="GCM"
            status="good"
          />
        </Box>

        {/* Service Status */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Service Status
        </Typography>
        <Box sx={{ bgcolor: 'background.default', borderRadius: 2, px: 2, py: 1, mb: 3, border: '1px solid', borderColor: 'divider' }}>
          <ServiceStatus name="WebSocket Server" latency={metrics.wsLatency} icon={<Radio size={16} />} />
          <Divider />
          <ServiceStatus name="SQLite Database" latency={metrics.dbLatency} icon={<Database size={16} />} />
          <Divider />
          <ServiceStatus name="IPC Bridge" latency={metrics.ipcLatency} icon={<ArrowLeftRight size={16} />} />
          <Divider />
          <ServiceStatus name="Encryption Service" latency={1} icon={<Shield size={16} />} />
        </Box>

        {/* Latency Chart */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Latency (ms) — Last 90s
        </Typography>
        <Box sx={{ height: 200, mb: 3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.latencyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                stroke="rgba(255,255,255,0.3)"
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="ws" stroke="#22c55e" strokeWidth={2} dot={false} name="WebSocket" />
              <Line type="monotone" dataKey="db" stroke="#3b82f6" strokeWidth={2} dot={false} name="Database" />
              <Line type="monotone" dataKey="ipc" stroke="#a78bfa" strokeWidth={2} dot={false} name="IPC" />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* Throughput Chart */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Throughput — Last 90s
        </Typography>
        <Box sx={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.throughputHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                stroke="rgba(255,255,255,0.3)"
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="messagesPerSec" fill="#22c55e" fillOpacity={0.2} stroke="#22c55e" strokeWidth={2} name="Messages/s" />
              <Area type="monotone" dataKey="queriesPerSec" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} name="Queries/s" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
