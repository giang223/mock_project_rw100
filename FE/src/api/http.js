import axios from "axios";
import { getSession, setSession } from "./sessionStore";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"
).replace(/\/$/, "");

const cookieClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

let refreshPromise = null;

function unwrap(response) {
  const body = response.data;
  if (body?.success === false) {
    throw new Error(body.message || "Yêu cầu không thành công.");
  }
  return body?.data;
}

export function refreshSessionRequest() {
  if (!refreshPromise) {
    refreshPromise = cookieClient
      .post("/auth/refresh")
      .then(unwrap)
      .then((data) => {
        if (!data?.accessToken || !data?.user) {
          throw new Error("Phiên đăng nhập không hợp lệ.");
        }
        const session = { accessToken: data.accessToken, user: data.user };
        setSession(session);
        return session;
      })
      .catch((error) => {
        setSession(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

http.interceptors.request.use((config) => {
  const accessToken = getSession()?.accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
    config.__usedAccessToken = true;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const isAuthEndpoint = /\/auth\//.test(request?.url || "");
    if (
      error.response?.status !== 401 ||
      !request?.__usedAccessToken ||
      request.__retriedAfterRefresh ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    request.__retriedAfterRefresh = true;
    try {
      const session = await refreshSessionRequest();
      request.headers.Authorization = `Bearer ${session.accessToken}`;
      return http(request);
    } catch {
      setSession(null);
      return Promise.reject(error);
    }
  },
);

export function getApiErrorMessage(error, fallback = "Đã xảy ra lỗi. Vui lòng thử lại.") {
  const body = error?.response?.data;
  if (body?.message && body.message !== "Validation failed") {
    return body.message;
  }
  if (body?.data && typeof body.data === "object") {
    const messages = Object.values(body.data).filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  if (!error?.response) {
    return "Không kết nối được Backend. Hãy kiểm tra API đang chạy và VITE_API_BASE_URL.";
  }
  return fallback;
}
