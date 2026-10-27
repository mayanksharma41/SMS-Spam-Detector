import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  setCsrfToken,
  updatePreferences,
} from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const refreshUser = useCallback(async () => {
    try {
      const data = await getCurrentUser();
      if (data.authenticated && data.user) {
        setUser(data.user);
        if (data.csrf_token) {
          setCsrfToken(data.csrf_token);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    setAuthError("");
    try {
      const data = await loginUser(email, password);
      setUser(data.user);
      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
      }
      return { ok: true, user: data.user };
    } catch (err) {
      const msg = err.message || "Failed to log in.";
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  };

  const signup = async (email, password, confirmPassword) => {
    setAuthError("");
    try {
      const data = await registerUser(email, password, confirmPassword);
      setUser(data.user);
      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
      }
      return { ok: true, user: data.user };
    } catch (err) {
      const msg = err.message || "Failed to sign up.";
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      setCsrfToken("");
    }
  };

  const toggleHistoryOptIn = async (enabled) => {
    try {
      const res = await updatePreferences(enabled);
      if (res?.user) {
        setUser(res.user);
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        setAuthError,
        login,
        signup,
        logout,
        refreshUser,
        toggleHistoryOptIn,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
