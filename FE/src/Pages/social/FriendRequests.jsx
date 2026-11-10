
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addNotification } from "../notification/notificationUtils";

const STORAGE_KEY = "miniSocialFriendRequests";
const BLOCKED_KEY = "miniSocialBlockedUsers";

const initialRequests = [
  {
    id: 1,
    name: "Trần Thị Bình",
    username: "tranthibinh",
    avatar: "B",
    mutualFriends: 3,
    status: "received",
  },
  {
    id: 2,
    name: "Lê Minh Hoàng",
    username: "leminhhoang",
    avatar: "H",
    mutualFriends: 5,
    status: "received",
  },
  {
    id: 3,
    name: "Phạm Thu Hà",
    username: "phamthuha",
    avatar: "H",
    mutualFriends: 2,
    status: "sent",
  },
];

// ĐỌC DỮ LIỆU LOCAL STORAGE
function readStorage(key, fallback = []) {
  try {
    const data = localStorage.getItem(key);

    if (data === null) {
      return fallback;
    }

    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error("Không thể đọc dữ liệu:", error);
    return fallback;
  }
}

// LƯU DỮ LIỆU LOCAL STORAGE
function saveStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Không thể lưu dữ liệu:", error);
  }
}

function FriendRequests() {
  const [requests, setRequests] = useState(() =>
    readStorage(STORAGE_KEY, initialRequests)
  );

  const [blockedUsers, setBlockedUsers] = useState(() =>
    readStorage(BLOCKED_KEY)
  );

  const [activeTab, setActiveTab] = useState("received");
  const [searchValue, setSearchValue] = useState("");

  // LƯU LỜI MỜI KẾT BẠN
  useEffect(() => {
    saveStorage(STORAGE_KEY, requests);
  }, [requests]);

  // LƯU DANH SÁCH NGƯỜI DÙNG ĐÃ CHẶN
  useEffect(() => {
    saveStorage(BLOCKED_KEY, blockedUsers);
  }, [blockedUsers]);

  // ĐỒNG BỘ KHI LOCAL STORAGE THAY ĐỔI Ở TAB KHÁC
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setRequests(readStorage(STORAGE_KEY));
      }

      if (event.key === BLOCKED_KEY || event.key === null) {
        setBlockedUsers(readStorage(BLOCKED_KEY));
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // KIỂM TRA NGƯỜI DÙNG ĐÃ BỊ CHẶN
  const isBlocked = (username) => {
    return blockedUsers.some(
      (user) => user.username === username
    );
  };

  // KIỂM TRA TRẠNG THÁI KẾT BẠN
  const getFriendStatus = (username) => {
    const request = requests.find(
      (item) => item.username === username
    );

    return request?.status || "none";
  };

  // CHẤP NHẬN LỜI MỜI
  const handleAccept = (id) => {
    const request = requests.find(
      (item) => item.id === id && item.status === "received"
    );

    if (!request) return;

    if (isBlocked(request.username)) {
      alert("Bạn đang chặn người dùng này. Hãy bỏ chặn trước.");
      return;
    }

    setRequests((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "accepted",
              acceptedAt: new Date().toISOString(),
            }
          : item
      )
    );

    addNotification({
      type: "friend",
      name: "MiniSocial",
      message: `Bạn và ${request.name} hiện đã trở thành bạn bè.`,
    });

    alert(`Bạn và ${request.name} đã trở thành bạn bè!`);
  };

  // TỪ CHỐI LỜI MỜI
  const handleReject = (id) => {
    const request = requests.find(
      (item) => item.id === id && item.status === "received"
    );

    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn từ chối lời mời của ${request.name}?`
    );

    if (!confirmed) return;

    setRequests((prev) =>
      prev.filter((item) => item.id !== id)
    );

    alert(`Đã từ chối lời mời của ${request.name}.`);
  };

  // HỦY LỜI MỜI ĐÃ GỬI
  const handleCancel = (id) => {
    const request = requests.find(
      (item) => item.id === id && item.status === "sent"
    );

    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy lời mời gửi đến ${request.name}?`
    );

    if (!confirmed) return;

    setRequests((prev) =>
      prev.filter((item) => item.id !== id)
    );

    alert(`Đã hủy lời mời gửi đến ${request.name}.`);
  };

  // HỦY KẾT BẠN
  const handleUnfriend = (id) => {
    const request = requests.find(
      (item) => item.id === id && item.status === "accepted"
    );

    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy kết bạn với ${request.name}?`
    );

    if (!confirmed) return;

    setRequests((prev) =>
      prev.filter((item) => item.id !== id)
    );

    alert(`Đã hủy kết bạn với ${request.name}.`);
  };

  // LỌC LỜI MỜI ĐÃ NHẬN
  const receivedRequests = useMemo(
    () => requests.filter((item) => item.status === "received"),
    [requests]
  );

  // LỌC LỜI MỜI ĐÃ GỬI
  const sentRequests = useMemo(
    () => requests.filter((item) => item.status === "sent"),
    [requests]
  );

  // LỌC DANH SÁCH BẠN BÈ
  const acceptedRequests = useMemo(
    () => requests.filter((item) => item.status === "accepted"),
    [requests]
  );

  // LỌC THEO TAB VÀ TỪ KHÓA
  const displayedRequests = useMemo(() => {
    let list = [];

    if (activeTab === "received") {
      list = receivedRequests;
    } else if (activeTab === "sent") {
      list = sentRequests;
    } else {
      list = acceptedRequests;
    }

    const keyword = searchValue.trim().toLowerCase();

    if (!keyword) return list;

    return list.filter(
      (item) =>
        (item.name || "").toLowerCase().includes(keyword) ||
        (item.username || "").toLowerCase().includes(keyword)
    );
  }, [
    activeTab,
    receivedRequests,
    sentRequests,
    acceptedRequests,
    searchValue,
  ]);

  return (
    <div className="friend-requests-page">
      {/* HEADER */}
      <header className="friend-requests-header">
        <Link to="/feed" className="friend-requests-logo">
          MiniSocial
        </Link>

        <Link to="/feed" className="friend-requests-back">
          ← Quay lại bảng tin
        </Link>
      </header>

      <main className="friend-requests-container">
        {/* TIÊU ĐỀ */}
        <div className="friend-requests-heading">
          <h1>Bạn bè</h1>

          <p>
            Quản lý lời mời kết bạn và danh sách bạn bè của bạn.
          </p>
        </div>

        {/* CÁC TAB */}
        <div className="friend-requests-tabs">
          <button
            type="button"
            className={activeTab === "received" ? "active" : ""}
            onClick={() => {
              setActiveTab("received");
              setSearchValue("");
            }}
          >
            Lời mời đã nhận ({receivedRequests.length})
          </button>

          <button
            type="button"
            className={activeTab === "sent" ? "active" : ""}
            onClick={() => {
              setActiveTab("sent");
              setSearchValue("");
            }}
          >
            Lời mời đã gửi ({sentRequests.length})
          </button>

          <button
            type="button"
            className={activeTab === "accepted" ? "active" : ""}
            onClick={() => {
              setActiveTab("accepted");
              setSearchValue("");
            }}
          >
            Bạn bè ({acceptedRequests.length})
          </button>
        </div>

        <section className="friend-requests-content">
          {/* TIÊU ĐỀ DANH SÁCH */}
          <div className="friend-requests-title">
            <h2>
              {activeTab === "received"
                ? "Lời mời kết bạn"
                : activeTab === "sent"
                  ? "Lời mời đã gửi"
                  : "Danh sách bạn bè"}
            </h2>

            <span>{displayedRequests.length} người dùng</span>
          </div>

          {/* TÌM KIẾM */}
          <div className="friend-requests-search">
            <span>🔍</span>

            <input
              type="text"
              placeholder="Tìm theo tên hoặc username..."
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

          {/* DANH SÁCH */}
          {displayedRequests.length === 0 ? (
            <div className="friend-requests-empty">
              <div>👥</div>

              <h3>
                {searchValue
                  ? "Không tìm thấy người dùng"
                  : activeTab === "received"
                    ? "Bạn chưa có lời mời kết bạn nào"
                    : activeTab === "sent"
                      ? "Bạn chưa gửi lời mời kết bạn nào"
                      : "Bạn chưa có bạn bè nào"}
              </h3>

              <p>
                {searchValue
                  ? "Hãy thử tìm kiếm bằng tên hoặc username khác."
                  : "Hãy tìm kiếm người dùng để kết nối với mọi người."}
              </p>

              <Link to="/search-users">
                Tìm kiếm người dùng
              </Link>
            </div>
          ) : (
            <div className="friend-request-list">
              {displayedRequests.map((request) => (
                <div
                  className="friend-request-card"
                  key={request.id}
                >
                  {/* AVATAR */}
                  <div className="friend-request-avatar">
                    {request.avatar ||
                      request.name?.charAt(0) ||
                      "U"}
                  </div>

                  {/* THÔNG TIN */}
                  <div className="friend-request-info">
                    <strong>{request.name || "Người dùng"}</strong>

                    <span>@{request.username || "unknown"}</span>

                    <small>
                      👥 {request.mutualFriends || 0} bạn chung
                    </small>
                  </div>

                  {/* NÚT THAO TÁC */}
                  <div className="friend-request-actions">
                    {activeTab === "received" && (
                      <>
                        <button
                          type="button"
                          className="friend-accept-button"
                          onClick={() => handleAccept(request.id)}
                        >
                          Chấp nhận
                        </button>

                        <button
                          type="button"
                          className="friend-reject-button"
                          onClick={() => handleReject(request.id)}
                        >
                          Từ chối
                        </button>
                      </>
                    )}

                    {activeTab === "sent" && (
                      <button
                        type="button"
                        className="friend-cancel-button"
                        onClick={() => handleCancel(request.id)}
                      >
                        Hủy lời mời
                      </button>
                    )}

                    {activeTab === "accepted" && (
                      <>
                        <span className="friend-accepted-label">
                          ✓ Đã là bạn bè
                        </span>

                        <button
                          type="button"
                          className="friend-reject-button"
                          onClick={() => handleUnfriend(request.id)}
                        >
                          Hủy kết bạn
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LIÊN KẾT */}
        <div className="friend-requests-footer">
          <Link to="/friend-suggestions">
            Gợi ý kết bạn
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

export default FriendRequests;
