
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "miniSocialPosts";

function SavedPosts() {
  const [posts, setPosts] = useState([]);

  // ĐỌC DANH SÁCH BÀI VIẾT ĐÃ LƯU
  const loadSavedPosts = () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);

      if (!savedData) {
        setPosts([]);
        return;
      }

      const allPosts = JSON.parse(savedData);

      if (!Array.isArray(allPosts)) {
        setPosts([]);
        return;
      }

      const savedPosts = allPosts.filter(
        (post) => post && post.isSaved === true
      );

      setPosts(savedPosts);
    } catch (error) {
      console.error("Lỗi khi tải bài viết đã lưu:", error);
      setPosts([]);
    }
  };

  // TẢI DỮ LIỆU KHI MỞ TRANG
  useEffect(() => {
    loadSavedPosts();

    // Cập nhật khi dữ liệu thay đổi ở tab khác
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        loadSavedPosts();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // BỎ LƯU BÀI VIẾT
  const handleUnsave = (id) => {
    const confirmUnsave = window.confirm(
      "Bạn có chắc chắn muốn bỏ lưu bài viết này không?"
    );

    if (!confirmUnsave) return;

    try {
      const savedData = localStorage.getItem(STORAGE_KEY);

      if (!savedData) {
        setPosts([]);
        return;
      }

      const allPosts = JSON.parse(savedData);

      if (!Array.isArray(allPosts)) {
        alert("Dữ liệu bài viết không hợp lệ!");
        return;
      }

      const updatedPosts = allPosts.map((post) =>
        post.id === id
          ? { ...post, isSaved: false }
          : post
      );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedPosts)
      );

      // Cập nhật danh sách ngay lập tức
      setPosts((previousPosts) =>
        previousPosts.filter((post) => post.id !== id)
      );

      alert("Đã bỏ lưu bài viết!");
    } catch (error) {
      console.error("Lỗi khi bỏ lưu bài viết:", error);
      alert("Không thể cập nhật bài viết!");
    }
  };

  return (
    <div className="saved-page">

      {/* HEADER */}
      <header className="saved-header">
        <Link to="/feed" className="saved-logo">
          MiniSocial
        </Link>

        <Link to="/feed" className="saved-back">
          ← Quay lại bảng tin
        </Link>
      </header>

      {/* MAIN */}
      <main className="saved-container">

        {/* TIÊU ĐỀ */}
        <div className="saved-title">
          <div className="saved-title-icon">
            🔖
          </div>

          <div>
            <h1>Bài viết đã lưu</h1>
            <p>
              Những bài viết bạn đã lưu sẽ xuất hiện tại đây.
            </p>
          </div>
        </div>

        {/* DANH SÁCH BÀI VIẾT */}
        <div className="saved-content">

          {posts.length === 0 ? (
            <div className="saved-empty">
              <div className="saved-empty-icon">
                🔖
              </div>

              <h2>Chưa có bài viết nào được lưu</h2>

              <p>
                Hãy lưu những bài viết bạn yêu thích
                để xem lại sau nhé!
              </p>

              <Link
                to="/feed"
                className="saved-feed-button"
              >
                Khám phá bảng tin
              </Link>
            </div>
          ) : (
            <>
              {/* SỐ LƯỢNG BÀI VIẾT */}
              <div className="saved-count">
                Bạn đã lưu {posts.length} bài viết
              </div>

              {posts.map((post) => {
                const comments = Array.isArray(post.comments)
                  ? post.comments
                  : [];

                return (
                  <article
                    className="saved-post-card"
                    key={post.id}
                  >

                    {/* THÔNG TIN NGƯỜI ĐĂNG */}
                    <div className="saved-post-header">
                      <div className="saved-avatar">
                        {post.author?.charAt(0) || "U"}
                      </div>

                      <div className="saved-author">
                        <strong>
                          {post.author || "Người dùng"}
                        </strong>

                        <span>
                          {post.createdAt || "Không rõ thời gian"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="saved-remove-button"
                        onClick={() => handleUnsave(post.id)}
                      >
                        Bỏ lưu
                      </button>
                    </div>

                    {/* NỘI DUNG BÀI VIẾT */}
                    <div className="saved-post-content">

                      {post.content && (
                        <p>{post.content}</p>
                      )}

                      {/* BÀI VIẾT ĐƯỢC CHIA SẺ */}
                      {post.isShared && post.originalPost && (
                        <div className="saved-shared-post">
                          <div className="saved-shared-author">
                            {post.originalPost.author || "Người dùng"}
                          </div>

                          {post.originalPost.content && (
                            <p>
                              {post.originalPost.content}
                            </p>
                          )}

                          {post.originalPost.image && (
                            <img
                              src={post.originalPost.image}
                              alt="Ảnh bài viết được chia sẻ"
                              className="saved-post-image"
                            />
                          )}
                        </div>
                      )}

                      {/* ẢNH BÀI VIẾT THƯỜNG */}
                      {!post.isShared && post.image && (
                        <img
                          src={post.image}
                          alt="Ảnh bài viết đã lưu"
                          className="saved-post-image"
                        />
                      )}

                    </div>

                    {/* THỐNG KÊ */}
                    <div className="saved-post-statistics">
                      <span>
                        👍 {post.likeCount || 0} lượt thích
                      </span>

                      <span>
                        💬 {comments.length} bình luận
                      </span>
                    </div>

                    {/* FOOTER */}
                    <div className="saved-post-footer">
                      <span>🔖 Đã lưu</span>
                      <span>MiniSocial</span>
                    </div>

                  </article>
                );
              })}
            </>
          )}

        </div>
      </main>
    </div>
  );
}

export default SavedPosts;
