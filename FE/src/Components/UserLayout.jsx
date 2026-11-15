
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

function UserLayout() {
  return (
    <div className="facebook-layout user-layout">
      <Header />

      <div className="user-layout-main">
        <Sidebar />

        <main className="user-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default UserLayout;
