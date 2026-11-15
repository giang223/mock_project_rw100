
import { useEffect, useState, useRef } from "react";
import { addNotification } from "../notification/notificationUtils";

const POSTS_KEY = "miniSocialPosts";
const REPORTS_KEY = "miniSocialReports";
const POSTS_EVENT = "miniSocialPostsUpdated";

const CURRENT_USER = "Nguyễn Văn A";

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
    content: "Chúc mọi người một ngày mới thật vui vẻ và nhiều năng lượng nhé! 🌸",
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
    content: "Hôm nay mình vừa hoàn thành một mục tiêu nhỏ. Cố gắng mỗi ngày một chút! 💪",
    createdAt: "Hôm qua",
    isSaved: false,
    isMine: false,
    liked: false,
    likeCount: 25,
    comments: [],
    image: "",
  },
];

const suggestions = [
  { name: "Lan Anh", mutual: 3, color: "blue" },
  { name: "Quang Minh", mutual: 5, color: "orange" },
  { name: "Thu Hà", mutual: 2, color: "purple" },
  { name: "Minh Tuấn", mutual: 4, color: "green" },
  { name: "Hoàng Mai", mutual: 6, color: "pink" },
  { name: "Đức Anh", mutual: 1, color: "blue" },
];

const onlineContacts = [
  { name: "Trần Thị B", color: "green" },
  { name: "Lê Văn C", color: "orange" },
  { name: "Phạm Thu Hà", color: "purple" },
  { name: "Nguyễn Minh", color: "pink" },
  { name: "Hoàng Anh", color: "blue" },
  { name: "Mai Phương", color: "green" },
  { name: "Đức Long", color: "orange" },
  { name: "Thanh Tâm", color: "purple" },
];

const stories = [
  { name: "Thảo Nguyễn", emoji: "👩", className: "story-one" },
  { name: "Minh Hoàng", emoji: "👨", className: "story-two" },
  { name: "Thu Hà", emoji: "👩", className: "story-three" },
  { name: "Quang Minh", emoji: "👨", className: "story-four" },
];

function getPosts() {
  try {
    const saved = localStorage.getItem(POSTS_KEY);

    if (saved === null) return samplePosts;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Không thể đọc bài viết:", error);
    return [];
  }
}

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
  const storiesRef = useRef(null);

  const [posts, setPosts] = useState(getPosts);

  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  const [commentInputs, setCommentInputs] = useState({});
  const [openComments, setOpenComments] = useState({});

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
      window.dispatchEvent(new Event(POSTS_EVENT));
    } catch (error) {
      console.error("Không thể lưu bài viết:", error);
      alert("Không thể lưu bài viết. Có thể bộ nhớ trình duyệt đã đầy!");
    }
  }, [posts]);

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

  // XÓA ẢNH ĐANG CHỌN
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview("");

    const fileInput = document.getElementById("post-image-input");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // ĐĂNG BÀI
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

    setPosts((prev) => [newPost, ...prev]);

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

  // LƯU BÀI VIẾT SAU KHI CHỈNH SỬA
  const handleUpdatePost = (id) => {
    const currentPost = posts.find((post) => post.id === id);

    if (
      !editingContent.trim() &&
      !currentPost?.image &&
      !currentPost?.isShared
    ) {
      alert("Nội dung bài viết không được để trống!");
      return;
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? { ...post, content: editingContent.trim() }
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
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      return;
    }

    setPosts((prev) => prev.filter((post) => post.id !== id));
  };

  // LƯU / BỎ LƯU BÀI VIẾT
  const handleSavePost = (id) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id
          ? { ...post, isSaved: !post.isSaved }
          : post
      )
    );
  };

  // THÍCH BÀI VIẾT
  const handleLike = (id) => {
    const post = posts.find((item) => item.id === id);

    if (!post) return;

    if (!post.liked && !post.isMine) {
      addNotification({
        type: "like",
        name: CURRENT_USER,
        message: "đã thích bài viết của bạn.",
      });
    }

    setPosts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const count = Number(item.likeCount) || 0;

        return {
          ...item,
          liked: !item.liked,
          likeCount: item.liked
            ? Math.max(0, count - 1)
            : count + 1,
        };
      })
    );
  };

  // MỞ / ĐÓNG BÌNH LUẬN
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

  // THÊM BÌNH LUẬN
  const handleAddComment = (id) => {
    const commentText = commentInputs[id]?.trim();

    if (!commentText) {
      alert("Vui lòng nhập nội dung bình luận!");
      return;
    }

    const post = posts.find((item) => item.id === id);

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

    setPosts((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              comments: [
                ...(Array.isArray(item.comments) ? item.comments : []),
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
    setEditingCommentContent(comment.content || "");
  };

  // LƯU BÌNH LUẬN SAU KHI CHỈNH SỬA
  const handleUpdateComment = (postId, commentId) => {
    if (!editingCommentContent.trim()) {
      alert("Nội dung bình luận không được để trống!");
      return;
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: (
                Array.isArray(post.comments) ? post.comments : []
              ).map((comment) =>
                comment.id === commentId
                  ? {
                      ...comment,
                      content: editingCommentContent.trim(),
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
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) {
      return;
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: (
                Array.isArray(post.comments) ? post.comments : []
              ).filter((comment) => comment.id !== commentId),
            }
          : post
      )
    );
  };

  // CHIA SẺ BÀI VIẾT
  const handleShare = (post) => {
    const original = post.originalPost || post;

    if (
      !window.confirm(
        `Bạn có muốn chia sẻ bài viết của ${
          original.author || "người dùng"
        } lên bảng tin không?`
      )
    ) {
      return;
    }

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

    setPosts((prev) => [sharedPost, ...prev]);

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
      `Bạn muốn báo cáo bài viết của ${
        original.author || "người dùng"
      } vì lý do gì?\n\n` +
        "Ví dụ:\n- Nội dung không phù hợp\n- Quấy rối hoặc bắt nạt\n- Thông tin sai sự thật\n- Spam\n- Nội dung vi phạm khác"
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
        JSON.stringify([newReport, ...reports])
      );

      alert("Báo cáo của bạn đã được ghi nhận thành công!");
    } catch (error) {
      console.error("Lỗi khi lưu báo cáo:", error);
      alert("Không thể lưu báo cáo. Vui lòng thử lại!");
    }
  };

  return (
    <div className="feed-content-layout">
      <main className="facebook-feed">

        {/* THANH BẠN ĐANG NGHĨ GÌ - MỘT DÒNG DUY NHẤT */}
        <div className="create-post-card">
          <div className="create-post-top">
            <div className="feed-avatar">A</div>

            <form
              className="create-post-form"
              onSubmit={handleCreatePost}
            >
              <input
                type="text"
                className="create-post-input"
                placeholder="Bạn đang nghĩ gì?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              <button
                type="submit"
                className="create-post-submit"
              >
                Đăng
              </button>
            </form>
          </div>

          <div className="image-upload-row">
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

        {/* STORIES - NẰM DƯỚI THANH ĐĂNG BÀI */}
        <div className="stories-container" ref={storiesRef}>
          <div className="story-card create-story">
            <div className="story-image">A</div>
            <strong>Tạo tin</strong>
          </div>

          {stories.map((story) => (
            <div
              className={`story-card ${story.className}`}
              key={story.name}
            >
              <span>{story.emoji}</span>
              <strong>{story.name}</strong>
            </div>
          ))}

          <button
            type="button"
            className="stories-next-button"
            title="Xem tin tiếp theo"
            onClick={() =>
              storiesRef.current?.scrollBy({
                left: 180,
                behavior: "smooth",
              })
            }
          >
            ❯
          </button>
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

              const originalPost = post.originalPost || post;

              return (
                <article className="facebook-post" key={post.id}>
                  {/* THÔNG TIN NGƯỜI ĐĂNG */}
                  <div className="facebook-post-header">
                    <div className="feed-avatar">
                      {post.author?.charAt(0) || "A"}
                    </div>

                    <div className="post-author-info">
                      <strong>{post.author || "Người dùng"}</strong>
                      <span>
                        {post.createdAt || "Vừa xong"} · 🌍
                      </span>
                    </div>

                    {/* MENU BÀI VIẾT */}
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
                          onClick={() => handleSavePost(post.id)}
                        >
                          {post.isSaved
                            ? "🔖 Bỏ lưu bài viết"
                            : "🔖 Lưu bài viết"}
                        </button>

                        {!post.isMine && (
                          <button
                            type="button"
                            onClick={() => handleReportPost(post)}
                          >
                            🚩 Báo cáo bài viết
                          </button>
                        )}

                        {post.isMine && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(post)}
                            >
                              ✏️ Chỉnh sửa bài viết
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(post.id)}
                            >
                              🗑️ Xóa bài viết
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* NỘI DUNG BÀI VIẾT */}
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
                        {post.content && <p>{post.content}</p>}

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

                  {/* SỐ LƯỢT THÍCH VÀ BÌNH LUẬN */}
                  <div className="post-statistics">
                    <span>
                      👍 {Number(post.likeCount) || 0} lượt thích
                    </span>

                    <span>{comments.length} bình luận</span>
                  </div>

                  {/* CÁC NÚT TƯƠNG TÁC */}
                  <div className="facebook-post-actions">
                    <button
                      type="button"
                      className={post.liked ? "liked" : ""}
                      onClick={() => handleLike(post.id)}
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
                      onClick={() => handleShare(post)}
                    >
                      ↗ Chia sẻ
                    </button>
                  </div>

                  {/* KHU VỰC BÌNH LUẬN */}
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
                                    onClick={handleCancelEditComment}
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
                          onClick={() => handleAddComment(post.id)}
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
        {/* GỢI Ý KẾT BẠN */}
        <section className="right-sidebar-section">
          <div className="right-sidebar-heading">
            <h3>Gợi ý kết bạn</h3>
            <button type="button">Xem tất cả</button>
          </div>

          {suggestions.map((person) => (
            <div
              className="suggestion-item"
              key={person.name}
            >
              <div className={`contact-avatar ${person.color}`}>
                {person.name.charAt(0)}
              </div>

              <div className="suggestion-info">
                <strong>{person.name}</strong>

                <p>{person.mutual} bạn chung</p>

                <button
                  type="button"
                  className="add-friend-button"
                >
                  + Thêm bạn bè
                </button>
              </div>
            </div>
          ))}
        </section>

        <div className="sidebar-divider"></div>

        {/* NGƯỜI ĐANG ONLINE */}
        <section className="right-sidebar-section">
          <div className="right-sidebar-heading">
            <h3>Người đang online</h3>

            <span className="online-count">
              {onlineContacts.length} người
            </span>
          </div>

          {onlineContacts.map((person) => (
            <div
              className="contact-item"
              key={person.name}
            >
              <div className={`contact-avatar ${person.color}`}>
                {person.name.charAt(0)}
              </div>

              <span>{person.name}</span>
              <i></i>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

export default PostFeed;
