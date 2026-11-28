import {
  getNotifications as fetchNotifications,
  getUnreadNotificationCount,
  markNotificationRead as apiMarkRead,
  markAllNotificationsRead as apiMarkAllRead,
  deleteNotification as apiDeleteNotification,
  deleteAllNotifications as apiDeleteAllNotifications,
} from "../../api/notifications";
import { pageContent } from "../../api/apiResponse";
import { toNotificationView } from "../../api/adapters";

export const UPDATE_EVENT = "miniSocialNotificationsUpdated";

export async function getSavedNotifications() {
  const page = await fetchNotifications({ page: 0, size: 100 });
  return pageContent(page).map(toNotificationView);
}

export async function getUnreadCount() {
  const result = await getUnreadNotificationCount();
  return Number(result?.count || 0);
}

export const markNotificationRead = apiMarkRead;
export const markAllNotificationsRead = apiMarkAllRead;
export const deleteNotification = apiDeleteNotification;
export const deleteAllNotifications = apiDeleteAllNotifications;

// Social actions create notifications on the server; UI should never synthesize one locally.
export function addNotification() {
  return null;
}

export function formatNotificationTime(createdAt, fallback = "Vừa xong") {
  if (!createdAt) return fallback;
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return fallback;

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(timestamp).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
