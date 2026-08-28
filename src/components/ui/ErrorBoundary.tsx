// src/components/ui/ErrorBoundary.tsx
// ============================================================
// Joy PeopleHR — Isolated Error Boundary (Widget & Route Level)
// ============================================================

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  isWidget?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const ComponentBase: any = React.Component;

export class ErrorBoundary extends ComponentBase {
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Joy PeopleHR ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.isWidget) {
        return (
          <div className="p-4 bg-[#FEF2F2] rounded-2xl border border-[#FCA5A5] flex items-center justify-between gap-3 text-xs font-sans">
            <div className="flex items-center gap-2 text-[#991B1B]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#DC2626]" />
              <div>
                <strong className="font-bold block">{this.props.fallbackTitle || 'Unable to load widget telemetry'}</strong>
                <span className="text-[11px] text-[#B91C1C]">{this.state.error?.message || 'A data synchronization issue occurred.'}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="bg-white border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEE2E2] shrink-0 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        );
      }

      return (
        <div className="p-8 bg-white rounded-3xl border border-[#E2E8F0] shadow-xs text-center space-y-4 max-w-lg mx-auto my-8 font-sans">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0F172B]">
              {this.props.fallbackTitle || 'Component Render Interrupted'}
            </h3>
            <p className="text-xs text-[#64748B] mt-1">
              {this.props.fallbackMessage || this.state.error?.message || 'An unexpected error occurred while loading this view.'}
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={this.handleReset}
              className="bg-[#047857] hover:bg-[#065F46] text-white cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-initialize Component
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
