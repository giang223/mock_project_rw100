
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function ChangePassword() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.currentPassword.trim()) {
      alert("Vui lòng nhập mật khẩu hiện tại!");
      return;
    }

    if (formData.newPassword.length < 8) {
      alert("Mật khẩu mới phải có ít nhất 8 ký tự!");
      return;
    }

    if (formData.newPassword === formData.currentPassword) {
      alert("Mật khẩu mới phải khác mật khẩu hiện tại!");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    alert("Đổi mật khẩu thành công!");

    navigate("/profile");
  };

  return (
    <div className="profile-page">
      <div className="change-password-card">
        <div className="change-password-icon">
          🔒
        </div>

        <h2>Đổi mật khẩu</h2>

        <p className="change-password-subtitle">
          Cập nhật mật khẩu để bảo vệ tài khoản của bạn.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="password-form-field">
            <label>Mật khẩu hiện tại</label>
            <input
              type={showPassword ? "text" : "password"}
              name="currentPassword"
              placeholder="Nhập mật khẩu hiện tại"
              value={formData.currentPassword}
              onChange={handleChange}
            />
          </div>

          <div className="password-form-field">
            <label>Mật khẩu mới</label>
            <input
              type={showPassword ? "text" : "password"}
              name="newPassword"
              placeholder="Nhập mật khẩu mới"
              value={formData.newPassword}
              onChange={handleChange}
            />
          </div>

          <div className="password-form-field">
            <label>Xác nhận mật khẩu mới</label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu mới"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <div className="show-password-option">
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            <label htmlFor="showPassword">
              Hiển thị mật khẩu
            </label>
          </div>

          <button type="submit" className="login-button">
            Cập nhật mật khẩu
          </button>

          <Link to="/profile" className="back-profile-link">
            Quay lại hồ sơ
          </Link>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
