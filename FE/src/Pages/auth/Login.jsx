
import { useState } from "react";
import { Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("Vui lòng nhập đầy đủ email và mật khẩu!");
      return;
    }

    alert("Bạn đã nhập thông tin đăng nhập thành công!");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="logo">MiniSocial</h1>

        <h2>Chào mừng trở lại!</h2>
        <p className="subtitle">
          Đăng nhập để kết nối với mọi người.
        </p>

        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Nhập địa chỉ email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Mật khẩu</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
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

          <div className="forgot-link">
            <Link to="/forgot-password">
              Quên mật khẩu?
            </Link>
          </div>

          <button type="submit" className="login-button">
            Đăng nhập
          </button>
        </form>

        <div className="auth-footer">
          Chưa có tài khoản?
          <Link to="/register"> Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
