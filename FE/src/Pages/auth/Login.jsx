import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { getApiErrorMessage } from "../../api/http";

import {
  MOCK_ACCOUNTS,
  MOCK_PASSWORD,
  loginMockAccount,
  isAdmin,
} from "../../utils/mockAccounts";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isInitializing } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(location.state?.authMessage || "");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setSelectedAccount("");
    setSubmitMessage("");
  };

  // KIỂM TRA DỮ LIỆU
  const validateForm = () => {
    const newErrors = {};
    const email = formData.email.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Vui lòng nhập địa chỉ email.";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Địa chỉ email không hợp lệ.";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ĐĂNG NHẬP
  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitMessage("");
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const session = await login({
        email: formData.email.trim(),
        password: formData.password,
      });
      const from = location.state?.from;
      const destination = from?.pathname?.startsWith("/") && !from.pathname.startsWith("//")
        ? `${from.pathname}${from.search || ""}${from.hash || ""}`
        : session.user.role === "ADMIN" ? "/admin/reports" : "/feed";
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitMessage(getApiErrorMessage(error, "Email hoặc mật khẩu không đúng."));
    } finally {
      setIsSubmitting(false);
    }
  };
  // CHỌN TÀI KHOẢN DEMO
  const handleSelectAccount = (event) => {
    const id = event.target.value;

    setSelectedAccount(id);
    setErrors({});
    setSubmitMessage("");

    const account = MOCK_ACCOUNTS.find(
      (item) => String(item.id) === id
    );

    if (!account) {
      setFormData({
        email: "",
        password: "",
      });

      return;
    }

    setFormData({
      email: account.email,
      password: MOCK_PASSWORD,
    });
  };

  // Mock sign-in is available only when explicitly enabled for UI demos.
  const handleDemoLogin = () => {
    if (import.meta.env.VITE_DEMO_AUTH_ENABLED !== "true") return;
    setErrors({});
    setSubmitMessage("");
    const account = MOCK_ACCOUNTS.find((item) => String(item.id) === selectedAccount);
    if (!account) {
      setSubmitMessage("Vui lòng chọn tài khoản demo!");
      return;
    }
    const result = loginMockAccount(account.email, MOCK_PASSWORD);
    if (!result.success) {
      setSubmitMessage(result.message);
      return;
    }
    navigate(isAdmin(result.account) ? "/admin/reports" : "/feed", { replace: true });
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

        {/* THÔNG BÁO LỖI */}
        {submitMessage && (
          <div
            className="mock-login-error"
            role="alert"
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
              <span className="login-required">
                {" "}*
              </span>
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
                errors.email
                  ? "login-input-error"
                  : ""
              }
              aria-invalid={Boolean(errors.email)}
            />

            {errors.email && (
              <span
                className="login-error"
                role="alert"
              >
                {errors.email}
              </span>
            )}
          </div>

          {/* MẬT KHẨU */}
          <div className="login-form-group">
            <label htmlFor="loginPassword">
              Mật khẩu
              <span className="login-required">
                {" "}*
              </span>
            </label>

            <div className="password-field">
              <input
                id="loginPassword"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
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
                aria-invalid={
                  Boolean(errors.password)
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
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
              <span
                className="login-error"
                role="alert"
              >
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
            disabled={isSubmitting || isInitializing}
          >
            {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>

        </form>

        {import.meta.env.VITE_DEMO_AUTH_ENABLED === "true" && (
          <>
        <div className="login-divider"><span /><small>Hoặc</small><span /></div>
        <div className="mock-account-panel">

          <div className="mock-account-heading">
            <span>👥</span>

            <div>
              <strong>Tài khoản trải nghiệm</strong>

              <small>
                Chọn tài khoản để kiểm thử MiniSocial
              </small>
            </div>
          </div>

          <label htmlFor="mockAccount">
            Chọn tài khoản demo
          </label>

          <select
            id="mockAccount"
            value={selectedAccount}
            onChange={handleSelectAccount}
          >
            <option value="">
              -- Chọn tài khoản --
            </option>

            <optgroup label="Người dùng - USER">
  {MOCK_ACCOUNTS
    .filter((account) => account.role === "USER")
    .map((account) => (
      <option
        key={account.id}
        value={account.id}
      >
        {account.fullName}
      </option>
    ))}
</optgroup>

<optgroup label="Quản trị viên - ADMIN">
  {MOCK_ACCOUNTS
    .filter((account) => account.role === "ADMIN")
    .map((account) => (
      <option
        key={account.id}
        value={account.id}
      >
        {account.fullName} (Admin)
      </option>
    ))}
</optgroup>
          </select>

          <div className="mock-account-password">
            Mật khẩu demo:{" "}
            <strong>{MOCK_PASSWORD}</strong>
          </div>

          <button
            type="button"
            className="demo-login-button"
            onClick={handleDemoLogin}
          >
            Đăng nhập nhanh
          </button>

          <p className="demo-login-note">
            Chế độ giả lập dành cho kiểm thử Frontend.
            Chưa kết nối Backend.
          </p>

        </div>
          </>
        )}

        {import.meta.env.VITE_OAUTH_ENABLED === "true" && (
          <div className="oauth-login-actions">
            {["google", "facebook"].map((provider) => (
              <a
                key={provider}
                className="demo-login-button"
                href={`${(import.meta.env.VITE_OAUTH_BASE_URL || "http://localhost:8080").replace(/\/$/, "")}/oauth2/authorization/${provider}`}
              >
                Tiếp tục với {provider === "google" ? "Google" : "Facebook"}
              </a>
            ))}
          </div>
        )}

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
