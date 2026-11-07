import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

const accountLinks = [
    { label: "My Profile", path: "/account", icon: "fa-user", end: true },
    { label: "Saved Addresses", path: "/account/addresses", icon: "fa-location-dot" },
    { label: "My Orders", path: "/account/orders", icon: "fa-box" },
    { label: "My Complaints", path: "/account/complaints", icon: "fa-headset" },
];

const pageTitles = {
    "/account": "My Profile",
    "/account/addresses": "Saved Addresses",
    "/account/orders": "My Orders",
    "/account/complaints": "My Complaints",
};

function AccountLayout() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [busy, setBusy] = useState(false);

    const onLogout = async () => {
        if (busy) return;
        setBusy(true);

        try {
            await logout();
            navigate("/", { replace: true });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };

    const currentPath = pathname.replace(/\/+$/, "") || "/";
    const isOrderDetails = /^\/account\/orders\/[^/]+$/.test(currentPath);
    const currentPage = isOrderDetails ? "Order Details" : pageTitles[currentPath] || "My Account";

    return (
        <section className="customer-account-page">
            <div className="container-fluid website-shell">
                <nav className="products-breadcrumb customer-account-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />

                    {currentPath === "/account" ? (
                        <span aria-current="page">My Account</span>
                    ) : (
                        <>
                            <Link to="/account">My Account</Link>
                            <i className="fa-solid fa-chevron-right" aria-hidden="true" />

                            {isOrderDetails ? (
                                <>
                                    <Link to="/account/orders">My Orders</Link>
                                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                                    <span aria-current="page">Order Details</span>
                                </>
                            ) : (
                                <span aria-current="page">{currentPage}</span>
                            )}
                        </>
                    )}
                </nav>

                <div className="cart-page-header customer-account-page-header">
                    <div>
                        <h1>My Account</h1>
                        <p>Manage your personal details, delivery addresses and support requests.</p>
                    </div>
                </div>

                <div className="customer-account-layout">
                    <aside className="customer-account-sidebar">
                        <div className="customer-account-sidebar-header">
                            <span className="customer-account-sidebar-icon">
                                <i className="fa-solid fa-user-gear" aria-hidden="true" />
                            </span>
                            <div>
                                <h2>Account Center</h2>
                                <p>Your personal space</p>
                            </div>
                        </div>

                        <nav className="customer-account-navigation" aria-label="Customer account navigation">
                            {accountLinks.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.end}
                                    className={({ isActive }) =>
                                        `customer-account-nav-link ${isActive ? "is-active" : ""}`
                                    }
                                >
                                    <span className="customer-account-nav-icon">
                                        <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                                    </span>
                                    <span className="customer-account-nav-label">{item.label}</span>
                                    <i className="fa-solid fa-chevron-right customer-account-nav-arrow" aria-hidden="true" />
                                </NavLink>
                            ))}
                        </nav>

                        <div className="customer-account-sidebar-footer">
                            <button
                                type="button"
                                className="customer-account-logout"
                                onClick={onLogout}
                                disabled={busy}
                            >
                                <span className="customer-account-nav-icon">
                                    <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
                                </span>
                                <span>{busy ? "Logging out…" : "Logout"}</span>
                                <i className="fa-solid fa-chevron-right customer-account-nav-arrow" aria-hidden="true" />
                            </button>
                        </div>
                    </aside>

                    <div className="customer-account-content">
                        <Outlet />
                    </div>
                </div>
            </div>
        </section>
    );
}

export default AccountLayout;