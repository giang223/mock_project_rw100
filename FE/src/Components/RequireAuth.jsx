import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth";
import { getCurrentAccount } from "../utils/mockAccounts";

const DEMO_AUTH_ENABLED = import.meta.env.VITE_DEMO_AUTH_ENABLED === "true";

function getHomePath(role) {
  return role === "ADMIN" ? "/admin/reports" : role === "USER" ? "/feed" : "/login";
}

function AuthLoading() {
  return (
    <div className="auth-container" role="status" aria-live="polite">
      <div className="auth-card">Đang khôi phục phiên đăng nhập…</div>
    </div>
  );
}

function RequireAuth({ children, adminOnly = false, userOnly = false }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const location = useLocation();
  const demoAccount = DEMO_AUTH_ENABLED ? getCurrentAccount() : null;
  const role = user?.role || demoAccount?.role;
  const authenticated = isAuthenticated || Boolean(demoAccount);

  if (isInitializing && !demoAccount) return <AuthLoading />;
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (adminOnly && role !== "ADMIN") {
    return <Navigate to={getHomePath(role)} replace />;
  }
  if (userOnly && role !== "USER") {
    return <Navigate to={getHomePath(role)} replace />;
  }

  return children || <Outlet />;
}

export function PublicOnly() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const demoAccount = DEMO_AUTH_ENABLED ? getCurrentAccount() : null;
  const role = user?.role || demoAccount?.role;

  if (isInitializing && !demoAccount) return <AuthLoading />;
  if (isAuthenticated || demoAccount) return <Navigate to={getHomePath(role)} replace />;
  return <Outlet />;
}

export function HomeRoute() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const demoAccount = DEMO_AUTH_ENABLED ? getCurrentAccount() : null;
  const role = user?.role || demoAccount?.role;

  if (isInitializing && !demoAccount) return <AuthLoading />;
  return <Navigate to={getHomePath(isAuthenticated || demoAccount ? role : null)} replace />;
}

export default RequireAuth;
