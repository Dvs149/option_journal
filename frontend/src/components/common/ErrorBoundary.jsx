import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="max-w-md w-full bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white light:text-slate-900">Something went wrong</h2>
              <p className="text-xs text-slate-400 light:text-slate-500 mt-1 leading-relaxed">
                An unexpected error occurred while loading this view. You can reload the page or return to the dashboard.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-left">
                <p className="text-[11px] font-mono text-rose-300 light:text-rose-600 break-all line-clamp-3">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/25"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reload Page
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#162033] light:bg-slate-100 hover:bg-slate-800 text-slate-300 light:text-slate-700 hover:text-white border border-[#1e293b] light:border-slate-300 transition-all"
              >
                <Home className="w-3.5 h-3.5" /> Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
