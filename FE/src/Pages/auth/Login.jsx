
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  // XỬ LÝ NHẬP DỮ LIỆU
  const handleChange = (event) => {
  const { name, value } = event.target;

  setFormData((previous) => ({
    ...previous,
    [name]: value,
  }));

  setErrors((previous) => ({
    ...previous,
    [name]: "",
  }));

  setSubmitMessage("");
};

  // KIỂM TRA DỮ LIỆU
  const validateForm = () => {
    const newErrors = {};

    const email = formData.email.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // KIỂM TRA EMAIL
    if (!email) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Địa chỉ email không hợp lệ.";
    }

    // KIỂM TRA MẬT KHẨU
    if (!formData.password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // XỬ LÝ ĐĂNG NHẬP
  const handleLogin = (event) => {
    event.preventDefault();

    setSubmitMessage("");

    if (!validateForm()) {
      return;
    }

    /*
      TODO: KẾT NỐI API LOGIN

      1. Gửi email và password đến Backend.
      2. Backend kiểm tra tài khoản.
      3. Kiểm tra mật khẩu.
      4. Kiểm tra trạng thái xác thực email.
      5. Kiểm tra trạng thái tài khoản.
      6. Nhận Access Token và Refresh Token.
      7. Chuyển đến trang /feed khi đăng nhập thành công.
    */

    setSubmitMessage(
      "Thông tin nhập hợp lệ. Chức năng đăng nhập đang chờ kết nối Backend."
    );

    setFormData((previous) => ({
      ...previous,
      password: "",
    }));

    setShowPassword(false);
  };

  // TRUY CẬP BẢN DEMO FRONTEND
  const handleDemoLogin = () => {
    setFormData({
      email: "",
      password: "",
    });

    setErrors({});
    setShowPassword(false);

    navigate("/feed");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* LOGO */}
        <h1 className="logo">MiniSocial</h1>

        {/* TIÊU ĐỀ */}
        <h2>Chào mừng trở lại!</h2>

        <p className="subtitle">
          Đăng nhập để kết nối với mọi người.
        </p>

        {/* THÔNG BÁO */}
        {submitMessage && (
          <div
            className="login-info-message"
            role="status"
          >
            {submitMessage}
          </div>
        )}

        {/* FORM ĐĂNG NHẬP */}
        <form onSubmit={handleLogin} noValidate>

          {/* EMAIL */}
          <div className="login-form-group">

            <label htmlFor="loginEmail">
              Email
              <span className="login-required"> *</span>
            </label>

            <input
              id="loginEmail"
              type="email"
              name="email"
              placeholder="Nhập địa chỉ email"
              autoComplete="username"
              value={formData.email}
              onChange={handleChange}
              className={
                errors.email ? "login-input-error" : ""
              }
              aria-invalid={Boolean(errors.email)}
            />

            {errors.email && (
              <span className="login-error" role="alert">
                {errors.email}
              </span>
            )}

          </div>

          {/* MẬT KHẨU */}
          <div className="login-form-group">

            <label htmlFor="loginPassword">
              Mật khẩu
              <span className="login-required"> *</span>
            </label>

            <div className="password-field">

              <input
                id="loginPassword"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                className={
                  errors.password
                    ? "login-input-error"
                    : ""
                }
                aria-invalid={Boolean(errors.password)}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword
                    ? "Ẩn mật khẩu"
                    : "Hiển thị mật khẩu"
                }
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>

            </div>

            {errors.password && (
              <span className="login-error" role="alert">
                {errors.password}
              </span>
            )}

          </div>

          {/* QUÊN MẬT KHẨU */}
          <div className="forgot-link">

            <Link to="/forgot-password">
              Quên mật khẩu?
            </Link>

          </div>

          {/* ĐĂNG NHẬP */}
          <button
            type="submit"
            className="login-button"
          >
            Đăng nhập
          </button>

        </form>

        {/* PHÂN CÁCH */}
        <div className="login-divider">
          <span />
          <small>Hoặc</small>
          <span />
        </div>

        {/* ĐĂNG NHẬP DEMO */}
        <button
          type="button"
          className="demo-login-button"
          onClick={handleDemoLogin}
        >
          Trải nghiệm MiniSocial
        </button>

        <p className="demo-login-note">
          Chế độ demo dành cho kiểm thử Frontend,
          không yêu cầu tài khoản.
        </p>

        {/* ĐĂNG KÝ */}
        <div className="auth-footer">
          Chưa có tài khoản?

          <Link to="/register">
            {" "}Đăng ký ngay
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;
