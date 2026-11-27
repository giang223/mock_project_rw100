
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ACCOUNT_EVENT,
  getCurrentAccount,
  getAccountById,
  readAccountData,
  saveAccountData,
  isUser,
} from "../../utils/mockAccounts";

import {
  BLOCKED_KEY,
  BLOCKED_EVENT,
  FRIEND_EVENT,
  getFriendProfile,
  removeRelationshipWith,
} from "../../utils/friendUtils";

const PROFILE_EVENT = "miniSocialProfileUpdated";

// ĐỌC DỮ LIỆU CHẶN GỐC
function readRawBlockedUsers() {
  const account = getCurrentAccount();

  if (!isUser(account)) return [];

  const data = readAccountData(
    BLOCKED_KEY,
    [],
    account.id
  );

  return Array.isArray(data) ? data : [];
}

// ĐỌC DANH SÁCH NGƯỜI DÙNG ĐÃ CHẶN
function readBlockedUsers() {
  const account = getCurrentAccount();

  if (!isUser(account)) return [];

  return readRawBlockedUsers()
    .filter((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        return false;
      }

      const userId = item.userId ?? item.id;
      const target = getAccountById(userId);

      return (
        isUser(target) &&
        String(target.id) !== String(account.id)
      );
    })
    .map((item) => {
      const userId = item.userId ?? item.id;

      const profile = getFriendProfile(userId);

      return {
        ...item,
        userId,
        name: profile?.fullName || item.name,
        username: profile?.username || item.username,
        avatar: profile?.avatar ?? item.avatar ?? "",
        color: profile?.color || item.color || "blue",
        bio: profile?.bio ?? item.bio ?? "",
      };
    });
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

  const firstId = first.userId ?? first.id;
  const secondId = second.userId ?? second.id;

  if (firstId != null && secondId != null) {
    return String(firstId) === String(secondId);
  }

  return Boolean(
    first.username &&
    second.username &&
    first.username === second.username
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

  const events = [
    ACCOUNT_EVENT,
    PROFILE_EVENT,
    FRIEND_EVENT,
    BLOCKED_EVENT,
    "storage",
    "focus",
  ];

  events.forEach((event) => {
    window.addEventListener(
      event,
      refreshData
    );
  });

  return () => {
    events.forEach((event) => {
      window.removeEventListener(
        event,
        refreshData
      );
    });
  };
}, []);

  // LƯU DANH SÁCH ĐÃ CHẶN
const saveBlockedUsers = (nextUsers) => {
  const account = getCurrentAccount();

  if (!isUser(account)) {
    alert("Bạn không có quyền thực hiện thao tác này!");
    return false;
  }

  if (!Array.isArray(nextUsers)) {
    return false;
  }

  const success = saveAccountData(
    BLOCKED_KEY,
    nextUsers,
    account.id
  );

  if (!success) {
    alert(
      "Không thể lưu dữ liệu. Vui lòng thử lại!"
    );

    return false;
  }

  setBlockedUsers(readBlockedUsers());

  window.dispatchEvent(
    new Event(BLOCKED_EVENT)
  );

  return true;
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
  const account = getCurrentAccount();

  if (!isUser(account)) {
    alert("Bạn không có quyền bỏ chặn!");
    return;
  }

  const target = getAccountById(
    user.userId ?? user.id
  );

  if (
    !isUser(target) ||
    String(target.id) === String(account.id)
  ) {
    alert("Tài khoản không hợp lệ!");
    return;
  }

  const displayName =
    user.name ||
    user.username ||
    "người dùng";

  const confirmed = window.confirm(
    `Bạn có chắc muốn bỏ chặn ${displayName}?`
  );

  if (!confirmed) return;

  const currentUsers = readBlockedUsers();

  const blockedUser = currentUsers.find(
    (item) => isSameUser(item, user)
  );

  if (!blockedUser) {
    setBlockedUsers(currentUsers);
    alert("Người dùng này đã được bỏ chặn!");
    return;
  }

  // KHÔNG KHÔI PHỤC QUAN HỆ BẠN BÈ CŨ
  if (!removeRelationshipWith(target.id)) {
    alert("Không thể cập nhật quan hệ bạn bè!");
    return;
  }

  // GIỮ NGUYÊN CÁC DỮ LIỆU CHẶN KHÁC
  const updatedUsers = readRawBlockedUsers().filter(
    (item) => !isSameUser(item, blockedUser)
  );

  if (saveBlockedUsers(updatedUsers)) {
    alert(`Đã bỏ chặn ${displayName}.`);
  }
};

  // BỎ CHẶN TẤT CẢ
const handleUnblockAll = () => {
  const account = getCurrentAccount();

  if (!isUser(account)) {
    alert("Bạn không có quyền bỏ chặn!");
    return;
  }

  const currentUsers = readBlockedUsers();

  if (currentUsers.length === 0) return;

  const confirmed = window.confirm(
    `Bạn có chắc muốn bỏ chặn tất cả ${currentUsers.length} người dùng?`
  );

  if (!confirmed) return;

  // XÓA CÁC QUAN HỆ CŨ CÒN SÓT LẠI
  for (const user of currentUsers) {
    const userId = user.userId ?? user.id;

    const target = getAccountById(userId);

    if (!isUser(target)) {
      continue;
    }

    if (!removeRelationshipWith(userId)) {
      alert(
        "Không thể hoàn tất thao tác bỏ chặn!"
      );

      return;
    }
  }

  // CHỈ XÓA NHỮNG USER ĐANG HIỂN THỊ
  const updatedUsers = readRawBlockedUsers().filter(
    (item) =>
      !currentUsers.some(
        (user) => isSameUser(item, user)
      )
  );

  if (saveBlockedUsers(updatedUsers)) {
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
