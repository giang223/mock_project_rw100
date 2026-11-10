
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addNotification } from "../notification/notificationUtils";

const REQUESTS_KEY = "miniSocialFriendRequests";
const BLOCKED_KEY = "miniSocialBlockedUsers";

const users = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    username: "nguyenvanan",
    bio: "Yêu thích công nghệ và lập trình.",
    mutualFriends: 5,
    avatar: "A",
    color: "blue",
  },
  {
    id: 2,
    name: "Trần Thị Bình",
    username: "tranthibinh",
    bio: "Thích đọc sách, du lịch và khám phá.",
    mutualFriends: 3,
    avatar: "B",
    color: "pink",
  },
  {
    id: 3,
    name: "Lê Minh Hoàng",
    username: "leminhhoang",
    bio: "Sinh viên Công nghệ thông tin.",
    mutualFriends: 8,
    avatar: "H",
    color: "orange",
  },
  {
    id: 4,
    name: "Phạm Thu Hà",
    username: "phamthuha",
    bio: "Chia sẻ những điều tích cực mỗi ngày.",
    mutualFriends: 2,
    avatar: "H",
    color: "purple",
  },
  {
    id: 5,
    name: "Nguyễn Minh Anh",
    username: "nguyenminhanh",
    bio: "Kết nối và học hỏi cùng mọi người.",
    mutualFriends: 4,
    avatar: "M",
    color: "green",
  },
];

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

function SearchUsers() {
  const [keyword, setKeyword] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [requests, setRequests] = useState(() =>
    readStorage(REQUESTS_KEY)
  );

  const [blockedUsers, setBlockedUsers] = useState(() =>
    readStorage(BLOCKED_KEY)
  );

  // LƯU LỜI MỜI KẾT BẠN
  useEffect(() => {
    localStorage.setItem(
      REQUESTS_KEY,
      JSON.stringify(requests)
    );
  }, [requests]);

  // LƯU DANH SÁCH NGƯỜI DÙNG ĐÃ CHẶN
  useEffect(() => {
    localStorage.setItem(
      BLOCKED_KEY,
      JSON.stringify(blockedUsers)
    );
  }, [blockedUsers]);

  // ĐỒNG BỘ KHI DỮ LIỆU THAY ĐỔI Ở TAB KHÁC
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === REQUESTS_KEY) {
        setRequests(readStorage(REQUESTS_KEY));
      }

      if (event.key === BLOCKED_KEY) {
        setBlockedUsers(readStorage(BLOCKED_KEY));
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  // TÌM KIẾM NGƯỜI DÙNG
  const filteredUsers = useMemo(() => {
    const searchValue = keyword.trim().toLowerCase();

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchValue) ||
        user.username.toLowerCase().includes(searchValue)
    );
  }, [keyword]);

  // KIỂM TRA TRẠNG THÁI KẾT BẠN
  const getFriendStatus = (username) => {
    const request = requests.find(
      (item) => item.username === username
    );

    return request ? request.status : "none";
  };

  // KIỂM TRA NGƯỜI DÙNG ĐÃ BỊ CHẶN
  const isBlocked = (username) => {
    return blockedUsers.some(
      (user) => user.username === username
    );
  };

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

    alert(`Đã gửi lời mời kết bạn đến ${user.name}.`);
  };

  // CHẶN NGƯỜI DÙNG
  const handleBlockUser = (user) => {
    if (isBlocked(user.username)) {
      alert("Người dùng này đã bị chặn.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn chặn ${user.name}?`
    );

    if (!confirmed) return;

    const newBlockedUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      color: user.color,
      blockedAt: new Date().toLocaleDateString("vi-VN"),
    };

    setBlockedUsers((prev) => [...prev, newBlockedUser]);

    // XÓA LỜI MỜI KẾT BẠN VỚI NGƯỜI BỊ CHẶN
    setRequests((prev) =>
      prev.filter(
        (request) => request.username !== user.username
      )
    );

    if (selectedUser?.username === user.username) {
      setSelectedUser(null);
    }

    alert(`Đã chặn ${user.name}.`);
  };

  // BỎ CHẶN NGƯỜI DÙNG
  const handleUnblockUser = (user) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn bỏ chặn ${user.name}?`
    );

    if (!confirmed) return;

    setBlockedUsers((prev) =>
      prev.filter(
        (item) => item.username !== user.username
      )
    );

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

        <div className="search-users-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Nhập tên hoặc tên tài khoản..."
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setSelectedUser(null);
            }}
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
                const status = getFriendStatus(user.username);
                const blocked = isBlocked(user.username);

                return (
                  <div
                    className="search-user-card"
                    key={user.id}
                  >
                    <div
                      className={`search-user-avatar ${user.color}`}
                    >
                      {user.avatar}
                    </div>

                    <div className="search-user-info">
                      <strong>{user.name}</strong>
                      <span>@{user.username}</span>
                      <p>{user.bio}</p>
                      <small>
                        👥 {user.mutualFriends} bạn chung
                      </small>
                    </div>

                    <div className="search-user-actions">
                      <button
                        type="button"
                        className="search-view-button"
                        onClick={() => setSelectedUser(user)}
                      >
                        Xem hồ sơ
                      </button>

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
                            <span className="search-pending-button">
                              Đã gửi lời mời
                            </span>
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
                            <span className="search-friend-label">
                              ✓ Bạn bè
                            </span>
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

        {selectedUser && (
          <div className="search-profile-preview">
            <button
              type="button"
              className="search-preview-close"
              onClick={() => setSelectedUser(null)}
            >
              ✕
            </button>

            <div
              className={`search-preview-avatar ${selectedUser.color}`}
            >
              {selectedUser.avatar}
            </div>

            <h2>{selectedUser.name}</h2>
            <span>@{selectedUser.username}</span>
            <p>{selectedUser.bio}</p>

            <div className="search-preview-friends">
              👥 {selectedUser.mutualFriends} bạn chung
            </div>

            <small>
              Đây là hồ sơ người dùng mẫu trong phiên bản demo.
            </small>
          </div>
        )}
      </main>
    </div>
  );
}

export default SearchUsers;
