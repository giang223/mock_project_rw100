
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  UPDATE_EVENT,
  formatNotificationTime,
} from "./notificationUtils";
import { getCurrentAccount } from "../../utils/mockAccounts";
import { getApiErrorMessage } from "../../api/http";
import { pageContent } from "../../api/apiResponse";
import { toNotificationView } from "../../api/adapters";
import { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead, deleteNotification, deleteAllNotifications } from "../../api/notifications";

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
function NotificationAvatar({ avatar, name, color }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatar]);

  const colors = {
    blue: "#1877f2",
    green: "#16a34a",
    orange: "#ea9233",
    purple: "#9063cd",
    pink: "#d94e88",
  };

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
    <div
      className="notification-avatar-fallback"
      style={{
        background: colors[color] || "#1877f2",
        color: "#ffffff",
      }}
    >
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
  const [notifications, setNotifications] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [activeType, setActiveType] = useState("all");

  const [, setClock] = useState(0);

  const navigate = useNavigate();

 const refreshNotifications = useCallback(async ({ signalHeader = false } = {}) => {
   setIsLoading(true);
   setLoadError("");
   try {
     const [page, unreadResponse] = await Promise.all([
       getNotifications({ page: 0, size: 100 }),
       getUnreadNotificationCount(),
     ]);
     setNotifications(pageContent(page).map(toNotificationView));
     setUnreadTotal(Number(unreadResponse?.count || 0));
     if (signalHeader) window.dispatchEvent(new Event(UPDATE_EVENT));
   } catch (error) {
     setLoadError(getApiErrorMessage(error));
   } finally {
     setIsLoading(false);
   }
 }, []);

useEffect(() => {
  refreshNotifications();
  // CẬP NHẬT THỜI GIAN MỖI PHÚT
  const timer = setInterval(() => {
    setClock((previous) => previous + 1);
  }, 60000);

  return () => {
    clearInterval(timer);
  };
}, [refreshNotifications]);

 // KIỂM TRA NGƯỜI GỬI LÀ TÀI KHOẢN HIỆN TẠI
const isCurrentUser = (item) => {
  const account = getCurrentAccount();

  return Boolean(account && item.senderId != null && String(item.senderId) === String(account.id));
};

// HIỂN THỊ TÊN NGƯỜI GỬI
const displayName = (item) => {
  return item.name || "MiniSocial";
};

// HIỂN THỊ ẢNH ĐẠI DIỆN NGƯỜI GỬI
const getAvatar = (item) => {
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
  const unreadCount = unreadTotal;
  const readCount = notifications.filter((item) => item.read).length;

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
  // ĐÁNH DẤU ĐÃ ĐỌC
  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      await refreshNotifications({ signalHeader: true });
      return true;
    } catch (error) {
      alert(getApiErrorMessage(error));
      return false;
    }
  };

  // ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsRead();
      await refreshNotifications({ signalHeader: true });
    } catch (error) { alert(getApiErrorMessage(error)); }
  };

  // XÓA MỘT THÔNG BÁO
  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      await refreshNotifications({ signalHeader: true });
    } catch (error) { alert(getApiErrorMessage(error)); }
  };

  // XÓA TẤT CẢ THÔNG BÁO
  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa tất cả thông báo?"
    );

    if (!confirmed) return;

    try {
      await deleteAllNotifications();
      await refreshNotifications({ signalHeader: true });
    } catch (error) { alert(getApiErrorMessage(error)); }
  };

// MỞ THÔNG BÁO
const handleOpenNotification = async (item) => {
  const account = getCurrentAccount();

  // KIỂM TRA QUYỀN USER
  if (!item || account?.role !== "USER") {
    return;
  }

  // KIỂM TRA NGƯỜI NHẬN THÔNG BÁO
  // ĐÁNH DẤU ĐÃ ĐỌC
  if (!item.read) {
    const success = await handleMarkRead(item.id);

    if (!success) return;
  }

  // THÔNG BÁO HỆ THỐNG VÀ BÁO CÁO
  if (
    item.type === "system" ||
    item.type === "report"
  ) {
    return;
  }

  // TÌM TÀI KHOẢN NGƯỜI GỬI
  const senderId = item.senderId;

  // THÔNG BÁO TƯƠNG TÁC BÀI VIẾT
  const isPostInteraction = [
    "like",
    "comment",
    "share",
  ].includes(item.type);

  const hasPostId =
    item.postId != null &&
    item.postId !== "";

  if (isPostInteraction && hasPostId) {
    navigate(
      `/feed?postId=${encodeURIComponent(item.postId)}`
    );

    return;
  }

  // THÔNG BÁO TIN NHẮN
  if (item.type === "message") {
    if (senderId && String(senderId) !== String(account.id)) {
      navigate(
        `/messages?userId=${senderId}`
      );
    }

    return;
  }

  // MỞ TRANG CÁ NHÂN CỦA MÌNH
  if (isCurrentUser(item)) {
    navigate("/profile");
    return;
  }

  // MỞ TRANG CÁ NHÂN NGƯỜI GỬI
  if (senderId) {
    navigate(
      `/profile?userId=${senderId}`
    );

    return;
  }

  // HỖ TRỢ DỮ LIỆU CŨ CHƯA CÓ ID
  const name = String(item.name || "").trim();

  if (
    item.senderId == null &&
    name &&
    name !== "MiniSocial"
  ) {
    navigate(
      `/profile?user=${encodeURIComponent(name)}`
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

      {loadError && <p role="alert" className="profile-field-error">{loadError}</p>}
      {isLoading && <p role="status">Đang tải thông báo…</p>}

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
  color={item.color}
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
  {String(item.message || "").startsWith("Bạn ") ? (
    item.message
  ) : (
    <>
      <strong>
        {displayName(item)}
      </strong>{" "}

      {item.message}
    </>
  )}
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
