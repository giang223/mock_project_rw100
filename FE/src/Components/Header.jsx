
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const NOTIFICATIONS_KEY = "miniSocialNotifications";
const NOTIFICATION_EVENT = "miniSocialNotificationsUpdated";

function getUnreadCount() {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    const notifications = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(notifications)) return 0;

    return notifications.filter(
      (item) => item && !item.read
    ).length;
  } catch (error) {
    console.error("Không thể đọc thông báo:", error);
    return 0;
  }
}

function Header() {
  const [unreadCount, setUnreadCount] = useState(getUnreadCount);

  useEffect(() => {
    const updateUnreadCount = () => {
      setUnreadCount(getUnreadCount());
    };

    window.addEventListener(NOTIFICATION_EVENT, updateUnreadCount);
    window.addEventListener("storage", updateUnreadCount);

    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, updateUnreadCount);
      window.removeEventListener("storage", updateUnreadCount);
    };
  }, []);

  return (
    <header className="facebook-topbar">
      <div className="topbar-left">
        <Link to="/feed" className="facebook-logo msn-logo">
          <span className="msn-butterfly">🦋</span>
          <span>MSN</span>
        </Link>

        <input
          type="text"
          className="topbar-search"
          placeholder="Search people, posts, #tag..."
        />
      </div>

      <div className="topbar-right">
        <Link
          to="/notifications"
          className="topbar-notification"
          title="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span className="topbar-notification-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/messages"
          className="topbar-message"
          title="Messages"
        >
          💬
        </Link>

        <Link
          to="/profile"
          className="topbar-avatar"
          title="Profile"
        >
          A
        </Link>
      </div>
    </header>
  );
}

export default Header;
