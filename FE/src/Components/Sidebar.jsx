
import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const getMenuClass = ({ isActive }) =>
    `sidebar-menu${isActive ? " active" : ""}`;

  const handleLogout = () => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất không?");
    if (!confirmed) return;

    // Chuyển về trang đăng nhập.
    // Nếu dự án có lưu token, cần xóa đúng tên key token đang sử dụng.
    navigate("/login");
  };

  return (
    <aside className="facebook-sidebar">
      <nav className="sidebar-navigation">
        <NavLink to="/feed" end className={getMenuClass}>
          <span className="sidebar-icon">🏠</span>
          <span>Home</span>
        </NavLink>

        <NavLink to="/explore" className={getMenuClass}>
          <span className="sidebar-icon">🧭</span>
          <span>Explore</span>
        </NavLink>

        <NavLink to="/friend-requests" className={getMenuClass}>
          <span className="sidebar-icon">👥</span>
          <span>Friends</span>
        </NavLink>

        <NavLink to="/messages" className={getMenuClass}>
          <span className="sidebar-icon">💬</span>
          <span>Messages</span>
        </NavLink>

        <NavLink to="/notifications" className={getMenuClass}>
          <span className="sidebar-icon">🔔</span>
          <span>Notifications</span>
        </NavLink>

        <NavLink to="/saved-posts" className={getMenuClass}>
          <span className="sidebar-icon">🔖</span>
          <span>Bookmarks</span>
        </NavLink>

        <NavLink to="/profile" end className={getMenuClass}>
          <span className="sidebar-icon">👤</span>
          <span>Profile</span>
        </NavLink>
      </nav>

      <div className="sidebar-logout-container">
        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <span className="sidebar-icon">🚪</span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
