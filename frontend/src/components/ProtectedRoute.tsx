import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserContext } from "../lib/context";
import type { Role } from "../types";

/** Only renders its children for a signed-in user of the given role. */
export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
    const { user, loading } = useUserContext();

    if (loading) return null;
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    // An admin opening a rider page (or the reverse) is sent to their own home.
    if (user.role !== role) {
        return <Navigate to={`/${user.role}`} replace />;
    }

    return children;
}
