import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Ticket,
  UserCheck,
  MessageSquare,
  AlertTriangle,
  Mail,
  Info,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '../../hooks/useNotifications.js';
import { NotificationItem } from '../../types/index.js';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'TICKET_CREATED':
      return <Ticket className="w-4 h-4 text-brand-600" />;
    case 'TICKET_ASSIGNED':
    case 'TICKET_REASSIGNED':
      return <UserCheck className="w-4 h-4 text-indigo-600" />;
    case 'CUSTOMER_REPLY':
    case 'TICKET_REPLY':
      return <MessageSquare className="w-4 h-4 text-emerald-600" />;
    case 'INTERNAL_NOTE':
      return <Info className="w-4 h-4 text-amber-600" />;
    case 'EMAIL_FAILED':
    case 'SLA_BREACH':
      return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    case 'EMAIL_SENT':
      return <Mail className="w-4 h-4 text-sky-600" />;
    case 'TICKET_STATUS_CHANGED':
      return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
    default:
      return <Bell className="w-4 h-4 text-slate-500" />;
  }
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadCountData } = useUnreadNotificationCount();
  const { data: notificationsData, isLoading } = useNotifications({
    unreadOnly: activeTab === 'UNREAD',
    limit: 30,
  });

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = typeof unreadCountData === 'number' ? unreadCountData : (notificationsData?.unreadCount || 0);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.link) {
      let targetLink = notification.link;

      // Adjust link to user portal context if needed
      const isAdminOrOps =
        user?.role === 'SUPER_ADMIN' ||
        user?.role === 'ADMIN' ||
        user?.role === 'SUPPORT_MANAGER' ||
        user?.role === 'ACCOUNTANT';

      if (targetLink.startsWith('/tickets/')) {
        const ticketId = targetLink.replace('/tickets/', '');
        targetLink = isAdminOrOps ? `/admin/tickets/${ticketId}` : `/agent/tickets/${ticketId}`;
      } else if (targetLink.startsWith('/admin/tickets/') && !isAdminOrOps) {
        targetLink = targetLink.replace('/admin/tickets/', '/agent/tickets/');
      } else if (targetLink.startsWith('/agent/tickets/') && isAdminOrOps) {
        targetLink = targetLink.replace('/agent/tickets/', '/admin/tickets/');
      }

      setIsOpen(false);
      navigate(targetLink);
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllMutation.mutate();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] bg-brand-500/30 text-brand-300 font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllMutation.isPending}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors font-medium px-2 py-1 rounded hover:bg-slate-800"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/70 text-xs px-3 pt-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`pb-2 px-3 font-medium border-b-2 transition-colors ${
                activeTab === 'ALL'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('UNREAD')}
              className={`pb-2 px-3 font-medium border-b-2 transition-colors ${
                activeTab === 'UNREAD'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">You're all caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No new notifications to show.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 text-xs transition-colors cursor-pointer group flex items-start gap-3 ${
                    !n.isRead ? 'bg-brand-50/40 hover:bg-brand-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`font-semibold truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5 line-clamp-2 leading-relaxed text-[11px]">
                      {n.message}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      title="Delete"
                      className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-200/60"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0"></span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
