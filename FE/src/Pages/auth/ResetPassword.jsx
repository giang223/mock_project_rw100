
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // NHẬN THÔNG TIN TỪ FORGOT PASSWORD
  const email = location.state?.email || "";
  const isDemo = location.state?.demo === true;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // YÊU CẦU MẬT KHẨU
  const passwordRules = [
    {
      label: "Có ít nhất 8 ký tự",
      valid: password.length >= 8,
    },
    {
      label: "Có ít nhất một chữ hoa",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "Có ít nhất một chữ thường",
      valid: /[a-z]/.test(password),
    },
    {
      label: "Có ít nhất một chữ số",
      valid: /[0-9]/.test(password),
    },
    {
      label: "Có ít nhất một ký tự đặc biệt",
      valid: /[^A-Za-z0-9\s]/.test(password),
    },
  ];

  const strength = passwordRules.filter(
    (rule) => rule.valid
  ).length;

  // ĐÁNH GIÁ MẬT KHẨU
  const getStrengthLabel = () => {
    if (strength <= 2) return "Yếu";
    if (strength <= 4) return "Trung bình";

    return "Đạt yêu cầu";
  };

  const getStrengthColor = () => {
    if (strength <= 2) return "#dc2626";
    if (strength <= 4) return "#f59e0b";

    return "#16a34a";
  };

  // CHE MỘT PHẦN EMAIL
  const maskEmail = (value) => {
    if (!value.includes("@")) return value;

    const [name, domain] = value.split("@");

    return `${name.slice(0, 2)}***@${domain}`;
  };

  // NHẬP MẬT KHẨU MỚI
  const handlePasswordChange = (event) => {
    setPassword(event.target.value);

    setErrors((previous) => ({
      ...previous,
      password: "",
      confirmPassword: "",
    }));
  };

  // NHẬP MẬT KHẨU XÁC NHẬN
  const handleConfirmChange = (event) => {
    setConfirmPassword(event.target.value);

    setErrors((previous) => ({
      ...previous,
      confirmPassword: "",
    }));
  };

  // KIỂM TRA DỮ LIỆU
  const validateForm = () => {
    const newErrors = {};

    if (!password.trim()) {
      newErrors.password =
        "Vui lòng nhập mật khẩu mới.";
    } else if (password.length < 8) {
      newErrors.password =
        "Mật khẩu phải có ít nhất 8 ký tự.";
    } else if (password.length > 128) {
      newErrors.password =
        "Mật khẩu không được vượt quá 128 ký tự.";
    } else if (
      !passwordRules.every((rule) => rule.valid)
    ) {
      newErrors.password =
        "Mật khẩu chưa đáp ứng đủ yêu cầu.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword =
        "Vui lòng xác nhận mật khẩu.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword =
        "Mật khẩu xác nhận không khớp.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // XỬ LÝ ĐẶT LẠI MẬT KHẨU
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email || !isDemo) return;

    if (!validateForm()) return;

    /*
      TODO: KẾT NỐI BACKEND

      1. Nhận reset token từ liên kết email.
      2. Gửi token và mật khẩu mới đến Backend.
      3. Backend kiểm tra token và thời hạn.
      4. Mã hóa mật khẩu mới.
      5. Cập nhật mật khẩu trong Database.
      6. Vô hiệu hóa reset token đã sử dụng.
      7. Trả về kết quả.
    */

    // CHỈ KIỂM THỬ FRONTEND
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);

    setSuccess(true);
  };

  // QUAY LẠI ĐĂNG NHẬP
  const handleFinish = () => {
    setSuccess(false);

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <div className="auth-container">

      <div className="auth-card reset-password-card">

        {/* LOGO */}
        <h1 className="logo">
          MiniSocial
        </h1>

        {/* BIỂU TƯỢNG */}
        <div className="reset-password-icon">
          🔒
        </div>

        <h2>Đặt lại mật khẩu</h2>

        <p className="subtitle">
          Hãy tạo mật khẩu mới để bảo vệ tài khoản
          của bạn.
        </p>

        {/* KIỂM TRA ĐIỀU KIỆN TRUY CẬP */}
        {!email || !isDemo ? (
          <div className="reset-invalid-request">

            <strong>
              Không tìm thấy yêu cầu đặt lại mật khẩu.
            </strong>

            <p>
              Vui lòng quay lại trang Quên mật khẩu
              để bắt đầu yêu cầu mới.
            </p>

            <Link to="/forgot-password">
              Quay lại Quên mật khẩu
            </Link>

          </div>
        ) : (
          <>
            {/* EMAIL */}
            <div className="reset-email-address">
              {maskEmail(email)}
            </div>

            {/* THÔNG BÁO DEMO */}
            <div className="reset-demo-note">
              Chế độ kiểm thử Frontend.
              Mật khẩu thật chưa được cập nhật.
            </div>

            <form onSubmit={handleSubmit} noValidate>

              {/* MẬT KHẨU MỚI */}
              <div className="reset-form-group">

                <label htmlFor="resetPassword">
                  Mật khẩu mới
                  <span className="reset-required">
                    {" "}*
                  </span>
                </label>

                <div className="password-field">

                  <input
                    id="resetPassword"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Nhập mật khẩu mới"
                    autoComplete="new-password"
                    maxLength={128}
                    value={password}
                    onChange={handlePasswordChange}
                    className={
                      errors.password
                        ? "reset-input-error"
                        : ""
                    }
                    aria-invalid={Boolean(errors.password)}
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
                  <p
                    className="reset-error-message"
                    role="alert"
                  >
                    {errors.password}
                  </p>
                )}

                {/* ĐÁNH GIÁ MẬT KHẨU */}
                {password && (
                  <div className="password-strength">

                    <div className="password-strength-header">

                      <span>Đánh giá mật khẩu</span>

                      <strong
                        style={{
                          color: getStrengthColor(),
                        }}
                      >
                        {getStrengthLabel()}
                      </strong>

                    </div>

                    <div className="password-strength-track">

                      <div
                        className="password-strength-fill"
                        style={{
                          width: `${strength * 20}%`,
                          background: getStrengthColor(),
                        }}
                      />

                    </div>

                  </div>
                )}

                {/* YÊU CẦU MẬT KHẨU */}
                <div className="password-requirements">

                  <strong>
                    Yêu cầu mật khẩu:
                  </strong>

                  {passwordRules.map((rule, index) => (
                    <div
                      key={index}
                      className={`password-rule ${
                        rule.valid ? "valid" : ""
                      }`}
                    >
                      <span>
                        {rule.valid ? "✓" : "○"}
                      </span>

                      {rule.label}
                    </div>
                  ))}

                </div>

              </div>

              {/* XÁC NHẬN MẬT KHẨU */}
              <div className="reset-form-group">

                <label htmlFor="resetConfirmPassword">
                  Xác nhận mật khẩu
                  <span className="reset-required">
                    {" "}*
                  </span>
                </label>

                <div className="password-field">

                  <input
                    id="resetConfirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                    maxLength={128}
                    value={confirmPassword}
                    onChange={handleConfirmChange}
                    className={
                      errors.confirmPassword
                        ? "reset-input-error"
                        : ""
                    }
                    aria-invalid={
                      Boolean(errors.confirmPassword)
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Ẩn mật khẩu xác nhận"
                        : "Hiển thị mật khẩu xác nhận"
                    }
                  >
                    {showConfirmPassword
                      ? "Ẩn"
                      : "Hiện"}
                  </button>

                </div>

                {errors.confirmPassword && (
                  <p
                    className="reset-error-message"
                    role="alert"
                  >
                    {errors.confirmPassword}
                  </p>
                )}

                {confirmPassword &&
                  password === confirmPassword && (
                    <p className="reset-password-match">
                      ✓ Mật khẩu xác nhận trùng khớp
                    </p>
                  )}

              </div>

              {/* NÚT CẬP NHẬT */}
              <button
                type="submit"
                className="login-button reset-submit-button"
              >
                Cập nhật mật khẩu
              </button>

            </form>
          </>
        )}

        {/* QUAY LẠI LOGIN */}
        <div className="auth-footer">

          <Link to="/login">
            ← Quay lại đăng nhập
          </Link>

        </div>

      </div>

      {/* POPUP KẾT QUẢ */}
      {success && (
        <div className="reset-modal-overlay">

          <div
            className="reset-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resetModalTitle"
          >

            <div className="reset-success-icon">
              ✓
            </div>

            <h2 id="resetModalTitle">
              Kiểm thử thành công!
            </h2>

            <p>
              Mật khẩu mới đáp ứng đầy đủ các
              yêu cầu của hệ thống.
            </p>

            <div className="reset-modal-note">
              Đây là chế độ demo.
              Mật khẩu tài khoản thật chưa được
              thay đổi.
            </div>

            <button
              type="button"
              className="login-button"
              onClick={handleFinish}
              autoFocus
            >
              Quay lại đăng nhập
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default ResetPassword;
