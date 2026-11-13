import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    // Strip duplicate checkmarks if already present in message
    const cleanMessage = typeof message === 'string' ? message.replace(/^✓\s*/, '') : message;
    
    setToasts((prev) => [...prev, { id, message: cleanMessage, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, addToast: showToast, triggerToast: showToast, removeToast }}>
      {children}
      
      {/* Floating Popup Toaster Container (Top Right) */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success' || !toast.type;
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isInfo = toast.type === 'info';

          return (
            <div
              key={toast.id}
              role="alert"
              className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#121b2d]/95 light:bg-white/95 backdrop-blur-md border border-[#1e293b] light:border-slate-200 shadow-2xl shadow-black/50 text-xs transition-all duration-300 animate-toast"
            >
              <div className="flex items-center gap-3 min-w-0">
                {isSuccess && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
                {isError && (
                  <div className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
                {isWarning && (
                  <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
                {isInfo && (
                  <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-white light:text-slate-900 font-semibold text-xs leading-snug break-words">
                    {toast.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-slate-800/50 light:hover:bg-slate-100 transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg) => console.log('Toast:', msg),
      addToast: (msg) => console.log('Toast:', msg),
      triggerToast: (msg) => console.log('Toast:', msg),
      removeToast: () => {},
    };
  }
  return context;
}
