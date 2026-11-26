
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom"; 
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
  
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const query = searchParams.get("q") || "";
    setKeyword(query);
  }, [searchParams]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [requests, setRequests] = useState(() =>
    readStorage(REQUESTS_KEY)
  );

  const [blockedUsers, setBlockedUsers] = useState(() =>
    readStorage(BLOCKED_KEY)
  );

  

// LƯU DỮ LIỆU KẾT BẠN
const saveRequests = (nextRequests) => {
  try {
    localStorage.setItem(
      REQUESTS_KEY,
      JSON.stringify(nextRequests)
    );

    setRequests(nextRequests);

    window.dispatchEvent(
      new Event("miniSocialFriendRequestsUpdated")
    );

    return true;
  } catch (error) {
    console.error(error);
    alert("Không thể cập nhật lời mời kết bạn!");
    return false;
  }
};

// LƯU DANH SÁCH CHẶN
const saveBlockedUsers = (nextBlockedUsers) => {
  try {
    localStorage.setItem(
      BLOCKED_KEY,
      JSON.stringify(nextBlockedUsers)
    );

    setBlockedUsers(nextBlockedUsers);

    window.dispatchEvent(
      new Event("miniSocialBlockedUsersUpdated")
    );

    return true;
  } catch (error) {
    console.error(error);
    alert("Không thể cập nhật danh sách chặn!");
    return false;
  }
};

// ĐỒNG BỘ DỮ LIỆU GIỮA CÁC MÀN HÌNH
useEffect(() => {
  const refreshData = () => {
    setRequests(readStorage(REQUESTS_KEY));
    setBlockedUsers(readStorage(BLOCKED_KEY));
  };

  window.addEventListener(
    "miniSocialFriendRequestsUpdated",
    refreshData
  );

  window.addEventListener(
    "miniSocialBlockedUsersUpdated",
    refreshData
  );

  window.addEventListener("storage", refreshData);
  window.addEventListener("focus", refreshData);

  return () => {
    window.removeEventListener(
      "miniSocialFriendRequestsUpdated",
      refreshData
    );

    window.removeEventListener(
      "miniSocialBlockedUsersUpdated",
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

 // CHUYỂN TIẾNG VIỆT THÀNH KHÔNG DẤU
const normalizeText = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
};

// TÌM KIẾM NGƯỜI DÙNG
const filteredUsers = useMemo(() => {
  const searchValue = normalizeText(keyword);

  return users.filter((user) =>
    normalizeText(
      `${user.name} ${user.username} ${user.bio}`
    ).includes(searchValue)
  );
}, [keyword]);

  
// SO SÁNH NGƯỜI DÙNG
const isSameUser = (item, user) => {
  if (!item || !user) return false;

  if (item.username && user.username) {
    return item.username === user.username;
  }

  return Boolean(item.name && user.name) &&
    normalizeText(item.name) ===
      normalizeText(user.name);
};

// KIỂM TRA TRẠNG THÁI KẾT BẠN
const getFriendStatus = (username) => {
  const user = users.find(
    (item) => item.username === username
  );

  const request = requests.find(
    (item) => isSameUser(item, user)
  );

  return request?.status || "none";
};

// KIỂM TRA NGƯỜI DÙNG ĐÃ BỊ CHẶN
const isBlocked = (username) => {
  const user = users.find(
    (item) => item.username === username
  );

  return blockedUsers.some(
    (item) => isSameUser(item, user)
  );
};

  // GỬI LỜI MỜI KẾT BẠN
const handleSendRequest = (user) => {
  const currentRequests = readStorage(REQUESTS_KEY);
  const currentBlocked = readStorage(BLOCKED_KEY);

  if (
    currentBlocked.some(
      (item) => isSameUser(item, user)
    )
  ) {
    alert("Bạn cần bỏ chặn người dùng này trước!");
    return;
  }

  const existingRequest = currentRequests.find(
    (item) => isSameUser(item, user)
  );

  if (existingRequest?.status === "sent") {
    alert("Bạn đã gửi lời mời cho người này rồi!");
    return;
  }

  if (existingRequest?.status === "received") {
    alert("Người này đã gửi lời mời cho bạn!");
    return;
  }

  if (existingRequest?.status === "accepted") {
    alert("Hai người đã là bạn bè!");
    return;
  }

  const newRequest = {
    id: Date.now(),
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    color: user.color,
    mutualFriends: user.mutualFriends,
    status: "sent",
    createdAt: new Date().toISOString(),
  };

  const nextRequests = [
    ...currentRequests.filter(
      (item) => !isSameUser(item, user)
    ),
    newRequest,
  ];

  if (!saveRequests(nextRequests)) return;

  addNotification({
    type: "friend",
    name: "Nguyễn Văn A",
    isMine: true,
    message: `đã gửi lời mời kết bạn cho ${user.name}.`,
  });

  alert(`Đã gửi lời mời kết bạn đến ${user.name}.`);
};

// HỦY LỜI MỜI KẾT BẠN
const handleCancelRequest = (user) => {
  const confirmed = window.confirm(
    `Bạn có muốn hủy lời mời kết bạn với ${user.name}?`
  );

  if (!confirmed) return;

  const nextRequests = readStorage(
    REQUESTS_KEY
  ).filter(
    (item) =>
      !(
        isSameUser(item, user) &&
        item.status === "sent"
      )
  );

  if (saveRequests(nextRequests)) {
    alert("Đã hủy lời mời kết bạn.");
  }
};

// HỦY KẾT BẠN
const handleUnfriend = (user) => {
  const confirmed = window.confirm(
    `Bạn có chắc chắn muốn hủy kết bạn với ${user.name}?`
  );

  if (!confirmed) return;

  const nextRequests = readStorage(
    REQUESTS_KEY
  ).filter(
    (item) =>
      !(
        isSameUser(item, user) &&
        item.status === "accepted"
      )
  );

  if (saveRequests(nextRequests)) {
    alert(`Đã hủy kết bạn với ${user.name}.`);
  }
};

// CHẶN NGƯỜI DÙNG
const handleBlockUser = (user) => {
  const currentBlocked = readStorage(BLOCKED_KEY);
  const currentRequests = readStorage(REQUESTS_KEY);

  if (
    currentBlocked.some(
      (item) => isSameUser(item, user)
    )
  ) {
    alert("Người dùng này đã bị chặn!");
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

  const nextBlockedUsers = [
    ...currentBlocked,
    newBlockedUser,
  ];

  const nextRequests = currentRequests.filter(
    (item) => !isSameUser(item, user)
  );

  try {
    // LƯU CẢ HAI DANH SÁCH TRƯỚC KHI PHÁT SỰ KIỆN
    localStorage.setItem(
      BLOCKED_KEY,
      JSON.stringify(nextBlockedUsers)
    );

    localStorage.setItem(
      REQUESTS_KEY,
      JSON.stringify(nextRequests)
    );

    setBlockedUsers(nextBlockedUsers);
    setRequests(nextRequests);

    window.dispatchEvent(
      new Event("miniSocialBlockedUsersUpdated")
    );

    window.dispatchEvent(
      new Event("miniSocialFriendRequestsUpdated")
    );

    setSelectedUser(null);

    alert(`Đã chặn ${user.name}.`);
  } catch (error) {
    console.error(error);

    setBlockedUsers(readStorage(BLOCKED_KEY));
    setRequests(readStorage(REQUESTS_KEY));

    alert(
      "Không thể hoàn tất thao tác chặn. Vui lòng kiểm tra lại!"
    );
  }
};

// BỎ CHẶN NGƯỜI DÙNG
const handleUnblockUser = (user) => {
  const confirmed = window.confirm(
    `Bạn có chắc chắn muốn bỏ chặn ${user.name}?`
  );

  if (!confirmed) return;

  const nextBlockedUsers = readStorage(
    BLOCKED_KEY
  ).filter(
    (item) => !isSameUser(item, user)
  );

  if (saveBlockedUsers(nextBlockedUsers)) {
    alert(`Đã bỏ chặn ${user.name}.`);
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
                      <strong><Link to={`/profile?user=${encodeURIComponent(user.name)}`}>{user.name}</Link></strong>
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
