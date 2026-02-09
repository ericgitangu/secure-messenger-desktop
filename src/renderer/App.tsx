import { useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { ShieldCheck, Unplug } from 'lucide-react';
import { useIpcListeners } from './hooks/useIpc';
import { useAppSelector } from './store';
import { useAppSnackbar } from './components/SnackbarProvider';
import { ConnectionStatus } from './components/ConnectionStatus';
import { SystemHealthIndicator } from './components/SystemHealthIndicator';
import { ThemeToggle } from './theme/ThemeToggle';
import { ChatList } from './components/ChatList';
import { MessageView } from './components/MessageView';
import { bridge } from './api/bridge';

export function App(): React.JSX.Element {
  useIpcListeners();

  const connectionState = useAppSelector((s) => s.connection.state);
  const { showSnackbar } = useAppSnackbar();
  const prevState = useRef(connectionState);

  useEffect(() => {
    // Only show snackbar on state transitions (not initial render)
    if (prevState.current === connectionState) return;
    prevState.current = connectionState;

    if (connectionState === 'connected') {
      showSnackbar('Connected to server', 'success');
    } else if (connectionState === 'reconnecting') {
      showSnackbar('Connection lost. Reconnecting...', 'warning');
    } else if (connectionState === 'offline') {
      showSnackbar('Offline — unable to reach server', 'error', null);
    }
  }, [connectionState, showSnackbar]);

  const handleSimulateDisconnect = useCallback(() => {
    bridge().simulateDisconnect();
    showSnackbar('Simulated connection drop', 'warning');
  }, [showSnackbar]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar variant="dense" sx={{ gap: 1.5 }}>
          <ShieldCheck size={22} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: 'text.primary',
              flexGrow: 1,
            }}
          >
            Secure Messenger
          </Typography>

          <SystemHealthIndicator />
          <ConnectionStatus />

          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={<Unplug size={14} />}
            onClick={handleSimulateDisconnect}
            sx={{ fontSize: '0.75rem' }}
          >
            Simulate Drop
          </Button>

          <ThemeToggle />
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            width: 340,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <ChatList />
        </Box>

        <Divider orientation="vertical" flexItem />

        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <MessageView />
        </Box>
      </Box>
    </Box>
  );
}
