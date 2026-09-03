// ============================================================
// Joy PeopleHR — Enterprise Error Boundary (Widget & Route Level)
// ============================================================
// Zero stack trace leakage to end-users.
// Displays human-friendly messaging + unique incident Reference ID (ERR-XXXXX)
// ============================================================

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Copy, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from './Button';
import { ErrorReferenceService } from '../../services/observability/errorReferenceService';

export interface EnterpriseErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  module?: string;
  isWidget?: boolean;
  onReset?: () => void;
}

export interface EnterpriseErrorBoundaryState {
  hasError: boolean;
  referenceId: string | null;
  copied: boolean;
}

const ComponentBase: any = React.Component;

export class EnterpriseErrorBoundary extends ComponentBase {
  public props: EnterpriseErrorBoundaryProps;
  public state: EnterpriseErrorBoundaryState = {
    hasError: false,
    referenceId: null,
    copied: false,
  };

  constructor(props: EnterpriseErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(_: Error): Partial<EnterpriseErrorBoundaryState> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Record into the Observability Error Reference registry silently
    const refId = ErrorReferenceService.recordError(
      error,
      this.props.module || 'UI_COMPONENT',
      'React Component Render Crash',
      { componentStack: errorInfo.componentStack }
    );
    this.setState({ referenceId: refId });
  }

  private handleReset = () => {
    this.setState({ hasError: false, referenceId: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private copyRef = () => {
    if (this.state.referenceId && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(this.state.referenceId);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      const refCode = this.state.referenceId || 'ERR-PENDING';

      // --- Compact Widget Fallback ---
      if (this.props.isWidget) {
        return (
          <div className="p-3.5 bg-[#FFF1F2] rounded-2xl border border-[#FECDD3] flex items-center justify-between gap-3 text-xs font-sans">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="font-bold text-[#9F1239] truncate">
                  {this.props.fallbackTitle || 'Unable to display this widget'}
                </p>
                <p className="text-[11px] text-[#BE123C] flex items-center gap-1.5 mt-0.5">
                  Ref: <span className="font-mono font-semibold bg-white/80 px-1 py-0.5 rounded border border-[#FDA4AF]">{refCode}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="h-7 text-xs bg-white border-[#FDA4AF] text-[#E11D48] hover:bg-[#FFF1F2]"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          </div>
        );
      }

      // --- Full Screen / Route Level Fallback ---
      return (
        <div className="p-8 my-8 max-w-xl mx-auto bg-white rounded-3xl border border-[#E2E8F0] shadow-sm text-center space-y-5 font-sans">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-[#0F172B]">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
              {this.props.fallbackMessage ||
                'We could not complete this action. Our engineering telemetry has been notified automatically.'}
            </p>
          </div>

          {/* Reference ID Pill */}
          <div className="inline-flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] px-3.5 py-1.5 rounded-xl text-xs text-[#334155]">
            <span className="text-[#64748B]">Reference ID:</span>
            <span className="font-mono font-bold text-[#0F172B] tracking-wider">{refCode}</span>
            <button
              type="button"
              onClick={this.copyRef}
              className="ml-1 text-[#64748B] hover:text-[#0F172B] transition-colors cursor-pointer"
              title="Copy Reference Code"
            >
              {this.state.copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="pt-2 flex justify-center items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={this.handleReset}
              className="bg-[#059669] hover:bg-[#047857] text-white px-5 h-9 font-medium cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload();
              }}
              className="border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] h-9 cursor-pointer"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
