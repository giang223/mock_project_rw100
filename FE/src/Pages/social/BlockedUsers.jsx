
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../../api/http";
import { pageContent } from "../../api/apiResponse";
import { toUserView } from "../../api/adapters";
import { getBlockedUsers, unblockUser } from "../../api/users";

// CHUYỂN TIẾNG VIỆT THÀNH KHÔNG DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
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
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshBlockedUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const page = await getBlockedUsers({ page: 0, size: 100 });
      setBlockedUsers(pageContent(page).map((raw) => {
        const user = toUserView(raw);
        return { ...user, userId: user.id, name: user.fullName, color: "blue" };
      }));
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshBlockedUsers(); }, [refreshBlockedUsers]);

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
const handleUnblock = async (user) => {
  const displayName =
    user.name ||
    user.username ||
    "người dùng";

  const confirmed = window.confirm(
    `Bạn có chắc muốn bỏ chặn ${displayName}?`
  );

  if (!confirmed) return;

  try {
    await unblockUser(user.userId ?? user.id);
    await refreshBlockedUsers();
    alert(`Đã bỏ chặn ${displayName}.`);
  } catch (error) {
    alert(getApiErrorMessage(error));
  }
};

  // BỎ CHẶN TẤT CẢ
const handleUnblockAll = async () => {
  const currentUsers = blockedUsers;

  if (currentUsers.length === 0) return;

  const confirmed = window.confirm(
    `Bạn có chắc muốn bỏ chặn tất cả ${currentUsers.length} người dùng?`
  );

  if (!confirmed) return;

  try {
    for (const user of currentUsers) {
      await unblockUser(user.userId ?? user.id);
    }
    await refreshBlockedUsers();
    setSearchValue("");
    alert(
      "Đã bỏ chặn tất cả người dùng."
    );
  } catch (error) {
    await refreshBlockedUsers();
    alert(getApiErrorMessage(error));
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
        {isLoading ? (
          <p role="status">Đang tải danh sách đã chặn…</p>
        ) : loadError ? (
          <div className="blocked-users-empty" role="alert">
            <p>{loadError}</p>
            <button type="button" onClick={refreshBlockedUsers}>Thử tải lại</button>
          </div>
        ) : filteredUsers.length === 0 ? (
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
<div
  className={`blocked-user-avatar ${
    user.color || "blue"
  }`}
>
  {user.avatar ? (
    <img
      src={user.avatar}
      alt={`Ảnh đại diện ${user.name}`}
      className="synced-avatar-image"
    />
  ) : (
    String(user.name || "U")
      .trim()
      .split(/\s+/)
      .pop()
      ?.charAt(0)
      .toUpperCase() || "U"
  )}
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
