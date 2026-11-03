import { Outlet } from "react-router-dom";

import WebsiteNavbar from "../components/WebsiteNavbar";
import WebsiteFooter from "../components/WebsiteFooter";

// ================== WEBSITE LAYOUT ==================
function WebsiteLayout({ user = null }) {
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