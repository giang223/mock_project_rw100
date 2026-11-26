
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialForm);

  const [errors, setErrors] = useState({});

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [submitMessage, setSubmitMessage] = useState("");

  // YÊU CẦU MẬT KHẨU
  const passwordRules = [
    {
      label: "Có ít nhất 8 ký tự",
      valid: formData.password.length >= 8,
    },
    {
      label: "Có ít nhất một chữ hoa",
      valid: /[A-Z]/.test(formData.password),
    },
    {
      label: "Có ít nhất một chữ thường",
      valid: /[a-z]/.test(formData.password),
    },
    {
      label: "Có ít nhất một chữ số",
      valid: /[0-9]/.test(formData.password),
    },
    {
      label: "Có ít nhất một ký tự đặc biệt",
      valid: /[^A-Za-z0-9\s]/.test(formData.password),
    },
  ];

  const strength = passwordRules.filter(
    (rule) => rule.valid
  ).length;

  // ĐÁNH GIÁ MẬT KHẨU
  const getStrengthLabel = () => {
    if (!formData.password) return "Chưa nhập";

    if (strength <= 2) return "Yếu";

    if (strength <= 4) return "Trung bình";

    return "Đạt yêu cầu";
  };

  const getStrengthColor = () => {
    if (strength <= 2) return "#dc2626";

    if (strength <= 4) return "#f59e0b";

    return "#16a34a";
  };

  // XỬ LÝ NHẬP DỮ LIỆU
  const handleChange = (event) => {
  const { name, value } = event.target;

  setFormData((previous) => ({
    ...previous,
    [name]: value,
  }));

  setErrors((previous) => {
    const next = { ...previous };

    delete next[name];

    if (name === "password") {
      delete next.confirmPassword;
    }

    return next;
  });

  setSubmitMessage("");
};

  // KIỂM TRA DỮ LIỆU
  const validateForm = () => {
    const newErrors = {};

    const fullName = formData.fullName.trim();
    const email = formData.email.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const nameRegex = /^[\p{L}\p{M}\s.'’-]+$/u;

    // KIỂM TRA HỌ TÊN
    if (!fullName) {
      newErrors.fullName =
        "Vui lòng nhập họ và tên.";
    } else if (fullName.length < 2) {
      newErrors.fullName =
        "Họ và tên phải có ít nhất 2 ký tự.";
    } else if (fullName.length > 100) {
      newErrors.fullName =
        "Họ và tên không được vượt quá 100 ký tự.";
    } else if (
  !nameRegex.test(fullName) ||
  !/\p{L}/u.test(fullName)
) {
  newErrors.fullName =
    "Họ và tên không được chứa số hoặc ký tự không hợp lệ.";
}

    // KIỂM TRA EMAIL
    if (!email) {
      newErrors.email =
        "Vui lòng nhập địa chỉ email.";
    } else if (!emailRegex.test(email)) {
      newErrors.email =
        "Địa chỉ email không hợp lệ.";
    } else if (email.length > 254) {
      newErrors.email =
        "Địa chỉ email quá dài.";
    }

    // KIỂM TRA MẬT KHẨU
    if (!formData.password.trim()) {
      newErrors.password =
        "Vui lòng nhập mật khẩu.";
    } else if (formData.password.length < 8) {
      newErrors.password =
        "Mật khẩu phải có ít nhất 8 ký tự.";
    } else if (formData.password.length > 128) {
      newErrors.password =
        "Mật khẩu không được vượt quá 128 ký tự.";
    } else if (
      !passwordRules.every((rule) => rule.valid)
    ) {
      newErrors.password =
        "Mật khẩu chưa đáp ứng đủ yêu cầu.";
    }

    // KIỂM TRA XÁC NHẬN MẬT KHẨU
    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        "Vui lòng xác nhận mật khẩu.";
    } else if (
      formData.password !== formData.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Mật khẩu xác nhận không khớp.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // XỬ LÝ ĐĂNG KÝ
  const handleRegister = (event) => {
    event.preventDefault();

    setSubmitMessage("");

    if (!validateForm()) {
      return;
    }

    /*
      TODO: KẾT NỐI API REGISTER

      1. Gửi fullName, email, password đến Backend.
      2. Kiểm tra email đã tồn tại hay chưa.
      3. Kiểm tra dữ liệu đăng ký.
      4. Mã hóa mật khẩu tại Backend.
      5. Tạo tài khoản chưa xác thực.
      6. Gửi mã OTP đến email.
      7. Chuyển đến trang Verify Email.
    */

    setSubmitMessage(
      "Thông tin đăng ký hợp lệ. Chức năng đang chờ kết nối Backend. Tài khoản chưa được tạo và OTP chưa được gửi."
    );

    setFormData((previous) => ({
      ...previous,
      password: "",
      confirmPassword: "",
    }));

    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // TRẢI NGHIỆM GIAO DIỆN XÁC THỰC EMAIL
  const handleDemoVerify = () => {
  const email = formData.email.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email) || email.length > 254) {
    setErrors((previous) => ({
      ...previous,
      email: "Vui lòng nhập email hợp lệ để thử giao diện OTP.",
    }));

    return;
  }

  navigate("/verify-email", {
    state: {
      email,
      demo: true,
    },
  });
};
  return (
    <div className="auth-container">

      <div className="auth-card register-card">

        {/* LOGO */}
        <h1 className="logo">MiniSocial</h1>

        {/* TIÊU ĐỀ */}
        <h2>Tạo tài khoản</h2>

        <p className="subtitle">
          Tham gia và kết nối với mọi người.
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

        {/* FORM ĐĂNG KÝ */}
        <form onSubmit={handleRegister} noValidate>

          {/* HỌ VÀ TÊN */}
          <div className="login-form-group">

            <label htmlFor="registerFullName">
              Họ và tên
              <span className="login-required"> *</span>
            </label>

            <input
              id="registerFullName"
              type="text"
              name="fullName"
              placeholder="Nhập họ và tên"
              autoComplete="name"
              maxLength={100}
              value={formData.fullName}
              onChange={handleChange}
              className={
                errors.fullName
                  ? "login-input-error"
                  : ""
              }
              aria-invalid={Boolean(errors.fullName)}
            />

            {errors.fullName && (
              <span className="login-error" role="alert">
                {errors.fullName}
              </span>
            )}

          </div>

          {/* EMAIL */}
          <div className="login-form-group">

            <label htmlFor="registerEmail">
              Email
              <span className="login-required"> *</span>
            </label>

            <input
              id="registerEmail"
              type="email"
              name="email"
              placeholder="Nhập địa chỉ email"
              autoComplete="email"
              maxLength={254}
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
              <span className="login-error" role="alert">
                {errors.email}
              </span>
            )}

          </div>

          {/* MẬT KHẨU */}
          <div className="login-form-group">

            <label htmlFor="registerPassword">
              Mật khẩu
              <span className="login-required"> *</span>
            </label>

            <div className="password-field">

              <input
                id="registerPassword"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Tạo mật khẩu"
                autoComplete="new-password"
                maxLength={128}
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

            {/* THANH ĐÁNH GIÁ MẬT KHẨU */}
            {formData.password && (
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

              <strong>Yêu cầu mật khẩu:</strong>

              {passwordRules.map((rule, index) => (
  <div
    key={index}
    className={`password-rule ${rule.valid ? "valid" : ""}`}
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
          <div className="login-form-group">

            <label htmlFor="registerConfirmPassword">
              Xác nhận mật khẩu
              <span className="login-required"> *</span>
            </label>

            <div className="password-field">

              <input
                id="registerConfirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                name="confirmPassword"
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                maxLength={128}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={
                  errors.confirmPassword
                    ? "login-input-error"
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
                {showConfirmPassword ? "Ẩn" : "Hiện"}
              </button>

            </div>

            {errors.confirmPassword && (
              <span className="login-error" role="alert">
                {errors.confirmPassword}
              </span>
            )}

            {formData.confirmPassword &&
              formData.confirmPassword ===
                formData.password && (
                <span className="password-match">
                  ✓ Mật khẩu xác nhận trùng khớp
                </span>
              )}

          </div>

          {/* NÚT ĐĂNG KÝ */}
          <button
            type="submit"
            className="login-button"
          >
            Đăng ký
          </button>

        </form>

        {/* TRẢI NGHIỆM OTP */}
        <div className="login-divider">
          <span />
          <small>Hoặc</small>
          <span />
        </div>

        <button
          type="button"
          className="demo-login-button"
          onClick={handleDemoVerify}
        >
          Trải nghiệm xác thực email
        </button>

        <p className="demo-login-note">
          Chế độ demo chỉ dành cho kiểm thử giao diện OTP,
          không tạo tài khoản thật.
        </p>

        {/* CHUYỂN SANG ĐĂNG NHẬP */}
        <div className="auth-footer">

          Đã có tài khoản?

          <Link to="/login">
            {" "}Đăng nhập
          </Link>

        </div>

      </div>

    </div>
  );
}

export default Register;
