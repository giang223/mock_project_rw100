import { http } from "./http";

/** Unwraps the Spring ApiResponse envelope while preserving 204 responses. */
export async function requestData(request) {
  const response = await request;
  const body = response?.data;

  if (body?.success === false) {
    const error = new Error(body.message || "Yêu cầu không thành công.");
    error.apiResponse = body;
    throw error;
  }

  return body?.data;
}

/** Spring Data Page uses `content`, `number`, `size` and `totalPages`. */
export function pageContent(page) {
  if (Array.isArray(page)) return page;
  return Array.isArray(page?.content) ? page.content : [];
}

export function pageParams({ page = 0, size = 20, sort } = {}) {
  return { page, size, ...(sort ? { sort } : {}) };
}

export function toFormData(values) {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value == null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => form.append(key, item));
    } else {
      form.append(key, value);
    }
  });
  return form;
}

export const apiGet = (url, config) => requestData(http.get(url, config));
export const apiPost = (url, data, config) => requestData(http.post(url, data, config));
export const apiPut = (url, data, config) => requestData(http.put(url, data, config));
export const apiDelete = (url, config) => requestData(http.delete(url, config));
