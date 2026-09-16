import { createRoot } from 'react-dom/client';
import App from './App';
import '../ui/styles.css';
// Preview samples and theme defaults are development-only. Published apps inherit the shell's theme and bridge.
if (import.meta.env.DEV) {
  await import('../ui/preview-theme.css');
  if (new URLSearchParams(location.search).get('demo') === '1') await import('../sdk/demo');
}
createRoot(document.getElementById('root')!).render(<App />);
