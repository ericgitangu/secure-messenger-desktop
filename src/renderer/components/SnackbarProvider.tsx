import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import type { SnackbarSeverity } from '../hooks/useSnackbar';

interface SnackbarContextValue {
  showSnackbar: (
    message: string,
    severity?: SnackbarSeverity,
    autoHideDuration?: number | null,
  ) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({
  showSnackbar: () => undefined,
});

export const useAppSnackbar = () => useContext(SnackbarContext);

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
  autoHideDuration: number | null;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
    autoHideDuration: 3000,
  });

  const showSnackbar = useCallback(
    (
      message: string,
      severity: SnackbarSeverity = 'info',
      autoHideDuration: number | null = 3000,
    ) => {
      setState({ open: true, message, severity, autoHideDuration });
    },
    [],
  );

  const handleClose = useCallback((_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={state.autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={state.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
