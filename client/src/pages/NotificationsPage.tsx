import { useState } from 'react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../hooks/useApi';
import type { Notification } from '../hooks/useApi';

const TYPE_ICONS: Record<string, string> = {
  VITAL_SIGN_ALERT: '!',
  HANDOVER_SUMMARY: 'H',
  TASK_NOTIFICATION: 'T',
  GENERAL: 'G',
};

const TYPE_COLORS: Record<string, string> = {
  VITAL_SIGN_ALERT: 'bg-red-500',
  HANDOVER_SUMMARY: 'bg-purple-500',
  TASK_NOTIFICATION: 'bg-yellow-500',
  GENERAL: 'bg-gray-500',
};

export function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

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
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            {filter === 'unread' ? 'Show All' : 'Show Unread'}
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
        <div className="space-y-3">
          {filtered.map((n: Notification) => (
            <div key={n.id}
              className={`bg-white shadow rounded-lg p-4 flex items-start gap-4 ${!n.isRead ? 'border-l-4 border-primary-500' : 'opacity-70'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${TYPE_COLORS[n.type] || 'bg-gray-400'}`}>
                {TYPE_ICONS[n.type] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{n.message}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button onClick={() => handleMarkRead(n.id)} className="text-xs text-primary-600 hover:text-primary-800 whitespace-nowrap">
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
