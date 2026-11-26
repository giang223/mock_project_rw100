
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addNotification } from "../notification/notificationUtils";

const STORAGE_KEY = "miniSocialFriendRequests";
const BLOCKED_KEY = "miniSocialBlockedUsers";

const REQUEST_EVENT = "miniSocialFriendRequestsUpdated";
const BLOCKED_EVENT = "miniSocialBlockedUsersUpdated";

// DỮ LIỆU LỜI MỜI MẪU
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

// ĐỌC DỮ LIỆU LOCALSTORAGE
function readStorage(key, fallback = []) {
  try {
    const data = localStorage.getItem(key);

    if (data === null) return fallback;

    const parsed = JSON.parse(data);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item)
        )
      : fallback;
  } catch (error) {
    console.error("Không thể đọc dữ liệu:", error);
    return fallback;
  }
}
// ĐỌC DANH SÁCH LỜI MỜI
function readRequests() {
  return readStorage(STORAGE_KEY, initialRequests);
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
    return (
      normalizeText(first.username) ===
      normalizeText(second.username)
    );
  }

  return (
    Boolean(first.name && second.name) &&
    normalizeText(first.name) ===
      normalizeText(second.name)
  );
}

// KIỂM TRA NGƯỜI DÙNG ĐÃ CHẶN
function isBlockedUser(user, blockedUsers) {
  return blockedUsers.some(
    (item) => isSameUser(item, user)
  );
}

function FriendRequests() {
  const [requests, setRequests] = useState(
    readRequests
  );

  const [blockedUsers, setBlockedUsers] = useState(
    () => readStorage(BLOCKED_KEY)
  );

  const [activeTab, setActiveTab] =
    useState("received");

  const [searchValue, setSearchValue] =
    useState("");

  // ĐỒNG BỘ DỮ LIỆU GIỮA CÁC MÀN HÌNH
  useEffect(() => {
    const refreshData = () => {
      setRequests(readRequests());
      setBlockedUsers(readStorage(BLOCKED_KEY));
    };

    // CHỈ TẠO DỮ LIỆU MẪU KHI CHƯA CÓ DỮ LIỆU
    try {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(initialRequests)
        );

        window.dispatchEvent(
          new Event(REQUEST_EVENT)
        );
      }
    } catch (error) {
      console.error("Không thể khởi tạo dữ liệu:", error);
    }

    refreshData();

    window.addEventListener(
      REQUEST_EVENT,
      refreshData
    );

    window.addEventListener(
      BLOCKED_EVENT,
      refreshData
    );

    window.addEventListener(
      "storage",
      refreshData
    );

    window.addEventListener(
      "focus",
      refreshData
    );

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

  // LƯU VÀ ĐỒNG BỘ LỜI MỜI
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
      console.error("Không thể lưu dữ liệu:", error);

      alert(
        "Không thể lưu dữ liệu. Vui lòng thử lại!"
      );

      return false;
    }
  };

  // CHẤP NHẬN LỜI MỜI
  const handleAccept = (id) => {
    const currentRequests = readRequests();

    const request = currentRequests.find(
      (item) =>
        item.id === id &&
        item.status === "received"
    );

    if (!request) return;

    const currentBlocked = readStorage(BLOCKED_KEY);

    if (isBlockedUser(request, currentBlocked)) {
      alert(
        "Bạn đang chặn người dùng này. Hãy bỏ chặn trước."
      );

      return;
    }

    const updated = currentRequests
      .filter(
        (item) =>
          item.id === id ||
          !isSameUser(item, request)
      )
      .map((item) =>
        item.id === id
          ? {
              ...item,
              status: "accepted",
              acceptedAt: new Date().toISOString(),
            }
          : item
      );

    if (saveRequests(updated)) {
      addNotification({
        type: "friend",
        name: "MiniSocial",
        message:
          `Bạn và ${request.name} hiện đã trở thành bạn bè.`,
      });

      alert(
        `Bạn và ${request.name} đã trở thành bạn bè!`
      );
    }
  };

  // TỪ CHỐI LỜI MỜI
  const handleReject = (id) => {
    const currentRequests = readRequests();

    const request = currentRequests.find(
      (item) =>
        item.id === id &&
        item.status === "received"
    );

    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn từ chối lời mời của ${request.name}?`
    );

    if (!confirmed) return;

    const updated = currentRequests.filter(
      (item) =>
        !(
          isSameUser(item, request) &&
          item.status === "received"
        )
    );

    if (saveRequests(updated)) {
      alert(
        `Đã từ chối lời mời của ${request.name}.`
      );
    }
  };

  // HỦY LỜI MỜI ĐÃ GỬI
  const handleCancel = (id) => {
    const currentRequests = readRequests();

    const request = currentRequests.find(
      (item) =>
        item.id === id &&
        item.status === "sent"
    );

    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy lời mời gửi đến ${request.name}?`
    );

    if (!confirmed) return;

    const updated = currentRequests.filter(
      (item) =>
        !(
          isSameUser(item, request) &&
          item.status === "sent"
        )
    );

    if (saveRequests(updated)) {
      alert(
        `Đã hủy lời mời gửi đến ${request.name}.`
      );
    }
  };

  // HỦY KẾT BẠN
  const handleUnfriend = (id) => {
    const currentRequests = readRequests();

    const request = currentRequests.find(
      (item) =>
        item.id === id &&
        item.status === "accepted"
    );

    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy kết bạn với ${request.name}?`
    );

    if (!confirmed) return;

    const updated = currentRequests.filter(
      (item) => !isSameUser(item, request)
    );

    if (saveRequests(updated)) {
      alert(
        `Đã hủy kết bạn với ${request.name}.`
      );
    }
  };

  // LOẠI BỎ NGƯỜI DÙNG ĐÃ CHẶN
  const visibleRequests = useMemo(() => {
    return requests.filter(
      (item) =>
        !isBlockedUser(item, blockedUsers)
    );
  }, [requests, blockedUsers]);

  // LỜI MỜI ĐÃ NHẬN
  const receivedRequests = useMemo(() => {
    return visibleRequests.filter(
      (item) => item.status === "received"
    );
  }, [visibleRequests]);

  // LỜI MỜI ĐÃ GỬI
  const sentRequests = useMemo(() => {
    return visibleRequests.filter(
      (item) => item.status === "sent"
    );
  }, [visibleRequests]);

  // DANH SÁCH BẠN BÈ
  const acceptedRequests = useMemo(() => {
    return visibleRequests.filter(
      (item) => item.status === "accepted"
    );
  }, [visibleRequests]);

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

    const keyword = normalizeText(searchValue);

    return list.filter((item) =>
      normalizeText(
        `${item.name || ""} ${item.username || ""}`
      ).includes(keyword)
    );
  }, [
    activeTab,
    receivedRequests,
    sentRequests,
    acceptedRequests,
    searchValue,
  ]);

  // CHUYỂN TAB
  const handleChangeTab = (tab) => {
    setActiveTab(tab);
    setSearchValue("");
  };

  // ĐỊNH DẠNG NGÀY
  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="friend-requests-page">
      {/* HEADER */}
      <header className="friend-requests-header">
        <Link
          to="/feed"
          className="friend-requests-logo"
        >
          MiniSocial
        </Link>

        <Link
          to="/feed"
          className="friend-requests-back"
        >
          ← Quay lại bảng tin
        </Link>
      </header>

      <main className="friend-requests-container">
        {/* TIÊU ĐỀ */}
        <div className="friend-requests-heading">
          <h1>Bạn bè</h1>

          <p>
            Quản lý lời mời kết bạn và danh sách
            bạn bè của bạn.
          </p>
        </div>

        {/* CÁC TAB */}
        <div className="friend-requests-tabs">
          <button
            type="button"
            className={
              activeTab === "received"
                ? "active"
                : ""
            }
            onClick={() =>
              handleChangeTab("received")
            }
          >
            Lời mời đã nhận ({receivedRequests.length})
          </button>

          <button
            type="button"
            className={
              activeTab === "sent"
                ? "active"
                : ""
            }
            onClick={() =>
              handleChangeTab("sent")
            }
          >
            Lời mời đã gửi ({sentRequests.length})
          </button>

          <button
            type="button"
            className={
              activeTab === "accepted"
                ? "active"
                : ""
            }
            onClick={() =>
              handleChangeTab("accepted")
            }
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

            <span>
              {displayedRequests.length} người dùng
            </span>
          </div>

          {/* TÌM KIẾM */}
          <div className="friend-requests-search">
            <span>🔍</span>

            <input
              type="text"
              placeholder="Tìm theo tên hoặc username..."
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

          {/* DANH SÁCH */}
          {displayedRequests.length === 0 ? (
            <div className="friend-requests-empty">
              <div>👥</div>

              <h3>
                {searchValue.trim()
                  ? "Không tìm thấy người dùng"
                  : activeTab === "received"
                    ? "Bạn chưa có lời mời kết bạn nào"
                    : activeTab === "sent"
                      ? "Bạn chưa gửi lời mời kết bạn nào"
                      : "Bạn chưa có bạn bè nào"}
              </h3>

              <p>
                {searchValue.trim()
                  ? "Hãy thử tìm kiếm bằng tên hoặc username khác."
                  : "Hãy tìm kiếm người dùng để kết nối với mọi người."}
              </p>

              <Link to="/search-users">
                Tìm kiếm người dùng
              </Link>
            </div>
          ) : (
            <div className="friend-request-list">
              {displayedRequests.map((request) => {
                const profileUrl =
                  `/profile?user=${encodeURIComponent(
                    request.name || ""
                  )}`;

                return (
                  <div
                    className="friend-request-card"
                    key={request.id}
                  >
                    {/* AVATAR */}
                    <Link
                      className="friend-request-avatar"
                      to={profileUrl}
                      aria-label={`Xem hồ sơ ${request.name}`}
                    >
                      {request.avatar ||
                        request.name?.charAt(0) ||
                        "U"}
                    </Link>

                    {/* THÔNG TIN */}
                    <div className="friend-request-info">
                      <strong>
                        <Link to={profileUrl}>
                          {request.name || "Người dùng"}
                        </Link>
                      </strong>

                      <span>
                        @{request.username || "unknown"}
                      </span>

                      <small>
                        👥 {request.mutualFriends || 0} bạn chung
                      </small>

                      {activeTab === "sent" &&
                        formatDate(request.createdAt) && (
                          <small className="friend-request-date">
                            Đã gửi:{" "}
                            {formatDate(request.createdAt)}
                          </small>
                        )}

                      {activeTab === "accepted" &&
                        formatDate(request.acceptedAt) && (
                          <small className="friend-request-date">
                            Bạn bè từ:{" "}
                            {formatDate(request.acceptedAt)}
                          </small>
                        )}
                    </div>

                    {/* NÚT THAO TÁC */}
                    <div className="friend-request-actions">
                      {/* LỜI MỜI ĐÃ NHẬN */}
                      {activeTab === "received" && (
                        <>
                          <button
                            type="button"
                            className="friend-accept-button"
                            onClick={() =>
                              handleAccept(request.id)
                            }
                          >
                            Chấp nhận
                          </button>

                          <button
                            type="button"
                            className="friend-reject-button"
                            onClick={() =>
                              handleReject(request.id)
                            }
                          >
                            Từ chối
                          </button>
                        </>
                      )}

                      {/* LỜI MỜI ĐÃ GỬI */}
                      {activeTab === "sent" && (
                        <button
                          type="button"
                          className="friend-cancel-button"
                          onClick={() =>
                            handleCancel(request.id)
                          }
                        >
                          Hủy lời mời
                        </button>
                      )}

                      {/* DANH SÁCH BẠN BÈ */}
                      {activeTab === "accepted" && (
                        <>
                          <span className="friend-accepted-label">
                            ✓ Đã là bạn bè
                          </span>

                          <button
                            type="button"
                            className="friend-reject-button"
                            onClick={() =>
                              handleUnfriend(request.id)
                            }
                          >
                            Hủy kết bạn
                          </button>
                        </>
                      )}

                      {/* XEM TRANG CÁ NHÂN */}
                      <Link
                        className="friend-view-profile-button"
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
