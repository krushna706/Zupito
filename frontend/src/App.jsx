
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import WebsiteLayout from "./layouts/WebsiteLayout";
import AccountLayout from "./layouts/AccountLayout";

// Public Website
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

// Customer Account
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

// Shared Components
import NotFound from "./components/NotFound";

import "./css/website.css";

// ================== SCROLL TO TOP ==================
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant",
        });
    }, [pathname]);

    return null;
}

// ================== APPLICATION ROUTES ==================
function App() {
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
                <Route element={<WebsiteLayout />}>
                    {/* Public Website */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products/:productId" element={<ProductDetails />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="payment-status" element={<PaymentStatus />} />
                    <Route path="order-confirmation/:orderId" element={<OrderConfirmation />} />
                    <Route path="about" element={<About />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="policies" element={<Policies />} />

                    {/* Customer Account */}
                    <Route path="account" element={<AccountLayout />}>
                        <Route index element={<Profile />} />
                        <Route path="addresses" element={<Addresses />} />
                        <Route path="orders" element={<MyOrders />} />
                        <Route path="orders/:orderId" element={<OrderDetails />} />
                        <Route path="complaints" element={<Complaints />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
