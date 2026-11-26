
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

// THÔNG TIN MẶC ĐỊNH
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

function Sidebar() {
  const [profile, setProfile] = useState(readProfile);

  // ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG
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

  const getMenuClass = ({ isActive }) =>
    `sidebar-menu${isActive ? " active" : ""}`;

  return (
    <aside className="facebook-sidebar">

      {/* THÔNG TIN NGƯỜI DÙNG */}
      <Link to="/profile" className="sidebar-user">
        <span className="sidebar-avatar">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="Ảnh đại diện"
            />
          ) : (
            profile.fullName
              ?.trim()
              .split(/\s+/)
              .pop()
              ?.charAt(0)
              .toUpperCase() || "U"
          )}
        </span>

        <strong>
          {profile.fullName || "Nguyễn Văn A"}
        </strong>
      </Link>

      {/* MENU CHÍNH */}
      <nav className="sidebar-navigation">
        <NavLink
          to="/feed"
          end
          className={getMenuClass}
        >
          <span className="sidebar-icon">🏠</span>
          <span>Trang chủ</span>
        </NavLink>

        <NavLink
          to="/search-users"
          className={getMenuClass}
        >
          <span className="sidebar-icon">🔍</span>
          <span>Tìm kiếm người dùng</span>
        </NavLink>

        <NavLink
          to="/friend-requests"
          className={getMenuClass}
        >
          <span className="sidebar-icon">👥</span>
          <span>Bạn bè</span>
        </NavLink>

        <NavLink
          to="/friend-suggestions"
          className={getMenuClass}
        >
          <span className="sidebar-icon">✨</span>
          <span>Gợi ý kết bạn</span>
        </NavLink>

        <NavLink
          to="/blocked-users"
          className={getMenuClass}
        >
          <span className="sidebar-icon">🚫</span>
          <span>Người dùng đã chặn</span>
        </NavLink>

        <div className="sidebar-menu">
          <span className="sidebar-icon">
            👨‍👩‍👧‍👦
          </span>
          <span>Nhóm</span>
        </div>

        <NavLink
          to="/saved-posts"
          className={getMenuClass}
        >
          <span className="sidebar-icon">🔖</span>
          <span>Bài viết đã lưu</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className={getMenuClass}
        >
          <span className="sidebar-icon">🔔</span>
          <span>Thông báo</span>
        </NavLink>

        <NavLink
          to="/profile"
          end
          className={getMenuClass}
        >
          <span className="sidebar-icon">👤</span>
          <span>Trang cá nhân</span>
        </NavLink>

        <NavLink
          to="/change-password"
          className={getMenuClass}
        >
          <span className="sidebar-icon">🔒</span>
          <span>Đổi mật khẩu</span>
        </NavLink>
      </nav>

      {/* LỐI TẮT */}
      <div className="sidebar-divider" />

      <p className="sidebar-heading">
        Lối tắt của bạn
      </p>

      <nav className="sidebar-navigation">
        <NavLink
          to="/messages"
          className={getMenuClass}
        >
          <span className="sidebar-icon">💬</span>
          <span>Tin nhắn</span>
        </NavLink>

        <NavLink
          to="/explore"
          className={getMenuClass}
        >
          <span className="sidebar-icon">🌐</span>
          <span>Khám phá</span>
        </NavLink>

        <NavLink
          to="/stories"
          className={getMenuClass}
        >
          <span className="sidebar-icon">📸</span>
          <span>Tin</span>
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
