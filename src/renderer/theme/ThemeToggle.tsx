import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Sun, Moon } from 'lucide-react';
import { useThemeMode } from './ThemeProvider';

export function ThemeToggle(): React.JSX.Element {
  const { mode, toggleTheme } = useThemeMode();

  return (
    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton onClick={toggleTheme} size="small" sx={{ color: 'text.primary' }}>
        {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </IconButton>
    </Tooltip>
  );
}
