
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addNotification } from "../notification/notificationUtils";

import {
  MOCK_ACCOUNTS,
  ACCOUNT_EVENT,
  getCurrentAccount,
  readAccountData,
  saveAccountData,
  getMockUsers,
  getAccountById,
  isUser,
} from "../../utils/mockAccounts";

import {
  FRIEND_EVENT,
  BLOCKED_EVENT,
  getFriendProfile,
  getFriendStatus,
  getMutualFriends,
  getFriendIds,
  getRelationship,
  sendFriendRequest,
  cancelFriendRequest,
  isBlockedBetween,
} from "../../utils/friendUtils";

const POSTS_KEY = "miniSocialPosts";
const REPORTS_KEY = "miniSocialReports";
const POSTS_EVENT = "miniSocialPostsUpdated";
const REPORTS_EVENT = "miniSocialReportsUpdated";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

const HIDDEN_KEY = "miniSocialHiddenSuggestions";

// ĐỌC HỒ SƠ THEO TÀI KHOẢN
function readProfile(
  account = getCurrentAccount() || MOCK_ACCOUNTS[0]
) {
  let legacyProfile = {};

  if (String(account.id) === "1") {
    try {
      legacyProfile = JSON.parse(
        localStorage.getItem(PROFILE_KEY) || "{}"
      ) || {};
    } catch {
      legacyProfile = {};
    }
  }

  return {
    ...account,
    ...legacyProfile,
    ...readAccountData(PROFILE_KEY, {}, account.id),

    id: account.id,
    username: account.username,
    email: account.email,
  };
}
// TÌM TÀI KHOẢN THEO TÁC GIẢ
function findAuthorAccount(name, authorId) {
  return MOCK_ACCOUNTS.find((account) =>
    authorId != null
      ? String(account.id) === String(authorId)
      : account.fullName === name
  );
}

// KIỂM TRA QUYỀN SỞ HỮU
function isOwnedBy(item, account) {
  if (!item || !account) return false;

  if (item.authorId != null) {
    return String(item.authorId) === String(account.id);
  }

  return item.author === account.fullName;
}

// DỮ LIỆU BÀI VIẾT MẪU
const samplePosts = [
  {
    id: 1,
    authorId: 1,
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
    authorId: 2,
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
    authorId: 3,
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

  const target = getAccountById(user?.id);

  return (
    isUser(target) &&
    String(target.id) !== String(CURRENT_USER_ID) &&
    !isBlockedBetween(CURRENT_USER_ID, target.id)
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
  const account = findAuthorAccount(name, authorId);

  if (!account) {
    return {
      fullName: name || "Người dùng",
      avatar: "",
    };
  }

  if (String(account.id) === String(CURRENT_USER_ID)) {
    return profile;
  }

  return readProfile(account);
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
const [posts, setPosts] = useState(getPosts);
// CẬP NHẬT VÀ LƯU BÀI VIẾT
const updatePosts = (updater) => {
  if (!hasUserPermission()) {
    alert("Bạn không có quyền thực hiện chức năng này!");
    return false;
  }

  try {
    const currentPosts = getPosts();

    const updatedPosts =
      typeof updater === "function"
        ? updater(currentPosts)
        : updater;

    localStorage.setItem(
      POSTS_KEY,
      JSON.stringify(updatedPosts)
    );

    setPosts(updatedPosts);

    window.dispatchEvent(
      new Event(POSTS_EVENT)
    );

    return true;
  } catch (error) {
    console.error("Không thể lưu bài viết:", error);

    alert(
      "Không thể lưu bài viết. Có thể bộ nhớ đã đầy!"
    );

    return false;
  }
};

// KIỂM TRA QUYỀN XEM BÀI VIẾT
const canViewPost = (post) => {
  if (!post || !hasUserPermission()) {
    return false;
  }

  const author = findAuthorAccount(
    post.author,
    post.authorId
  );

  // KHÔNG HIỂN THỊ BÀI VIẾT CỦA ADMIN
  if (author && !isUser(author)) {
    return false;
  }

  // BÀI VIẾT CỦA CHÍNH MÌNH
  if (isOwnPost(post)) return true;

  // KIỂM TRA CHẶN
  if (
    author &&
    isBlockedBetween(CURRENT_USER_ID, author.id)
  ) {
    return false;
  }

  // BÀI VIẾT RIÊNG TƯ
  if (post.privacy === "private") {
    return false;
  }

  // BÀI VIẾT DÀNH CHO BẠN BÈ
  if (post.privacy === "friends") {
    return Boolean(
      author &&
      getFriendIds(CURRENT_USER_ID)
        .includes(String(author.id))
    );
  }

  // BÀI VIẾT CÔNG KHAI
  return !post.privacy || post.privacy === "public";
};

// KIỂM TRA QUYỀN XEM BÀI VIẾT CHIA SẺ
const canViewFeedPost = (post, allPosts = posts) => {
  if (!canViewPost(post)) {
    return false;
  }

  if (!post.isShared) {
    return true;
  }

  const original = allPosts.find(
    (item) =>
      String(item.id) ===
      String(post.originalPost?.id)
  );

  return Boolean(
    original &&
    !original.isShared &&
    canViewPost(original)
  );
};

// ĐỒNG BỘ NỘI DUNG BÀI VIẾT GỐC
const resolveFeedPost = (post, allPosts = posts) => {
  if (!canViewFeedPost(post, allPosts)) {
    return null;
  }

  if (!post.isShared) {
    return post;
  }

  const original = allPosts.find(
    (item) =>
      String(item.id) ===
      String(post.originalPost?.id)
  );

  return {
    ...post,
    originalPost: original,
  };
};

// DANH SÁCH BÀI VIẾT ĐƯỢC PHÉP XEM
const visiblePosts = posts
  .map((post) => resolveFeedPost(post, posts))
  .filter(Boolean);

// DANH SÁCH STORY
const [stories, setStories] = useState(getStories);

// XEM STORY
const [activeStoryId, setActiveStoryId] = useState(null);

// TÌM TÀI KHOẢN ĐĂNG TIN
const getStoryAccount = (story) => {
  return findAuthorAccount(
    story.author ||
      (story.name === "Bạn"
        ? MOCK_ACCOUNTS[0].fullName
        : story.name),
    story.authorId
  );
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

  const account = getStoryAccount(story);

  // KHÔNG HIỂN THỊ TIN CỦA ADMIN
  if (!isUser(account)) {
    return false;
  }

  // KIỂM TRA TIN HẾT HẠN
  if (
    story.expiresAt &&
    !(new Date(story.expiresAt).getTime() > Date.now())
  ) {
    return false;
  }

  // TIN CỦA CHÍNH MÌNH
  if (isOwnStory(story)) {
    return true;
  }

  // KIỂM TRA CHẶN
  if (
    isBlockedBetween(
      CURRENT_USER_ID,
      account.id
    )
  ) {
    return false;
  }

  // TIN RIÊNG TƯ
  if (story.privacy === "private") {
    return false;
  }

  // TIN DÀNH CHO BẠN BÈ
  if (story.privacy === "friends") {
    return getFriendIds(CURRENT_USER_ID)
      .map(String)
      .includes(String(account.id));
  }

  // TIN CÔNG KHAI
  return (
    !story.privacy ||
    story.privacy === "public"
  );
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
const handleViewStory = (story) => {
  const current = getStories();

  const target = current.find(
    (item) => item.id === story.id
  );

  if (!target || !canViewStory(target)) {
    alert("Tin không còn khả dụng!");
    return;
  }

  setActiveStoryId(target.id);

  if (isOwnStory(target)) return;

  try {
    const updated = current.map((item) => {
      if (item.id !== target.id) {
        return item;
      }

      const viewedBy = Array.isArray(item.viewedBy)
        ? item.viewedBy.map(String)
        : [];

      return {
        ...item,
        viewedBy: [
          ...new Set([
            ...viewedBy,
            String(CURRENT_USER_ID),
          ]),
        ],
      };
    });

    localStorage.setItem(
      "miniSocialStories",
      JSON.stringify(updated)
    );

    setStories(updated);

    window.dispatchEvent(
      new Event("miniSocialStoriesUpdated")
    );
  } catch (error) {
    console.error(
      "Không thể cập nhật trạng thái tin:",
      error
    );
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

  const [, setFriendRefresh] = useState(0);

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

// ĐỒNG BỘ BẠN BÈ VÀ NGƯỜI DÙNG
useEffect(() => {
  const refreshFriends = () => {
    const data = readAccountData(
      HIDDEN_KEY,
      [],
      CURRENT_USER_ID
    );

    setHiddenSuggestions(
      Array.isArray(data)
        ? data.map(String)
        : []
    );

    setFriendRefresh((previous) => previous + 1);
  };

  const events = [
    FRIEND_EVENT,
    BLOCKED_EVENT,
    PROFILE_EVENT,
    ACCOUNT_EVENT,
    "storage",
    "focus",
  ];

  events.forEach((event) => {
    window.addEventListener(event, refreshFriends);
  });

  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, refreshFriends);
    });
  };
}, [CURRENT_USER_ID]);

// TRẠNG THÁI KẾT BẠN
const getFeedFriendStatus = (user) =>
  getFriendStatus(user.id);

// DANH SÁCH NGƯỜI LIÊN HỆ
const visibleContacts = (
  hasUserPermission() ? getMockUsers() : []
)
  .filter(
    (account) =>
      String(account.id) !== String(CURRENT_USER_ID) &&
      !isBlockedBetween(
        CURRENT_USER_ID,
        account.id
      )
  )
  .map((account) => {
    const user = getFriendProfile(account.id);

    if (!user) return null;

    return {
      ...user,
      name: user.fullName,
      mutualFriends: getMutualFriends(
        CURRENT_USER_ID,
        account.id
      ),
    };
  })
  .filter(Boolean);

// GỢI Ý KẾT BẠN
const visibleSuggestions = visibleContacts
  .filter(
    (user) =>
      !hiddenSuggestions.includes(String(user.id)) &&
      ["none", "sent"].includes(
        getFeedFriendStatus(user)
      )
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
  const [openComments, setOpenComments] = useState({});

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

  const currentPosts = getPosts();

  const target = currentPosts.find(
    (post) => String(post.id) === targetId
  );

 const resolved = resolveFeedPost(
  target,
  currentPosts
);

setSelectedPost(resolved);
}, [searchParams, CURRENT_USER_ID]);

  // ĐỒNG BỘ BÀI VIẾT GIỮA CÁC TÀI KHOẢN
useEffect(() => {
  const refreshPosts = () => {
    setPosts(getPosts());
  };

  const handleStorage = (event) => {
    if (
      event.key === POSTS_KEY ||
      event.key === null
    ) {
      refreshPosts();
    }
  };

  window.addEventListener(
    POSTS_EVENT,
    refreshPosts
  );

  window.addEventListener(
    "storage",
    handleStorage
  );

  window.addEventListener(
    "focus",
    refreshPosts
  );

  return () => {
    window.removeEventListener(
      POSTS_EVENT,
      refreshPosts
    );

    window.removeEventListener(
      "storage",
      handleStorage
    );

    window.removeEventListener(
      "focus",
      refreshPosts
    );
  };
}, []);

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

  authorId: CURRENT_USER_ID,
  author: CURRENT_USER,
  authorUsername: currentAccount.username,

  content: content.trim(),
  feeling: feeling,
  location: location.trim(),

  image: imagePreviews[0] || "",
  images: imagePreviews,

  createdAt: new Date().toISOString(),

  privacy: privacy,

  likedBy: [],
  savedBy: [],

  likeCount: 0,
  comments: [],
};

    const success = updatePosts((prevPosts) => [
  newPost,
  ...prevPosts,
]);

if (!success) return;

setPrivacy("public");
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
  if (!isOwnPost(post)) return;

  setEditingId(post.id);
  setEditingContent(post.content || "");
  setEditingPrivacy(post.privacy || "public");

  setEditingImages(
    post.images || (post.image ? [post.image] : [])
  );
};

  // LƯU CHỈNH SỬA BÀI VIẾT
const handleUpdatePost = (id) => {
  const currentPost = getPosts().find(
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

  const success = updatePosts((prevPosts) =>
    prevPosts.map((post) =>
      String(post.id) === String(id)
        ? {
            ...post,

            content: editingContent.trim(),
            images: editingImages,
            image: editingImages[0] || "",

            privacy: editingPrivacy,
            updatedAt: new Date().toISOString(),
          }
        : post
    )
  );

  if (!success) return;

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
  const handleDelete = (id) => {
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

    updatePosts((prevPosts) =>
      prevPosts.filter((post) => post.id !== id)
    );
  };

  // ĐỌC DANH SÁCH NGƯỜI TƯƠNG TÁC
const getInteractionIds = (post, field, legacyField) => {
  if (Array.isArray(post[field])) {
    return post[field].map(String);
  }

  // DỮ LIỆU CŨ THUỘC TÀI KHOẢN SỐ 1
  return post[legacyField] ? ["1"] : [];
};

// KIỂM TRA ĐÃ LƯU BÀI VIẾT
const isPostSaved = (post) =>
  getInteractionIds(post, "savedBy", "isSaved")
    .includes(String(CURRENT_USER_ID));

// KIỂM TRA ĐÃ LIKE
const isPostLiked = (post) =>
  getInteractionIds(post, "likedBy", "liked")
    .includes(String(CURRENT_USER_ID));

    // GỬI THÔNG BÁO CHO CHỦ BÀI VIẾT
const notifyPostOwner = (
  post,
  type,
  message,
  extra = {}
) => {
  const owner = findAuthorAccount(
    post.author,
    post.authorId
  );

  if (!owner) return;

  // KHÔNG GỬI THÔNG BÁO CHO CHÍNH MÌNH
  if (
    String(owner.id) === String(CURRENT_USER_ID)
  ) {
    return;
  }

  // KHÔNG GỬI NẾU HAI TÀI KHOẢN ĐÃ CHẶN NHAU
  if (
    isBlockedBetween(CURRENT_USER_ID, owner.id)
  ) {
    return;
  }

  addNotification({
    ...extra,
    type,
    senderId: CURRENT_USER_ID,
    receiverId: owner.id,
    message,
    postId: post.id,
  });
};

// LƯU HOẶC BỎ LƯU BÀI VIẾT
const handleSavePost = (id) => {
  updatePosts((previous) =>
    previous.map((post) => {
      if (post.id !== id) return post;

      const userId = String(CURRENT_USER_ID);

      const savedBy = getInteractionIds(
        post,
        "savedBy",
        "isSaved"
      );

      return {
        ...post,
        savedBy: savedBy.includes(userId)
          ? savedBy.filter((item) => item !== userId)
          : [...savedBy, userId],
      };
    })
  );
};

// THÍCH HOẶC BỎ THÍCH
const handleLike = (id) => {
  const currentPosts = getPosts();

  const target = currentPosts.find(
    (post) => String(post.id) === String(id)
  );

  if (!target || !canViewFeedPost(target, currentPosts)) {
    alert("Bài viết không còn khả dụng!");
    return;
  }

  const userId = String(CURRENT_USER_ID);

  const alreadyLiked = isPostLiked(target);

  const success = updatePosts((previous) =>
    previous.map((post) => {
      if (String(post.id) !== String(id)) {
        return post;
      }

      const likedBy = getInteractionIds(
        post,
        "likedBy",
        "liked"
      );

      const currentCount = Number(post.likeCount) || 0;

      return {
        ...post,

        likedBy: alreadyLiked
          ? likedBy.filter((item) => item !== userId)
          : [...new Set([...likedBy, userId])],

        likeCount: alreadyLiked
          ? Math.max(0, currentCount - 1)
          : currentCount + 1,
      };
    })
  );

  if (!success) return;

  // CHỈ GỬI THÔNG BÁO KHI THÍCH
  if (!alreadyLiked) {
    notifyPostOwner(
      target,
      "like",
      "đã thích bài viết của bạn."
    );
  }
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

  const currentPosts = getPosts();

  const post = currentPosts.find(
    (item) => String(item.id) === String(id)
  );

  if (!post || !canViewFeedPost(post, currentPosts)) {
    alert("Bài viết không còn khả dụng!");
    return;
  }

  const newComment = {
    id: crypto.randomUUID(),

    authorId: CURRENT_USER_ID,
    author: CURRENT_USER,
    authorUsername: currentAccount.username,

    content: commentText,
    createdAt: new Date().toISOString(),
  };

  const success = updatePosts((prevPosts) =>
    prevPosts.map((item) =>
      String(item.id) === String(id)
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

  if (!success) return;

  // GỬI THÔNG BÁO CHO CHỦ BÀI VIẾT
  notifyPostOwner(
    post,
    "comment",
    "đã bình luận về bài viết của bạn.",
    {
      commentId: newComment.id,
    }
  );

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
const handleUpdateComment = (postId, commentId) => {
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

    updatePosts((prevPosts) =>
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

    updatePosts((prevPosts) =>
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

  
  // MỞ POPUP CHIA SẺ
const handleShare = (post) => {
  const currentPosts = getPosts();

  const target = currentPosts.find(
    (item) =>
      String(item.id) === String(post.id)
  );

  const resolved = resolveFeedPost(
    target,
    currentPosts
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
const handleConfirmShare = () => {
  if (!sharingPost) return;

  const currentPosts = getPosts();

  const target = currentPosts.find(
    (post) =>
      String(post.id) === String(sharingPost.id)
  );

  if (!target || !canViewFeedPost(target, currentPosts)) {
    alert("Bài viết không còn khả dụng!");
    handleCancelShare();
    return;
  }

  const original = target.isShared
    ? currentPosts.find(
        (post) =>
          String(post.id) ===
          String(target.originalPost?.id)
      )
    : target;

  if (
    !original ||
    !canViewPost(original) ||
    (original.privacy || "public") !== "public"
  ) {
    alert("Chỉ được chia sẻ bài viết công khai!");
    return;
  }

  const sharedPost = {
    id: crypto.randomUUID(),

    authorId: CURRENT_USER_ID,
    author: CURRENT_USER,
    authorUsername: currentAccount.username,

    content: shareContent.trim(),
    image: "",
    images: [],

    createdAt: new Date().toISOString(),
    privacy: "public",

    likedBy: [],
    savedBy: [],
    likeCount: 0,
    comments: [],

    isShared: true,

    originalPost: {
  id: original.id,
},
  };

  const success = updatePosts((previous) => [
  sharedPost,
  ...previous,
]);

if (!success) return;

// THÔNG BÁO CHO TÁC GIẢ BÀI VIẾT GỐC
notifyPostOwner(
  original,
  "share",
  "đã chia sẻ bài viết của bạn."
);

handleCancelShare();

alert("Chia sẻ bài viết thành công!");
};
  

// KIỂM TRA BÁO CÁO TRÙNG LẶP
const hasPendingReport = (postId, reports) => {
  return reports.some((report) => {
    if (!report) return false;

    const isSameReporter =
      report.reporterId != null
        ? String(report.reporterId) ===
          String(CURRENT_USER_ID)
        : report.reporter === CURRENT_USER;

    return (
      String(report.postId) === String(postId) &&
      isSameReporter &&
      (report.status || "pending") === "pending"
    );
  });
};

// MỞ POPUP BÁO CÁO
const handleReportPost = (post) => {
  if (!hasUserPermission()) {
  alert("Bạn không có quyền báo cáo bài viết!");
  return;
}

  const currentPosts = getPosts();

  const target = currentPosts.find(
    (item) =>
      String(item.id) === String(post.id)
  );

  const resolved = resolveFeedPost(
    target,
    currentPosts
  );

  // KIỂM TRA QUYỀN XEM
  if (!resolved) {
    alert("Bài viết không còn khả dụng!");
    return;
  }

  // KHÔNG CHO TỰ BÁO CÁO
  if (isOwnPost(target)) {
    alert("Bạn không thể báo cáo bài viết của mình!");
    return;
  }

  // KIỂM TRA BÁO CÁO TRÙNG
  if (hasPendingReport(target.id, getReports())) {
    alert(
      "Bạn đã báo cáo bài viết này và đang chờ xử lý!"
    );
    return;
  }

  setReportingPost(resolved);
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

  const account = getCurrentAccount();

 if (
  !isUser(account) ||
  String(account.id) !== String(CURRENT_USER_ID)
) {
    alert("Phiên đăng nhập không còn hợp lệ!");
    handleCancelReport();
    return;
  }

  // KIỂM TRA LÝ DO
  if (!reportReasons.includes(reportReason)) {
    alert("Vui lòng chọn lý do báo cáo!");
    return;
  }

  const detail = reportDetail.trim();

  if (
    reportReason === "Lý do khác" &&
    !detail
  ) {
    alert("Vui lòng nhập lý do cụ thể!");
    return;
  }

  if (detail.length > 500) {
    alert("Mô tả không được vượt quá 500 ký tự!");
    return;
  }

  try {
    // ĐỌC BÀI VIẾT MỚI NHẤT
    const currentPosts = getPosts();

    const target = currentPosts.find(
      (post) =>
        String(post.id) ===
        String(reportingPost.id)
    );

    const resolved = resolveFeedPost(
      target,
      currentPosts
    );

    // KIỂM TRA LẠI QUYỀN XEM
    if (!resolved) {
      alert("Bài viết không còn khả dụng!");
      handleCancelReport();
      return;
    }

    // KIỂM TRA QUYỀN SỞ HỮU
    if (isOwnPost(target)) {
      alert(
        "Bạn không thể báo cáo bài viết của mình!"
      );
      handleCancelReport();
      return;
    }

    // ĐỌC DANH SÁCH BÁO CÁO MỚI NHẤT
    const reports = getReports();

    if (hasPendingReport(target.id, reports)) {
      alert(
        "Báo cáo của bạn đang chờ xử lý!"
      );
      handleCancelReport();
      return;
    }

    // XÁC ĐỊNH CHỦ BÀI VIẾT
    const author = findAuthorAccount(
      target.author,
      target.authorId
    );

    const images = getPostImages(target);

    // TẠO BÁO CÁO
    const newReport = {
      id: crypto.randomUUID(),

      postId: target.id,

      postAuthorId:
        target.authorId ?? author?.id ?? null,

      postAuthor: target.author || "Người dùng",

      postContent: target.content || "",

      postImage: images[0] || "",
      postImages: images,

      postPrivacy: target.privacy || "public",

      isShared: Boolean(target.isShared),

      originalPostId: target.isShared
        ? target.originalPost?.id ?? null
        : null,

      reporterId: account.id,
      reporter: account.fullName,
      reporterUsername: account.username,

      reason: reportReason,
      detail: detail,

      status: "pending",

      createdAt: new Date().toISOString(),

      processedAt: null,
      processedById: null,
      processedBy: null,
      action: null,
    };

    // ĐỒNG BỘ BÀI VIẾT MẪU NẾU CHƯA ĐƯỢC LƯU
if (localStorage.getItem(POSTS_KEY) === null) {
  localStorage.setItem(
    POSTS_KEY,
    JSON.stringify(currentPosts)
  );

  window.dispatchEvent(new Event(POSTS_EVENT));
}

// LƯU BÁO CÁO
localStorage.setItem(
  REPORTS_KEY,
  JSON.stringify([newReport, ...reports])
);

    // ĐỒNG BỘ VỚI TRANG QUẢN TRỊ
    window.dispatchEvent(
      new Event(REPORTS_EVENT)
    );

    handleCancelReport();

    alert(
      "Báo cáo của bạn đã được ghi nhận. Quản trị viên sẽ xem xét và xử lý!"
    );
  } catch (error) {
    console.error(
      "Lỗi khi lưu báo cáo:",
      error
    );

    alert(
      "Không thể lưu báo cáo. Vui lòng thử lại!"
    );
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
const handleFeedAddFriend = (user) => {
  if (!canInteractWithUser(user)) {
    alert("Không thể kết bạn với người dùng này!");
    return;
  }

  if (getFriendStatus(user.id) !== "none") {
    return;
  }

  if (!sendFriendRequest(user.id)) {
    alert("Không thể gửi lời mời kết bạn!");
    return;
  }

  setFriendRefresh((previous) => previous + 1);
};

// HỦY LỜI MỜI KẾT BẠN
const handleFeedCancelRequest = (user) => {
  if (!canInteractWithUser(user)) {
    return;
  }

  const relationship = getRelationship(
    CURRENT_USER_ID,
    user.id
  );

  if (
    !relationship ||
    getFriendStatus(user.id) !== "sent"
  ) {
    return;
  }

  if (!cancelFriendRequest(relationship.id)) {
    alert("Không thể hủy lời mời kết bạn!");
    return;
  }

  setFriendRefresh((previous) => previous + 1);
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
  const currentPosts = getPosts();

  const target = currentPosts.find(
    (item) =>
      String(item.id) === String(post.id)
  );

  const resolved = resolveFeedPost(
    target,
    currentPosts
  );

  if (!resolved) {
    alert("Bài viết không còn khả dụng!");
    return;
  }

  setSelectedPost(resolved);
};
  const goToProfile = (name, authorId) => {
  if (!hasUserPermission()) return;

  const account = findAuthorAccount(name, authorId);

  if (account && !isUser(account)) {
    alert("Hồ sơ này không khả dụng!");
    return;
  }
  if (!account) {
    navigate(`/profile?user=${encodeURIComponent(name || "")}`);
    return;
  }

  if (String(account.id) === String(CURRENT_USER_ID)) {
    navigate("/profile");
    return;
  }

  navigate(`/profile?userId=${account.id}`);
};
  const getPostImages = (post) => post.images?.length ? post.images : (post.image ? [post.image] : []);

  return (
    <div className="feed-content-layout">
      {/* CỘT GIỮA */}
      <main className="facebook-feed">

        
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
          {visiblePosts.length === 0 ? (
            <div className="empty-post">
              Chưa có bài viết nào. Hãy chia sẻ điều gì đó nhé!
            </div>
          ) : (
            visiblePosts.map((post) => {
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

                    <span onClick={() => openPostDetail(post)} className="post-stat-clickable">{comments.length} bình luận</span>
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

                  {/* BÌNH LUẬN */}
                  {openComments[post.id] && (
                    <div className="facebook-comments">
                      {comments.map((comment) => (
                        <div
                          className="comment-item"
                          key={comment.id}
                        >
                          <button type="button" className="comment-avatar profile-link-button" onClick={() => goToProfile(comment.author, comment.authorId)}>
                           {renderAvatar(comment.author)}
                          </button>

                          <div className="comment-content">
                            <strong className="clickable-author" onClick={() => goToProfile(comment.author, comment.authorId)}>
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

                            {isOwnComment(comment) &&
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
