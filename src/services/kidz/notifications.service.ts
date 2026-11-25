import { apiClient, unwrapArray, unwrapData } from "@/lib/kidz/kidz-api-client";
import type { NotificationDTO } from "@/types/kidz/api.types";

function safeIsoDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const trimmed = String(value).trim().replace(" ", "T");
  const withZone = /Z|[+-]\d{2}:?\d{2}$/i.test(trimmed) ? trimmed : `${trimmed}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function normalizeKidzNotification(item: any): NotificationDTO {
  const id = String(item?.id ?? item?.notificationId ?? item?._id ?? "");
  const title = String(item?.title ?? "Notification");
  const message = String(item?.message ?? item?.description ?? item?.content ?? "");
  const read = Boolean(item?.read ?? item?.isRead ?? false);
  const type = item?.type;
  const actionUrl = item?.actionUrl ?? item?.url ?? item?.link;
  const createdAt = safeIsoDate(item?.createdAt ?? item?.sentAt ?? item?.timestamp);

  return {
    id,
    title,
    message,
    read,
    type,
    actionUrl,
    createdAt,
  };
}

export const notificationsService = {
  /**
   * Get all notifications for current student / kids user (GET /api/notifications)
   */
  async getNotifications(): Promise<NotificationDTO[]> {
    try {
      const response = await apiClient.get<NotificationDTO[]>("/notifications");
      const rawList = unwrapArray<any>(response);
      return rawList
        .map(normalizeKidzNotification)
        .filter((n) => !!n.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn("[KidzNotificationsService] Error fetching notifications:", err);
      return [];
    }
  },

  /**
   * Get unread notifications only
   */
  async getUnreadNotifications(): Promise<NotificationDTO[]> {
    try {
      const response = await apiClient.get<NotificationDTO[]>("/notifications/unread");
      const rawList = unwrapArray<any>(response);
      const parsed = rawList
        .map(normalizeKidzNotification)
        .filter((n) => !!n.id);
      if (parsed.length > 0) {
        return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch {
      /* Fallback to fetching all and filtering unread */
    }
    const all = await this.getNotifications();
    return all.filter((n) => !n.read);
  },

  /**
   * Get unread count for badge pill
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<{ count?: number } | number>("/notifications/count");
      const data = unwrapData<unknown>(response);
      if (typeof data === "number") return data;
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        const count = obj.count ?? obj.unreadCount ?? obj.total;
        if (typeof count === "number") return count;
      }
    } catch {
      /* Fallback to counting unread from full list */
    }
    const list = await this.getNotifications();
    return list.filter((n) => !n.read).length;
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(id: string): Promise<void> {
    if (!id) return;
    try {
      await apiClient.put(`/notifications/${encodeURIComponent(id)}/read`);
    } catch (err) {
      console.warn("[KidzNotificationsService] Error marking as read:", err);
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.put("/notifications/read-all");
    } catch (err) {
      console.warn("[KidzNotificationsService] Error marking all read:", err);
    }
  },
};

export default notificationsService;
