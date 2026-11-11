export const siteName = "Zupito";

// ================== PAGE METADATA ==================
export const seoPages = {
    home: {
        title: "Shop Everyday Essentials",
        description: "Explore electronics, fashion and everyday essentials from Zupito sellers.",
        keywords: "Zupito, online shopping, electronics, fashion",
    },
    products: {
        title: "Shop Products",
        description: "Browse products and compare categories, prices and variants.",
        keywords: "Zupito products, shopping, product categories",
    },
    productDetails: {
        title: "Product Details",
        description: "View product specifications, variants and verified customer reviews.",
        keywords: "product details, verified reviews",
    },
    about: {
        title: "About Us",
        description: "Learn about Zupito and our multi-seller shopping experience.",
        keywords: "about Zupito",
    },
    contact: {
        title: "Contact Us",
        description: "Contact Zupito for shopping, order and account assistance.",
        keywords: "Zupito support, contact",
    },
    policies: {
        title: "Shopping Policies",
        description: "Read our delivery, cancellation and replacement policies.",
        keywords: "Zupito shopping policies",
    },
    account: {
        title: "Your Account",
        description: "Manage your Zupito account securely.",
        noIndex: true,
    },
};

export function getPageSEO(pathname) {
    const pages = {
        "/": "home",
        "/products": "products",
        "/about": "about",
        "/contact": "contact",
        "/policies": "policies",
    };
    if (/^\/products\/[^/]+$/.test(pathname)) return seoPages.productDetails;
    return seoPages[pages[pathname]] || seoPages.account;
}
