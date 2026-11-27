import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { addNotification } from "./notification/notificationUtils";
import {
  MOCK_ACCOUNTS,
  ACCOUNT_EVENT,
  getCurrentAccount,
  getAccountById,
  getAccountByName,
  readAccountData,
  saveAccountData,
  getMockUsers,
  isUser,
} from "../utils/mockAccounts";
import {
  FRIEND_EVENT,
  BLOCKED_EVENT,
  getFriendProfile,
  getFriendStatus,
  getFriendIds,
  getRelationship,
  isBlockedBetween,
  sendFriendRequest,
  cancelFriendRequest,
} from "../utils/friendUtils";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

function readProfile(
  account = getCurrentAccount() || MOCK_ACCOUNTS[0]
) {
  const defaultProfile = {
    ...account,
    avatar: account.avatar || "",
  };

  try {
    const legacyProfile =
      account.id === 1
        ? JSON.parse(
            localStorage.getItem(PROFILE_KEY) || "{}"
          )
        : {};

    const saved = readAccountData(
      PROFILE_KEY,
      legacyProfile,
      account.id
    );

    return {
      ...defaultProfile,
      ...saved,
      id: account.id,
      username: account.username,
      email: account.email,
    };
  } catch {
    return defaultProfile;
  }
}

// HOOK ĐỒNG BỘ HỒ SƠ
function useCurrentProfile() {
  const [profile, setProfile] = useState(readProfile);

  useEffect(() => {
    const refreshProfile = () => {
      setProfile(readProfile());
    };

    refreshProfile();

    const events = [
      ACCOUNT_EVENT,
      PROFILE_EVENT,
      "storage",
      "focus",
    ];

    events.forEach((event) => {
      window.addEventListener(event, refreshProfile);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, refreshProfile);
      });
    };
  }, []);

  return profile;
}

// HIỂN THỊ ẢNH ĐẠI DIỆN
function ProfileAvatar({ profile }) {
  if (profile.avatar) {
    return (
      <img
        src={profile.avatar}
        alt="Ảnh đại diện"
        className="synced-avatar-image"
      />
    );
  }

  return (
    profile.fullName
      ?.trim()
      .split(/\s+/)
      .pop()
      ?.charAt(0)
      .toUpperCase() || "U"
  );
}

const storeKey = "miniSocialMessagesV2";
const conversationsKey = "miniSocialConversationsV2";
function readConversations() {
  try {
    const value = readAccountData(
      conversationsKey,
      []
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function Shell({ title, subtitle, children }) {
  const profile = useCurrentProfile();

  return (
    <main className="community-page">
      <header className="community-header">
        <div>
          <Link to="/feed" className="community-back">
            ← Bảng tin
          </Link>

          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <Link
          className="community-home"
          to="/profile"
          title={profile.fullName}
        >
          <ProfileAvatar profile={profile} />
        </Link>
      </header>

      {children}
    </main>
  );
}

export function Stories() {
  const profile = useCurrentProfile();
  const currentAccount =
  getCurrentAccount() || MOCK_ACCOUNTS[0];

const currentUserId = currentAccount.id;

// LẤY TÀI KHOẢN ĐĂNG TIN
const getStoryAccount = (story) => {
  if (!story) return null;

  if (story.authorId != null) {
    return getAccountById(story.authorId);
  }

  return getAccountByName(
    story.author ||
      (story.isMine || story.name === "Bạn"
        ? "Nguyễn Văn A"
        : story.name)
  );
};

// KIỂM TRA QUYỀN SỞ HỮU TIN
const isOwnStory = (story) => {
  const account = getStoryAccount(story);

  return (
    isUser(getCurrentAccount()) &&
    isUser(account) &&
    String(account.id) === String(currentUserId)
  );
};

// KIỂM TRA QUYỀN XEM TIN
const canViewStory = (story) => {
  if (!story || !isUser(getCurrentAccount())) {
    return false;
  }

  // KIỂM TRA TIN HẾT HẠN
  if (
    story.expiresAt &&
    !(Date.parse(story.expiresAt) > Date.now())
  ) {
    return false;
  }

  const author = getStoryAccount(story);

  // CHỈ CHO PHÉP XEM TIN CỦA USER
  if (!isUser(author)) {
    return false;
  }

  // CHỦ TIN ĐƯỢC XEM TIN CỦA MÌNH
  if (isOwnStory(story)) {
    return true;
  }

  // KIỂM TRA CHẶN HAI CHIỀU
  if (isBlockedBetween(currentUserId, author.id)) {
    return false;
  }

  const privacy = story.privacy || "public";

  if (privacy === "public") {
    return true;
  }

  if (privacy === "friends") {
    return getFriendIds(currentUserId)
      .map(String)
      .includes(String(author.id));
  }

  return false;
};

// HIỂN THỊ QUYỀN RIÊNG TƯ CỦA TIN
const getStoryPrivacyLabel = (privacy) => {
  switch (privacy) {
    case "friends":
      return "👥 Bạn bè";

    case "private":
      return "🔒 Chỉ mình tôi";

    default:
      return "🌍 Công khai";
  }
};

// LẤY HỒ SƠ NGƯỜI ĐĂNG TIN
const getStoryProfile = (story) => {
  const account = getStoryAccount(story);

  if (account) {
    return readProfile(account);
  }

  return {
    fullName:
      story?.author ||
      story?.name ||
      "Người dùng",
    avatar: "",
  };
};

// KIỂM TRA TRẠNG THÁI ĐÃ XEM
const isStorySeen = (story) => {
  const viewedBy = Array.isArray(story.viewedBy)
    ? story.viewedBy.map(String)
    : [];

  return viewedBy.includes(String(currentUserId));
};
  const STORY_KEY = "miniSocialStories";
  const STORY_EVENT = "miniSocialStoriesUpdated";
  const STORY_DURATION = 24 * 60 * 60 * 1000;

  // ĐỌC DANH SÁCH TIN
  const readStories = () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORY_KEY) || "[]"
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
  };

  const [stories, setStories] = useState(readStories);
  const [active, setActive] = useState(null);

  // TẠO TIN
  const [isCreating, setIsCreating] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [isLoading, setIsLoading] = useState(false);

  const [color, setColor] = useState(
    "linear-gradient(145deg,#2563eb,#8b5cf6)"
  );

  const colors = [
    "linear-gradient(145deg,#2563eb,#8b5cf6)",
    "linear-gradient(145deg,#ec4899,#f97316)",
    "linear-gradient(145deg,#10b981,#0ea5e9)",
    "linear-gradient(145deg,#ef4444,#f59e0b)",
    "linear-gradient(145deg,#334155,#0f172a)",
    "linear-gradient(145deg,#a855f7,#ec4899)",
  ];

  // LƯU VÀ ĐỒNG BỘ TIN
  const saveStories = (next) => {
    const account = getCurrentAccount();

    if (
      !isUser(account) ||
      String(account.id) !== String(currentUserId)
    ) {
      return false;
    }

    try {
      localStorage.setItem(
        STORY_KEY,
        JSON.stringify(next)
      );

      setStories(next);

      window.dispatchEvent(
        new Event(STORY_EVENT)
      );

      return true;
    } catch {
      alert(
        "Không thể lưu tin. Bộ nhớ trình duyệt có thể đã đầy!"
      );

      return false;
    }
  };

  // TỰ ĐỘNG KIỂM TRA TIN VÀ QUYỀN XEM
useEffect(() => {
  const refreshStories = () => {
    const current = readStories();

    setStories(current);

    setActive((previous) => {
      if (!previous) return null;

      const updated = current.find(
        (item) =>
          String(item.id) === String(previous.id)
      );

      if (!updated || !canViewStory(updated)) {
        return null;
      }

      return updated;
    });
  };

  refreshStories();

  const timer = setInterval(
    refreshStories,
    1000
  );

  const events = [
    STORY_EVENT,
    PROFILE_EVENT,
    ACCOUNT_EVENT,
    FRIEND_EVENT,
    BLOCKED_EVENT,
    "storage",
    "focus",
  ];

  events.forEach((event) => {
    window.addEventListener(
      event,
      refreshStories
    );
  });

  return () => {
    clearInterval(timer);

    events.forEach((event) => {
      window.removeEventListener(
        event,
        refreshStories
      );
    });
  };
}, [currentUserId]);

  // CHỌN ẢNH HOẶC VIDEO
  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      alert("Vui lòng chọn ảnh hoặc video!");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Tệp không được vượt quá 5MB!");
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = () => {
      setMedia(String(reader.result));
      setMediaType(file.type);
      setIsLoading(false);
    };

    reader.onerror = () => {
      setIsLoading(false);
      alert("Không thể đọc tệp. Vui lòng thử lại!");
    };

    reader.readAsDataURL(file);
  };

  // XÓA ẢNH HOẶC VIDEO ĐANG CHỌN
  const handleRemoveMedia = () => {
    setMedia("");
    setMediaType("");
  };

  // HỦY TẠO TIN
  const handleCancel = () => {
    if (isLoading) return;

    setIsCreating(false);
    setText("");
    setMedia("");
    setMediaType("");
    setPrivacy("public");
  };

  // ĐĂNG TIN
  const handleCreateStory = (event) => {
    event.preventDefault();

    const account = getCurrentAccount();

    if (
      !isUser(account) ||
      String(account.id) !== String(currentUserId)
    ) {
      alert("Bạn không có quyền đăng tin!");
      return;
    }

    if (isLoading) return;

    if (!text.trim() && !media) {
      alert("Vui lòng nhập nội dung hoặc chọn ảnh/video!");
      return;
    }

    const newStory = {
  id: Date.now(),
  authorId: currentUserId,
  author: currentAccount.fullName,
  authorUsername: currentAccount.username,
  name: profile.fullName,
  text: text.trim(),
  media,
  mediaType,
  color,
  privacy,
  viewedBy: [],
  createdAt: new Date().toISOString(),
  expiresAt: new Date(
    Date.now() + STORY_DURATION
  ).toISOString(),
};

    const next = [newStory, ...readStories()];

    if (saveStories(next)) {
      handleCancel();
      alert("Đăng tin thành công!");
    }
  };

 // XEM TIN
const handleViewStory = (story) => {
  const currentStories = readStories();

  const currentStory = currentStories.find(
    (item) =>
      String(item.id) === String(story.id)
  );

  if (!currentStory) {
    alert("Tin này đã hết hạn hoặc đã bị xóa!");
    return;
  }

  if (!canViewStory(currentStory)) {
    alert("Bạn không có quyền xem tin này!");
    return;
  }

  // XEM TIN CỦA CHÍNH MÌNH
  if (isOwnStory(currentStory)) {
    setActive(currentStory);
    return;
  }

  // DANH SÁCH NGƯỜI ĐÃ XEM
  const viewedBy = Array.isArray(
    currentStory.viewedBy
  )
    ? currentStory.viewedBy.map(String)
    : [];

  // ĐÃ XEM TRƯỚC ĐÓ
  if (viewedBy.includes(String(currentUserId))) {
    setActive(currentStory);
    return;
  }

  const updatedStory = {
    ...currentStory,
    viewedBy: [
      ...new Set([
        ...viewedBy,
        String(currentUserId),
      ]),
    ],
  };

  const updatedStories = currentStories.map(
    (item) =>
      String(item.id) === String(currentStory.id)
        ? updatedStory
        : item
  );

  if (saveStories(updatedStories)) {
    setActive(updatedStory);
  }
};

  // XÓA TIN
const handleDeleteStory = (story) => {
  const currentStories = readStories();

  const currentStory = currentStories.find(
    (item) => item.id === story.id
  );

  if (!currentStory) {
    setActive(null);
    return;
  }

  if (!isOwnStory(currentStory)) {
    alert("Bạn không có quyền xóa tin này!");
    return;
  }

  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn xóa tin này không?"
  );

  if (!confirmed) return;

  const next = currentStories.filter(
    (item) => item.id !== currentStory.id
  );

  if (saveStories(next)) {
    setActive(null);
  }
};

  // DANH SÁCH TIN CỦA TÀI KHOẢN HIỆN TẠI
const myStories = stories.filter(
  (story) =>
    isOwnStory(story) &&
    canViewStory(story)
);

// DANH SÁCH TIN CỦA NGƯỜI DÙNG KHÁC
const friendStories = stories
  .filter(
    (story) =>
      !isOwnStory(story) &&
      canViewStory(story)
  )
  .map((story) => ({
    ...story,
    name: getStoryProfile(story).fullName,
    seen: isStorySeen(story),
  }));

  return (
    <Shell
      title="Tin"
      subtitle="Chia sẻ khoảnh khắc với bạn bè trong 24 giờ."
    >
      {/* TIN CỦA BẠN */}
      <section className="community-panel">
        <div className="community-panel-title">
          <h2>Tin của bạn</h2>

          <button
            type="button"
            onClick={() => setIsCreating(true)}
          >
            ＋ Tạo tin
          </button>
        </div>

        <div className="story-grid">
          <button
            type="button"
            className="story-tile"
            onClick={() => setIsCreating(true)}
          >
            <span
              style={{
                background: "#2563eb",
              }}
            >
              ＋
            </span>

            <b>Tạo tin mới</b>
            <small>Chia sẻ khoảnh khắc</small>
          </button>

          {myStories.map((story) => (
            <button
              type="button"
              className="story-tile"
              key={story.id}
              onClick={() => handleViewStory(story)}
            >
              <span
                style={{
                  background: story.color,
                  overflow: "hidden",
                }}
              >
                {story.media ? (
                  story.mediaType?.startsWith("video/") ? (
                    <video
                      src={story.media}
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <img
                      src={story.media}
                      alt="Tin của bạn"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )
                ) : (
                  <small
                    style={{
                      color: "white",
                      padding: 10,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {story.text}
                  </small>
                )}
              </span>

              <b>Tin của bạn</b>
              <small>
  {getStoryPrivacyLabel(story.privacy)}
</small>
            </button>
          ))}
        </div>
      </section>

      {/* TIN CỦA BẠN BÈ */}
      <section
        className="community-panel"
        style={{ marginTop: 20 }}
      >
        <div className="community-panel-title">
          <h2>Tin của mọi người</h2>
        </div>

        <div className="story-grid">
          {friendStories.length === 0 && (
  <p className="story-empty-message">
    Chưa có tin mới từ người dùng khác.
  </p>
)}
          {friendStories.map((story) => (
            <button
              type="button"
              className="story-tile"
              key={story.id}
              onClick={() => handleViewStory(story)}
            >
              <span
                style={{
                  background: story.color,
                  overflow: "hidden",
                }}
              >
                {story.media ? (
                  story.mediaType?.startsWith("video/") ? (
                    <video
                      src={story.media}
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <img
                      src={story.media}
                      alt="Tin bạn bè"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )
                ) : (
                  story.name?.charAt(0)
                )}
              </span>

              <b>{story.name}</b>

              <small>
               {story.seen ? "Đã xem" : "Tin mới"}
{" · "}
{getStoryPrivacyLabel(story.privacy)}
              </small>
            </button>
          ))}
        </div>
      </section>

      {/* POPUP TẠO TIN */}
      {isCreating && (
        <div
          className="community-modal"
          onClick={handleCancel}
        >
          <form
            className="story-create-modal"
            onSubmit={handleCreateStory}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="story-create-header">
              <h2>Tạo tin</h2>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleCancel}
              >
                ✕
              </button>
            </div>

            <div className="story-create-user">
              <div className="feed-avatar">
  <ProfileAvatar profile={profile} />
</div>

              <div>
                <strong>{profile.fullName}</strong>

                <select
                  value={privacy}
                  onChange={(event) =>
                    setPrivacy(event.target.value)
                  }
                >
                  <option value="public">
                    🌍 Công khai
                  </option>

                  <option value="friends">
                    👥 Bạn bè
                  </option>

                  <option value="private">
                    🔒 Chỉ mình tôi
                  </option>
                </select>
              </div>
            </div>

            {/* XEM TRƯỚC TIN */}
            <div
              className="story-create-preview"
              style={{ background: color }}
            >
              {media && (
                <>
                  {mediaType.startsWith("video/") ? (
                    <video src={media} controls />
                  ) : (
                    <img
                      src={media}
                      alt="Xem trước tin"
                    />
                  )}

                  <button
                    type="button"
                    className="story-remove-media"
                    onClick={handleRemoveMedia}
                  >
                    ✕
                  </button>
                </>
              )}

              {text && (
                <div className="story-preview-text">
                  {text}
                </div>
              )}

              {!media && !text && (
                <span>Nội dung tin của bạn</span>
              )}
            </div>

            {/* NHẬP NỘI DUNG */}
            <textarea
              placeholder="Bạn muốn chia sẻ điều gì?"
              value={text}
              maxLength={500}
              onChange={(event) =>
                setText(event.target.value)
              }
            />

            <div className="post-character-count">
              {text.length}/500
            </div>

            {/* CHỌN MÀU NỀN */}
            <div className="story-color-options">
              {colors.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-label="Chọn màu nền"
                  className={
                    color === item ? "selected" : ""
                  }
                  style={{ background: item }}
                  onClick={() => setColor(item)}
                />
              ))}
            </div>

            {/* THÊM ẢNH HOẶC VIDEO */}
            <label className="story-upload-button">
              📷 Thêm ảnh / video

              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                disabled={isLoading}
                hidden
              />
            </label>

            <button
              type="submit"
              className="story-submit-button"
              disabled={
                isLoading || (!text.trim() && !media)
              }
            >
              {isLoading
                ? "Đang đọc tệp..."
                : "Chia sẻ lên tin"}
            </button>
          </form>
        </div>
      )}

      {/* POPUP XEM TIN */}
{active && canViewStory(active) && (
        <div
          className="community-modal"
          onClick={() => setActive(null)}
        >
          <div
            className="story-view"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setActive(null)}
            >
              ×
            </button>

            <div
              className="story-art"
              style={{
                background: active.color,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {active.media ? (
                active.mediaType?.startsWith("video/") ? (
                  <video
                    src={active.media}
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    src={active.media}
                    alt="Tin"
                  />
                )
              ) : (
                active.text || active.name
              )}

              {active.media && active.text && (
                <div className="story-preview-text">
                  {active.text}
                </div>
              )}
            </div>

            <div className="story-view-user">
  <div className="feed-avatar">
    <ProfileAvatar
      profile={getStoryProfile(active)}
    />
  </div>

  <div className="story-view-user-info">
  <b>
    {getStoryProfile(active).fullName}
  </b>

  <small>
    {getStoryPrivacyLabel(active.privacy)}
  </small>
</div>
</div>

            {isOwnStory(active) && (
              <button
                type="button"
                className="story-delete-button"
                onClick={() =>
                  handleDeleteStory(active)
                }
              >
                🗑 Xóa tin
              </button>
            )}

            <button
              type="button"
              onClick={() => setActive(null)}
            >
              Đóng tin
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ĐỊNH DẠNG THỜI GIAN BÀI VIẾT
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

  if (minutes < 60) {
    return `${minutes} phút trước`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} ngày trước`;
  }

  return date.toLocaleDateString("vi-VN");
}

export function Explore() {
  const profile = useCurrentProfile();

  const currentAccount =
    getCurrentAccount() || MOCK_ACCOUNTS[0];

  const currentUserId = currentAccount.id;

  const POSTS_KEY = "miniSocialPosts";
  const POSTS_EVENT = "miniSocialPostsUpdated";

  // ĐỌC DỮ LIỆU BÀI VIẾT
  const readData = (key) => {
    try {
      const data = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      return Array.isArray(data)
        ? data.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              !Array.isArray(item)
          )
        : [];
    } catch {
      return [];
    }
  };

  // STATE
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [posts, setPosts] = useState(
    () => readData(POSTS_KEY)
  );

  const [, setRefreshVersion] = useState(0);

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
      setPosts(readData(POSTS_KEY));
      setRefreshVersion((previous) => previous + 1);
    };

    refreshData();

    const events = [
      POSTS_EVENT,
      FRIEND_EVENT,
      BLOCKED_EVENT,
      PROFILE_EVENT,
      ACCOUNT_EVENT,
      "storage",
      "focus",
    ];

    events.forEach((event) => {
      window.addEventListener(event, refreshData);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, refreshData);
      });
    };
  }, []);

  // CHUYỂN TIẾNG VIỆT CÓ DẤU THÀNH KHÔNG DẤU
  const normalizeText = (value) => {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  };

 // XÁC ĐỊNH TÀI KHOẢN NGƯỜI ĐĂNG
const findAuthorAccount = (name, authorId) => {
  if (authorId != null) {
    return getAccountById(authorId);
  }

  return getAccountByName(name);
};

// LẤY HỒ SƠ NGƯỜI ĐĂNG
const getAuthorProfile = (name, authorId) => {
  const account = findAuthorAccount(
    name,
    authorId
  );

  if (account) {
    if (
      String(account.id) === String(currentUserId)
    ) {
      return profile;
    }

    return readProfile(account);
  }

  return {
    fullName: name || "Người dùng",
    avatar: "",
  };
};

// HIỂN THỊ TÊN NGƯỜI DÙNG
const displayName = (name, authorId) => {
  return getAuthorProfile(
    name,
    authorId
  ).fullName;
};

// HIỂN THỊ ẢNH ĐẠI DIỆN
const renderAvatar = (name, authorId) => {
  return (
    <ProfileAvatar
      profile={getAuthorProfile(name, authorId)}
    />
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
      String(account.id) === String(currentUserId)
    ) {
      return "/profile";
    }

    return `/profile?userId=${account.id}`;
  }

  return `/profile?user=${encodeURIComponent(
    name || "Người dùng"
  )}`;
};

// KIỂM TRA NGƯỜI DÙNG BỊ CHẶN
const isBlockedAuthor = (name, authorId) => {
  const account = findAuthorAccount(
    name,
    authorId
  );

  if (!account) return false;

  return isBlockedBetween(
    currentUserId,
    account.id
  );
};

// LẤY USERNAME
const getUsername = (person) => {
  return person.username || "";
};

  // LẤY DANH SÁCH ẢNH
  const getImages = (post) => {
    if (
      Array.isArray(post.images) &&
      post.images.length > 0
    ) {
      return post.images;
    }

    return post.image ? [post.image] : [];
  };

  // DANH SÁCH NGƯỜI DÙNG
const allPeople = getMockUsers()
  .filter(
    (account) =>
      String(account.id) !== String(currentUserId)
  )
  .map((account) => {
    const user = getFriendProfile(account.id);

    if (!user) return null;

    return {
      ...user,
      id: account.id,
      name: user.fullName,
      username: account.username,
    };
  })
  .filter(Boolean);

// TÌM KIẾM NGƯỜI DÙNG
const filteredPeople = allPeople.filter(
  (person) => {
    if (
      isBlockedBetween(
        currentUserId,
        person.id
      )
    ) {
      return false;
    }

    const keyword = normalizeText(query);

    const searchableText = normalizeText(
      `${person.name} ${person.username} ${person.bio || ""}`
    );

    return searchableText.includes(keyword);
  }
);

  // KIỂM TRA QUYỀN XEM BÀI VIẾT
const canViewPost = (post) => {
  if (!post || !isUser(getCurrentAccount())) {
    return false;
  }

  const authorAccount = findAuthorAccount(
    post.author,
    post.authorId
  );

  // CHỈ HIỂN THỊ BÀI VIẾT CỦA USER
  if (!isUser(authorAccount)) {
    return false;
  }

  // CHỦ BÀI VIẾT
  if (
    String(authorAccount.id) ===
    String(currentUserId)
  ) {
    return true;
  }

  // KIỂM TRA NGƯỜI BỊ CHẶN
  if (
    isBlockedAuthor(
      post.author,
      post.authorId
    )
  ) {
    return false;
  }

  const privacy = post.privacy || "public";

  if (privacy === "public") {
    return true;
  }

  if (privacy === "friends") {
    return getFriendIds(currentUserId)
      .map(String)
      .includes(String(authorAccount.id));
  }

  return false;
};

// TÌM KIẾM BÀI VIẾT
const filteredPosts = posts
  .filter((post) => canViewPost(post))
  .map((post) => {
    // BÀI VIẾT THÔNG THƯỜNG
    if (!post.isShared) {
      return post;
    }

    // LẤY BÀI VIẾT GỐC MỚI NHẤT
    const original = posts.find(
      (item) =>
        item &&
        String(item.id) ===
          String(post.originalPost?.id)
    );

    // BÀI VIẾT GỐC KHÔNG KHẢ DỤNG
    if (
      !original ||
      original.isShared ||
      !canViewPost(original)
    ) {
      return null;
    }

    // CẬP NHẬT NỘI DUNG BÀI VIẾT GỐC
    return {
      ...post,
      originalPost: original,
    };
  })
  .filter(Boolean)
  .filter((post) => {
    const original = post.originalPost || {};

    const keyword = normalizeText(query);

    const searchableText = normalizeText(
      [
        displayName(
          post.author,
          post.authorId
        ),
        post.content,
        post.feeling,
        post.location,

        original.author
          ? displayName(
              original.author,
              original.authorId
            )
          : "",

        original.content,
        original.feeling,
        original.location,
      ].join(" ")
    );

    return searchableText.includes(keyword);
  });

  // KIỂM TRA TRẠNG THÁI KẾT BẠN
const getPersonFriendStatus = (person) => {
  return getFriendStatus(person.id);
};

// GỬI LỜI MỜI KẾT BẠN
const handleAddFriend = (person) => {
  if (
    !isUser(getCurrentAccount()) ||
    !isUser(getAccountById(person.id))
  ) {
    alert("Không thể kết bạn với tài khoản này!");
    return;
  }

  const success = sendFriendRequest(person.id);

  if (success) {
    alert(
      `Đã gửi lời mời kết bạn cho ${person.name}!`
    );
  } else {
    alert("Không thể gửi lời mời kết bạn!");
  }
};

// HỦY LỜI MỜI KẾT BẠN
const handleCancelRequest = (person) => {
  if (
    !isUser(getCurrentAccount()) ||
    !isUser(getAccountById(person.id))
  ) {
    return;
  }

  const relationship = getRelationship(
    currentUserId,
    person.id
  );

  if (!relationship) return;

  const confirmed = window.confirm(
    `Bạn có muốn hủy lời mời kết bạn với ${person.name} không?`
  );

  if (!confirmed) return;

  const success = cancelFriendRequest(
    relationship.id
  );

  if (success) {
    alert("Đã hủy lời mời kết bạn!");
  } else {
    alert("Không thể hủy lời mời!");
  }
};

  const tabs = [
    {
      id: "all",
      label: "Tất cả",
      count:
        filteredPeople.length + filteredPosts.length,
    },
    {
      id: "people",
      label: "Mọi người",
      count: filteredPeople.length,
    },
    {
      id: "posts",
      label: "Bài viết",
      count: filteredPosts.length,
    },
  ];

  return (
    <Shell
      title="Khám phá"
      subtitle="Tìm kiếm bạn bè và khám phá những nội dung thú vị trên MiniSocial."
    >
      {/* THANH TÌM KIẾM */}
      <section className="community-panel explore-search-panel">
        <div className="explore-search-box">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Tìm kiếm người dùng, bài viết..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {query && (
            <button
              type="button"
              aria-label="Xóa từ khóa"
              onClick={() => setQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        {/* BỘ LỌC */}
        <div className="explore-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={
                activeTab === tab.id ? "active" : ""
              }
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}

              <span>{tab.count}</span>
            </button>
          ))}
        </div>

        {query.trim() && (
          <p className="explore-search-summary">
            Kết quả tìm kiếm cho:{" "}
            <strong>“{query.trim()}”</strong>
          </p>
        )}
      </section>

      {/* KẾT QUẢ NGƯỜI DÙNG */}
      {(activeTab === "all" ||
        activeTab === "people") && (
        <section className="community-panel explore-section">
          <div className="community-panel-title">
            <h2>
              {query.trim()
                ? "Người dùng"
                : "Gợi ý kết bạn"}
            </h2>

            <span className="explore-result-count">
              {filteredPeople.length} kết quả
            </span>
          </div>

          {filteredPeople.length === 0 ? (
            <div className="explore-empty">
              <span>👥</span>
              <h3>Không tìm thấy người dùng</h3>
              <p>Hãy thử tìm kiếm bằng từ khóa khác.</p>
            </div>
          ) : (
            <div className="people-grid">
              {filteredPeople.map((person) => {
                const status = getPersonFriendStatus(person);

                return (
                  <article
                    className="person-card explore-person-card"
                    key={person.id}
                  >
                    <Link
                      to={`/profile?userId=${person.id}`}
                      className={`person-avatar ${person.color || "blue"}`}
                    >
                      <ProfileAvatar profile={person} />
                    </Link>

                    <h3>
  <Link to={`/profile?userId=${person.id}`}>
    {person.name}
  </Link>
</h3>

                    <small className="explore-username">
                      @{getUsername(person)}
                    </small>

                    <p>
                      {person.bio ||
                        "Thành viên MiniSocial"}
                    </p>

                    {status === "accepted" ? (
                      <button
                        type="button"
                        className="explore-friend-added"
                        disabled
                      >
                        ✓ Bạn bè
                      </button>
                    ) : status === "sent" ? (
                      <button
                        type="button"
                        className="explore-request-sent"
                        onClick={() =>
                          handleCancelRequest(person)
                        }
                      >
                        ✓ Đã gửi lời mời
                      </button>
                    ) : (status === "received" || status === "pending") ? (
                     <Link
  className="explore-profile-link"
  to="/friend-requests"
>
  Xem lời mời
</Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleAddFriend(person)
                        }
                      >
                        ＋ Kết bạn
                      </button>
                    )}

                    <Link
  className="explore-profile-link"
  to={`/profile?userId=${person.id}`}
>
  Xem trang cá nhân
</Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* KẾT QUẢ BÀI VIẾT */}
      {(activeTab === "all" ||
        activeTab === "posts") && (
        <section className="community-panel explore-section">
          <div className="community-panel-title">
            <h2>
              {query.trim()
                ? "Bài viết"
                : "Khám phá bài viết"}
            </h2>

            <span className="explore-result-count">
              {filteredPosts.length} kết quả
            </span>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="explore-empty">
              <span>📝</span>

              <h3>Không tìm thấy bài viết</h3>

              <p>
                {query.trim()
                  ? "Hãy thử tìm kiếm bằng từ khóa khác."
                  : "Chưa có bài viết để khám phá."}
              </p>
            </div>
          ) : (
            <div className="explore-post-grid">
              {filteredPosts.map((post) => {
                const original =
                  post.originalPost || post;

                const images = getImages(original);

                return (
                  <article
                    className="explore-post-card"
                    key={post.id}
                  >
                    {/* NGƯỜI ĐĂNG */}
                    <div className="explore-post-header">
  <Link
    className="feed-avatar"
    to={getProfileLink(post.author, post.authorId)}
  >
    {renderAvatar(post.author, post.authorId)}
  </Link>

  <div>
    <Link
      className="explore-post-author"
      to={getProfileLink(post.author, post.authorId)}
    >
      {displayName(post.author, post.authorId)}
    </Link>

    <small>
{formatPostTime(post.createdAt)}
      {post.privacy === "private"
        ? " · 🔒 Chỉ mình tôi"
        : post.privacy === "friends"
        ? " · 👥 Bạn bè"
        : " · 🌍 Công khai"}
    </small>
  </div>
</div>
                    {/* CẢM XÚC VÀ CHECK IN */}
                    {(post.feeling || post.location) && (
                      <div className="explore-post-tags">
                        {post.feeling && (
                          <span>{post.feeling}</span>
                        )}

                        {post.location && (
                          <span>📍 {post.location}</span>
                        )}
                      </div>
                    )}

                    {/* NỘI DUNG */}
                    <Link
                      className="explore-post-content"
                      to={`/feed?postId=${post.id}`}
                    >
                      {post.content && (
                        <p>{post.content}</p>
                      )}

{post.isShared && post.originalPost && (
  <div className="explore-shared-content">

    <div className="explore-shared-user">
      <div className="feed-avatar">
        {renderAvatar(
          original.author,
          original.authorId
        )}
      </div>

      <div>
        <strong>
          {displayName(
            original.author,
            original.authorId
          )}
        </strong>

        <small>
  {formatPostTime(original.createdAt)}

  {original.privacy === "private"
    ? " · 🔒 Chỉ mình tôi"
    : original.privacy === "friends"
    ? " · 👥 Bạn bè"
    : " · 🌍 Công khai"}
</small>
      </div>
    </div>

    {original.content && (
      <p>{original.content}</p>
    )}

  </div>
)}

                      {images.length > 0 && (
                        <div className="explore-post-image">
                          <img
                            src={images[0]}
                            alt="Ảnh bài viết"
                            loading="lazy"
                          />

                          {images.length > 1 && (
                            <span>
                              +{images.length - 1} ảnh
                            </span>
                          )}
                        </div>
                      )}
                    </Link>

                    {/* THỐNG KÊ */}
                    <div className="explore-post-stats">
                      <span>
                        👍 {Number(post.likeCount) || 0}
                      </span>

                      <span>
                        💬{" "}
                        {Array.isArray(post.comments)
                          ? post.comments.length
                          : 0}
                      </span>
                    </div>

                    {/* XEM VÀ TƯƠNG TÁC */}
                    <Link
                      className="explore-view-post"
                      to={`/feed?postId=${post.id}`}
                    >
                      Xem bài viết →
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}


export function Messages() {
  const profile = useCurrentProfile();

  const currentAccount =
    getCurrentAccount() || MOCK_ACCOUNTS[0];

  const currentUserId = String(currentAccount.id);

  const [searchParams, setSearchParams] =
    useSearchParams();

  const requestedUser =
    searchParams.get("user") || "";

  const requestedUserId =
    searchParams.get("userId") || "";

  const MESSAGE_EVENT = "miniSocialMessagesUpdated";

  const readData = (key) => {
    try {
      const data = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      return Array.isArray(data)
        ? data.filter(
            (item) =>
              item &&
              typeof item === "object" &&
              !Array.isArray(item)
          )
        : [];
    } catch {
      return [];
    }
  };

  const [messages, setMessages] = useState(
    () => readData(storeKey)
  );

  const [, setSavedConversations] =
  useState(readConversations);

  const [, setRefreshVersion] = useState(0);

  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState([]);

  const [newContact, setNewContact] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);

  const [searchText, setSearchText] = useState("");

  const [isLoadingImages, setIsLoadingImages] =
    useState(false);

  const messageListRef = useRef(null);
  const imageReadVersion = useRef(0);

  // TÌM KIẾM KHÔNG PHÂN BIỆT DẤU
  const normalizeText = (value) => {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .trim();
  };

  // KIỂM TRA NGƯỜI BỊ CHẶN
const isBlocked = (userId) => {
  return isBlockedBetween(
    currentUserId,
    userId
  );
};

// KIỂM TRA QUYỀN TRÒ CHUYỆN
const canChatWith = (userId) => {
  const account = getCurrentAccount();
  const target = getAccountById(userId);

  return (
    isUser(account) &&
    isUser(target) &&
    String(account.id) === currentUserId &&
    String(target.id) !== currentUserId &&
    !isBlocked(userId)
  );
};

// KIỂM TRA TIN NHẮN CỦA MÌNH
const isMyMessage = (message) => {
  return (
    String(message.senderId) === currentUserId
  );
};

// KIỂM TRA TIN NHẮN THUỘC CUỘC TRÒ CHUYỆN
const belongsToConversation = (message, userId) => {
  const senderId = String(message.senderId);
  const receiverId = String(message.receiverId);
  const targetId = String(userId);

  return (
    (
      senderId === currentUserId &&
      receiverId === targetId
    ) ||
    (
      receiverId === currentUserId &&
      senderId === targetId
    )
  );
};

// KIỂM TRA TIN NHẮN ĐÃ XÓA Ở PHÍA MÌNH
const isDeletedForMe = (message) => {
  const deletedBy = Array.isArray(message.deletedBy)
    ? message.deletedBy.map(String)
    : [];

  return deletedBy.includes(currentUserId);
};

  // ĐỒNG BỘ DỮ LIỆU
useEffect(() => {
  const refreshData = () => {
    setMessages(readData(storeKey));
    setSavedConversations(readConversations());
    setRefreshVersion((previous) => previous + 1);
  };

  refreshData();

  const events = [
    MESSAGE_EVENT,
    FRIEND_EVENT,
    BLOCKED_EVENT,
    PROFILE_EVENT,
    ACCOUNT_EVENT,
    "storage",
    "focus",
  ];

  events.forEach((event) => {
    window.addEventListener(event, refreshData);
  });

  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, refreshData);
    });
  };
}, []);

  // LẤY TIN NHẮN CUỐI CÙNG
const getLastMessage = (userId) => {
  return messages
    .filter(
      (message) =>
        belongsToConversation(message, userId) &&
        !isDeletedForMe(message)
    )
    .slice(-1)[0];
};

// NỘI DUNG TIN NHẮN CUỐI
const getLastMessageText = (userId) => {
  const last = getLastMessage(userId);

  if (!last) {
    return "Bắt đầu trò chuyện";
  }

  if (last.recalled) {
    return "Tin nhắn đã được thu hồi";
  }

  const prefix = isMyMessage(last)
    ? "Bạn: "
    : "";

  if (last.text) {
    return prefix + last.text;
  }

  if (last.image || last.images?.length) {
    return prefix + "Đã gửi hình ảnh";
  }

  return "Tin nhắn";
};

// DANH SÁCH NGƯỜI DÙNG
const contacts = getMockUsers()
  .filter((account) => canChatWith(account.id))
  .map((account) => {
    const user = getFriendProfile(account.id);

    if (!user) return null;

    return {
      ...user,
      id: String(account.id),
      name: user.fullName,
    };
  })
  .filter(Boolean)
  .sort((a, b) => {
    const timeA =
      Date.parse(getLastMessage(a.id)?.createdAt) || 0;

    const timeB =
      Date.parse(getLastMessage(b.id)?.createdAt) || 0;

    return timeB - timeA;
  });

// TÌM KIẾM CUỘC TRÒ CHUYỆN
const filteredContacts = contacts.filter(
  (person) =>
    normalizeText(
      `${person.name} ${person.username}`
    ).includes(normalizeText(searchText))
);

// DANH SÁCH TIN NHẮN ĐANG XEM
const conversation = messages.filter(
  (message) =>
    selected &&
    canChatWith(selected) &&
    belongsToConversation(message, selected) &&
    !isDeletedForMe(message)
);

// NGƯỜI ĐANG TRÒ CHUYỆN
const selectedPerson = contacts.find(
  (person) => person.id === selected
);

  // TỰ ĐỘNG CUỘN XUỐNG TIN NHẮN MỚI
  useEffect(() => {
    const list = messageListRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [selected, messages]);

  // ĐÓNG CUỘC TRÒ CHUYỆN NẾU BỊ CHẶN
useEffect(() => {
  if (selected && !selectedPerson) {
    imageReadVersion.current += 1;

    setSelected("");
    setDraft("");
    setImages([]);
    setIsLoadingImages(false);
  }
}, [selected, selectedPerson]);

  // LƯU TIN NHẮN
  const persistMessages = (next) => {
    try {
      localStorage.setItem(
        storeKey,
        JSON.stringify(next)
      );

      setMessages(next);

      window.dispatchEvent(
        new Event(MESSAGE_EVENT)
      );

      return true;
    } catch {
      alert(
        "Không thể lưu tin nhắn. Bộ nhớ trình duyệt có thể đã đầy!"
      );

      return false;
    }
  };

  // LƯU CUỘC TRÒ CHUYỆN
const persistConversations = (next) => {
  const success = saveAccountData(
    conversationsKey,
    next,
    currentUserId
  );

  if (!success) {
    alert("Không thể lưu cuộc trò chuyện!");
    return false;
  }

  setSavedConversations(next);

  window.dispatchEvent(
    new Event(MESSAGE_EVENT)
  );

  return true;
};

// CHỌN CUỘC TRÒ CHUYỆN
const selectConversation = (userId) => {
  const targetId = String(userId);

  if (!canChatWith(targetId)) {
    alert("Không thể trò chuyện với người dùng này!");
    return;
  }

  if (targetId !== selected) {
    imageReadVersion.current += 1;

    setDraft("");
    setImages([]);
    setIsLoadingImages(false);
  }

  setSelected(targetId);
};

// TỰ ĐỘNG MỞ CUỘC TRÒ CHUYỆN TỪ BẢNG TIN
useEffect(() => {
  if (!requestedUser && !requestedUserId) {
    return;
  }

  const person = requestedUserId
    ? contacts.find(
        (item) => item.id === requestedUserId
      )
    : contacts.find(
        (item) =>
          normalizeText(item.name) ===
            normalizeText(requestedUser) ||
          normalizeText(item.username) ===
            normalizeText(requestedUser) ||
          normalizeText(
            getAccountById(item.id)?.fullName
          ) === normalizeText(requestedUser)
      );

  if (person) {
    selectConversation(person.id);
    setSearchText("");
    setShowNewChat(false);
  } else {
    alert("Không thể mở cuộc trò chuyện này!");
  }

  const nextParams = new URLSearchParams(searchParams);

  nextParams.delete("user");
  nextParams.delete("userId");

  setSearchParams(nextParams, {
    replace: true,
  });
}, [requestedUser, requestedUserId]);

// TẠO CUỘC TRÒ CHUYỆN
const addConversation = (event) => {
  event.preventDefault();

  const targetId = String(newContact);

  const person = contacts.find(
    (item) => item.id === targetId
  );

  if (!person || !canChatWith(targetId)) {
    alert("Vui lòng chọn người dùng hợp lệ!");
    return;
  }

  const current = readConversations().map(String);

  if (!current.includes(targetId)) {
    const success = persistConversations([
      targetId,
      ...current,
    ]);

    if (!success) return;
  }

  selectConversation(targetId);

  setNewContact("");
  setShowNewChat(false);
  setSearchText("");
};
  // ĐÓNG POPUP TẠO NHÓM
const closeGroupModal = () => {
  setShowNewGroup(false);
  setGroupName("");
  setGroupMembers([]);
};

// CHỌN THÀNH VIÊN NHÓM
const toggleGroupMember = (name) => {
  setGroupMembers((current) =>
    current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name]
  );
};

// TẠO NHÓM DEMO
const handleCreateGroup = (event) => {
  event.preventDefault();

  const name = groupName.trim();

  if (!name) {
    alert("Vui lòng nhập tên nhóm!");
    return;
  }

  if (
  !isUser(getCurrentAccount()) ||
  !groupMembers.every((id) => canChatWith(id))
) {
  alert("Danh sách thành viên không hợp lệ!");
  return;
}

if (groupMembers.length < 2) {
    alert("Vui lòng chọn ít nhất 2 thành viên!");
    return;
  }

  alert(
    "Thông tin nhóm hợp lệ. Chức năng chat nhóm sẽ được phát triển sau."
  );

  closeGroupModal();
};

  // CHỌN ẢNH
  const chooseImages = async (event) => {
    const files = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (!files.length || isLoadingImages) return;

    const valid = files.filter(
      (file) =>
        file.type.startsWith("image/") &&
        file.size <= 5 * 1024 * 1024
    );

    if (valid.length !== files.length) {
      alert("Chỉ chọn ảnh hợp lệ, mỗi ảnh tối đa 5MB!");
    }

    const remaining = 10 - images.length;

    if (remaining <= 0) {
      alert("Bạn chỉ được gửi tối đa 10 ảnh!");
      return;
    }

    if (valid.length > remaining) {
      alert("Chỉ có thể thêm tối đa 10 ảnh!");
    }

    const selectedFiles = valid.slice(0, remaining);

    if (!selectedFiles.length) return;

    const version = ++imageReadVersion.current;

    setIsLoadingImages(true);

    try {
      const loaded = await Promise.all(
        selectedFiles.map(
          (file) =>
            new Promise((resolve) => {
              const reader = new FileReader();

              reader.onload = () =>
                resolve({
                  name: file.name,
                  data: String(reader.result),
                });

              reader.onerror = () => resolve(null);

              reader.readAsDataURL(file);
            })
        )
      );

      if (version !== imageReadVersion.current) return;

      setImages((current) =>
        [...current, ...loaded.filter(Boolean)].slice(0, 10)
      );
    } catch {
      alert("Không thể đọc hình ảnh!");
    } finally {
      if (version === imageReadVersion.current) {
        setIsLoadingImages(false);
      }
    }
  };

 // GỬI TIN NHẮN
const send = (event) => {
  event.preventDefault();

  if (!selected || isLoadingImages) return;

  if (!canChatWith(selected)) {
  alert("Không thể gửi tin nhắn!");
  return;
}

  const content = draft.trim();

  if (!content && images.length === 0) {
    return;
  }

  if (content.length > 2000) {
    alert("Tin nhắn không được vượt quá 2000 ký tự!");
    return;
  }

  const nextMessage = {
    id: crypto.randomUUID(),

    senderId: currentUserId,
    receiverId: String(selected),

    text: content,
    images,
    image: images[0]?.data || "",

    recalled: false,
    deletedBy: [],

    time: new Date().toLocaleTimeString(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ),

    createdAt: new Date().toISOString(),
  };

  const current = readData(storeKey);

if (persistMessages([...current, nextMessage])) {

  // GỬI THÔNG BÁO CHO NGƯỜI NHẬN
  addNotification({
    type: "message",

    senderId: nextMessage.senderId,
    receiverId: nextMessage.receiverId,

    messageId: nextMessage.id,

    message: content
      ? "đã gửi cho bạn một tin nhắn."
      : "đã gửi cho bạn hình ảnh.",
  });

  // XÓA NỘI DUNG SAU KHI GỬI
  setDraft("");
  setImages([]);
}
};

// THU HỒI TIN NHẮN
const recall = (id) => {
  if (!canChatWith(selected)) {
    return;
  }
  const current = readData(storeKey);

  const target = current.find(
    (message) => message.id === id
  );

  if (
    !target ||
    !isMyMessage(target) ||
    !belongsToConversation(target, selected) ||
    isDeletedForMe(target) ||
    target.recalled
  ) {
    return;
  }

  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn thu hồi tin nhắn này không?"
  );

  if (!confirmed) return;

  persistMessages(
    current.map((message) =>
      message.id === id
        ? {
            ...message,
            recalled: true,
            text: "",
            image: "",
            images: [],
            recalledAt: new Date().toISOString(),
          }
        : message
    )
  );
};

// XÓA TIN NHẮN
const remove = (id) => {
  if (!canChatWith(selected)) {
    return;
  }
  const current = readData(storeKey);

  const target = current.find(
    (message) => message.id === id
  );

  if (
    !target ||
    !belongsToConversation(target, selected) ||
    isDeletedForMe(target)
  ) {
    return;
  }

  const confirmed = window.confirm(
    "Bạn có muốn xóa tin nhắn khỏi hộp thư của mình không?"
  );

  if (!confirmed) return;

  persistMessages(
    current.map((message) => {
      if (message.id !== id) {
        return message;
      }

      const deletedBy = Array.isArray(message.deletedBy)
        ? message.deletedBy.map(String)
        : [];

      return {
        ...message,
        deletedBy: [
          ...new Set([
            ...deletedBy,
            currentUserId,
          ]),
        ],
      };
    })
  );
};

  return (
    <Shell
      title="Tin nhắn"
      subtitle="Kết nối và trò chuyện cùng bạn bè trên MiniSocial."
    >
      <section className="message-layout">

        {/* DANH SÁCH CUỘC TRÒ CHUYỆN */}
        <aside className="message-contacts">

         <div className="message-contacts-heading">
  <h2>Đoạn chat</h2>

  <div className="message-create-actions">
    <button
      type="button"
      className="message-new-chat"
      onClick={() =>
        setShowNewChat((value) => !value)
      }
    >
      ＋ Tạo cuộc trò chuyện
    </button>

    <button
      type="button"
      className="message-new-group"
      onClick={() => {
        setShowNewChat(false);
        setShowNewGroup(true);
      }}
    >
      👥 Tạo nhóm
    </button>
  </div>
</div>

          {/* TÌM KIẾM */}
          <div className="message-search">
            <span>🔍</span>

            <input
              type="search"
              placeholder="Tìm kiếm đoạn chat..."
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
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

          {/* TẠO CUỘC TRÒ CHUYỆN */}
          {showNewChat && (
            <form
              className="message-new-chat-form"
              onSubmit={addConversation}
            >
              <label htmlFor="new-chat-name">
  Chọn người muốn nhắn
</label>

<select
  id="new-chat-name"
  value={newContact}
  onChange={(event) =>
    setNewContact(event.target.value)
  }
  required
>
  <option value="">
    -- Chọn người dùng --
  </option>

  {contacts.map((person) => (
    <option
      key={person.id}
      value={person.id}
    >
      {person.name} (@{person.username})
    </option>
  ))}
</select>

              <div>
                <button type="submit">
                  Tạo chat
                </button>

                <button
                  type="button"
                  className="message-cancel"
                  onClick={() => {
                    setShowNewChat(false);
                    setNewContact("");
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}

          {/* DANH SÁCH */}
          <div className="message-contact-list">

            {filteredContacts.length === 0 && (
              <div className="message-no-contacts">
                <span>💬</span>
                <p>Không tìm thấy cuộc trò chuyện</p>
              </div>
            )}

            {filteredContacts.map((person) => {
              const lastMessage = getLastMessage(
  person.id
);

              return (
                <button
                  type="button"
                  key={person.id}
                  className={
                    selected === person.id
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    selectConversation(person.id)
                  }
                >
                  <span
  className={`person-avatar small ${person.color || "blue"}`}
>
  <ProfileAvatar profile={person} />
</span>

                  <span className="message-contact-info">
                    <b>{person.name}</b>

                    <small>
                      {getLastMessageText(person.id)}
                    </small>
                  </span>

                  {lastMessage && (
                    <span className="message-contact-time">
                      {lastMessage.time}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* KHUNG TRÒ CHUYỆN */}
        <div className="message-conversation">

          {selectedPerson ? (
            <>
              {/* HEADER CUỘC TRÒ CHUYỆN */}
              <header className="message-conversation-heading">
  <Link
    to={`/profile?userId=${selected}`}
    className="person-avatar small"
  >
    <ProfileAvatar
      profile={
        selectedPerson || {
          fullName: "Người dùng",
          avatar: "",
        }
      }
    />
  </Link>

  <div className="message-heading-info">
    <Link to={`/profile?userId=${selected}`}>
      <b>{selectedPerson?.name}</b>
    </Link>

    <small>
      Cuộc trò chuyện cá nhân
    </small>
  </div>
</header>
              {/* NỘI DUNG TIN NHẮN */}
              <div
                className="message-list"
                ref={messageListRef}
              >

                {conversation.map((message) => {
                  const mine = isMyMessage(message);
                  const attachedImages =
                    message.images?.length
                      ? message.images.map(
                          (item) => item.data || item
                        )
                      : message.image
                      ? [message.image]
                      : [];

                  return (
                    <div
                      key={message.id}
                      className={`message-row ${
                        mine ? "mine" : ""
                      }`}
                    >

                      {/* AVATAR */}
                     <div className="message-sender-avatar">
  <ProfileAvatar
    profile={mine ? profile : selectedPerson}
  />
</div>

                      {/* TIN NHẮN */}
                      <div
                        className={`message-bubble ${
                          mine ? "mine" : ""
                        }`}
                      >
                        {message.recalled ? (
                          <i className="message-recalled">
                            {mine
                              ? "Bạn đã thu hồi tin nhắn này."
                              : "Tin nhắn đã được thu hồi."}
                          </i>
                        ) : (
                          <>
                            {message.text && (
                              <div className="message-text">
                                {message.text}
                              </div>
                            )}

                            {attachedImages.length > 0 && (
                              <div className="message-image-grid">
                                {attachedImages.map(
                                  (src, index) => (
                                    <img
                                      key={`${message.id}-${index}`}
                                      className="message-image"
                                      src={src}
                                      alt={`Ảnh đính kèm ${index + 1}`}
                                      onLoad={() => {
                                        const list =
                                          messageListRef.current;

                                        if (list) {
                                          list.scrollTop =
                                            list.scrollHeight;
                                        }
                                      }}
                                    />
                                  )
                                )}
                              </div>
                            )}
                          </>
                        )}

                        <small>{message.time}</small>

                        <div className="message-actions">
                          {mine &&
                            !message.recalled && (
                              <button
                                type="button"
                                onClick={() =>
                                  recall(message.id)
                                }
                              >
                                Thu hồi
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() =>
                              remove(message.id)
                            }
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* CHƯA CÓ TIN NHẮN */}
                {conversation.length === 0 && (
                  <div className="message-empty-state">
                    <span>💬</span>

                    <b>Bắt đầu cuộc trò chuyện</b>

                    <p>
                     Hãy gửi lời chào tới {selectedPerson?.name}!
                    </p>
                  </div>
                )}
              </div>

              {/* XEM TRƯỚC ẢNH */}
              {images.length > 0 && (
                <div className="message-image-preview">
                  {images.map((item, index) => (
                    <div
                      className="message-preview-item"
                      key={`${item.name}-${index}`}
                    >
                      <img
                        src={item.data}
                        alt={item.name}
                      />

                      <button
                        type="button"
                        aria-label="Bỏ ảnh"
                        onClick={() =>
                          setImages((current) =>
                            current.filter(
                              (_, i) => i !== index
                            )
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* NHẬP TIN NHẮN */}
              <form
                className="message-compose"
                onSubmit={send}
              >
                <label
                  className="message-attach"
                  title="Chọn ảnh"
                >
                  📷
                  <span>Ảnh</span>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    disabled={isLoadingImages}
                    onChange={chooseImages}
                  />
                </label>

                <input
                  value={draft}
                  maxLength={2000}
                  onChange={(event) =>
                    setDraft(event.target.value)
                  }
                  placeholder="Nhập tin nhắn..."
                  aria-label="Nội dung tin nhắn"
                />

                <button
                  type="submit"
                  disabled={
                    isLoadingImages ||
                    (!draft.trim() && images.length === 0)
                  }
                >
                  {isLoadingImages ? "Đang tải..." : "Gửi"}
                </button>
              </form>

              <p className="message-help-text">
                Tối đa 10 ảnh, mỗi ảnh không quá 5MB.
              </p>
            </>
          ) : (
            <div className="message-empty-selection">
              <span>✉️</span>

              <h2>Tin nhắn của bạn</h2>

              <p>
                Chọn một cuộc trò chuyện để bắt đầu
                nhắn tin với bạn bè.
              </p>

              <button
                type="button"
                onClick={() => setShowNewChat(true)}
              >
                ＋ Tạo cuộc trò chuyện
              </button>
            </div>
          )}
        </div>
      </section>
      {/* POPUP TẠO NHÓM */}
{showNewGroup && (
  <div
    className="community-modal"
    onClick={closeGroupModal}
  >
    <form
      className="message-group-modal"
      onSubmit={handleCreateGroup}
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Tạo nhóm trò chuyện"
    >
      <div className="message-group-header">
        <h2>Tạo nhóm trò chuyện</h2>

        <button
          type="button"
          aria-label="Đóng"
          onClick={closeGroupModal}
        >
          ✕
        </button>
      </div>

      <label htmlFor="group-name">
        Tên nhóm
      </label>

      <input
        id="group-name"
        autoFocus
        maxLength={60}
        placeholder="Nhập tên nhóm..."
        value={groupName}
        onChange={(event) =>
          setGroupName(event.target.value)
        }
      />

      <h4>Thêm thành viên</h4>

      <p className="message-group-count">
        Đã chọn {groupMembers.length} thành viên
      </p>

      <div className="message-group-members">
        {contacts.map((person) => (
          <label
            key={person.id}
            className="message-group-member"
          >
            <span
  className={`person-avatar small ${person.color || "blue"}`}
>
  <ProfileAvatar profile={person} />
</span>

            <strong>{person.name}</strong>

            <input
              type="checkbox"
              checked={groupMembers.includes(
  person.id
)}
              onChange={() =>
                toggleGroupMember(person.id)
              }
            />
          </label>
        ))}
      </div>

      <div className="message-group-note">
        Chức năng nhắn tin nhóm sẽ được cập nhật sau.
      </div>

      <div className="message-group-actions">
        <button
          type="button"
          className="message-group-cancel"
          onClick={closeGroupModal}
        >
          Hủy
        </button>

        <button
          type="submit"
          className="message-group-submit"
          disabled={
            !groupName.trim() ||
            groupMembers.length < 2
          }
        >
          Tạo nhóm
        </button>
      </div>
    </form>
  </div>
)}
    </Shell>
  );
}
