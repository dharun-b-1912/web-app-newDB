// src/hooks/useWorkflowState.ts
// ============================================================
// Joy PeopleHR Enterprise — Universal Workflow State Engine Hook
// Provides standard lifecycle management for API mutations, validation,
// duplicate conflict resolution, and draft recovery.
// ============================================================

import { useState, useCallback, useRef } from 'react';

export type WorkflowStatus = 
  | 'idle' 
  | 'validating' 
  | 'processing' 
  | 'success' 
  | 'error' 
  | 'conflict' 
  | 'session_expired';

export interface ConflictDetails {
  entityType: string;
  duplicateField: string;
  duplicateValue: string;
  existingEntityId?: string;
}

export interface WorkflowState<T = any> {
  status: WorkflowStatus;
  data: T | null;
  errorMessage: string | null;
  errorCode?: string;
  conflictDetails: ConflictDetails | null;
  isProcessing: boolean;
  isValidating: boolean;
  isSuccess: boolean;
  isError: boolean;
  isConflict: boolean;
  isSessionExpired: boolean;
}

export interface ExecuteOptions<T> {
  validate?: () => boolean | string | Promise<boolean | string>;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  checkForConflict?: (error: any) => ConflictDetails | null;
}

export function useWorkflowState<T = any>(initialData: T | null = null) {
  const [state, setState] = useState<WorkflowState<T>>({
    status: 'idle',
    data: initialData,
    errorMessage: null,
    conflictDetails: null,
    isProcessing: false,
    isValidating: false,
    isSuccess: false,
    isError: false,
    isConflict: false,
    isSessionExpired: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      data: initialData,
      errorMessage: null,
      conflictDetails: null,
      isProcessing: false,
      isValidating: false,
      isSuccess: false,
      isError: false,
      isConflict: false,
      isSessionExpired: false,
    });
  }, [initialData]);

  const setValidating = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'validating',
      isValidating: true,
      isProcessing: false,
      errorMessage: null,
    }));
  }, []);

  const setProcessing = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'processing',
      isValidating: false,
      isProcessing: true,
      errorMessage: null,
    }));
  }, []);

  const setSuccess = useCallback((resultData: T) => {
    setState({
      status: 'success',
      data: resultData,
      errorMessage: null,
      conflictDetails: null,
      isProcessing: false,
      isValidating: false,
      isSuccess: true,
      isError: false,
      isConflict: false,
      isSessionExpired: false,
    });
  }, []);

  const setError = useCallback((message: string, errorCode?: string) => {
    setState((prev) => ({
      ...prev,
      status: 'error',
      errorMessage: message,
      errorCode,
      conflictDetails: null,
      isProcessing: false,
      isValidating: false,
      isSuccess: false,
      isError: true,
      isConflict: false,
      isSessionExpired: false,
    }));
  }, []);

  const setConflict = useCallback((details: ConflictDetails) => {
    setState((prev) => ({
      ...prev,
      status: 'conflict',
      conflictDetails: details,
      errorMessage: null,
      isProcessing: false,
      isValidating: false,
      isSuccess: false,
      isError: false,
      isConflict: true,
      isSessionExpired: false,
    }));
  }, []);

  const setSessionExpired = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'session_expired',
      errorMessage: 'Your session has expired. Please re-authenticate.',
      isProcessing: false,
      isValidating: false,
      isSuccess: false,
      isError: false,
      isConflict: false,
      isSessionExpired: true,
    }));
  }, []);

  /**
   * Universal Runner for Async Actions with automated state transitions
   */
  const execute = useCallback(
    async (
      asyncAction: () => Promise<T>,
      options: ExecuteOptions<T> = {}
    ): Promise<T | null> => {
      // 1. Validation phase
      if (options.validate) {
        setValidating();
        try {
          const validationResult = await options.validate();
          if (validationResult === false) {
            setError('Please correct the validation errors in the form.');
            return null;
          }
          if (typeof validationResult === 'string' && validationResult.trim().length > 0) {
            setError(validationResult);
            return null;
          }
        } catch (valErr: any) {
          setError(valErr.message || 'Validation failed.');
          return null;
        }
      }

      // 2. Processing phase
      setProcessing();

      try {
        const result = await asyncAction();
        setSuccess(result);
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        return result;
      } catch (err: any) {
        // Check for session expiration
        if (
          err.status === 401 ||
          err.message?.toLowerCase().includes('jwt expired') ||
          err.message?.toLowerCase().includes('session expired') ||
          err.message?.toLowerCase().includes('unauthorized')
        ) {
          setSessionExpired();
          return null;
        }

        // Check for 409 conflict
        if (options.checkForConflict) {
          const conflict = options.checkForConflict(err);
          if (conflict) {
            setConflict(conflict);
            return null;
          }
        }

        // Standard error
        const msg = err.message || 'An unexpected error occurred while processing this request.';
        setError(msg, err.code || (err.status ? `HTTP_${err.status}` : undefined));
        if (options.onError) {
          options.onError(err);
        }
        return null;
      }
    },
    [setValidating, setProcessing, setSuccess, setError, setConflict, setSessionExpired]
  );

  return {
    ...state,
    reset,
    setValidating,
    setProcessing,
    setSuccess,
    setError,
    setConflict,
    setSessionExpired,
    execute,
  };
}
