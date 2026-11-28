import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth";

function OAuthCallback() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const result = params.get("login");
    const failed = params.get("error");
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

    if (result === "success") {
      refreshSession()
        .then(() => navigate("/feed", { replace: true }))
        .catch(() => {
          navigate("/login", {
            replace: true,
            state: { authMessage: "Không thể tạo phiên đăng nhập. Vui lòng thử lại." },
          });
        });
      return;
    }

    if (result === "verification_required") {
      navigate("/verify-email", {
        replace: true,
        state: { notice: "Tài khoản cần xác minh email. Hãy nhập email để nhận mã xác minh." },
      });
      return;
    }

    if (failed) {
      navigate("/login", {
        replace: true,
        state: { authMessage: "Đăng nhập qua nhà cung cấp thất bại. Vui lòng thử lại." },
      });
      return;
    }

    const timer = window.setTimeout(() => navigate("/login", { replace: true }), 1800);
    return () => window.clearTimeout(timer);
  }, [navigate, refreshSession]);

  return <div className="auth-container"><div className="auth-card" role="status">Đang hoàn tất đăng nhập…</div></div>;
}

export default OAuthCallback;
