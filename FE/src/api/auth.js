import { http, refreshSessionRequest } from "./http";
import { setSession } from "./sessionStore";
import { logoutMockAccount } from "../utils/mockAccounts";

function unwrap(response) {
  const body = response.data;
  if (body?.success === false) {
    throw new Error(body.message || "Yêu cầu không thành công.");
  }
  return body?.data;
}

export async function login(credentials) {
  const data = unwrap(await http.post("/auth/login", credentials));
  if (!data?.accessToken || !data?.user) {
    throw new Error("Backend trả về dữ liệu đăng nhập không hợp lệ.");
  }
  const session = { accessToken: data.accessToken, user: data.user };
  logoutMockAccount();
  setSession(session);
  return session;
}

export async function refreshSession() {
  return refreshSessionRequest();
}

export async function logout() {
  try {
    unwrap(await http.post("/auth/logout"));
  } finally {
    logoutMockAccount();
    setSession(null);
  }
}

export async function register(payload) {
  return unwrap(await http.post("/auth/register", payload));
}

export async function verifyEmail(email, code) {
  return unwrap(await http.post("/auth/verify-email", { email, code }));
}

export async function resendVerification(email) {
  return unwrap(await http.post("/auth/verify-email/resend", { email }));
}

export async function requestPasswordReset(email) {
  return unwrap(await http.post("/auth/forgot-password", { email }));
}

export async function resetPassword(payload) {
  return unwrap(await http.post("/auth/reset-password", payload));
}

export async function changePassword(payload) {
  return unwrap(await http.put("/users/me/password", payload));
}
