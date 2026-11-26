
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  STORAGE_KEY,
  UPDATE_EVENT,
  getSavedNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  formatNotificationTime,
} from "./notificationUtils";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";
const CURRENT_USER = "Nguyễn Văn A";

// ĐỌC THÔNG TIN CÁ NHÂN
function readProfile() {
  const defaultProfile = {
    fullName: CURRENT_USER,
    avatar: "",
  };

  try {
    const saved = JSON.parse(
      localStorage.getItem(PROFILE_KEY) || "{}"
    );

    return {
      ...defaultProfile,
      ...saved,
    };
  } catch {
    return defaultProfile;
  }
}

// TÌM KIẾM KHÔNG PHÂN BIỆT DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

// ICON THEO LOẠI THÔNG BÁO
function getIcon(type) {
  switch (type) {
    case "like":
      return "❤️";

    case "comment":
      return "💬";

    case "share":
      return "🔁";

    case "friend":
    case "friend_request":
    case "friend_accept":
    case "friend_accepted":
      return "👥";

    case "message":
      return "✉️";

    case "report":
      return "⚠️";

    case "system":
      return "⚙️";

    default:
      return "🔔";
  }
}

// ẢNH ĐẠI DIỆN THÔNG BÁO
function NotificationAvatar({ avatar, name }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatar]);

  if (avatar && !failed) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="notification-avatar-fallback">
      {String(name || "U")
        .trim()
        .split(/\s+/)
        .pop()
        ?.charAt(0)
        .toUpperCase() || "U"}
    </div>
  );
}

function Notifications() {
  const [notifications, setNotifications] = useState(
    getSavedNotifications
  );

  const [profile, setProfile] = useState(readProfile);

  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [activeType, setActiveType] = useState("all");

  const [, setClock] = useState(0);

  const navigate = useNavigate();

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
      setNotifications(getSavedNotifications());
      setProfile(readProfile());
    };

    const handleStorage = (event) => {
      if (
        event.key === STORAGE_KEY ||
        event.key === PROFILE_KEY ||
        event.key === null
      ) {
        refreshData();
      }
    };

    refreshData();

    window.addEventListener(
      UPDATE_EVENT,
      refreshData
    );

    window.addEventListener(
      PROFILE_EVENT,
      refreshData
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "focus",
      refreshData
    );

    // CẬP NHẬT THỜI GIAN MỖI PHÚT
    const timer = setInterval(() => {
      setClock((previous) => previous + 1);
    }, 60000);

    return () => {
      clearInterval(timer);

      window.removeEventListener(
        UPDATE_EVENT,
        refreshData
      );

      window.removeEventListener(
        PROFILE_EVENT,
        refreshData
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "focus",
        refreshData
      );
    };
  }, []);

  // KIỂM TRA THÔNG BÁO CỦA TÀI KHOẢN HIỆN TẠI
  const isCurrentUser = (item) => {
    return (
      item.isMine === true ||
      item.name === CURRENT_USER
    );
  };

  // HIỂN THỊ TÊN
  const displayName = (item) => {
    if (isCurrentUser(item)) {
      return profile.fullName || CURRENT_USER;
    }

    return item.name || "MiniSocial";
  };

  // HIỂN THỊ ẢNH ĐẠI DIỆN
  const getAvatar = (item) => {
    if (isCurrentUser(item)) {
      return profile.avatar || "";
    }

    return item.avatar || "";
  };

  // KIỂM TRA THÔNG BÁO KẾT BẠN
  const isFriendNotification = (item) => {
    return [
      "friend",
      "friend_request",
      "friend_accept",
      "friend_accepted",
    ].includes(item.type);
  };

  // ĐẾM THÔNG BÁO
  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  const readCount =
    notifications.length - unreadCount;

  // LỌC VÀ TÌM KIẾM THÔNG BÁO
  const filteredNotifications =
    notifications.filter((item) => {
      if (
        activeTab === "unread" &&
        item.read
      ) {
        return false;
      }

      if (
        activeTab === "read" &&
        !item.read
      ) {
        return false;
      }

     // LỌC THEO LOẠI THÔNG BÁO
if (activeType === "friend") {
  if (!isFriendNotification(item)) {
    return false;
  }
} else if (activeType === "other") {
  const knownTypes = [
    "like",
    "comment",
    "share",
    "message",
    "report",
    "system",
  ];

  if (
    knownTypes.includes(item.type) ||
    isFriendNotification(item)
  ) {
    return false;
  }
} else if (
  activeType !== "all" &&
  item.type !== activeType
) {
  return false;
}

      const keyword = normalizeText(searchText);

      const searchableText = normalizeText(
        `${displayName(item)} ${item.message}`
      );

      return searchableText.includes(keyword);
    });

  // KIỂM TRA KẾT QUẢ LƯU
  const checkResult = (success) => {
    if (!success) {
      alert("Không thể cập nhật thông báo!");
    }

    return success;
  };

  // ĐÁNH DẤU ĐÃ ĐỌC
  const handleMarkRead = (id) => {
    return checkResult(
      markNotificationRead(id)
    );
  };

  // ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;

    checkResult(
      markAllNotificationsRead()
    );
  };

  // XÓA MỘT THÔNG BÁO
  const handleDelete = (id) => {
    checkResult(
      deleteNotification(id)
    );
  };

  // XÓA TẤT CẢ THÔNG BÁO
  const handleDeleteAll = () => {
    if (notifications.length === 0) return;

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa tất cả thông báo?"
    );

    if (!confirmed) return;

    checkResult(
      deleteAllNotifications()
    );
  };

  // MỞ THÔNG BÁO
  const handleOpenNotification = (item) => {
    if (!item.read) {
      const success = handleMarkRead(item.id);

      if (!success) return;
    }

    // MỞ CHI TIẾT BÀI VIẾT
    if (
      item.postId !== null &&
      item.postId !== undefined &&
      item.postId !== ""
    ) {
      navigate(
        `/feed?postId=${encodeURIComponent(
          item.postId
        )}`
      );

      return;
    }

    // MỞ TRANG KẾT BẠN
    if (isFriendNotification(item)) {
      navigate("/friend-requests");
      return;
    }

    // MỞ TRANG TIN NHẮN
    if (item.type === "message") {
      navigate("/messages");
      return;
    }

    // MỞ TRANG CÁ NHÂN
    if (isCurrentUser(item)) {
      navigate("/profile");
      return;
    }

    if (
      item.name &&
      item.name !== "MiniSocial"
    ) {
      navigate(
        `/profile?user=${encodeURIComponent(
          item.name
        )}`
      );
    }
  };

  // XÓA BỘ LỌC
  const resetFilters = () => {
    setSearchText("");
    setActiveType("all");
    setActiveTab("all");
  };

  return (
    <div className="notifications-page">

      {/* HEADER */}
      <header className="notifications-header">
        <div>
          <Link
            to="/feed"
            className="notifications-back"
          >
            ← Quay lại bảng tin
          </Link>

          <h1>Thông báo</h1>

          <p>
            Bạn có {unreadCount} thông báo chưa đọc.
          </p>
        </div>

        <div className="notifications-header-actions">
          <button
            type="button"
            className="notifications-mark-all"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Đánh dấu tất cả đã đọc
          </button>

          <button
            type="button"
            className="notifications-delete-all"
            onClick={handleDeleteAll}
            disabled={notifications.length === 0}
          >
            Xóa tất cả
          </button>
        </div>
      </header>

      {/* DANH SÁCH THÔNG BÁO */}
      <div className="notifications-card">

        {/* TABS */}
        <div className="notifications-tabs">

          <button
            type="button"
            className={
              activeTab === "all" ? "active" : ""
            }
            onClick={() => setActiveTab("all")}
          >
            Tất cả ({notifications.length})
          </button>

          <button
            type="button"
            className={
              activeTab === "unread" ? "active" : ""
            }
            onClick={() => setActiveTab("unread")}
          >
            Chưa đọc ({unreadCount})
          </button>

          <button
            type="button"
            className={
              activeTab === "read" ? "active" : ""
            }
            onClick={() => setActiveTab("read")}
          >
            Đã đọc ({readCount})
          </button>
        </div>

        {/* TÌM KIẾM VÀ BỘ LỌC */}
        <div className="notifications-filter">

          <div className="notifications-search">
            <span>🔍</span>

            <input
              type="search"
              placeholder="Tìm kiếm thông báo..."
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />

            {searchText && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => setSearchText("")}
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={activeType}
            aria-label="Loại thông báo"
            onChange={(event) =>
              setActiveType(event.target.value)
            }
          >
            <option value="all">
              Tất cả hoạt động
            </option>

            <option value="like">
              Lượt thích
            </option>

            <option value="comment">
              Bình luận
            </option>

            <option value="share">
              Chia sẻ
            </option>

            <option value="friend">
              Kết bạn
            </option>

            <option value="message">
              Tin nhắn
            </option>

            <option value="report">
              Báo cáo
            </option>

            <option value="system">
              Hệ thống
            </option>

            <option value="other">
              Khác
            </option>
          </select>
        </div>

        {/* NỘI DUNG */}
        <div className="notifications-list">

          {filteredNotifications.length === 0 ? (
            <div className="notifications-empty">
              <div>🔔</div>

              <h3>Không có thông báo</h3>

              <p>
                {searchText || activeType !== "all"
                  ? "Không tìm thấy thông báo phù hợp."
                  : activeTab === "unread"
                  ? "Bạn không có thông báo chưa đọc."
                  : activeTab === "read"
                  ? "Chưa có thông báo nào được đọc."
                  : "Thông báo mới sẽ xuất hiện ở đây."}
              </p>

              {(searchText ||
                activeType !== "all") && (
                <button
                  type="button"
                  className="notifications-reset"
                  onClick={resetFilters}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`notification-item ${
                  item.read
                    ? "is-read"
                    : "is-unread"
                }`}
              >

                {/* ẢNH ĐẠI DIỆN */}
                <div className="notification-avatar">

                  <NotificationAvatar
                    avatar={getAvatar(item)}
                    name={displayName(item)}
                  />

                  <span className="notification-type-icon">
                    {getIcon(item.type)}
                  </span>
                </div>

                {/* NỘI DUNG */}
                <div
                  className="notification-content"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    handleOpenNotification(item)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      handleOpenNotification(item);
                    }
                  }}
                >
                  <p>
                    <strong>
                      {displayName(item)}
                    </strong>{" "}

                    {item.message}
                  </p>

                  <span className="notification-time">
                    {formatNotificationTime(
                      item.createdAt,
                      item.time
                    )}
                  </span>
                </div>

                {/* NÚT THAO TÁC */}
                <div className="notification-actions">

                  {!item.read && (
                    <button
                      type="button"
                      onClick={() =>
                        handleMarkRead(item.id)
                      }
                      title="Đánh dấu đã đọc"
                      aria-label="Đánh dấu đã đọc"
                    >
                      ✓
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(item.id)
                    }
                    title="Xóa thông báo"
                    aria-label="Xóa thông báo"
                  >
                    ✕
                  </button>
                </div>

                {/* DẤU CHƯA ĐỌC */}
                {!item.read && (
                  <span className="notification-unread-dot" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
