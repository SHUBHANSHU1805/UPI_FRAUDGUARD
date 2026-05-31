/**
 * api.js — Axios instance with JWT auth + auto-refresh interceptors
 *
 * Tokens are stored in localStorage:
 *   fraudguard_access   → short-lived access token  (1 hour)
 *   fraudguard_refresh  → long-lived refresh token  (7 days)
 */

import axios from "axios";

const BASE_URL = "/api";  // Vite proxies /api → http://localhost:5000/api

export const api = axios.create({
    baseURL: BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// ── Attach access token to every request ─────────────────────────────────────
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("fraudguard_access");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── On 401 → try refresh token once, then logout ─────────────────────────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        // Only intercept 401s; skip the /refresh endpoint itself to avoid loops
        if (error.response?.status === 401 && !original._retry
            && !original.url?.includes("/auth/refresh")) {

            if (isRefreshing) {
                // Queue concurrent requests while refreshing
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token) => {
                            original.headers.Authorization = `Bearer ${token}`;
                            resolve(api(original));
                        },
                        reject,
                    });
                });
            }

            original._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem("fraudguard_refresh");
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
                    headers: { Authorization: `Bearer ${refreshToken}` },
                });

                const newToken = data.access_token;
                localStorage.setItem("fraudguard_access", newToken);
                api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
                processQueue(null, newToken);
                original.headers.Authorization = `Bearer ${newToken}`;
                return api(original);

            } catch (refreshErr) {
                processQueue(refreshErr, null);
                // Refresh failed → force logout
                localStorage.removeItem("fraudguard_access");
                localStorage.removeItem("fraudguard_refresh");
                localStorage.removeItem("fraudguard_user");
                window.location.href = "/login";
                return Promise.reject(refreshErr);

            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const authAPI = {
    register: (name, email, password) =>
        api.post("/auth/register", { name, email, password }),

    login: (email, password) =>
        api.post("/auth/login", { email, password }),

    logout: () => {
        api.post("/auth/logout").catch(() => { });
        localStorage.removeItem("fraudguard_access");
        localStorage.removeItem("fraudguard_refresh");
        localStorage.removeItem("fraudguard_user");
    },

    me: () => api.get("/auth/me"),
};

// ── Predict helpers ───────────────────────────────────────────────────────────
export const predictAPI = {
    single: (txn) => api.post("/predict", txn),
    batch: (txns) => api.post("/predict/batch", { transactions: txns }),
    info: () => api.get("/model/info"),
    health: () => api.get("/health"),
};