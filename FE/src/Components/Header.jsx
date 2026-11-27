import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import {
  MOCK_ACCOUNTS,
  ACCOUNT_EVENT,
  getCurrentAccount,
  switchMockAccount,
  logoutMockAccount,
  readAccountData,
  isAdmin,
  isUser,
} from "../utils/mockAccounts";

import {
  getUnreadCount,
  UPDATE_EVENT as NOTIFICATION_EVENT,
} from "../Pages/notification/notificationUtils";
const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

// LẤY TÀI KHOẢN HIỆN TẠI
function readCurrentAccount() {
  return getCurrentAccount() || MOCK_ACCOUNTS[0];
}

// ĐỌC THÔNG TIN CÁ NHÂN
function readProfile(account = readCurrentAccount()) {

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

// LẤY MÀU AVATAR THEO TÀI KHOẢN
function getAvatarStyle(user) {
  const colors = {
    blue: "#1877f2",
    green: "#16a34a",
    orange: "#ea9233",
    purple: "#9063cd",
    pink: "#d94e88",
  };

  return {
    background: colors[user?.color] || "#1877f2",
    color: "#ffffff",
  };
}

// LẤY CHỮ CÁI ĐẠI DIỆN
function getAvatarLetter(name) {
  return (
    String(name || "U")
      .trim()
      .split(/\s+/)
      .pop()
      ?.charAt(0)
      .toUpperCase() || "U"
  );
}

function Header() {
  const navigate = useNavigate();

  const [currentAccount, setCurrentAccount] =
    useState(readCurrentAccount);

  const [unreadCount, setUnreadCount] =
    useState(getUnreadCount);

  const [searchText, setSearchText] = useState("");

  const [profile, setProfile] = useState(readProfile);

  const [showAccountMenu, setShowAccountMenu] =
    useState(false);

  const accountMenuRef = useRef(null);

  // TÌM KIẾM NGƯỜI DÙNG
  const handleSearch = (event) => {
    if (event.key === "Enter" && searchText.trim()) {
      navigate(
        `/search-users?q=${encodeURIComponent(
          searchText.trim()
        )}`
      );

      setShowAccountMenu(false);
    }
  };

  // ĐỒNG BỘ TÀI KHOẢN VÀ HỒ SƠ
  useEffect(() => {
    const refreshData = () => {
      setCurrentAccount(readCurrentAccount());
      setProfile(readProfile());
      setUnreadCount(getUnreadCount());
    };

    refreshData();

    const events = [
      ACCOUNT_EVENT,
      PROFILE_EVENT,
      NOTIFICATION_EVENT,
      "storage",
      "focus",
    ];

    events.forEach((event) => {
      window.addEventListener(event, refreshData);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, refreshData);
      });
    };
  }, []);

  // ĐÓNG MENU KHI CLICK BÊN NGOÀI
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setShowAccountMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  // CHUYỂN ĐỔI TÀI KHOẢN
const handleSwitchAccount = (account) => {
  if (!account) return;

  if (!isUser(account) && !isAdmin(account)) {
    alert("Vai trò tài khoản không hợp lệ!");
    return;
  }

  if (account.id === currentAccount.id) {
    setShowAccountMenu(false);
    return;
  }

  const success = switchMockAccount(account.id);

  if (!success) {
    alert("Không thể chuyển đổi tài khoản!");
    return;
  }

  setShowAccountMenu(false);
  setSearchText("");

  // ĐIỀU HƯỚNG THEO VAI TRÒ
  const targetPath = isAdmin(account)
    ? "/admin/reports"
    : "/feed";

  // TẢI LẠI STATE CỦA TÀI KHOẢN MỚI
  window.location.replace(targetPath);
};
  // ĐĂNG XUẤT
  const handleLogout = () => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn đăng xuất không?"
    );

    if (!confirmed) return;

    try {
      logoutMockAccount();

      setShowAccountMenu(false);

      navigate("/login", {
        replace: true,
      });
    } catch {
      alert("Không thể đăng xuất. Vui lòng thử lại!");
    }
  };

  // HIỂN THỊ AVATAR
  const renderAvatar = (user) => {
    if (user.avatar) {
      return (
        <img
          src={user.avatar}
          alt={user.fullName || "Ảnh đại diện"}
        />
      );
    }

    return getAvatarLetter(user.fullName);
  };

  // CHỈ HIỂN THỊ HEADER CHO USER
if (!isUser(currentAccount)) {
  return null;
}

  return (
    <header className="facebook-topbar">

      {/* BÊN TRÁI: LOGO VÀ TÌM KIẾM */}
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

      {/* BÊN PHẢI */}
      <div className="topbar-right">

        {/* TIN NHẮN */}
        <Link
          to="/messages"
          className="topbar-message"
          title="Tin nhắn"
          aria-label="Mở tin nhắn"
        >
          💬
        </Link>

        {/* THÔNG BÁO */}
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

        {/* MENU TÀI KHOẢN */}
        <div
          className="topbar-account-wrapper"
          ref={accountMenuRef}
        >

          {/* AVATAR */}
          <button
            type="button"
            className="topbar-avatar topbar-account-trigger"
            style={getAvatarStyle(profile)}
            title={profile.fullName}
            aria-label="Mở menu tài khoản"
            aria-expanded={showAccountMenu}
            aria-controls="topbar-account-menu"
            onClick={() =>
              setShowAccountMenu((previous) => !previous)
            }
          >
            {renderAvatar(profile)}
          </button>

          {/* DROPDOWN TÀI KHOẢN */}
          {showAccountMenu && (
            <div
              className="topbar-account-menu"
              id="topbar-account-menu"
            >

              {/* TÀI KHOẢN HIỆN TẠI */}
              <Link
                to="/profile"
                className="account-menu-current"
                onClick={() => setShowAccountMenu(false)}
              >
                <div
  className="account-menu-avatar large"
  style={getAvatarStyle(profile)}
>
  {renderAvatar(profile)}
</div>

                <div className="account-menu-user-info">
                  <strong>{profile.fullName}</strong>
                  <small>{currentAccount.email}</small>
                  <span className="account-role-label">
  {isAdmin(currentAccount)
    ? "Quản trị viên · ADMIN"
    : "Người dùng · USER"}
</span>
                </div>
              </Link>

              <div className="account-menu-divider" />

              {/* TRANG CÁ NHÂN */}
              <Link
                to="/profile"
                className="account-menu-item"
                onClick={() => setShowAccountMenu(false)}
              >
                <span className="account-menu-icon">
                  👤
                </span>
                <span>Trang cá nhân</span>
              </Link>

              {/* CHỈNH SỬA THÔNG TIN */}
              <Link
                to="/profile/edit"
                className="account-menu-item"
                onClick={() => setShowAccountMenu(false)}
              >
                <span className="account-menu-icon">
                  ✏️
                </span>
                <span>Chỉnh sửa thông tin</span>
              </Link>

              {/* ĐỔI MẬT KHẨU */}
              <Link
                to="/change-password"
                className="account-menu-item"
                onClick={() => setShowAccountMenu(false)}
              >
                <span className="account-menu-icon">
                  🔒
                </span>
                <span>Đổi mật khẩu</span>
              </Link>

              {/* NGƯỜI DÙNG ĐÃ CHẶN */}
              <Link
                to="/blocked-users"
                className="account-menu-item"
                onClick={() => setShowAccountMenu(false)}
              >
                <span className="account-menu-icon">
                  🚫
                </span>
                <span>Người dùng đã chặn</span>
              </Link>

              <div className="account-menu-divider" />

              {/* CHUYỂN ĐỔI TÀI KHOẢN */}
              <h4 className="account-menu-title">
                Chuyển đổi tài khoản
              </h4>

              <div className="account-switch-list">
                {MOCK_ACCOUNTS.map((account) => {
                  const isCurrent =
                    account.id === currentAccount.id;

                  const accountProfile = readProfile(account);

                  return (
                    <button
                      type="button"
                      key={account.id}
                      className={
                        `account-switch-item${
                          isCurrent ? " active" : ""
                        }`
                      }
                      aria-pressed={isCurrent}
                      onClick={() =>
                        handleSwitchAccount(account)
                      }
                    >
                      <div
  className="account-menu-avatar"
  style={getAvatarStyle(accountProfile)}
>
  {renderAvatar(accountProfile)}
</div>

                      <div className="account-switch-info">
  <strong>
    {accountProfile.fullName}

    {isAdmin(account) && (
      <span className="account-admin-badge">
        ADMIN
      </span>
    )}
  </strong>

  <small>
    {isCurrent
      ? "Đang sử dụng"
      : account.email}
  </small>
</div>

                      {isCurrent && (
                        <span className="account-current-check">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="account-menu-divider" />

              {/* ĐĂNG XUẤT */}
              <button
                type="button"
                className="account-menu-item account-logout"
                onClick={handleLogout}
              >
                <span className="account-menu-icon">
                  🚪
                </span>

                <span>Đăng xuất</span>
              </button>

              <p className="account-menu-note">
                MiniSocial · Chế độ kiểm thử Frontend
              </p>

            </div>
          )}

        </div>
      </div>
    </header>
  );
}

export default Header;