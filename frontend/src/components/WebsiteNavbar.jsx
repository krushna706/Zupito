import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, MenuItem } from "@mui/material";

import ProductSearchBar from "./ProductSearchBar";
import { appConfig } from "../config/appConfig";


// ================== WEBSITE NAVBAR ==================
function WebsiteNavbar({ user = null, cartCount = 0 }) {
    const location = useLocation();

    const [profileAnchor, setProfileAnchor] = useState(null);
    const [profileLocation, setProfileLocation] = useState("");

    const profileOpen = Boolean(profileAnchor) && profileLocation === location.key;
    const isStaff = ["admin", "seller", "delivery"].includes(user?.role);
    const itemCount = Number.isSafeInteger(cartCount) && cartCount > 0 ? cartCount : 0;

    const accountPath = isStaff ? "/manage/dashboard" : "/account/profile";
    const accountLabel = isStaff ? "Dashboard" : "My Account";

    // ================== ACCOUNT MENU ==================
    const openProfile = (event) => {
        setProfileAnchor(event.currentTarget);
        setProfileLocation(location.key);
    };

    const closeProfile = () => {
        setProfileAnchor(null);
    };

    return (
        <header className="website-header">
            <nav
                className="container-fluid website-shell website-nav"
                aria-label="Main navigation"
            >
                {/* Brand */}
                <Link
                    to="/"
                    className="website-brand"
                    aria-label={`${appConfig.name} home`}
                >
                    <img
                        src={appConfig.logo}
                        alt={appConfig.name}
                        width="180"
                        height="60"
                    />
                </Link>

                {/* Search */}
                <div className="website-header-search">
                    <ProductSearchBar />
                </div>

                {/* Account and cart */}
                <div className="website-nav-actions">
                    <button
                        id="website-profile-button"
                        type="button"
                        className={`website-profile-button ${profileOpen ? "is-open" : ""}`}
                        onClick={openProfile}
                        aria-controls={profileOpen ? "website-profile-menu" : undefined}
                        aria-haspopup="menu"
                        aria-expanded={profileOpen}
                    >
                        <i className="fa-regular fa-user" aria-hidden="true" />
                        <span>{user ? accountLabel : "Account"}</span>
                        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                    </button>

                    <NavLink
                        to="/cart"
                        aria-label={`Cart, ${itemCount} items`}
                        className={({ isActive }) =>
                            `website-cart-link ${isActive ? "is-active" : ""}`
                        }
                    >
                        <span className="website-cart-icon">
                            <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                            <span className="website-cart-count" aria-hidden="true">
                                {itemCount > 99 ? "99+" : itemCount}
                            </span>
                        </span>

                        <span>Cart</span>
                    </NavLink>
                </div>
            </nav>

            {/* Account dropdown */}
            <Menu
                id="website-profile-menu"
                anchorEl={profileAnchor}
                open={profileOpen}
                onClose={closeProfile}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        className: "website-profile-menu",
                    },
                    list: {
                        "aria-labelledby": "website-profile-button",
                    },
                }}
            >
                <MenuItem
                    component={Link}
                    to={user ? accountPath : "/manage"}
                    onClick={closeProfile}
                >
                    <i
                        className={`fa-solid ${
                            user ? "fa-table-columns" : "fa-arrow-right-to-bracket"
                        }`}
                        aria-hidden="true"
                    />
                    <span>{user ? accountLabel : "Sign In"}</span>
                </MenuItem>

                {!user && (
                    <MenuItem
                        component={Link}
                        to="/manage/signup"
                        onClick={closeProfile}
                    >
                        <i className="fa-solid fa-user-plus" aria-hidden="true" />
                        <span>Create Account</span>
                    </MenuItem>
                )}

                <MenuItem
                    component={Link}
                    to="/manage/seller-register"
                    onClick={closeProfile}
                >
                    <i className="fa-solid fa-store" aria-hidden="true" />
                    <span>Become a Seller</span>
                </MenuItem>
            </Menu>
        </header>
    );
}

export default WebsiteNavbar;