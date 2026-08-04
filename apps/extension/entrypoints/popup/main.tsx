import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/sora/400.css';
import '@fontsource/sora/500.css';
import '@fontsource/sora/600.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import { App } from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
