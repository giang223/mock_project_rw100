import { apiDelete, apiGet, apiPost, apiPut, pageParams } from "./apiResponse";

export const getFriends = (options = {}) =>
  apiGet("/friends", { params: pageParams(options) });
export const getReceivedFriendRequests = (options = {}) =>
  apiGet("/friends/requests/received", { params: pageParams(options) });
export const getSentFriendRequests = (options = {}) =>
  apiGet("/friends/requests/sent", { params: pageParams(options) });
export const getFriendSuggestions = (options = {}) =>
  apiGet("/friends/suggestions", { params: pageParams(options) });
export const sendFriendRequest = (userId) => apiPost(`/friends/request/${userId}`);
export const acceptFriendRequest = (requestId) => apiPut(`/friends/request/${requestId}/accept`);
export const rejectFriendRequest = (requestId) => apiDelete(`/friends/request/${requestId}`);
export const cancelFriendRequest = rejectFriendRequest;
export const unfriend = (friendId) => apiDelete(`/friends/${friendId}`);

export const followUser = (userId) => apiPost(`/users/${userId}/follow`);
export const unfollowUser = (userId) => apiDelete(`/users/${userId}/follow`);
export const getFollowers = (userId, options = {}) =>
  apiGet(`/users/${userId}/followers`, { params: pageParams(options) });
export const getFollowing = (userId, options = {}) =>
  apiGet(`/users/${userId}/following`, { params: pageParams(options) });
export const getFollowRequests = (options = {}) =>
  apiGet("/users/me/follow-requests", { params: pageParams(options) });
export const acceptFollowRequest = (requesterId) => apiPut(`/users/me/follow-requests/${requesterId}`);
export const rejectFollowRequest = (requesterId) => apiDelete(`/users/me/follow-requests/${requesterId}`);
