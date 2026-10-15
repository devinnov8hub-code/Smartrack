import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../services/api";
import { ApiError, tokenStore } from "../services/client";
import type { Role, User } from "../types";

const UserContext = createContext<{
  role: Role | null;
  setRole: (role: Role | null) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  /** True while the stored session is being restored on first load. */
  loading: boolean;
}>({
  role: null,
  setRole: () => {},
  user: null,
  setUser: () => {},
  loading: false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  // Restores the session after a page reload.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .getCurrentUser()
      .then((current) => {
        setUser(current);
        setRole(current.role);
      })
      .catch((error) => {
        // Only an invalid/expired token signs the user out; a network blip doesn't.
        if (error instanceof ApiError && error.status === 401) tokenStore.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  return createElement(
    UserContext.Provider,
    {
      value: { role, setRole, user, setUser, loading },
    },
    children,
  );
}

export function useUserContext() {
  return useContext(UserContext);
}

export default UserContext;
