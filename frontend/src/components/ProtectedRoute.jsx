import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AccessDenied from "./AccessDenied";

export default function ProtectedRoute({ allowedRoles, children }) {
    const { user } = useAuth();
    const location = useLocation();
    if (!user) {
        return (
            <Navigate
                to="/manage"
                replace
                state={{ returnTo: location.pathname + location.search + location.hash }}
            />
        );
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) return <AccessDenied />;
    return children || <Outlet />;
}
