
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addNotification } from "../notification/notificationUtils";

const POSTS_KEY = "miniSocialPosts";
const REPORTS_KEY = "miniSocialReports";
const POSTS_EVENT = "miniSocialPostsUpdated";

const CURRENT_USER = "Nguyễn Văn A";
const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

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

// ĐỌC DANH SÁCH STORY
function getStories() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("miniSocialStories") || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved.filter(
      (story) =>
        !story.expiresAt ||
        new Date(story.expiresAt).getTime() > Date.now()
    );
  } catch {
    return [];
  }
}

function formatPostTime(value) {
  if (!value) return "Vừa xong";

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

function PostFeed() {
  const [profile, setProfile] = useState(readProfile);

useEffect(() => {
  const refreshProfile = () => {
    setProfile(readProfile());
  };

  refreshProfile();

  window.addEventListener(PROFILE_EVENT, refreshProfile);
  window.addEventListener("storage", refreshProfile);
  window.addEventListener("focus", refreshProfile);

  return () => {
    window.removeEventListener(PROFILE_EVENT, refreshProfile);
    window.removeEventListener("storage", refreshProfile);
    window.removeEventListener("focus", refreshProfile);
  };
}, []);

const displayName = (name, isMine = false) => {
  if (isMine || name === CURRENT_USER) {
    return profile.fullName || CURRENT_USER;
  }

  return name || "Người dùng";
};

const renderAvatar = (name, isMine = false) => {
  if ((isMine || name === CURRENT_USER) && profile.avatar) {
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
  // DANH SÁCH BÀI VIẾT
const [posts, setPosts] = useState(getPosts);

// DANH SÁCH STORY
const [stories, setStories] = useState(getStories);

// XEM STORY
const [activeStoryId, setActiveStoryId] = useState(null);

const visibleStories = stories.filter(
  (story) =>
    story.isMine ||
    story.name === "Bạn" ||
    story.privacy !== "private"
);

const activeStoryIndex = visibleStories.findIndex(
  (story) => story.id === activeStoryId
);

const activeStory =
  visibleStories[activeStoryIndex] || null;

// MỞ STORY
const handleViewStory = (story) => {
  setActiveStoryId(story.id);

  try {
    const updated = getStories().map((item) =>
      item.id === story.id
        ? { ...item, seen: true }
        : item
    );

    localStorage.setItem(
      "miniSocialStories",
      JSON.stringify(updated)
    );

    setStories(updated);

    window.dispatchEvent(
      new Event("miniSocialStoriesUpdated")
    );
  } catch (error) {
    console.error("Không thể cập nhật trạng thái tin:", error);
  }
};

// ĐÓNG STORY
const handleCloseStory = () => {
  setActiveStoryId(null);
};

// XEM STORY TRƯỚC
const handlePreviousStory = () => {
  if (activeStoryIndex > 0) {
    handleViewStory(
      visibleStories[activeStoryIndex - 1]
    );
  }
};

// XEM STORY TIẾP THEO
const handleNextStory = () => {
  if (activeStoryIndex < visibleStories.length - 1) {
    handleViewStory(
      visibleStories[activeStoryIndex + 1]
    );
  } else {
    handleCloseStory();
  }
};

// ĐỒNG BỘ STORY
useEffect(() => {
  const refreshStories = () => {
    setStories(getStories());
  };

  refreshStories();

  window.addEventListener(
    "miniSocialStoriesUpdated",
    refreshStories
  );

  window.addEventListener(
    "storage",
    refreshStories
  );

  const timer = setInterval(refreshStories, 1000);

  return () => {
    clearInterval(timer);

    window.removeEventListener(
      "miniSocialStoriesUpdated",
      refreshStories
    );

    window.removeEventListener(
      "storage",
      refreshStories
    );
  };
}, []);

  // ĐĂNG BÀI
  const [content, setContent] = useState("");
  // CẢM XÚC VÀ CHECK IN
const [feeling, setFeeling] = useState("");
const [location, setLocation] = useState("");
const [showFeelingPicker, setShowFeelingPicker] = useState(false);
const [showLocationPicker, setShowLocationPicker] = useState(false);

const feelings = [
  "😊 Vui vẻ",
  "❤️ Hạnh phúc",
  "🥰 Được yêu thương",
  "😢 Buồn",
  "😴 Mệt mỏi",
  "😡 Tức giận",
  "😎 Tuyệt vời",
  "🤩 Hào hứng",
  "😌 Thư giãn",
  "😔 Thất vọng",
  "😇 Biết ơn",
  "😋 Đói bụng",
];
  const [imagePreviews, setImagePreviews] = useState([]);
  const [editingImages, setEditingImages] = useState([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  // CHIA SẺ BÀI VIẾT
const [sharingPost, setSharingPost] = useState(null);
const [shareContent, setShareContent] = useState("");
// BÁO CÁO BÀI VIẾT
const [reportingPost, setReportingPost] = useState(null);
const [reportReason, setReportReason] = useState("");
const [reportDetail, setReportDetail] = useState("");

const reportReasons = [
  "Nội dung không phù hợp",
  "Quấy rối hoặc bắt nạt",
  "Thông tin sai sự thật",
  "Spam hoặc quảng cáo",
  "Nội dung bạo lực",
  "Lừa đảo",
  "Vi phạm quyền riêng tư",
  "Lý do khác",
];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // CHỈNH SỬA BÀI VIẾT
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  // BÌNH LUẬN
  const [commentInputs, setCommentInputs] = useState({});
  const [openComments, setOpenComments] = useState({});

  // CHỈNH SỬA BÌNH LUẬN
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  // Đồng bộ nội dung popup với danh sách bài viết sau khi thêm/sửa/xóa bình luận.
  useEffect(() => {
    if (!selectedPost) return;
    const latest = posts.find((post) => String(post.id) === String(selectedPost.id));
    if (latest) setSelectedPost(latest);
    else setSelectedPost(null);
  }, [posts]);

  useEffect(() => {
    const targetId = searchParams.get("postId");
    if (!targetId) return;
    const target = posts.find((post) => String(post.id) === targetId);
    if (target) setSelectedPost(target);
  }, [searchParams, posts]);

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

  // ĐỌC NHIỀU ẢNH (TỐI ĐA 10 ẢNH/BÀI THEO SRS)
  const readImageFiles = (files, callback, current = []) => {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (selected.length !== Array.from(files || []).length) {
      alert("Chỉ được chọn file hình ảnh!");
    }
    if (selected.some((file) => file.size > 5 * 1024 * 1024)) {
      alert("Mỗi ảnh không được vượt quá 5MB!");
      return;
    }
    if (current.length + selected.length > 10) {
      alert("Mỗi bài viết được đính kèm tối đa 10 ảnh!");
      return;
    }
    Promise.all(selected.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }))).then((images) => callback([...current, ...images.filter(Boolean)]))
      .catch(() => alert("Không thể đọc ảnh. Vui lòng thử lại!"));
  };

  const handleImageChange = (e) => {
    readImageFiles(e.target.files, setImagePreviews, imagePreviews);
    e.target.value = "";
  };

  const handleRemoveImage = (index) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ĐĂNG BÀI VIẾT
  const handleCreatePost = (e) => {
    e.preventDefault();

    if (
  !content.trim() &&
  imagePreviews.length === 0 &&
  !feeling &&
  !location.trim()
) {
      alert("Vui lòng nhập nội dung hoặc chọn hình ảnh!");
      return;
    }

    const newPost = {
      id: Date.now(),
      author: CURRENT_USER,
      content: content.trim(),
      feeling: feeling,
location: location.trim(),
      image: imagePreviews[0] || "",
      images: imagePreviews,
      createdAt: new Date().toISOString(),
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
    setImagePreviews([]);
    setFeeling("");
    setLocation("");
    setShowFeelingPicker(false);
    setShowLocationPicker(false);
    setIsComposerOpen(false);
    const fileInput = document.getElementById("post-image-input");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // CHỈNH SỬA BÀI VIẾT
  const handleEdit = (post) => {
    setEditingId(post.id);
    setEditingContent(post.content || "");
    setEditingImages(post.images || (post.image ? [post.image] : []));
  };

  // LƯU CHỈNH SỬA BÀI VIẾT
  const handleUpdatePost = (id) => {
    const currentPost = posts.find(
      (post) => post.id === id
    );

    if (
  !editingContent.trim() &&
  editingImages.length === 0 &&
  !currentPost?.isShared &&
  !currentPost?.feeling &&
  !currentPost?.location?.trim()
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
              images: editingImages,
              image: editingImages[0] || "",
            }
          : post
      )
    );

    setEditingId(null);
    setEditingContent("");
    setEditingImages([]);
  };

  // HỦY CHỈNH SỬA BÀI VIẾT
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
    setEditingImages([]);
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
        postId: id,
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
    const commentText = commentInputs[id]?.trim();

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
        postId: id,
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
  // MỞ POPUP CHIA SẺ
const handleShare = (post) => {
  setSharingPost(post);
  setShareContent("");
};

// ĐÓNG POPUP CHIA SẺ
const handleCancelShare = () => {
  setSharingPost(null);
  setShareContent("");
};

// XÁC NHẬN CHIA SẺ
const handleConfirmShare = () => {
  if (!sharingPost) return;

  const original = sharingPost.originalPost || sharingPost;
  const originalImages = getPostImages(original);

  const sharedPost = {
    id: Date.now(),
    author: CURRENT_USER,
    content: shareContent.trim(),
    image: "",
    images: [],
    createdAt: new Date().toISOString(),
    isSaved: false,
    isMine: true,
    liked: false,
    likeCount: 0,
    comments: [],
    isShared: true,

    originalPost: {
      id: original.id,
      author: original.author,
      isMine: original.isMine || original.author === CURRENT_USER,
      content: original.content || "",
      image: originalImages[0] || "",
      images: originalImages,
      createdAt: original.createdAt || "Vừa xong",
    },
  };

  setPosts((prevPosts) => [
    sharedPost,
    ...prevPosts,
  ]);

  if (original.author !== CURRENT_USER && !original.isMine) {
    addNotification({
      type: "share",
      name: CURRENT_USER,
isMine: true,
      message: "đã chia sẻ bài viết của bạn.",
      postId: original.id,
    });
  }

  handleCancelShare();

  alert("Chia sẻ bài viết thành công!");
};

  
// MỞ POPUP BÁO CÁO
const handleReportPost = (post) => {
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

  setReportingPost(post);
  setReportReason("");
  setReportDetail("");
};

// ĐÓNG POPUP BÁO CÁO
const handleCancelReport = () => {
  setReportingPost(null);
  setReportReason("");
  setReportDetail("");
};

// GỬI BÁO CÁO
const handleConfirmReport = () => {
  if (!reportingPost) return;

  if (!reportReason) {
    alert("Vui lòng chọn lý do báo cáo!");
    return;
  }

  if (
    reportReason === "Lý do khác" &&
    !reportDetail.trim()
  ) {
    alert("Vui lòng nhập lý do cụ thể!");
    return;
  }

  try {
    const reports = getReports();

    const alreadyReported = reports.some(
      (report) =>
        report.postId === reportingPost.id &&
        report.reporter === CURRENT_USER
    );

    if (alreadyReported) {
      alert("Bạn đã báo cáo bài viết này trước đó!");
      handleCancelReport();
      return;
    }

    const original =
      reportingPost.originalPost || reportingPost;

    const newReport = {
      id: Date.now(),
      postId: reportingPost.id,
      postAuthor: original.author,
      postContent: original.content || "",
      postImage: original.image || "",
      reporter: CURRENT_USER,

      reason: reportDetail.trim()
        ? `${reportReason}: ${reportDetail.trim()}`
        : reportReason,

      status: "pending",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
  REPORTS_KEY,
  JSON.stringify([newReport, ...reports])
);

window.dispatchEvent(
  new Event("miniSocialReportsUpdated")
);

handleCancelReport();

    alert("Báo cáo của bạn đã được ghi nhận thành công!");
  } catch (error) {
    console.error("Lỗi khi lưu báo cáo:", error);

    alert("Không thể lưu báo cáo. Vui lòng thử lại!");
  }
};

  const openPostDetail = (post) => setSelectedPost(post);
  const goToProfile = (name) => navigate(`/profile?user=${encodeURIComponent(name || "Nguyễn Văn A")}`);
  const getPostImages = (post) => post.images?.length ? post.images : (post.image ? [post.image] : []);

  return (
    <div className="feed-content-layout">
      {/* CỘT GIỮA */}
      <main className="facebook-feed">

        
{/* TẠO BÀI VIẾT */}
<div className="create-post-card">

  {/* THANH ĐĂNG BÀI THU GỌN */}
  <div className="create-post-compact">
    <div className="feed-avatar">
  {renderAvatar(CURRENT_USER, true)}
</div>

    <button
      type="button"
      className="create-post-trigger"
      onClick={() => setIsComposerOpen(true)}
    >
{profile.fullName} ơi, bạn đang nghĩ gì thế?    </button>
  </div>

  {/* CÁC LỰA CHỌN */}
  <div className="create-post-options">
    <label
      className="create-option"
      onClick={() => setIsComposerOpen(true)}
    >
      📷 Ảnh/video
      <input
        id="post-image-input"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleImageChange(e);
          setIsComposerOpen(true);
        }}
        hidden
      />
    </label>

    <button
  type="button"
  className="create-option"
  onClick={() => {
    setIsComposerOpen(true);
    setShowFeelingPicker(true);
    setShowLocationPicker(false);
  }}
>
  😊 Cảm xúc
</button>

<button
  type="button"
  className="create-option"
  onClick={() => {
    setIsComposerOpen(true);
    setShowLocationPicker(true);
    setShowFeelingPicker(false);
  }}
>
  📍 Check in
</button>
  </div>

  {/* KHUNG SOẠN BÀI MỞ RỘNG */}
  {isComposerOpen && (
    <div className="create-post-expanded">
      <div className="create-post-expanded-header">
        <strong>Tạo bài viết</strong>

        <button
          type="button"
          onClick={() => setIsComposerOpen(false)}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleCreatePost}>
        <div className="create-post-user">
          <div className="feed-avatar">
  {renderAvatar(CURRENT_USER, true)}
</div>

          <div>
            <strong>{profile.fullName}</strong>
            <span>🌍 Công khai</span>
          </div>
        </div>

        <textarea
  placeholder={`${profile.fullName} ơi, bạn đang nghĩ gì thế?`}
  value={content}
  onChange={(e) => setContent(e.target.value)}
  maxLength={3000}
  rows="4"
  autoFocus
/>

<div className="post-character-count">
  {content.length}/3000
</div>

        {imagePreviews.length > 0 && (
          <div className="image-preview-grid">
            {imagePreviews.map((src, index) => (
              <div
                className="image-preview-container"
                key={`${index}-${src.slice(0, 20)}`}
              >
                <button
                  type="button"
                  className="remove-image-button"
                  onClick={() => handleRemoveImage(index)}
                >
                  ✕
                </button>

                <img
                  src={src}
                  alt={`Ảnh xem trước ${index + 1}`}
                  className="image-preview"
                />
              </div>
            ))}
          </div>
        )}


{/* CẢM XÚC VÀ ĐỊA ĐIỂM ĐÃ CHỌN */}
{(feeling || location) && (
  <div className="selected-post-tags">
    {feeling && (
      <div className="selected-post-tag">
        <span>{feeling}</span>

        <button
          type="button"
          onClick={() => setFeeling("")}
        >
          ×
        </button>
      </div>
    )}

    {location && (
      <div className="selected-post-tag">
        <span>📍 {location}</span>

        <button
          type="button"
          onClick={() => setLocation("")}
        >
          ×
        </button>
      </div>
    )}
  </div>
)}

{/* CHỌN CẢM XÚC */}
{showFeelingPicker && (
  <div className="feeling-picker">
    <div className="post-picker-header">
      <strong>Bạn đang cảm thấy thế nào?</strong>

      <button
        type="button"
        onClick={() => setShowFeelingPicker(false)}
      >
        ✕
      </button>
    </div>

    <div className="feeling-grid">
      {feelings.map((item) => (
        <button
          key={item}
          type="button"
          className={`feeling-item ${
            feeling === item ? "selected" : ""
          }`}
          onClick={() => {
            setFeeling(item);
            setShowFeelingPicker(false);
          }}
        >
          {item}
        </button>
      ))}
    </div>
  </div>
)}

{/* CHECK IN */}
{showLocationPicker && (
  <div className="location-picker">
    <div className="post-picker-header">
      <strong>Bạn đang ở đâu?</strong>

      <button
        type="button"
        onClick={() => setShowLocationPicker(false)}
      >
        ✕
      </button>
    </div>

    <input
      type="text"
      placeholder="Nhập tên địa điểm..."
      value={location}
      maxLength={100}
      onChange={(e) => setLocation(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();

          if (location.trim()) {
            setLocation(location.trim());
            setShowLocationPicker(false);
          }
        }
      }}
    />

    <button
      type="button"
      className="location-confirm-button"
      disabled={!location.trim()}
      onClick={() => {
        setLocation(location.trim());
        setShowLocationPicker(false);
      }}
    >
      Xác nhận địa điểm
    </button>
  </div>
)}

        <div className="create-post-expanded-options">
          <button
  type="button"
  className="create-option"
  onClick={() => {
    setShowFeelingPicker((prev) => !prev);
    setShowLocationPicker(false);
  }}
>
  😊 Cảm xúc
</button>

<button
  type="button"
  className="create-option"
  onClick={() => {
    setShowLocationPicker((prev) => !prev);
    setShowFeelingPicker(false);
  }}
>
  📍 Check in
</button>
          <label className="create-option"> 
            📷 Thêm ảnh/video
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              hidden
            />
          </label>
        </div>

        <button
          type="submit"
          className="create-post-submit"
        >
          Đăng bài
        </button>
      </form>
    </div>
  )}
</div>



       

{/* STORIES */}
<div className="stories-container">

  {/* TẠO TIN */}
  <button
    type="button"
    className="story-card create-story"
    onClick={() => navigate("/stories")}
  >
    <div className="story-image">＋</div>
    <strong>Tạo tin</strong>
  </button>

  {/* DANH SÁCH STORY */}
  {visibleStories.map((story) => (
    <button
      type="button"
      className="story-card real-story-card"
      key={story.id}
      style={{
        background:
          story.color ||
          "linear-gradient(145deg,#2563eb,#8b5cf6)",
      }}
      onClick={() => handleViewStory(story)}
    >
      {/* HÌNH ẢNH HOẶC VIDEO */}
      {story.media && (
        story.mediaType?.startsWith("video/") ? (
          <video
            src={story.media}
            className="feed-story-media"
            muted
            playsInline
          />
        ) : (
          <img
            src={story.media}
            alt="Story"
            className="feed-story-media"
          />
        )
      )}

      {/* NỘI DUNG */}
      {story.text && (
        <div className="feed-story-text">
          {story.text}
        </div>
      )}

      {/* AVATAR */}
      <div
        className={`feed-story-avatar ${
          story.seen ? "story-seen" : ""
        }`}
      >
       {renderAvatar(
  story.author || story.name,
  story.isMine || story.name === "Bạn"
)}
      </div>

      {/* TÊN NGƯỜI ĐĂNG */}
      <strong className="feed-story-name">
        {story.isMine || story.name === "Bạn"
          ? "Tin của bạn"
          : story.author || story.name}
      </strong>
    </button>
  ))}
</div>

{/* POPUP XEM STORY */}
{activeStory && (
  <div
    className="feed-story-overlay"
    onClick={handleCloseStory}
  >
    <button
      type="button"
      className="feed-story-close"
      aria-label="Đóng tin"
      onClick={handleCloseStory}
    >
      ✕
    </button>

    <div
      className="feed-story-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Xem tin"
      onClick={(e) => e.stopPropagation()}
    >

      {/* NÚT XEM TIN TRƯỚC */}
      <button
        type="button"
        className="feed-story-prev"
        aria-label="Tin trước"
        onClick={handlePreviousStory}
        disabled={activeStoryIndex === 0}
      >
        ❮
      </button>

      {/* NỘI DUNG STORY */}
      <div
        className="feed-story-screen"
        style={{
          background:
            activeStory.color ||
            "linear-gradient(145deg,#2563eb,#8b5cf6)",
        }}
      >

        {/* THANH TIẾN TRÌNH */}
        <div className="feed-story-progress">
          {visibleStories.map((story, index) => (
            <div
              key={story.id}
              className={
                index <= activeStoryIndex
                  ? "progress-active"
                  : ""
              }
            />
          ))}
        </div>

        {/* THÔNG TIN NGƯỜI ĐĂNG */}
        <div className="feed-story-view-header">
          <div className="feed-avatar">
            {renderAvatar(
  activeStory.author || activeStory.name,
  activeStory.isMine || activeStory.name === "Bạn"
)}
          </div>

          <div>
            <strong>
              {displayName(
  activeStory.author || activeStory.name,
  activeStory.isMine || activeStory.name === "Bạn"
)}
            </strong>

            <small>
              {activeStory.createdAt
                ? new Date(
                    activeStory.createdAt
                  ).toLocaleString("vi-VN")
                : "Tin"}
            </small>
          </div>
        </div>

        {/* HIỂN THỊ ẢNH HOẶC VIDEO */}
        {activeStory.media && (
          activeStory.mediaType?.startsWith("video/") ? (
            <video
              key={activeStory.id}
              src={activeStory.media}
              className="feed-story-full-media"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <img
              src={activeStory.media}
              alt="Nội dung tin"
              className="feed-story-full-media"
            />
          )
        )}

        {/* HIỂN THỊ CHỮ */}
        {activeStory.text && (
          <div
            className={`feed-story-full-text ${
              activeStory.media
                ? "with-media"
                : ""
            }`}
          >
            {activeStory.text}
          </div>
        )}
      </div>

      {/* NÚT XEM TIN TIẾP THEO */}
      <button
        type="button"
        className="feed-story-next"
        aria-label="Tin tiếp theo"
        onClick={handleNextStory}
      >
        ❯
      </button>
    </div>
  </div>
)}



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
                <article
                  className="facebook-post"
                  key={post.id}
                >
                  {/* HEADER BÀI VIẾT */}
                  <div className="facebook-post-header">
                    <button type="button" className="feed-avatar profile-link-button" onClick={() => goToProfile(post.author)}>{renderAvatar(post.author, post.isMine)}</button>

                    <div className="post-author-info">

<div className="post-author-line">
  <strong
    className="clickable-author"
    onClick={() => goToProfile(post.author)}
  >
    {displayName(post.author, post.isMine)}
  </strong>

  {post.feeling && (
    <span className="post-feeling-label">
      — đang cảm thấy {post.feeling}
    </span>
  )}

  {post.location && (
    <span className="post-location-label">
      — tại 📍 {post.location}
    </span>
  )}
</div>

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

                  {/* NỘI DUNG */}
                  <div className="facebook-post-content">
                    {editingId === post.id ? (
                      <div className="edit-post-area">
                        <textarea
  value={editingContent}
  onChange={(e) =>
    setEditingContent(e.target.value)
  }
  maxLength={3000}
  rows="4"
/>

<div className="post-character-count">
  {editingContent.length}/3000
</div>
                        <label className="edit-media-picker">＋ Thêm ảnh/video
                          <input type="file" accept="image/*" multiple hidden onChange={(e) => { readImageFiles(e.target.files, setEditingImages, editingImages); e.target.value = ""; }} />
                        </label>
                        <div className="image-preview-grid">{editingImages.map((src, index) => <div className="image-preview-container" key={index}><button type="button" className="remove-image-button" onClick={() => setEditingImages((prev) => prev.filter((_, i) => i !== index))}>✕</button><img src={src} alt={`Ảnh ${index + 1}`} className="image-preview" /></div>)}</div>
                        <div className="edit-post-actions">
                          <button
                            type="button"
                            onClick={() => handleUpdatePost(post.id)}
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
                        {post.content && <p className="post-text-clickable" onClick={() => openPostDetail(post)}>{post.content}</p>}

                        {post.isShared && post.originalPost && (
                          <div className="shared-post-content">
                            <div className="shared-post-author">
                              <div className="shared-post-avatar">
                                {renderAvatar(originalPost.author, originalPost.isMine)}
                              </div>

                              <div>
                                <strong>
                                  {displayName(originalPost.author, originalPost.isMine)}
                                </strong>

                                <span>
                                  {originalPost.createdAt || "Vừa xong"} · 🌍
                                </span>
                              </div>
                            </div>

                            {originalPost.content && (
                              <p>{originalPost.content}</p>
                            )}

                            
{getPostImages(originalPost).length > 0 && (
  <div className="shared-image-grid">
    {getPostImages(originalPost).map((src, index) => (
      <img
        key={index}
        src={src}
        alt={`Ảnh được chia sẻ ${index + 1}`}
        className="shared-post-image"
        onClick={() => openPostDetail(post)}
      />
    ))}
  </div>
)}

                          </div>
                        )}

                        {!post.isShared && getPostImages(post).map((src, index) => <img key={index} src={src} alt={`Ảnh bài viết ${index + 1}`} className="facebook-post-image post-image-clickable" onClick={() => openPostDetail(post)} />)}
                      </>
                    )}
                  </div>

                  {/* THỐNG KÊ */}
                  <div className="post-statistics">
                    <span onClick={() => openPostDetail(post)} className="post-stat-clickable">
                      👍 {Number(post.likeCount) || 0} lượt thích
                    </span>

                    <span onClick={() => openPostDetail(post)} className="post-stat-clickable">{comments.length} bình luận</span>
                  </div>

                  {/* TƯƠNG TÁC */}
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
                      onClick={() => openPostDetail(post)}
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

                  {/* BÌNH LUẬN */}
                  {openComments[post.id] && (
                    <div className="facebook-comments">
                      {comments.map((comment) => (
                        <div
                          className="comment-item"
                          key={comment.id}
                        >
                          <button type="button" className="comment-avatar profile-link-button" onClick={() => goToProfile(comment.author)}>
                           {renderAvatar(comment.author)}
                          </button>

                          <div className="comment-content">
                            <strong className="clickable-author" onClick={() => goToProfile(comment.author)}>
                              {displayName(comment.author)}
                            </strong>

                            {editingCommentId === comment.id ? (
                              <div className="edit-comment-area">
                                <input
                                  type="text"
                                  value={editingCommentContent}
                                  onChange={(e) =>
                                    setEditingCommentContent(e.target.value)
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
                              <p className="post-text-clickable" onClick={() => openPostDetail(post)}>{comment.content}</p>
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

     
{/* POPUP CHI TIẾT BÀI VIẾT */}
{selectedPost && (
  <div
    className="post-detail-overlay"
    onClick={() => {
      setSelectedPost(null);
      handleCancelEditComment();
    }}
  >
    <section
      className="post-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết bài viết"
      onClick={(e) => e.stopPropagation()}
    >
      {/* TIÊU ĐỀ */}
      <button
        className="post-detail-close"
        type="button"
        aria-label="Đóng"
        onClick={() => {
          setSelectedPost(null);
          handleCancelEditComment();
        }}
      >
        ×
      </button>

      <h2>
        <button
          type="button"
          className="clickable-author"
          onClick={() => goToProfile(selectedPost.author)}
        >
          Bài viết của {displayName(selectedPost.author, selectedPost.isMine)}
        </button>
      </h2>

      {/* NỘI DUNG BÀI VIẾT */}

      {(selectedPost.feeling || selectedPost.location) && (
  <div className="selected-post-tags">
    {selectedPost.feeling && (
      <span className="selected-post-tag">
        {selectedPost.feeling}
      </span>
    )}

    {selectedPost.location && (
      <span className="selected-post-tag">
        📍 {selectedPost.location}
      </span>
    )}
  </div>
)}
     
<p>{selectedPost.content}</p>

{/* BÀI VIẾT GỐC ĐƯỢC CHIA SẺ */}
{selectedPost.isShared && selectedPost.originalPost && (
  <div className="share-post-preview">
    <div className="share-original-user">
      <button
        type="button"
        className="feed-avatar profile-link-button"
        onClick={() =>
          goToProfile(selectedPost.originalPost.author)
        }
      >
        {renderAvatar(selectedPost.originalPost.author)}
      </button>

      <div>
        <strong
          className="clickable-author"
          onClick={() =>
            goToProfile(selectedPost.originalPost.author)
          }
        >
          {displayName(selectedPost.originalPost.author)}
        </strong>

        <small>
          {selectedPost.originalPost.createdAt} · 🌍
        </small>
      </div>
    </div>

    <p>{selectedPost.originalPost.content}</p>

    <div className="shared-image-grid">
      {getPostImages(selectedPost.originalPost).map(
        (src, index) => (
          <img
            key={index}
            src={src}
            alt={`Ảnh bài viết gốc ${index + 1}`}
            className="shared-post-image"
          />
        )
      )}
    </div>
  </div>
)}


      {/* HÌNH ẢNH BÀI VIẾT */}
      {getPostImages(selectedPost).map((src, index) => (
        <img
          key={index}
          src={src}
          alt={`Ảnh bài viết ${index + 1}`}
          className="post-detail-image"
        />
      ))}

      {/* DANH SÁCH BÌNH LUẬN */}
      <div className="post-detail-comments">
        <h3>
          Bình luận ({(selectedPost.comments || []).length})
        </h3>

        {(selectedPost.comments || []).length === 0 && (
          <div className="empty-comments">
            Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
          </div>
        )}

        {(selectedPost.comments || []).map((comment) => (
          <div
            className="detail-comment-row"
            key={comment.id}
          >
            {/* AVATAR NGƯỜI BÌNH LUẬN */}
            <button
              type="button"
              className="comment-avatar profile-link-button"
              onClick={() => goToProfile(comment.author)}
            >
             {renderAvatar(comment.author)}
            </button>

            <div className="detail-comment-body">
              <div className="detail-comment-bubble">

                {/* TÊN NGƯỜI BÌNH LUẬN */}
                <strong
                  className="clickable-author"
                  onClick={() => goToProfile(comment.author)}
                >
                  {displayName(comment.author)}
                </strong>

                {/* CHỈNH SỬA BÌNH LUẬN */}
                {editingCommentId === comment.id ? (
                  <div className="edit-comment-area">
                    <input
                      type="text"
                      value={editingCommentContent}
                      onChange={(e) =>
                        setEditingCommentContent(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();

                          handleUpdateComment(
                            selectedPost.id,
                            comment.id
                          );
                        }

                        if (e.key === "Escape") {
                          handleCancelEditComment();
                        }
                      }}
                      autoFocus
                    />

                    <div className="edit-comment-actions">
                      <button
                        type="button"
                        disabled={!editingCommentContent.trim()}
                        onClick={() =>
                          handleUpdateComment(
                            selectedPost.id,
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
              </div>

              {/* CHỈ SỬA VÀ XÓA BÌNH LUẬN CỦA MÌNH */}
              {comment.author === CURRENT_USER &&
                editingCommentId !== comment.id && (
                  <div className="detail-comment-actions">
                    <button
                      type="button"
                      onClick={() => handleEditComment(comment)}
                    >
                      Chỉnh sửa
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteComment(
                          selectedPost.id,
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
        <div className="detail-comment-input">
          <div className="comment-avatar">
  {renderAvatar(CURRENT_USER, true)}
</div>

          <input
            type="text"
            placeholder="Viết bình luận..."
            value={commentInputs[selectedPost.id] || ""}
            onChange={(e) =>
              handleCommentChange(
                selectedPost.id,
                e.target.value
              )
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                commentInputs[selectedPost.id]?.trim()
              ) {
                e.preventDefault();
                handleAddComment(selectedPost.id);
              }
            }}
          />

          <button
            type="button"
            disabled={!commentInputs[selectedPost.id]?.trim()}
            onClick={() => handleAddComment(selectedPost.id)}
          >
            Gửi
          </button>
        </div>
      </div>
    </section>
  </div>
)}


{/* POPUP CHIA SẺ BÀI VIẾT */}
{sharingPost && (
  <div
    className="share-post-overlay"
    onClick={handleCancelShare}
  >
    <section
      className="share-post-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Chia sẻ bài viết"
      onClick={(e) => e.stopPropagation()}
    >
      {/* TIÊU ĐỀ */}
      <div className="share-post-header">
        <h2>Chia sẻ bài viết</h2>

        <button
          type="button"
          aria-label="Đóng"
          onClick={handleCancelShare}
        >
          ✕
        </button>
      </div>

      {/* THÔNG TIN NGƯỜI CHIA SẺ */}
      <div className="share-post-user">
        <div className="feed-avatar">
  {renderAvatar(CURRENT_USER, true)}
</div>

        <div>
          <strong>{profile.fullName}</strong>
          <small>🌍 Công khai</small>
        </div>
      </div>

      {/* NỘI DUNG CHIA SẺ */}
      <textarea
        placeholder="Bạn muốn nói gì về bài viết này?"
        value={shareContent}
        maxLength={3000}
        onChange={(e) =>
          setShareContent(e.target.value)
        }
        autoFocus
      />

      <div className="post-character-count">
        {shareContent.length}/3000
      </div>

      {/* XEM TRƯỚC BÀI VIẾT GỐC */}
      <div className="share-post-preview">
        <div className="share-original-user">
          <div className="feed-avatar">
  {renderAvatar(
    (sharingPost.originalPost || sharingPost).author,
    (sharingPost.originalPost || sharingPost).isMine
  )}
</div>

          <div>
            <strong>
  {displayName(
    (sharingPost.originalPost || sharingPost).author,
    (sharingPost.originalPost || sharingPost).isMine
  )}
</strong>

            <small>
              {sharingPost.originalPost?.createdAt ||
                sharingPost.createdAt} · 🌍
            </small>
          </div>
        </div>

        <p>
          {(
            sharingPost.originalPost || sharingPost
          ).content}
        </p>

        {getPostImages(
          sharingPost.originalPost || sharingPost
        ).length > 0 && (
          <div className="shared-image-grid">
            {getPostImages(
              sharingPost.originalPost || sharingPost
            ).map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`Ảnh bài viết ${index + 1}`}
                className="shared-post-image"
              />
            ))}
          </div>
        )}
      </div>

      {/* NÚT CHIA SẺ */}
      <button
        type="button"
        className="share-post-submit"
        onClick={handleConfirmShare}
      >
        Chia sẻ ngay
      </button>
    </section>
  </div>
)}


{/* POPUP BÁO CÁO BÀI VIẾT */}
{reportingPost && (
  <div
    className="report-post-overlay"
    onClick={handleCancelReport}
  >
    <section
      className="report-post-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Báo cáo bài viết"
      onClick={(e) => e.stopPropagation()}
    >
      {/* TIÊU ĐỀ */}
      <div className="report-post-header">
        <h2>Báo cáo bài viết</h2>

        <button
          type="button"
          aria-label="Đóng"
          onClick={handleCancelReport}
        >
          ✕
        </button>
      </div>

      {/* HƯỚNG DẪN */}
      <div className="report-post-description">
        <h3>Tại sao bạn báo cáo bài viết này?</h3>

        <p>
          Hãy chọn lý do phù hợp nhất.
          Báo cáo của bạn sẽ được gửi đến
          quản trị viên để xem xét.
        </p>
      </div>

      {/* DANH SÁCH LÝ DO */}
      <div className="report-reason-list">
        {reportReasons.map((reason) => (
          <label
            key={reason}
            className={`report-reason-item ${
              reportReason === reason
                ? "selected"
                : ""
            }`}
          >
            <span>{reason}</span>

            <input
              type="radio"
              name="reportReason"
              value={reason}
              checked={reportReason === reason}
              onChange={() => setReportReason(reason)}
            />
          </label>
        ))}
      </div>

      {/* NHẬP THÔNG TIN BỔ SUNG */}
      {reportReason && (
        <div className="report-detail-area">
          <label>
            {reportReason === "Lý do khác"
              ? "Nhập lý do cụ thể *"
              : "Thông tin bổ sung (không bắt buộc)"}
          </label>

          <textarea
            placeholder="Mô tả thêm về vấn đề..."
            value={reportDetail}
            maxLength={500}
            rows={3}
            onChange={(e) =>
              setReportDetail(e.target.value)
            }
          />

          <div className="post-character-count">
            {reportDetail.length}/500
          </div>
        </div>
      )}

      {/* LƯU Ý */}
      <div className="report-post-notice">
        ℹ️ Quản trị viên sẽ xem xét báo cáo
        và xử lý nếu phát hiện vi phạm.
      </div>

      {/* CÁC NÚT XỬ LÝ */}
      <div className="report-post-actions">
        <button
          type="button"
          className="report-cancel-button"
          onClick={handleCancelReport}
        >
          Hủy
        </button>

        <button
          type="button"
          className="report-submit-button"
          disabled={
            !reportReason ||
            (
              reportReason === "Lý do khác" &&
              !reportDetail.trim()
            )
          }
          onClick={handleConfirmReport}
        >
          Gửi báo cáo
        </button>
      </div>
    </section>
  </div>
)}

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
  );
}

export default PostFeed;
