import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppThemeProvider } from './theme/ThemeProvider';
import { SnackbarProvider } from './components/SnackbarProvider';
import { App } from './App';

import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/500.css';

const root = createRoot(document.getElementById('app')!);

root.render(
  <StrictMode>
    <Provider store={store}>
      <AppThemeProvider>
        <SnackbarProvider>
          <App />
        </SnackbarProvider>
      </AppThemeProvider>
    </Provider>
  </StrictMode>
);
