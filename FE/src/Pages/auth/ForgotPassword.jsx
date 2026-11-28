
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../api/auth";
import { getApiErrorMessage } from "../../api/http";

const RESEND_DURATION = 60;

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);

  // THỜI GIAN CHỜ GỬI LẠI
  const resendTime = Math.max(
    0,
    Math.ceil((resendAt - now) / 1000)
  );

  // ĐẾM NGƯỢC THỜI GIAN
  useEffect(() => {
    if (!resendAt) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [resendAt]);

 // ĐÓNG POPUP BẰNG PHÍM ESC
useEffect(() => {
  if (!success) return;

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setSuccess(false);
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [success]);

  // KIỂM TRA EMAIL
  const validateEmail = () => {
    const value = email.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
      setError("Vui lòng nhập địa chỉ email.");
      return false;
    }

    if (!emailRegex.test(value)) {
      setError("Địa chỉ email không hợp lệ.");
      return false;
    }

    if (value.length > 254) {
      setError("Địa chỉ email quá dài.");
      return false;
    }

    setError("");

    return true;
  };

  // XỬ LÝ NHẬP EMAIL
  const handleChange = (event) => {
    setEmail(event.target.value);
    setError("");
  };

  // GỬI YÊU CẦU ĐẶT LẠI MẬT KHẨU
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!validateEmail()) return;

    if (Date.now() < resendAt) return;

    const currentTime = Date.now();
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setRequestedEmail(email.trim());
      setNow(currentTime);
      setResendAt(currentTime + RESEND_DURATION * 1000);
      setSuccess(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể gửi yêu cầu. Vui lòng thử lại."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // CHE MỘT PHẦN EMAIL
const maskEmail = (value) => {
  if (!value.includes("@")) return value;

  const [name, domain] = value.split("@");

  return `${name.slice(0, 2)}***@${domain}`;
};

  return (
    <div className="auth-container">

      <div className="auth-card forgot-card">

        {/* LOGO */}
        <h1 className="logo">
          MiniSocial
        </h1>

        {/* BIỂU TƯỢNG */}
        <div className="forgot-icon">
          ✉️
        </div>

        <h2>Quên mật khẩu?</h2>

        <p className="subtitle">
          Đừng lo lắng! Hãy nhập địa chỉ email
          đã đăng ký để đặt lại mật khẩu.
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} noValidate>

          <div className="forgot-form-group">

            <label htmlFor="forgotEmail">
              Email
              <span className="forgot-required">
                {" "}*
              </span>
            </label>

            <input
              id="forgotEmail"
              type="email"
              name="email"
              placeholder="Nhập địa chỉ email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={handleChange}
              className={
                error ? "forgot-input-error" : ""
              }
              aria-invalid={Boolean(error)}
            />

            {error && (
              <p
                className="forgot-error-message"
                role="alert"
              >
                {error}
              </p>
            )}

          </div>

          {/* GỬI YÊU CẦU */}
          <button
            type="submit"
            className="login-button forgot-submit-button"
            disabled={resendTime > 0 || isSubmitting}
          >
            {isSubmitting
              ? "Đang gửi…"
              : resendTime > 0
              ? `Gửi lại sau ${resendTime}s`
              : "Gửi liên kết đặt lại mật khẩu"}
          </button>

        </form>

        {/* MỞ LẠI THÔNG BÁO */}
        {requestedEmail && (
          <button
            type="button"
            className="forgot-view-result"
            onClick={() => setSuccess(true)}
          >
            Xem lại hướng dẫn
          </button>
        )}

        {/* QUAY LẠI LOGIN */}
        <div className="auth-footer">

          <Link to="/login">
            ← Quay lại đăng nhập
          </Link>

        </div>

      </div>

      {/* POPUP THÔNG BÁO */}
      {success && (
        <div
          className="forgot-modal-overlay"
          onClick={() => setSuccess(false)}
        >

          <div
            className="forgot-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgotModalTitle"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* NÚT ĐÓNG */}
            <button
              type="button"
              className="forgot-modal-close"
              aria-label="Đóng thông báo"
              onClick={() => setSuccess(false)}
              autoFocus
            >
              ×
            </button>

            {/* BIỂU TƯỢNG */}
            <div className="forgot-success-icon">
              ✓
            </div>

            <h2 id="forgotModalTitle">
              Yêu cầu hợp lệ!
            </h2>

            <p>
              Địa chỉ email bạn vừa nhập:
            </p>

            <div className="forgot-email-address">
              {maskEmail(requestedEmail)}
            </div>

            <p>
              Nếu địa chỉ này thuộc tài khoản MiniSocial,
              email hướng dẫn đặt lại mật khẩu sẽ được gửi.
            </p>

            <div className="forgot-modal-note">
              Hãy kiểm tra hộp thư đến và thư rác. Liên kết có thời hạn 1 giờ.
            </div>

            {/* ĐÓNG POPUP */}
            <button
              type="button"
              className="forgot-modal-secondary"
              onClick={() => setSuccess(false)}
            >
              Đóng
            </button>

            <Link
              to="/login"
              className="forgot-modal-login"
            >
              Quay lại đăng nhập
            </Link>

          </div>

        </div>
      )}

    </div>
  );
}

export default ForgotPassword;
