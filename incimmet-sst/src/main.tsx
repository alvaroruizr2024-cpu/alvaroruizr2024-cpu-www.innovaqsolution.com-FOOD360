import './bootstrap'; // servicios reales (motor + ingesta) antes que el estado
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-condensed/500.css';
import '@fontsource/ibm-plex-sans-condensed/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles/tokens.css';
import './styles/app.css';
import App from './App';
import { boot } from './state/store';
import { Boundary } from './ui/panels';

// Registra todos los diccionarios presentes en src/i18n (ui, kpi, eng, rec, map…): cada frente aporta su espacio de nombres.
import.meta.glob('./i18n/*.ts', { eager: true });

void boot();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boundary fallback={<p style={{ padding: 24 }}>INCIMMET | SST — error</p>}>
      <App />
    </Boundary>
  </StrictMode>,
);
