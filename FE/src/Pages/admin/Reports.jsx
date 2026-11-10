
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const REPORT_KEY = "miniSocialReports";
const POST_KEY = "miniSocialPosts";

function readReports() {
  try {
    const saved = localStorage.getItem(REPORT_KEY);
    const data = saved ? JSON.parse(saved) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function Reports() {
  const [reports, setReports] = useState(readReports);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(REPORT_KEY, JSON.stringify(reports));
  }, [reports]);

  // LỌC VÀ TÌM KIẾM BÁO CÁO
  const filteredReports = reports.filter((report) => {
    const matchesFilter =
      filter === "all" || report.status === filter;

    const keyword = search.toLowerCase();

    const matchesSearch =
      (report.postAuthor || "").toLowerCase().includes(keyword) ||
      (report.reporter || "").toLowerCase().includes(keyword) ||
      (report.reason || "").toLowerCase().includes(keyword);

    return matchesFilter && matchesSearch;
  });

  // ĐÁNH DẤU ĐÃ XỬ LÝ
  const handleResolve = (id) => {
    setReports((prev) =>
      prev.map((report) =>
        report.id === id
          ? { ...report, status: "resolved" }
          : report
      )
    );
  };

  // XÓA BÁO CÁO
  const handleDeleteReport = (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa báo cáo này?"
    );

    if (!confirmed) return;

    setReports((prev) =>
      prev.filter((report) => report.id !== id)
    );
  };

  // XÓA BÀI VIẾT VI PHẠM
  const handleDeletePost = (report) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa bài viết vi phạm này không?"
    );

    if (!confirmed) return;

    try {
      const savedPosts = localStorage.getItem(POST_KEY);
      const posts = savedPosts ? JSON.parse(savedPosts) : [];

      const updatedPosts = posts.filter(
        (post) => post.id !== report.postId
      );

      localStorage.setItem(
        POST_KEY,
        JSON.stringify(updatedPosts)
      );

      // Đánh dấu báo cáo đã xử lý
      setReports((prev) =>
        prev.map((item) =>
          item.postId === report.postId
            ? { ...item, status: "resolved" }
            : item
        )
      );

      alert("Đã xóa bài viết vi phạm!");
    } catch (error) {
      console.error("Lỗi khi xóa bài viết:", error);
      alert("Không thể xóa bài viết!");
    }
  };

  const pendingCount = reports.filter(
    (item) => item.status !== "resolved"
  ).length;

  const resolvedCount = reports.filter(
    (item) => item.status === "resolved"
  ).length;

  return (
    <div className="admin-reports-page">

      <header className="admin-reports-header">
        <div>
          <h1>Quản lý báo cáo</h1>
          <p>Kiểm tra và xử lý các bài viết bị báo cáo.</p>
        </div>

        <Link to="/feed" className="admin-back-button">
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

      </div>

      {/* TÌM KIẾM VÀ LỌC */}
      <div className="report-toolbar">

        <input
          type="text"
          placeholder="Tìm theo người đăng, người báo cáo hoặc lý do..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tất cả báo cáo</option>
          <option value="pending">Chờ xử lý</option>
          <option value="resolved">Đã xử lý</option>
        </select>

      </div>

      {/* DANH SÁCH BÁO CÁO */}
      <div className="report-list">

        {filteredReports.length === 0 ? (
          <div className="report-empty">
            <span>📭</span>
            <h3>Không có báo cáo nào</h3>
            <p>Các báo cáo phù hợp sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <article className="report-card" key={report.id}>

              <div className="report-card-header">
                <div>
                  <span className="report-label">
                    Bài viết bị báo cáo
                  </span>

                  <h3>{report.postAuthor || "Không xác định"}</h3>
                </div>

                <span
                  className={
                    report.status === "resolved"
                      ? "report-status resolved"
                      : "report-status pending"
                  }
                >
                  {report.status === "resolved"
                    ? "Đã xử lý"
                    : "Chờ xử lý"}
                </span>
              </div>

              <div className="report-detail">
                <p>
                  <strong>Người báo cáo:</strong>{" "}
                  {report.reporter || "Không xác định"}
                </p>

                <p>
                  <strong>Lý do:</strong>{" "}
                  {report.reason || "Không có lý do"}
                </p>

                <p>
                  <strong>Nội dung bài viết:</strong>
                </p>

                <div className="reported-post-content">
                  {report.postContent || "Bài viết không có nội dung văn bản."}
                </div>

                {report.postImage && (
                  <img
                    src={report.postImage}
                    alt="Ảnh bài viết bị báo cáo"
                    className="reported-post-image"
                  />
                )}

                <p className="report-date">
                  Thời gian:{" "}
                  {report.createdAt
                    ? new Date(report.createdAt).toLocaleString("vi-VN")
                    : "Không xác định"}
                </p>
              </div>

              <div className="report-actions">

                {report.status !== "resolved" && (
                  <>
                    <button
                      type="button"
                      className="resolve-report-button"
                      onClick={() => handleResolve(report.id)}
                    >
                      ✓ Đánh dấu đã xử lý
                    </button>

                    <button
                      type="button"
                      className="delete-post-button"
                      onClick={() => handleDeletePost(report)}
                    >
                      🗑 Xóa bài viết
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="delete-report-button"
                  onClick={() => handleDeleteReport(report.id)}
                >
                  Xóa báo cáo
                </button>

              </div>

            </article>
          ))
        )}

      </div>
    </div>
  );
}

export default Reports;
