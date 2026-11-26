
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

// CẤU HÌNH DEMO
const OTP_LENGTH = 6;
const OTP_DURATION = 300;
const RESEND_DURATION = 60;

// CHỈ SỬ DỤNG ĐỂ KIỂM THỬ FRONTEND
const DEMO_OTP = "123456";

function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  // NHẬN EMAIL TỪ TRANG REGISTER
  const email = location.state?.email || "";
  const isDemo = location.state?.demo === true;

  const [otp, setOtp] = useState(
    Array(OTP_LENGTH).fill("")
  );

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [expiresAt, setExpiresAt] = useState(
    () => Date.now() + OTP_DURATION * 1000
  );

  const [resendAt, setResendAt] = useState(
    () => Date.now() + RESEND_DURATION * 1000
  );

  const [now, setNow] = useState(Date.now());

  const inputRefs = useRef([]);

  // THỜI GIAN OTP CÒN HIỆU LỰC
  const timeLeft = Math.max(
    0,
    Math.ceil((expiresAt - now) / 1000)
  );

  // THỜI GIAN CHỜ GỬI LẠI
  const resendTime = Math.max(
    0,
    Math.ceil((resendAt - now) / 1000)
  );

  // ĐẾM NGƯỢC THỜI GIAN
  useEffect(() => {
    if (!isDemo || !email) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [isDemo, email]);

  // TỰ ĐỘNG FOCUS Ô ĐẦU TIÊN
  useEffect(() => {
    if (email) {
      inputRefs.current[0]?.focus();
    }
  }, [email]);

  // ĐỊNH DẠNG THỜI GIAN
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

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
  const handleVerify = (event) => {
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

    // CHƯA KẾT NỐI BACKEND
    if (!isDemo) {
      setMessage(
        "Chức năng xác thực email đang chờ kết nối Backend."
      );

      return;
    }

    // KIỂM TRA THỜI GIAN HẾT HẠN
    if (Date.now() >= expiresAt) {
      setError(
        "Mã OTP đã hết hạn. Vui lòng gửi lại mã."
      );

      return;
    }

    // KIỂM TRA OTP DEMO
    if (otpCode !== DEMO_OTP) {
      setError(
        "Mã OTP không chính xác. Vui lòng thử lại."
      );

      return;
    }

    alert(
      "Kiểm thử OTP thành công! Email thật chưa được xác thực."
    );

    navigate("/login", {
      replace: true,
    });
  };

  // GỬI LẠI MÃ OTP
  const handleResend = () => {
    if (!email) {
      setError("Không xác định được email.");
      return;
    }

    if (!isDemo) {
      setMessage(
        "Chưa thể gửi OTP vì chưa kết nối Backend."
      );

      return;
    }

    if (Date.now() < resendAt) return;

    const currentTime = Date.now();

    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");

    setNow(currentTime);

    setExpiresAt(
      currentTime + OTP_DURATION * 1000
    );

    setResendAt(
      currentTime + RESEND_DURATION * 1000
    );

    setMessage(
      "Đã đặt lại thời gian OTP demo. Mã kiểm thử vẫn là 123456."
    );

    inputRefs.current[0]?.focus();
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
          {isDemo
            ? "Nhập mã OTP demo gồm 6 chữ số để kiểm thử giao diện."
            : "Vui lòng nhập mã OTP gồm 6 chữ số để xác thực email."}
        </p>

        {/* EMAIL CẦN XÁC THỰC */}
        {email && (
          <div className="verify-email-address">
            {maskEmail(email)}
          </div>
        )}

        {/* KHÔNG CÓ EMAIL */}
        {!email ? (
          <div className="verify-missing-email">

            <p>
              Không tìm thấy email cần xác thực.
              Vui lòng quay lại trang đăng ký.
            </p>

            <Link
              to="/register"
              className="verify-register-link"
            >
              Quay lại đăng ký
            </Link>

          </div>
        ) : (
          <>
            {/* THÔNG BÁO DEMO */}
            {isDemo && (
              <div className="verify-demo-note">

                <strong>Chế độ kiểm thử Frontend</strong>

                <p>
                  Mã OTP demo: <b>{DEMO_OTP}</b>
                </p>

                <small>
                  Không có email thật được gửi.
                </small>

              </div>
            )}

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
              {isDemo && (
                <div className="otp-expiration">

                  {timeLeft > 0 ? (
                    <>
                      Mã OTP hết hạn sau:{" "}

                      <strong>
                        {formatTime(timeLeft)}
                      </strong>
                    </>
                  ) : (
                    <span className="otp-expired">
                      Mã OTP đã hết hạn
                    </span>
                  )}

                </div>
              )}

              {/* NÚT XÁC THỰC */}
              <button
                type="submit"
                className="login-button verify-submit-button"
                disabled={isDemo && timeLeft === 0}
              >
                Xác thực email
              </button>

            </form>

            {/* GỬI LẠI OTP */}
            <div className="verify-resend-section">

              <span>Chưa nhận được mã OTP?</span>

              <button
                type="button"
                className="verify-resend-button"
                onClick={handleResend}
                disabled={isDemo && resendTime > 0}
              >
                {isDemo && resendTime > 0
                  ? `Gửi lại mã (${formatTime(resendTime)})`
                  : "Gửi lại mã OTP"}
              </button>

            </div>

            {/* ĐỔI EMAIL */}
            <Link
              to="/register"
              className="verify-change-email"
            >
              Sử dụng địa chỉ email khác
            </Link>

          </>
        )}

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
