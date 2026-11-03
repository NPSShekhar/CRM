import React, { useEffect, useState } from 'react';
import {
  Bell,
  MessageSquare,
  UserCheck,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useRealtimeNotifications, ToastNotification } from '../../context/NotificationRealtimeContext.js';

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
  onClick: (toast: ToastNotification) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isEntering, setIsEntering] = useState(true);

  const durationMs = toast.autoDismissMs || 7000;

  useEffect(() => {
    // Entrance animation trigger
    const enterTimer = setTimeout(() => setIsEntering(false), 50);
    return () => clearTimeout(enterTimer);
  }, []);

  // Auto-dismiss countdown bar
  useEffect(() => {
    if (isHovered) return;

    const interval = 100;
    const step = (interval / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isHovered, durationMs, onDismiss, toast.id]);

  // Compute icon and style based on notification type
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'TICKET_CREATED':
        return {
          icon: <Bell className="w-5 h-5 text-blue-400" />,
          badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          badgeLabel: 'New Ticket',
          accentBorder: 'border-l-blue-500',
        };
      case 'CUSTOMER_REPLY':
        return {
          icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          badgeLabel: 'Customer Reply',
          accentBorder: 'border-l-emerald-500',
        };
      case 'TICKET_ASSIGNED':
      case 'TICKET_REASSIGNED':
        return {
          icon: <UserCheck className="w-5 h-5 text-purple-400" />,
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          badgeLabel: type === 'TICKET_REASSIGNED' ? 'Reassigned' : 'Assigned',
          accentBorder: 'border-l-purple-500',
        };
      case 'TICKET_STATUS_CHANGED':
        return {
          icon: <RefreshCw className="w-5 h-5 text-amber-400" />,
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          badgeLabel: 'Status Changed',
          accentBorder: 'border-l-amber-500',
        };
      case 'TICKET_RESOLVED':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          badgeBg: 'bg-green-500/20 text-green-300 border-green-500/30',
          badgeLabel: 'Resolved',
          accentBorder: 'border-l-green-500',
        };
      case 'TICKET_REOPENED':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          badgeLabel: 'Reopened',
          accentBorder: 'border-l-rose-500',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-slate-400" />,
          badgeBg: 'bg-slate-700 text-slate-300 border-slate-600',
          badgeLabel: 'Notice',
          accentBorder: 'border-l-slate-400',
        };
    }
  };

  const typeConfig = getTypeConfig(toast.type);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative w-96 max-w-[calc(100vw-32px)] overflow-hidden rounded-xl bg-slate-900/95 border border-slate-700/80 border-l-4 ${typeConfig.accentBorder} shadow-2xl backdrop-blur-md transition-all duration-300 ease-out cursor-pointer hover:border-slate-600 hover:shadow-brand-500/10 ${
        isEntering ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'
      }`}
      onClick={() => onClick(toast)}
      role="alert"
    >
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center">
              {typeConfig.icon}
            </div>
            <div>
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeConfig.badgeBg}`}>
                {typeConfig.badgeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {toast.ticketNumber && (
              <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {toast.ticketNumber}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-white leading-snug line-clamp-1 mb-1">
          {toast.title}
        </h4>

        {/* Message */}
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
          {toast.message}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span>Just now</span>
          <span className="flex items-center gap-1 text-brand-400 font-medium group-hover:underline">
            <span>View ticket</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="h-0.5 w-full bg-slate-800">
        <div
          className="h-full bg-brand-500/70 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const GlobalNotificationContainer: React.FC = () => {
  const { toasts, dismissToast, clickToast } = useRealtimeNotifications();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed top-6 right-6 z-[9999] flex flex-col items-end space-y-3 pointer-events-none select-none"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          onClick={clickToast}
        />
      ))}
    </div>
  );
};
