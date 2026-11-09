
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "miniSocialNotifications";
const UPDATE_EVENT = "miniSocialNotificationsUpdated";

const sampleNotifications = [
  {
    id: 1,
    type: "like",
    name: "Nguyễn Văn An",
    avatar: "https://i.pravatar.cc/100?img=12",
    message: "đã thích bài viết của bạn.",
    time: "5 phút trước",
    read: false,
  },
  {
    id: 2,
    type: "comment",
    name: "Trần Thị Bình",
    avatar: "https://i.pravatar.cc/100?img=47",
    message: "đã bình luận: Bài viết hay quá!",
    time: "15 phút trước",
    read: false,
  },
  {
    id: 3,
    type: "friend",
    name: "Lê Minh Hoàng",
    avatar: "https://i.pravatar.cc/100?img=33",
    message: "đã gửi lời mời kết bạn cho bạn.",
    time: "30 phút trước",
    read: false,
  },
  {
    id: 4,
    type: "share",
    name: "Phạm Thu Hà",
    avatar: "https://i.pravatar.cc/100?img=44",
    message: "đã chia sẻ bài viết của bạn.",
    time: "1 giờ trước",
    read: true,
  },
];

// ĐỌC DỮ LIỆU LOCAL STORAGE
function getNotifications() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    // Chỉ dùng dữ liệu mẫu khi chưa từng có dữ liệu
    if (saved === null) {
      return sampleNotifications;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => ({
      ...item,
      read: item.read === true,
      name: item.name || "MiniSocial",
      message: item.message || "có hoạt động mới.",
      time: item.time || "Vừa xong",
    }));
  } catch (error) {
    console.error("Không thể đọc thông báo:", error);
    return [];
  }
}

// LƯU DỮ LIỆU
function saveNotifications(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Không thể lưu thông báo:", error);
  }
}

function Notifications() {
  const [notifications, setNotifications] = useState(
    getNotifications
  );

  const [activeTab, setActiveTab] = useState("all");

  // GIỮ DỮ LIỆU MỚI NHẤT
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // LƯU VÀ PHÁT SỰ KIỆN CẬP NHẬT CHUÔNG
  useEffect(() => {
    saveNotifications(notifications);

    window.dispatchEvent(new Event(UPDATE_EVENT));
  }, [notifications]);

  // ĐỒNG BỘ THÔNG BÁO TỪ CÁC TRANG KHÁC
  useEffect(() => {
    const syncNotifications = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) return;

        const currentData = JSON.stringify(
          notificationsRef.current
        );

        if (saved === currentData) return;

        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setNotifications(
            parsed.map((item) => ({
              ...item,
              read: item.read === true,
              name: item.name || "MiniSocial",
              message: item.message || "có hoạt động mới.",
              time: item.time || "Vừa xong",
            }))
          );
        }
      } catch (error) {
        console.error("Không thể đồng bộ thông báo:", error);
      }
    };

    const handleStorage = (event) => {
      if (
        event.key === STORAGE_KEY ||
        event.key === null
      ) {
        syncNotifications();
      }
    };

    window.addEventListener(UPDATE_EVENT, syncNotifications);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        UPDATE_EVENT,
        syncNotifications
      );

      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // ĐẾM THÔNG BÁO CHƯA ĐỌC
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  // LỌC THEO TAB
  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((item) => !item.read);
    }

    return notifications;
  }, [notifications, activeTab]);

  // ICON THEO LOẠI THÔNG BÁO
  const getIcon = (type) => {
    switch (type) {
      case "like":
        return "❤️";

      case "comment":
        return "💬";

      case "share":
        return "🔁";

      case "friend":
        return "👥";

      default:
        return "🔔";
    }
  };

  // ĐÁNH DẤU MỘT THÔNG BÁO ĐÃ ĐỌC
  const handleMarkRead = (id) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, read: true }
          : item
      )
    );
  };

  // ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;

    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        read: true,
      }))
    );
  };

  // XÓA MỘT THÔNG BÁO
  const handleDelete = (id) => {
    setNotifications((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  // XÓA TẤT CẢ THÔNG BÁO
  const handleDeleteAll = () => {
    if (notifications.length === 0) return;

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa tất cả thông báo?"
    );

    if (!confirmed) return;

    setNotifications([]);
  };

  return (
    <div className="notifications-page">
      {/* HEADER */}
      <header className="notifications-header">
        <div>
          <Link to="/feed" className="notifications-back">
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
            className={activeTab === "all" ? "active" : ""}
            onClick={() => setActiveTab("all")}
          >
            Tất cả ({notifications.length})
          </button>

          <button
            type="button"
            className={activeTab === "unread" ? "active" : ""}
            onClick={() => setActiveTab("unread")}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>

        {/* NỘI DUNG */}
        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="notifications-empty">
              <div>🔔</div>

              <h3>Không có thông báo</h3>

              <p>
                {activeTab === "unread"
                  ? "Bạn đã đọc tất cả thông báo."
                  : "Thông báo mới sẽ xuất hiện ở đây."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`notification-item ${
                  item.read ? "is-read" : "is-unread"
                }`}
              >
                {/* AVATAR */}
                <div className="notification-avatar">
                  <img
                    src={
                      item.avatar ||
                      "https://i.pravatar.cc/100"
                    }
                    alt={item.name || "Người dùng"}
                  />

                  <span className="notification-type-icon">
                    {getIcon(item.type)}
                  </span>
                </div>

                {/* NỘI DUNG */}
                <div
                  className="notification-content"
                  onClick={() => handleMarkRead(item.id)}
                  style={{ cursor: "pointer" }}
                >
                  <p>
                    <strong>
                      {item.name || "MiniSocial"}
                    </strong>{" "}
                    {item.message}
                  </p>

                  <span className="notification-time">
                    {item.time || "Vừa xong"}
                  </span>
                </div>

                {/* NÚT THAO TÁC */}
                <div className="notification-actions">
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.id)}
                      title="Đánh dấu đã đọc"
                    >
                      ✓
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    title="Xóa thông báo"
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
