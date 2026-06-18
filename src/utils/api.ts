export const API_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "");

export const apiUrl = (path: string) => `${API_URL}${path}`;

export const tokenStorageKey = "easy_resume_token";
export const userStorageKey = "easy_resume_user";

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(tokenStorageKey);
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
