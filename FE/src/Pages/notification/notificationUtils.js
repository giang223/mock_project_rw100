export const STORAGE_KEY = "miniSocialNotifications";
export const UPDATE_EVENT = "miniSocialNotificationsUpdated";

// ĐỌC DANH SÁCH THÔNG BÁO
export function getSavedNotifications() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return [];

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter(
                (item) =>
                    item &&
                    typeof item === "object" &&
                    !Array.isArray(item) &&
                    item.id != null,
            )
            .map((item) => ({
                ...item,
                name: item.name || "MiniSocial",
                message: item.message || "có hoạt động mới.",
                read: item.read === true,
                time: item.time || "Vừa xong",
            }));
    } catch (error) {
        console.error("Không thể đọc thông báo:", error);
        return [];
    }
}

// LƯU DANH SÁCH THÔNG BÁO
export function saveNotifications(notifications) {
    try {
        if (!Array.isArray(notifications)) {
            return false;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));

        window.dispatchEvent(new Event(UPDATE_EVENT));

        return true;
    } catch (error) {
        console.error("Không thể lưu thông báo:", error);
        return false;
    }
}

// TẠO THÔNG BÁO MỚI
export function addNotification({
    type = "other",
    name = "MiniSocial",
    avatar = "",
    message = "có hoạt động mới.",
    postId = null,
    username = "",
    isMine = false,
} = {}) {
    try {
        const notifications = getSavedNotifications();

        const newNotification = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

            type,
            name: name || "MiniSocial",
            username,
            avatar,
            message: message || "có hoạt động mới.",
            time: "Vừa xong",
            read: false,
            isMine,
            createdAt: new Date().toISOString(),
            postId,
        };

        const updatedNotifications = [newNotification, ...notifications];

        if (!saveNotifications(updatedNotifications)) {
            return null;
        }

        return newNotification;
    } catch (error) {
        console.error("Không thể tạo thông báo:", error);
        return null;
    }
}

// ĐẾM THÔNG BÁO CHƯA ĐỌC
export function getUnreadCount() {
    return getSavedNotifications().filter((item) => !item.read).length;
}

// ĐÁNH DẤU MỘT THÔNG BÁO ĐÃ ĐỌC
export function markNotificationRead(id) {
    const notifications = getSavedNotifications();

    return saveNotifications(
        notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item,
        ),
    );
}

// ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
export function markAllNotificationsRead() {
    const notifications = getSavedNotifications();

    return saveNotifications(
        notifications.map((item) => ({
            ...item,
            read: true,
        })),
    );
}

// XÓA MỘT THÔNG BÁO
export function deleteNotification(id) {
    const notifications = getSavedNotifications();

    return saveNotifications(notifications.filter((item) => item.id !== id));
}

// XÓA TẤT CẢ THÔNG BÁO
export function deleteAllNotifications() {
    return saveNotifications([]);
}

// HIỂN THỊ THỜI GIAN THÔNG BÁO
export function formatNotificationTime(createdAt, fallback = "Vừa xong") {
    if (!createdAt) return fallback;

    const timestamp = new Date(createdAt).getTime();

    if (!Number.isFinite(timestamp)) {
        return fallback;
    }

    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

    if (seconds < 60) {
        return "Vừa xong";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} phút trước`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} giờ trước`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days} ngày trước`;
    }

    return new Date(timestamp).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
