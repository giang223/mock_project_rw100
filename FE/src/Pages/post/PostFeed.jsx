
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../api/http";
import { pageContent } from "../../api/apiResponse";
import { toCommentView, toFriendView, toPostView, toStoryView } from "../../api/adapters";
import * as postApi from "../../api/posts";
import * as storyApi from "../../api/stories";
import * as friendApi from "../../api/friends";

import {
  MOCK_ACCOUNTS,
  ACCOUNT_EVENT,
  getCurrentAccount,
  readAccountData,
  saveAccountData,
  isUser,
} from "../../utils/mockAccounts";


const PROFILE_EVENT = "miniSocialProfileUpdated";

const HIDDEN_KEY = "miniSocialHiddenSuggestions";

// ĐỌC HỒ SƠ THEO TÀI KHOẢN
function readProfile(
  account = getCurrentAccount() || MOCK_ACCOUNTS[0]
) {
  return account;
}
// KIỂM TRA QUYỀN SỞ HỮU
function isOwnedBy(item, account) {
  if (!item || !account) return false;

  if (item.authorId != null) {
    return String(item.authorId) === String(account.id);
  }

  return item.author === account.fullName;
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

function PostFeed() {
  const currentAccount =
    getCurrentAccount() || MOCK_ACCOUNTS[0];

  const CURRENT_USER = currentAccount.fullName;
  const CURRENT_USER_ID = currentAccount.id;

  // KIỂM TRA PHIÊN ĐĂNG NHẬP USER
const hasUserPermission = () => {
  const account = getCurrentAccount();

  return (
    isUser(account) &&
    String(account.id) === String(CURRENT_USER_ID)
  );
};

// KIỂM TRA QUYỀN TƯƠNG TÁC VỚI NGƯỜI DÙNG
const canInteractWithUser = (user) => {
  if (!hasUserPermission()) return false;
  return (
    user?.id != null &&
    String(user.id) !== String(CURRENT_USER_ID)
  );
};

  const [profile, setProfile] = useState(readProfile);

  const isOwnPost = (post) =>
    isOwnedBy(post, currentAccount);

  const isOwnComment = (comment) =>
    isOwnedBy(comment, currentAccount);

useEffect(() => {
  const refreshProfile = () => {
    setProfile(readProfile());
  };

  refreshProfile();

  window.addEventListener(PROFILE_EVENT, refreshProfile);
  window.addEventListener(ACCOUNT_EVENT, refreshProfile);
  window.addEventListener("storage", refreshProfile);
  window.addEventListener("focus", refreshProfile);

  return () => {
    window.removeEventListener(PROFILE_EVENT, refreshProfile);
    window.removeEventListener(ACCOUNT_EVENT, refreshProfile);
    window.removeEventListener("storage", refreshProfile);
    window.removeEventListener("focus", refreshProfile);
  };
}, []);

// LẤY HỒ SƠ CỦA TÁC GIẢ
const getAuthorProfile = (name, authorId) => {
  if (String(authorId) === String(CURRENT_USER_ID)) {
    return profile;
  }
  const matches = posts.flatMap((post) => [post, post.originalPost].filter(Boolean));
  const author = matches.find((post) => String(post.authorId) === String(authorId))?.authorProfile;
  return author || { fullName: name || "Người dùng", avatar: "" };
};

// HIỂN THỊ TÊN TÁC GIẢ
const displayName = (name, authorId) => {
  const authorProfile = getAuthorProfile(name, authorId);

  return authorProfile.fullName || name || "Người dùng";
};

// MÀU AVATAR THEO TÀI KHOẢN
const getAvatarStyle = (name, authorId) => {
  const user = getAuthorProfile(name, authorId);

  const colors = {
    blue: "#1877f2",
    green: "#16a34a",
    orange: "#ea9233",
    purple: "#9063cd",
    pink: "#d94e88",
  };

  return {
    background: colors[user.color] || "#1877f2",
    color: "#ffffff",
  };
};

// HIỂN THỊ AVATAR TÁC GIẢ
const renderAvatar = (name, authorId) => {
  const authorProfile = getAuthorProfile(name, authorId);

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
    String(authorProfile.fullName || name || "U")
      .trim()
      .split(/\s+/)
      .pop()
      ?.charAt(0)
      .toUpperCase() || "U"
  );
};

  // DANH SÁCH BÀI VIẾT
const [posts, setPosts] = useState([]);
const [feedLoading, setFeedLoading] = useState(true);
const [feedError, setFeedError] = useState("");
const refreshFeed = useCallback(async () => {
  setFeedLoading(true);
  setFeedError("");
  try {
    const page = await postApi.getFeed({ page: 0, size: 20 });
    setPosts(pageContent(page).map((post) => toPostView(post, CURRENT_USER_ID)).filter(Boolean));
  } catch (error) {
    setFeedError(getApiErrorMessage(error));
  } finally {
    setFeedLoading(false);
  }
}, [CURRENT_USER_ID]);
// KIỂM TRA QUYỀN XEM BÀI VIẾT
const canViewPost = (post) => {
  // Feed and profile endpoints already apply visibility and block rules server-side.
  return Boolean(post && hasUserPermission());
};

// KIỂM TRA QUYỀN XEM BÀI VIẾT CHIA SẺ
const canViewFeedPost = (post) => {
  if (!canViewPost(post)) {
    return false;
  }
  return !post.isShared || Boolean(post.originalPost);
};

// ĐỒNG BỘ NỘI DUNG BÀI VIẾT GỐC
const resolveFeedPost = (post) => {
  if (!canViewFeedPost(post)) {
    return null;
  }

  if (!post.isShared) {
    return post;
  }

  return {
    ...post,
    originalPost: post.originalPost,
  };
};

// DANH SÁCH BÀI VIẾT ĐƯỢC PHÉP XEM
const visiblePosts = posts
  .map((post) => resolveFeedPost(post, posts))
  .filter(Boolean);

// DANH SÁCH STORY
const [stories, setStories] = useState([]);

// XEM STORY
const [activeStoryId, setActiveStoryId] = useState(null);

// TÌM TÀI KHOẢN ĐĂNG TIN
const getStoryAccount = (story) => {
  return story?.authorProfile || { id: story?.authorId, fullName: story?.author || story?.name, role: "USER" };
};

// KIỂM TRA TIN CỦA MÌNH
const isOwnStory = (story) => {
  const account = getStoryAccount(story);

  return (
    account &&
    String(account.id) === String(CURRENT_USER_ID)
  );
};

// KIỂM TRA QUYỀN XEM TIN
const canViewStory = (story) => {
  if (!story || !hasUserPermission()) {
    return false;
  }

  // KIỂM TRA TIN HẾT HẠN
  if (
    story.expiresAt &&
    !(new Date(story.expiresAt).getTime() > Date.now())
  ) {
    return false;
  }

  // Visibility and blocking rules are enforced by the authenticated API.
  return true;
};

// KIỂM TRA ĐÃ XEM TIN
const isStorySeen = (story) => {
  return Array.isArray(story.viewedBy) &&
    story.viewedBy
      .map(String)
      .includes(String(CURRENT_USER_ID));
};

// DANH SÁCH TIN ĐƯỢC PHÉP XEM
const visibleStories = stories
  .filter(canViewStory)
  .sort(
    (a, b) =>
      Number(isOwnStory(b)) -
      Number(isOwnStory(a))
  );

const activeStoryIndex = visibleStories.findIndex(
  (story) => story.id === activeStoryId
);

const activeStory =
  visibleStories[activeStoryIndex] || null;

// MỞ STORY
const handleViewStory = async (story) => {
  if (!story || !canViewStory(story)) {
    alert("Tin không còn khả dụng!");
    return;
  }

  setActiveStoryId(story.id);
  if (isOwnStory(story)) return;
  try {
    await storyApi.recordStoryView(story.id);
    setStories((items) => items.map((item) => String(item.id) === String(story.id)
      ? { ...item, viewedBy: [...new Set([...(item.viewedBy || []).map(String), String(CURRENT_USER_ID)])] }
      : item));
  } catch (error) {
    alert(getApiErrorMessage(error));
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
  let active = true;
  storyApi.getStories({ page: 0, size: 100 })
    .then((page) => {
      if (active) setStories(pageContent(page).map((story) => toStoryView(story, CURRENT_USER_ID)));
    })
    .catch((error) => { if (active) setFeedError(getApiErrorMessage(error)); });
  return () => { active = false; };
}, []);

  // ĐĂNG BÀI
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("public");
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
  const [postFiles, setPostFiles] = useState([]);
  const [editingImages, setEditingImages] = useState([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  // CHIA SẺ BÀI VIẾT
const [sharingPost, setSharingPost] = useState(null);
const [shareContent, setShareContent] = useState("");
// ĐỒNG BỘ POPUP CHIA SẺ
useEffect(() => {
  if (!sharingPost) return;

  const latest = visiblePosts.find(
    (post) =>
      String(post.id) === String(sharingPost.id)
  );

  const original = latest?.isShared
    ? latest.originalPost
    : latest;

  if (
    !latest ||
    !original ||
    (original.privacy || "public") !== "public"
  ) {
    setSharingPost(null);
    setShareContent("");
    return;
  }

  if (
    JSON.stringify(latest) !==
    JSON.stringify(sharingPost)
  ) {
    setSharingPost(latest);
  }
});
// BÁO CÁO BÀI VIẾT
const [reportingPost, setReportingPost] = useState(null);
const [reportReason, setReportReason] = useState("");
const [reportDetail, setReportDetail] = useState("");
// ĐỒNG BỘ POPUP BÁO CÁO
useEffect(() => {
  if (!reportingPost) return;

  const latest = visiblePosts.find(
    (post) =>
      String(post.id) ===
      String(reportingPost.id)
  );

  // ĐÓNG POPUP KHI KHÔNG CÒN QUYỀN XEM
  if (!latest || isOwnPost(latest)) {
    setReportingPost(null);
    setReportReason("");
    setReportDetail("");
    return;
  }

  // CẬP NHẬT NỘI DUNG MỚI NHẤT
  if (
    JSON.stringify(latest) !==
    JSON.stringify(reportingPost)
  ) {
    setReportingPost(latest);
  }
});

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
  const [visibleContacts, setVisibleContacts] = useState([]);
  const [feedSuggestions, setFeedSuggestions] = useState([]);
  const refreshSocialGraph = useCallback(async () => {
    try {
      const [friendsPage, suggestionsPage] = await Promise.all([
        friendApi.getFriends({ page: 0, size: 100 }),
        friendApi.getFriendSuggestions({ page: 0, size: 100 }),
      ]);
      setVisibleContacts(pageContent(friendsPage).map((item) => toFriendView(item, "accepted")).filter(Boolean));
      setFeedSuggestions(pageContent(suggestionsPage).map((item) => {
        const user = toFriendView(item, "none");
        return { ...user, name: user.fullName, friendshipStatus: String(item.friendshipStatus || item.status || "none").toLowerCase(), mutualFriends: Number(item.mutualFriendCount || user?.mutualFriends || 0) };
      }));
    } catch (error) {
      setFeedError(getApiErrorMessage(error));
    }
  }, []);

const [hiddenSuggestions, setHiddenSuggestions] =
  useState(() => {
    const data = readAccountData(
      HIDDEN_KEY,
      [],
      CURRENT_USER_ID
    );

    return Array.isArray(data)
      ? data.map(String)
      : [];
  });

// Load real friends and server-ranked suggestions.
useEffect(() => {
  refreshSocialGraph();
  const onFocus = () => refreshSocialGraph();
  window.addEventListener("focus", onFocus);
  return () => window.removeEventListener("focus", onFocus);
}, [refreshSocialGraph]);

// TRẠNG THÁI KẾT BẠN
const getFeedFriendStatus = (user) =>
  user.friendshipStatus || user.status || "none";

// GỢI Ý KẾT BẠN
const visibleSuggestions = feedSuggestions
  .filter(
    (user) =>
      !hiddenSuggestions.includes(String(user.id))
  )
  .sort(
    (a, b) => b.mutualFriends - a.mutualFriends
  );

  // CHỈNH SỬA BÀI VIẾT
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingPrivacy, setEditingPrivacy] = useState("public");

  // BÌNH LUẬN
  const [commentInputs, setCommentInputs] = useState({});

  // CHỈNH SỬA BÌNH LUẬN
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

 // ĐỒNG BỘ POPUP BÀI VIẾT
useEffect(() => {
  if (!selectedPost) return;

  const latest = visiblePosts.find(
    (post) =>
      String(post.id) === String(selectedPost.id)
  );

  if (!latest) {
    setSelectedPost(null);
    return;
  }

  if (
    JSON.stringify(latest) !==
    JSON.stringify(selectedPost)
  ) {
    setSelectedPost(latest);
  }
});

// MỞ BÀI VIẾT TỪ ĐƯỜNG DẪN
useEffect(() => {
  const targetId = searchParams.get("postId");

  if (!targetId) return;
  const target = posts.find(
    (post) => String(post.id) === targetId
  );
  if (target) setSelectedPost(resolveFeedPost(target, posts));
}, [searchParams, CURRENT_USER_ID, posts]);

  // ĐỒNG BỘ BÀI VIẾT GIỮA CÁC TÀI KHOẢN
useEffect(() => {
  refreshFeed();
  const onFocus = () => refreshFeed();
  window.addEventListener("focus", onFocus);
  return () => window.removeEventListener("focus", onFocus);
}, [refreshFeed]);

  // Read preview data for files, but send the original files as multipart.
  const readImageFiles = (files, callback, current = []) => {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (selected.length !== Array.from(files || []).length) {
      alert("Chỉ được chọn file hình ảnh!");
    }
    if (selected.some((file) => file.size > 10 * 1024 * 1024)) {
      alert("Mỗi ảnh không được vượt quá 10MB!");
      return;
    }
    if (current.length + selected.length > 4) {
      alert("Backend hiện hỗ trợ tối đa 4 tệp media cho mỗi bài viết.");
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
    const selected = Array.from(e.target.files || []);
    if (postFiles.length + selected.length > 4) {
      alert("Backend hiện hỗ trợ tối đa 4 tệp media cho mỗi bài viết.");
      e.target.value = "";
      return;
    }
    if (selected.some((file) => file.size > 10 * 1024 * 1024)) {
      alert("Mỗi ảnh không được vượt quá 10MB.");
      e.target.value = "";
      return;
    }
    setPostFiles((current) => [...current, ...selected]);
    readImageFiles(selected, setImagePreviews, imagePreviews);
    e.target.value = "";
  };

  const handleRemoveImage = (index) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setPostFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ĐĂNG BÀI VIẾT
  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (
  !content.trim() &&
  postFiles.length === 0 &&
  !feeling
) {
      alert("Vui lòng nhập nội dung hoặc chọn hình ảnh!");
      return;
    }

    try {
      if (location.trim()) alert("Địa điểm chưa được lưu vì BE hiện chưa có trường/API cho địa điểm.");
      const payload = {
        content: content.trim(),
        feeling: feeling || null,
        visibility: ({ public: "PUBLIC", friends: "FRIENDS", private: "PRIVATE" })[privacy] || "PUBLIC",
      };
      if (postFiles.length) await postApi.createPostWithMedia({ ...payload, files: postFiles });
      else await postApi.createPost(payload);
      await refreshFeed();
    } catch (error) {
      alert(getApiErrorMessage(error));
      return;
    }

setPrivacy("public");
setContent("");
    setImagePreviews([]);
    setPostFiles([]);
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
  if (!isOwnPost(post)) return;

  setEditingId(post.id);
  setEditingContent(post.content || "");
  setEditingPrivacy(post.privacy || "public");

  setEditingImages(
    post.images || (post.image ? [post.image] : [])
  );
};

  // LƯU CHỈNH SỬA BÀI VIẾT
const handleUpdatePost = async (id) => {
  const currentPost = posts.find(
    (post) => String(post.id) === String(id)
  );

  if (!currentPost || !isOwnPost(currentPost)) {
    alert("Bạn không có quyền chỉnh sửa bài viết này!");
    return;
  }

  if (
    !editingContent.trim() &&
    editingImages.length === 0 &&
    !currentPost.isShared &&
    !currentPost.feeling &&
    !currentPost.location?.trim()
  ) {
    alert("Nội dung bài viết không được để trống!");
    return;
  }

  try {
    await postApi.updatePost(id, {
      content: editingContent.trim(),
      visibility: ({ public: "PUBLIC", friends: "FRIENDS", private: "PRIVATE" })[editingPrivacy],
      feeling: currentPost.feeling || null,
    });
    await refreshFeed();
  } catch (error) {
    alert(getApiErrorMessage(error));
    return;
  }

  setEditingId(null);
  setEditingContent("");
  setEditingImages([]);
  setEditingPrivacy("public");
};

  // HỦY CHỈNH SỬA BÀI VIẾT
const handleCancelEdit = () => {
  setEditingId(null);
  setEditingContent("");
  setEditingImages([]);
  setEditingPrivacy("public");
};

  // XÓA BÀI VIẾT
  const handleDelete = async (id) => {
    const post = posts.find(
  (item) => item.id === id
);

if (!post || !isOwnPost(post)) {
  alert("Bạn không có quyền xóa bài viết này!");
  return;
}
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa bài viết này không?"
    );

    if (!confirmed) return;

    try {
      await postApi.deletePost(id);
      await refreshFeed();
    } catch (error) { alert(getApiErrorMessage(error)); }
  };

  // ĐỌC DANH SÁCH NGƯỜI TƯƠNG TÁC
// KIỂM TRA ĐÃ LƯU BÀI VIẾT
const isPostSaved = (post) => Boolean(post.saved);

// KIỂM TRA ĐÃ LIKE
const isPostLiked = (post) => Boolean(post.currentUserReaction || post.liked);

// Save state is owned by the server.
const handleSavePost = async (id) => {
  try {
    await postApi.toggleSave(id);
    await refreshFeed();
  } catch (error) { alert(getApiErrorMessage(error)); }
};

// THÍCH HOẶC BỎ THÍCH
const handleLike = async (id) => {
  const target = posts.find(
    (post) => String(post.id) === String(id)
  );

  if (!target || !canViewFeedPost(target, posts)) {
    alert("Bài viết không còn khả dụng!");
    return;
  }
  try {
    if (isPostLiked(target)) await postApi.removeReaction(id);
    else await postApi.setReaction(id, "LIKE");
    await refreshFeed();
  } catch (error) { alert(getApiErrorMessage(error)); }
};

  // NHẬP BÌNH LUẬN
  const handleCommentChange = (id, value) => {
    setCommentInputs((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // GỬI BÌNH LUẬN
const handleAddComment = async (id) => {
  const commentText = commentInputs[id]?.trim();

  if (!commentText) {
    alert("Vui lòng nhập nội dung bình luận!");
    return;
  }

  const post = posts.find(
    (item) => String(item.id) === String(id)
  );

  if (!post || !canViewFeedPost(post, posts)) {
    alert("Bài viết không còn khả dụng!");
    return;
  }

  try {
    const newComment = toCommentView(await postApi.addComment(id, commentText));
    setPosts((current) => current.map((item) => String(item.id) === String(id)
      ? { ...item, comments: [...(item.comments || []), newComment], commentCount: Number(item.commentCount || 0) + 1 }
      : item));
    setSelectedPost((current) => current && String(current.id) === String(id)
      ? { ...current, comments: [...(current.comments || []), newComment], commentCount: Number(current.commentCount || 0) + 1 }
      : current);
  } catch (error) {
    alert(getApiErrorMessage(error));
    return;
  }

  // XÓA NỘI DUNG Ô NHẬP
  setCommentInputs((prev) => ({
    ...prev,
    [id]: "",
  }));
};
  // CHỈNH SỬA BÌNH LUẬN
  const handleEditComment = (comment) => {
    if (!isOwnComment(comment)) return;
    setEditingCommentId(comment.id);

    setEditingCommentContent(
      comment.content || ""
    );
  };

 // LƯU BÌNH LUẬN ĐÃ CHỈNH SỬA
const handleUpdateComment = async (postId, commentId) => {
  const post = posts.find(
    (item) => item.id === postId
  );

  const comment = post?.comments?.find(
    (item) => item.id === commentId
  );

  if (!isOwnComment(comment)) {
    alert("Bạn không có quyền thực hiện thao tác này!");
    return;
  }
    if (!editingCommentContent.trim()) {
      alert("Nội dung bình luận không được để trống!");
      return;
    }

    try {
      const updated = toCommentView(await postApi.updateComment(postId, commentId, editingCommentContent.trim()));
      const updateList = (post) => ({ ...post, comments: (post.comments || []).map((item) => String(item.id) === String(commentId) ? updated : item) });
      setPosts((current) => current.map((post) => String(post.id) === String(postId) ? updateList(post) : post));
      setSelectedPost((current) => current && String(current.id) === String(postId) ? updateList(current) : current);
      setEditingCommentId(null);
      setEditingCommentContent("");
    } catch (error) { alert(getApiErrorMessage(error)); }
  };

  // HỦY CHỈNH SỬA BÌNH LUẬN
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  // XÓA BÌNH LUẬN
  const handleDeleteComment = async (postId, commentId) => {
  const post = posts.find(
    (item) => item.id === postId
  );

  const comment = post?.comments?.find(
    (item) => item.id === commentId
  );

  if (!isOwnComment(comment)) {
    alert("Bạn không có quyền xóa bình luận này!");
    return;
  }
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa bình luận này không?"
    );

    if (!confirmed) return;

    try {
      await postApi.deleteComment(postId, commentId);
      const updateList = (post) => ({ ...post, comments: (post.comments || []).filter((item) => String(item.id) !== String(commentId)), commentCount: Math.max(0, Number(post.commentCount || 0) - 1) });
      setPosts((current) => current.map((post) => String(post.id) === String(postId) ? updateList(post) : post));
      setSelectedPost((current) => current && String(current.id) === String(postId) ? updateList(current) : current);
    } catch (error) { alert(getApiErrorMessage(error)); }
  };

  
  // MỞ POPUP CHIA SẺ
const handleShare = (post) => {
  const target = posts.find(
    (item) =>
      String(item.id) === String(post.id)
  );

  const resolved = resolveFeedPost(
    target,
    posts
  );

  if (!resolved) {
    alert("Bài viết không còn khả dụng!");
    return;
  }

  const original = resolved.isShared
    ? resolved.originalPost
    : resolved;

  if ((original.privacy || "public") !== "public") {
    alert("Chỉ được chia sẻ bài viết công khai!");
    return;
  }

  setSharingPost(resolved);
  setShareContent("");
};

// ĐÓNG POPUP CHIA SẺ
const handleCancelShare = () => {
  setSharingPost(null);
  setShareContent("");
};

// XÁC NHẬN CHIA SẺ
const handleConfirmShare = async () => {
  if (!sharingPost) return;

  const target = posts.find(
    (post) =>
      String(post.id) === String(sharingPost.id)
  );

  if (!target || !canViewFeedPost(target, posts)) {
    alert("Bài viết không còn khả dụng!");
    handleCancelShare();
    return;
  }

  const original = target.isShared ? target.originalPost : target;

  if (
    !original ||
    !canViewPost(original) ||
    (original.privacy || "public") !== "public"
  ) {
    alert("Chỉ được chia sẻ bài viết công khai!");
    return;
  }

  try {
    await postApi.sharePost(target.id, shareContent.trim());
    await refreshFeed();
    handleCancelShare();
    alert("Chia sẻ bài viết thành công!");
  } catch (error) { alert(getApiErrorMessage(error)); }
};
  

// Báo cáo trùng lặp được kiểm tra và xử lý ở backend.
const handleConfirmReport = async () => {
  if (!reportingPost) return;
  if (!reportReasons.includes(reportReason)) {
    alert("Vui lòng chọn lý do báo cáo!");
    return;
  }
  const detail = reportDetail.trim();
  if (reportReason === "Lý do khác" && !detail) {
    alert("Vui lòng nhập lý do cụ thể!");
    return;
  }
  if (detail.length > 500) {
    alert("Mô tả không được vượt quá 500 ký tự!");
    return;
  }
  try {
    await postApi.reportPost(reportingPost.id, detail ? `${reportReason}: ${detail}` : reportReason);
    handleCancelReport();
    alert("Báo cáo của bạn đã được ghi nhận.");
  } catch (error) {
    alert(getApiErrorMessage(error));
  }
};


// MỞ CUỘC TRÒ CHUYỆN
// MỞ CUỘC TRÒ CHUYỆN
const handleOpenContact = (user) => {
  if (!canInteractWithUser(user)) {
    alert("Không thể trò chuyện với người dùng này!");
    return;
  }

  navigate(`/messages?userId=${user.id}`);
};

// GỬI LỜI MỜI KẾT BẠN
const handleFeedAddFriend = async (user) => {
  if (!canInteractWithUser(user)) {
    alert("Không thể kết bạn với người dùng này!");
    return;
  }

  if (getFeedFriendStatus(user) !== "none") {
    return;
  }

  try { await friendApi.sendFriendRequest(user.id); await refreshSocialGraph(); }
  catch (error) { alert(getApiErrorMessage(error)); }
};

// HỦY LỜI MỜI KẾT BẠN
const handleFeedCancelRequest = async (user) => {
  if (!canInteractWithUser(user)) {
    return;
  }

  try {
    const page = await friendApi.getSentFriendRequests({ page: 0, size: 100 });
    const request = pageContent(page).find((item) => String(item.user?.id) === String(user.id));
    if (!request) return;
    await friendApi.cancelFriendRequest(request.id);
    await refreshSocialGraph();
  } catch (error) { alert(getApiErrorMessage(error)); }
};

// XÓA GỢI Ý KẾT BẠN
const handleHideSuggestion = (user) => {
  if (!canInteractWithUser(user)) return;

  const saved = readAccountData(
    HIDDEN_KEY,
    [],
    CURRENT_USER_ID
  );

  const current = Array.isArray(saved)
    ? saved.map(String)
    : [];

  const updated = [
    ...new Set([
      ...current,
      String(user.id),
    ]),
  ];

  if (
    !saveAccountData(
      HIDDEN_KEY,
      updated,
      CURRENT_USER_ID
    )
  ) {
    alert("Không thể xóa gợi ý!");
    return;
  }

  setHiddenSuggestions(updated);
};
  const openPostDetail = (post) => {
  const target = posts.find(
    (item) =>
      String(item.id) === String(post.id)
  );

  const resolved = resolveFeedPost(
    target,
    posts
  );

  if (!resolved) {
    alert("Bài viết không còn khả dụng!");
    return;
  }

  setSelectedPost(resolved);
  postApi.getComments(resolved.id, { page: 0, size: 20 })
    .then((page) => {
      const comments = pageContent(page).map(toCommentView).filter(Boolean);
      setPosts((current) => current.map((item) => String(item.id) === String(resolved.id) ? { ...item, comments } : item));
      setSelectedPost((current) => current && String(current.id) === String(resolved.id) ? { ...current, comments } : current);
    })
    .catch((error) => alert(getApiErrorMessage(error)));
};
  const goToProfile = (name, authorId) => {
  if (!hasUserPermission()) return;

  if (!authorId) {
    navigate(`/profile?user=${encodeURIComponent(name || "")}`);
    return;
  }

  if (String(authorId) === String(CURRENT_USER_ID)) {
    navigate("/profile");
    return;
  }

  navigate(`/profile?userId=${authorId}`);
};
  const getPostImages = (post) => post.images?.length ? post.images : (post.image ? [post.image] : []);

  return (
    <div className="feed-content-layout">
      {/* CỘT GIỮA */}
      <main className="facebook-feed">

        {feedError && <p role="alert" className="profile-field-error">{feedError}</p>}
        {feedLoading && <p role="status">Đang tải bảng tin…</p>}

        
{/* TẠO BÀI VIẾT */}
<div className="create-post-card">

  {/* THANH ĐĂNG BÀI THU GỌN */}
  <div className="create-post-compact">
    <div
  className="feed-avatar"
  style={getAvatarStyle(CURRENT_USER, CURRENT_USER_ID)}
>
  {renderAvatar(CURRENT_USER, CURRENT_USER_ID)}
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
          <div
  className="feed-avatar"
  style={getAvatarStyle(CURRENT_USER, CURRENT_USER_ID)}
>
  {renderAvatar(CURRENT_USER, CURRENT_USER_ID)}
</div>
          <div>
  <strong>{profile.fullName}</strong>

  <select
    className="post-privacy-select"
    value={privacy}
    aria-label="Quyền riêng tư bài viết"
    onChange={(e) => setPrivacy(e.target.value)}
  >
    <option value="public">🌍 Công khai</option>
    <option value="friends">👥 Bạn bè</option>
    <option value="private">🔒 Chỉ mình tôi</option>
  </select>
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
          isStorySeen(story) ? "story-seen" : ""
        }`}
      >
  {renderAvatar(
  story.author || story.name,
  getStoryAccount(story)?.id
)}
      </div>

      {/* TÊN NGƯỜI ĐĂNG */}
      <strong className="feed-story-name">
  {isOwnStory(story)
    ? "Tin của bạn"
    : displayName(
        story.author || story.name,
        getStoryAccount(story)?.id
      )}
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
  getStoryAccount(activeStory)?.id
)}
          </div>

          <div>
            <strong>
              {displayName(
  activeStory.author || activeStory.name,
  getStoryAccount(activeStory)?.id
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
          {!feedLoading && visiblePosts.length === 0 ? (
            <div className="empty-post">
              Chưa có bài viết nào. Hãy chia sẻ điều gì đó nhé!
            </div>
          ) : (
            visiblePosts.map((post) => {
              const originalPost = post.originalPost || post;

              return (
                <article
                  className="facebook-post"
                  key={post.id}
                >
                  {/* HEADER BÀI VIẾT */}
                  <div className="facebook-post-header">
                    <button
  type="button"
  className="feed-avatar profile-link-button"
  style={getAvatarStyle(post.author, post.authorId)}
  onClick={() => goToProfile(post.author, post.authorId)}
>
  {renderAvatar(post.author, post.authorId)}
</button>

                    <div className="post-author-info">

<div className="post-author-line">
  <strong
    className="clickable-author"
    onClick={() => goToProfile(post.author, post.authorId)}
  >
    {displayName(post.author, post.authorId)}
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
                        {formatPostTime(post.createdAt)} · {getPrivacyLabel(post.privacy)}
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
                          {isPostSaved(post)
                            ? "🔖 Bỏ lưu bài viết"
                            : "🔖 Lưu bài viết"}
                        </button>

                        {!isOwnPost(post) && (
                          <button
                            type="button"
                            onClick={() => handleReportPost(post)}
                          >
                            🚩 Báo cáo bài viết
                          </button>
                        )}

                        {isOwnPost(post) && (
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

  <select
    className="post-privacy-select"
    value={editingPrivacy}
    aria-label="Chỉnh sửa quyền riêng tư"
    onChange={(e) => setEditingPrivacy(e.target.value)}
  >
    <option value="public">🌍 Công khai</option>
    <option value="friends">👥 Bạn bè</option>
    <option value="private">🔒 Chỉ mình tôi</option>
  </select>

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
                        <small>Thay đổi ảnh/video trong bài viết đang được hỗ trợ ở phiên bản BE kế tiếp.</small>
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
                                {renderAvatar(originalPost.author, originalPost.authorId)}
                              </div>

                              <div>
                                <strong>
                                  {displayName(originalPost.author, originalPost.authorId)}
                                </strong>

                                <span>
                                  {formatPostTime(originalPost.createdAt)}
{" · "}
{getPrivacyLabel(originalPost.privacy)} 🌍
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

                    <span onClick={() => openPostDetail(post)} className="post-stat-clickable">{post.commentCount ?? comments.length} bình luận</span>
                  </div>

                  {/* TƯƠNG TÁC */}
                  <div className="facebook-post-actions">
                    <button
                      type="button"
                      className={isPostLiked(post) ? "liked" : ""}
                      onClick={() => handleLike(post.id)}
                    >
                      👍 {isPostLiked(post) ? "Đã thích" : "Thích"}
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
          onClick={() => goToProfile(selectedPost.author, selectedPost.authorId)}
        >
          Bài viết của {displayName(selectedPost.author, selectedPost.authorId)}
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
     
<div className="post-privacy-info">
  {formatPostTime(selectedPost.createdAt)}
  {" · "}
  {getPrivacyLabel(selectedPost.privacy)}
</div>

<p>{selectedPost.content}</p>

{/* BÀI VIẾT GỐC ĐƯỢC CHIA SẺ */}
{selectedPost.isShared && selectedPost.originalPost && (
  <div className="share-post-preview">
    <div className="share-original-user">
      <button
        type="button"
        className="feed-avatar profile-link-button"
        onClick={() =>
          goToProfile(selectedPost.originalPost.author, selectedPost.originalPost.authorId)
        }
      >
        {renderAvatar(
  selectedPost.originalPost.author,
  selectedPost.originalPost.authorId
)}
      </button>

      <div>
        <strong
          className="clickable-author"
          onClick={() =>
            goToProfile(selectedPost.originalPost.author, selectedPost.originalPost.authorId)
          }
        >
          {displayName(
  selectedPost.originalPost.author,
  selectedPost.originalPost.authorId
)}
        </strong>

        <small>
          {formatPostTime(selectedPost.originalPost.createdAt)}
{" · "}
{getPrivacyLabel(selectedPost.originalPost.privacy)}
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
          Bình luận ({selectedPost.commentCount ?? (selectedPost.comments || []).length})
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
              onClick={() => goToProfile(comment.author, comment.authorId)}
            >
             {renderAvatar(comment.author)}
            </button>

            <div className="detail-comment-body">
              <div className="detail-comment-bubble">

                {/* TÊN NGƯỜI BÌNH LUẬN */}
                <strong
                  className="clickable-author"
                  onClick={() => goToProfile(comment.author, comment.authorId)}
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
              {isOwnComment(comment) &&
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
          <div
  className="feed-avatar"
  style={getAvatarStyle(CURRENT_USER, CURRENT_USER_ID)}
>
  {renderAvatar(CURRENT_USER, CURRENT_USER_ID)}
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
        <div
  className="feed-avatar"
  style={getAvatarStyle(CURRENT_USER, CURRENT_USER_ID)}
>
  {renderAvatar(CURRENT_USER, CURRENT_USER_ID)}
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
    (sharingPost.originalPost || sharingPost).authorId
  )}
</div>

          <div>
            <strong>
  {displayName(
    (sharingPost.originalPost || sharingPost).author,
    (sharingPost.originalPost || sharingPost).authorId
  )}
</strong>

            <small>
             {formatPostTime(
  (sharingPost.originalPost || sharingPost).createdAt
)}
{" · "}
{getPrivacyLabel(
  (sharingPost.originalPost || sharingPost).privacy
)}
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

  {visibleContacts.length === 0 && (
    <p className="feed-sidebar-empty">
      Chưa có người liên hệ.
    </p>
  )}

  {visibleContacts.map((user) => (
    <button
      key={user.username || user.name}
      type="button"
      className="contact-item feed-contact-button"
      onClick={() => handleOpenContact(user)}
      title={`Nhắn tin với ${user.name}`}
    >
      <div
        className={`contact-avatar ${user.color || "blue"}`}
      >
        {renderAvatar(user.name, user.id)}
      </div>

      <span>{user.name}</span>

      <i></i>
    </button>
  ))}

  <div className="sidebar-divider"></div>

  <h3>Gợi ý kết bạn</h3>

  {visibleSuggestions.length === 0 && (
    <p className="feed-sidebar-empty">
      Không còn gợi ý kết bạn.
    </p>
  )}

  {visibleSuggestions.map((user) => (
    <div
      className="suggestion-item feed-friend-suggestion"
      key={user.username}
    >
      <button
        type="button"
        className={`contact-avatar ${user.color} feed-profile-avatar`}
        onClick={() =>
  navigate(`/profile?userId=${user.id}`)
}
        aria-label={`Xem trang cá nhân ${user.name}`}
      >
        {renderAvatar(user.name, user.id)}
      </button>

      <div className="feed-suggestion-info">
        <button
          type="button"
          className="feed-suggestion-name"
          onClick={() =>
  navigate(`/profile?userId=${user.id}`)
}
        >
          {user.name}
        </button>

        <p>{user.mutualFriends} bạn chung</p>

        <div className="feed-suggestion-actions">
          {getFeedFriendStatus(user) === "sent" ? (
            <button
              type="button"
              className="feed-suggestion-remove"
              onClick={() =>
                handleFeedCancelRequest(user)
              }
            >
              Hủy lời mời
            </button>
          ) : (
            <button
              type="button"
              className="feed-suggestion-add"
              onClick={() =>
                handleFeedAddFriend(user)
              }
            >
              Thêm bạn
            </button>
          )}

          <button
            type="button"
            className="feed-suggestion-remove"
            onClick={() =>
              handleHideSuggestion(user)
            }
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  ))}

  <button
    type="button"
    className="feed-view-suggestions"
    onClick={() => navigate("/friend-suggestions")}
  >
    Xem tất cả gợi ý
  </button>
</aside>
    </div>
  );
}

export default PostFeed;
