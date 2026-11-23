import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected studio error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F7] px-6 py-12">
          <div className="max-w-lg rounded-xl border border-[#E5E1DA] bg-white p-8 text-center">
            <p className="text-xs font-medium tracking-wider text-[#A67C52]">MS Cosmetics</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-[#171412]">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#635C56]">
              We encountered an issue connecting to the studio database. Please refresh to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-md bg-[#3D1C2E] px-6 py-2.5 text-sm font-medium text-white cursor-pointer"
            >
              Reload Studio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
