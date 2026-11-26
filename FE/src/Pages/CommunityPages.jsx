import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";
const DEFAULT_USER = "Nguyễn Văn A";

function readProfile() {
  const defaultProfile = {
    fullName: DEFAULT_USER,
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

// HOOK ĐỒNG BỘ HỒ SƠ
function useCurrentProfile() {
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

const seedStories = [
  { id: 1, name: "Minh Anh", color: "linear-gradient(145deg,#fb7185,#f59e0b)", seen: false },
  { id: 2, name: "Hoàng Nam", color: "linear-gradient(145deg,#60a5fa,#8b5cf6)", seen: false },
  { id: 3, name: "Thu Hà", color: "linear-gradient(145deg,#34d399,#0ea5e9)", seen: true },
];
const people = [
  { id: 1, name: "Nguyễn Minh Anh", bio: "Yêu thích du lịch và nhiếp ảnh", avatar: "MA" },
  { id: 2, name: "Trần Hoàng Nam", bio: "Chia sẻ những điều tích cực mỗi ngày", avatar: "HN" },
  { id: 3, name: "Lê Thu Hà", bio: "Coffee • Books • Music", avatar: "TH" },
];
const storeKey = "miniSocialMessages";
const conversationsKey = "miniSocialConversations";
function readConversations() {
  try { const value = JSON.parse(localStorage.getItem(conversationsKey) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
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

  const [viewedSeedIds, setViewedSeedIds] = useState(() => {
  try {
    const data = JSON.parse(
      localStorage.getItem("miniSocialViewedSeedStories") || "[]"
    );

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
});

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

  // TỰ ĐỘNG KIỂM TRA TIN HẾT HẠN
 useEffect(() => {
  const refreshStories = () => {
    const current = readStories();

    setStories(current);

    setActive((previous) => {
      if (!previous) return null;

      const updated = current.find(
        (item) => item.id === previous.id
      );

      if (updated) return updated;

      if (
        seedStories.some(
          (item) => item.id === previous.id
        )
      ) {
        return previous;
      }

      return null;
    });
  };

  const timer = setInterval(
    refreshStories,
    1000
  );

  window.addEventListener(
    STORY_EVENT,
    refreshStories
  );

  window.addEventListener(
    "storage",
    refreshStories
  );

  return () => {
    clearInterval(timer);

    window.removeEventListener(
      STORY_EVENT,
      refreshStories
    );

    window.removeEventListener(
      "storage",
      refreshStories
    );
  };
}, []);

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

    if (isLoading) return;

    if (!text.trim() && !media) {
      alert("Vui lòng nhập nội dung hoặc chọn ảnh/video!");
      return;
    }

    const newStory = {
      id: Date.now(),
      name: "Bạn",
      author: "Nguyễn Văn A",
      isMine: true,
      text: text.trim(),
      media,
      mediaType,
      color,
      privacy,
      seen: false,
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

  const exists = currentStories.some(
    (item) => item.id === story.id
  );

  if (exists) {
    const updatedStories = currentStories.map(
      (item) =>
        item.id === story.id
          ? { ...item, seen: true }
          : item
    );

    if (saveStories(updatedStories)) {
      setActive({ ...story, seen: true });
    } else {
      setActive(story);
    }

    return;
  }

  const nextViewed = [
    ...new Set([...viewedSeedIds, story.id]),
  ];

  try {
    localStorage.setItem(
      "miniSocialViewedSeedStories",
      JSON.stringify(nextViewed)
    );

    setViewedSeedIds(nextViewed);
  } catch {
    console.error("Không thể lưu trạng thái xem tin");
  }

  setActive({ ...story, seen: true });
};
  // XÓA TIN
  const handleDeleteStory = (story) => {
    if (!story.isMine && story.name !== "Bạn") {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa tin này không?"
    );

    if (!confirmed) return;

    const next = readStories().filter(
      (item) => item.id !== story.id
    );

    if (saveStories(next)) {
      setActive(null);
    }
  };

  const myStories = stories.filter(
    (story) => story.isMine || story.name === "Bạn"
  );

  const friendStories = [
    ...stories.filter(
      (story) =>
        !story.isMine &&
        story.name !== "Bạn" &&
        story.privacy !== "private"
    ),
    ...seedStories.map((story) => ({
  ...story,
  seen: story.seen || viewedSeedIds.includes(story.id),
})),
  ];

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
              <small>Hiển thị trong 24 giờ</small>
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
          <h2>Tin của bạn bè</h2>
        </div>

        <div className="story-grid">
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
      {active && (
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
    {active.isMine || active.name === "Bạn" ? (
      <ProfileAvatar profile={profile} />
    ) : (
      (active.author || active.name || "U").charAt(0)
    )}
  </div>

  <b>
    {active.isMine || active.name === "Bạn"
      ? profile.fullName
      : active.author || active.name}
  </b>
</div>

            {(active.isMine || active.name === "Bạn") && (
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
  const POSTS_KEY = "miniSocialPosts";
  const FRIEND_KEY = "miniSocialFriendRequests";
  const BLOCKED_KEY = "miniSocialBlockedUsers";
  const CURRENT_USER = "Nguyễn Văn A";

  // ĐỌC DỮ LIỆU LOCALSTORAGE
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
  } catch (error) {
    console.error("Không thể đọc dữ liệu:", error);
    return [];
  }
};
  // STATE
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [posts, setPosts] = useState(
    () => readData(POSTS_KEY)
  );

  const [requests, setRequests] = useState(
    () => readData(FRIEND_KEY)
  );

  const [blockedUsers, setBlockedUsers] = useState(
  () => readData(BLOCKED_KEY)
);

  // ĐỒNG BỘ DỮ LIỆU
 useEffect(() => {
  const refreshData = () => {
    setPosts(readData(POSTS_KEY));
    setRequests(readData(FRIEND_KEY));
    setBlockedUsers(readData(BLOCKED_KEY));
  };

  window.addEventListener(
    "miniSocialPostsUpdated",
    refreshData
  );

  window.addEventListener(
    "miniSocialFriendRequestsUpdated",
    refreshData
  );

  window.addEventListener(
    "miniSocialBlockedUsersUpdated",
    refreshData
  );

  window.addEventListener("storage", refreshData);
  window.addEventListener("focus", refreshData);

  return () => {
    window.removeEventListener(
      "miniSocialPostsUpdated",
      refreshData
    );

    window.removeEventListener(
      "miniSocialFriendRequestsUpdated",
      refreshData
    );

    window.removeEventListener(
      "miniSocialBlockedUsersUpdated",
      refreshData
    );

    window.removeEventListener("storage", refreshData);
    window.removeEventListener("focus", refreshData);
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

  // HIỂN THỊ TÊN NGƯỜI DÙNG
const displayName = (name, isMine = false) => {
  if (isMine || name === CURRENT_USER) {
    return profile.fullName || CURRENT_USER;
  }

  return name || "Người dùng";
};

// HIỂN THỊ ẢNH ĐẠI DIỆN
const renderAvatar = (name, isMine = false) => {
  if (isMine || name === CURRENT_USER) {
    return <ProfileAvatar profile={profile} />;
  }

  return (
    displayName(name)
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

// KIỂM TRA NGƯỜI DÙNG BỊ CHẶN
const isBlockedAuthor = (name) => {
  if (!name) return false;

  const normalizedName = normalizeText(name);
  const username = normalizedName.replace(/\s+/g, "");

  return blockedUsers.some(
    (item) =>
      (
        item.name &&
        normalizeText(item.name) === normalizedName
      ) ||
      (
        item.username &&
        normalizeText(item.username) === username
      )
  );
};

  // LẤY USERNAME
  const getUsername = (person) => {
    return (
      person.username ||
      person.name.toLowerCase().replace(/\s+/g, "")
    );
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
  const allPeople = useMemo(() => {
    const users = [...people];

    posts.forEach((post) => {
      const authors = [
        post.author,
        post.originalPost?.author,
      ];

      authors.forEach((author) => {
        if (!author || author === CURRENT_USER) {
          return;
        }

        const exists = users.some(
          (person) =>
            normalizeText(person.name) ===
            normalizeText(author)
        );

        if (!exists) {
          users.push({
            id: `user-${author}`,
            name: author,
            username: author
              .toLowerCase()
              .replace(/\s+/g, ""),
            avatar: author.charAt(0).toUpperCase(),
            bio: "Thành viên MiniSocial",
          });
        }
      });
    });

    return users.filter(
      (person) => person.name !== CURRENT_USER
    );
  }, [posts]);

  // TÌM KIẾM NGƯỜI DÙNG
  const filteredPeople = useMemo(() => {
  const keyword = normalizeText(query);

  return allPeople.filter((person) => {
    const blocked = blockedUsers.some(
      (item) =>
        (
          item.username &&
          normalizeText(item.username) ===
            normalizeText(getUsername(person))
        ) ||
        (
          item.name &&
          normalizeText(item.name) ===
            normalizeText(person.name)
        )
    );

    const searchableText = normalizeText(
      `${person.name} ${getUsername(person)} ${person.bio || ""}`
    );

    return !blocked && searchableText.includes(keyword);
  });
}, [query, allPeople, blockedUsers]);

  // TÌM KIẾM BÀI VIẾT
const filteredPosts = useMemo(() => {
  const keyword = normalizeText(query);

  const canViewPost = (post) => {
    if (!post) return false;

    const isOwnPost =
      post.isMine || post.author === CURRENT_USER;

    if (isOwnPost) return true;

    if (isBlockedAuthor(post.author)) {
      return false;
    }

    if (post.privacy === "private") {
      return false;
    }

    if (post.privacy === "friends") {
      return requests.some(
        (item) =>
          item.status === "accepted" &&
          normalizeText(item.name) ===
            normalizeText(post.author)
      );
    }

    return true;
  };

  return posts.filter((post) => {
    if (!canViewPost(post)) return false;

    const original = post.originalPost || {};

    if (
      post.originalPost &&
      !canViewPost(post.originalPost)
    ) {
      return false;
    }

    const searchableText = normalizeText(
      [
        displayName(post.author, post.isMine),
        post.content,
        post.feeling,
        post.location,
        original.author
          ? displayName(original.author, original.isMine)
          : "",
        original.content,
      ].join(" ")
    );

    return searchableText.includes(keyword);
  });
}, [query, posts, blockedUsers, profile, requests]);

  // KIỂM TRA TRẠNG THÁI KẾT BẠN
  const getFriendStatus = (person) => {
    const username = getUsername(person);

    const request = requests.find(
      (item) =>
        item.username === username ||
        item.name === person.name
    );

    return request?.status || "";
  };

  // GỬI LỜI MỜI KẾT BẠN
  const handleAddFriend = (person) => {
    const current = readData(FRIEND_KEY);
    const username = getUsername(person);

    const blocked = readData(BLOCKED_KEY).some(
  (item) =>
    (
      item.username &&
      normalizeText(item.username) ===
        normalizeText(username)
    ) ||
    (
      item.name &&
      normalizeText(item.name) ===
        normalizeText(person.name)
    )
);

if (blocked) {
  alert("Bạn cần bỏ chặn người dùng này trước.");
  return;
}

    const exists = current.some(
      (item) =>
        (
          item.username === username ||
          item.name === person.name
        ) &&
        ["sent", "received", "pending", "accepted"].includes(
          item.status
        )
    );

    if (exists) {
      alert("Bạn đã có lời mời hoặc đã kết bạn!");
      return;
    }

    const newRequest = {
      id: Date.now(),
      name: person.name,
      username,
      avatar: person.avatar,
      bio: person.bio || "",
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    const updated = [newRequest, ...current];

    try {
      localStorage.setItem(
        FRIEND_KEY,
        JSON.stringify(updated)
      );

      setRequests(updated);

      window.dispatchEvent(
        new Event("miniSocialFriendRequestsUpdated")
      );
    } catch {
      alert("Không thể gửi lời mời kết bạn!");
    }
  };

  // HỦY LỜI MỜI KẾT BẠN
  const handleCancelRequest = (person) => {
    const confirmed = window.confirm(
      "Bạn có muốn hủy lời mời kết bạn không?"
    );

    if (!confirmed) return;

    const username = getUsername(person);

    const updated = readData(FRIEND_KEY).filter(
      (item) =>
        !(
          (
            item.username === username ||
            item.name === person.name
          ) &&
          item.status === "sent"
        )
    );

    try {
      localStorage.setItem(
        FRIEND_KEY,
        JSON.stringify(updated)
      );

      setRequests(updated);

      window.dispatchEvent(
        new Event("miniSocialFriendRequestsUpdated")
      );
    } catch {
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
                const status = getFriendStatus(person);

                return (
                  <article
                    className="person-card explore-person-card"
                    key={person.id}
                  >
                    <Link
                      to={`/profile?user=${encodeURIComponent(
                        person.name
                      )}`}
                      className="person-avatar"
                    >
                      {person.avatar ||
                        person.name.charAt(0)}
                    </Link>

                    <h3>
                      <Link
                        to={`/profile?user=${encodeURIComponent(
                          person.name
                        )}`}
                      >
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
                      to={`/profile?user=${encodeURIComponent(
                        person.name
                      )}`}
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
    to={getProfileLink(post.author, post.isMine)}
  >
    {renderAvatar(post.author, post.isMine)}
  </Link>

  <div>
    <Link
      className="explore-post-author"
      to={getProfileLink(post.author, post.isMine)}
    >
      {displayName(post.author, post.isMine)}
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
          original.isMine
        )}
      </div>

      <div>
        <strong>
          {displayName(
            original.author,
            original.isMine
          )}
        </strong>

        <small>
          {formatPostTime(original.createdAt)}
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

  const FRIEND_KEY = "miniSocialFriendRequests";
  const BLOCKED_KEY = "miniSocialBlockedUsers";
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
  } catch (error) {
    console.error("Không thể đọc dữ liệu:", error);
    return [];
  }
};

  const [messages, setMessages] = useState(
    () => readData(storeKey)
  );

  const [savedConversations, setSavedConversations] =
    useState(readConversations);

  const [friends, setFriends] = useState(
    () => readData(FRIEND_KEY)
  );

  const [blockedUsers, setBlockedUsers] = useState(
    () => readData(BLOCKED_KEY)
  );

  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isLoadingImages, setIsLoadingImages] = useState(false);

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

  // TẠO CHỮ CÁI ĐẠI DIỆN
  const getAvatar = (name) => {
    return String(name || "U")
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(-2)
      .toUpperCase();
  };

  // KIỂM TRA NGƯỜI BỊ CHẶN
  const isBlocked = (name, list = blockedUsers) => {
    const normalizedName = normalizeText(name);

    if (!normalizedName) return false;

    return list.some(
      (person) =>
        normalizeText(person.name) === normalizedName ||
        (
          person.username &&
          normalizeText(person.username) ===
            normalizedName.replace(/\s+/g, "")
        )
    );
  };

  // ĐỒNG BỘ DỮ LIỆU
  useEffect(() => {
    const refreshData = () => {
      setMessages(readData(storeKey));
      setSavedConversations(readConversations());
      setFriends(readData(FRIEND_KEY));
      setBlockedUsers(readData(BLOCKED_KEY));
    };

    refreshData();

    const events = [
      MESSAGE_EVENT,
      "miniSocialFriendRequestsUpdated",
      "miniSocialBlockedUsersUpdated",
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

  // LẤY DANH SÁCH BẠN BÈ
  const acceptedFriends = friends.filter(
    (person) => person.status === "accepted"
  );

  // LẤY TIN NHẮN CUỐI CÙNG
  const getLastMessage = (name) => {
    return messages
      .filter(
        (message) =>
          message.name === name &&
          !message.deleted
      )
      .slice(-1)[0];
  };

  // NỘI DUNG TIN NHẮN CUỐI
  const getLastMessageText = (name) => {
    const last = getLastMessage(name);

    if (!last) {
      return "Bắt đầu trò chuyện";
    }

    if (last.recalled) {
      return "Tin nhắn đã được thu hồi";
    }

    const prefix = last.mine ? "Bạn: " : "";

    if (last.text) {
      return prefix + last.text;
    }

    if (last.image || last.images?.length) {
      return prefix + "Đã gửi hình ảnh";
    }

    return "Tin nhắn";
  };

  // DANH SÁCH CUỘC TRÒ CHUYỆN
  const contacts = [
    ...people,

    ...acceptedFriends.map((person) => ({
      id: `friend-${person.id}`,
      name: person.name,
      avatar: person.avatar || getAvatar(person.name),
    })),

    ...savedConversations.map((name) => ({
      id: `chat-${name}`,
      name,
      avatar: getAvatar(name),
    })),

    ...messages.map((message) => ({
      id: `chat-${message.name}`,
      name: message.name,
      avatar: getAvatar(message.name),
    })),
  ]
    .filter(
      (person, index, all) =>
        person.name &&
        person.name !== DEFAULT_USER &&
        !isBlocked(person.name) &&
        all.findIndex(
          (item) =>
            normalizeText(item.name) ===
            normalizeText(person.name)
        ) === index
    )
    .sort((a, b) => {
      const timeA =
        Date.parse(getLastMessage(a.name)?.createdAt) || 0;

      const timeB =
        Date.parse(getLastMessage(b.name)?.createdAt) || 0;

      return timeB - timeA;
    });

  // TÌM KIẾM CUỘC TRÒ CHUYỆN
  const filteredContacts = contacts.filter(
    (person) =>
      normalizeText(person.name).includes(
        normalizeText(searchText)
      )
  );

  // DANH SÁCH TIN NHẮN ĐANG XEM
  const conversation = messages.filter(
    (message) =>
      message.name === selected &&
      !message.deleted
  );

  const selectedPerson = contacts.find(
    (person) => person.name === selected
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
    if (selected && isBlocked(selected)) {
      imageReadVersion.current += 1;
      setSelected("");
      setDraft("");
      setImages([]);
      setIsLoadingImages(false);
    }
  }, [selected, blockedUsers]);

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
    try {
      localStorage.setItem(
        conversationsKey,
        JSON.stringify(next)
      );

      setSavedConversations(next);

      window.dispatchEvent(
        new Event(MESSAGE_EVENT)
      );

      return true;
    } catch {
      alert("Không thể lưu cuộc trò chuyện!");
      return false;
    }
  };

  // CHỌN CUỘC TRÒ CHUYỆN
  const selectConversation = (name) => {
    if (isBlocked(name, readData(BLOCKED_KEY))) {
      alert("Bạn đã chặn người dùng này!");
      return;
    }

    if (name !== selected) {
      imageReadVersion.current += 1;
      setDraft("");
      setImages([]);
      setIsLoadingImages(false);
    }

    setSelected(name);
  };

  // TẠO CUỘC TRÒ CHUYỆN
  const addConversation = (event) => {
    event.preventDefault();

    const name = newContact
      .trim()
      .replace(/\s+/g, " ");

    if (!name) {
      alert("Vui lòng nhập tên người muốn trò chuyện!");
      return;
    }

    if (name.length > 60) {
      alert("Tên không được vượt quá 60 ký tự!");
      return;
    }

    if (
      normalizeText(name) === normalizeText(DEFAULT_USER) ||
      normalizeText(name) === normalizeText(profile.fullName)
    ) {
      alert("Vui lòng chọn người dùng khác!");
      return;
    }

    if (isBlocked(name, readData(BLOCKED_KEY))) {
      alert("Bạn cần bỏ chặn người dùng này trước!");
      return;
    }

    const existing = contacts.find(
      (person) =>
        normalizeText(person.name) === normalizeText(name)
    );

    if (!existing) {
  alert(
    "Không tìm thấy người dùng. Vui lòng chọn người dùng trong danh sách!"
  );

  return;
}

const finalName = existing.name;
    const current = readConversations();

    if (!current.includes(finalName)) {
      const success = persistConversations([
        finalName,
        ...current,
      ]);

      if (!success) return;
    }

    selectConversation(finalName);

    setNewContact("");
    setShowNewChat(false);
    setSearchText("");
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

    if (isBlocked(selected, readData(BLOCKED_KEY))) {
      alert("Không thể nhắn tin với người đã chặn!");
      return;
    }

    if (!draft.trim() && images.length === 0) {
      return;
    }

    const nextMessage = {
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,

      name: selected,
      text: draft.trim(),
      images,
      image: images[0]?.data || "",
      mine: true,
      recalled: false,
      deleted: false,

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
      setDraft("");
      setImages([]);
    }
  };

  // THU HỒI TIN NHẮN
  const recall = (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn thu hồi tin nhắn này không?"
    );

    if (!confirmed) return;

    const current = readData(storeKey);

    persistMessages(
      current.map((message) =>
        message.id === id &&
        message.mine &&
        !message.deleted &&
        !message.recalled
          ? {
              ...message,
              recalled: true,
              text: "",
              image: "",
              images: [],
            }
          : message
      )
    );
  };

  // XÓA TIN NHẮN
  const remove = (id) => {
    const confirmed = window.confirm(
      "Bạn có muốn xóa tin nhắn khỏi hộp thư của mình không?"
    );

    if (!confirmed) return;

    const current = readData(storeKey);

    persistMessages(
      current.map((message) =>
        message.id === id
          ? {
              ...message,
              deleted: true,
              text: "",
              image: "",
              images: [],
            }
          : message
      )
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

            <button
              type="button"
              className="message-new-chat"
              onClick={() =>
                setShowNewChat((value) => !value)
              }
            >
              ＋ Tạo cuộc trò chuyện
            </button>
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
                Tên người muốn nhắn
              </label>

              <input
                id="new-chat-name"
                autoFocus
                maxLength={60}
                value={newContact}
                onChange={(event) =>
                  setNewContact(event.target.value)
                }
                placeholder="Nhập tên người dùng..."
                list="message-contact-options"
              />

              <datalist id="message-contact-options">
                {contacts.map((person) => (
                  <option
                    key={person.id}
                    value={person.name}
                  />
                ))}
              </datalist>

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
                person.name
              );

              return (
                <button
                  type="button"
                  key={person.id}
                  className={
                    selected === person.name
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    selectConversation(person.name)
                  }
                >
                  <span className="person-avatar small">
                    {person.avatar}
                  </span>

                  <span className="message-contact-info">
                    <b>{person.name}</b>

                    <small>
                      {getLastMessageText(person.name)}
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

          {selected ? (
            <>
              {/* HEADER CUỘC TRÒ CHUYỆN */}
              <header className="message-conversation-heading">

                <Link
                  to={`/profile?user=${encodeURIComponent(
                    selected
                  )}`}
                  className="person-avatar small"
                >
                  {selectedPerson?.avatar ||
                    getAvatar(selected)}
                </Link>

                <div className="message-heading-info">
                  <Link
                    to={`/profile?user=${encodeURIComponent(
                      selected
                    )}`}
                  >
                    <b>{selected}</b>
                  </Link>

                  <small>
                    Cuộc trò chuyện cá nhân
                  </small>
                </div>

                <Link
                  className="message-view-profile"
                  to={`/profile?user=${encodeURIComponent(
                    selected
                  )}`}
                >
                  ⓘ
                </Link>
              </header>

              {/* NỘI DUNG TIN NHẮN */}
              <div
                className="message-list"
                ref={messageListRef}
              >

                {conversation.map((message) => {
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
                        message.mine ? "mine" : ""
                      }`}
                    >

                      {/* AVATAR */}
                      <div className="message-sender-avatar">
                        {message.mine ? (
                          <ProfileAvatar profile={profile} />
                        ) : (
                          selectedPerson?.avatar ||
                          getAvatar(selected)
                        )}
                      </div>

                      {/* TIN NHẮN */}
                      <div
                        className={`message-bubble ${
                          message.mine ? "mine" : ""
                        }`}
                      >
                        {message.recalled ? (
                          <i className="message-recalled">
                            {message.mine
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
                          {message.mine &&
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
                      Hãy gửi lời chào tới {selected}!
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
    </Shell>
  );
}
