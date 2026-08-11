import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-text-primary">
          <div className="bg-panel border border-border rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Something went wrong</h2>
              <p className="text-xs text-text-secondary mt-1">
                {this.state.error?.message || 'An unexpected runtime error occurred.'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-white hover:bg-white/90 text-[#08090b] font-medium rounded-full px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
