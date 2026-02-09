import { useEffect, useCallback, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { ShieldCheck, Unplug, ChevronRight, ChevronLeft } from 'lucide-react';
import { useIpcListeners } from './hooks/useIpc';
import { useAppSelector } from './store';
import { useAppSnackbar } from './components/SnackbarProvider';
import { ConnectionStatus } from './components/ConnectionStatus';
import { SystemHealthIndicator } from './components/SystemHealthIndicator';
import { ThemeToggle } from './theme/ThemeToggle';
import { ChatList } from './components/ChatList';
import { MessageView } from './components/MessageView';
import { bridge } from './api/bridge';

const SIDEBAR_WIDTH = 340;

export function App(): React.JSX.Element {
  useIpcListeners();

  const connectionState = useAppSelector((s) => s.connection.state);
  const selectedChatId = useAppSelector((s) => s.chats.selectedChatId);
  const { showSnackbar } = useAppSnackbar();
  const prevState = useRef(connectionState);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const handleChatSelected = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

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

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Box
          sx={{
            width: sidebarOpen ? SIDEBAR_WIDTH : 0,
            minWidth: 0,
            borderRight: sidebarOpen ? '1px solid' : 'none',
            borderColor: 'divider',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'width 0.25s ease-in-out',
          }}
        >
          <Box sx={{ width: SIDEBAR_WIDTH, height: '100%' }}>
            <ChatList onChatSelected={handleChatSelected} />
          </Box>
        </Box>

        {/* Sidebar toggle arrow */}
        <Tooltip title={sidebarOpen ? 'Collapse chats' : 'Expand chats'} placement="right">
          <IconButton
            onClick={toggleSidebar}
            size="small"
            sx={{
              position: 'absolute',
              left: sidebarOpen ? SIDEBAR_WIDTH - 4 : 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: 24,
              height: 48,
              borderRadius: sidebarOpen ? '0 8px 8px 0' : '0 8px 8px 0',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderLeft: sidebarOpen ? 'none' : '1px solid',
              boxShadow: 1,
              transition: 'left 0.25s ease-in-out',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </IconButton>
        </Tooltip>

        {!sidebarOpen && selectedChatId && <Divider orientation="vertical" flexItem />}

        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <MessageView />
        </Box>
      </Box>
    </Box>
  );
}
