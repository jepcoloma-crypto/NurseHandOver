import { useState } from 'react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useApi';
import type { Notification } from '../hooks/useApi';

const TYPE_ICONS: Record<string, string> = {
  NEW_HANDOVER: 'N',
  HANDOVER_SUMMARY: 'H',
  HANDOVER_SUBMITTED: 'S',
  HANDOVER_RECEIVED: 'R',
  HANDOVER_ACCEPTED: 'A',
  HANDOVER_CLARIFICATION: '?',
  TASK_ASSIGNMENT: 'T',
  TASK_COMPLETED: 'C',
  TASK_DEFERRED: 'D',
  TASK_DUE: '!',
  TASK_OVERDUE: '!',
  VITAL_SIGN_ALERT: 'V',
  GENERAL: 'G',
};

const TYPE_COLORS: Record<string, string> = {
  NEW_HANDOVER: 'bg-blue-500',
  HANDOVER_SUMMARY: 'bg-purple-500',
  HANDOVER_SUBMITTED: 'bg-indigo-500',
  HANDOVER_RECEIVED: 'bg-violet-500',
  HANDOVER_ACCEPTED: 'bg-green-500',
  HANDOVER_CLARIFICATION: 'bg-yellow-500',
  TASK_ASSIGNMENT: 'bg-amber-500',
  TASK_COMPLETED: 'bg-green-500',
  TASK_DEFERRED: 'bg-orange-500',
  TASK_DUE: 'bg-red-400',
  TASK_OVERDUE: 'bg-red-600',
  VITAL_SIGN_ALERT: 'bg-red-500',
  GENERAL: 'bg-gray-500',
};

const TYPE_LABELS: Record<string, string> = {
  NEW_HANDOVER: 'Handover',
  HANDOVER_SUMMARY: 'Handover',
  HANDOVER_SUBMITTED: 'Handover',
  HANDOVER_RECEIVED: 'Handover',
  HANDOVER_ACCEPTED: 'Handover',
  HANDOVER_CLARIFICATION: 'Clarification',
  TASK_ASSIGNMENT: 'Task',
  TASK_COMPLETED: 'Task',
  TASK_DEFERRED: 'Task',
  TASK_DUE: 'Task',
  TASK_OVERDUE: 'Task',
  VITAL_SIGN_ALERT: 'Alert',
  GENERAL: 'General',
};

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const filtered = filter === 'unread' ? notifications.filter((n: Notification) => !n.isRead) : notifications;

  const handleMarkRead = async (id: string) => {
    await markRead.mutateAsync(id);
  };

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
            className={`px-3 py-1.5 text-sm border rounded-md ${
              filter === 'unread' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 hover:bg-gray-50'
            }`}>
            {filter === 'unread' ? 'Show All' : `Unread (${unreadCount})`}
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700">
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
          {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n: Notification) => {
            const icon = TYPE_ICONS[n.type] || '?';
            const color = TYPE_COLORS[n.type] || 'bg-gray-400';
            const label = TYPE_LABELS[n.type] || 'Other';
            return (
              <div key={n.id}
                className={`bg-white shadow rounded-lg p-4 flex items-start gap-4 transition-colors ${
                  !n.isRead ? 'border-l-4 border-primary-500 bg-primary-50/30' : 'opacity-60'
                }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
                    <span className="text-sm font-medium text-gray-900">{n.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && (
                  <button onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-primary-600 hover:text-primary-800 whitespace-nowrap flex-shrink-0">
                    Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
