import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} />;
      case 'error': return <AlertCircle size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'error': return 'bg-rose-50 border-rose-200 text-rose-700';
      default: return 'bg-sky-50 border-sky-200 text-sky-700';
    }
  };

  const getIconStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'text-emerald-500';
      case 'error': return 'text-rose-500';
      default: return 'text-sky-500';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${getStyles(toast.type)}`}
            >
              <span className={getIconStyles(toast.type)}>{getIcon(toast.type)}</span>
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-black/5 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Confirm Dialog
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmDialogProps) {
  if (!open) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger': return 'bg-rose-500 hover:bg-rose-600 text-white';
      case 'warning': return 'bg-amber-500 hover:bg-amber-600 text-white';
      default: return 'bg-brand-primary hover:brightness-110 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-600">{message}</p>
        </div>
        <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 font-bold text-sm rounded-lg transition-colors ${getTypeStyles()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ToastProvider;