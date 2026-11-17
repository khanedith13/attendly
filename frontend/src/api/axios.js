import axios from "axios";
import { storage } from "../utils/storage";
import { ApiError } from "./ApiError";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const { token } = storage.getSession();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data ?? {};

    // Expired or revoked token: clear the session and return to login.
    if (status === 401 && storage.getSession().token) {
      storage.clearSession();
      window.location.assign("/login");
    }

    return Promise.reject(
      new ApiError(
        body.message ?? "Could not reach the server. Try again.",
        status,
        body.errors ?? {},
      ),
    );
  },
);

export default api;