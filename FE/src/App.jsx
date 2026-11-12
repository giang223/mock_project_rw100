
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

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

import { Stories, Explore, Messages } from "./Pages/CommunityPages.jsx";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/change-password" element={<ChangePassword />} />

        <Route path="/feed" element={<PostFeed />} />
        <Route path="/saved-posts" element={<SavedPosts />} />

        <Route path="/stories" element={<Stories />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/messages" element={<Messages />} />

        <Route path="/search-users" element={<SearchUsers />} />
        <Route path="/friend-requests" element={<FriendRequests />} />
        <Route path="/friend-suggestions" element={<FriendSuggestions />} />
        <Route path="/blocked-users" element={<BlockedUsers />} />

        <Route path="/notifications" element={<Notifications />} />
        <Route path="/admin/reports" element={<Reports />} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
