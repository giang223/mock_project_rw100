import { apiDelete, apiGet, apiPost, apiPut, pageParams, toFormData } from "./apiResponse";

export const getConversations = (options = {}) =>
  apiGet("/conversations", { params: pageParams(options) });
export const openDirectConversation = (userId) => apiPut(`/conversations/direct/${userId}`);
export const getMessages = (conversationId, options = {}) =>
  apiGet(`/conversations/${conversationId}/messages`, { params: pageParams({ size: 30, ...options }) });
export const sendMessage = (conversationId, content, replyToMessageId) =>
  apiPost(`/conversations/${conversationId}/messages`, { content, ...(replyToMessageId ? { replyToMessageId } : {}) });
export const sendMediaMessage = ({ conversationId, file, mediaType, content, replyToMessageId }) =>
  apiPost(`/conversations/${conversationId}/messages/media`, toFormData({ file, mediaType, content, replyToMessageId }));
export const setMessageReaction = (conversationId, messageId, reactionType) =>
  apiPut(`/conversations/${conversationId}/messages/${messageId}/reaction`, { reactionType });
export const removeMessageReaction = (conversationId, messageId) =>
  apiDelete(`/conversations/${conversationId}/messages/${messageId}/reaction`);
export const markConversationRead = (conversationId) => apiPut(`/conversations/${conversationId}/read`);
export const hideConversation = (conversationId) => apiDelete(`/conversations/${conversationId}`);
export const updateConversationNickname = (conversationId, nickname) =>
  apiPut(`/conversations/${conversationId}/nickname`, { nickname });
