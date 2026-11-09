const STORAGE_KEY = "miniSocialNotifications";
const UPDATE_EVENT = "miniSocialNotificationsUpdated";

// ĐỌC DANH SÁCH THÔNG BÁO
export function getSavedNotifications() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ? parsed : [];
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
    avatar,
    message = "có hoạt động mới.",
}) {
    try {
        const notifications = getSavedNotifications();

        const newNotification = {
            id: `${Date.now()}-${Math.random()}`,
            type,
            name: name || "MiniSocial",
            avatar: avatar || "https://i.pravatar.cc/100",
            message: message || "có hoạt động mới.",
            time: "Vừa xong",
            read: false,
            createdAt: new Date().toISOString(),
        };

        const updatedNotifications = [newNotification, ...notifications];

        const saved = saveNotifications(updatedNotifications);

        if (!saved) {
            return null;
        }

        return newNotification;
    } catch (error) {
        console.error("Không thể tạo thông báo:", error);
        return null;
    }
}
