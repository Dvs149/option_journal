import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './hooks/useEscapeKey.js'

// Automatically open browser date/time picker when clicking anywhere on a date input
document.addEventListener('click', (e) => {
  const target = e.target;
  if (
    target instanceof HTMLInputElement &&
    (target.type === 'date' || target.type === 'time' || target.type === 'datetime-local') &&
    !target.disabled &&
    !target.readOnly
  ) {
    try {
      target.showPicker?.();
    } catch {
      // Ignored if already open or unsupported
    }
  }
});

// Register service worker for offline app shell and story reading
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('.local'))) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('ServiceWorker registration error:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
