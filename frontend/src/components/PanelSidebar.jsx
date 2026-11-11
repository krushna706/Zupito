import { NavLink } from "react-router-dom";
import { Drawer, IconButton, useMediaQuery } from "@mui/material";

import { getPanelNavigation } from "../config/panelConfig";

function SidebarContent({ navigationItems, isMobile = false, collapsed = false, onClose }) {
    return (
        <>
            {isMobile && (
                <div className="panel-sidebar-mobile-header">
                    <span>Menu</span>

                    <IconButton
                        type="button"
                        className="panel-sidebar-close"
                        aria-label="Close navigation"
                        onClick={onClose}
                    >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </IconButton>
                </div>
            )}

            <nav className="panel-sidebar-nav" aria-label="Panel navigation">
                <p className="panel-nav-label">WORKSPACE</p>

                <ul className="panel-nav-list">
                    {navigationItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                end={item.end}
                                onClick={onClose}
                                tabIndex={collapsed ? -1 : undefined}
                                className={({ isActive }) =>
                                    `panel-nav-link ${isActive ? "is-active" : ""}`
                                }
                            >
                                <span className="panel-nav-icon" aria-hidden="true">
                                    <i className={item.icon} />
                                </span>

                                <span className="panel-nav-text">{item.label}</span>

                                <i
                                    className="fa-solid fa-chevron-right panel-nav-arrow"
                                    aria-hidden="true"
                                />
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </>
    );
}

function PanelSidebar({ user, isMobile, mobileOpen, collapsed, onClose }) {
    const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
    const navigationItems = getPanelNavigation(user?.role);

    if (isMobile) {
        return (
            <Drawer
                anchor="left"
                open={mobileOpen}
                onClose={onClose}
                transitionDuration={reduceMotion ? 0 : { enter: 280, exit: 240 }}
                slotProps={{
                    paper: {
                        id: "panel-sidebar",
                        className: "panel-sidebar panel-sidebar-drawer",
                        "aria-label": "Panel navigation",
                    },
                }}
            >
                <SidebarContent navigationItems={navigationItems} isMobile onClose={onClose} />
            </Drawer>
        );
    }

    return (
        <aside
            id="panel-sidebar"
            className={`panel-sidebar panel-sidebar-desktop ${collapsed ? "is-collapsed" : ""}`}
            aria-label="Panel navigation"
            aria-hidden={collapsed ? "true" : undefined}
        >
            <SidebarContent navigationItems={navigationItems} collapsed={collapsed} />
        </aside>
    );
}

export default PanelSidebar;
