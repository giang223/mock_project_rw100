
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentAccount } from "../../utils/mockAccounts";
import { getSavedPosts, toggleSave } from "../../api/posts";
import { toPostView } from "../../api/adapters";
import { pageContent } from "../../api/apiResponse";
import { getApiErrorMessage } from "../../api/http";

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

// HIỂN THỊ QUYỀN RIÊNG TƯ
function getPrivacyLabel(privacy) {
  switch (privacy) {
    case "friends":
      return "👥 Bạn bè";

    case "private":
      return "🔒 Chỉ mình tôi";

    default:
      return "🌍 Công khai";
  }
}

function SavedPosts() {
  const currentAccount = getCurrentAccount();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchText, setSearchText] =
    useState("");

  // Tải danh sách đã lưu từ backend; backend kiểm tra quyền xem.
  useEffect(() => {
    let active = true;
    const refreshData = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const page = await getSavedPosts({ page: 0, size: 50 });
        if (active) setPosts(pageContent(page).map((post) => toPostView(post, currentAccount?.id)));
      } catch (error) {
        if (active) setLoadError(getApiErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    refreshData();
    window.addEventListener("focus", refreshData);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshData);
    };
  }, [currentAccount?.id]);

 // LẤY HỒ SƠ TÁC GIẢ
const getAuthorProfile = (name, authorId) => {
  const found = posts.flatMap((post) => [post, post.originalPost])
    .find((post) => post && String(post.authorId) === String(authorId));
  return found?.authorProfile || { fullName: name || "Người dùng", avatar: found?.avatar || "" };
};

// HIỂN THỊ TÊN NGƯỜI DÙNG
const displayName = (name, authorId) => {
  const authorProfile = getAuthorProfile(
    name,
    authorId
  );

  return authorProfile.fullName || "Người dùng";
};

// HIỂN THỊ ẢNH ĐẠI DIỆN
const renderAvatar = (name, authorId) => {
  const authorProfile = getAuthorProfile(
    name,
    authorId
  );

  if (authorProfile.avatar) {
    return (
      <img
        src={authorProfile.avatar}
        alt="Ảnh đại diện"
        className="synced-avatar-image"
      />
    );
  }

  return (
    String(authorProfile.fullName || "U")
      .trim()
      .split(/\s+/)
      .pop()
      ?.charAt(0)
      .toUpperCase() || "U"
  );
};

// ĐƯỜNG DẪN TRANG CÁ NHÂN
const getProfileLink = (name, authorId) => {
  if (String(authorId) === String(currentAccount?.id)) return "/profile";
  return authorId != null ? `/profile?userId=${authorId}` : `/profile?user=${encodeURIComponent(name || "Người dùng")}`;
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
        displayName(post.author, post.authorId),
        post.content,
        post.feeling,
        post.location,
        post.originalPost?.content,
        post.originalPost
          ? displayName(
              post.originalPost.author,
              post.originalPost.authorId
            )
          : "",
      ].join(" ")
    );

    return searchableText.includes(keyword);
  });

  // BỎ LƯU BÀI VIẾT THEO TÀI KHOẢN
const handleUnsave = async (id) => {
  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn bỏ lưu bài viết này không?"
  );

  if (!confirmed) return;
  try {
    await toggleSave(id);
    setPosts((items) => items.filter((post) => String(post.id) !== String(id)));
  } catch (error) {
    alert(getApiErrorMessage(error));
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

          {isLoading ? (
            <p role="status">Đang tải bài viết đã lưu…</p>
          ) : loadError ? (
            <div className="saved-empty" role="alert">
              <h2>Không tải được bài viết đã lưu</h2>
              <p>{loadError}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="saved-empty">
              <div className="saved-empty-icon">
                🔖
              </div>

              <h2>
               Không có bài viết đã lưu khả dụng
              </h2>

              <p>
                Những bài viết bạn đã lưu và còn quyền xem sẽ xuất hiện tại đây.
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
                {posts.length} bài viết đã lưu khả dụng

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
                          post.authorId
                        )}
                        className="saved-avatar"
                      >
                        {renderAvatar(
                          post.author,
                          post.authorId
                        )}
                      </Link>

                      <div className="saved-author">
                        <strong>
                          <Link
                            to={getProfileLink(
                              post.author,
                              post.authorId
                            )}
                          >
                            {displayName(
                              post.author,
                              post.authorId
                            )}
                          </Link>
                        </strong>

                        <span>
  {formatPostTime(post.createdAt)}
  {" · "}
  {getPrivacyLabel(post.privacy)}
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
                                original.authorId
                              )}
                              className="saved-avatar"
                            >
                              {renderAvatar(
                                original.author,
                                original.authorId
                              )}
                            </Link>

                            <div className="saved-author">
                              <strong>
                                <Link
                                  to={getProfileLink(
                                    original.author,
                                    original.authorId
                                  )}
                                >
                                  {displayName(
                                    original.author,
                                    original.authorId
                                  )}
                                </Link>
                              </strong>

                              <span>
  {formatPostTime(original.createdAt)}
  {" · "}
  {getPrivacyLabel(original.privacy)}
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
