
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "miniSocialBlockedUsers";
const BLOCKED_EVENT = "miniSocialBlockedUsersUpdated";

// ĐỌC DANH SÁCH NGƯỜI DÙNG ĐÃ CHẶN
function readBlockedUsers() {
  try {
    const data = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(data)
      ? data.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item)
        )
      : [];
  } catch (error) {
    console.error(
      "Không thể đọc danh sách đã chặn:",
      error
    );

    return [];
  }
}
// CHUYỂN TIẾNG VIỆT THÀNH KHÔNG DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

// SO SÁNH NGƯỜI DÙNG
function isSameUser(first, second) {
  if (!first || !second) return false;

  if (first.username && second.username) {
    return first.username === second.username;
  }

  if (first.name && second.name) {
    return (
      normalizeText(first.name) ===
      normalizeText(second.name)
    );
  }

  return (
    first.id != null &&
    second.id != null &&
    first.id === second.id
  );
}

// ĐỊNH DẠNG NGÀY CHẶN
function formatBlockedDate(value) {
  if (!value) return "";

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("vi-VN");
}

function BlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState(
    readBlockedUsers
  );

  const [searchValue, setSearchValue] = useState("");

  // ĐỒNG BỘ DỮ LIỆU GIỮA CÁC MÀN HÌNH
  useEffect(() => {
    const refreshData = () => {
      setBlockedUsers(readBlockedUsers());
    };

    refreshData();

    window.addEventListener(
      BLOCKED_EVENT,
      refreshData
    );

    window.addEventListener(
      "storage",
      refreshData
    );

    window.addEventListener(
      "focus",
      refreshData
    );

    return () => {
      window.removeEventListener(
        BLOCKED_EVENT,
        refreshData
      );

      window.removeEventListener(
        "storage",
        refreshData
      );

      window.removeEventListener(
        "focus",
        refreshData
      );
    };
  }, []);

  // LƯU DANH SÁCH ĐÃ CHẶN
  const saveBlockedUsers = (nextUsers) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextUsers)
      );

      setBlockedUsers(nextUsers);

      window.dispatchEvent(
        new Event(BLOCKED_EVENT)
      );

      return true;
    } catch (error) {
      console.error(
        "Không thể lưu danh sách đã chặn:",
        error
      );

      alert(
        "Không thể lưu dữ liệu. Vui lòng thử lại!"
      );

      return false;
    }
  };

  // TÌM KIẾM NGƯỜI DÙNG
  const filteredUsers = useMemo(() => {
    const keyword = normalizeText(searchValue);

    return blockedUsers.filter((user) => {
      const searchableText = normalizeText(
        `${user.name || ""} ${user.username || ""}`
      );

      return searchableText.includes(keyword);
    });
  }, [blockedUsers, searchValue]);

  // BỎ CHẶN MỘT NGƯỜI
  const handleUnblock = (user) => {
    const displayName =
      user.name ||
      user.username ||
      "người dùng";

    const confirmed = window.confirm(
      `Bạn có chắc muốn bỏ chặn ${displayName}?`
    );

    if (!confirmed) return;

    const currentUsers = readBlockedUsers();

    const updatedUsers = currentUsers.filter(
      (item) => !isSameUser(item, user)
    );

    if (saveBlockedUsers(updatedUsers)) {
      alert(`Đã bỏ chặn ${displayName}.`);
    }
  };

  // BỎ CHẶN TẤT CẢ
  const handleUnblockAll = () => {
    const currentUsers = readBlockedUsers();

    if (currentUsers.length === 0) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn bỏ chặn tất cả ${currentUsers.length} người dùng?`
    );

    if (!confirmed) return;

    if (saveBlockedUsers([])) {
      setSearchValue("");

      alert(
        "Đã bỏ chặn tất cả người dùng."
      );
    }
  };

  return (
    <div className="blocked-users-page">
      {/* HEADER */}
      <header className="blocked-users-header">
        <Link
          to="/feed"
          className="blocked-users-logo"
        >
          MiniSocial
        </Link>

        <Link
          to="/feed"
          className="blocked-users-back"
        >
          ← Quay lại bảng tin
        </Link><Link
  to="/profile"
  className="blocked-users-back"
>
  ← Quay lại trang cá nhân
</Link>
      </header>

      <main className="blocked-users-container">
        {/* TIÊU ĐỀ */}
        <div className="blocked-users-heading">
          <div>
            <h1>Người dùng đã chặn</h1>

            <p>
              Quản lý những người bạn đã chặn
              trên MiniSocial.
            </p>
          </div>

          <div className="blocked-users-total">
            <strong>{blockedUsers.length}</strong>

            <span>người đã chặn</span>
          </div>
        </div>

{/* ĐIỀU HƯỚNG CÀI ĐẶT TÀI KHOẢN */}
<nav
  className="friends-top-navigation"
  aria-label="Điều hướng cài đặt tài khoản"
>
  <Link to="/profile">
    👤 Trang cá nhân
  </Link>

  <Link to="/profile/edit">
    ✏️ Chỉnh sửa thông tin
  </Link>

  <Link to="/change-password">
    🔒 Đổi mật khẩu
  </Link>

  <Link
    to="/blocked-users"
    className="active"
    aria-current="page"
  >
    🚫 Đã chặn
  </Link>
</nav>

        {/* THÔNG TIN */}
        <div className="blocked-users-info">
          <span>🔒</span>

          <div>
            <strong>Quản lý quyền riêng tư</strong>

            <p>
              Những người trong danh sách này
              sẽ không xuất hiện trong gợi ý
              kết bạn.
            </p>

            <p>
              Bạn có thể bỏ chặn bất cứ lúc nào.
              Việc bỏ chặn không tự động khôi phục
              quan hệ bạn bè đã xóa.
            </p>
          </div>
        </div>

        {/* TÌM KIẾM */}
        <div className="blocked-users-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Tìm người dùng đã chặn..."
            value={searchValue}
            onChange={(event) =>
              setSearchValue(event.target.value)
            }
          />

          {searchValue && (
            <button
              type="button"
              aria-label="Xóa từ khóa"
              onClick={() => setSearchValue("")}
            >
              ✕
            </button>
          )}
        </div>

        {/* TIÊU ĐỀ DANH SÁCH */}
        <div className="blocked-users-list-heading">
          <div>
            <h2>Danh sách đã chặn</h2>

            <small className="blocked-result-count">
              {filteredUsers.length} người dùng
            </small>
          </div>

          {blockedUsers.length > 0 && (
            <button
              type="button"
              className="blocked-unblock-all-button"
              onClick={handleUnblockAll}
            >
              Bỏ chặn tất cả
            </button>
          )}
        </div>

        {/* DANH SÁCH NGƯỜI DÙNG */}
        {filteredUsers.length === 0 ? (
          <div className="blocked-users-empty">
            <div className="blocked-empty-icon">
              🛡️
            </div>

            <h3>
              {blockedUsers.length === 0
                ? "Bạn chưa chặn người dùng nào"
                : "Không tìm thấy người dùng"}
            </h3>

            <p>
              {blockedUsers.length === 0
                ? "Danh sách những người bạn chặn sẽ hiển thị tại đây."
                : "Hãy thử tìm kiếm bằng tên hoặc username khác."}
            </p>

            {searchValue.trim() ? (
              <button
                type="button"
                className="blocked-clear-search"
                onClick={() => setSearchValue("")}
              >
                Xóa tìm kiếm
              </button>
            ) : (
              <Link to="/search-users">
                Tìm kiếm người dùng
              </Link>
            )}
          </div>
        ) : (
          <div className="blocked-users-list">
            {filteredUsers.map((user, index) => (
              <div
                className="blocked-user-card"
                key={
                  user.username ||
                  user.id ||
                  index
                }
              >
                {/* AVATAR */}
                <div className="blocked-user-avatar">
                  {user.avatar ||
                    user.name?.charAt(0) ||
                    "U"}
                </div>

                {/* THÔNG TIN */}
                <div className="blocked-user-info">
                  <strong>
                    {user.name || "Người dùng"}
                  </strong>

                  <span>
                    @{user.username || "unknown"}
                  </span>

                  <small className="blocked-status-label">
                    🚫 Người dùng đã bị chặn
                  </small>

                  {formatBlockedDate(
                    user.blockedAt
                  ) && (
                    <small className="blocked-user-date">
                      Ngày chặn:{" "}
                      {formatBlockedDate(
                        user.blockedAt
                      )}
                    </small>
                  )}
                </div>

                {/* BỎ CHẶN */}
                <button
                  type="button"
                  className="blocked-unblock-button"
                  onClick={() =>
                    handleUnblock(user)
                  }
                >
                  Bỏ chặn
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default BlockedUsers;
