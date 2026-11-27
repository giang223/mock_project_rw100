import {
    getCurrentAccount,
    getAccountById,
    readAccountData,
    saveAccountData,
} from "../../utils/mockAccounts";

export const STORAGE_KEY = "miniSocialNotifications";
export const UPDATE_EVENT = "miniSocialNotificationsUpdated";

const PROFILE_KEY = "miniSocialProfile";

// LẤY ID TÀI KHOẢN HIỆN TẠI
function getCurrentUserId() {
    return getCurrentAccount()?.id ?? null;
}

// ĐỌC HỒ SƠ NGƯỜI GỬI THÔNG BÁO
function getSenderProfile(senderId) {
    const account = getAccountById(senderId);

    if (!account) return null;

    let legacyProfile = {};

    if (String(account.id) === "1") {
        try {
            legacyProfile =
                JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") || {};
        } catch {
            legacyProfile = {};
        }
    }

    return {
        ...account,
        ...legacyProfile,
        ...readAccountData(PROFILE_KEY, {}, account.id),
        id: account.id,
        username: account.username,
        email: account.email,
    };
}

// ĐỌC DANH SÁCH THÔNG BÁO THEO TÀI KHOẢN
export function getSavedNotifications(accountId = getCurrentUserId()) {
    try {
        if (!accountId || !getAccountById(accountId)) {
            return [];
        }

        const parsed = readAccountData(STORAGE_KEY, [], accountId);

        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter(
                (item) =>
                    item &&
                    typeof item === "object" &&
                    !Array.isArray(item) &&
                    item.id != null,
            )
            .map((item) => {
                const sender =
                    item.senderId != null
                        ? getSenderProfile(item.senderId)
                        : null;

                return {
                    ...item,

                    name: sender?.fullName || item.name || "MiniSocial",

                    username: sender?.username || item.username || "",

                    avatar: sender ? sender.avatar || "" : item.avatar || "",

                    color: sender?.color || item.color || "blue",

                    message: item.message || "có hoạt động mới.",

                    read: item.read === true,

                    time: item.time || "Vừa xong",

                    isMine:
                        item.senderId != null
                            ? String(item.senderId) === String(accountId)
                            : item.isMine === true,
                };
            });
    } catch (error) {
        console.error("Không thể đọc thông báo:", error);

        return [];
    }
}

// LƯU THÔNG BÁO THEO TÀI KHOẢN
export function saveNotifications(
    notifications,
    accountId = getCurrentUserId(),
) {
    try {
        if (
            !accountId ||
            !getAccountById(accountId) ||
            !Array.isArray(notifications)
        ) {
            return false;
        }

        const success = saveAccountData(STORAGE_KEY, notifications, accountId);

        if (!success) return false;

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

    senderId = getCurrentUserId(),
    receiverId = null,

    name = "MiniSocial",
    avatar = "",
    username = "",
    color = "blue",

    message = "có hoạt động mới.",

    postId = null,
    commentId = null,
    requestId = null,
    messageId = null,
} = {}) {
    try {
        // KIỂM TRA NGƯỜI NHẬN
        if (!receiverId || !getAccountById(receiverId)) {
            return null;
        }

        // KHÔNG TỰ GỬI THÔNG BÁO CHO CHÍNH MÌNH
        if (senderId != null && String(senderId) === String(receiverId)) {
            return null;
        }

        const sender = senderId != null ? getSenderProfile(senderId) : null;

        if (senderId != null && !sender) {
            return null;
        }

        // ĐỌC THÔNG BÁO CỦA NGƯỜI NHẬN
        const notifications = getSavedNotifications(receiverId);

        const newNotification = {
            id: crypto.randomUUID(),

            type,

            senderId: senderId != null ? String(senderId) : null,

            receiverId: String(receiverId),

            name: sender?.fullName || name || "MiniSocial",

            username: sender?.username || username,

            avatar: sender ? sender.avatar || "" : avatar,

            color: sender?.color || color,

            message: message || "có hoạt động mới.",

            postId,
            commentId,
            requestId,
            messageId,

            time: "Vừa xong",

            read: false,
            isMine: false,

            createdAt: new Date().toISOString(),
        };

        const updatedNotifications = [newNotification, ...notifications];

        const success = saveNotifications(updatedNotifications, receiverId);

        if (!success) return null;

        return newNotification;
    } catch (error) {
        console.error("Không thể tạo thông báo:", error);

        return null;
    }
}

// ĐẾM THÔNG BÁO CHƯA ĐỌC
export function getUnreadCount(accountId = getCurrentUserId()) {
    return getSavedNotifications(accountId).filter((item) => !item.read).length;
}

// ĐÁNH DẤU MỘT THÔNG BÁO ĐÃ ĐỌC
export function markNotificationRead(id) {
    const notifications = getSavedNotifications();

    return saveNotifications(
        notifications.map((item) =>
            String(item.id) === String(id)
                ? {
                      ...item,
                      read: true,
                  }
                : item,
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

    return saveNotifications(
        notifications.filter((item) => String(item.id) !== String(id)),
    );
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
