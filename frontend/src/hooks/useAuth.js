/**
 * useAuth — global authentication state hook
 * Reads/writes localStorage; exposes login, register, logout helpers.
 */

import { useState, useCallback } from "react";
import { authAPI } from "../api";

export function useAuth() {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem("fraudguard_user")); }
        catch { return null; }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const _saveTokens = (data) => {
        localStorage.setItem("fraudguard_access", data.access_token);
        localStorage.setItem("fraudguard_refresh", data.refresh_token);
        localStorage.setItem("fraudguard_user", JSON.stringify(data.user));
        setUser(data.user);
    };

    const login = useCallback(async (email, password) => {
        setLoading(true); setError("");
        try {
            const { data } = await authAPI.login(email, password);
            _saveTokens(data);
            return { ok: true };
        } catch (e) {
            const msg = e.response?.data?.error ||
                "Login failed. Please try again.";
            setError(msg);
            return { ok: false, error: msg };
        } finally { setLoading(false); }
    }, []);

    const register = useCallback(async (name, email, password) => {
        setLoading(true); setError("");
        try {
            const { data } = await authAPI.register(name, email, password);
            _saveTokens(data);
            return { ok: true };
        } catch (e) {
            const msg = e.response?.data?.error || "Registration failed. Please try again.";
            setError(msg);
            return { ok: false, error: msg };
        } finally { setLoading(false); }
    }, []);

    const logout = useCallback(() => {
        authAPI.logout();
        setUser(null);
    }, []);

    return { user, loading, error, setError, login, register, logout };
}