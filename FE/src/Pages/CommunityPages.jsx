import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MOCK_ACCOUNTS, ACCOUNT_EVENT, getCurrentAccount } from "../utils/mockAccounts";
import { pageContent } from "../api/apiResponse";
import { getApiErrorMessage } from "../api/http";
import { toFriendView, toPostView, toStoryView, toMessageView } from "../api/adapters";
import { getFriends, getFriendSuggestions, getSentFriendRequests, getReceivedFriendRequests, sendFriendRequest as sendFriendRequestApi, cancelFriendRequest as cancelFriendRequestApi } from "../api/friends";
import { searchUsers } from "../api/users";
import { getFeed } from "../api/posts";
import { createStory as createStoryApi, createStoryWithMedia, getStories, recordStoryView, deleteStory } from "../api/stories";
import { getConversations, openDirectConversation, getMessages, sendMessage, sendMediaMessage, markConversationRead, setMessageReaction, removeMessageReaction } from "../api/messages";

const PROFILE_EVENT = "miniSocialProfileUpdated";

function readProfile(account = getCurrentAccount() || MOCK_ACCOUNTS[0]) {
  return {
    ...account,
    avatar: account?.avatar || account?.avatarUrl || "",
    cover: account?.cover || account?.coverUrl || "",
    fullName: account?.fullName || account?.username || "Người dùng",
  };
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
  return story.authorProfile || { id: story.authorId, fullName: story.author || story.name, avatar: story.avatar };
};

// KIỂM TRA QUYỀN SỞ HỮU TIN
const isOwnStory = (story) => {
  const account = getStoryAccount(story);

  return (
    Boolean(getCurrentAccount()) &&
    Boolean(account) &&
    String(account.id) === String(currentUserId)
  );
};

// KIỂM TRA QUYỀN XEM TIN
const canViewStory = (story) => {
  return Boolean(story) && (!story.expiresAt || Date.parse(story.expiresAt) > Date.now());
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
  return account ? { ...account, fullName: account.fullName || story?.author || story?.name || "Người dùng" } : { fullName: "Người dùng", avatar: "" };
};

// KIỂM TRA TRẠNG THÁI ĐÃ XEM
const isStorySeen = (story) => {
  const viewedBy = Array.isArray(story.viewedBy)
    ? story.viewedBy.map(String)
    : [];

  return viewedBy.includes(String(currentUserId));
};
  const [stories, setStories] = useState([]);
  const [active, setActive] = useState(null);

  // TẠO TIN
  const [isCreating, setIsCreating] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [isLoading, setIsLoading] = useState(false);
  const [storyError, setStoryError] = useState("");

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

  const refreshStories = useCallback(async () => {
    setStoryError("");
    try {
      const page = await getStories({ page: 0, size: 100 });
      const items = pageContent(page).map((story) => toStoryView(story, currentUserId));
      setStories(items);
      setActive((previous) => previous ? items.find((item) => String(item.id) === String(previous.id)) || null : null);
    } catch (error) {
      setStoryError(getApiErrorMessage(error));
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshStories();
    window.addEventListener("focus", refreshStories);
    return () => window.removeEventListener("focus", refreshStories);
  }, [refreshStories]);

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

    setMediaFile(file);
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
    setMediaFile(null);
  };

  // HỦY TẠO TIN
  const handleCancel = () => {
    setIsCreating(false);
    setText("");
    setMedia("");
    setMediaType("");
    setMediaFile(null);
    setPrivacy("public");
  };

  // ĐĂNG TIN
  const handleCreateStory = async (event) => {
    event.preventDefault();

    const account = getCurrentAccount();

    if (
      !account ||
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

    setIsLoading(true);
    try {
      const payload = {
        content: text.trim() || undefined,
        visibility: privacy.toUpperCase(),
        mediaType: mediaFile ? (mediaFile.type.startsWith("video/") ? "VIDEO" : "IMAGE") : undefined,
      };
      if (mediaFile) await createStoryWithMedia({ ...payload, file: mediaFile });
      else await createStoryApi(payload);
      await refreshStories();
      handleCancel();
    } catch (error) {
      alert(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

 // XEM TIN
const handleViewStory = async (story) => {
  if (!story || !canViewStory(story)) {
    alert("Bạn không có quyền xem tin này!");
    return;
  }
  setActive({ ...story, viewedBy: [currentUserId] });
  setStories((items) => items.map((item) => String(item.id) === String(story.id) ? { ...item, viewedBy: [currentUserId] } : item));
  if (!isOwnStory(story)) {
    try {
      await recordStoryView(story.id);
    } catch (error) {
      setStoryError(getApiErrorMessage(error));
    }
  }
};

  // XÓA TIN
const handleDeleteStory = async (story) => {
  if (!isOwnStory(story)) {
    alert("Bạn không có quyền xóa tin này!");
    return;
  }

  const confirmed = window.confirm(
    "Bạn có chắc chắn muốn xóa tin này không?"
  );

  if (!confirmed) return;

  try {
    await deleteStory(story.id);
    setActive(null);
    await refreshStories();
  } catch (error) {
    alert(getApiErrorMessage(error));
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
      {storyError && <p role="alert">{storyError}</p>}
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
  const currentAccount =
    getCurrentAccount() || MOCK_ACCOUNTS[0];

  const currentUserId = currentAccount.id;

  // STATE
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [posts, setPosts] = useState([]);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [searchPeople, setSearchPeople] = useState([]);
  const [friendStatuses, setFriendStatuses] = useState({});
  const [exploreLoading, setExploreLoading] = useState(true);
  const [exploreError, setExploreError] = useState("");

  // Feed and suggestions are server-filtered for visibility and blocking.
  useEffect(() => {
    let active = true;
    const refreshData = async () => {
      setExploreLoading(true);
      setExploreError("");
      try {
        const [postPage, suggestionsPage, friendsPage, sentPage, receivedPage] = await Promise.all([
          getFeed({ page: 0, size: 100 }), getFriendSuggestions({ page: 0, size: 50 }),
          getFriends({ page: 0, size: 100 }), getSentFriendRequests({ page: 0, size: 100 }),
          getReceivedFriendRequests({ page: 0, size: 100 }),
        ]);
        if (!active) return;
        setPosts(pageContent(postPage).map((post) => toPostView(post, currentUserId)));
        setSuggestedPeople(pageContent(suggestionsPage).map((item) => toFriendView(item, "suggested")).filter(Boolean));
        const statuses = {};
        pageContent(friendsPage).forEach((item) => { const user = toFriendView(item, "accepted"); if (user) statuses[user.id] = { status: "accepted" }; });
        pageContent(sentPage).forEach((item) => { const user = toFriendView(item, "sent"); if (user) statuses[user.id] = { status: "sent", requestId: user.friendshipId }; });
        pageContent(receivedPage).forEach((item) => { const user = toFriendView(item, "received"); if (user) statuses[user.id] = { status: "received", requestId: user.friendshipId }; });
        setFriendStatuses(statuses);
      } catch (error) {
        if (active) setExploreError(getApiErrorMessage(error));
      } finally {
        if (active) setExploreLoading(false);
      }
    };
    refreshData();
    window.addEventListener("focus", refreshData);
    return () => { active = false; window.removeEventListener("focus", refreshData); };
  }, [currentUserId]);

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) { setSearchPeople([]); return undefined; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const page = await searchUsers(keyword, { page: 0, size: 30 });
        if (active) setSearchPeople(pageContent(page).map((item) => toFriendView(item, "none")).filter(Boolean));
      } catch (error) {
        if (active) setExploreError(getApiErrorMessage(error));
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

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

// LẤY HỒ SƠ NGƯỜI ĐĂNG
const getAuthorProfile = (name, authorId) => {
  const post = posts.find((item) => String(item.authorId) === String(authorId));
  return post?.authorProfile || { fullName: name || "Người dùng", avatar: post?.avatar || "" };
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
  if (String(authorId) === String(currentUserId)) return "/profile";
  return authorId != null ? `/profile?userId=${authorId}` : `/profile?user=${encodeURIComponent(name || "Người dùng")}`;
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

  const filteredPeople = (query.trim() ? searchPeople : suggestedPeople)
    .filter((person) => String(person.id) !== String(currentUserId))
    .map((person) => ({ ...person, friendStatus: friendStatuses[person.id]?.status || "none" }));

// The feed endpoint applies visibility rules; the remaining search is local over the loaded page.
const filteredPosts = posts.filter((post) => {
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
  return person.friendStatus || friendStatuses[person.id]?.status || "none";
};

// GỬI LỜI MỜI KẾT BẠN
const handleAddFriend = async (person) => {
  try {
    const request = await sendFriendRequestApi(person.id);
    setFriendStatuses((current) => ({ ...current, [person.id]: { status: "sent", requestId: request?.id } }));
  } catch (error) {
    alert(getApiErrorMessage(error));
  }
};

// HỦY LỜI MỜI KẾT BẠN
const handleCancelRequest = async (person) => {
  const requestId = friendStatuses[person.id]?.requestId;
  if (!requestId) { alert("Không tìm thấy lời mời đang chờ để hủy."); return; }

  const confirmed = window.confirm(
    `Bạn có muốn hủy lời mời kết bạn với ${person.name} không?`
  );

  if (!confirmed) return;

  try {
    await cancelFriendRequestApi(requestId);
    setFriendStatuses((current) => ({ ...current, [person.id]: { status: "none" } }));
  } catch (error) {
    alert(getApiErrorMessage(error));
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
        {exploreError && <p role="alert">{exploreError}</p>}
        {exploreLoading && <p role="status">Đang tải nội dung khám phá…</p>}
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
              <h3>{exploreLoading ? "Đang tải người dùng…" : "Không tìm thấy người dùng"}</h3>
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

              <h3>{exploreLoading ? "Đang tải bài viết…" : "Không tìm thấy bài viết"}</h3>

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
  const currentAccount = getCurrentAccount() || MOCK_ACCOUNTS[0];
  const currentUserId = String(currentAccount.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedUser = searchParams.get("user") || "";
  const requestedUserId = searchParams.get("userId") || "";

  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [loadError, setLoadError] = useState("");
  const messageListRef = useRef(null);

  const normalizeText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

  const refreshConversations = async () => {
    const [conversationPage, friendPage] = await Promise.all([
      getConversations({ page: 0, size: 50 }),
      getFriends({ page: 0, size: 50 }),
    ]);
    const items = pageContent(conversationPage);
    setConversations(items);
    setFriends(pageContent(friendPage).map((item) => toFriendView(item, "accepted")).filter(Boolean));
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoadError("");
        const [conversationPage, friendPage] = await Promise.all([
          getConversations({ page: 0, size: 50 }), getFriends({ page: 0, size: 50 }),
        ]);
        if (!active) return;
        setConversations(pageContent(conversationPage));
        setFriends(pageContent(friendPage).map((item) => toFriendView(item, "accepted")).filter(Boolean));
      } catch (error) {
        if (active) setLoadError(getApiErrorMessage(error));
      }
    };
    load();
    return () => { active = false; };
  }, [currentUserId]);

  const conversationForUser = (userId) => conversations.find((item) => String(item.otherParticipant?.id) === String(userId));
  const contacts = [...friends];
  conversations.forEach((item) => {
    const user = toFriendView({ user: item.otherParticipant }, "accepted");
    if (user && !contacts.some((person) => String(person.id) === String(user.id))) contacts.push(user);
  });
  contacts.forEach((person) => { person.conversationId = conversationForUser(person.id)?.id; });
  contacts.sort((a, b) => (Date.parse(conversationForUser(b.id)?.lastMessageAt) || 0) - (Date.parse(conversationForUser(a.id)?.lastMessageAt) || 0));
  const filteredContacts = contacts.filter((person) => normalizeText(`${person.name} ${person.username}`).includes(normalizeText(searchText)));
  const selectedConversation = conversations.find((item) => String(item.id) === selected);
  const selectedPerson = selectedConversation ? toFriendView({ user: selectedConversation.otherParticipant }, "accepted") : null;
  const conversation = messages;

  const getLastMessage = (userId) => conversationForUser(userId)?.lastMessage || null;
  const getLastMessageText = (userId) => {
    const last = getLastMessage(userId);
    if (!last) return "Bắt đầu trò chuyện";
    const prefix = String(last.senderId) === currentUserId ? "Bạn: " : "";
    if (last.content) return prefix + last.content;
    if (last.mediaUrl) return prefix + (last.mediaType === "VIDEO" ? "Đã gửi video" : "Đã gửi hình ảnh");
    return "Tin nhắn";
  };
  const isMyMessage = (message) => String(message.senderId) === currentUserId;

  useEffect(() => {
    if (!selected) { setMessages([]); return undefined; }
    let active = true;
    const loadMessages = async () => {
      try {
        setLoadError("");
        const page = await getMessages(selected, { page: 0, size: 50 });
        if (!active) return;
        const otherId = selectedConversation?.otherParticipant?.id;
        setMessages(pageContent(page).slice().reverse().map((item) => toMessageView(item, currentUserId, otherId)));
        await markConversationRead(selected);
        setConversations((items) => items.map((item) => String(item.id) === selected ? { ...item, unreadCount: 0 } : item));
      } catch (error) {
        if (active) setLoadError(getApiErrorMessage(error));
      }
    };
    loadMessages();
    const timer = window.setInterval(loadMessages, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selected, selectedConversation?.otherParticipant?.id, currentUserId]);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [selected, messages]);

  const selectConversation = useCallback(async (userId) => {
    const targetId = String(userId);
    if (!targetId || targetId === currentUserId) { alert("Không thể mở cuộc trò chuyện với tài khoản này."); return; }
    try {
      const item = await openDirectConversation(targetId);
      setConversations((current) => [item, ...current.filter((entry) => String(entry.id) !== String(item.id))]);
      setSelected(String(item.id));
      setDraft(""); setImages([]); setSearchText("");
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!requestedUser && !requestedUserId) return;
    let active = true;
    const open = async () => {
      let target = requestedUserId;
      let lookupFailed = false;
      if (!target) {
        try {
          const page = await searchUsers(requestedUser, { page: 0, size: 20 });
          const person = pageContent(page).find((item) =>
            normalizeText(item.fullName) === normalizeText(requestedUser) ||
            normalizeText(item.username) === normalizeText(requestedUser)
          );
          target = person?.id;
        } catch (error) {
          lookupFailed = true;
          if (active) setLoadError(getApiErrorMessage(error));
        }
      }
      if (!active) return;
      if (target) await selectConversation(target);
      else if (!lookupFailed) setLoadError("Không tìm thấy người dùng để mở hội thoại.");
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("user"); nextParams.delete("userId");
      setSearchParams(nextParams, { replace: true });
    };
    open();
    return () => { active = false; };
  }, [requestedUser, requestedUserId, searchParams, selectConversation, setSearchParams]);

  const addConversation = async (event) => {
    event.preventDefault();
    if (!newContact) return;
    await selectConversation(newContact);
    setNewContact(""); setShowNewChat(false);
  };


  const chooseImages = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isLoadingImages) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) { alert("Chọn một ảnh tối đa 10MB."); return; }
    setIsLoadingImages(true);
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setImages([{ name: file.name, data, file }]);
    } catch { alert("Không thể đọc ảnh đã chọn."); }
    finally { setIsLoadingImages(false); }
  };

  const send = async (event) => {
    event.preventDefault();
    if (!selected || isLoadingImages) return;
    const content = draft.trim();
    const attachment = images[0];
    if (!content && !attachment) return;
    if (content.length > 2000) { alert("Tin nhắn không được vượt quá 2000 ký tự!"); return; }
    try {
      const result = attachment
        ? await sendMediaMessage({ conversationId: selected, file: attachment.file, mediaType: "IMAGE", content })
        : await sendMessage(selected, content);
      setMessages((current) => [...current, toMessageView(result, currentUserId, selectedPerson?.id)]);
      setDraft(""); setImages([]);
      await refreshConversations();
    } catch (error) {
      alert(getApiErrorMessage(error));
    }
  };

  const toggleReaction = async (message) => {
    try {
      const result = message.currentUserReaction
        ? await removeMessageReaction(selected, message.id)
        : await setMessageReaction(selected, message.id, "LIKE");
      setMessages((current) => current.map((item) => String(item.id) === String(message.id) ? toMessageView(result, currentUserId, selectedPerson?.id) : item));
    } catch (error) { alert(getApiErrorMessage(error)); }
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
      disabled
      title="Backend hiện chưa hỗ trợ hội thoại nhóm"
    >
      👥 Nhóm (chưa hỗ trợ)
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
                  className={selected === String(conversationForUser(person.id)?.id || "") ? "selected" : ""}
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
                      {lastMessage.createdAt
                        ? new Date(lastMessage.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                        : ""}
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

        {loadError && <p role="alert">{loadError}</p>}
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
                            {message.video && (
                              <video className="message-image" src={message.video} controls />
                            )}
                          </>
                        )}

                        <small>{message.time}</small>

                        <div className="message-actions">
                          <button
                            type="button"
                            aria-pressed={Boolean(message.currentUserReaction)}
                            onClick={() => toggleReaction(message)}
                          >
                            {message.currentUserReaction ? "♥" : "♡"} Thích
                            {Object.values(message.reactionCounts || {}).reduce((sum, count) => sum + Number(count || 0), 0) || ""}
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
                Gửi một ảnh, dung lượng tối đa 10MB.
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
