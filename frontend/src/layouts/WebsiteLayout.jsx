import { Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";

function WebsiteLayout() {
    const { user } = useAuth();
    return (
        <div className="website-layout">
            <WebsiteNavbar user={user} />

            {/* Expands to keep the footer at the bottom */}
            <main className="website-main">
                <Outlet />
            </main>

            <WebsiteFooter />
        </div>
    );
}

export default WebsiteLayout;
