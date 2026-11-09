
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function VerifyEmail() {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const handleVerify = (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      alert("Vui lòng nhập đủ 6 chữ số OTP!");
      return;
    }

    alert("Xác thực email thành công! (Demo)");
    navigate("/login");
  };

  const handleResend = () => {
    setOtp("");
    alert("Mã OTP mới đã được gửi! (Demo)");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="logo">MiniSocial</h1>

        <h2>Xác thực email</h2>

        <p className="subtitle">
          Vui lòng nhập mã OTP gồm 6 chữ số được gửi đến email của bạn.
        </p>

        <form onSubmit={handleVerify}>
          <label>Mã xác thực OTP</label>

          <input
            type="text"
            placeholder="Nhập mã OTP"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            maxLength={6}
            inputMode="numeric"
            required
          />

          <button type="submit" className="login-button">
            Xác thực email
          </button>
        </form>

        <div className="forgot-link">
          Chưa nhận được mã OTP?{" "}
          <button
            type="button"
            onClick={handleResend}
            className="resend-button"
          >
            Gửi lại mã
          </button>
        </div>

        <div className="auth-footer">
          <Link to="/login">Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
