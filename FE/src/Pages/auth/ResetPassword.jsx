
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự!");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    // Demo: Chưa cập nhật mật khẩu trên Backend
    setSuccess(true);
  };

  const handleFinish = () => {
    navigate("/login");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="logo">MiniSocial</h1>

        <h2>Đặt lại mật khẩu</h2>

        <p className="subtitle">
          Hãy tạo mật khẩu mới để tiếp tục sử dụng tài khoản.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Mật khẩu mới</label>

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>

          <label>Xác nhận mật khẩu</label>

          <input
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <p className="error-message">{error}</p>
          )}

          <button type="submit" className="login-button">
            Cập nhật mật khẩu
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Quay lại đăng nhập</Link>
        </div>
      </div>

      {success && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="success-icon">✓</div>

            <h2>Đặt lại mật khẩu thành công!</h2>

            <p>
              Mật khẩu mới đã được kiểm tra.
              Bạn có thể quay lại màn hình đăng nhập.
            </p>

            <button
              className="login-button"
              onClick={handleFinish}
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResetPassword;
