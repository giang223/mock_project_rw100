import { apiDelete, apiGet, apiPost, pageParams, toFormData } from "./apiResponse";

export const getStories = (options = {}) => apiGet("/stories", { params: pageParams(options) });
export const getUserStories = (authorId, options = {}) =>
  apiGet("/stories", { params: { authorId, ...pageParams(options) } });
export const createStory = (payload) => apiPost("/stories", payload);
export const createStoryWithMedia = ({ content, visibility, file, mediaType }) =>
  apiPost("/stories", toFormData({ content, visibility, file, mediaType }));
export const recordStoryView = (storyId) => apiPost(`/stories/${storyId}/view`);
export const getStoryViewers = (storyId, options = {}) =>
  apiGet(`/stories/${storyId}/views`, { params: pageParams(options) });
export const deleteStory = (storyId) => apiDelete(`/stories/${storyId}`);
