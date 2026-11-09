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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
