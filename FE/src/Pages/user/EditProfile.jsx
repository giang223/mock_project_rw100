
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function EditProfile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "Nguyễn Văn A",
    phone: "0987654321",
    birthday: "2002-05-15",
    gender: "Nam",
    address: "Hà Nội, Việt Nam",
    bio: "Xin chào! Mình đang sử dụng MiniSocial.",
  });

  const [avatar, setAvatar] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setAvatar(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    alert("Cập nhật thông tin thành công! (Demo)");
    navigate("/profile");
  };

  return (
    <div className="profile-page">
      <div className="edit-profile-card">
        <h2>Chỉnh sửa thông tin</h2>

        <p className="edit-subtitle">
          Cập nhật thông tin cá nhân của bạn.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="avatar-upload">
            <div className="profile-avatar">
              {avatar ? (
                <img src={avatar} alt="Avatar" />
              ) : (
                formData.fullName.charAt(0)
              )}
            </div>

            <label htmlFor="avatar" className="upload-label">
              Đổi ảnh đại diện
            </label>

            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              hidden
            />
          </div>

          <div className="edit-form-grid">
            <div className="edit-field">
              <label>Họ và tên</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="edit-field">
              <label>Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="edit-field">
              <label>Ngày sinh</label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
              />
            </div>

            <div className="edit-field">
              <label>Giới tính</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="edit-field full-width">
              <label>Địa chỉ</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="edit-field full-width">
              <label>Giới thiệu bản thân</label>
              <textarea
                name="bio"
                rows="4"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Viết đôi điều về bạn..."
              />
            </div>
          </div>

          <div className="edit-actions">
            <Link to="/profile" className="cancel-button">
              Hủy
            </Link>

            <button type="submit" className="login-button">
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
