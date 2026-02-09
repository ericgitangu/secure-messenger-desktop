import Chip from '@mui/material/Chip';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useAppSelector } from '../store';

const stateConfig = {
  connected: {
    label: 'Connected',
    color: 'success' as const,
    icon: <Wifi size={16} />,
  },
  reconnecting: {
    label: 'Reconnecting...',
    color: 'warning' as const,
    icon: <Loader2 size={16} className="animate-spin" />,
  },
  offline: {
    label: 'Offline',
    color: 'error' as const,
    icon: <WifiOff size={16} />,
  },
};

export function ConnectionStatus(): React.JSX.Element {
  const connectionState = useAppSelector((s) => s.connection.state);
  const config = stateConfig[connectionState];

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 500 }}
    />
  );
}
