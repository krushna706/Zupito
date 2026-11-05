import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Divider, IconButton, Menu, MenuItem } from "@mui/material";

import { appConfig } from "../config/appConfig";
import { getPanelDashboardPath, panelConfig } from "../config/panelConfig";

function getInitials(name) {
    return (
        String(name || "")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase() || "Z"
    );
}

function PanelHeader({ user, isSidebarOpen, onToggleSidebar, onLogout, isLoggingOut }) {
    const [profileAnchor, setProfileAnchor] = useState(null);

    const profileOpen = Boolean(profileAnchor);

    const displayName = user?.name?.trim() || user?.fullName?.trim() || "Zupito Staff";
    const normalizedRole = user?.role === "delivery_agent" ? "delivery" : user?.role;
    const roleLabel = user?.roleLabel || panelConfig[normalizedRole]?.label || "Staff";
    const dashboardPath = getPanelDashboardPath(user?.role);
    const avatarUrl = user?.avatarUrl || user?.profilePicture?.url || "/images/default-avatar.svg";
    const initials = getInitials(displayName);

    const closeProfile = () => {
        setProfileAnchor(null);
    };

    const handleLogout = () => {
        closeProfile();
        onLogout?.();
    };

    return (
        <header className="panel-header">
            <div className="panel-header-left">
                <Link to={dashboardPath} className="panel-brand" aria-label="Go to dashboard">
                    <img src={appConfig.logo} alt={appConfig.name} width="148" height="40" />
                </Link>

                <IconButton
                    type="button"
                    className="panel-menu-toggle"
                    onClick={onToggleSidebar}
                    aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
                    aria-expanded={isSidebarOpen}
                    aria-controls="panel-sidebar"
                >
                    <i className="fa-solid fa-bars-staggered" aria-hidden="true" />
                </IconButton>
            </div>

            <div className="panel-header-right">
                <Button
                    id="panel-profile-button"
                    type="button"
                    className={`panel-profile-button ${profileOpen ? "is-open" : ""}`}
                    onClick={(event) => setProfileAnchor(event.currentTarget)}
                    aria-controls={profileOpen ? "panel-profile-menu" : undefined}
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    aria-label={`Open account menu for ${displayName}`}
                    disableRipple
                >
                    <Avatar src={avatarUrl} alt={displayName} className="panel-avatar">
                        {initials}
                    </Avatar>

                    <span className="panel-profile-copy">
                        <strong>{displayName}</strong>
                        <span>{roleLabel}</span>
                    </span>

                    <i className="fa-solid fa-chevron-down panel-profile-chevron" aria-hidden="true" />
                </Button>

                <Menu
                    id="panel-profile-menu"
                    anchorEl={profileAnchor}
                    open={profileOpen}
                    onClose={closeProfile}
                    anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right"
                    }}
                    transformOrigin={{
                        vertical: "top",
                        horizontal: "right"
                    }}
                    slotProps={{
                        paper: {
                            className: "panel-profile-menu"
                        },
                        list: {
                            "aria-labelledby": "panel-profile-button"
                        }
                    }}
                >
                    <li className="panel-profile-menu-summary" role="none">
                        <Avatar src={avatarUrl} alt={displayName} className="panel-avatar">
                            {initials}
                        </Avatar>

                        <div className="panel-profile-menu-copy">
                            <strong>{displayName}</strong>
                            <span>{roleLabel}</span>
                        </div>
                    </li>

                    <Divider />

                    <MenuItem component={Link} to="/manage/profile" onClick={closeProfile}>
                        <span className="panel-dropdown-icon" aria-hidden="true">
                            <i className="fa-regular fa-user" />
                        </span>

                        <span>My Profile</span>

                        <i className="fa-solid fa-chevron-right panel-dropdown-arrow" aria-hidden="true" />
                    </MenuItem>

                    <MenuItem className="panel-logout-item" onClick={handleLogout} disabled={isLoggingOut}>
                        <span className="panel-dropdown-icon" aria-hidden="true">
                            <i className="fa-solid fa-arrow-right-from-bracket" />
                        </span>

                        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                    </MenuItem>
                </Menu>
            </div>
        </header>
    );
}

export default PanelHeader;
