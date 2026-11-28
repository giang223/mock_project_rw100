import { apiDelete, apiGet, apiPost, apiPut, pageParams, toFormData } from "./apiResponse";

export const getFeed = (options = {}) => apiGet("/posts/feed", { params: pageParams(options) });
export const getSavedPosts = (options = {}) => apiGet("/posts/saved", { params: pageParams(options) });
export const getPostsByHashtag = (hashtag, options = {}) =>
  apiGet(`/posts/hashtags/${encodeURIComponent(hashtag)}`, { params: pageParams(options) });
export const createPost = (payload) => apiPost("/posts", payload);
export const createPostWithMedia = ({ content, feeling, visibility, files }) =>
  apiPost("/posts/media", toFormData({ content, feeling, visibility, files }));
export const updatePost = (postId, payload) => apiPut(`/posts/${postId}`, payload);
export const deletePost = (postId) => apiDelete(`/posts/${postId}`);
export const setReaction = (postId, reactionType) => apiPut(`/posts/${postId}/reaction`, { reactionType });
export const removeReaction = (postId) => apiDelete(`/posts/${postId}/reaction`);
export const toggleSave = (postId) => apiPost(`/posts/${postId}/save`);
export const sharePost = (postId, content = "") => apiPost(`/posts/${postId}/share`, { content });
export const reportPost = (postId, reason) => apiPost(`/posts/${postId}/report`, { reason });
export const getPostLikes = (postId, options = {}) => apiGet(`/posts/${postId}/likes`, { params: pageParams(options) });

export const getComments = (postId, options = {}) =>
  apiGet(`/posts/${postId}/comments`, { params: pageParams(options) });
export const getCommentReplies = (postId, commentId, options = {}) =>
  apiGet(`/posts/${postId}/comments/${commentId}/replies`, { params: pageParams(options) });
export const addComment = (postId, content, parentCommentId) =>
  apiPost(`/posts/${postId}/comments`, { content, ...(parentCommentId ? { parentCommentId } : {}) });
export const updateComment = (postId, commentId, content) =>
  apiPut(`/posts/${postId}/comments/${commentId}`, { content });
export const deleteComment = (postId, commentId) => apiDelete(`/posts/${postId}/comments/${commentId}`);
export const reportComment = (postId, commentId, reason) =>
  apiPost(`/posts/${postId}/comments/${commentId}/report`, { reason });
