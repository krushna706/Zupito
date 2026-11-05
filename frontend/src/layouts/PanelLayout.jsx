import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useMediaQuery } from "@mui/material";
import { toast } from "react-toastify";

import PanelHeader from "../components/PanelHeader";
import PanelSidebar from "../components/PanelSidebar";
import { useAuth } from "../context/AuthContext";

import "../css/panel.css";

function PanelLayout() {
    const { user: panelUser, logout: onLogout } = useAuth();
    const navigate = useNavigate();
    const isMobile = useMediaQuery("(max-width: 991.98px)");

    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileOpen((previous) => !previous);
            return;
        }

        setSidebarCollapsed((previous) => !previous);
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;

        if (!onLogout) {
            toast.info("Logout will work after authentication is connected.");
            return;
        }

        try {
            setIsLoggingOut(true);
            await onLogout();
            toast.success("Logged out successfully");
            navigate("/", { replace: true });
        } catch {
            toast.error("Unable to log out. Please try again.");
        } finally {
            setIsLoggingOut(false);
        }
    };

    const accountKey = `${panelUser?._id || panelUser?.id || "preview"}-${panelUser?.role || ""}`;

    return (
        <div className={`panel-layout ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
            <PanelHeader
                user={panelUser}
                isSidebarOpen={isMobile ? mobileOpen : !sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
            />

            <div className="panel-body">
                <PanelSidebar
                    user={panelUser}
                    isMobile={isMobile}
                    mobileOpen={mobileOpen}
                    collapsed={sidebarCollapsed}
                    onClose={() => setMobileOpen(false)}
                />

                <main className="panel-main" key={accountKey}>
                    <Outlet context={{ user: panelUser }} />
                </main>
            </div>
        </div>
    );
}

export default PanelLayout;
