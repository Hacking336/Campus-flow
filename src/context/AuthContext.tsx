import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, getToken, onUnauthorized, setToken } from "../lib/api";
import type { Student, User } from "../lib/types";

interface AuthPayload {
  token: string;
  user: User;
  student: Student | null;
}

interface AuthContextValue {
  user: User | null;
  student: Student | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (studentNo: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  applyProfile: (payload: { user: User; student: Student | null }) => void;
  applyToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    setUser(null);
    setStudent(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      clear();
      return;
    }
    const payload = await api<{ user: User; student: Student | null }>("/auth/me");
    setUser(payload.user);
    setStudent(payload.student);
  }, [clear]);

  useEffect(() => {
    onUnauthorized(clear);
    let active = true;
    (async () => {
      try {
        await refresh();
      } catch {
        setToken(null);
        if (active) clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      onUnauthorized(null);
    };
  }, [clear, refresh]);

  const login = useCallback(async (identifier: string, password: string) => {
    const payload = await api<AuthPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    setToken(payload.token);
    setUser(payload.user);
    setStudent(payload.student);
    return payload.user;
  }, []);

  const register = useCallback(async (studentNo: string, password: string) => {
    const payload = await api<AuthPayload>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ student_no: studentNo, password }),
    });
    setToken(payload.token);
    setUser(payload.user);
    setStudent(payload.student);
    return payload.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // The token may already be invalid; clear locally either way.
    }
    setToken(null);
    clear();
  }, [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      student,
      loading,
      login,
      register,
      logout,
      refresh,
      applyProfile: ({ user: nextUser, student: nextStudent }) => {
        setUser(nextUser);
        setStudent(nextStudent);
      },
      applyToken: (nextToken: string) => setToken(nextToken),
    }),
    [user, student, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
