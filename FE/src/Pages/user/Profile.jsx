import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  MOCK_ACCOUNTS,
  ACCOUNT_EVENT,
  getCurrentAccount,
  getAccountById,
  getAccountByName,
  readAccountData,
  getMockUsers,
  isUser,
} from "../../utils/mockAccounts";

import {
  FRIEND_EVENT,
  BLOCKED_EVENT,
  getFriendIds,
  isBlockedBetween,
} from "../../utils/friendUtils";

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";
const POSTS_KEY = "miniSocialPosts";
const POSTS_EVENT = "miniSocialPostsUpdated";

// LẤY TÀI KHOẢN HIỆN TẠI
function readCurrentAccount() {
  return getCurrentAccount() || MOCK_ACCOUNTS[0];
}

// ĐỌC HỒ SƠ THEO TÀI KHOẢN
function readProfile(account) {
  const defaultProfile = {
    phone: "",
    birthday: "",
    address: "",
    avatar: "",
    cover: "",
    gender: "",
    bio: "Đang sử dụng MiniSocial.",
    ...account,
  };

  try {
    const legacyProfile =
      account.id === 1
        ? JSON.parse(
            localStorage.getItem(PROFILE_KEY) || "{}"
          )
        : {};

    const savedProfile = readAccountData(
      PROFILE_KEY,
      legacyProfile,
      account.id
    );

    return {
      ...defaultProfile,
      ...savedProfile,
      id: account.id,
      username: account.username,
      email: account.email,
    };
  } catch {
    return defaultProfile;
  }
}

// TÌM TÀI KHOẢN CẦN XEM
function findViewedAccount(userId, viewedName) {
  // TÌM THEO ID
  if (userId) {
    const account = getAccountById(userId);

    return isUser(account) ? account : null;
  }

  // XEM TRANG CÁ NHÂN CỦA MÌNH
  if (!viewedName) {
    const account = getCurrentAccount();

    return isUser(account) ? account : null;
  }

  // TÌM THEO TÊN HOẶC USERNAME
  const account =
    getAccountByName(viewedName) ||
    getMockUsers().find(
      (user) =>
        user.username === viewedName ||
        readProfile(user).fullName === viewedName
    ) ||
    null;

  return isUser(account) ? account : null;
}

function formatBirthday(value) {
  if (!value) return "Chưa cập nhật";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");

    return `${day}/${month}/${year}`;
  }

  return value;
}
// TÌM TÀI KHOẢN CỦA TÁC GIẢ
function findPostAuthor(post) {
  if (post.authorId != null) {
    return getAccountById(post.authorId);
  }

  return getAccountByName(post.author);
}

// KIỂM TRA QUYỀN XEM BÀI VIẾT
function canViewProfilePost(post, currentAccount) {
  if (!post || !isUser(currentAccount)) {
    return false;
  }

  const author = findPostAuthor(post);

  // CHỈ HIỂN THỊ BÀI VIẾT CỦA USER
  if (!isUser(author)) {
    return false;
  }

  // CHỦ BÀI VIẾT
  if (
    String(author.id) === String(currentAccount.id)
  ) {
    return true;
  }

  // KIỂM TRA CHẶN HAI CHIỀU
  if (
    isBlockedBetween(currentAccount.id, author.id)
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
    return getFriendIds(currentAccount.id)
      .map(String)
      .includes(String(author.id));
  }

  // BÀI VIẾT RIÊNG TƯ
  return false;
}

// LẤY BÀI VIẾT CỦA NGƯỜI DÙNG
function readProfilePosts(
  viewedAccount,
  viewedName,
  currentAccount
) {
  try {
    const allPosts = JSON.parse(
      localStorage.getItem(POSTS_KEY) || "[]"
    );

    if (!Array.isArray(allPosts)) return [];

    return allPosts
      .filter((post) => {
        if (!post) return false;

        const hasAuthorId = post.authorId != null;

        const isAuthor = hasAuthorId
          ? viewedAccount &&
            String(post.authorId) ===
              String(viewedAccount.id)
          : post.author === viewedName ||
            post.author === viewedAccount?.fullName;

        if (!isAuthor) return false;

        return canViewProfilePost(
          post,
          currentAccount
        );
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

        // KIỂM TRA QUYỀN XEM BÀI GỐC
        if (
          !original ||
          original.isShared ||
          !canViewProfilePost(
            original,
            currentAccount
          )
        ) {
          return null;
        }

        // ĐỒNG BỘ BÀI VIẾT GỐC
        return {
          ...post,
          originalPost: original,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ĐỊNH DẠNG THỜI GIAN BÀI VIẾT
function formatPostTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN");
}

// HIỂN THỊ QUYỀN RIÊNG TƯ BÀI VIẾT
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

// LẤY HỒ SƠ TÁC GIẢ BÀI VIẾT
function getPostAuthorProfile(post) {
  const account = findPostAuthor(post);

  if (account) {
    return readProfile(account);
  }

  return {
    fullName: post.author || "Người dùng",
    avatar: "",
    color: "blue",
  };
}

// LẤY DANH SÁCH HÌNH ẢNH BÀI VIẾT
function getPostImages(post) {
  if (Array.isArray(post.images) && post.images.length) {
    return post.images;
  }

  return post.image ? [post.image] : [];
}

function Profile() {
  const [params] = useSearchParams();

  const [currentAccount, setCurrentAccount] =
    useState(readCurrentAccount);

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const requestedUserId = params.get("userId");
  const requestedName = params.get("user");

  const viewedAccount = findViewedAccount(
    requestedUserId,
    requestedName
  );

  const viewedName =
    viewedAccount?.fullName ||
    requestedName ||
    "Người dùng MiniSocial";

  // KIỂM TRA CÓ PHẢI TRANG CÁ NHÂN CỦA MÌNH
const isOwnProfile =
  isUser(getCurrentAccount()) &&
  isUser(currentAccount) &&
  isUser(viewedAccount) &&
  String(viewedAccount.id) ===
    String(currentAccount.id);

      // KIỂM TRA HAI TÀI KHOẢN CÓ CHẶN NHAU KHÔNG
const isBlockedProfile =
  !isOwnProfile &&
  viewedAccount !== null &&
  isBlockedBetween(
    currentAccount.id,
    viewedAccount.id
  );

  // THÔNG TIN NGƯỜI DÙNG ĐANG XEM
  const viewedProfile = viewedAccount
    ? readProfile(viewedAccount)
    : {
        fullName: viewedName,
        email: "",
        phone: "",
        birthday: "",
        gender: "",
        address: "",
        avatar: "",
        cover: "",
        bio: "Người dùng MiniSocial.",
      };

  // ẨN THÔNG TIN RIÊNG TƯ KHI XEM NGƯỜI KHÁC
  const user = {
    ...viewedProfile,
    email: isOwnProfile
      ? viewedProfile.email
      : "Chưa công khai",

    phone: isOwnProfile
      ? viewedProfile.phone
      : "Chưa công khai",

    birthday: isOwnProfile
      ? viewedProfile.birthday
      : "Chưa công khai",

    address: isOwnProfile
      ? viewedProfile.address
      : "Chưa công khai",
  };

  // ĐỒNG BỘ HỒ SƠ VÀ BÀI VIẾT
  useEffect(() => {
    const refreshData = () => {
      setCurrentAccount(readCurrentAccount());

      setRefreshVersion(
        (previous) => previous + 1
      );
    };

    const events = [
  ACCOUNT_EVENT,
  PROFILE_EVENT,
  POSTS_EVENT,
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

  // LẤY DANH SÁCH BÀI VIẾT
const posts = readProfilePosts(
  viewedAccount,
  viewedName,
  currentAccount
);

// KHÔNG HIỂN THỊ HỒ SƠ KHI KHÔNG CÓ QUYỀN
if (
  !isUser(getCurrentAccount()) ||
  !isUser(currentAccount) ||
  !isUser(viewedAccount) ||
  isBlockedProfile
) {
  return (
    <div className="profile-page">
      <div className="profile-card profile-unavailable">

        <div className="profile-unavailable-icon">
          🔒
        </div>

        <h2>Nội dung này hiện không khả dụng</h2>

        <p>
          Bạn không thể xem trang cá nhân này.
        </p>

        <Link
          to="/feed"
          className="profile-back-button"
        >
          Quay về bảng tin
        </Link>

      </div>
    </div>
  );
}

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-cover">
  {user.cover && (
    <img
      src={user.cover}
      alt="Ảnh bìa"
    />
  )}
</div>
        <div className="profile-header">
<div
  className={`profile-avatar ${
    user.color || "blue"
  }`}
>
  {user.avatar ? (
    <img
      src={user.avatar}
      alt="Ảnh đại diện"
    />
  ) : (
    String(user.fullName || "U")
  .trim()
  .split(/\s+/)
  .pop()
  ?.charAt(0)
  .toUpperCase() || "U"
  )}
</div>       
   <h2>{user.fullName}</h2>
          <p className="profile-email">{isOwnProfile ? user.email : "Trang cá nhân"}</p>
          <span className="profile-badge">Thành viên</span>
          {/* TƯƠNG TÁC VỚI NGƯỜI DÙNG KHÁC */}
{!isOwnProfile && (
  <div className="profile-user-actions">

    <Link
      to={`/search-users?q=${encodeURIComponent(
        viewedAccount?.username || viewedName
      )}`}
      className="profile-add-friend-button"
    >
      👥 Kết bạn
    </Link>

    <Link
  to={`/messages?userId=${viewedAccount.id}`}
  className="profile-message-button"
>
  💬 Nhắn tin
</Link>

  </div>
)}
        </div>
        <div className="profile-content">
          <h3>Thông tin cá nhân</h3>
          <div className="profile-info">
            <div className="info-item"><span>Họ và tên</span><strong> {user.fullName || "Chưa cập nhật"} </strong></div>
            <div className="info-item"><span>Email</span><strong>{user.email}</strong></div>
            <div className="info-item"><span>Số điện thoại</span><strong> {user.phone || "Chưa cập nhật"}</strong></div>
            <div className="info-item"><span>Ngày sinh</span><strong>{formatBirthday(user.birthday)}</strong></div>
            <div className="info-item"><span>Giới tính</span><strong> {user.gender || "Chưa cập nhật"} </strong></div>
            <div className="info-item"><span>Địa chỉ</span><strong> {user.address || "Chưa cập nhật"} </strong></div>
          </div>
          <div className="profile-bio"><span>Giới thiệu</span><p>{user.bio || "Chưa có giới thiệu"}</p></div>
          {/* CÀI ĐẶT TÀI KHOẢN */}
{isOwnProfile && (
  <section className="profile-settings">
    <h3>Cài đặt tài khoản</h3>

    <p className="profile-settings-description">
      Quản lý thông tin cá nhân, bảo mật và quyền riêng tư.
    </p>

    <div className="profile-settings-list">

      <Link
        to="/profile/edit"
        className="profile-setting-item"
      >
        <span className="profile-setting-icon">
          ✏️
        </span>

        <div className="profile-setting-text">
          <strong>Chỉnh sửa thông tin</strong>
          <small>
            Cập nhật thông tin và ảnh đại diện
          </small>
        </div>

        <span className="profile-setting-arrow">
          ›
        </span>
      </Link>

      <Link
        to="/change-password"
        className="profile-setting-item"
      >
        <span className="profile-setting-icon">
          🔒
        </span>

        <div className="profile-setting-text">
          <strong>Đổi mật khẩu</strong>
          <small>
            Quản lý mật khẩu và bảo mật tài khoản
          </small>
        </div>

        <span className="profile-setting-arrow">
          ›
        </span>
      </Link>

      <Link
        to="/blocked-users"
        className="profile-setting-item"
      >
        <span className="profile-setting-icon">
          🚫
        </span>

        <div className="profile-setting-text">
          <strong>Người dùng đã chặn</strong>
          <small>
            Xem và quản lý danh sách đã chặn
          </small>
        </div>

        <span className="profile-setting-arrow">
          ›
        </span>
      </Link>

    </div>
  </section>
)}
<section className="profile-posts">

  <h3>Bài viết ({posts.length})</h3>

  {posts.length > 0 ? (
    posts.map((post) => (
      <article
        className="profile-post-item"
        key={post.id}
      >

        <div className="profile-post-header">
          <strong>{user.fullName}</strong>

          <small>
  {formatPostTime(post.createdAt)}
  {" · "}
  {getPrivacyLabel(post.privacy)}
</small>
        </div>

        {post.content && (
          <p>{post.content}</p>
        )}

        {/* HIỂN THỊ ẢNH BÀI VIẾT */}
        {(post.images?.length
          ? post.images
          : post.image
            ? [post.image]
            : []
        ).map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`Ảnh bài viết ${index + 1}`}
          />
        ))}

        {/* BÀI VIẾT ĐƯỢC CHIA SẺ */}
{post.isShared && post.originalPost && (
  <div className="profile-shared-post">

    <div className="profile-shared-label">
      🔁 Bài viết được chia sẻ
    </div>

    <div className="profile-shared-header">

      <Link
        to={
          findPostAuthor(post.originalPost)
            ? `/profile?userId=${
                findPostAuthor(post.originalPost).id
              }`
            : `/profile?user=${encodeURIComponent(
                post.originalPost.author || ""
              )}`
        }
        className="profile-shared-avatar"
      >
        {getPostAuthorProfile(post.originalPost).avatar ? (
          <img
            src={
              getPostAuthorProfile(post.originalPost).avatar
            }
            alt="Ảnh đại diện"
          />
        ) : (
          getPostAuthorProfile(post.originalPost)
            .fullName.trim()
            .split(/\s+/)
            .pop()
            ?.charAt(0)
            .toUpperCase() || "U"
        )}
      </Link>

      <div className="profile-shared-author">

        <Link
          to={
            findPostAuthor(post.originalPost)
              ? `/profile?userId=${
                  findPostAuthor(post.originalPost).id
                }`
              : `/profile?user=${encodeURIComponent(
                  post.originalPost.author || ""
                )}`
          }
        >
          <strong>
            {
              getPostAuthorProfile(post.originalPost)
                .fullName
            }
          </strong>
        </Link>

        <small>
          {formatPostTime(post.originalPost.createdAt)}
          {" · "}
          {getPrivacyLabel(post.originalPost.privacy)}
        </small>

      </div>
    </div>

    {post.originalPost.content && (
      <p>{post.originalPost.content}</p>
    )}

    {post.originalPost.feeling && (
      <p>{post.originalPost.feeling}</p>
    )}

    {post.originalPost.location && (
      <p>📍 {post.originalPost.location}</p>
    )}

    {getPostImages(post.originalPost).length > 0 && (
      <div className="profile-shared-images">

        {getPostImages(post.originalPost).map(
          (src, index) => (
            <img
              key={index}
              src={src}
              alt={`Ảnh bài viết gốc ${index + 1}`}
            />
          )
        )}

      </div>
    )}

    <Link
      to={`/feed?postId=${post.originalPost.id}`}
      className="profile-view-post"
    >
      Xem bài viết gốc →
    </Link>

  </div>
)}

        <Link
          to={`/feed?postId=${post.id}`}
          className="profile-view-post"
        >
          Xem chi tiết bài viết →
        </Link>

      </article>
    ))
  ) : (
    <p>Người dùng chưa có bài viết nào.</p>
  )}

</section>      
  </div>
      </div>
    </div>
  );
}
export default Profile;
