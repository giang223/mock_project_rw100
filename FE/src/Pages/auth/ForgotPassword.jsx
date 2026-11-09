
import { useState } from "react";
import { Link } from "react-router-dom";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email!");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Địa chỉ email không hợp lệ!");
      return;
    }

    // Demo: Chưa gửi email thật
    setSuccess(true);
  };

  return (
    <div className="auth-container">
      <div className="auth-card forgot-card">
        <h1 className="logo">MiniSocial</h1>

        <div className="forgot-icon">✉</div>

        <h2>Quên mật khẩu?</h2>

        <p className="subtitle">
          Đừng lo lắng! Hãy nhập email đã đăng ký.
          Chúng tôi sẽ gửi liên kết giúp bạn đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Email</label>

          <input
            type="email"
            placeholder="Nhập địa chỉ email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />

          {error && (
            <p className="error-message">{error}</p>
          )}

          <button type="submit" className="login-button">
            Gửi liên kết đặt lại mật khẩu
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Quay lại đăng nhập</Link>
        </div>
      </div>

      {success && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="success-icon">✓</div>

            <h2>Gửi yêu cầu thành công!</h2>

            <p>
              Nếu email tồn tại trong hệ thống,
              bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.
            </p>

            <button
              className="login-button"
              onClick={() => setSuccess(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForgotPassword;
