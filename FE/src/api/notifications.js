import { apiDelete, apiGet, apiPut, pageParams } from "./apiResponse";

export const getNotifications = (options = {}) =>
  apiGet("/notifications", { params: pageParams(options) });
export const getUnreadNotificationCount = () => apiGet("/notifications/unread-count");
export const getNotificationPreferences = () => apiGet("/notifications/preferences");
export const updateNotificationPreferences = (payload) => apiPut("/notifications/preferences", payload);
export const markNotificationRead = (id) => apiPut(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => apiPut("/notifications/read-all");
export const deleteNotification = (id) => apiDelete(`/notifications/${id}`);
export const deleteAllNotifications = () => apiDelete("/notifications");
