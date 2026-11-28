import { apiDelete, apiGet, apiPut, pageParams } from "./apiResponse";

export const getAdminDashboard = (params = {}) => apiGet("/admin/dashboard", { params });
export const getAdminUsers = (params = {}) => apiGet("/admin/users", { params: pageParams(params) });
export const getAdminAuditLogs = (params = {}) => apiGet("/admin/audit-logs", { params: pageParams(params) });
export const getReports = (params = {}) => apiGet("/admin/reports", { params: pageParams(params) });
export const assignReport = (reportId, assigneeAdminId) =>
  apiPut(`/admin/reports/${reportId}/assignment`, { assigneeAdminId });
export const resolveReport = (reportId, note) => apiPut(`/admin/reports/${reportId}/resolve`, note ? { note } : undefined);
export const dismissReport = (reportId, note) => apiPut(`/admin/reports/${reportId}/dismiss`, note ? { note } : undefined);
export const deleteReport = (reportId) => apiDelete(`/admin/reports/${reportId}`);
export const deleteReportedPost = (postId) => apiDelete(`/admin/reports/posts/${postId}`);
export const deleteReportedComment = (commentId) => apiDelete(`/admin/reports/comments/${commentId}`);
