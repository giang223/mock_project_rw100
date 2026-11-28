
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { resendVerification, verifyEmail } from "../../api/auth";
import { getApiErrorMessage } from "../../api/http";

// Số chữ số theo hợp đồng xác minh email của BE.
const OTP_LENGTH = 6;
function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  // NHẬN EMAIL TỪ TRANG REGISTER
  const [email, setEmail] = useState(
    location.state?.email || new URLSearchParams(location.search).get("email") || ""
  );

  const [otp, setOtp] = useState(
    Array(OTP_LENGTH).fill("")
  );

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRefs = useRef([]);
  const focusOtpOnMount = useRef(Boolean(email));

  // TỰ ĐỘNG FOCUS Ô ĐẦU TIÊN
  useEffect(() => {
    if (focusOtpOnMount.current) {
      inputRefs.current[0]?.focus();
    }
  }, []);

  // ĐỊNH DẠNG THỜI GIAN
  // XỬ LÝ NHẬP OTP
  const handleChange = (index, value) => {
    const digits = value.replace(/\D/g, "");

    setError("");
    setMessage("");

    if (!digits) {
      setOtp((previous) => {
        const next = [...previous];

        next[index] = "";

        return next;
      });

      return;
    }

    const nextOtp = [...otp];

    const characters = digits
      .slice(0, OTP_LENGTH - index)
      .split("");

    characters.forEach((digit, offset) => {
      nextOtp[index + offset] = digit;
    });

    setOtp(nextOtp);

    const nextIndex = Math.min(
      index + characters.length,
      OTP_LENGTH - 1
    );

    inputRefs.current[nextIndex]?.focus();
  };

  // XỬ LÝ PHÍM BACKSPACE VÀ PHÍM MŨI TÊN
  const handleKeyDown = (index, event) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      event.preventDefault();

      setOtp((previous) => {
        const next = [...previous];

        next[index - 1] = "";

        return next;
      });

      setError("");
      setMessage("");

      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  // XỬ LÝ DÁN MÃ OTP
  const handlePaste = (event, index) => {
    event.preventDefault();

    const pastedValue = event.clipboardData
      .getData("text")
      .replace(/\D/g, "");

    if (!pastedValue) return;

    if (pastedValue.length >= OTP_LENGTH) {
      handleChange(0, pastedValue);
    } else {
      handleChange(index, pastedValue);
    }
  };

  // XÁC THỰC EMAIL
  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email) {
      setError(
        "Không xác định được email cần xác thực."
      );

      return;
    }

    const otpCode = otp.join("");

    if (!/^\d{6}$/.test(otpCode)) {
      setError(
        "Vui lòng nhập đầy đủ 6 chữ số OTP."
      );

      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmail(email.trim(), otpCode);
      navigate("/login", {
        replace: true,
        state: { authMessage: "Email đã được xác minh. Bạn có thể đăng nhập." },
      });
    } catch (verifyError) {
      setError(getApiErrorMessage(verifyError, "Mã xác minh không hợp lệ hoặc đã hết hạn."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // GỬI LẠI MÃ OTP
  const handleResend = async () => {
    if (!email) {
      setError("Không xác định được email.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await resendVerification(email.trim());
      setOtp(Array(OTP_LENGTH).fill(""));
      setMessage("Nếu email cần xác minh, mã mới sẽ được gửi đến hộp thư của bạn.");
      inputRefs.current[0]?.focus();
    } catch (resendError) {
      setError(getApiErrorMessage(resendError, "Không thể gửi lại mã xác minh."));
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

      <div className="auth-card verify-email-card">

        {/* LOGO */}
        <h1 className="logo">MiniSocial</h1>

        {/* BIỂU TƯỢNG */}
        <div className="verify-email-icon">
          ✉️
        </div>

        <h2>Xác thực email</h2>

        {/* MÔ TẢ */}
        <p className="subtitle">
          "Vui lòng nhập mã gồm 6 chữ số đã gửi đến email của bạn."
        </p>

        {/* EMAIL CẦN XÁC THỰC */}
        {location.state?.notice && (
          <div className="verify-info-message" role="status">{location.state.notice}</div>
        )}

        <div className="login-form-group">
          <label htmlFor="verificationEmail">Email cần xác minh</label>
          <input
            id="verificationEmail"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {email && <div className="verify-email-address">{maskEmail(email)}</div>}

            {/* THÔNG BÁO */}
            {message && (
              <div
                className="verify-info-message"
                role="status"
              >
                {message}
              </div>
            )}

            {/* FORM XÁC THỰC */}
            <form onSubmit={handleVerify} noValidate>

              <label className="verify-otp-label">
                Mã xác thực OTP
              </label>

              {/* 6 Ô NHẬP OTP */}
              <div className="otp-input-group">

                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={
                      index === 0
                        ? "one-time-code"
                        : "off"
                    }
                    maxLength={6}
                    value={digit}
                    placeholder="–"
                    aria-label={`Chữ số OTP ${index + 1}`}
                    aria-invalid={Boolean(error)}
                    className={`otp-input ${
                      error ? "otp-input-error" : ""
                    }`}
                    onChange={(event) =>
                      handleChange(
                        index,
                        event.target.value
                      )
                    }
                    onKeyDown={(event) =>
                      handleKeyDown(index, event)
                    }
                    onPaste={(event) =>
                      handlePaste(event, index)
                    }
                    onFocus={(event) =>
                      event.target.select()
                    }
                  />
                ))}

              </div>

              {/* HIỂN THỊ LỖI */}
              {error && (
                <div
                  className="verify-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* THỜI GIAN HẾT HẠN */}
              {/* NÚT XÁC THỰC */}
              <button
                type="submit"
                className="login-button verify-submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang xác minh…" : "Xác thực email"}
              </button>

            </form>

            {/* GỬI LẠI OTP */}
            <div className="verify-resend-section">

              <span>Chưa nhận được mã OTP?</span>

              <button
                type="button"
                className="verify-resend-button"
                onClick={handleResend}
                disabled={isSubmitting || !email.trim()}
              >
                {isSubmitting ? "Đang xử lý…" : "Gửi lại mã OTP"}
              </button>

            </div>

            {/* ĐỔI EMAIL */}
            <Link
              to="/register"
              className="verify-change-email"
            >
              Sử dụng địa chỉ email khác
            </Link>



        {/* QUAY LẠI LOGIN */}
        <div className="auth-footer">

          <Link to="/login">
            ← Quay lại đăng nhập
          </Link>

        </div>

      </div>

    </div>
  );
}

export default VerifyEmail;
