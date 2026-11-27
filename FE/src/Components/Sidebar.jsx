import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import {
  MOCK_ACCOUNTS,
  ACCOUNT_EVENT,
  getCurrentAccount,
  readAccountData,
  isUser,
} from "../utils/mockAccounts";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";
// ĐỌC THÔNG TIN TÀI KHOẢN HIỆN TẠI
function readProfile() {
  const account =
    getCurrentAccount() || MOCK_ACCOUNTS[0];

  const defaultProfile = {
    ...account,
    avatar: account.avatar || "",
  };

  try {
    // GIỮ LẠI HỒ SƠ CŨ CỦA TÀI KHOẢN A
    const legacyProfile =
      account.id === 1
        ? JSON.parse(
            localStorage.getItem(PROFILE_KEY) || "{}"
          )
        : {};

    const savedProfile = readAccountData(
      PROFILE_KEY,
      legacyProfile,
      account.id
    );

    return {
      ...defaultProfile,
      ...savedProfile,
      id: account.id,
      username: account.username,
      email: account.email,
    };
  } catch {
    return defaultProfile;
  }
}

function Sidebar() {
  const [profile, setProfile] = useState(readProfile);

  const location = useLocation();

  // CÁC TRANG THUỘC MENU BẠN BÈ
  const friendPaths = [
    "/search-users",
    "/friend-requests",
    "/friend-suggestions",
  ];

  // CÁC TRANG THUỘC MENU CÁ NHÂN
  const profilePaths = [
    "/profile",
    "/profile/edit",
    "/change-password",
    "/blocked-users",
  ];

  const isFriendPage = friendPaths.includes(
    location.pathname
  );

  const isProfilePage = profilePaths.includes(
    location.pathname
  );

  // TRẠNG THÁI ĐÓNG/MỞ MENU
  const [isFriendsOpen, setIsFriendsOpen] =
    useState(isFriendPage);

  const [isProfileOpen, setIsProfileOpen] =
    useState(isProfilePage);

  // TỰ ĐỘNG MỞ MENU TƯƠNG ỨNG
  useEffect(() => {
    if (isFriendPage) {
      setIsFriendsOpen(true);
      setIsProfileOpen(false);
    }

    if (isProfilePage) {
      setIsProfileOpen(true);
      setIsFriendsOpen(false);
    }
  }, [
    isFriendPage,
    isProfilePage,
    location.pathname,
  ]);

  // ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG
useEffect(() => {
  const refreshProfile = () => {
    setProfile(readProfile());
  };

  refreshProfile();

  const events = [
    ACCOUNT_EVENT,
    PROFILE_EVENT,
    "storage",
    "focus",
  ];

  events.forEach((event) => {
    window.addEventListener(
      event,
      refreshProfile
    );
  });

  return () => {
    events.forEach((event) => {
      window.removeEventListener(
        event,
        refreshProfile
      );
    });
  };
}, []);

  const getMenuClass = ({ isActive }) =>
    `sidebar-menu${isActive ? " active" : ""}`;

  // ĐÓNG/MỞ MENU BẠN BÈ
  const toggleFriends = () => {
    setIsFriendsOpen(!isFriendsOpen);
    setIsProfileOpen(false);
  };

  // ĐÓNG/MỞ MENU CÁ NHÂN
  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsFriendsOpen(false);
  };
  // CHỈ HIỂN THỊ SIDEBAR CHO USER
if (!isUser()) {
  return null;
}

  return (
    <aside className="facebook-sidebar">

      {/* THÔNG TIN NGƯỜI DÙNG */}
      <Link to="/profile" className="sidebar-user">
        <span
  className={`sidebar-avatar ${
    profile.color || "blue"
  }`}
>
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
  {profile.fullName || "Người dùng"}
</strong>
      </Link>

      {/* MENU CHÍNH */}
      <nav className="sidebar-navigation">

        {/* TRANG CHỦ */}
        <NavLink
          to="/feed"
          end
          className={getMenuClass}
        >
          <span className="sidebar-icon">🏠</span>
          <span>Trang chủ</span>
        </NavLink>

        {/* MENU BẠN BÈ */}
        <div className="sidebar-friends-group">

          <button
            type="button"
            className={`sidebar-menu sidebar-friends-toggle ${
              isFriendPage ? "active" : ""
            }`}
            onClick={toggleFriends}
            aria-expanded={isFriendsOpen}
            aria-controls="sidebar-friends-submenu"
          >
            <span className="sidebar-icon">👥</span>

            <span>Bạn bè</span>

            <span
              className={`sidebar-friends-arrow ${
                isFriendsOpen ? "expanded" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {isFriendsOpen && (
            <div
              id="sidebar-friends-submenu"
              className="sidebar-friends-submenu"
            >

              <NavLink
                to="/search-users"
                className={getMenuClass}
              >
                <span className="sidebar-icon">
                  🔍
                </span>
                <span>Tìm kiếm người dùng</span>
              </NavLink>

              <NavLink
                to="/friend-requests"
                className={getMenuClass}
              >
                <span className="sidebar-icon">
                  👥
                </span>
                <span>Lời mời và bạn bè</span>
              </NavLink>

              <NavLink
                to="/friend-suggestions"
                className={getMenuClass}
              >
                <span className="sidebar-icon">
                  ✨
                </span>
                <span>Gợi ý kết bạn</span>
              </NavLink>

            </div>
          )}
        </div>

        {/* BÀI VIẾT ĐÃ LƯU */}
        <NavLink
          to="/saved-posts"
          className={getMenuClass}
        >
          <span className="sidebar-icon">🔖</span>
          <span>Bài viết đã lưu</span>
        </NavLink>

        {/* THÔNG BÁO */}
        <NavLink
          to="/notifications"
          className={getMenuClass}
        >
          <span className="sidebar-icon">🔔</span>
          <span>Thông báo</span>
        </NavLink>

        {/* MENU TRANG CÁ NHÂN */}
        <div className="sidebar-friends-group">

          <button
            type="button"
            className={`sidebar-menu sidebar-friends-toggle ${
              isProfilePage ? "active" : ""
            }`}
            onClick={toggleProfile}
            aria-expanded={isProfileOpen}
            aria-controls="sidebar-profile-submenu"
          >
            <span className="sidebar-icon">👤</span>

            <span>Trang cá nhân</span>

            <span
              className={`sidebar-friends-arrow ${
                isProfileOpen ? "expanded" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {isProfileOpen && (
            <div
              id="sidebar-profile-submenu"
              className="sidebar-friends-submenu"
            >

              <NavLink
                to="/profile"
                end
                className={getMenuClass}
              >
                <span className="sidebar-icon">
                  👤
                </span>
                <span>Xem trang cá nhân</span>
              </NavLink>

              <NavLink
                to="/profile/edit"
                className={getMenuClass}
              >
                <span className="sidebar-icon">
                  ✏️
                </span>
                <span>Chỉnh sửa thông tin</span>
              </NavLink>

              <NavLink
                to="/change-password"
                className={getMenuClass}
              >
                <span className="sidebar-icon">
                  🔒
                </span>
                <span>Đổi mật khẩu</span>
              </NavLink>

              <NavLink
                to="/blocked-users"
                className={getMenuClass}
              >
                <span className="sidebar-icon">
                  🚫
                </span>
                <span>Người dùng đã chặn</span>
              </NavLink>

            </div>
          )}
        </div>
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