// components/NotificationDisplay.tsx
import React, { useEffect, useState, useRef } from 'react';

interface Notification {
  id: string;
  message: string;
  icon?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface NotificationDisplayProps {
  notifications: Notification[];
  onRemoveNotification?: (id: string) => void;
}

const NotificationDisplay: React.FC<NotificationDisplayProps> = ({ notifications, onRemoveNotification }) => {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const getNotificationTone = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return {
          shell: 'border-emerald-400/18 bg-[linear-gradient(180deg,rgba(6,18,18,0.94),rgba(7,23,20,0.98))]',
          badge: 'border-emerald-400/20 bg-emerald-500/[0.12] text-emerald-100',
          icon: 'bg-emerald-500/[0.12] text-emerald-100',
          label: 'Success',
        };
      case 'warning':
        return {
          shell: 'border-amber-300/18 bg-[linear-gradient(180deg,rgba(20,15,6,0.94),rgba(24,18,7,0.98))]',
          badge: 'border-amber-300/20 bg-amber-300/[0.12] text-amber-100',
          icon: 'bg-amber-300/[0.12] text-amber-100',
          label: 'Notice',
        };
      case 'error':
        return {
          shell: 'border-rose-400/18 bg-[linear-gradient(180deg,rgba(24,8,12,0.94),rgba(30,9,14,0.98))]',
          badge: 'border-rose-400/20 bg-rose-500/[0.12] text-rose-100',
          icon: 'bg-rose-500/[0.12] text-rose-100',
          label: 'Error',
        };
      default:
        return {
          shell: 'border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,15,24,0.94),rgba(7,18,30,0.98))]',
          badge: 'border-cyan-400/20 bg-cyan-400/[0.12] text-cyan-100',
          icon: 'bg-cyan-400/[0.12] text-cyan-100',
          label: 'Update',
        };
    }
  };

  const parseNotification = (notification: Notification) => {
    const raw = String(notification.message || '').trim();
    const achievementMatch = raw.match(/^Achievement Unlocked:\s*(.+?)(?:\s+\+(\d+)\s+XP)?$/i);
    if (achievementMatch) {
      return {
        eyebrow: 'Achievement unlocked',
        title: achievementMatch[1].replace(/!$/, ''),
        detail: achievementMatch[2] ? `+${achievementMatch[2]} XP added to your progress.` : 'New milestone added to your profile.',
      };
    }

    return {
      eyebrow: getNotificationTone(notification.type).label,
      title: raw,
      detail: '',
    };
  };

  useEffect(() => {
    // Add new notifications that aren't already visible
    const newNotifications = notifications.filter(
      notification => !visibleNotifications.some(visible => visible.id === notification.id)
    );

    if (newNotifications.length > 0) {
      setVisibleNotifications(prev => [...prev, ...newNotifications]);

      // Set up timers only for new notifications
      newNotifications.forEach(notification => {
        // Clear any existing timer for this notification ID
        const existingTimer = timersRef.current.get(notification.id);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Set new timer
        const timer = setTimeout(() => {
          if (onRemoveNotification) {
            onRemoveNotification(notification.id);
          } else {
            // Remove locally if no removal function provided
            setVisibleNotifications(prev => prev.filter(n => n.id !== notification.id));
          }
          // Clean up timer reference
          timersRef.current.delete(notification.id);
        }, 5000);

        timersRef.current.set(notification.id, timer);
      });
    }

    // Remove notifications that are no longer in the notifications array
    const notificationIds = new Set(notifications.map(n => n.id));
    setVisibleNotifications(prev => 
      prev.filter(visible => notificationIds.has(visible.id))
    );

    // Clean up timers for removed notifications
    timersRef.current.forEach((timer, id) => {
      if (!notificationIds.has(id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });

  }, [notifications, onRemoveNotification]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[110] flex w-[min(360px,calc(100vw-2rem))] flex-col-reverse gap-3">
      {visibleNotifications.map((notification) => {
        const tone = getNotificationTone(notification.type);
        const parsed = parseNotification(notification);

        return (
          <div
            key={notification.id}
            className={`animate-slide-up lesson-panel overflow-hidden border shadow-[0_24px_60px_rgba(2,6,23,0.4)] ${tone.shell}`}
          >
            <div className="flex items-start gap-3 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-xl ${tone.icon}`}>
                <span>{notification.icon || '•'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={`lesson-meta-pill ${tone.badge}`}>{parsed.eyebrow}</span>
                </div>
                <div className="text-sm font-semibold leading-6 text-white">{parsed.title}</div>
                {parsed.detail ? (
                  <p className="mt-1 text-sm leading-6 text-slate-300">{parsed.detail}</p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationDisplay;
