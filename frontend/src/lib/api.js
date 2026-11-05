import axios from "axios";

export function getBaseURL() {
  let rawUrl = "";
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("hostel360_api_url");
    if (override && override.trim()) {
      rawUrl = override.trim();
    }
  }
  if (!rawUrl) {
    rawUrl = (import.meta.env.VITE_API_BASE_URL || "https://hostel360-api-tkjp.onrender.com/api").trim();
  }

  let url = rawUrl.replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url += "/api";
  }
  return url;
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  config.baseURL = getBaseURL();
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes("/auth/login")) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/admin-login" && window.location.pathname !== "/admin-portal") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function getApiError(error, fallback = "An unexpected error occurred.") {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) return error.response.data.error;
    if (error.response?.data?.message) return error.response.data.message;
    if (error.code === "ERR_NETWORK") {
      return "Unable to reach backend server. If using Render free tier, the server may take ~30–45s to wake up from idle sleep. Please retry in a moment.";
    }
    if (error.response?.status === 404) {
      if (typeof error.response?.data === "string" && error.response.data.includes("Cannot ")) {
        return error.response.data.replace(/<[^>]*>/g, "").trim();
      }
      return "Requested API endpoint not found (404).";
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export default api;
