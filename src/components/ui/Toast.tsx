import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string | { title?: string; message?: string; type?: ToastType }, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (messageOrObj: string | { title?: string; message?: string; type?: ToastType }, type: ToastType = 'success') => {
    const id = Date.now().toString();
    let msg = '';
    let toastType = type;
    if (typeof messageOrObj === 'object' && messageOrObj !== null) {
      msg = messageOrObj.message || messageOrObj.title || 'Notification';
      if (messageOrObj.type) toastType = messageOrObj.type;
    } else {
      msg = String(messageOrObj || '');
    }

    setToasts(prev => [...prev, { id, message: msg, type: toastType }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-bottom duration-200',
              t.type === 'success' && 'bg-emerald-900 text-white border-emerald-800',
              t.type === 'error' && 'bg-rose-900 text-white border-rose-800',
              t.type === 'info' && 'bg-gray-900 text-white border-gray-800'
            )}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
