
import { useState } from "react";
import { Link } from "react-router-dom";

function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    alert("Đăng ký thành công! (Demo giao diện)");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="logo">MiniSocial</h1>

        <h2>Tạo tài khoản</h2>
        <p className="subtitle">
          Tham gia và kết nối với mọi người.
        </p>

        <form onSubmit={handleRegister}>
          <label>Họ và tên</label>
          <input
            type="text"
            name="fullName"
            placeholder="Nhập họ và tên"
            value={formData.fullName}
            onChange={handleChange}
            required
          />

          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Nhập địa chỉ email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label>Mật khẩu</label>
          <input
            type="password"
            name="password"
            placeholder="Tạo mật khẩu"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <label>Xác nhận mật khẩu</label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <button type="submit" className="login-button">
            Đăng ký
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản?
          <Link to="/login"> Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
