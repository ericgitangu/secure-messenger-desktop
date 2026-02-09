import { useState, useMemo, useCallback } from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import { HeartPulse, Activity, AlertTriangle } from 'lucide-react';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { SystemHealthModal } from './SystemHealthModal';
import type { HealthLevel } from '../hooks/useSystemHealth';

const healthConfig: Record<HealthLevel, {
  label: string;
  color: 'success' | 'warning' | 'error';
  icon: React.ReactElement;
  tooltip: string;
}> = {
  healthy: {
    label: 'Healthy',
    color: 'success',
    icon: <HeartPulse size={16} />,
    tooltip: 'All systems operational',
  },
  degraded: {
    label: 'Degraded',
    color: 'warning',
    icon: <Activity size={16} />,
    tooltip: 'Some systems experiencing issues',
  },
  unhealthy: {
    label: 'Unhealthy',
    color: 'error',
    icon: <AlertTriangle size={16} />,
    tooltip: 'Critical systems offline',
  },
};

export function SystemHealthIndicator() {
  const metrics = useSystemHealth();
  const [modalOpen, setModalOpen] = useState(false);

  const config = useMemo(() => healthConfig[metrics.health], [metrics.health]);

  const handleOpen = useCallback(() => setModalOpen(true), []);
  const handleClose = useCallback(() => setModalOpen(false), []);

  return (
    <>
      <Tooltip title={config.tooltip}>
        <Chip
          icon={config.icon}
          label={config.label}
          color={config.color}
          size="small"
          variant="outlined"
          onClick={handleOpen}
          sx={{
            fontWeight: 500,
            cursor: 'pointer',
            '&:hover': { opacity: 0.85 },
            transition: 'opacity 0.2s ease',
          }}
        />
      </Tooltip>

      <SystemHealthModal
        open={modalOpen}
        onClose={handleClose}
        metrics={metrics}
      />
    </>
  );
}
