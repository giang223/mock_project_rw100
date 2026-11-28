
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../../api/http";
import { pageContent } from "../../api/apiResponse";
import { toFriendView } from "../../api/adapters";
import { getFriends, getReceivedFriendRequests, getSentFriendRequests, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, unfriend } from "../../api/friends";

// CHUYỂN TIẾNG VIỆT THÀNH KHÔNG DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

function FriendRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeTab, setActiveTab] =
    useState("received");

  const [searchValue, setSearchValue] =
    useState("");

  const refreshRequests = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [receivedPage, sentPage, friendsPage] = await Promise.all([
        getReceivedFriendRequests({ page: 0, size: 100 }),
        getSentFriendRequests({ page: 0, size: 100 }),
        getFriends({ page: 0, size: 100 }),
      ]);
      setRequests([
        ...pageContent(receivedPage).map((item) => toFriendView(item, "received")),
        ...pageContent(sentPage).map((item) => toFriendView(item, "sent")),
        ...pageContent(friendsPage).map((item) => toFriendView(item, "accepted")),
      ].filter(Boolean));
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRequests();
  }, [refreshRequests]);

  // CHẤP NHẬN LỜI MỜI
  const handleAccept = async (requestId) => {
    const request = requests.find((item) => item.friendshipId === requestId && item.status === "received");
    if (!request) return;
    try {
      await acceptFriendRequest(requestId);
      await refreshRequests();
      alert(
        `Bạn và ${request.name} đã trở thành bạn bè!`
      );
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // TỪ CHỐI LỜI MỜI
  const handleReject = async (requestId) => {
    const request = requests.find((item) => item.friendshipId === requestId && item.status === "received");
    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn từ chối lời mời của ${request.name}?`
    );

    if (!confirmed) return;

    try {
      await rejectFriendRequest(requestId);
      await refreshRequests();
      alert(
        `Đã từ chối lời mời của ${request.name}.`
      );
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // HỦY LỜI MỜI ĐÃ GỬI
  const handleCancel = async (requestId) => {
    const request = requests.find((item) => item.friendshipId === requestId && item.status === "sent");
    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy lời mời gửi đến ${request.name}?`
    );

    if (!confirmed) return;

    try {
      await cancelFriendRequest(requestId);
      await refreshRequests();
      alert(
        `Đã hủy lời mời gửi đến ${request.name}.`
      );
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // HỦY KẾT BẠN
  const handleUnfriend = async (friendId) => {
    const request = requests.find((item) => String(item.id) === String(friendId) && item.status === "accepted");
    if (!request) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn hủy kết bạn với ${request.name}?`
    );

    if (!confirmed) return;

    try {
      await unfriend(friendId);
      await refreshRequests();
      alert(
        `Đã hủy kết bạn với ${request.name}.`
      );
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  // DANH SÁCH ĐÃ LỌC NGƯỜI BỊ CHẶN
  const visibleRequests = requests;

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
        {loadError && <p role="alert" className="profile-field-error">{loadError}</p>}
        {isLoading && <p role="status">Đang tải danh sách bạn bè…</p>}

        {/* ĐIỀU HƯỚNG BẠN BÈ */}
<nav
  className="friends-top-navigation"
  aria-label="Điều hướng bạn bè"
>
  <Link
    to="/friend-requests"
    className="active"
    aria-current="page"
  >
    👥 Bạn bè
  </Link>

  <Link to="/friend-suggestions">
    ✨ Gợi ý kết bạn
  </Link>

  <Link to="/search-users">
    🔍 Tìm kiếm người dùng
  </Link>
</nav>

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
  `/profile?userId=${request.userId}`;

                return (
                  <div
                    className="friend-request-card"
                    key={request.friendshipId || request.id}
                  >
                    {/* AVATAR */}
                    <Link
                      className={`friend-request-avatar ${
  request.color || "blue"
}`}
                      to={profileUrl}
                      aria-label={`Xem hồ sơ ${request.name}`}
                    >
                      {request.avatar ? (
  <img
    src={request.avatar}
    alt={`Ảnh đại diện ${request.name}`}
    className="synced-avatar-image"
  />
) : (
  String(request.name || "U")
    .trim()
    .split(/\s+/)
    .pop()
    ?.charAt(0)
    .toUpperCase() || "U"
)}
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
                              handleAccept(request.friendshipId)
                            }
                          >
                            Chấp nhận
                          </button>

                          <button
                            type="button"
                            className="friend-reject-button"
                            onClick={() =>
                              handleReject(request.friendshipId)
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
                              handleCancel(request.friendshipId)
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

       
      </main>
    </div>
  );
}

export default FriendRequests;
