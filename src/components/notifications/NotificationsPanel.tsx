import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notificationsService } from "@/services/notifications.service";
import { htmlToText, sanitizeHtml } from "@/lib/announcement.utils";
import type { UserNotification } from "@/types/admin-notification.types";

const isHtmlMessage = (text: string): boolean => {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
};

const formatNotificationHtml = (html: string): string => {
  const sanitized = sanitizeHtml(html);
  return sanitized.replace(/<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi, (match) => {
    if (/target=/i.test(match)) return match;
    return match.replace("<a ", '<a target="_blank" rel="noopener noreferrer" ');
  });
};

const getNotificationBadgeInfo = (type?: string) => {
  const t = String(type ?? "").toUpperCase();
  switch (t) {
    case "WELCOME":
      return {
        label: "Welcome",
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
      };
    case "PROMOTION":
    case "PROMO":
    case "CAMPAIGN":
      return {
        label: "Promotion",
        badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200",
      };
    case "ENROLLMENT":
      return {
        label: "Enrollment",
        badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
      };
    case "INSTRUCTOR_REPLY":
      return {
        label: "Instructor Reply",
        badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200",
      };
    case "PAYMENT_SUCCESS":
      return {
        label: "Payment Success",
        badgeClass: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200",
      };
    case "PASSWORD_RESET":
      return {
        label: "Password Reset",
        badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
      };
    case "LIVE_CLASS_REMINDER":
      return {
        label: "Live Class Reminder",
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
      };
    case "COURSE_UPDATE":
    case "COURSE":
      return {
        label: "Course Update",
        badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200",
      };
    case "CERTIFICATE_ISSUED":
      return {
        label: "Certificate Issued",
        badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200",
      };
    case "PAYMENT_FAILED":
      return {
        label: "Payment Failed",
        badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200",
      };
    case "LESSON_REMINDER":
      return {
        label: "Lesson Reminder",
        badgeClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200",
      };
    case "LIVE_CLASS_STARTING":
      return {
        label: "Live Class Starting",
        badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200",
      };
    case "REVIEW_REQUEST":
      return {
        label: "Review Request",
        badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200",
      };
    case "SYSTEM_ALERT":
    case "SYSTEM":
    case "WARNING":
      return {
        label: "System Alert",
        badgeClass: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200",
      };
    default:
      return {
        label: t ? t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "General",
        badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200",
      };
  }
};

export const NotificationsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<UserNotification | null>(null);

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationsService.unreadCount();
      setUnreadCount(count);
    } catch {
      /* ignore non-blocking error */
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setLoading(true);
      try {
        const list = await notificationsService.list();
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      } catch {
        /* ignore non-blocking error */
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id || (n as any).id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore non-blocking error */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore non-blocking error */
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsService.deleteNotification(id);
      const target = notifications.find((x) => x.notificationId === id || (x as any).id === id);
      setNotifications((prev) => prev.filter((x) => x.notificationId !== id && (x as any).id !== id));
      if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore non-blocking error */
    }
  };

  const handleItemClick = (notif: UserNotification) => {
    const notifId = notif.notificationId || (notif as any).id;
    if (!notif.read && notifId) {
      handleMarkRead(notifId);
    }
    setSelectedNotif(notif);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (Number.isNaN(diff) || diff < 0) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 hover:bg-muted rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="
                z-50 bg-background border border-border shadow-xl rounded-xl
                flex flex-col overflow-hidden
                fixed left-1/2 -translate-x-1/2 top-16
                w-[calc(100vw-2rem)] max-w-sm
                max-h-[calc(100vh-5rem)]
                sm:absolute sm:left-auto sm:right-0 sm:translate-x-0 sm:top-full sm:mt-2
                sm:w-96 sm:max-w-none sm:max-h-[480px]
              "
            >
              {/* Fixed header */}
              <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-background z-10">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable list */}
              <div
                tabIndex={0}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y focus:outline-none"
              >
                {loading ? (
                  <div className="p-6 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <ul className="divide-y">
                    {notifications.map((notif) => {
                      const notifId = notif.notificationId || (notif as any).id;
                      const isUnread = !notif.read;
                      const hasHtml = isHtmlMessage(notif.message);
                      const previewText = hasHtml ? htmlToText(notif.message) : notif.message;
                      const badgeInfo = getNotificationBadgeInfo(notif.type);

                      return (
                        <li
                          key={notifId}
                          onClick={() => handleItemClick(notif)}
                          className={`px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                            isUnread ? "bg-primary/5 font-medium" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 h-4 font-normal ${badgeInfo.badgeClass}`}
                                >
                                  {badgeInfo.label}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {getTimeAgo(notif.createdAt)}
                                </span>
                                {isUnread && (
                                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                )}
                              </div>
                              <p className="text-sm font-semibold leading-snug truncate">
                                {notif.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {previewText}
                              </p>
                              {hasHtml && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-primary mt-1 font-medium hover:underline">
                                  View HTML content <ExternalLink className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                            <div
                              className="flex flex-col gap-1 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isUnread && (
                                <button
                                  onClick={() => handleMarkRead(notifId)}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  title="Mark as read"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(notifId)}
                                className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Detail Modal for HTML/Full Content */}
      <Dialog open={!!selectedNotif} onOpenChange={(open) => !open && setSelectedNotif(null)}>
        <DialogContent className="max-w-lg sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedNotif && (
            <>
              <DialogHeader className="space-y-2 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={getNotificationBadgeInfo(selectedNotif.type).badgeClass}
                  >
                    {getNotificationBadgeInfo(selectedNotif.type).label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFullDate(selectedNotif.createdAt)}
                  </span>
                </div>
                <DialogTitle className="text-lg font-semibold leading-snug text-foreground">
                  {selectedNotif.title}
                </DialogTitle>
              </DialogHeader>

              <div className="mt-3 border-t pt-4">
                {isHtmlMessage(selectedNotif.message) ? (
                  <div
                    className="
                      prose prose-sm dark:prose-invert max-w-none text-foreground
                      [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-foreground
                      [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-foreground
                      [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-foreground
                      [&_p]:my-2 [&_p]:leading-relaxed [&_p]:text-foreground/90
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:text-foreground/90
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:text-foreground/90
                      [&_li]:my-1
                      [&_strong]:font-semibold [&_strong]:text-foreground
                      [&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a:hover]:opacity-80
                      [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic
                      [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2
                    "
                    dangerouslySetInnerHTML={{
                      __html: formatNotificationHtml(selectedNotif.message),
                    }}
                  />
                ) : (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {selectedNotif.message}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

