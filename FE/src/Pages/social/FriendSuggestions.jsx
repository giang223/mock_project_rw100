
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../../api/http";
import { pageContent } from "../../api/apiResponse";
import { toUserView } from "../../api/adapters";
import { getFriendSuggestions, getSentFriendRequests, sendFriendRequest, cancelFriendRequest } from "../../api/friends";

// CHUYỂN TIẾNG VIỆT THÀNH KHÔNG DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

function FriendSuggestions() {
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchValue, setSearchValue] =
    useState("");

  const refreshSuggestions = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const page = await getFriendSuggestions({ page: 0, size: 100 });
      setSuggestedUsers(pageContent(page).map((raw) => {
        const user = toUserView(raw);
        return { ...user, name: user.fullName, avatar: user.avatar, color: "blue", status: String(raw.friendshipStatus || "none").toLowerCase(), mutualFriends: Number(raw.mutualFriendCount || 0) };
      }));
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSuggestions();
  }, [refreshSuggestions]);

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
  const handleSendRequest = async (user) => {
    try {
      await sendFriendRequest(user.id);
      await refreshSuggestions();
      alert(
        `Đã gửi lời mời kết bạn đến ${user.name}!`
      );
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // HỦY LỜI MỜI KẾT BẠN
  const handleCancelRequest = async (user) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy lời mời kết bạn với ${user.name}?`
    );

    if (!confirmed) return;

    try {
      const page = await getSentFriendRequests({ page: 0, size: 100 });
      const request = pageContent(page).find((item) => String(item.user?.id) === String(user.id));
      if (!request) throw new Error("Lời mời không còn tồn tại.");
      await cancelFriendRequest(request.id);
      await refreshSuggestions();
      alert("Đã hủy lời mời kết bạn.");
    } catch (error) {
      alert(getApiErrorMessage(error));
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
          {loadError && <p role="alert" className="profile-field-error">{loadError}</p>}
          {isLoading && <p role="status">Đang tải gợi ý…</p>}
          <div className="friend-suggestions-title">
            <h2>Những người bạn có thể biết</h2>

            <span>
              {filteredSuggestions.length} người dùng
            </span>
          </div>

          {!isLoading && filteredSuggestions.length === 0 ? (
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
