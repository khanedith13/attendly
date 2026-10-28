import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/ApiError";
import * as authService from "../services/authService";
import { AuthContext } from "./AuthContext";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, restore the session (if any) from storage.
  useEffect(() => {
    authService
      .getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials, expectedRole) => {
    const { user: loggedIn } = await authService.login(credentials);

    // The role tab on the login screen must match the real account role.
    if (expectedRole && loggedIn.role !== expectedRole) {
      await authService.logout();
      throw new ApiError(
        `This is a ${loggedIn.role} account. Select the ${loggedIn.role} tab.`,
        403,
      );
    }

    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback((data) => authService.register(data), []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
