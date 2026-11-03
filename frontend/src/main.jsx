import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "react-toastify/dist/ReactToastify.css";
import { CartProvider } from "./context/CartContext";

import "./css/global.css";

import App from "./App.jsx";

// ================== APPLICATION ROOT ==================
createRoot(document.getElementById("root")).render(
    <StrictMode>
       <CartProvider>
            <App />
        </CartProvider>
    </StrictMode>
);