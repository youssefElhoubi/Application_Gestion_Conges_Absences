'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'ADMIN' | 'HR_MANAGER' | 'SUPERVISOR' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
  siteId?: number | null;
  managedEmployeeIds?: string[];
  fullName?: string;
  jobTitle?: string;
  department?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Concurrency guard: prevents race conditions across simultaneous refresh requests
  const activeRefreshPromiseRef = React.useRef<Promise<boolean> | null>(null);
  // Infinite loop protection: blocks continuous refresh retries on hard auth failures
  const hasFailedRefreshRef = React.useRef(false);

  /**
   * Refreshes the session using the HttpOnly refresh token cookie.
   * Concurrency-safe: returns existing ongoing promise if already in flight.
   */
  const refreshSession = React.useCallback(async (): Promise<boolean> => {
    if (activeRefreshPromiseRef.current) {
      return activeRefreshPromiseRef.current;
    }

    if (hasFailedRefreshRef.current) {
      return false;
    }

    const refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!res.ok) {
          hasFailedRefreshRef.current = true;
          setUser(null);
          return false;
        }

        const data = await res.json();
        if (data.user) {
          setUser((prev) => ({
            ...prev,
            ...data.user,
          }));
          hasFailedRefreshRef.current = false;
          return true;
        }

        return false;
      } catch {
        hasFailedRefreshRef.current = true;
        setUser(null);
        return false;
      } finally {
        activeRefreshPromiseRef.current = null;
      }
    })();

    activeRefreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  /**
   * Restores session on initial mount or route navigation
   */
  const checkAuth = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Attempt to fetch current user profile
      const res = await fetch('/api/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser({
            ...data.user,
            fullName: data.employee?.fullName,
            jobTitle: data.employee?.jobTitle,
            department: data.employee?.department,
            siteId: data.employee?.siteId,
          });
          hasFailedRefreshRef.current = false;
          return;
        }
      }

      // 2. If access token expired (401), try one silent refresh
      if (res.status === 401 && !hasFailedRefreshRef.current) {
        const refreshed = await refreshSession();
        if (refreshed) {
          // Re-fetch profile with fresh access token
          const retryRes = await fetch('/api/me', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (retryRes.ok) {
            const data = await retryRes.json();
            if (data.user) {
              setUser({
                ...data.user,
                fullName: data.employee?.fullName,
                jobTitle: data.employee?.jobTitle,
                department: data.employee?.department,
                siteId: data.employee?.siteId,
              });
              return;
            }
          }
        }
      }

      // If unauthenticated, clear user
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Submits credentials to POST /api/auth/login
   */
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage =
          data.error || 'Identifiants invalides. Veuillez réessayer.';
        setError(errorMessage);
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }

      hasFailedRefreshRef.current = false;

      // Fetch complete employee details
      const meRes = await fetch('/api/me', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser({
          ...data.user,
          fullName: meData.employee?.fullName,
          jobTitle: meData.employee?.jobTitle,
          department: meData.employee?.department,
          siteId: meData.employee?.siteId,
        });
      } else {
        setUser(data.user);
      }

      setIsLoading(false);
      return { success: true };
    } catch {
      const msg = 'Impossible de contacter le serveur d\'authentification.';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  /**
   * Logs out the user and cleans up state
   */
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // Continue cleanup even if server logout fails
    } finally {
      setUser(null);
      hasFailedRefreshRef.current = false;
      router.push('/login');
    }
  };

  const clearError = () => setError(null);

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      error,
      login,
      logout,
      refreshSession,
      clearError,
    }),
    [user, isLoading, error, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
