
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addNotification } from "../notification/notificationUtils";

const STORAGE_KEY = "miniSocialFriendRequests";
const BLOCKED_KEY = "miniSocialBlockedUsers";

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

// ĐỌC DỮ LIỆU LOCAL STORAGE
function readStorage(key) {
  try {
    const data = localStorage.getItem(key);

    if (!data) return [];

    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Không thể đọc dữ liệu:", error);
    return [];
  }
}

function FriendSuggestions() {
  const [requests, setRequests] = useState(() =>
    readStorage(STORAGE_KEY)
  );

  const [blockedUsers, setBlockedUsers] = useState(() =>
    readStorage(BLOCKED_KEY)
  );

  const [searchValue, setSearchValue] = useState("");

  // LƯU LỜI MỜI KẾT BẠN
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(requests)
    );
  }, [requests]);

  // LƯU DANH SÁCH ĐÃ CHẶN
  useEffect(() => {
    localStorage.setItem(
      BLOCKED_KEY,
      JSON.stringify(blockedUsers)
    );
  }, [blockedUsers]);

  // ĐỒNG BỘ KHI LOCAL STORAGE THAY ĐỔI Ở TAB KHÁC
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY) {
        setRequests(readStorage(STORAGE_KEY));
      }

      if (event.key === BLOCKED_KEY) {
        setBlockedUsers(readStorage(BLOCKED_KEY));
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // KIỂM TRA TRẠNG THÁI KẾT BẠN
  const getFriendStatus = (username) => {
    const request = requests.find(
      (item) => item.username === username
    );

    return request?.status || "none";
  };

  // KIỂM TRA ĐÃ CHẶN
  const isBlocked = (username) => {
    return blockedUsers.some(
      (user) => user.username === username
    );
  };

  // LỌC VÀ SẮP XẾP GỢI Ý
  const filteredSuggestions = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return suggestedUsers
      .filter((user) => {
        const status = requests.find(
          (request) => request.username === user.username
        )?.status;

        const blocked = blockedUsers.some(
          (item) => item.username === user.username
        );

        const matchesKeyword =
          user.name.toLowerCase().includes(keyword) ||
          user.username.toLowerCase().includes(keyword);

        return (
          !blocked &&
          status !== "accepted" &&
          status !== "received" &&
          matchesKeyword
        );
      })
      .sort(
        (a, b) => b.mutualFriends - a.mutualFriends
      );
  }, [requests, blockedUsers, searchValue]);

  // GỬI LỜI MỜI KẾT BẠN
  const handleSendRequest = (user) => {
    if (isBlocked(user.username)) {
      alert("Bạn cần bỏ chặn người dùng này trước.");
      return;
    }

    const status = getFriendStatus(user.username);

    if (status === "sent") {
      alert("Bạn đã gửi lời mời cho người này rồi.");
      return;
    }

    if (status === "received") {
      alert(
        "Người này đã gửi lời mời cho bạn. Hãy kiểm tra mục Bạn bè."
      );
      return;
    }

    if (status === "accepted") {
      alert("Hai người đã là bạn bè.");
      return;
    }

    const newRequest = {
      id: Date.now(),
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      mutualFriends: user.mutualFriends,
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    setRequests((prev) => [...prev, newRequest]);

    addNotification({
      type: "friend",
      name: "Nguyễn Văn A",
      message: `đã gửi lời mời kết bạn cho ${user.name}.`,
    });

    alert(`Đã gửi lời mời kết bạn đến ${user.name}!`);
  };

  // HỦY LỜI MỜI ĐÃ GỬI
  const handleCancelRequest = (user) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy lời mời kết bạn với ${user.name}?`
    );

    if (!confirmed) return;

    setRequests((prev) =>
      prev.filter(
        (item) =>
          !(
            item.username === user.username &&
            item.status === "sent"
          )
      )
    );

    alert("Đã hủy lời mời kết bạn.");
  };

  return (
    <div className="friend-suggestions-page">
      {/* HEADER */}
      <header className="friend-suggestions-header">
        <Link to="/feed" className="friend-suggestions-logo">
          MiniSocial
        </Link>

        <Link to="/feed" className="friend-suggestions-back">
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

        {/* TÌM KIẾM */}
        <div className="friend-suggestions-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
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
                Hãy thử tìm kiếm với tên khác hoặc quay lại sau nhé.
              </p>

              <Link to="/search-users">
                Tìm kiếm người dùng
              </Link>
            </div>
          ) : (
            <div className="friend-suggestions-list">
              {filteredSuggestions.map((user, index) => {
                const status = getFriendStatus(user.username);

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
                    <div
                      className={`suggestion-avatar ${user.color}`}
                    >
                      {user.avatar}
                    </div>

                    {/* THÔNG TIN */}
                    <div className="suggestion-user-info">
                      <strong>{user.name}</strong>

                      <span>@{user.username}</span>

                      <p>{user.bio}</p>

                      <small>
                        👥 {user.mutualFriends} bạn chung
                      </small>
                    </div>

                    {/* NÚT KẾT BẠN */}
                    <div className="suggestion-actions">
                      {status === "sent" ? (
                        <button
                          type="button"
                          className="suggestion-pending-button"
                          onClick={() => handleCancelRequest(user)}
                        >
                          ✓ Đã gửi lời mời
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="suggestion-add-button"
                          onClick={() => handleSendRequest(user)}
                        >
                          + Kết bạn
                        </button>
                      )}
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

          Danh sách được sắp xếp theo số lượng bạn chung từ cao xuống thấp.
        </div>

        {/* LIÊN KẾT */}
        <div className="friend-suggestions-footer">
          <Link to="/friend-requests">
            Xem lời mời kết bạn
          </Link>

          <Link to="/search-users">
            Tìm kiếm người dùng
          </Link>

          <Link to="/blocked-users">
            Người dùng đã chặn
          </Link>
        </div>
      </main>
    </div>
  );
}

export default FriendSuggestions;
