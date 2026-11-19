import React from 'react';
import { AlertTriangle, LogOut, Loader2, X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

/**
 * Modern, theme-aware Confirmation Modal component.
 * Replaces ugly native browser window.confirm() dialogs.
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  isLoading = false,
  icon: CustomIcon,
  details = null,
}) {
  useEscapeKey(() => {
    if (!isLoading && isOpen) {
      onClose();
    }
  }, isOpen && !isLoading);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          confirmBtn:
            'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 focus:ring-rose-500/50',
          defaultIcon: AlertTriangle,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          confirmBtn:
            'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 focus:ring-amber-500/50',
          defaultIcon: AlertTriangle,
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
          confirmBtn:
            'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 focus:ring-blue-500/50',
          defaultIcon: LogOut,
        };
    }
  };

  const { iconBg, confirmBtn, defaultIcon: DefaultIcon } = getVariantStyles();
  const IconComponent = CustomIcon || DefaultIcon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={() => !isLoading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (X) */}
        <button
          type="button"
          onClick={() => !isLoading && onClose()}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-xl text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-slate-800/50 light:hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Icon and Title */}
        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${iconBg}`}
          >
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3
              id="confirm-modal-title"
              className="text-base font-bold text-white light:text-slate-900 tracking-tight"
            >
              {title}
            </h3>
            {message && (
              <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Optional Context Details Box */}
        {details && (
          <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs">
            {details}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => !isLoading && onClose()}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-[#162033] light:bg-slate-100 hover:bg-[#1e2c46] light:hover:bg-slate-200 text-slate-300 light:text-slate-700 font-semibold text-xs border border-[#1e293b] light:border-slate-300 transition-all disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 ${confirmBtn}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
