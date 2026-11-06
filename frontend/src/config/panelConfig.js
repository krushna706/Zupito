
import LoadingState from "../components/LoadingState";

// Admin panel
import Sellers from "../admin/Sellers";
import Customers from "../admin/Customers";
import DeliveryAgents from "../admin/DeliveryAgents";
import Categories from "../admin/Categories";
import Products from "../admin/Products";
import Orders from "../admin/Orders";
import DeliveryAssignments from "../admin/DeliveryAssignments";
import Payments from "../admin/Payments";

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

    Replace LoadingState with actual components as pages are completed.
    Backend APIs must enforce role and ownership permissions.
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
    {
        path: "delivery-agents",
        component: DeliveryAgents,
        allowedRoles: ["admin"],
        navigation: {
            label: "Delivery Agents",
            icon: "fa-solid fa-motorcycle",
            end: false,
        },
    },
    {
        path: "categories",
        component: Categories,
        allowedRoles: ["admin"],
        navigation: {
            label: "Categories",
            icon: "fa-solid fa-layer-group",
            end: false,
        },
    },
    {
        path: "products",
        components: {
            admin: Products,
            seller: LoadingState,
        },
        allowedRoles: ["admin", "seller"],
        navigation: {
            label: "Manage Products",
            icon: "fa-solid fa-box-open",
            end: false,
        },
    },
    {
        path: "orders",
        components: {
            admin: Orders,
            seller: LoadingState,
        },
        allowedRoles: ["admin", "seller"],
        navigation: {
            label: "Manage Orders",
            icon: "fa-solid fa-cart-shopping",
            end: false,
        },
    },
    {
        path: "delivery-assignments",
        component: DeliveryAssignments,
        allowedRoles: ["admin"],
        navigation: {
            label: "Delivery Assignments",
            icon: "fa-solid fa-truck-fast",
            end: false,
        },
    },
    {
        path: "payments",
        component: Payments,
        allowedRoles: ["admin"],
        navigation: {
            label: "Payments",
            icon: "fa-solid fa-credit-card",
            end: false,
        },
    },
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
        .filter((page) =>
            page.navigation && page.allowedRoles.includes(normalizedRole)
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
