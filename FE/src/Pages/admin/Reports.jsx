
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import {
  ACCOUNT_EVENT,
  getCurrentAccount,
  getAccountById,
  getAccountByName,
  readAccountData,
  getMockUsers,
  switchMockAccount,
  logoutMockAccount,
  isAdmin,
} from "../../utils/mockAccounts";

import {
  addNotification,
} from "../notification/notificationUtils";

const REPORT_KEY = "miniSocialReports";
const POST_KEY = "miniSocialPosts";
const PROFILE_KEY = "miniSocialProfile";

const REPORT_EVENT = "miniSocialReportsUpdated";
const POST_EVENT = "miniSocialPostsUpdated";
const PROFILE_EVENT = "miniSocialProfileUpdated";

// ĐỌC DỮ LIỆU LOCALSTORAGE
function readData(key) {
  try {
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : [];

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Không thể đọc dữ liệu:", error);
    return [];
  }
}

// ĐỌC DANH SÁCH BÁO CÁO
function readReports() {
  return readData(REPORT_KEY)
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      status: ["pending", "resolved", "rejected"].includes(
        item.status
      )
        ? item.status
        : "pending",
    }));
}

// TÌM TÀI KHOẢN THEO ID HOẶC TÊN
function findReportAccount(accountId, name) {
  if (accountId != null) {
    return getAccountById(accountId);
  }

  return getAccountByName(name);
}

// ĐỌC HỒ SƠ THEO TÀI KHOẢN
function readProfile(account) {
  if (!account) return null;

  try {
    const legacyProfile =
      String(account.id) === "1"
        ? JSON.parse(
            localStorage.getItem(PROFILE_KEY) || "{}"
          )
        : {};

    const savedProfile = readAccountData(
      PROFILE_KEY,
      legacyProfile,
      account.id
    );

    return {
      ...account,
      ...savedProfile,
      id: account.id,
      username: account.username,
      email: account.email,
    };
  } catch {
    return account;
  }
}

// TÌM KIẾM KHÔNG PHÂN BIỆT DẤU
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

// HIỂN THỊ TRẠNG THÁI
function getStatusLabel(status) {
  switch (status) {
    case "resolved":
      return "Đã xử lý";

    case "rejected":
      return "Đã từ chối";

    default:
      return "Chờ xử lý";
  }
}

// ĐỊNH DẠNG THỜI GIAN
function formatDate(value) {
  if (!value) return "Không xác định";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN");
}

// LẤY DANH SÁCH ẢNH
function getImages(images, image) {
  const result = Array.isArray(images)
    ? images
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.data || item?.url || ""
        )
        .filter(Boolean)
    : [];

  if (result.length > 0) {
    return result;
  }

  return image ? [image] : [];
}

function Reports() {
  const [currentAdmin, setCurrentAdmin] =
  useState(getCurrentAccount);

const [selectedAccount, setSelectedAccount] =
  useState("");

const [viewingReportId, setViewingReportId] =
  useState(null);
  const [reports, setReports] = useState(readReports);

  const [posts, setPosts] = useState(
    () => readData(POST_KEY)
  );

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
  setCurrentAdmin(getCurrentAccount());
  setReports(readReports());
  setPosts(readData(POST_KEY));
};

    refreshData();

    const events = [
  REPORT_EVENT,
  POST_EVENT,
  PROFILE_EVENT,
  ACCOUNT_EVENT,
  "storage",
  "focus",
];

    events.forEach((event) => {
      window.addEventListener(event, refreshData);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, refreshData);
      });
    };
  }, []);

  // HIỂN THỊ TÊN NGƯỜI DÙNG
const displayName = (name, accountId) => {
  const account = findReportAccount(
    accountId,
    name
  );

  if (account) {
    return (
      readProfile(account)?.fullName ||
      account.fullName
    );
  }

  return name || "Không xác định";
};

  // LƯU BÁO CÁO
  const saveReports = (nextReports) => {
  if (!isAdmin()) {
    alert("Bạn không có quyền quản trị!");
    return false;
  }

  try {
      localStorage.setItem(
        REPORT_KEY,
        JSON.stringify(nextReports)
      );

      setReports(nextReports);

      window.dispatchEvent(
        new Event(REPORT_EVENT)
      );

      return true;
    } catch (error) {
      console.error("Không thể lưu báo cáo:", error);

      alert("Không thể cập nhật báo cáo!");

      return false;
    }
  };

  // TÌM BÀI VIẾT GỐC
  const getOriginalPost = (postId) => {
    return posts.find(
      (post) => String(post.id) === String(postId)
    );
  };

  // THỐNG KÊ BÁO CÁO
  const pendingCount = reports.filter(
    (item) => item.status === "pending"
  ).length;

  const resolvedCount = reports.filter(
    (item) => item.status === "resolved"
  ).length;

  const rejectedCount = reports.filter(
    (item) => item.status === "rejected"
  ).length;

  // LỌC VÀ TÌM KIẾM
  const filteredReports = reports.filter((report) => {
    const matchesFilter =
      filter === "all" ||
      report.status === filter;

    const keyword = normalizeText(search);

    const searchableText = normalizeText(
      [
        displayName(report.postAuthor, report.postAuthorId),
        displayName(report.reporter, report.reporterId),
        report.reason,
        report.detail,
        report.postContent,
        getStatusLabel(report.status),
      ].join(" ")
    );

    return (
      matchesFilter &&
      searchableText.includes(keyword)
    );
  });

  // THÔNG BÁO KẾT QUẢ XỬ LÝ BÁO CÁO
const notifyReportResult = (report, action) => {
  const admin = getCurrentAccount();

  const reporter = findReportAccount(
    report.reporterId,
    report.reporter
  );

  if (!isAdmin(admin) || !reporter) return;

  let message = "";

  switch (action) {
    case "deleted_post":
      message =
        "đã xử lý báo cáo của bạn và xóa bài viết vi phạm.";
      break;

    case "rejected":
      message =
        "đã xem xét và từ chối báo cáo của bạn.";
      break;

    default:
      message =
        "đã xem xét báo cáo của bạn và giữ nguyên bài viết.";
  }

  addNotification({
    type: "report",
    senderId: admin.id,
    receiverId: reporter.id,
    message,
  });
};

 // CẬP NHẬT TRẠNG THÁI
const updateReportStatus = (
  id,
  status,
  action
) => {
  const admin = getCurrentAccount();

  if (!isAdmin(admin)) {
    alert("Bạn không có quyền quản trị!");
    return false;
  }

  const current = readReports();

  const target = current.find(
    (report) =>
      String(report.id) === String(id)
  );

  if (!target) {
    alert("Báo cáo không còn tồn tại!");
    return false;
  }

  if (target.status !== "pending") {
    alert("Báo cáo này đã được xử lý!");
    return false;
  }

  const nextReports = current.map((report) =>
    String(report.id) === String(id)
      ? {
          ...report,
          status,
          action,
          processedById: admin.id,
          processedBy: admin.fullName,
          processedAt: new Date().toISOString(),
        }
      : report
  );

  if (!saveReports(nextReports)) {
    return false;
  }

  notifyReportResult(target, action);

  return true;
};
  // ĐÁNH DẤU ĐÃ XỬ LÝ
  const handleResolve = (id) => {
    const confirmed = window.confirm(
      "Đánh dấu báo cáo đã xử lý và giữ nguyên bài viết?"
    );

    if (!confirmed) return;

    if (
      updateReportStatus(
        id,
        "resolved",
        "reviewed"
      )
    ) {
      alert("Đã cập nhật trạng thái báo cáo!");
    }
  };

  // TỪ CHỐI BÁO CÁO
  const handleReject = (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn từ chối báo cáo này?"
    );

    if (!confirmed) return;

    if (
      updateReportStatus(
        id,
        "rejected",
        "rejected"
      )
    ) {
      alert("Đã từ chối báo cáo!");
    }
  };

  // XÓA BÁO CÁO
const handleDeleteReport = (id) => {
  const admin = getCurrentAccount();

  if (!isAdmin(admin)) {
    alert("Bạn không có quyền quản trị!");
    return;
  }

  const current = readReports();

  const target = current.find(
    (report) =>
      String(report.id) === String(id)
  );

  if (!target) {
    alert("Báo cáo không còn tồn tại!");
    return;
  }

  if (target.status === "pending") {
    alert("Hãy xử lý báo cáo trước khi xóa!");
    return;
  }

  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn xóa báo cáo này?"
  );

  if (!confirmed) return;

  const latestReports = readReports();

  if (
    saveReports(
      latestReports.filter(
        (report) =>
          String(report.id) !== String(id)
      )
    )
  ) {
    alert("Đã xóa báo cáo!");
  }
};

  // XÓA BÀI VIẾT VI PHẠM
const handleDeletePost = (report) => {
  const admin = getCurrentAccount();

  if (!isAdmin(admin)) {
    alert("Bạn không có quyền quản trị!");
    return;
  }

  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn xóa bài viết vi phạm này không?"
  );

  if (!confirmed) return;

  try {
    const currentReports = readReports();

    const targetReport = currentReports.find(
      (item) =>
        String(item.id) === String(report.id)
    );

    if (
      !targetReport ||
      targetReport.status !== "pending" ||
      targetReport.postId == null
    ) {
      alert("Báo cáo không còn khả dụng!");
      return;
    }

    const currentPosts = readData(POST_KEY);

    const targetPost = currentPosts.find(
      (post) =>
        post &&
        String(post.id) ===
          String(targetReport.postId)
    );

    if (!targetPost) {
      setPosts(currentPosts);
      alert("Bài viết không còn tồn tại!");
      return;
    }

    // XÓA BÀI VIẾT VI PHẠM
    const updatedPosts = currentPosts.filter(
      (post) =>
        String(post?.id) !==
        String(targetReport.postId)
    );

    // LẤY CÁC BÁO CÁO LIÊN QUAN
    const relatedReports = currentReports.filter(
      (item) =>
        String(item.postId) ===
          String(targetReport.postId) &&
        item.status === "pending"
    );

    const processedAt = new Date().toISOString();

    // CẬP NHẬT TRẠNG THÁI BÁO CÁO
    const updatedReports = currentReports.map(
      (item) =>
        String(item.postId) ===
          String(targetReport.postId) &&
        item.status === "pending"
          ? {
              ...item,
              status: "resolved",
              action: "deleted_post",
              processedById: admin.id,
              processedBy: admin.fullName,
              processedAt,
            }
          : item
    );

    // LƯU BÀI VIẾT
    localStorage.setItem(
      POST_KEY,
      JSON.stringify(updatedPosts)
    );

    setPosts(updatedPosts);

    window.dispatchEvent(
      new Event(POST_EVENT)
    );

    // LƯU BÁO CÁO
    if (!saveReports(updatedReports)) {
      alert(
        "Bài viết đã bị xóa nhưng chưa cập nhật được báo cáo!"
      );
      return;
    }

    // THÔNG BÁO CHO NGƯỜI BÁO CÁO
    const notifiedUsers = new Set();

    relatedReports.forEach((item) => {
      const reporter = findReportAccount(
        item.reporterId,
        item.reporter
      );

      if (
        reporter &&
        !notifiedUsers.has(String(reporter.id))
      ) {
        notifiedUsers.add(String(reporter.id));

        notifyReportResult(
          item,
          "deleted_post"
        );
      }
    });

    // THÔNG BÁO CHO CHỦ BÀI VIẾT
    const author = findReportAccount(
      targetPost.authorId,
      targetPost.author
    );

    if (author) {
      addNotification({
        type: "report",
        senderId: admin.id,
        receiverId: author.id,
        message:
          "đã xóa bài viết của bạn do vi phạm quy định cộng đồng.",
      });
    }

    alert("Đã xóa bài viết vi phạm!");
  } catch (error) {
    console.error(
      "Lỗi khi xóa bài viết:",
      error
    );

    alert("Không thể hoàn tất xử lý bài viết!");
  }
};

  // XÓA BỘ LỌC
  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };
  // CHUYỂN ĐỔI SANG TÀI KHOẢN USER
const handleSwitchAccount = () => {
  if (!isAdmin()) return;

  const account = getMockUsers().find(
    (item) =>
      String(item.id) === selectedAccount
  );

  if (!account) {
    alert("Vui lòng chọn tài khoản người dùng!");
    return;
  }

  const confirmed = window.confirm(
    `Chuyển sang tài khoản ${account.fullName}?`
  );

  if (!confirmed) return;

  const success = switchMockAccount(account.id);

  if (!success) {
    alert("Không thể chuyển đổi tài khoản!");
    return;
  }

  window.location.replace("/feed");
};

// ĐĂNG XUẤT ADMIN
const handleLogout = () => {
  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn đăng xuất không?"
  );

  if (!confirmed) return;

  try {
    logoutMockAccount();

    window.location.replace("/login");
  } catch {
    alert("Không thể đăng xuất. Vui lòng thử lại!");
  }
};

// MỞ CHI TIẾT BÁO CÁO
const handleViewReportedPost = (report) => {
  if (!isAdmin()) return;

  setViewingReportId(report.id);
};

// ĐÓNG CHI TIẾT BÁO CÁO
const handleCloseReportedPost = () => {
  setViewingReportId(null);
};

// LẤY BÁO CÁO ĐANG XEM
const viewingReport = reports.find(
  (report) =>
    String(report.id) === String(viewingReportId)
);

const viewingPost = viewingReport
  ? getOriginalPost(viewingReport.postId)
  : null;

// ĐÓNG POPUP BẰNG PHÍM ESC
useEffect(() => {
  if (viewingReportId == null) return;

  const handleEscape = (event) => {
    if (event.key === "Escape") {
      setViewingReportId(null);
    }
  };

  window.addEventListener("keydown", handleEscape);

  return () => {
    window.removeEventListener(
      "keydown",
      handleEscape
    );
  };
}, [viewingReportId]);

// KIỂM TRA QUYỀN TRƯỚC KHI HIỂN THỊ
if (!currentAdmin) {
  return <Navigate to="/login" replace />;
}

if (!isAdmin(currentAdmin)) {
  return <Navigate to="/feed" replace />;
}

  return (
    <div className="admin-reports-page">

      
{/* HEADER QUẢN TRỊ */}
<header className="admin-reports-header">

  <div className="admin-heading">
    <span className="admin-brand">
      🦋 MSN ADMIN
    </span>

    <h1>Quản lý báo cáo</h1>

    <p>
      Kiểm tra và xử lý các bài viết bị báo cáo.
    </p>
  </div>

  <div className="admin-header-right">

    {/* THÔNG TIN ADMIN */}
    <div className="admin-account-info">

      <div className="admin-account-avatar">
        🛡️
      </div>

      <div>
        <strong>
          {currentAdmin.fullName}
        </strong>

        <small>
          {currentAdmin.email}
        </small>

        <span className="admin-role-label">
          ADMIN
        </span>
      </div>

    </div>

    {/* CHUYỂN TÀI KHOẢN */}
    <div className="admin-switch-account">

      <select
        aria-label="Chọn tài khoản người dùng"
        value={selectedAccount}
        onChange={(event) =>
          setSelectedAccount(event.target.value)
        }
      >
        <option value="">
          Chọn tài khoản USER
        </option>

        {getMockUsers().map((account) => (
          <option
            key={account.id}
            value={account.id}
          >
            {account.fullName}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="admin-switch-button"
        disabled={!selectedAccount}
        onClick={handleSwitchAccount}
      >
        Chuyển tài khoản
      </button>

    </div>

    {/* ĐĂNG XUẤT */}
    <button
      type="button"
      className="admin-logout-button"
      onClick={handleLogout}
    >
      🚪 Đăng xuất
    </button>

  </div>

</header>


      {/* THỐNG KÊ */}
      <div className="report-statistics">

        <div className="report-stat-card">
          <span>Tổng báo cáo</span>
          <strong>{reports.length}</strong>
        </div>

        <div className="report-stat-card pending">
          <span>Chờ xử lý</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="report-stat-card resolved">
          <span>Đã xử lý</span>
          <strong>{resolvedCount}</strong>
        </div>

        <div className="report-stat-card rejected">
          <span>Đã từ chối</span>
          <strong>{rejectedCount}</strong>
        </div>

      </div>

      {/* TÌM KIẾM VÀ LỌC */}
      <div className="report-toolbar">

        <input
          type="search"
          placeholder="Tìm người đăng, người báo cáo, lý do..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
        >
          <option value="all">
            Tất cả báo cáo
          </option>

          <option value="pending">
            Chờ xử lý
          </option>

          <option value="resolved">
            Đã xử lý
          </option>

          <option value="rejected">
            Đã từ chối
          </option>
        </select>

        {(search || filter !== "all") && (
          <button
            type="button"
            className="report-reset-button"
            onClick={resetFilters}
          >
            Xóa bộ lọc
          </button>
        )}

      </div>

      <p className="report-result-count">
        Hiển thị {filteredReports.length} /{" "}
        {reports.length} báo cáo
      </p>

      {/* DANH SÁCH BÁO CÁO */}
      <div className="report-list">

        {filteredReports.length === 0 ? (
          <div className="report-empty">
            <span>📭</span>

            <h3>Không có báo cáo nào</h3>

            <p>
              Các báo cáo phù hợp sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const originalPost = getOriginalPost(
              report.postId
            );

            const postExists = Boolean(originalPost);

            const reportImages = getImages(
              report.postImages,
              report.postImage
            );

            const images = reportImages.length
              ? reportImages
              : getImages(
                  originalPost?.images,
                  originalPost?.image
                );

            return (
              <article
                className="report-card"
                key={report.id}
              >

                {/* TIÊU ĐỀ */}
                <div className="report-card-header">
                  <div>
                    <span className="report-label">
                      Bài viết bị báo cáo
                    </span>

                    <h3>
                      {displayName(report.postAuthor, report.postAuthorId)}
                    </h3>
                  </div>

                  <span
                    className={`report-status ${report.status}`}
                  >
                    {getStatusLabel(report.status)}
                  </span>
                </div>

                {/* CHI TIẾT */}
                <div className="report-detail">

                  <p>
                    <strong>Mã báo cáo:</strong>{" "}
                    {report.id}
                  </p>

                  <p>
                    <strong>Người báo cáo:</strong>{" "}
                    {displayName(report.reporter, report.reporterId)}
                  </p>

                  <p>
                    <strong>Lý do:</strong>{" "}
                    {report.reason || "Không có lý do"}
                  </p>

                  {report.detail && (
                    <p>
                      <strong>Mô tả bổ sung:</strong>{" "}
                      {report.detail}
                    </p>
                  )}

                  <p>
                    <strong>Nội dung bài viết:</strong>
                  </p>

                  <div className="reported-post-content">
                    {report.postContent ||
                      originalPost?.content ||
                      "Bài viết không có nội dung văn bản."}
                  </div>

                  {/* HÌNH ẢNH */}
                  {images.length > 0 && (
                    <div className="reported-post-gallery">
                      {images.map((src, index) => (
                        <img
                          key={`${report.id}-${index}`}
                          src={src}
                          alt={`Ảnh vi phạm ${index + 1}`}
                          className="reported-post-image"
                        />
                      ))}
                    </div>
                  )}

                  {/* TRẠNG THÁI BÀI VIẾT */}
                  <p className="report-post-state">
                    <strong>Trạng thái bài viết:</strong>{" "}

                    <span
                      className={
                        postExists
                          ? "post-available"
                          : "post-unavailable"
                      }
                    >
                      {postExists
                        ? "Còn tồn tại"
                        : "Không còn tồn tại"}
                    </span>
                  </p>

                  <p className="report-date">
                    Thời gian báo cáo:{" "}
                    {formatDate(report.createdAt)}
                  </p>
                  {report.processedById != null && (
  <p className="report-date">
    Người xử lý:{" "}
    <strong>
      {displayName(
        report.processedBy,
        report.processedById
      )}
    </strong>
  </p>
)}

                  {report.processedAt && (
                    <p className="report-date">
                      Thời gian xử lý:{" "}
                      {formatDate(report.processedAt)}
                    </p>
                  )}

                  {report.action && (
                    <p className="report-action-result">
                      <strong>Kết quả:</strong>{" "}

                      {report.action === "deleted_post"
                        ? "Đã xóa bài viết vi phạm"
                        : report.action === "rejected"
                        ? "Đã từ chối báo cáo"
                        : "Đã kiểm tra và giữ nguyên bài viết"}
                    </p>
                  )}

                </div>

                {/* CÁC NÚT THAO TÁC */}
                <div className="report-actions">

                  <button
  type="button"
  className="view-reported-post"
  onClick={() =>
    handleViewReportedPost(report)
  }
>
  {postExists
    ? "Xem bài viết"
    : "Xem nội dung báo cáo"}
</button>

                  {report.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="resolve-report-button"
                        onClick={() =>
                          handleResolve(report.id)
                        }
                      >
                        ✓ Đã xử lý
                      </button>

                      <button
                        type="button"
                        className="reject-report-button"
                        onClick={() =>
                          handleReject(report.id)
                        }
                      >
                        ✕ Từ chối
                      </button>

                      <button
                        type="button"
                        className="delete-post-button"
                        disabled={!postExists}
                        onClick={() =>
                          handleDeletePost(report)
                        }
                      >
                        🗑 Xóa bài viết
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="delete-report-button"
                    disabled={report.status === "pending"}
                    onClick={() =>
                      handleDeleteReport(report.id)
                    }
                  >
                    Xóa báo cáo
                  </button>

                </div>

              </article>
            );
          })
        )}

      
      </div>

      {/* POPUP CHI TIẾT BÀI VIẾT BỊ BÁO CÁO */}
      {viewingReport && (
        <div
          className="admin-post-overlay"
          onClick={handleCloseReportedPost}
        >
          <section
            className="admin-post-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-post-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="admin-post-modal-header">
              <h2 id="admin-post-title">
                Chi tiết bài viết bị báo cáo
              </h2>

              <button
                type="button"
                aria-label="Đóng"
                onClick={handleCloseReportedPost}
              >
                ✕
              </button>
            </div>

            <div className="admin-post-modal-body">

              <p>
                <strong>Mã bài viết:</strong>{" "}
                {viewingReport.postId}
              </p>

              <p>
                <strong>Người đăng:</strong>{" "}
                {displayName(
                  viewingReport.postAuthor,
                  viewingReport.postAuthorId
                )}
              </p>

              <p>
                <strong>Người báo cáo:</strong>{" "}
                {displayName(
                  viewingReport.reporter,
                  viewingReport.reporterId
                )}
              </p>

              <p>
                <strong>Lý do:</strong>{" "}
                {viewingReport.reason}
              </p>

              {viewingReport.detail && (
                <p>
                  <strong>Mô tả bổ sung:</strong>{" "}
                  {viewingReport.detail}
                </p>
              )}

              <p>
                <strong>Trạng thái báo cáo:</strong>{" "}
                {getStatusLabel(viewingReport.status)}
              </p>

              {!viewingPost && (
                <div className="admin-post-warning">
                  Bài viết không còn tồn tại.
                  Đang hiển thị dữ liệu đã lưu
                  tại thời điểm báo cáo.
                </div>
              )}

              {/* NỘI DUNG TẠI THỜI ĐIỂM BÁO CÁO */}
              <h3>Nội dung khi bị báo cáo</h3>

              <div className="admin-post-content">
                {viewingReport.postContent ||
                  "Không có nội dung văn bản."}
              </div>

              <div className="admin-post-gallery">
                {getImages(
                  viewingReport.postImages,
                  viewingReport.postImage
                ).map((src, index) => (
                  <img
                    key={index}
                    src={src}
                    alt={`Ảnh báo cáo ${index + 1}`}
                  />
                ))}
              </div>

              {/* NỘI DUNG HIỆN TẠI */}
              {viewingPost && (
                <>
                  <h3>Nội dung hiện tại</h3>

                  <div className="admin-post-content">
                    {viewingPost.content ||
                      "Không có nội dung văn bản."}
                  </div>

                  <div className="admin-post-gallery">
                    {getImages(
                      viewingPost.images,
                      viewingPost.image
                    ).map((src, index) => (
                      <img
                        key={index}
                        src={src}
                        alt={`Ảnh hiện tại ${index + 1}`}
                      />
                    ))}
                  </div>

                  {viewingPost.isShared && (
                    <p>
                      <strong>Bài viết chia sẻ từ ID:</strong>{" "}
                      {viewingPost.originalPost?.id ||
                        "Không xác định"}
                    </p>
                  )}
                </>
              )}

            </div>

            <div className="admin-post-modal-footer">
              <button
                type="button"
                onClick={handleCloseReportedPost}
              >
                Đóng
              </button>
            </div>

          </section>
        </div>
      )}

    </div>
  );
}

export default Reports;

