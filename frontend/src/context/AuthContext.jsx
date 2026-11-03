import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { getApiError } from "../lib/api.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "token";
const LEGACY_KEY = "hostelos.accessToken";

function currentToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const applySession = useCallback((token, nextUser, nextStudent = null) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_KEY, token);
    setUser(nextUser);
    setStudent(nextStudent);
    setError("");
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = currentToken();
    if (!token) {
      setUser(null);
      setStudent(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setStudent(data.student || null);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_KEY);
      setUser(null);
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (email, password) => {
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      applySession(data.token, data.user);
      setSuccess("Signed in successfully.");
      return data;
    } catch (reason) {
      const message = getApiError(reason, "Unable to sign in.");
      setError(message);
      throw reason;
    }
  }, [applySession]);

  const register = useCallback(async (details) => {
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/auth/register", details);
      applySession(data.token, data.user, data.student || null);
      setSuccess("Account created successfully.");
      return data;
    } catch (reason) {
      const message = getApiError(reason, "Unable to register.");
      setError(message);
      throw reason;
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout").catch(() => null);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setStudent(null);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        loading,
        error,
        success,
        login,
        register,
        logout,
        refreshProfile,
        clearMessages,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;

