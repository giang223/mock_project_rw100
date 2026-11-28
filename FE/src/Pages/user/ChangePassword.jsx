import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { changePassword } from "../../api/auth";
import { getApiErrorMessage } from "../../api/http";
import { useAuth } from "../../context/auth";

const initialForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function ChangePassword() {
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [formData, setFormData] = useState(initialForm);

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // YÊU CẦU MẬT KHẨU
  const passwordRules = [
    {
      label: "Có ít nhất 8 ký tự",
      valid: formData.newPassword.length >= 8,
    },
    {
      label: "Có ít nhất một chữ hoa",
      valid: /[A-Z]/.test(formData.newPassword),
    },
    {
      label: "Có ít nhất một chữ thường",
      valid: /[a-z]/.test(formData.newPassword),
    },
    {
      label: "Có ít nhất một chữ số",
      valid: /[0-9]/.test(formData.newPassword),
    },
    {
      label: "Có ít nhất một ký tự đặc biệt",
      valid: /[^A-Za-z0-9\s]/.test(
        formData.newPassword
      ),
    },
  ];

  // ĐÁNH GIÁ MẬT KHẨU
  const strength = passwordRules.filter(
    (rule) => rule.valid
  ).length;

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

  // XỬ LÝ NHẬP DỮ LIỆU
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => {
      const nextErrors = { ...previous };

      delete nextErrors[name];

      if (
        name === "newPassword" ||
        name === "currentPassword"
      ) {
        delete nextErrors.newPassword;
      }

      if (name === "newPassword") {
        delete nextErrors.confirmPassword;
      }

      return nextErrors;
    });

    setSubmitMessage("");
  };

  // KIỂM TRA DỮ LIỆU
  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword =
        "Vui lòng nhập mật khẩu hiện tại!";
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword =
        "Vui lòng nhập mật khẩu mới!";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword =
        "Mật khẩu mới phải có ít nhất 8 ký tự!";
    } else if (formData.newPassword.length > 100) {
      newErrors.newPassword =
        "Mật khẩu không được vượt quá 100 ký tự!";
    } else if (
      !passwordRules.every((rule) => rule.valid)
    ) {
      newErrors.newPassword =
        "Mật khẩu chưa đáp ứng đầy đủ yêu cầu!";
    } else if (
      formData.newPassword === formData.currentPassword
    ) {
      newErrors.newPassword =
        "Mật khẩu mới phải khác mật khẩu hiện tại!";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        "Vui lòng xác nhận mật khẩu mới!";
    } else if (
      formData.newPassword !== formData.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Mật khẩu xác nhận không khớp!";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // CẬP NHẬT MẬT KHẨU
  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitMessage("");

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await changePassword(formData);
      clearSession();
      navigate("/login", {
        replace: true,
        state: { authMessage: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." },
      });
    } catch (error) {
      setSubmitMessage(getApiErrorMessage(error, "Không thể đổi mật khẩu. Vui lòng thử lại."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // XÓA DỮ LIỆU ĐÃ NHẬP
  const handleReset = () => {
    setFormData({ ...initialForm });
    setErrors({});
    setSubmitMessage("");
    setShowPassword(false);
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

        {submitMessage && (
          <div
            className="password-info-message"
            role="alert"
          >
            {submitMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* MẬT KHẨU HIỆN TẠI */}
          <div className="password-form-field">

            <label htmlFor="currentPassword">
              Mật khẩu hiện tại
            </label>

            <input
              id="currentPassword"
              type={showPassword ? "text" : "password"}
              name="currentPassword"
              placeholder="Nhập mật khẩu hiện tại"
              autoComplete="current-password"
              maxLength={100}
              value={formData.currentPassword}
              onChange={handleChange}
              aria-invalid={Boolean(errors.currentPassword)}
            />

            {errors.currentPassword && (
              <small
                className="password-error"
                role="alert"
              >
                {errors.currentPassword}
              </small>
            )}

            <Link
              to="/forgot-password"
              className="forgot-password-link"
            >
              Quên mật khẩu hiện tại?
            </Link>

          </div>

          {/* MẬT KHẨU MỚI */}
          <div className="password-form-field">

            <label htmlFor="newPassword">
              Mật khẩu mới
            </label>

            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              name="newPassword"
              placeholder="Nhập mật khẩu mới"
              autoComplete="new-password"
              maxLength={100}
              value={formData.newPassword}
              onChange={handleChange}
              aria-invalid={Boolean(errors.newPassword)}
            />

            {errors.newPassword && (
              <small
                className="password-error"
                role="alert"
              >
                {errors.newPassword}
              </small>
            )}

          </div>

          {/* THANH ĐÁNH GIÁ MẬT KHẨU */}
          {formData.newPassword && (
            <div className="password-strength">

              <div className="password-strength-header">

                <span>Đánh giá mật khẩu</span>

                <strong
                  style={{ color: getStrengthColor() }}
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

          {/* XÁC NHẬN MẬT KHẨU */}
          <div className="password-form-field">

            <label htmlFor="confirmPassword">
              Xác nhận mật khẩu mới
            </label>

            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              maxLength={100}
              value={formData.confirmPassword}
              onChange={handleChange}
              aria-invalid={Boolean(errors.confirmPassword)}
            />

            {errors.confirmPassword && (
              <small
                className="password-error"
                role="alert"
              >
                {errors.confirmPassword}
              </small>
            )}

            {formData.confirmPassword &&
              formData.newPassword ===
                formData.confirmPassword && (
                <small className="password-match">
                  ✓ Mật khẩu xác nhận trùng khớp
                </small>
              )}

          </div>

          {/* HIỆN / ẨN MẬT KHẨU */}
          <div className="show-password-option">

            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(event) =>
                setShowPassword(event.target.checked)
              }
            />

            <label htmlFor="showPassword">
              Hiển thị mật khẩu
            </label>

          </div>

          {/* LƯU Ý BẢO MẬT */}
          <div className="password-security-note">
            🔒 Không chia sẻ mật khẩu của bạn với
            bất kỳ ai.
          </div>

          {/* NÚT CẬP NHẬT */}
          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
          </button>

          <button
            type="button"
            className="password-reset-button"
            onClick={handleReset}
          >
            Nhập lại
          </button>

          <Link
            to="/profile"
            className="back-profile-link"
          >
            ← Quay lại hồ sơ
          </Link>

        </form>

      </div>

    </div>
  );
}

export default ChangePassword;
