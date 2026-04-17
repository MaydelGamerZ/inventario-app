import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: String(error?.message || 'Ocurrio un error inesperado.'),
    };
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary capturo un error:', error, info);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-black px-4 text-white">
          <div className="w-full max-w-lg rounded-[28px] border border-red-900/60 bg-[#050505] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.6)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/40 text-red-300">
              <AlertTriangle size={28} />
            </div>

            <h1 className="mt-4 text-center text-2xl font-semibold">
              La app encontro un error
            </h1>

            <p className="mt-3 text-center text-sm leading-6 text-zinc-400">
              Ya no se queda en blanco. Si esto vuelve a pasar, este mensaje nos
              ayuda a detectar exactamente donde se rompio.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black p-4 text-sm text-red-200">
              {this.state.errorMessage || 'Sin detalles disponibles.'}
            </div>

            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              <RefreshCw size={16} />
              Recargar pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
