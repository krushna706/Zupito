import { getPageSEO } from "./config/seoConfig";
import usePageSEO from "./hooks/usePageSEO";
import { useEffect, lazy, Suspense, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { useAuth } from "./context/AuthContext";

const WebsiteLayout = lazy(() => import("./layouts/WebsiteLayout"));
const AccountLayout = lazy(() => import("./layouts/AccountLayout"));
const PanelLayout = lazy(() => import("./layouts/PanelLayout"));

// Public website
const HomePage = lazy(() => import("./website/Home/HomePage"));
const Products = lazy(() => import("./website/Products/Products"));
const ProductDetails = lazy(() => import("./website/Products/ProductDetails"));
const Cart = lazy(() => import("./website/Cart/Cart"));
const Checkout = lazy(() => import("./website/Checkout/Checkout"));
const PaymentStatus = lazy(() => import("./website/Checkout/PaymentStatus"));
const OrderConfirmation = lazy(() => import("./website/Checkout/OrderConfirmation"));
const About = lazy(() => import("./website/About"));
const Contact = lazy(() => import("./website/Contact"));
const Policies = lazy(() => import("./website/Policies"));

// Customer account
const Profile = lazy(() => import("./user/Profile"));
const Addresses = lazy(() => import("./user/Addresses"));
const MyOrders = lazy(() => import("./user/MyOrders"));
const OrderDetails = lazy(() => import("./user/OrderDetails"));
const Complaints = lazy(() => import("./user/Complaints"));

// Authentication
const Login = lazy(() => import("./auth/Login"));
const Signup = lazy(() => import("./auth/Signup"));
const ForgotPassword = lazy(() => import("./auth/ForgotPassword"));
const SellerRegister = lazy(() => import("./auth/SellerRegister"));

// Panel configuration
import { panelPages, getPanelRole } from "./config/panelConfig";
const SellerApprovalStatus = lazy(() => import("./seller/ApprovalStatus"));

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

    if (user.role === "seller" && user.seller?.status !== "Approved" && page === "dashboard") {
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
        page.path !== "approval-status" &&
        !(
            user.seller?.status === "Suspended" &&
            ["orders", "replacements", "earnings", "reviews"].some((path) =>
                page.path.startsWith(path)
            )
        )
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
    usePageSEO(getPageSEO(pathname));

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname]);

    return null;
}

function App() {
    const { user } = useAuth();
    const roleConfig = getPanelRole(user?.role);

    const panelUser = useMemo(
        () =>
            user
                ? {
                      ...user,
                      roleLabel: roleConfig?.label || "Unknown role",
                  }
                : null,
        [user, roleConfig?.label]
    );

    return (
        <BrowserRouter>
            <ScrollToTop />
            <ToastContainer position="top-right" autoClose={3000} />

            <Suspense
                fallback={
                    <div className="container py-5" role="status">
                        Loading page...
                    </div>
                }
            >
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
                        <Route
                            path="checkout"
                            element={
                                <ProtectedRoute allowedRoles={["customer"]}>
                                    <Checkout />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="payment-status" element={<PaymentStatus />} />
                        <Route
                            path="order-confirmation/:orderId"
                            element={
                                <ProtectedRoute allowedRoles={["customer"]}>
                                    <OrderConfirmation />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="about" element={<About />} />
                        <Route path="contact" element={<Contact />} />
                        <Route path="policies" element={<Policies />} />

                        <Route
                            path="account"
                            element={
                                <ProtectedRoute allowedRoles={["customer"]}>
                                    <AccountLayout />
                                </ProtectedRoute>
                            }
                        >
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
                            <Route
                                path="dashboard"
                                element={<RolePage user={panelUser} page="dashboard" />}
                            />
                            <Route
                                path="profile"
                                element={<RolePage user={panelUser} page="profile" />}
                            />

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
            </Suspense>
        </BrowserRouter>
    );
}

export default App;
