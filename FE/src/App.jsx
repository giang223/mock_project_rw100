
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import {
  getCurrentAccount,
  isAdmin,
  isUser,
} from "./utils/mockAccounts";

import Login from "./Pages/auth/Login.jsx";
import Register from "./Pages/auth/Register.jsx";
import VerifyEmail from "./Pages/auth/VerifyEmail.jsx";
import ForgotPassword from "./Pages/auth/ForgotPassword.jsx";
import ResetPassword from "./Pages/auth/ResetPassword.jsx";

import Profile from "./Pages/user/Profile.jsx";
import EditProfile from "./Pages/user/EditProfile.jsx";
import ChangePassword from "./Pages/user/ChangePassword.jsx";

import PostFeed from "./Pages/post/PostFeed.jsx";
import SavedPosts from "./Pages/post/SavedPosts";

import SearchUsers from "./Pages/social/SearchUsers";
import FriendRequests from "./Pages/social/FriendRequests";
import FriendSuggestions from "./Pages/social/FriendSuggestions";
import BlockedUsers from "./Pages/social/BlockedUsers";

import Notifications from "./Pages/notification/Notifications";
import Reports from "./Pages/admin/Reports";

import {
  Stories,
  Explore,
  Messages,
} from "./Pages/CommunityPages.jsx";

import UserLayout from "./Components/UserLayout";

import "./App.css";

// ========================================
// LẤY ĐƯỜNG DẪN THEO VAI TRÒ
// ========================================
function getHomePath(account) {
  if (isAdmin(account)) {
    return "/admin/reports";
  }

  if (isUser(account)) {
    return "/feed";
  }

  return "/login";
}

// ========================================
// BẢO VỆ ROUTE YÊU CẦU ĐĂNG NHẬP
// ========================================
function ProtectedRoute() {
  const account = getCurrentAccount();

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// ========================================
// ROUTE DÀNH RIÊNG CHO USER
// ========================================
function UserRoute() {
  const account = getCurrentAccount();

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  if (!isUser(account)) {
    return (
      <Navigate
        to={getHomePath(account)}
        replace
      />
    );
  }

  return <Outlet />;
}

// ========================================
// ROUTE DÀNH RIÊNG CHO ADMIN
// ========================================
function AdminRoute() {
  const account = getCurrentAccount();

  if (!account) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin(account)) {
    return (
      <Navigate
        to={getHomePath(account)}
        replace
      />
    );
  }

  return <Outlet />;
}

// ========================================
// ROUTE DÀNH CHO NGƯỜI CHƯA ĐĂNG NHẬP
// ========================================
function PublicRoute() {
  const account = getCurrentAccount();

  if (account && (isAdmin(account) || isUser(account))) {
    return (
      <Navigate
        to={getHomePath(account)}
        replace
      />
    );
  }

  return <Outlet />;
}

// ========================================
// ĐIỀU HƯỚNG MẶC ĐỊNH
// ========================================
function DefaultRoute() {
  const account = getCurrentAccount();

  return (
    <Navigate
      to={getHomePath(account)}
      replace
    />
  );
}

// ========================================
// APP
// ========================================
function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* TRANG MẶC ĐỊNH */}
        <Route
          path="/"
          element={<DefaultRoute />}
        />

        {/* ==============================
            CÁC TRANG CHƯA ĐĂNG NHẬP
        ============================== */}
        <Route element={<PublicRoute />}>

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/verify-email"
            element={<VerifyEmail />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

        </Route>

        {/* ==============================
            CÁC TRANG YÊU CẦU ĐĂNG NHẬP
        ============================== */}
        <Route element={<ProtectedRoute />}>

          {/* ============================
              KHU VỰC USER
          ============================ */}
          <Route element={<UserRoute />}>

            {/* HEADER VÀ SIDEBAR CHUNG */}
            <Route element={<UserLayout />}>

              {/* TRANG CÁ NHÂN */}
              <Route
                path="/profile"
                element={<Profile />}
              />

              <Route
                path="/profile/edit"
                element={<EditProfile />}
              />

              <Route
                path="/change-password"
                element={<ChangePassword />}
              />

              {/* BÀI VIẾT */}
              <Route
                path="/feed"
                element={<PostFeed />}
              />

              <Route
                path="/saved-posts"
                element={<SavedPosts />}
              />

              {/* TIN VÀ KHÁM PHÁ */}
              <Route
                path="/stories"
                element={<Stories />}
              />

              <Route
                path="/explore"
                element={<Explore />}
              />

              {/* TIN NHẮN */}
              <Route
                path="/messages"
                element={<Messages />}
              />

              {/* BẠN BÈ */}
              <Route
                path="/search-users"
                element={<SearchUsers />}
              />

              <Route
                path="/friend-requests"
                element={<FriendRequests />}
              />

              <Route
                path="/friend-suggestions"
                element={<FriendSuggestions />}
              />

              <Route
                path="/blocked-users"
                element={<BlockedUsers />}
              />

              {/* THÔNG BÁO */}
              <Route
                path="/notifications"
                element={<Notifications />}
              />

            </Route>

          </Route>

          {/* ============================
              KHU VỰC ADMIN
          ============================ */}
          <Route element={<AdminRoute />}>

            <Route
              path="/admin"
              element={
                <Navigate
                  to="/admin/reports"
                  replace
                />
              }
            />

            <Route
              path="/admin/reports"
              element={<Reports />}
            />

          </Route>

        </Route>

        {/* ĐƯỜNG DẪN KHÔNG TỒN TẠI */}
        <Route
          path="*"
          element={<DefaultRoute />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
