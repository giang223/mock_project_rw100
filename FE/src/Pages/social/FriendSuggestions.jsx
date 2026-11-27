
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ACCOUNT_EVENT,
  getCurrentAccount,
  getMockUsers,
  getAccountById,
  isUser,
} from "../../utils/mockAccounts";

import {
  FRIEND_EVENT,
  BLOCKED_EVENT,
  getFriendProfile,
  getFriendStatus,
  getMutualFriends,
  getRelationship,
  sendFriendRequest,
  cancelFriendRequest,
} from "../../utils/friendUtils";

const PROFILE_EVENT = "miniSocialProfileUpdated";

// CHUYỂN TIẾNG VIỆT THÀNH KHÔNG DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

// LẤY DANH SÁCH GỢI Ý KẾT BẠN
function readSuggestions() {
  const account = getCurrentAccount();

  // CHỈ USER ĐƯỢC SỬ DỤNG CHỨC NĂNG KẾT BẠN
  if (!isUser(account)) return [];

  return getMockUsers()
    .filter(
      (user) =>
        String(user.id) !== String(account.id)
    )
    .map((user) => {
      const profile = getFriendProfile(user.id);

      if (!profile) return null;

      const status = getFriendStatus(user.id);

      return {
        id: user.id,
        name: profile.fullName,
        username: profile.username,
        avatar: profile.avatar || "",
        bio: profile.bio || "",
        color: profile.color || "blue",

        status,

        mutualFriends: getMutualFriends(
          account.id,
          user.id
        ),
      };
    })
    .filter(Boolean)
    .filter(
      (user) =>
        ["none", "sent"].includes(user.status)
    )
    .sort(
      (a, b) =>
        b.mutualFriends - a.mutualFriends
    );
}

function FriendSuggestions() {
  const [suggestedUsers, setSuggestedUsers] =
    useState(readSuggestions);

  const [searchValue, setSearchValue] =
    useState("");

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
      setSuggestedUsers(readSuggestions());
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

  // LỌC VÀ SẮP XẾP GỢI Ý
  const filteredSuggestions = useMemo(() => {
    const keyword = normalizeText(searchValue);

    return suggestedUsers
      .filter((user) =>
        normalizeText(
          `${user.name} ${user.username} ${user.bio}`
        ).includes(keyword)
      )
      .sort(
        (a, b) =>
          b.mutualFriends - a.mutualFriends
      );
  }, [suggestedUsers, searchValue]);

  // GỬI LỜI MỜI KẾT BẠN
  const handleSendRequest = (user) => {
    const account = getCurrentAccount();

    if (!isUser(account)) {
  alert("Bạn không có quyền thực hiện chức năng này!");
  return;
}

if (!isUser(getAccountById(user.id))) {
  alert("Tài khoản người dùng không hợp lệ!");
  setSuggestedUsers(readSuggestions());
  return;
}

    const status = getFriendStatus(user.id);

    if (status === "blocked") {
      alert("Không thể kết bạn với người dùng này!");
      return;
    }

    if (status !== "none") {
      alert(
        "Đã tồn tại lời mời hoặc quan hệ bạn bè!"
      );

      setSuggestedUsers(readSuggestions());
      return;
    }

    if (sendFriendRequest(user.id)) {
      setSuggestedUsers(readSuggestions());

      alert(
        `Đã gửi lời mời kết bạn đến ${user.name}!`
      );
    } else {
      alert("Không thể gửi lời mời kết bạn!");
    }
  };

  // HỦY LỜI MỜI KẾT BẠN
  const handleCancelRequest = (user) => {
    const account = getCurrentAccount();

    if (!isUser(account)) {
  alert("Bạn không có quyền thực hiện chức năng này!");
  return;
}

if (!isUser(getAccountById(user.id))) {
  alert("Tài khoản người dùng không hợp lệ!");
  setSuggestedUsers(readSuggestions());
  return;
}

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

      setSuggestedUsers(readSuggestions());
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy lời mời kết bạn với ${user.name}?`
    );

    if (!confirmed) return;

    if (cancelFriendRequest(relationship.id)) {
      setSuggestedUsers(readSuggestions());

      alert("Đã hủy lời mời kết bạn.");
    } else {
      alert("Không thể hủy lời mời kết bạn!");
    }
  };

  return (
    <div className="friend-suggestions-page">
      {/* HEADER */}
      <header className="friend-suggestions-header">
        <Link
          to="/feed"
          className="friend-suggestions-logo"
        >
          MiniSocial
        </Link>

        <Link
          to="/feed"
          className="friend-suggestions-back"
        >
          ← Quay lại bảng tin
        </Link>
      </header>

      <main className="friend-suggestions-container">
        {/* TIÊU ĐỀ */}
        <div className="friend-suggestions-heading">
          <h1>Gợi ý kết bạn</h1>

          <p>
            Khám phá những người bạn có thể quen biết.
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

  <Link
    to="/friend-suggestions"
    className="active"
    aria-current="page"
  >
    ✨ Gợi ý kết bạn
  </Link>

  <Link to="/search-users">
    🔍 Tìm kiếm người dùng
  </Link>
</nav>

        {/* TÌM KIẾM */}
        <div className="friend-suggestions-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchValue}
            onChange={(e) =>
              setSearchValue(e.target.value)
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

        {/* DANH SÁCH GỢI Ý */}
        <section className="friend-suggestions-content">
          <div className="friend-suggestions-title">
            <h2>Những người bạn có thể biết</h2>

            <span>
              {filteredSuggestions.length} người dùng
            </span>
          </div>

          {filteredSuggestions.length === 0 ? (
            <div className="friend-suggestions-empty">
              <div>👥</div>

              <h3>Không còn gợi ý phù hợp</h3>

              <p>
                Hãy thử tìm kiếm với tên khác hoặc
                quay lại sau nhé.
              </p>

              <Link to="/search-users">
                Tìm kiếm người dùng
              </Link>
            </div>
          ) : (
            <div className="friend-suggestions-list">
              {filteredSuggestions.map((user, index) => {
                const status = user.status;

                const profileUrl =
  `/profile?userId=${user.id}`;

                return (
                  <div
                    className="friend-suggestion-card"
                    key={user.id}
                  >
                    {/* THỨ HẠNG */}
                    <div className="suggestion-rank">
                      #{index + 1}
                    </div>

                    {/* AVATAR */}
                    <Link
                      to={profileUrl}
                      className={`suggestion-avatar ${user.color}`}
                      aria-label={`Xem hồ sơ ${user.name}`}
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
                    </Link>

                    {/* THÔNG TIN */}
                    <div className="suggestion-user-info">
                      <strong>
                        <Link to={profileUrl}>
                          {user.name}
                        </Link>
                      </strong>

                      <span>@{user.username}</span>

                      <p>{user.bio}</p>

                      <small>
                        👥 {user.mutualFriends} bạn chung
                      </small>
                    </div>

                    {/* THAO TÁC */}
                    <div className="suggestion-actions">
                      {status === "sent" ? (
                        <button
                          type="button"
                          className="suggestion-pending-button"
                          onClick={() =>
                            handleCancelRequest(user)
                          }
                        >
                          Hủy lời mời
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="suggestion-add-button"
                          onClick={() =>
                            handleSendRequest(user)
                          }
                        >
                          + Kết bạn
                        </button>
                      )}

                      <Link
                        className="suggestion-profile-button"
                        to={profileUrl}
                      >
                        Xem hồ sơ
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* GHI CHÚ */}
        <div className="friend-suggestions-note">
          <span>💡</span>

          Danh sách được sắp xếp theo số lượng
          bạn chung từ cao xuống thấp.
        </div>

      </main>
    </div>
  );
}

export default FriendSuggestions;
