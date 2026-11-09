
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { addNotification } from "../notification/notificationUtils";

const POSTS_KEY = "miniSocialPosts";
const NOTIFICATIONS_KEY = "miniSocialNotifications";
const REPORTS_KEY = "miniSocialReports";

const POSTS_EVENT = "miniSocialPostsUpdated";
const NOTIFICATION_EVENT = "miniSocialNotificationsUpdated";

// NGƯỜI DÙNG DEMO HIỆN TẠI
const CURRENT_USER = "Nguyễn Văn A";

// DỮ LIỆU BÀI VIẾT MẪU
const samplePosts = [
  {
    id: 1,
    author: "Nguyễn Văn A",
    content:
      "Xin chào mọi người! Đây là bài viết đầu tiên của mình trên MiniSocial. Rất vui được kết nối với tất cả mọi người!",
    createdAt: "2 giờ trước",
    isSaved: false,
    isMine: true,
    liked: false,
    likeCount: 12,
    comments: [],
    image: "",
  },
  {
    id: 2,
    author: "Trần Thị B",
    content:
      "Chúc mọi người một ngày mới thật vui vẻ và nhiều năng lượng nhé! 🌸",
    createdAt: "3 giờ trước",
    isSaved: false,
    isMine: false,
    liked: false,
    likeCount: 8,
    comments: [],
    image: "",
  },
  {
    id: 3,
    author: "Lê Văn C",
    content:
      "Hôm nay mình vừa hoàn thành một mục tiêu nhỏ. Cố gắng mỗi ngày một chút! 💪",
    createdAt: "Hôm qua",
    isSaved: false,
    isMine: false,
    liked: false,
    likeCount: 25,
    comments: [],
    image: "",
  },
];

// ĐỌC BÀI VIẾT
function getPosts() {
  try {
    const saved = localStorage.getItem(POSTS_KEY);

    if (saved === null) {
      return samplePosts;
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Không thể đọc bài viết:", error);
    return [];
  }
}

// ĐỌC SỐ THÔNG BÁO CHƯA ĐỌC
function getUnreadCount() {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    const notifications = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(notifications)) {
      return 0;
    }

    return notifications.filter(
      (item) => item && !item.read
    ).length;
  } catch (error) {
    console.error("Không thể đọc thông báo:", error);
    return 0;
  }
}

// ĐỌC DANH SÁCH BÁO CÁO
function getReports() {
  try {
    const saved = localStorage.getItem(REPORTS_KEY);
    const reports = saved ? JSON.parse(saved) : [];

    return Array.isArray(reports) ? reports : [];
  } catch (error) {
    console.error("Không thể đọc báo cáo:", error);
    return [];
  }
}

function PostFeed() {
  // SỐ THÔNG BÁO CHƯA ĐỌC
  const [unreadCount, setUnreadCount] = useState(getUnreadCount);

  // DANH SÁCH BÀI VIẾT
  const [posts, setPosts] = useState(getPosts);

  // ĐĂNG BÀI
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // CHỈNH SỬA BÀI VIẾT
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  // BÌNH LUẬN
  const [commentInputs, setCommentInputs] = useState({});
  const [openComments, setOpenComments] = useState({});

  // CHỈNH SỬA BÌNH LUẬN
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  // LƯU BÀI VIẾT VÀ ĐỒNG BỘ VỚI TRANG KHÁC
  useEffect(() => {
    try {
      localStorage.setItem(
        POSTS_KEY,
        JSON.stringify(posts)
      );

      window.dispatchEvent(
        new Event(POSTS_EVENT)
      );
    } catch (error) {
      console.error("Không thể lưu bài viết:", error);

      alert(
        "Không thể lưu bài viết. Có thể bộ nhớ trình duyệt đã đầy!"
      );
    }
  }, [posts]);

  // CẬP NHẬT SỐ THÔNG BÁO CHƯA ĐỌC
  useEffect(() => {
    const updateUnreadCount = () => {
      setUnreadCount(getUnreadCount());
    };

    updateUnreadCount();

    const handleStorage = (event) => {
      if (
        event.key === NOTIFICATIONS_KEY ||
        event.key === null
      ) {
        updateUnreadCount();
      }
    };

    window.addEventListener(
      NOTIFICATION_EVENT,
      updateUnreadCount
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_EVENT,
        updateUnreadCount
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  // CHỌN ẢNH
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file hình ảnh!");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh không được vượt quá 5MB!");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setSelectedImage(file);
        setImagePreview(reader.result);
      }
    };

    reader.onerror = () => {
      alert("Không thể đọc ảnh. Vui lòng thử lại!");
    };

    reader.readAsDataURL(file);
  };

  // XÓA ẢNH ĐÃ CHỌN
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview("");
  };

  // ĐĂNG BÀI VIẾT
  const handleCreatePost = (e) => {
    e.preventDefault();

    if (!content.trim() && !selectedImage) {
      alert("Vui lòng nhập nội dung hoặc chọn hình ảnh!");
      return;
    }

    const newPost = {
      id: Date.now(),
      author: CURRENT_USER,
      content: content.trim(),
      image: imagePreview,
      createdAt: "Vừa xong",
      isSaved: false,
      isMine: true,
      liked: false,
      likeCount: 0,
      comments: [],
    };

    setPosts((prevPosts) => [
      newPost,
      ...prevPosts,
    ]);

    setContent("");
    setSelectedImage(null);
    setImagePreview("");

    const fileInput = document.getElementById("post-image-input");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // CHỈNH SỬA BÀI VIẾT
  const handleEdit = (post) => {
    setEditingId(post.id);
    setEditingContent(post.content || "");
  };

  // LƯU CHỈNH SỬA BÀI VIẾT
  const handleUpdatePost = (id) => {
    const currentPost = posts.find(
      (post) => post.id === id
    );

    if (
      !editingContent.trim() &&
      !currentPost?.image &&
      !currentPost?.isShared
    ) {
      alert("Nội dung bài viết không được để trống!");
      return;
    }

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              content: editingContent.trim(),
            }
          : post
      )
    );

    setEditingId(null);
    setEditingContent("");
  };

  // HỦY CHỈNH SỬA BÀI VIẾT
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  // XÓA BÀI VIẾT
  const handleDelete = (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa bài viết này không?"
    );

    if (!confirmed) return;

    setPosts((prevPosts) =>
      prevPosts.filter((post) => post.id !== id)
    );
  };

  // LƯU HOẶC BỎ LƯU BÀI VIẾT
  const handleSavePost = (id) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              isSaved: !post.isSaved,
            }
          : post
      )
    );
  };

  // THÍCH HOẶC BỎ THÍCH
  const handleLike = (id) => {
    const post = posts.find(
      (item) => item.id === id
    );

    if (!post) return;

    if (!post.liked && !post.isMine) {
      addNotification({
        type: "like",
        name: CURRENT_USER,
        message: "đã thích bài viết của bạn.",
      });
    }

    setPosts((prevPosts) =>
      prevPosts.map((item) => {
        if (item.id !== id) return item;

        const currentLikeCount =
          Number(item.likeCount) || 0;

        return {
          ...item,
          liked: !item.liked,
          likeCount: item.liked
            ? Math.max(0, currentLikeCount - 1)
            : currentLikeCount + 1,
        };
      })
    );
  };

  // HIỆN HOẶC ẨN BÌNH LUẬN
  const handleToggleComments = (id) => {
    setOpenComments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // NHẬP BÌNH LUẬN
  const handleCommentChange = (id, value) => {
    setCommentInputs((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // GỬI BÌNH LUẬN
  const handleAddComment = (id) => {
    const commentText =
      commentInputs[id]?.trim();

    if (!commentText) {
      alert("Vui lòng nhập nội dung bình luận!");
      return;
    }

    const post = posts.find(
      (item) => item.id === id
    );

    if (!post) return;

    if (!post.isMine) {
      addNotification({
        type: "comment",
        name: CURRENT_USER,
        message: `đã bình luận: ${commentText}`,
      });
    }

    const newComment = {
      id: Date.now(),
      author: CURRENT_USER,
      content: commentText,
    };

    setPosts((prevPosts) =>
      prevPosts.map((item) =>
        item.id === id
          ? {
              ...item,
              comments: [
                ...(Array.isArray(item.comments)
                  ? item.comments
                  : []),
                newComment,
              ],
            }
          : item
      )
    );

    setCommentInputs((prev) => ({
      ...prev,
      [id]: "",
    }));
  };

  // CHỈNH SỬA BÌNH LUẬN
  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);

    setEditingCommentContent(
      comment.content || ""
    );
  };

  // LƯU BÌNH LUẬN ĐÃ CHỈNH SỬA
  const handleUpdateComment = (postId, commentId) => {
    if (!editingCommentContent.trim()) {
      alert("Nội dung bình luận không được để trống!");
      return;
    }

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: (
                Array.isArray(post.comments)
                  ? post.comments
                  : []
              ).map((comment) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      content:
                        editingCommentContent.trim(),
                    }
                  : comment
              ),
            }
          : post
      )
    );

    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  // HỦY CHỈNH SỬA BÌNH LUẬN
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  // XÓA BÌNH LUẬN
  const handleDeleteComment = (postId, commentId) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa bình luận này không?"
    );

    if (!confirmed) return;

    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: (
                Array.isArray(post.comments)
                  ? post.comments
                  : []
              ).filter(
                (comment) => comment.id !== commentId
              ),
            }
          : post
      )
    );
  };

  // CHIA SẺ BÀI VIẾT
  const handleShare = (post) => {
    const original = post.originalPost || post;

    const confirmed = window.confirm(
      `Bạn có muốn chia sẻ bài viết của ${original.author || "người dùng"} lên bảng tin không?`
    );

    if (!confirmed) return;

    const sharedPost = {
      id: Date.now(),
      author: CURRENT_USER,
      content: "",
      image: "",
      createdAt: "Vừa xong",
      isSaved: false,
      isMine: true,
      liked: false,
      likeCount: 0,
      comments: [],
      isShared: true,
      originalPost: {
        id: original.id,
        author: original.author,
        content: original.content || "",
        image: original.image || "",
        createdAt: original.createdAt || "Vừa xong",
      },
    };

    setPosts((prevPosts) => [
      sharedPost,
      ...prevPosts,
    ]);

    if (!post.isMine) {
      addNotification({
        type: "share",
        name: CURRENT_USER,
        message: "đã chia sẻ bài viết của bạn.",
      });
    }

    alert("Chia sẻ bài viết thành công!");
  };

  // BÁO CÁO BÀI VIẾT
  const handleReportPost = (post) => {
    const original = post.originalPost || post;

    const reason = window.prompt(
      `Bạn muốn báo cáo bài viết của ${original.author || "người dùng"} vì lý do gì?\n\n` +
        "Ví dụ:\n" +
        "- Nội dung không phù hợp\n" +
        "- Quấy rối hoặc bắt nạt\n" +
        "- Thông tin sai sự thật\n" +
        "- Spam\n" +
        "- Nội dung vi phạm khác"
    );

    if (reason === null) return;

    if (!reason.trim()) {
      alert("Vui lòng nhập lý do báo cáo!");
      return;
    }

    try {
      const reports = getReports();

      const alreadyReported = reports.some(
        (report) =>
          report.postId === post.id &&
          report.reporter === CURRENT_USER
      );

      if (alreadyReported) {
        alert("Bạn đã báo cáo bài viết này trước đó!");
        return;
      }

      const newReport = {
        id: Date.now(),
        postId: post.id,
        postAuthor: original.author,
        postContent: original.content || "",
        postImage: original.image || "",
        reporter: CURRENT_USER,
        reason: reason.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        REPORTS_KEY,
        JSON.stringify([
          newReport,
          ...reports,
        ])
      );

      alert("Báo cáo của bạn đã được ghi nhận thành công!");
    } catch (error) {
      console.error("Lỗi khi lưu báo cáo:", error);
      alert("Không thể lưu báo cáo. Vui lòng thử lại!");
    }
  };

  return (
    <div className="facebook-layout">

      {/* THANH ĐIỀU HƯỚNG */}
      <header className="facebook-topbar">
        <div className="topbar-left">
          <Link to="/feed" className="facebook-logo">
            MiniSocial
          </Link>

          <input
            type="text"
            className="topbar-search"
            placeholder="Tìm kiếm trên MiniSocial"
          />
        </div>

        <nav className="topbar-center">
          <Link
            to="/feed"
            className="topbar-item active"
          >
            🏠
          </Link>

          <Link
            to="/profile"
            className="topbar-item"
          >
            👥
          </Link>

          <Link
            to="/feed"
            className="topbar-item"
          >
            📰
          </Link>
        </nav>

        <div className="topbar-right">
          <Link
            to="/notifications"
            className="topbar-notification"
          >
            🔔

            {unreadCount > 0 && (
              <span className="topbar-notification-count">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            className="topbar-avatar"
          >
            A
          </Link>
        </div>
      </header>

      {/* NỘI DUNG 3 CỘT */}
      <div className="facebook-main">

        {/* CỘT TRÁI */}
        <aside className="facebook-sidebar">
          <Link
            to="/profile"
            className="sidebar-user"
          >
            <span className="sidebar-avatar">A</span>
            <strong>{CURRENT_USER}</strong>
          </Link>

          <Link
            to="/feed"
            className="sidebar-menu active"
          >
            <span>🏠</span> Trang chủ
          </Link>

          <Link
            to="/search-users"
            className="sidebar-menu"
          >
            <span>🔍</span> Tìm kiếm người dùng
          </Link>

          <Link
            to="/friend-requests"
            className="sidebar-menu"
          >
            <span>👥</span> Bạn bè
          </Link>

          <Link
            to="/friend-suggestions"
            className="sidebar-menu"
          >
            <span>✨</span> Gợi ý kết bạn
          </Link>

          <Link
            to="/blocked-users"
            className="sidebar-menu"
          >
            <span>🚫</span> Người dùng đã chặn
          </Link>

          <div className="sidebar-menu">
            <span>👨‍👩‍👧‍👦</span> Nhóm
          </div>

          <Link
            to="/saved-posts"
            className="sidebar-menu"
          >
            <span>🔖</span> Bài viết đã lưu
          </Link>

          <Link
            to="/notifications"
            className="sidebar-menu"
          >
            <span>🔔</span> Thông báo
          </Link>

          <Link
            to="/profile"
            className="sidebar-menu"
          >
            <span>👤</span> Trang cá nhân
          </Link>

          <Link
            to="/change-password"
            className="sidebar-menu"
          >
            <span>🔒</span> Đổi mật khẩu
          </Link>

          <div className="sidebar-divider"></div>

          <p className="sidebar-heading">
            Lối tắt của bạn
          </p>

          <div className="sidebar-menu">
            <span>💬</span> Tin nhắn
          </div>

          <div className="sidebar-menu">
            <span>🌐</span> Khám phá
          </div>
        </aside>

        {/* CỘT GIỮA */}
        <main className="facebook-feed">

          {/* STORIES */}
          <div className="stories-container">
            <div className="story-card create-story">
              <div className="story-image">A</div>
              <strong>Tạo tin</strong>
            </div>

            <div className="story-card story-one">
              <span>👩</span>
              <strong>Thảo Nguyễn</strong>
            </div>

            <div className="story-card story-two">
              <span>👨</span>
              <strong>Minh Hoàng</strong>
            </div>

            <div className="story-card story-three">
              <span>👩</span>
              <strong>Thu Hà</strong>
            </div>
          </div>

          {/* TẠO BÀI VIẾT */}
          <div className="create-post-card">
            <div className="create-post-top">
              <div className="feed-avatar">A</div>

              <form onSubmit={handleCreatePost}>
                <textarea
                  placeholder="Nguyễn Văn A ơi, bạn đang nghĩ gì thế?"
                  value={content}
                  onChange={(e) =>
                    setContent(e.target.value)
                  }
                  rows="2"
                />

                <div className="create-post-bottom">
                  <span>🌍 Công khai</span>

                  <button type="submit">
                    Đăng bài
                  </button>
                </div>
              </form>
            </div>

            <div className="create-post-options">
              <label className="create-option">
                📷 Ảnh/video

                <input
                  id="post-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  hidden
                />
              </label>

              <div className="create-option">
                😊 Cảm xúc
              </div>

              <div className="create-option">
                📍 Check in
              </div>
            </div>

            {imagePreview && (
              <div className="image-preview-container">
                <button
                  type="button"
                  className="remove-image-button"
                  onClick={handleRemoveImage}
                >
                  ✕
                </button>

                <img
                  src={imagePreview}
                  alt="Ảnh xem trước"
                  className="image-preview"
                />
              </div>
            )}
          </div>

          {/* DANH SÁCH BÀI VIẾT */}
          <div className="post-list">
            {posts.length === 0 ? (
              <div className="empty-post">
                Chưa có bài viết nào. Hãy chia sẻ điều gì đó nhé!
              </div>
            ) : (
              posts.map((post) => {
                const comments = Array.isArray(post.comments)
                  ? post.comments
                  : [];

                const originalPost =
                  post.originalPost || post;

                return (
                  <article
                    className="facebook-post"
                    key={post.id}
                  >

                    {/* HEADER BÀI VIẾT */}
                    <div className="facebook-post-header">
                      <div className="feed-avatar">
                        {post.author?.charAt(0) || "A"}
                      </div>

                      <div className="post-author-info">
                        <strong>
                          {post.author || "Người dùng"}
                        </strong>

                        <span>
                          {post.createdAt || "Vừa xong"} · 🌍
                        </span>
                      </div>

                      {/* MENU */}
                      <div className="post-menu">
                        <button
                          type="button"
                          className="post-menu-button"
                        >
                          ⋯
                        </button>

                        <div className="post-dropdown">
                          <button
                            type="button"
                            onClick={() =>
                              handleSavePost(post.id)
                            }
                          >
                            {post.isSaved
                              ? "🔖 Bỏ lưu bài viết"
                              : "🔖 Lưu bài viết"}
                          </button>

                          {!post.isMine && (
                            <button
                              type="button"
                              onClick={() =>
                                handleReportPost(post)
                              }
                            >
                              🚩 Báo cáo bài viết
                            </button>
                          )}

                          {post.isMine && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleEdit(post)
                                }
                              >
                                ✏️ Chỉnh sửa bài viết
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(post.id)
                                }
                              >
                                🗑️ Xóa bài viết
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* NỘI DUNG */}
                    <div className="facebook-post-content">
                      {editingId === post.id ? (
                        <div className="edit-post-area">
                          <textarea
                            value={editingContent}
                            onChange={(e) =>
                              setEditingContent(e.target.value)
                            }
                            rows="4"
                          />

                          <div className="edit-post-actions">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdatePost(post.id)
                              }
                            >
                              Lưu thay đổi
                            </button>

                            <button
                              type="button"
                              onClick={handleCancelEdit}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {post.content && (
                            <p>{post.content}</p>
                          )}

                          {post.isShared && post.originalPost && (
                            <div className="shared-post-content">
                              <div className="shared-post-author">
                                <div className="shared-post-avatar">
                                  {originalPost.author?.charAt(0) || "A"}
                                </div>

                                <div>
                                  <strong>
                                    {originalPost.author || "Người dùng"}
                                  </strong>

                                  <span>
                                    {originalPost.createdAt || "Vừa xong"} · 🌍
                                  </span>
                                </div>
                              </div>

                              {originalPost.content && (
                                <p>{originalPost.content}</p>
                              )}

                              {originalPost.image && (
                                <img
                                  src={originalPost.image}
                                  alt="Ảnh bài viết được chia sẻ"
                                  className="facebook-post-image"
                                />
                              )}
                            </div>
                          )}

                          {!post.isShared && post.image && (
                            <img
                              src={post.image}
                              alt="Ảnh bài viết"
                              className="facebook-post-image"
                            />
                          )}
                        </>
                      )}
                    </div>

                    {/* THỐNG KÊ */}
                    <div className="post-statistics">
                      <span>
                        👍 {Number(post.likeCount) || 0} lượt thích
                      </span>

                      <span>
                        {comments.length} bình luận
                      </span>
                    </div>

                    {/* TƯƠNG TÁC */}
                    <div className="facebook-post-actions">
                      <button
                        type="button"
                        className={post.liked ? "liked" : ""}
                        onClick={() =>
                          handleLike(post.id)
                        }
                      >
                        👍 {post.liked ? "Đã thích" : "Thích"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleComments(post.id)
                        }
                      >
                        💬 Bình luận
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleShare(post)
                        }
                      >
                        ↗ Chia sẻ
                      </button>
                    </div>

                    {/* BÌNH LUẬN */}
                    {openComments[post.id] && (
                      <div className="facebook-comments">

                        {comments.map((comment) => (
                          <div
                            className="comment-item"
                            key={comment.id}
                          >
                            <div className="comment-avatar">
                              {comment.author?.charAt(0) || "A"}
                            </div>

                            <div className="comment-content">
                              <strong>
                                {comment.author || "Người dùng"}
                              </strong>

                              {editingCommentId === comment.id ? (
                                <div className="edit-comment-area">
                                  <input
                                    type="text"
                                    value={editingCommentContent}
                                    onChange={(e) =>
                                      setEditingCommentContent(
                                        e.target.value
                                      )
                                    }
                                    autoFocus
                                  />

                                  <div className="edit-comment-actions">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateComment(
                                          post.id,
                                          comment.id
                                        )
                                      }
                                    >
                                      Lưu
                                    </button>

                                    <button
                                      type="button"
                                      onClick={
                                        handleCancelEditComment
                                      }
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p>{comment.content}</p>
                              )}

                              {comment.author === CURRENT_USER &&
                                editingCommentId !== comment.id && (
                                  <div className="comment-actions">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleEditComment(comment)
                                      }
                                    >
                                      Chỉnh sửa
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteComment(
                                          post.id,
                                          comment.id
                                        )
                                      }
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                )}
                            </div>
                          </div>
                        ))}

                        {/* NHẬP BÌNH LUẬN */}
                        <div className="comment-input-area">
                          <input
                            type="text"
                            placeholder="Viết bình luận..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              handleCommentChange(
                                post.id,
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleAddComment(post.id)
                            }
                          >
                            Gửi
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </main>

        {/* CỘT PHẢI */}
        <aside className="facebook-right-sidebar">
          <h3>Người liên hệ</h3>

          <div className="contact-item">
            <div className="contact-avatar green">T</div>
            <span>Trần Thị B</span>
            <i></i>
          </div>

          <div className="contact-item">
            <div className="contact-avatar orange">M</div>
            <span>Lê Văn C</span>
            <i></i>
          </div>

          <div className="contact-item">
            <div className="contact-avatar purple">H</div>
            <span>Phạm Thu Hà</span>
            <i></i>
          </div>

          <div className="contact-item">
            <div className="contact-avatar pink">N</div>
            <span>Nguyễn Minh</span>
            <i></i>
          </div>

          <div className="sidebar-divider"></div>

          <h3>Gợi ý kết bạn</h3>

          <div className="suggestion-item">
            <div className="contact-avatar blue">L</div>

            <div>
              <strong>Lan Anh</strong>
              <p>3 bạn chung</p>
            </div>
          </div>

          <div className="suggestion-item">
            <div className="contact-avatar orange">Q</div>

            <div>
              <strong>Quang Minh</strong>
              <p>5 bạn chung</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PostFeed;
