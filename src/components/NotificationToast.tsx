/**
 * Notification Toasts for Astrophysics Events
 */

import React from 'react';
import { ToastMessage } from '../types';
import { X, Flame, Sparkles, Orbit, AlertCircle } from 'lucide-react';

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="absolute bottom-5 right-5 z-40 flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.map((t) => {
        let borderCol = 'border-cyan-500/40';
        let bgCol = 'bg-slate-900/90';
        let icon = <Sparkles size={16} className="text-cyan-400" />;

        if (t.type === 'supernova') {
          borderCol = 'border-rose-500/60';
          bgCol = 'bg-rose-950/90';
          icon = <Flame size={16} className="text-rose-400" />;
        } else if (t.type === 'blackhole') {
          borderCol = 'border-purple-500/60';
          bgCol = 'bg-purple-950/90';
          icon = <Orbit size={16} className="text-purple-400" />;
        } else if (t.type === 'warning') {
          borderCol = 'border-amber-500/60';
          bgCol = 'bg-amber-950/90';
          icon = <AlertCircle size={16} className="text-amber-400" />;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border ${borderCol} ${bgCol} backdrop-blur-md shadow-2xl flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-right-4`}
          >
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-100">{t.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{t.body}</p>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-white transition shrink-0 p-1"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
