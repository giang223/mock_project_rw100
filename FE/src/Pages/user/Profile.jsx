import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getCurrentAccount, isUser } from "../../utils/mockAccounts";
import { getApiErrorMessage } from "../../api/http";
import { getMyProfile, getPublicProfile, getUserPosts } from "../../api/users";
import { pageContent } from "../../api/apiResponse";
import { toPostView, toUserView } from "../../api/adapters";

// LẤY TÀI KHOẢN HIỆN TẠI
function readCurrentAccount() {
  return getCurrentAccount();
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
  return post?.authorProfile || post?.author || null;
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
  const author = findPostAuthor(post);
  return {
    ...(author || {}),
    fullName: author?.fullName || (typeof post?.author === "string" ? post.author : "Người dùng"),
    avatar: author?.avatar || author?.avatarUrl || "",
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

  const [currentAccount] = useState(readCurrentAccount);
  const [viewedAccount, setViewedAccount] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const requestedUserId = params.get("userId");
  const requestedName = params.get("user");

  const viewedName = viewedAccount?.fullName || requestedName || "Người dùng MiniSocial";

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError("");
    const loadProfile = requestedUserId ? getPublicProfile(requestedUserId) : getMyProfile();
    loadProfile
      .then(async (rawProfile) => {
        const profile = toUserView(rawProfile);
        const page = await getUserPosts(profile.id, { page: 0, size: 20 });
        if (!active) return;
        setViewedAccount(profile);
        setPosts(pageContent(page).map((post) => toPostView(post, currentAccount?.id)).filter(Boolean));
      })
      .catch((error) => {
        if (active) setLoadError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [requestedUserId, currentAccount?.id]);

  // KIỂM TRA CÓ PHẢI TRANG CÁ NHÂN CỦA MÌNH
const isOwnProfile = !requestedUserId || String(viewedAccount?.id) === String(currentAccount?.id);

      // KIỂM TRA HAI TÀI KHOẢN CÓ CHẶN NHAU KHÔNG
  // THÔNG TIN NGƯỜI DÙNG ĐANG XEM
  const viewedProfile = viewedAccount || {
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

// KHÔNG HIỂN THỊ HỒ SƠ KHI KHÔNG CÓ QUYỀN
if (
  !isUser(getCurrentAccount()) ||
  (!isLoading && !viewedAccount)
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

if (isLoading) return <div className="profile-page"><div className="profile-card">Đang tải hồ sơ…</div></div>;
if (loadError) return <div className="profile-page"><div className="profile-card profile-unavailable"><h2>Không thể tải hồ sơ</h2><p role="alert">{loadError}</p><Link to="/feed" className="profile-back-button">Quay về bảng tin</Link></div></div>;

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
