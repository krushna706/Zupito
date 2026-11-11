import { Link } from "react-router-dom";

import { appConfig } from "../config/appConfig";

const footerGroups = [
    {
        title: "Discover",
        links: [
            { label: "Shop All", path: "/products" },
            { label: "About Zupito", path: "/about" },
            { label: "Contact Us", path: "/contact" },
            { label: "Become a Seller", path: "/manage/seller-register" },
        ],
    },
    {
        title: "Your Account",
        links: [
            { label: "My Profile", path: "/account" },
            { label: "My Orders", path: "/account/orders" },
            { label: "Shopping Cart", path: "/cart" },
            { label: "Create Account", path: "/manage/signup" },
        ],
    },
    {
        title: "Customer Care",
        links: [
            { label: "Contact Us", path: "/contact" },
            { label: "My Complaints", path: "/account/complaints" },
            { label: "Delivery & Replacements", path: "/policies" },
        ],
    },
];

function WebsiteFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="website-footer">
            <div className="container-fluid website-shell">
                <div className="website-footer-grid">
                    <div className="website-footer-brand">
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
                                loading="lazy"
                            />
                        </Link>

                        <p className="website-footer-tagline">{appConfig.tagline}</p>

                        <p className="website-footer-description">{appConfig.description}</p>
                    </div>

                    {/* Navigation */}
                    {footerGroups.map((group) => (
                        <div key={group.title}>
                            <h2 className="website-footer-heading card-title">{group.title}</h2>

                            <nav aria-label={`Footer ${group.title.toLowerCase()} links`}>
                                <ul className="website-footer-links">
                                    {group.links.map((link) => (
                                        <li key={link.path}>
                                            <Link to={link.path}>{link.label}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </div>
                    ))}

                    {/* Seller invitation */}
                    <div className="website-footer-seller">
                        <span className="website-footer-seller-icon">
                            <i className="fa-solid fa-store" aria-hidden="true" />
                        </span>

                        <h2 className="card-title">Bring your store online.</h2>
                        <p>Showcase your products and manage your business with Zupito.</p>

                        <Link to="/manage/seller-register">
                            Become a Seller
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </div>
                </div>

                <div className="website-footer-bottom">
                    <p>
                        © {currentYear} {appConfig.name}. All rights reserved.
                    </p>

                    <nav aria-label="Footer policy links">
                        <Link to="/policies">Shopping Policies</Link>
                        <Link to="/contact">Help & Support</Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}

export default WebsiteFooter;
