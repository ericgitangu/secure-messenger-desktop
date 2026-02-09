import { useState, useCallback } from 'react';

export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
  autoHideDuration: number | null;
}

export function useSnackbar() {
  const [state, setState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
    autoHideDuration: 3000,
  });

  const showSnackbar = useCallback(
    (message: string, severity: SnackbarSeverity = 'info', autoHideDuration: number | null = 3000) => {
      setState({ open: true, message, severity, autoHideDuration });
    },
    []
  );

  const closeSnackbar = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return { ...state, showSnackbar, closeSnackbar };
}
