import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { useAuth } from "./context/AuthContext";

import WebsiteLayout from "./layouts/WebsiteLayout";
import AccountLayout from "./layouts/AccountLayout";
import PanelLayout from "./layouts/PanelLayout";

// Public website
import HomePage from "./website/Home/HomePage";
import Products from "./website/Products/Products";
import ProductDetails from "./website/Products/ProductDetails";
import Cart from "./website/Cart/Cart";
import Checkout from "./website/Checkout/Checkout";
import PaymentStatus from "./website/Checkout/PaymentStatus";
import OrderConfirmation from "./website/Checkout/OrderConfirmation";
import About from "./website/About";
import Contact from "./website/Contact";
import Policies from "./website/Policies";

// Customer account
import Profile from "./user/Profile";
import Addresses from "./user/Addresses";
import MyOrders from "./user/MyOrders";
import OrderDetails from "./user/OrderDetails";
import Complaints from "./user/Complaints";

// Authentication
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import ForgotPassword from "./auth/ForgotPassword";
import SellerRegister from "./auth/SellerRegister";

// Panel configuration
import { panelPages, getPanelRole } from "./config/panelConfig";
import SellerApprovalStatus from "./seller/ApprovalStatus";

// Shared components
import ProtectedRoute from "./components/ProtectedRoute";
import AccessDenied from "./components/AccessDenied";
import NotFound from "./components/NotFound";

import "./css/website.css";

function PanelAccess() {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        const returnTo = location.pathname + location.search + location.hash;
        return <Navigate to="/manage" replace state={{ returnTo }} />;
    }

    if (!getPanelRole(user.role)) {
        return <AccessDenied />;
    }

    return <Outlet />;
}

function RolePage({ user, page }) {
    const roleConfig = getPanelRole(user?.role);
    const PageComponent = roleConfig?.[page];

    if (!PageComponent) {
        return <AccessDenied />;
    }

    if (
        user.role === "seller" &&
        user.seller?.status !== "Approved" &&
        page === "dashboard"
    ) {
        return <SellerApprovalStatus user={user} />;
    }

    const title = page === "dashboard" ? `${roleConfig.label} Dashboard` : "My Profile";

    return <PageComponent user={user} title={title} />;
}

function PanelPage({ user, page }) {
    const role = user?.role === "delivery_agent" ? "delivery" : user?.role;

    if (!user || !page.allowedRoles.includes(role)) {
        return <AccessDenied />;
    }

    if (
        role === "seller" &&
        user.seller?.status !== "Approved" &&
        page.path !== "approval-status"
    ) {
        return <Navigate to="/manage/approval-status" replace />;
    }

    const PageComponent = page.components?.[role] || page.component;

    if (!PageComponent) {
        return <AccessDenied />;
    }

    return <PageComponent user={user} title={page.navigation?.label || "Panel Page"} />;
}

function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname]);

    return null;
}

function App() {
    const { user } = useAuth();
    const roleConfig = getPanelRole(user?.role);

    const panelUser = user
        ? {
              ...user,
              roleLabel: roleConfig?.label || "Unknown role",
          }
        : null;

    return (
        <BrowserRouter>
            <ScrollToTop />
            <ToastContainer position="top-right" autoClose={3000} />

            <Routes>
                {/* Authentication */}
                <Route path="/manage" element={<Login />} />
                <Route path="/manage/signup" element={<Signup />} />
                <Route path="/manage/forgot-password" element={<ForgotPassword />} />
                <Route path="/manage/seller-register" element={<SellerRegister />} />

                {/* Public website */}
                <Route element={<WebsiteLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products/:productId" element={<ProductDetails />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="checkout" element={<ProtectedRoute allowedRoles={["customer"]}><Checkout /></ProtectedRoute>} />
                    <Route path="payment-status" element={<PaymentStatus />} />
                    <Route path="order-confirmation/:orderId" element={<ProtectedRoute allowedRoles={["customer"]}><OrderConfirmation /></ProtectedRoute>} />
                    <Route path="about" element={<About />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="policies" element={<Policies />} />

                    <Route path="account" element={<ProtectedRoute allowedRoles={["customer"]}><AccountLayout /></ProtectedRoute>}>
                        <Route index element={<Profile />} />
                        <Route path="addresses" element={<Addresses />} />
                        <Route path="orders" element={<MyOrders />} />
                        <Route path="orders/:orderId" element={<OrderDetails />} />
                        <Route path="complaints" element={<Complaints />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                </Route>

                {/* Staff panels */}
                <Route element={<PanelAccess />}>
                    <Route path="/manage" element={<PanelLayout />}>
                        <Route path="dashboard" element={<RolePage user={panelUser} page="dashboard" />} />
                        <Route path="profile" element={<RolePage user={panelUser} page="profile" />} />

                        {panelPages.map((page) => (
                            <Route
                                key={page.path}
                                path={page.path}
                                element={<PanelPage user={panelUser} page={page} />}
                            />
                        ))}

                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;