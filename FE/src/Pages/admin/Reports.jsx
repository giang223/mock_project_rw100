
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { getCurrentAccount, isAdmin } from "../../utils/mockAccounts";
import { useAuth } from "../../context/auth";
import { getReports, resolveReport, dismissReport, deleteReport, deleteReportedPost, deleteReportedComment } from "../../api/admin";
import { pageContent } from "../../api/apiResponse";
import { getApiErrorMessage } from "../../api/http";

function toReportView(item) {
  const status = { PENDING: "pending", RESOLVED: "resolved", DISMISSED: "rejected" }[item?.status] || "pending";
  const postAuthor = item?.targetType === "COMMENT" ? item?.commentAuthor : item?.postAuthor;
  const reporter = item?.reporter;
  const reviewedBy = item?.reviewedBy;
  return {
    ...item,
    status,
    postContent: item?.targetType === "COMMENT" ? item?.commentContent : item?.postContent,
    postAuthor: postAuthor?.fullName || "Không xác định",
    postAuthorId: postAuthor?.id,
    reporter: reporter?.fullName || "Không xác định",
    reporterId: reporter?.id,
    postImage: item?.postImageUrl || "",
    postImages: item?.postImageUrl ? [item.postImageUrl] : [],
    detail: item?.reviewNote || "",
    processedBy: reviewedBy?.fullName || "",
    processedById: reviewedBy?.id,
    processedAt: item?.reviewedAt,
    action: status === "resolved" ? "reviewed" : status === "rejected" ? "rejected" : "",
  };
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
  const { logout } = useAuth();
  const currentAdmin = getCurrentAccount();

const [viewingReportId, setViewingReportId] =
  useState(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Load moderation data from the protected admin API.
  useEffect(() => {
    let active = true;
    const refreshData = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const page = await getReports({ page: 0, size: 100 });
        if (active) setReports(pageContent(page).map(toReportView));
      } catch (error) {
        if (active) setLoadError(getApiErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    refreshData();
    window.addEventListener("focus", refreshData);
    return () => { active = false; window.removeEventListener("focus", refreshData); };
  }, []);

const displayName = (name) => name || "Không xác định";

  // The report response contains the moderation snapshot; no local post copy is authoritative.
  const getOriginalPost = (postId) => {
    const report = reports.find((item) => String(item.postId) === String(postId));
    return report ? { id: report.postId, content: report.postContent, image: report.postImage, images: report.postImages || [] } : null;
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

  const refreshReports = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const page = await getReports({ page: 0, size: 100 });
      setReports(pageContent(page).map(toReportView));
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (id) => {
    if (!window.confirm("Đánh dấu báo cáo đã xử lý và giữ nguyên nội dung?")) return;
    try {
      await resolveReport(id);
      await refreshReports();
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn từ chối báo cáo này?")) return;
    try {
      await dismissReport(id);
      await refreshReports();
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  const handleDeleteReport = async (id) => {
    const report = reports.find((item) => String(item.id) === String(id));
    if (!report || report.status === "pending") {
      alert("Hãy xử lý báo cáo trước khi xóa.");
      return;
    }
    if (!window.confirm("Bạn có chắc chắn muốn xóa báo cáo này?")) return;
    try {
      await deleteReport(id);
      setReports((current) => current.filter((item) => String(item.id) !== String(id)));
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  const handleDeletePost = async (report) => {
    if (!window.confirm("Xóa nội dung vi phạm? Hành động này sẽ gỡ nội dung khỏi hệ thống.")) return;
    try {
      if (report.commentId != null) await deleteReportedComment(report.commentId);
      else await deleteReportedPost(report.postId);
      await refreshReports();
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) return;
    try {
      await logout();
      window.location.replace("/login");
    } catch (error) {
      alert(getApiErrorMessage(error, "Không thể đăng xuất. Vui lòng thử lại."));
    }
  };

  const handleViewReportedPost = (report) => {
    if (!isAdmin()) return;
    setViewingReportId(report.id);
  };

  const handleCloseReportedPost = () => setViewingReportId(null);

  const viewingReport = reports.find((report) => String(report.id) === String(viewingReportId));

  // XÓA BỘ LỌC
  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };
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

        {isLoading ? (
          <p role="status">Đang tải báo cáo…</p>
        ) : loadError ? (
          <div role="alert" className="report-empty">
            <p>{loadError}</p>
            <button type="button" onClick={refreshReports}>Thử tải lại</button>
          </div>
        ) : filteredReports.length === 0 ? (
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
                      {report.targetType === "COMMENT" ? "Bình luận bị báo cáo" : "Bài viết bị báo cáo"}
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
                    <strong>{report.targetType === "COMMENT" ? "Nội dung bình luận:" : "Nội dung bài viết:"}</strong>
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
                      {postExists ? "Có dữ liệu snapshot" : "Không có dữ liệu snapshot"}
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
                        {report.commentId != null ? "🗑 Xóa bình luận" : "🗑 Xóa bài viết"}
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

