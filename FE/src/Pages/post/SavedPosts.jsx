
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "miniSocialPosts";
const POSTS_EVENT = "miniSocialPostsUpdated";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

const CURRENT_USER = "Nguyễn Văn A";

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

// ĐỌC DANH SÁCH BÀI VIẾT
function readPosts() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Lỗi khi đọc bài viết:", error);
    return [];
  }
}

// LẤY DANH SÁCH BÀI VIẾT ĐÃ LƯU
function readSavedPosts() {
  return readPosts().filter(
    (post) => post && post.isSaved === true
  );
}

// LẤY DANH SÁCH HÌNH ẢNH
function getPostImages(post) {
  if (Array.isArray(post.images) && post.images.length > 0) {
    return post.images;
  }

  return post.image ? [post.image] : [];
}

function formatPostTime(value) {
  if (!value) return "Không rõ thời gian";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000)
  );

  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days} ngày trước`;

  return date.toLocaleString("vi-VN");
}

function SavedPosts() {
  const [posts, setPosts] = useState(readSavedPosts);
  const [profile, setProfile] = useState(readProfile);
  const [searchText, setSearchText] = useState("");

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
      setPosts(readSavedPosts());
      setProfile(readProfile());
    };

    refreshData();

    window.addEventListener(POSTS_EVENT, refreshData);
    window.addEventListener(PROFILE_EVENT, refreshData);
    window.addEventListener("storage", refreshData);
    window.addEventListener("focus", refreshData);

    return () => {
      window.removeEventListener(POSTS_EVENT, refreshData);
      window.removeEventListener(PROFILE_EVENT, refreshData);
      window.removeEventListener("storage", refreshData);
      window.removeEventListener("focus", refreshData);
    };
  }, []);

  // HIỂN THỊ TÊN NGƯỜI DÙNG
  const displayName = (name, isMine = false) => {
    if (isMine || name === CURRENT_USER) {
      return profile.fullName || CURRENT_USER;
    }

    return name || "Người dùng";
  };

  // HIỂN THỊ ẢNH ĐẠI DIỆN
  const renderAvatar = (name, isMine = false) => {
    if (
      (isMine || name === CURRENT_USER) &&
      profile.avatar
    ) {
      return (
        <img
          src={profile.avatar}
          alt="Ảnh đại diện"
          className="synced-avatar-image"
        />
      );
    }

    return (
      displayName(name, isMine)
        .trim()
        .split(/\s+/)
        .pop()
        ?.charAt(0)
        .toUpperCase() || "U"
    );
  };

  // ĐƯỜNG DẪN TRANG CÁ NHÂN
  const getProfileLink = (name, isMine = false) => {
    if (isMine || name === CURRENT_USER) {
      return "/profile";
    }

    return `/profile?user=${encodeURIComponent(
      name || "Người dùng"
    )}`;
  };

  // TÌM KIẾM KHÔNG PHÂN BIỆT DẤU
  const normalizeText = (value) => {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .trim();
  };

  // TÌM KIẾM BÀI VIẾT ĐÃ LƯU
  const filteredPosts = posts.filter((post) => {
    const keyword = normalizeText(searchText);

    const searchableText = normalizeText(
      [
        displayName(post.author, post.isMine),
        post.content,
        post.feeling,
        post.location,
        post.originalPost?.content,
        post.originalPost
          ? displayName(
              post.originalPost.author,
              post.originalPost.isMine
            )
          : "",
      ].join(" ")
    );

    return searchableText.includes(keyword);
  });

  // BỎ LƯU BÀI VIẾT
  const handleUnsave = (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn bỏ lưu bài viết này không?"
    );

    if (!confirmed) return;

    try {
      const allPosts = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (!Array.isArray(allPosts)) {
        alert("Dữ liệu bài viết không hợp lệ!");
        return;
      }

      const updatedPosts = allPosts.map((post) =>
        post && post.id === id
          ? { ...post, isSaved: false }
          : post
      );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedPosts)
      );

      setPosts(
        updatedPosts.filter(
          (post) => post && post.isSaved === true
        )
      );

      window.dispatchEvent(
        new Event(POSTS_EVENT)
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

        {/* TÌM KIẾM */}
        {posts.length > 0 && (
          <div className="saved-search">
            <span>🔍</span>

            <input
              type="search"
              placeholder="Tìm kiếm bài viết đã lưu..."
              value={searchText}
              onChange={(e) =>
                setSearchText(e.target.value)
              }
            />

            {searchText && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => setSearchText("")}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* DANH SÁCH BÀI VIẾT */}
        <div className="saved-content">

          {posts.length === 0 ? (
            <div className="saved-empty">
              <div className="saved-empty-icon">
                🔖
              </div>

              <h2>
                Chưa có bài viết nào được lưu
              </h2>

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
              {/* SỐ LƯỢNG */}
              <div className="saved-count">
                Bạn đã lưu {posts.length} bài viết

                {searchText && (
                  <span>
                    {" "}· {filteredPosts.length} kết quả
                  </span>
                )}
              </div>

              {/* KHÔNG CÓ KẾT QUẢ */}
              {filteredPosts.length === 0 && (
                <div className="saved-empty">
                  <div className="saved-empty-icon">
                    🔍
                  </div>

                  <h2>Không tìm thấy bài viết</h2>

                  <p>
                    Hãy thử tìm kiếm bằng từ khóa khác.
                  </p>

                  <button
                    type="button"
                    className="saved-feed-button"
                    onClick={() => setSearchText("")}
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              )}

              {filteredPosts.map((post) => {
                const comments = Array.isArray(post.comments)
                  ? post.comments
                  : [];

                const original = post.originalPost;

                return (
                  <article
                    className="saved-post-card"
                    key={post.id}
                  >

                    {/* THÔNG TIN NGƯỜI ĐĂNG */}
                    <div className="saved-post-header">

                      <Link
                        to={getProfileLink(
                          post.author,
                          post.isMine
                        )}
                        className="saved-avatar"
                      >
                        {renderAvatar(
                          post.author,
                          post.isMine
                        )}
                      </Link>

                      <div className="saved-author">
                        <strong>
                          <Link
                            to={getProfileLink(
                              post.author,
                              post.isMine
                            )}
                          >
                            {displayName(
                              post.author,
                              post.isMine
                            )}
                          </Link>
                        </strong>

                        <span>
  {formatPostTime(post.createdAt)}
</span>
                      </div>

                      <button
                        type="button"
                        className="saved-remove-button"
                        onClick={() =>
                          handleUnsave(post.id)
                        }
                      >
                        Bỏ lưu
                      </button>
                    </div>

                    {/* NỘI DUNG BÀI VIẾT */}
                    <div className="saved-post-content">

                      {/* CẢM XÚC VÀ CHECK IN */}
                      {(post.feeling || post.location) && (
                        <div className="saved-post-tags">
                          {post.feeling && (
                            <span>
                              {post.feeling}
                            </span>
                          )}

                          {post.location && (
                            <span>
                              📍 {post.location}
                            </span>
                          )}
                        </div>
                      )}

                      {post.content && (
                        <p>{post.content}</p>
                      )}

                      {/* BÀI VIẾT ĐƯỢC CHIA SẺ */}
                      {post.isShared && original && (
                        <div className="saved-shared-post">

                          <div className="saved-shared-header">
                            <Link
                              to={getProfileLink(
                                original.author,
                                original.isMine
                              )}
                              className="saved-avatar"
                            >
                              {renderAvatar(
                                original.author,
                                original.isMine
                              )}
                            </Link>

                            <div className="saved-author">
                              <strong>
                                <Link
                                  to={getProfileLink(
                                    original.author,
                                    original.isMine
                                  )}
                                >
                                  {displayName(
                                    original.author,
                                    original.isMine
                                  )}
                                </Link>
                              </strong>

                              <span>
  {formatPostTime(original.createdAt)}
</span>
                            </div>
                          </div>

                          {original.content && (
                            <p>{original.content}</p>
                          )}

                          {getPostImages(original).length > 0 && (
                            <div className="saved-image-grid">
                              {getPostImages(original).map(
                                (src, index) => (
                                  <Link
                                    key={index}
                                    to={`/feed?postId=${post.id}`}
                                  >
                                    <img
                                      src={src}
                                      alt={`Ảnh chia sẻ ${index + 1}`}
                                      className="saved-post-image"
                                    />
                                  </Link>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ẢNH BÀI VIẾT THƯỜNG */}
                      {!post.isShared &&
                        getPostImages(post).length > 0 && (
                          <div className="saved-image-grid">
                            {getPostImages(post).map(
                              (src, index) => (
                                <Link
                                  key={index}
                                  to={`/feed?postId=${post.id}`}
                                >
                                  <img
                                    src={src}
                                    alt={`Ảnh bài viết ${index + 1}`}
                                    className="saved-post-image"
                                  />
                                </Link>
                              )
                            )}
                          </div>
                        )}

                    </div>

                    {/* THỐNG KÊ */}
                    <div className="saved-post-statistics">
                      <span>
                        👍 {Number(post.likeCount) || 0} lượt thích
                      </span>

                      <span>
                        💬 {comments.length} bình luận
                      </span>
                    </div>

                    {/* FOOTER */}
                    <div className="saved-post-footer">
                      <span>🔖 Đã lưu</span>

                      <Link
                        to={`/feed?postId=${post.id}`}
                        className="saved-view-button"
                      >
                        Xem bài viết →
                      </Link>
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
