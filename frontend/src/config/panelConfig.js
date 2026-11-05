
import LoadingState from "../components/LoadingState";

// Admin panel
import Sellers from "../admin/Sellers";
import Customers from "../admin/Customers";

/* ===== REGISTERED ROLES ===== */

export const panelRoles = {
    admin: {
        label: "Administrator",
        dashboard: LoadingState,
        profile: LoadingState,
    },
    seller: {
        label: "Seller",
        dashboard: LoadingState,
        profile: LoadingState,
    },
    delivery: {
        label: "Delivery Agent",
        dashboard: LoadingState,
        profile: LoadingState,
    },
};

// Keep compatibility with the existing PanelHeader.
export const panelConfig = panelRoles;

function normalizeRole(role) {
    return role === "delivery_agent" ? "delivery" : role;
}

export function getPanelRole(role) {
    const normalizedRole = normalizeRole(role);

    return Object.prototype.hasOwnProperty.call(panelRoles, normalizedRole)
        ? panelRoles[normalizedRole]
        : null;
}

/* ===== PANEL PAGES AND PERMISSIONS ===== */

/*
    Add navigation only when a page should appear in the sidebar.
    Declare each unique path once.

    Replace LoadingState with the actual component when a page is ready.
    Backend APIs must enforce authorization separately.
*/

function previewPage(path, label, icon, allowedRoles) {
    return {
        path,
        component: LoadingState,
        allowedRoles,
        navigation: {
            label,
            icon,
            end: false,
        },
    };
}

export const panelPages = [
    // ================== ADMIN PANEL ==================
    {
        path: "sellers",
        component: Sellers,
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Sellers",
            icon: "fa-solid fa-store",
            end: false,
        },
    },
    {
        path: "customers",
        component: Customers,
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Customers",
            icon: "fa-solid fa-users",
            end: false,
        },
    },

    previewPage("delivery-agents", "Delivery Agents", "fa-solid fa-motorcycle", ["admin"]),
    previewPage("categories", "Categories", "fa-solid fa-layer-group", ["admin"]),
    previewPage("products", "Manage Products", "fa-solid fa-box-open", ["admin", "seller"]),
    previewPage("orders", "Manage Orders", "fa-solid fa-cart-shopping", ["admin", "seller"]),
    previewPage("delivery-assignments", "Delivery Assignments", "fa-solid fa-truck-fast", ["admin"]),
    previewPage("payments", "Payments", "fa-solid fa-credit-card", ["admin"]),
    previewPage("refunds", "Refunds", "fa-solid fa-money-bill-transfer", ["admin"]),
    previewPage("replacements", "Replacements", "fa-solid fa-arrow-right-arrow-left", ["admin", "seller"]),
    previewPage("settlements", "Settlements", "fa-solid fa-wallet", ["admin"]),
    previewPage("coupons", "Coupons", "fa-solid fa-ticket", ["admin"]),
    previewPage("reviews", "Reviews", "fa-solid fa-star", ["admin", "seller"]),
    previewPage("complaints", "Complaints", "fa-solid fa-headset", ["admin"]),
    previewPage("reports", "Reports", "fa-solid fa-chart-column", ["admin"]),

    // ================== SELLER PANEL ==================
    previewPage("approval-status", "Approval Status", "fa-solid fa-circle-check", ["seller"]),
    previewPage("store", "Store Profile", "fa-solid fa-store", ["seller"]),
    previewPage("inventory", "Inventory", "fa-solid fa-boxes-stacked", ["seller"]),
    previewPage("earnings", "Earnings", "fa-solid fa-wallet", ["seller"]),

    // ================== DELIVERY AGENT PANEL ==================
    previewPage("tasks", "Assigned Tasks", "fa-solid fa-clipboard-list", ["delivery"]),
    previewPage("history", "Delivery History", "fa-solid fa-clock-rotate-left", ["delivery"]),
];

/* ===== SIDEBAR MENU ===== */

export function getPanelNavigation(role) {
    const normalizedRole = normalizeRole(role);

    if (!getPanelRole(normalizedRole)) {
        return [];
    }

    const pageLinks = panelPages
        .filter(
            (page) =>
                page.navigation &&
                page.allowedRoles.includes(normalizedRole)
        )
        .map((page) => ({
            path: `/manage/${page.path}`,
            ...page.navigation,
        }));

    return [
        {
            label: "Dashboard",
            path: "/manage/dashboard",
            icon: "fa-solid fa-table-columns",
            end: true,
        },
        ...pageLinks,
        {
            label: "Profile",
            path: "/manage/profile",
            icon: "fa-regular fa-user",
            end: false,
        },
    ];
}

/* ===== DASHBOARD REDIRECT ===== */

export function getPanelDashboardPath(role) {
    return getPanelRole(role) ? "/manage/dashboard" : "/manage";
}
