
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

const NOTIFICATIONS_KEY = "miniSocialNotifications";
const NOTIFICATION_EVENT = "miniSocialNotificationsUpdated";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

// THÔNG TIN NGƯỜI DÙNG MẶC ĐỊNH
const defaultProfile = {
  fullName: "Nguyễn Văn A",
  avatar: "",
};

// ĐỌC THÔNG TIN CÁ NHÂN
function readProfile() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PROFILE_KEY) || "{}"
    );

    return {
      ...defaultProfile,
      ...saved,
    };
  } catch {
    return { ...defaultProfile };
  }
}

// ĐẾM THÔNG BÁO CHƯA ĐỌC
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
  const [searchText, setSearchText] = useState("");
  const [profile, setProfile] = useState(readProfile);

  const navigate = useNavigate();

  // TÌM KIẾM NGƯỜI DÙNG
  const handleSearch = (event) => {
    if (event.key === "Enter" && searchText.trim()) {
      navigate(
        `/search-users?q=${encodeURIComponent(
          searchText.trim()
        )}`
      );
    }
  };

  // ĐỒNG BỘ THÔNG BÁO
  useEffect(() => {
    const updateUnreadCount = () => {
      setUnreadCount(getUnreadCount());
    };

    updateUnreadCount();

    window.addEventListener(
      NOTIFICATION_EVENT,
      updateUnreadCount
    );

    window.addEventListener(
      "storage",
      updateUnreadCount
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_EVENT,
        updateUnreadCount
      );

      window.removeEventListener(
        "storage",
        updateUnreadCount
      );
    };
  }, []);

  // ĐỒNG BỘ THÔNG TIN CÁ NHÂN
  useEffect(() => {
    const refreshProfile = () => {
      setProfile(readProfile());
    };

    refreshProfile();

    window.addEventListener(
      PROFILE_EVENT,
      refreshProfile
    );

    window.addEventListener(
      "storage",
      refreshProfile
    );

    window.addEventListener(
      "focus",
      refreshProfile
    );

    return () => {
      window.removeEventListener(
        PROFILE_EVENT,
        refreshProfile
      );

      window.removeEventListener(
        "storage",
        refreshProfile
      );

      window.removeEventListener(
        "focus",
        refreshProfile
      );
    };
  }, []);

  // LẤY CHỮ CÁI ĐẠI DIỆN
  const avatarLetter =
    profile.fullName
      ?.trim()
      .split(/\s+/)
      .pop()
      ?.charAt(0)
      .toUpperCase() || "U";

  return (
    <header className="facebook-topbar">

      {/* BÊN TRÁI: LOGO MSN VÀ TÌM KIẾM */}
      <div className="topbar-left">
        <Link
          to="/feed"
          className="facebook-logo msn-logo"
        >
          <span className="msn-butterfly">🦋</span>
          <span>MSN</span>
        </Link>

        <input
          type="search"
          className="topbar-search"
          placeholder="Tìm kiếm trên MSN"
          value={searchText}
          onChange={(event) =>
            setSearchText(event.target.value)
          }
          onKeyDown={handleSearch}
          aria-label="Tìm kiếm trên MSN"
        />
      </div>

      {/* Ở GIỮA: ĐIỀU HƯỚNG */}
      <nav className="topbar-center">
        <NavLink
          to="/feed"
          end
          className={({ isActive }) =>
            `topbar-item${isActive ? " active" : ""}`
          }
          title="Trang chủ"
        >
          🏠
        </NavLink>

        <NavLink
          to="/search-users"
          className={({ isActive }) =>
            `topbar-item${isActive ? " active" : ""}`
          }
          title="Bạn bè"
        >
          👥
        </NavLink>

        <NavLink
          to="/saved-posts"
          className={({ isActive }) =>
            `topbar-item${isActive ? " active" : ""}`
          }
          title="Bài viết đã lưu"
        >
          📰
        </NavLink>
      </nav>

      {/* BÊN PHẢI: TIN NHẮN, THÔNG BÁO VÀ AVATAR */}
      <div className="topbar-right">
        <Link
          to="/messages"
          className="topbar-message"
          title="Tin nhắn"
          aria-label="Mở tin nhắn"
        >
          💬
        </Link>

        <Link
          to="/notifications"
          className="topbar-notification"
          title="Thông báo"
          aria-label="Mở thông báo"
        >
          🔔

          {unreadCount > 0 && (
            <span className="topbar-notification-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {/* ẢNH ĐẠI DIỆN NGƯỜI DÙNG */}
        <Link
          to="/profile"
          className="topbar-avatar"
          title={profile.fullName || "Trang cá nhân"}
          aria-label="Mở trang cá nhân"
        >
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="Ảnh đại diện"
            />
          ) : (
            avatarLetter
          )}
        </Link>
      </div>
    </header>
  );
}

export default Header;
