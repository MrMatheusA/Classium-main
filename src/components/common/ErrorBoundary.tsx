import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    const state = this.state as State;
    const selfProps = (this as any).props as Props;

    if (state.hasError) {
      return (
        <div className="p-8 bg-slate-950 border border-red-900/50 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12 shadow-2xl">
          <div className="w-12 h-12 bg-red-950/50 border border-red-800 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-white font-bold text-base">{selfProps.fallbackTitle || 'Ocorreu um erro neste componente'}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {state.error?.message || 'Erro inesperado ao renderizar o módulo.'}
            </p>
          </div>
          <button
            onClick={() => {
              (this as any).setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 mx-auto shadow-lg hover:from-blue-500 hover:to-blue-400 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Recarregar Aplicação
          </button>
        </div>
      );
    }

    return selfProps.children;
  }
}
