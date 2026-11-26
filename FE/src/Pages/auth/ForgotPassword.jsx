
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const RESEND_DURATION = 60;

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState("");

  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());

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
  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");

    if (!validateEmail()) return;

    if (Date.now() < resendAt) return;

    /*
      TODO: KẾT NỐI API FORGOT PASSWORD

      1. Gửi email đến Backend.
      2. Backend kiểm tra yêu cầu.
      3. Tạo reset token có thời hạn.
      4. Gửi liên kết đặt lại mật khẩu.
      5. Trả về thông báo chung để tránh
         tiết lộ email có tồn tại hay không.
    */

    // HIỆN TẠI CHỈ KIỂM THỬ FRONTEND
    const currentTime = Date.now();

    setRequestedEmail(email.trim());
    setNow(currentTime);

    setResendAt(
  currentTime + RESEND_DURATION * 1000
);

    setSuccess(true);
  };

  // TRẢI NGHIỆM RESET PASSWORD
  const handleDemoReset = () => {
    if (!requestedEmail) return;

    setSuccess(false);

    navigate("/reset-password", {
      state: {
        email: requestedEmail,
        demo: true,
      },
    });
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

        {/* THÔNG BÁO DEMO */}
        <div className="forgot-demo-note">
          Chế độ kiểm thử Frontend.
          Chưa hỗ trợ gửi email thật.
        </div>

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
            disabled={resendTime > 0}
          >
            {resendTime > 0
              ? `Gửi lại sau ${resendTime}s`
              : "Gửi liên kết đặt lại mật khẩu"}
          </button>

        </form>

        {/* MỞ LẠI KẾT QUẢ DEMO */}
        {requestedEmail && (
          <button
            type="button"
            className="forgot-view-result"
            onClick={() => setSuccess(true)}
          >
            Xem lại yêu cầu kiểm thử
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
              Khi hệ thống được kết nối Backend,
              nếu email tồn tại trong hệ thống,
              bạn sẽ nhận được hướng dẫn đặt lại
              mật khẩu.
            </p>

            <div className="forgot-modal-note">
              Đây là chế độ demo.
              Chưa có liên kết đặt lại mật khẩu
              nào được gửi đến email.
            </div>

            {/* CHUYỂN ĐẾN RESET PASSWORD */}
            <button
              type="button"
              className="login-button"
              onClick={handleDemoReset}
            >
              Trải nghiệm đặt lại mật khẩu
            </button>

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
