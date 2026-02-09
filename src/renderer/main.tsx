import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppThemeProvider } from './theme/ThemeProvider';
import { SnackbarProvider } from './components/SnackbarProvider';
import { App } from './App';
import { initBridge } from './api/bridge';

import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/500.css';

async function bootstrap(): Promise<void> {
  await initBridge();

  const container = document.getElementById('app');
  if (!container) throw new Error('Root element #app not found');
  const root = createRoot(container);

  root.render(
    <StrictMode>
      <Provider store={store}>
        <AppThemeProvider>
          <SnackbarProvider>
            <App />
          </SnackbarProvider>
        </AppThemeProvider>
      </Provider>
    </StrictMode>,
  );
}

void bootstrap();
