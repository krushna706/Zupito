import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import WebsiteLayout from "./layouts/WebsiteLayout";

// Shared components
import NotFound from "./components/NotFound";

import "./css/website.css";

// Public website
import HomePage from "./website/Home/HomePage";

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
                {/* Public website */}
                <Route element={<WebsiteLayout />}>
                
                    <Route path="/" element={<HomePage />} />

                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;