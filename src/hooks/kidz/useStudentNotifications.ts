import { useCallback, useEffect, useState } from "react";

import { notificationsService } from "@/services/kidz/notifications.service";
import type { NotificationDTO } from "@/types/kidz/api.types";

export function useStudentNotifications() {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data);
      const unread = data.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.warn("Could not fetch notifications from backend:", err);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.warn("Could not mark notification as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Could not mark all notifications as read:", err);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
