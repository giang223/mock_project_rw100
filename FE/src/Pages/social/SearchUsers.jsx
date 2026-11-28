
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom"; 
import { getCurrentAccount } from "../../utils/mockAccounts";
import { getApiErrorMessage } from "../../api/http";
import { pageContent } from "../../api/apiResponse";
import { toUserView } from "../../api/adapters";
import { blockUser, getBlockedUsers, searchUsers, unblockUser } from "../../api/users";
import { cancelFriendRequest, getSentFriendRequests, sendFriendRequest, unfriend } from "../../api/friends";

// TÌM KIẾM KHÔNG PHÂN BIỆT DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

function SearchUsers() {
  const [searchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(
    searchParams.get("q") || ""
  );

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshUsers = useCallback(async (query = keyword) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [searchPage, blockedPage] = await Promise.all([
        searchUsers(query.trim(), { page: 0, size: 20 }),
        getBlockedUsers({ page: 0, size: 100 }),
      ]);
      const blockedIds = new Set(pageContent(blockedPage).map((item) => String(item.id)));
      setUsers(pageContent(searchPage)
        .map((raw) => {
          const user = toUserView(raw);
          return {
            ...user,
            name: user.fullName,
            color: "blue",
            status: String(raw.friendshipStatus || "none").toLowerCase(),
            blocked: blockedIds.has(String(user.id)),
            mutualFriends: Number(raw.mutualFriendCount || 0),
          };
        })
        .filter((user) => String(user.id) !== String(getCurrentAccount()?.id)));
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  // ĐỒNG BỘ TỪ KHÓA TÌM KIẾM TRÊN HEADER
  useEffect(() => {
    const query = searchParams.get("q") || "";

    setKeyword(query);
  }, [searchParams]);

  // Search is server-backed; debounce to avoid one request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => refreshUsers(keyword), 250);
    return () => window.clearTimeout(timer);
  }, [keyword, refreshUsers]);

  // TÌM KIẾM NGƯỜI DÙNG
  const filteredUsers = useMemo(() => {
    const searchValue = normalizeText(keyword);

    return users.filter((user) =>
      normalizeText(
        `${user.name} ${user.username} ${user.bio || ""}`
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

  if (account?.role !== "USER") {
    alert("Bạn không có quyền thực hiện chức năng này!");
    return false;
  }

  if (!user?.id || String(account.id) === String(user.id)) {
    return false;
  }

  return true;
};

  // GỬI LỜI MỜI KẾT BẠN
  const handleSendRequest = async (user) => {
    if (!canInteractWithUser(user)) return;
    try {
      await sendFriendRequest(user.id);
      await refreshUsers();
      alert(`Đã gửi lời mời kết bạn đến ${user.name}.`);
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // HỦY LỜI MỜI KẾT BẠN
  const handleCancelRequest = async (user) => {
    if (!canInteractWithUser(user)) return;
    const confirmed = window.confirm(
      `Bạn có muốn hủy lời mời kết bạn với ${user.name}?`
    );
    if (!confirmed) return;
    try {
      const page = await getSentFriendRequests({ page: 0, size: 100 });
      const request = pageContent(page).find((item) => String(item.user?.id) === String(user.id));
      if (!request) throw new Error("Lời mời không còn tồn tại.");
      await cancelFriendRequest(request.id);
      await refreshUsers();
      alert("Đã hủy lời mời kết bạn.");
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // HỦY KẾT BẠN
  const handleUnfriend = async (user) => {
    if (!canInteractWithUser(user)) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy kết bạn với ${user.name}?`
    );
    if (!confirmed) return;
    try {
      await unfriend(user.id);
      await refreshUsers();
      alert(
        `Đã hủy kết bạn với ${user.name}.`
      );
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // CHẶN NGƯỜI DÙNG
  const handleBlockUser = async (user) => {
    if (!canInteractWithUser(user)) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn chặn ${user.name}?\nQuan hệ bạn bè và lời mời kết bạn hiện tại sẽ bị xóa.`
    );
    if (!confirmed) return;
    try {
      await blockUser(user.id);
      await refreshUsers();
      alert(`Đã chặn ${user.name}.`);
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // BỎ CHẶN NGƯỜI DÙNG
  const handleUnblockUser = async (user) => {
    if (!canInteractWithUser(user)) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn bỏ chặn ${user.name}?`
    );

    if (!confirmed) return;

    try {
      await unblockUser(user.id);
      await refreshUsers();
      alert(`Đã bỏ chặn ${user.name}.`);
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
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

          {loadError && <p role="alert" className="profile-field-error">{loadError}</p>}
          {isLoading && <p role="status">Đang tải người dùng…</p>}

          {!isLoading && filteredUsers.length === 0 ? (
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
