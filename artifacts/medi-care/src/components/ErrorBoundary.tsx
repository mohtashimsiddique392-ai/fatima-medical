import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-4 max-w-xs">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-teal-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-600"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}