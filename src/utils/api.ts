const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL = (configuredApiUrl || (import.meta.env.DEV ? "http://127.0.0.1:4000" : "")).replace(/\/+$/, "");

export const apiUrl = (path: string) => {
  if (!API_URL) {
    throw new Error("VITE_API_URL must be set to the deployed backend URL for production.");
  }
  return `${API_URL}${path}`;
};

export const tokenStorageKey = "easy_resume_token";
export const userStorageKey = "easy_resume_user";

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(tokenStorageKey);
  const isFormData = options.body instanceof FormData;
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// Specific helper for PDF export — returns pdf blob + optional one-page warning
export async function exportPdfRequest(path: string): Promise<{ blob: Blob; warning?: string }> {
  const token = localStorage.getItem(tokenStorageKey);
  const response = await fetch(apiUrl(path), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Export failed" }));
    throw new Error(error.message);
  }

  // Backend signals overflow via a custom header
  const warning = response.headers.get("X-Resume-Warning") ?? undefined;
  const blob = await response.blob();

  return { blob, warning };
}