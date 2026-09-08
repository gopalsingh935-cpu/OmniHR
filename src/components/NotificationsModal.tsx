import React, { useState } from 'react';
import { Bell, CheckCheck, Clock, Calendar, Star, ShieldAlert, DollarSign, X } from 'lucide-react';
import { storageService } from '../services/storageService';
import { AppNotification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    storageService.getNotifications()
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    storageService.markAllNotificationsAsRead();
    setNotifications(storageService.getNotifications());
  };

  const handleItemClick = (notif: AppNotification) => {
    storageService.markNotificationAsRead(notif.id);
    setNotifications(storageService.getNotifications());
    if (notif.actionLink && onNavigateTab) {
      onNavigateTab(notif.actionLink);
      onClose();
    }
  };

  const filteredList =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'leave':
        return <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'review':
        return <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'security':
        return <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'payroll':
        return <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Push Notifications</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-Time System Dispatch</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-medium"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Push Status Banner */}
        <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs border-b border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
          <span className="text-slate-600 dark:text-slate-300">Push status: <strong className="text-emerald-600 dark:text-emerald-400">Connected (Service Worker)</strong></span>
          <button
            onClick={() => setPushEnabled(!pushEnabled)}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 underline"
          >
            {pushEnabled ? 'Active' : 'Enable'}
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 dark:divide-slate-800/60">
          {filteredList.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2 stroke-1" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No notifications found</p>
              <p className="text-xs text-slate-400">You are all caught up with recent events!</p>
            </div>
          ) : (
            filteredList.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`flex cursor-pointer gap-3 rounded-xl p-3 transition-colors ${
                  !notif.read
                    ? 'bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {notif.message}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>{notif.timestamp}</span>
                    {notif.actionLink && (
                      <span className="ml-auto font-medium text-indigo-600 dark:text-indigo-400">
                        View Details &rarr;
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
