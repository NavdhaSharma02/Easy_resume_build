export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

export const apiUrl = (path: string) => `${API_URL}${path}`;
