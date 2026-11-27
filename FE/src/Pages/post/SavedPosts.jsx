
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  MOCK_ACCOUNTS,
  ACCOUNT_EVENT,
  getCurrentAccount,
  readAccountData,
  isUser,
} from "../../utils/mockAccounts";
import {
  FRIEND_EVENT,
  BLOCKED_EVENT,
  getFriendIds,
  isBlockedBetween,
} from "../../utils/friendUtils";

const STORAGE_KEY = "miniSocialPosts";
const POSTS_EVENT = "miniSocialPostsUpdated";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

// LẤY TÀI KHOẢN HIỆN TẠI
function readCurrentAccount() {
  const account = getCurrentAccount();

  return isUser(account) ? account : null;
}

// TÌM TÀI KHOẢN TÁC GIẢ
function findAuthorAccount(name, authorId) {
  return MOCK_ACCOUNTS.find((account) =>
    authorId != null
      ? String(account.id) === String(authorId)
      : account.fullName === name
  );
}

// ĐỌC HỒ SƠ THEO TÀI KHOẢN
function readProfile(account) {
  if (!account) return null;

  try {
    const legacyProfile =
      account.id === 1
        ? JSON.parse(
            localStorage.getItem(PROFILE_KEY) || "{}"
          )
        : {};

    return {
      ...account,
      ...readAccountData(
        PROFILE_KEY,
        legacyProfile,
        account.id
      ),
      id: account.id,
      username: account.username,
      email: account.email,
    };
  } catch {
    return account;
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

// LẤY DANH SÁCH ID ĐÃ LƯU BÀI VIẾT
function getSavedBy(post) {
  if (Array.isArray(post.savedBy)) {
    return post.savedBy.map(String);
  }

  // HỖ TRỢ DỮ LIỆU CŨ CỦA TÀI KHOẢN SỐ 1
  return post.isSaved ? ["1"] : [];
}

// KIỂM TRA QUYỀN XEM BÀI VIẾT
function canViewPost(post, account) {
  if (!post || !account || !isUser(account)) {
    return false;
  }

  const author = findAuthorAccount(
    post.author,
    post.authorId
  );

  // CHỈ HIỂN THỊ BÀI VIẾT CỦA USER
  if (!author || !isUser(author)) {
    return false;
  }

  // CHỦ BÀI VIẾT LUÔN ĐƯỢC XEM
  if (
    String(author.id) === String(account.id)
  ) {
    return true;
  }

  // KIỂM TRA CHẶN HAI CHIỀU
  if (
    isBlockedBetween(account.id, author.id)
  ) {
    return false;
  }

  const privacy = post.privacy || "public";

  // BÀI VIẾT CÔNG KHAI
  if (privacy === "public") {
    return true;
  }

  // BÀI VIẾT DÀNH CHO BẠN BÈ
  if (privacy === "friends") {
    return getFriendIds(account.id)
      .map(String)
      .includes(String(author.id));
  }

  // BÀI VIẾT RIÊNG TƯ
  return false;
}

// LẤY BÀI VIẾT ĐÃ LƯU CỦA TÀI KHOẢN
function readSavedPosts(
  account = readCurrentAccount()
) {
  if (!account || !isUser(account)) {
    return [];
  }

  const allPosts = readPosts();

  return allPosts
    .filter((post) => {
      if (!post) return false;

      // KIỂM TRA ĐÃ LƯU BÀI VIẾT
      const isSaved = getSavedBy(post).includes(
        String(account.id)
      );

      if (!isSaved) return false;

      // KIỂM TRA QUYỀN XEM
      return canViewPost(post, account);
    })
    .map((post) => {
      // BÀI VIẾT THÔNG THƯỜNG
      if (!post.isShared) {
        return post;
      }

      // TÌM BÀI VIẾT GỐC MỚI NHẤT
      const original = allPosts.find(
        (item) =>
          item &&
          String(item.id) ===
            String(post.originalPost?.id)
      );

      // BÀI GỐC KHÔNG CÒN KHẢ DỤNG
      if (
        !original ||
        original.isShared ||
        !canViewPost(original, account)
      ) {
        return null;
      }

      // ĐỒNG BỘ NỘI DUNG BÀI VIẾT GỐC
      return {
        ...post,
        originalPost: original,
      };
    })
    .filter(Boolean);
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
  const [currentAccount, setCurrentAccount] =
    useState(readCurrentAccount);

  const [posts, setPosts] =
    useState(readSavedPosts);

  const [searchText, setSearchText] =
    useState("");

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
      const account = readCurrentAccount();

      setCurrentAccount(account);
      setPosts(readSavedPosts(account));
    };

    refreshData();

    const events = [
  ACCOUNT_EVENT,
  POSTS_EVENT,
  PROFILE_EVENT,
  FRIEND_EVENT,
  BLOCKED_EVENT,
  "storage",
  "focus",
];

    events.forEach((event) => {
      window.addEventListener(
        event,
        refreshData
      );
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(
          event,
          refreshData
        );
      });
    };
  }, []);

 // LẤY HỒ SƠ TÁC GIẢ
const getAuthorProfile = (name, authorId) => {
  const account = findAuthorAccount(
    name,
    authorId
  );

  return account
    ? readProfile(account)
    : {
        fullName: name || "Người dùng",
        avatar: "",
      };
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
  const account = findAuthorAccount(
    name,
    authorId
  );

  if (account) {
    if (
      String(account.id) ===
      String(currentAccount?.id)
    ) {
      return "/profile";
    }

    return `/profile?userId=${account.id}`;
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
const handleUnsave = (id) => {
  const account = getCurrentAccount();

  // KIỂM TRA QUYỀN USER
  if (
    !account ||
    !isUser(account) ||
    String(account.id) !== String(currentAccount?.id)
  ) {
    alert("Bạn không có quyền thực hiện thao tác này!");
    return;
  }

  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn bỏ lưu bài viết này không?"
  );

  if (!confirmed) return;

  const userId = String(account.id);

  try {
    const allPosts = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(allPosts)) {
      alert("Dữ liệu bài viết không hợp lệ!");
      return;
    }

    // KIỂM TRA BÀI VIẾT CÓ ĐƯỢC LƯU KHÔNG
    const target = allPosts.find(
      (post) =>
        post &&
        String(post.id) === String(id)
    );

    if (
      !target ||
      !getSavedBy(target).includes(userId)
    ) {
      setPosts(readSavedPosts(account));

      alert("Bài viết này không còn trong danh sách đã lưu!");
      return;
    }

    // CHỈ BỎ LƯU CỦA TÀI KHOẢN HIỆN TẠI
    const updatedPosts = allPosts.map((post) => {
      if (
        !post ||
        String(post.id) !== String(id)
      ) {
        return post;
      }

      const savedBy = getSavedBy(post);

      return {
        ...post,
        savedBy: savedBy.filter(
          (item) => item !== userId
        ),
      };
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedPosts)
    );

    setPosts(readSavedPosts(account));

    window.dispatchEvent(
      new Event(POSTS_EVENT)
    );

    alert("Đã bỏ lưu bài viết!");
  } catch (error) {
    console.error(
      "Lỗi khi bỏ lưu bài viết:",
      error
    );

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
