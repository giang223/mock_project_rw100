import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const demoUsers = {
  "Nguyễn Văn A": { fullName: "Nguyễn Văn A", email: "nguyenvana@gmail.com", phone: "0987654321", birthday: "15/05/2002", gender: "Nam", address: "Hà Nội, Việt Nam", bio: "Xin chào! Mình đang sử dụng MiniSocial." },
  "Trần Thị B": { fullName: "Trần Thị B", email: "Chưa công khai", phone: "Chưa công khai", birthday: "Chưa cập nhật", gender: "Chưa cập nhật", address: "Chưa cập nhật", bio: "Chia sẻ những điều tích cực mỗi ngày!" },
  "Lê Văn C": { fullName: "Lê Văn C", email: "Chưa công khai", phone: "Chưa công khai", birthday: "Chưa cập nhật", gender: "Chưa cập nhật", address: "Chưa cập nhật", bio: "Đang sử dụng MiniSocial." },
};

const PROFILE_KEY = "miniSocialProfile";
const PROFILE_EVENT = "miniSocialProfileUpdated";

function readProfile() {
  const defaultProfile = {
    ...demoUsers["Nguyễn Văn A"],
    avatar: "",
    cover: "",
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

function formatBirthday(value) {
  if (!value) return "Chưa cập nhật";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");

    return `${day}/${month}/${year}`;
  }

  return value;
}
function readProfilePosts(viewedName, isOwnProfile) {
  try {
    const allPosts = JSON.parse(
      localStorage.getItem("miniSocialPosts") || "[]"
    );

    if (!Array.isArray(allPosts)) return [];

    return allPosts.filter((post) => {
      const isAuthor = post.author === viewedName;

      if (!isAuthor) return false;

      if (isOwnProfile) return true;

      return (
        !post.privacy ||
        post.privacy === "public"
      );
    });
  } catch {
    return [];
  }
}

function Profile() {
  const [params] = useSearchParams();
  const viewedName = params.get("user") || "Nguyễn Văn A";
  const isOwnProfile = viewedName === "Nguyễn Văn A";
const [myProfile, setMyProfile] = useState(readProfile);

const user = isOwnProfile
  ? myProfile
  : demoUsers[viewedName] || {
      fullName: viewedName,
      email: "Chưa công khai",
      phone: "Chưa công khai",
      birthday: "Chưa cập nhật",
      gender: "Chưa cập nhật",
      address: "Chưa cập nhật",
      bio: "Người dùng MiniSocial.",
    };

// ĐỒNG BỘ THÔNG TIN CÁ NHÂN
useEffect(() => {
  const refreshProfile = () => {
    setMyProfile(readProfile());
  };

  refreshProfile();

  window.addEventListener(
    PROFILE_EVENT,
    refreshProfile
  );

  window.addEventListener(
    "storage",
    refreshProfile
  );

  return () => {
    window.removeEventListener(
      PROFILE_EVENT,
      refreshProfile
    );

    window.removeEventListener(
      "storage",
      refreshProfile
    );
  };
}, []);
 const [posts, setPosts] = useState(() =>
  readProfilePosts(viewedName, isOwnProfile)
);

useEffect(() => {
  const refreshPosts = () => {
    setPosts(
      readProfilePosts(viewedName, isOwnProfile)
    );
  };

  refreshPosts();

  window.addEventListener(
    "miniSocialPostsUpdated",
    refreshPosts
  );

  window.addEventListener(
    "storage",
    refreshPosts
  );

  return () => {
    window.removeEventListener(
      "miniSocialPostsUpdated",
      refreshPosts
    );

    window.removeEventListener(
      "storage",
      refreshPosts
    );
  };
}, [viewedName, isOwnProfile]);

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
<div className="profile-avatar">
  {user.avatar ? (
    <img
      src={user.avatar}
      alt="Ảnh đại diện"
    />
  ) : (
    user.fullName.charAt(0)
  )}
</div>       
   <h2>{user.fullName}</h2>
          <p className="profile-email">{isOwnProfile ? user.email : "Trang cá nhân"}</p>
          <span className="profile-badge">Thành viên</span>
        </div>
        <div className="profile-content">
          <h3>Thông tin cá nhân</h3>
          <div className="profile-info">
            <div className="info-item"><span>Họ và tên</span><strong>{user.fullName}</strong></div>
            <div className="info-item"><span>Email</span><strong>{user.email}</strong></div>
            <div className="info-item"><span>Số điện thoại</span><strong>{user.phone}</strong></div>
            <div className="info-item"><span>Ngày sinh</span><strong>{formatBirthday(user.birthday)}</strong></div>
            <div className="info-item"><span>Giới tính</span><strong>{user.gender}</strong></div>
            <div className="info-item"><span>Địa chỉ</span><strong>{user.address}</strong></div>
          </div>
          <div className="profile-bio"><span>Giới thiệu</span><p>{user.bio}</p></div>
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
            {post.createdAt
              ? new Date(post.createdAt)
                  .toLocaleString("vi-VN")
              : ""}
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

            <strong>Bài viết được chia sẻ</strong>

            <p>{post.originalPost.author}</p>

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
