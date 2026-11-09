
import { Link } from "react-router-dom";

function Profile() {
  // Dữ liệu mẫu, sau này sẽ lấy từ Backend
  const user = {
    fullName: "Nguyễn Văn A",
    email: "nguyenvana@gmail.com",
    phone: "0987654321",
    birthday: "15/05/2002",
    gender: "Nam",
    address: "Hà Nội, Việt Nam",
    bio: "Xin chào! Mình đang sử dụng MiniSocial.",
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.fullName.charAt(0)}
          </div>

          <h2>{user.fullName}</h2>
          <p className="profile-email">{user.email}</p>

          <span className="profile-badge">Thành viên</span>
        </div>

        <div className="profile-content">
          <h3>Thông tin cá nhân</h3>

          <div className="profile-info">
            <div className="info-item">
              <span>Họ và tên</span>
              <strong>{user.fullName}</strong>
            </div>

            <div className="info-item">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>

            <div className="info-item">
              <span>Số điện thoại</span>
              <strong>{user.phone}</strong>
            </div>

            <div className="info-item">
              <span>Ngày sinh</span>
              <strong>{user.birthday}</strong>
            </div>

            <div className="info-item">
              <span>Giới tính</span>
              <strong>{user.gender}</strong>
            </div>

            <div className="info-item">
              <span>Địa chỉ</span>
              <strong>{user.address}</strong>
            </div>
          </div>

          <div className="profile-bio">
            <span>Giới thiệu</span>
            <p>{user.bio}</p>
          </div>

          <Link to="/profile/edit" className="edit-profile-button">
            Chỉnh sửa thông tin
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Profile;
