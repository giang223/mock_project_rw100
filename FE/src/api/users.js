import { apiDelete, apiGet, apiPost, apiPut, pageParams, toFormData } from "./apiResponse";

export const getMyProfile = () => apiGet("/users/me");
export const updateMyProfile = (payload) => apiPut("/users/me", payload);
export const uploadAvatar = (file) =>
  apiPost("/users/me/avatar", toFormData({ file }));
export const uploadCover = (file) =>
  apiPost("/users/me/cover", toFormData({ file }));
export const searchUsers = (q, options = {}) =>
  apiGet("/users/search", { params: { q, ...pageParams(options) } });
export const getBlockedUsers = (options = {}) =>
  apiGet("/users/block", { params: pageParams(options) });
export const blockUser = (userId) => apiPost(`/users/block/${userId}`);
export const unblockUser = (userId) => apiDelete(`/users/block/${userId}`);
export const getPublicProfile = (userId) => apiGet(`/users/${userId}`);
export const getUserPosts = (userId, options = {}) =>
  apiGet(`/users/${userId}/posts`, { params: pageParams(options) });
export const deactivateMyAccount = (currentPassword) =>
  apiPost("/users/me/deactivate", { currentPassword });
