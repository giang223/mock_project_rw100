
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom"; 
import {
  ACCOUNT_EVENT,
  getCurrentAccount,
  readAccountData,
  saveAccountData,
  getMockUsers,
  getAccountById,
  isUser,
} from "../../utils/mockAccounts";

import {
  FRIEND_EVENT,
  BLOCKED_KEY,
  BLOCKED_EVENT,
  getFriendProfile,
  getFriendStatus,
  getMutualFriends,
  getRelationship,
  sendFriendRequest,
  cancelFriendRequest,
  unfriendUser,
  removeRelationshipWith,
  isBlockedBetween,
} from "../../utils/friendUtils";

const PROFILE_EVENT = "miniSocialProfileUpdated";

// TÌM KIẾM KHÔNG PHÂN BIỆT DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

// ĐỌC DANH SÁCH CHẶN CỦA TÀI KHOẢN
function readBlockedUsers() {
  const account = getCurrentAccount();

  if (!isUser(account)) return [];

  const data = readAccountData(
    BLOCKED_KEY,
    [],
    account.id
  );

  return Array.isArray(data)
    ? data.filter(Boolean)
    : [];
}

// KIỂM TRA NGƯỜI DÙNG TRONG DANH SÁCH CHẶN
function isSameBlockedUser(item, user) {
  if (!item || !user) return false;

  if (item.userId != null) {
    return String(item.userId) === String(user.id);
  }

  return item.username === user.username;
}

// ĐỌC DANH SÁCH NGƯỜI DÙNG
function readUsers() {
  const account = getCurrentAccount();

  if (!isUser(account)) return [];

  const blockedUsers = readBlockedUsers();

  return getMockUsers()
    .filter(
      (user) =>
        String(user.id) !== String(account.id)
    )
    .map((user) => {
      const profile = getFriendProfile(user.id);

      if (!profile) return null;

      const blocked = blockedUsers.some(
        (item) => isSameBlockedUser(item, user)
      );

      // KHÔNG HIỂN THỊ NGƯỜI ĐÃ CHẶN MÌNH
      if (
        !blocked &&
        isBlockedBetween(account.id, user.id)
      ) {
        return null;
      }

      return {
        id: user.id,
        name: profile.fullName,
        username: profile.username,
        avatar: profile.avatar || "",
        bio: profile.bio || "",
        color: profile.color || "blue",

        status: getFriendStatus(user.id),

        blocked,

        mutualFriends: getMutualFriends(
          account.id,
          user.id
        ),
      };
    })
    .filter(Boolean);
}

function SearchUsers() {
  const [searchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(
    searchParams.get("q") || ""
  );

  const [users, setUsers] =
    useState(readUsers);

  // ĐỒNG BỘ TỪ KHÓA TÌM KIẾM TRÊN HEADER
  useEffect(() => {
    const query = searchParams.get("q") || "";

    setKeyword(query);
  }, [searchParams]);

  // ĐỒNG BỘ DỮ LIỆU GIỮA CÁC MÀN HÌNH
  useEffect(() => {
    const refreshData = () => {
      const nextUsers = readUsers();

      setUsers(nextUsers);
    };

    refreshData();

    const events = [
      FRIEND_EVENT,
      BLOCKED_EVENT,
      ACCOUNT_EVENT,
      PROFILE_EVENT,
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

  // TÌM KIẾM NGƯỜI DÙNG
  const filteredUsers = useMemo(() => {
    const searchValue = normalizeText(keyword);

    return users.filter((user) =>
      normalizeText(
        `${user.name} ${user.username} ${user.bio}`
      ).includes(searchValue)
    );
  }, [users, keyword]);

  // HIỂN THỊ AVATAR
  const renderAvatar = (user) => {
    if (user.avatar) {
      return (
        <img
          src={user.avatar}
          alt={`Ảnh đại diện ${user.name}`}
          className="synced-avatar-image"
        />
      );
    }

    return (
      String(user.name || "U")
        .trim()
        .split(/\s+/)
        .pop()
        ?.charAt(0)
        .toUpperCase() || "U"
    );
  };

  // KIỂM TRA QUYỀN TƯƠNG TÁC
const canInteractWithUser = (user) => {
  const account = getCurrentAccount();

  if (!isUser(account)) {
    alert("Bạn không có quyền thực hiện chức năng này!");
    return false;
  }

  const target = getAccountById(user?.id);

  if (!isUser(target)) {
    alert("Tài khoản người dùng không hợp lệ!");
    setUsers(readUsers());
    return false;
  }

  if (String(account.id) === String(target.id)) {
    return false;
  }

  return true;
};

  // GỬI LỜI MỜI KẾT BẠN
  const handleSendRequest = (user) => {
  if (!canInteractWithUser(user)) return;

  const status = getFriendStatus(user.id);

    if (status === "blocked") {
      alert("Không thể kết bạn với người dùng này!");
      return;
    }

    if (status !== "none") {
      alert(
        "Đã tồn tại lời mời hoặc quan hệ bạn bè!"
      );

      setUsers(readUsers());
      return;
    }

    if (sendFriendRequest(user.id)) {
      setUsers(readUsers());

      alert(
        `Đã gửi lời mời kết bạn đến ${user.name}.`
      );
    } else {
      alert("Không thể gửi lời mời kết bạn!");
    }
  };

  // HỦY LỜI MỜI KẾT BẠN
  const handleCancelRequest = (user) => {
    const account = getCurrentAccount();

    if (!canInteractWithUser(user)) return;

    const relationship = getRelationship(
      account.id,
      user.id
    );

    if (
      !relationship ||
      relationship.status !== "pending" ||
      String(relationship.senderId) !==
        String(account.id)
    ) {
      alert("Lời mời không còn tồn tại!");
      setUsers(readUsers());
      return;
    }

    const confirmed = window.confirm(
      `Bạn có muốn hủy lời mời kết bạn với ${user.name}?`
    );

    if (!confirmed) return;

    if (cancelFriendRequest(relationship.id)) {
      setUsers(readUsers());

      alert("Đã hủy lời mời kết bạn.");
    } else {
      alert("Không thể hủy lời mời!");
    }
  };

  // HỦY KẾT BẠN
  const handleUnfriend = (user) => {
    const account = getCurrentAccount();

    if (!canInteractWithUser(user)) return;

    const relationship = getRelationship(
      account.id,
      user.id
    );

    if (
      !relationship ||
      relationship.status !== "accepted"
    ) {
      alert("Hai người chưa phải là bạn bè!");
      setUsers(readUsers());
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy kết bạn với ${user.name}?`
    );

    if (!confirmed) return;

    if (unfriendUser(relationship.id)) {
      setUsers(readUsers());

      alert(
        `Đã hủy kết bạn với ${user.name}.`
      );
    } else {
      alert("Không thể hủy kết bạn!");
    }
  };

  // CHẶN NGƯỜI DÙNG
  const handleBlockUser = (user) => {
    const account = getCurrentAccount();

    if (!canInteractWithUser(user)) return;

    if (String(account.id) === String(user.id)) {
      return;
    }

    const currentBlocked = readBlockedUsers();

    const alreadyBlocked = currentBlocked.some(
      (item) => isSameBlockedUser(item, user)
    );

    if (alreadyBlocked) {
      alert("Người dùng này đã bị chặn!");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn chặn ${user.name}?\nQuan hệ bạn bè và lời mời kết bạn hiện tại sẽ bị xóa.`
    );

    if (!confirmed) return;

    const newBlockedUser = {
      id: user.id,
      userId: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar || "",
      bio: user.bio || "",
      color: user.color || "blue",
      blockedAt: new Date().toISOString(),
    };

    const nextBlockedUsers = [
      ...currentBlocked,
      newBlockedUser,
    ];

    const success = saveAccountData(
      BLOCKED_KEY,
      nextBlockedUsers,
      account.id
    );

    if (!success) {
      alert("Không thể lưu danh sách chặn!");
      return;
    }

    // XÓA QUAN HỆ BẠN BÈ HOẶC LỜI MỜI
    const removed = removeRelationshipWith(
      user.id
    );

    window.dispatchEvent(
      new Event(BLOCKED_EVENT)
    );

    setUsers(readUsers());

    if (!removed) {
      alert(
        "Đã chặn người dùng nhưng chưa xóa được quan hệ bạn bè!"
      );
      return;
    }

    alert(`Đã chặn ${user.name}.`);
  };

  // BỎ CHẶN NGƯỜI DÙNG
  const handleUnblockUser = (user) => {
    const account = getCurrentAccount();

    if (!canInteractWithUser(user)) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn bỏ chặn ${user.name}?`
    );

    if (!confirmed) return;

    // ĐẢM BẢO QUAN HỆ CŨ ĐÃ ĐƯỢC XÓA
    if (!removeRelationshipWith(user.id)) {
      alert("Không thể cập nhật quan hệ bạn bè!");
      return;
    }

    const nextBlockedUsers =
      readBlockedUsers().filter(
        (item) => !isSameBlockedUser(item, user)
      );

    const success = saveAccountData(
      BLOCKED_KEY,
      nextBlockedUsers,
      account.id
    );

    if (!success) {
      alert("Không thể bỏ chặn người dùng!");
      return;
    }

    window.dispatchEvent(
      new Event(BLOCKED_EVENT)
    );

    setUsers(readUsers());

    alert(`Đã bỏ chặn ${user.name}.`);
  };

  return (
    <div className="search-users-page">
      <header className="search-users-header">
        <Link to="/feed" className="search-users-logo">
          MiniSocial
        </Link>

        <Link to="/feed" className="search-users-back">
          ← Quay lại bảng tin
        </Link>
      </header>

      <main className="search-users-container">
        <div className="search-users-heading">
          <h1>Tìm kiếm người dùng</h1>

          <p>
            Tìm kiếm và kết nối với những người dùng khác trên MiniSocial.
          </p>
        </div>

{/* ĐIỀU HƯỚNG BẠN BÈ */}
<nav
  className="friends-top-navigation"
  aria-label="Điều hướng bạn bè"
>
  <Link to="/friend-requests">
    👥 Bạn bè
  </Link>

  <Link to="/friend-suggestions">
    ✨ Gợi ý kết bạn
  </Link>

  <Link
    to="/search-users"
    className="active"
    aria-current="page"
  >
    🔍 Tìm kiếm người dùng
  </Link>
</nav>

        <div className="search-users-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Nhập tên hoặc tên tài khoản..."
            value={keyword}
           onChange={(e) => setKeyword(e.target.value)}
          />

          {keyword && (
            <button
              type="button"
              className="search-clear-button"
              onClick={() => setKeyword("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="search-users-results">
          <div className="search-results-heading">
            <h2>
              {keyword.trim()
                ? "Kết quả tìm kiếm"
                : "Người dùng gợi ý"}
            </h2>

            <span>{filteredUsers.length} người dùng</span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="search-no-result">
              <div>🔎</div>
              <h3>Không tìm thấy người dùng</h3>
              <p>
                Hãy thử nhập tên khác hoặc kiểm tra lại từ khóa.
              </p>
            </div>
          ) : (
            <div className="search-user-list">
              {filteredUsers.map((user) => {
                const status = user.status;
                const blocked = user.blocked;

                return (
                  <div
                    className="search-user-card"
                    key={user.id}
                  >
                    <Link
  to={`/profile?userId=${user.id}`}
  className={`search-user-avatar ${user.color}`}
  aria-label={`Xem hồ sơ ${user.name}`}
>
  {renderAvatar(user)}
</Link>

                    <div className="search-user-info">
                     <strong>
  <Link to={`/profile?userId=${user.id}`}>
    {user.name}
  </Link>
</strong>
                      <span>@{user.username}</span>
                      <p>{user.bio}</p>
                      <small>
                        👥 {user.mutualFriends} bạn chung
                      </small>
                    </div>

                    <div className="search-user-actions">
                      <Link
  to={`/profile?userId=${user.id}`}
  className="search-view-button"
>
  Xem hồ sơ
</Link>

                      {blocked ? (
                        <button
                          type="button"
                          className="search-unblock-button"
                          onClick={() => handleUnblockUser(user)}
                        >
                          Bỏ chặn
                        </button>
                      ) : (
                        <>
                          {status === "none" && (
                            <button
                              type="button"
                              className="search-add-friend-button"
                              onClick={() =>
                                handleSendRequest(user)
                              }
                            >
                              + Kết bạn
                            </button>
                          )}

                         {status === "sent" && (
  <button
    type="button"
    className="search-cancel-request-button"
    onClick={() => handleCancelRequest(user)}
  >
    Hủy lời mời
  </button>
)}

                          {status === "received" && (
                            <Link
                              to="/friend-requests"
                              className="search-pending-button"
                            >
                              Chờ phản hồi
                            </Link>
                          )}

                          {status === "accepted" && (
  <>
    <span className="search-friend-label">
      ✓ Bạn bè
    </span>

    <button
      type="button"
      className="search-unfriend-button"
      onClick={() => handleUnfriend(user)}
    >
      Hủy kết bạn
    </button>
  </>
)}

                          <button
                            type="button"
                            className="search-block-button"
                            onClick={() => handleBlockUser(user)}
                          >
                            🚫 Chặn
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default SearchUsers;
