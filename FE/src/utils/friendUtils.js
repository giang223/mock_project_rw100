import {
    getCurrentAccount,
    getAccountById,
    readAccountData,
    isUser,
} from "./mockAccounts";
import { addNotification } from "../Pages/notification/notificationUtils";

export const FRIEND_KEY = "miniSocialFriendRelationships";

export const FRIEND_EVENT = "miniSocialFriendRequestsUpdated";

export const BLOCKED_KEY = "miniSocialBlockedUsers";

export const BLOCKED_EVENT = "miniSocialBlockedUsersUpdated";

// SO SÁNH ID
function sameId(first, second) {
    return String(first) === String(second);
}

// KIỂM TRA TÀI KHOẢN NGƯỜI DÙNG
function isSocialUser(accountId) {
    const account = getAccountById(accountId);

    return Boolean(account && isUser(account));
}

// ĐỌC DANH SÁCH QUAN HỆ BẠN BÈ
export function readRelationships() {
    try {
        const data = JSON.parse(localStorage.getItem(FRIEND_KEY) || "[]");

        return Array.isArray(data)
            ? data.filter(
                  (item) =>
                      item &&
                      item.senderId != null &&
                      item.receiverId != null &&
                      isSocialUser(item.senderId) &&
                      isSocialUser(item.receiverId) &&
                      !sameId(item.senderId, item.receiverId) &&
                      ["pending", "accepted"].includes(item.status),
              )
            : [];
    } catch {
        return [];
    }
}

// LƯU QUAN HỆ BẠN BÈ
function saveRelationships(relationships) {
    if (!isUser()) return false;

    if (!Array.isArray(relationships)) {
        return false;
    }

    try {
        localStorage.setItem(FRIEND_KEY, JSON.stringify(relationships));

        window.dispatchEvent(new Event(FRIEND_EVENT));

        return true;
    } catch {
        return false;
    }
}

// LẤY HỒ SƠ NGƯỜI DÙNG
export function getFriendProfile(accountId) {
    const account = getAccountById(accountId);

    if (!account || !isUser(account)) {
        return null;
    }

    let legacyProfile = {};

    try {
        if (account.id === 1) {
            legacyProfile = JSON.parse(
                localStorage.getItem("miniSocialProfile") || "{}",
            );
        }
    } catch {
        legacyProfile = {};
    }

    return {
        ...account,
        ...readAccountData("miniSocialProfile", legacyProfile, account.id),
        id: account.id,
        username: account.username,
        email: account.email,
        role: account.role,
    };
}

// KIỂM TRA CHẶN GIỮA HAI TÀI KHOẢN
export function isBlockedBetween(firstId, secondId) {
    const checkBlocked = (ownerId, targetId) => {
        const blocked = readAccountData(BLOCKED_KEY, [], ownerId);

        const target = getAccountById(targetId);

        if (!Array.isArray(blocked)) return false;

        return blocked.some((item) => {
            if (!item) return false;

            if (item.userId != null) {
                return sameId(item.userId, targetId);
            }

            return Boolean(target && item.username === target.username);
        });
    };

    return checkBlocked(firstId, secondId) || checkBlocked(secondId, firstId);
}

// TÌM QUAN HỆ GIỮA HAI TÀI KHOẢN
export function getRelationship(
    firstId,
    secondId,
    relationships = readRelationships(),
) {
    return (
        relationships.find(
            (item) =>
                (sameId(item.senderId, firstId) &&
                    sameId(item.receiverId, secondId)) ||
                (sameId(item.senderId, secondId) &&
                    sameId(item.receiverId, firstId)),
        ) || null
    );
}

// LẤY TRẠNG THÁI KẾT BẠN
export function getFriendStatus(targetId) {
    const account = getCurrentAccount();

    if (!isUser(account)) {
        return "blocked";
    }

    if (!isSocialUser(targetId)) {
        return "blocked";
    }

    if (sameId(account.id, targetId)) {
        return "self";
    }

    if (isBlockedBetween(account.id, targetId)) {
        return "blocked";
    }

    const relationship = getRelationship(account.id, targetId);

    if (!relationship) return "none";

    if (relationship.status === "accepted") {
        return "accepted";
    }

    return sameId(relationship.senderId, account.id) ? "sent" : "received";
}

// LẤY DANH SÁCH ID BẠN BÈ
export function getFriendIds(accountId, relationships = readRelationships()) {
    if (!isSocialUser(accountId)) {
        return [];
    }

    return [
        ...new Set(
            relationships
                .filter(
                    (item) =>
                        item.status === "accepted" &&
                        (sameId(item.senderId, accountId) ||
                            sameId(item.receiverId, accountId)),
                )
                .map((item) =>
                    sameId(item.senderId, accountId)
                        ? String(item.receiverId)
                        : String(item.senderId),
                )
                .filter(
                    (id) =>
                        isSocialUser(id) &&
                        !sameId(accountId, id) &&
                        !isBlockedBetween(accountId, id),
                ),
        ),
    ];
}

// TÍNH SỐ BẠN CHUNG
export function getMutualFriends(
    firstId,
    secondId,
    relationships = readRelationships(),
) {
    const firstFriends = getFriendIds(firstId, relationships);

    const secondFriends = getFriendIds(secondId, relationships);

    return firstFriends.filter((id) => secondFriends.includes(id)).length;
}

// LẤY LỜI MỜI CỦA TÀI KHOẢN HIỆN TẠI
export function getMyFriendRequests() {
    const account = getCurrentAccount();

    if (!isUser(account)) return [];

    const relationships = readRelationships();

    return relationships
        .filter(
            (item) =>
                sameId(item.senderId, account.id) ||
                sameId(item.receiverId, account.id),
        )
        .map((item) => {
            const isSender = sameId(item.senderId, account.id);

            const otherId = isSender ? item.receiverId : item.senderId;

            const profile = getFriendProfile(otherId);

            if (!profile) return null;

            if (isBlockedBetween(account.id, otherId)) {
                return null;
            }

            return {
                ...item,

                userId: otherId,
                name: profile.fullName,
                username: profile.username,
                avatar: profile.avatar || "",
                color: profile.color || "blue",

                mutualFriends: getMutualFriends(
                    account.id,
                    otherId,
                    relationships,
                ),

                status:
                    item.status === "accepted"
                        ? "accepted"
                        : isSender
                          ? "sent"
                          : "received",
            };
        })
        .filter(Boolean);
}

// GỬI LỜI MỜI KẾT BẠN
export function sendFriendRequest(targetId) {
    const account = getCurrentAccount();
    const target = getAccountById(targetId);

    if (!isUser(account) || !isUser(target)) {
        return false;
    }

    if (sameId(account.id, targetId)) {
        return false;
    }

    if (isBlockedBetween(account.id, targetId)) {
        return false;
    }

    const relationships = readRelationships();

    if (getRelationship(account.id, targetId, relationships)) {
        return false;
    }

    const newRequest = {
        id: crypto.randomUUID(),
        senderId: account.id,
        receiverId: target.id,
        status: "pending",
        createdAt: new Date().toISOString(),
    };

    const success = saveRelationships([...relationships, newRequest]);

    if (!success) return false;

    // GỬI THÔNG BÁO CHO NGƯỜI NHẬN
    addNotification({
        type: "friend_request",
        senderId: account.id,
        receiverId: target.id,
        requestId: newRequest.id,
        message: "đã gửi cho bạn lời mời kết bạn.",
    });

    return true;
}

// CHẤP NHẬN LỜI MỜI
export function acceptFriendRequest(requestId) {
    const account = getCurrentAccount();

    if (!isUser(account)) return false;

    const relationships = readRelationships();

    const request = relationships.find(
        (item) =>
            sameId(item.id, requestId) &&
            sameId(item.receiverId, account.id) &&
            item.status === "pending",
    );

    if (!request) return false;

    if (isBlockedBetween(request.senderId, request.receiverId)) {
        return false;
    }

    const success = saveRelationships(
        relationships.map((item) =>
            sameId(item.id, requestId)
                ? {
                      ...item,
                      status: "accepted",
                      acceptedAt: new Date().toISOString(),
                  }
                : item,
        ),
    );

    if (!success) return false;

    // THÔNG BÁO CHO NGƯỜI ĐÃ GỬI LỜI MỜI
    addNotification({
        type: "friend_accept",
        senderId: account.id,
        receiverId: request.senderId,
        requestId: request.id,
        message: "đã chấp nhận lời mời kết bạn của bạn.",
    });

    return true;
}

// TỪ CHỐI LỜI MỜI
export function rejectFriendRequest(requestId) {
    const account = getCurrentAccount();

    if (!isUser(account)) return false;

    const relationships = readRelationships();

    const request = relationships.find(
        (item) =>
            sameId(item.id, requestId) &&
            sameId(item.receiverId, account.id) &&
            item.status === "pending",
    );

    if (!request) return false;

    return saveRelationships(
        relationships.filter((item) => !sameId(item.id, requestId)),
    );
}

// HỦY LỜI MỜI ĐÃ GỬI
export function cancelFriendRequest(requestId) {
    const account = getCurrentAccount();

    if (!isUser(account)) return false;

    const relationships = readRelationships();

    const request = relationships.find(
        (item) =>
            sameId(item.id, requestId) &&
            sameId(item.senderId, account.id) &&
            item.status === "pending",
    );

    if (!request) return false;

    return saveRelationships(
        relationships.filter((item) => !sameId(item.id, requestId)),
    );
}

// HỦY KẾT BẠN
export function unfriendUser(requestId) {
    const account = getCurrentAccount();

    if (!isUser(account)) return false;

    const relationships = readRelationships();

    const request = relationships.find(
        (item) =>
            sameId(item.id, requestId) &&
            item.status === "accepted" &&
            (sameId(item.senderId, account.id) ||
                sameId(item.receiverId, account.id)),
    );

    if (!request) return false;

    return saveRelationships(
        relationships.filter((item) => !sameId(item.id, requestId)),
    );
}

// XÓA QUAN HỆ KHI CHẶN NGƯỜI DÙNG
export function removeRelationshipWith(targetId) {
    const account = getCurrentAccount();

    if (!isUser(account)) return false;
    if (!isSocialUser(targetId)) return false;

    const relationships = readRelationships();

    const relationship = getRelationship(account.id, targetId, relationships);

    if (!relationship) return true;

    return saveRelationships(
        relationships.filter((item) => !sameId(item.id, relationship.id)),
    );
}
