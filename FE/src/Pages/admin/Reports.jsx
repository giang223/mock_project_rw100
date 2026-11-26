
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const REPORT_KEY = "miniSocialReports";
const POST_KEY = "miniSocialPosts";
const PROFILE_KEY = "miniSocialProfile";

const REPORT_EVENT = "miniSocialReportsUpdated";
const POST_EVENT = "miniSocialPostsUpdated";
const PROFILE_EVENT = "miniSocialProfileUpdated";

const CURRENT_USER = "Nguyễn Văn A";

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

// ĐỌC THÔNG TIN CÁ NHÂN
function readProfile() {
  const defaultProfile = {
    fullName: CURRENT_USER,
    avatar: "",
  };

  try {
    const saved = JSON.parse(
      localStorage.getItem(PROFILE_KEY) || "{}"
    );

    return {
      ...defaultProfile,
      ...saved,
    };
  } catch {
    return defaultProfile;
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
  const [reports, setReports] = useState(readReports);

  const [posts, setPosts] = useState(
    () => readData(POST_KEY)
  );

  const [profile, setProfile] = useState(readProfile);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
      setReports(readReports());
      setPosts(readData(POST_KEY));
      setProfile(readProfile());
    };

    refreshData();

    const events = [
      REPORT_EVENT,
      POST_EVENT,
      PROFILE_EVENT,
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
  const displayName = (name) => {
    if (name === CURRENT_USER) {
      return profile.fullName || CURRENT_USER;
    }

    return name || "Không xác định";
  };

  // LƯU BÁO CÁO
  const saveReports = (nextReports) => {
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
        displayName(report.postAuthor),
        displayName(report.reporter),
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

  // CẬP NHẬT TRẠNG THÁI
  const updateReportStatus = (
    id,
    status,
    action
  ) => {
    const current = readReports();

    const nextReports = current.map((report) =>
      report.id === id &&
      report.status === "pending"
        ? {
            ...report,
            status,
            action,
            processedAt: new Date().toISOString(),
          }
        : report
    );

    return saveReports(nextReports);
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
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa báo cáo này?"
    );

    if (!confirmed) return;

    const current = readReports();

    saveReports(
      current.filter(
        (report) => report.id !== id
      )
    );
  };

  // XÓA BÀI VIẾT VI PHẠM
  const handleDeletePost = (report) => {
    if (report.postId == null) {
      alert("Không xác định được bài viết!");
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa bài viết vi phạm này không?"
    );

    if (!confirmed) return;

    try {
      const currentPosts = readData(POST_KEY);

      const exists = currentPosts.some(
        (post) =>
          String(post.id) === String(report.postId)
      );

      if (!exists) {
        setPosts(currentPosts);

        alert("Bài viết không còn tồn tại!");
        return;
      }

      const updatedPosts = currentPosts.filter(
        (post) =>
          String(post.id) !== String(report.postId)
      );

      localStorage.setItem(
        POST_KEY,
        JSON.stringify(updatedPosts)
      );

      setPosts(updatedPosts);

      // ĐỒNG BỘ VỚI HOME FEED VÀ SAVED POSTS
      window.dispatchEvent(
        new Event(POST_EVENT)
      );

      // CẬP NHẬT CÁC BÁO CÁO LIÊN QUAN
      const currentReports = readReports();

      const updatedReports = currentReports.map(
        (item) =>
          String(item.postId) ===
            String(report.postId) &&
          item.status === "pending"
            ? {
                ...item,
                status: "resolved",
                action: "deleted_post",
                processedAt:
                  new Date().toISOString(),
              }
            : item
      );

      if (saveReports(updatedReports)) {
        alert("Đã xóa bài viết vi phạm!");
      } else {
        alert(
          "Bài viết đã bị xóa nhưng chưa cập nhật được báo cáo!"
        );
      }
    } catch (error) {
      console.error("Lỗi khi xóa bài viết:", error);

      alert("Không thể xóa bài viết!");
    }
  };

  // XÓA BỘ LỌC
  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };

  return (
    <div className="admin-reports-page">

      {/* HEADER */}
      <header className="admin-reports-header">
        <div>
          <h1>Quản lý báo cáo</h1>

          <p>
            Kiểm tra và xử lý các bài viết bị báo cáo.
          </p>
        </div>

        <Link
          to="/feed"
          className="admin-back-button"
        >
          ← Quay lại bảng tin
        </Link>
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
                      {displayName(report.postAuthor)}
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
                    {displayName(report.reporter)}
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

                  {postExists && (
                    <Link
                      className="view-reported-post"
                      to={`/feed?postId=${encodeURIComponent(
                        report.postId
                      )}`}
                    >
                      Xem bài viết
                    </Link>
                  )}

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
    </div>
  );
}

export default Reports;
