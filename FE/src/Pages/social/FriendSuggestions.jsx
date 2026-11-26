
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addNotification } from "../notification/notificationUtils";

const STORAGE_KEY = "miniSocialFriendRequests";
const BLOCKED_KEY = "miniSocialBlockedUsers";

const REQUEST_EVENT = "miniSocialFriendRequestsUpdated";
const BLOCKED_EVENT = "miniSocialBlockedUsersUpdated";

const suggestedUsers = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    username: "nguyenvanan",
    avatar: "A",
    bio: "Yêu thích công nghệ và lập trình.",
    mutualFriends: 5,
    color: "blue",
  },
  {
    id: 2,
    name: "Trần Thị Bình",
    username: "tranthibinh",
    avatar: "B",
    bio: "Thích đọc sách và du lịch.",
    mutualFriends: 3,
    color: "pink",
  },
  {
    id: 3,
    name: "Lê Minh Hoàng",
    username: "leminhhoang",
    avatar: "H",
    bio: "Sinh viên Công nghệ thông tin.",
    mutualFriends: 8,
    color: "orange",
  },
  {
    id: 4,
    name: "Phạm Thu Hà",
    username: "phamthuha",
    avatar: "H",
    bio: "Chia sẻ những điều tích cực mỗi ngày.",
    mutualFriends: 2,
    color: "purple",
  },
  {
    id: 5,
    name: "Nguyễn Minh Anh",
    username: "nguyenminhanh",
    avatar: "M",
    bio: "Kết nối và học hỏi cùng mọi người.",
    mutualFriends: 4,
    color: "green",
  },
  {
    id: 6,
    name: "Đỗ Quang Minh",
    username: "doquangminh",
    avatar: "Q",
    bio: "Đam mê thể thao và công nghệ.",
    mutualFriends: 7,
    color: "orange",
  },
  {
    id: 7,
    name: "Vũ Thu Trang",
    username: "vuthutrang",
    avatar: "T",
    bio: "Thích khám phá và trải nghiệm.",
    mutualFriends: 1,
    color: "pink",
  },
];

// ĐỌC DỮ LIỆU LOCALSTORAGE
function readStorage(key) {
  try {
    const data = JSON.parse(
      localStorage.getItem(key) || "[]"
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
    console.error("Không thể đọc dữ liệu:", error);
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

  return (
    Boolean(first.name && second.name) &&
    normalizeText(first.name) ===
      normalizeText(second.name)
  );
}

function FriendSuggestions() {
  const [requests, setRequests] = useState(
    () => readStorage(STORAGE_KEY)
  );

  const [blockedUsers, setBlockedUsers] = useState(
    () => readStorage(BLOCKED_KEY)
  );

  const [searchValue, setSearchValue] = useState("");

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
      setRequests(readStorage(STORAGE_KEY));
      setBlockedUsers(readStorage(BLOCKED_KEY));
    };

    refreshData();

    window.addEventListener(
      REQUEST_EVENT,
      refreshData
    );

    window.addEventListener(
      BLOCKED_EVENT,
      refreshData
    );

    window.addEventListener("storage", refreshData);
    window.addEventListener("focus", refreshData);

    return () => {
      window.removeEventListener(
        REQUEST_EVENT,
        refreshData
      );

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

  // LƯU LỜI MỜI KẾT BẠN
  const saveRequests = (nextRequests) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextRequests)
      );

      setRequests(nextRequests);

      window.dispatchEvent(
        new Event(REQUEST_EVENT)
      );

      return true;
    } catch (error) {
      console.error("Không thể lưu lời mời:", error);

      alert("Không thể lưu dữ liệu. Vui lòng thử lại!");

      return false;
    }
  };

  // KIỂM TRA TRẠNG THÁI KẾT BẠN
  const getFriendStatus = (user) => {
    const request = requests.find(
      (item) => isSameUser(item, user)
    );

    return request?.status || "none";
  };

  // LỌC VÀ SẮP XẾP GỢI Ý
  const filteredSuggestions = useMemo(() => {
    const keyword = normalizeText(searchValue);

    return suggestedUsers
      .filter((user) => {
        const request = requests.find(
          (item) => isSameUser(item, user)
        );

        const status = request?.status || "none";

        const blocked = blockedUsers.some(
          (item) => isSameUser(item, user)
        );

        const matchesKeyword = normalizeText(
          `${user.name} ${user.username} ${user.bio}`
        ).includes(keyword);

        return (
          !blocked &&
          !["accepted", "received", "pending"].includes(
            status
          ) &&
          matchesKeyword
        );
      })
      .sort(
        (a, b) => b.mutualFriends - a.mutualFriends
      );
  }, [requests, blockedUsers, searchValue]);

  // GỬI LỜI MỜI KẾT BẠN
  const handleSendRequest = (user) => {
    const currentRequests = readStorage(STORAGE_KEY);
    const currentBlocked = readStorage(BLOCKED_KEY);

    const blocked = currentBlocked.some(
      (item) => isSameUser(item, user)
    );

    if (blocked) {
      alert("Bạn cần bỏ chặn người dùng này trước.");
      return;
    }

    const exists = currentRequests.some(
      (item) =>
        isSameUser(item, user) &&
        ["sent", "received", "pending", "accepted"].includes(
          item.status
        )
    );

    if (exists) {
      alert("Đã tồn tại lời mời hoặc quan hệ bạn bè.");
      return;
    }

    const newRequest = {
      id: Date.now(),
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      color: user.color,
      mutualFriends: user.mutualFriends,
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    const updated = [
      ...currentRequests.filter(
        (item) => !isSameUser(item, user)
      ),
      newRequest,
    ];

    if (saveRequests(updated)) {
      addNotification({
  type: "friend_request",
  name: user.name,
  username: user.username,
  avatar: user.avatar || "",
  isMine: false,
  message: `Bạn đã gửi lời mời kết bạn cho ${user.name}.`,
});
      alert(
        `Đã gửi lời mời kết bạn đến ${user.name}!`
      );
    }
  };

  // HỦY LỜI MỜI KẾT BẠN
  const handleCancelRequest = (user) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy lời mời kết bạn với ${user.name}?`
    );

    if (!confirmed) return;

    const updated = readStorage(STORAGE_KEY).filter(
      (item) =>
        !(
          isSameUser(item, user) &&
          item.status === "sent"
        )
    );

    if (saveRequests(updated)) {
      alert("Đã hủy lời mời kết bạn.");
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
                const status = getFriendStatus(user);

                const profileUrl =
                  `/profile?user=${encodeURIComponent(user.name)}`;

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
                      {user.avatar}
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
