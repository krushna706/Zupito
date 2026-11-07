import { useState } from "react";
import {
    Link,
    NavLink,
    useLocation,
    useNavigate,
} from "react-router-dom";
import { Menu, MenuItem } from "@mui/material";
import { toast } from "react-toastify";

import ProductSearchBar from "./ProductSearchBar";
import { appConfig } from "../config/appConfig";
import { getPanelRole } from "../config/panelConfig";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { getLoginDestination } from "../services/authService";

const DEFAULT_AVATAR = "/images/default-avatar.svg";

function WebsiteNavbar() {
    const { user, logout } = useAuth();
    const { cartCount } = useCart();

    const location = useLocation();
    const navigate = useNavigate();

    const [profileAnchor, setProfileAnchor] = useState(null);
    const [profileLocation, setProfileLocation] = useState("");
    const [failedAvatar, setFailedAvatar] = useState("");
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Account menu and avatar
    const profileOpen =
        Boolean(profileAnchor) && profileLocation === location.key;

    const isStaff = Boolean(getPanelRole(user?.role));

    const itemCount =
        Number.isSafeInteger(cartCount) && cartCount > 0 ? cartCount : 0;

    const accountPath = isStaff
        ? getLoginDestination(user)
        : "/account";

    const accountLabel = isStaff ? "Dashboard" : "My Account";
    const displayName = user?.name?.trim() || "My Account";
    const profileImage = user?.avatar?.url || "";

    const avatar =
        profileImage && failedAvatar !== profileImage
            ? profileImage
            : DEFAULT_AVATAR;

    const openProfile = (event) => {
        setProfileAnchor(event.currentTarget);
        setProfileLocation(location.key);
    };

    const closeProfile = () => {
        setProfileAnchor(null);
    };

    // Finish server logout before leaving the account.
    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            await logout();
            closeProfile();

            toast.success("Logged out successfully.");
            navigate("/", { replace: true });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <header className="website-header">
            <nav
                className="container-fluid website-shell website-nav"
                aria-label="Main navigation"
            >
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

                <div className="website-header-search">
                    <ProductSearchBar />
                </div>

                <div className="website-nav-actions">
                    <button
                        id="website-profile-button"
                        type="button"
                        className={`website-profile-button ${
                            profileOpen ? "is-open" : ""
                        }`}
                        onClick={openProfile}
                        aria-controls={
                            profileOpen ? "website-profile-menu" : undefined
                        }
                        aria-haspopup="menu"
                        aria-expanded={profileOpen}
                    >
                        {user ? (
                            <img
                                src={avatar}
                                alt=""
                                width="32"
                                height="32"
                                className="website-profile-avatar"
                                onError={() => setFailedAvatar(profileImage)}
                            />
                        ) : (
                            <i
                                className="fa-regular fa-user"
                                aria-hidden="true"
                            />
                        )}

                        <span
                            className="website-profile-name"
                            title={user ? displayName : undefined}
                        >
                            {user ? displayName : "Account"}
                        </span>

                        <i
                            className="fa-solid fa-chevron-down"
                            aria-hidden="true"
                        />
                    </button>

                    <NavLink
                        to="/cart"
                        aria-label={`Cart, ${itemCount} items`}
                        className={({ isActive }) =>
                            `website-cart-link ${isActive ? "is-active" : ""}`
                        }
                    >
                        <span className="website-cart-icon">
                            <i
                                className="fa-solid fa-bag-shopping"
                                aria-hidden="true"
                            />
                            <span
                                className="website-cart-count"
                                aria-hidden="true"
                            >
                                {itemCount > 99 ? "99+" : itemCount}
                            </span>
                        </span>

                        <span>Cart</span>
                    </NavLink>
                </div>
            </nav>

            <Menu
                id="website-profile-menu"
                anchorEl={profileAnchor}
                open={profileOpen}
                onClose={closeProfile}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
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
                            user
                                ? "fa-table-columns"
                                : "fa-arrow-right-to-bracket"
                        }`}
                        aria-hidden="true"
                    />
                    <span>{user ? accountLabel : "Sign In"}</span>
                </MenuItem>

                {user?.role === "customer" && (
                    <MenuItem
                        component={Link}
                        to="/account/orders"
                        onClick={closeProfile}
                    >
                        <i className="fa-solid fa-box" aria-hidden="true" />
                        <span>My Orders</span>
                    </MenuItem>
                )}

                {!user && [
                    <MenuItem
                        key="signup"
                        component={Link}
                        to="/manage/signup"
                        onClick={closeProfile}
                    >
                        <i
                            className="fa-solid fa-user-plus"
                            aria-hidden="true"
                        />
                        <span>Create Account</span>
                    </MenuItem>,

                    <MenuItem
                        key="seller"
                        component={Link}
                        to="/manage/seller-register"
                        onClick={closeProfile}
                    >
                        <i
                            className="fa-solid fa-store"
                            aria-hidden="true"
                        />
                        <span>Become a Seller</span>
                    </MenuItem>,
                ]}

                {user && (
                    <MenuItem
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        <i
                            className="fa-solid fa-arrow-right-from-bracket"
                            aria-hidden="true"
                        />
                        <span>
                            {isLoggingOut ? "Logging out…" : "Logout"}
                        </span>
                    </MenuItem>
                )}
            </Menu>
        </header>
    );
}

export default WebsiteNavbar;