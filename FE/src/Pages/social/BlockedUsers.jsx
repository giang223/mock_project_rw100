
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "miniSocialBlockedUsers";

function readBlockedUsers() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (data === null) return [];

    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Không thể đọc danh sách đã chặn:", error);
    return [];
  }
}

function saveBlockedUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Không thể lưu danh sách đã chặn:", error);
  }
}

function BlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState(() =>
    readBlockedUsers()
  );

  const [searchValue, setSearchValue] = useState("");

  // LƯU DANH SÁCH NGƯỜI DÙNG ĐÃ CHẶN
  useEffect(() => {
    saveBlockedUsers(blockedUsers);
  }, [blockedUsers]);

  // ĐỒNG BỘ KHI LOCAL STORAGE THAY ĐỔI Ở TAB KHÁC
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (
        event.key === STORAGE_KEY ||
        event.key === null
      ) {
        setBlockedUsers(readBlockedUsers());
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // TÌM KIẾM NGƯỜI DÙNG
  const filteredUsers = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return blockedUsers.filter((user) => {
      const name = (user.name || "").toLowerCase();
      const username = (user.username || "").toLowerCase();

      return (
        name.includes(keyword) ||
        username.includes(keyword)
      );
    });
  }, [blockedUsers, searchValue]);

  // BỎ CHẶN MỘT NGƯỜI
  const handleUnblock = (user) => {
    const displayName =
      user.name || user.username || "người dùng";

    const confirmed = window.confirm(
      `Bạn có chắc muốn bỏ chặn ${displayName}?`
    );

    if (!confirmed) return;

    setBlockedUsers((prevUsers) =>
      prevUsers.filter((item) => {
        if (user.username) {
          return item.username !== user.username;
        }

        return item.id !== user.id;
      })
    );

    alert(`Đã bỏ chặn ${displayName}.`);
  };

  // BỎ CHẶN TẤT CẢ
  const handleUnblockAll = () => {
    if (blockedUsers.length === 0) return;

    const confirmed = window.confirm(
      "Bạn có chắc muốn bỏ chặn tất cả người dùng?"
    );

    if (!confirmed) return;

    setBlockedUsers([]);

    alert("Đã bỏ chặn tất cả người dùng.");
  };

  return (
    <div className="blocked-users-page">
      {/* HEADER */}
      <header className="blocked-users-header">
        <Link to="/feed" className="blocked-users-logo">
          MiniSocial
        </Link>

        <Link to="/feed" className="blocked-users-back">
          ← Quay lại bảng tin
        </Link>
      </header>

      <main className="blocked-users-container">
        {/* TIÊU ĐỀ */}
        <div className="blocked-users-heading">
          <div>
            <h1>Người dùng đã chặn</h1>

            <p>
              Quản lý những người bạn đã chặn trên MiniSocial.
            </p>
          </div>

          <div className="blocked-users-total">
            <strong>{blockedUsers.length}</strong>
            <span>người đã chặn</span>
          </div>
        </div>

        {/* THÔNG TIN */}
        <div className="blocked-users-info">
          <span>🔒</span>

          <p>
            Những người trong danh sách này sẽ không xuất hiện
            trong gợi ý kết bạn. Bạn có thể bỏ chặn bất cứ lúc nào.
          </p>
        </div>

        {/* TÌM KIẾM */}
        <div className="blocked-users-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Tìm người dùng đã chặn..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />

          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue("")}
            >
              ✕
            </button>
          )}
        </div>

        {/* TIÊU ĐỀ DANH SÁCH */}
        <div className="blocked-users-list-heading">
          <h2>Danh sách đã chặn</h2>

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
            <div className="blocked-empty-icon">🛡️</div>

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

            <Link to="/search-users">
              Tìm kiếm người dùng
            </Link>
          </div>
        ) : (
          <div className="blocked-users-list">
            {filteredUsers.map((user, index) => (
              <div
                className="blocked-user-card"
                key={user.username || user.id || index}
              >
                {/* AVATAR */}
                <div className="blocked-user-avatar">
                  {user.avatar ||
                    user.name?.charAt(0) ||
                    "U"}
                </div>

                {/* THÔNG TIN */}
                <div className="blocked-user-info">
                  <strong>{user.name || "Người dùng"}</strong>

                  <span>
                    @{user.username || "unknown"}
                  </span>

                  <small>Người dùng đã bị chặn</small>
                </div>

                {/* BỎ CHẶN */}
                <button
                  type="button"
                  className="blocked-unblock-button"
                  onClick={() => handleUnblock(user)}
                >
                  Bỏ chặn
                </button>
              </div>
            ))}
          </div>
        )}

        {/* LIÊN KẾT */}
        <div className="blocked-users-footer">
          <Link to="/friend-suggestions">
            Gợi ý kết bạn
          </Link>

          <Link to="/search-users">
            Tìm kiếm người dùng
          </Link>

          <Link to="/friend-requests">
            Lời mời kết bạn
          </Link>
        </div>
      </main>
    </div>
  );
}

export default BlockedUsers;
