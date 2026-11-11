import { lazy } from "react";

// Admin panel
const AdminDashboard = lazy(() => import("../admin/Dashboard"));
const Sellers = lazy(() => import("../admin/Sellers"));
const Customers = lazy(() => import("../admin/Customers"));
const DeliveryAgents = lazy(() => import("../admin/DeliveryAgents"));
const Categories = lazy(() => import("../admin/Categories"));
const Products = lazy(() => import("../admin/Products"));
const Orders = lazy(() => import("../admin/Orders"));
const DeliveryAssignments = lazy(() => import("../admin/DeliveryAssignments"));
const Payments = lazy(() => import("../admin/Payments"));
const Refunds = lazy(() => import("../admin/Refunds"));
const Replacements = lazy(() => import("../admin/Replacements"));
const Settlements = lazy(() => import("../admin/Settlements"));
const Coupons = lazy(() => import("../admin/Coupons"));
const Reviews = lazy(() => import("../admin/Reviews"));
const Complaints = lazy(() => import("../admin/Complaints"));
const Reports = lazy(() => import("../admin/Reports"));
const ReuseProfile = lazy(() => import("../admin/Profile"));

const SellerProfile = lazy(() => import("../seller/Profile"));
const DeliveryProfile = lazy(() => import("../delivery/Profile"));

// Seller panel
const SellerDashboard = lazy(() => import("../seller/Dashboard"));
const SellerApprovalStatus = lazy(() => import("../seller/ApprovalStatus"));
const StoreProfile = lazy(() => import("../seller/StoreProfile"));
const SellerProducts = lazy(() => import("../seller/Products"));
const SellerProductForm = lazy(() => import("../seller/ProductForm"));
const SellerInventory = lazy(() => import("../seller/Inventory"));
const SellerOrders = lazy(() => import("../seller/Orders"));
const SellerOrderDetails = lazy(() => import("../seller/OrderDetails"));
const SellerReplacements = lazy(() => import("../seller/Replacements"));
const SellerReplacementDetails = lazy(() => import("../seller/ReplacementDetails"));
const SellerEarnings = lazy(() => import("../seller/Earnings"));
const SellerReviews = lazy(() => import("../seller/Reviews"));

// Delivery panel
const DeliveryDashboard = lazy(() => import("../delivery/Dashboard"));
const AssignedTasks = lazy(() => import("../delivery/AssignedTasks"));
const TaskDetails = lazy(() => import("../delivery/TaskDetails"));
const DeliveryHistory = lazy(() => import("../delivery/DeliveryHistory"));

/* ===== REGISTERED ROLES ===== */

export const panelRoles = {
    admin: {
        label: "Administrator",
        dashboard: AdminDashboard,
        profile: ReuseProfile,
    },
    seller: {
        label: "Seller",
        dashboard: SellerDashboard,
        profile: SellerProfile,
    },
    delivery: {
        label: "Delivery Agent",
        dashboard: DeliveryDashboard,
        profile: DeliveryProfile,
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
            seller: SellerProducts,
        },
        allowedRoles: ["admin", "seller"],
        navigation: {
            label: "Manage Products",
            icon: "fa-solid fa-box-open",
            end: false,
        },
    },
    {
        path: "products/new",
        component: SellerProductForm,
        allowedRoles: ["seller"],
    },
    {
        path: "products/:productId/edit",
        component: SellerProductForm,
        allowedRoles: ["seller"],
    },

    {
        path: "orders",
        components: {
            admin: Orders,
            seller: SellerOrders,
        },
        allowedRoles: ["admin", "seller"],
        navigation: {
            label: "Manage Orders",
            icon: "fa-solid fa-cart-shopping",
            end: false,
        },
    },
    {
        path: "orders/:orderId/:parcelId",
        component: SellerOrderDetails,
        allowedRoles: ["seller"],
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
    {
        path: "refunds",
        component: Refunds,
        allowedRoles: ["admin"],
        navigation: {
            label: "Refunds",
            icon: "fa-solid fa-money-bill-transfer",
            end: false,
        },
    },
    {
        path: "replacements",
        components: {
            admin: Replacements,
            seller: SellerReplacements,
        },
        allowedRoles: ["admin", "seller"],
        navigation: {
            label: "Replacements",
            icon: "fa-solid fa-arrow-right-arrow-left",
            end: false,
        },
    },
    {
        path: "replacements/:replacementId",
        component: SellerReplacementDetails,
        allowedRoles: ["seller"],
    },
    {
        path: "settlements",
        components: {
            admin: Settlements,
        },
        allowedRoles: ["admin"],
        navigation: {
            label: "Commissions & Settlements",
            icon: "fa-solid fa-hand-holding-dollar",
            end: false,
        },
    },
    {
        path: "coupons",
        component: Coupons,
        allowedRoles: ["admin"],
        navigation: {
            label: "Coupons",
            icon: "fa-solid fa-ticket",
            end: false,
        },
    },
    {
        path: "reviews",
        components: {
            admin: Reviews,
            seller: SellerReviews,
        },
        allowedRoles: ["admin", "seller"],
        navigation: {
            label: "Reviews",
            icon: "fa-solid fa-star",
            end: false,
        },
    },
    {
        path: "complaints",
        component: Complaints,
        allowedRoles: ["admin"],
        navigation: {
            label: "Complaints",
            icon: "fa-solid fa-headset",
            end: false,
        },
    },
    {
        path: "reports",
        component: Reports,
        allowedRoles: ["admin"],
        navigation: {
            label: "Reports",
            icon: "fa-solid fa-chart-column",
            end: false,
        },
    },

    // ================== SELLER PANEL ==================

    {
        path: "approval-status",
        component: SellerApprovalStatus,
        allowedRoles: ["seller"],
        navigation: {
            label: "Approval Status",
            icon: "fa-solid fa-circle-check",
            end: false,
        },
    },
    {
        path: "store",
        component: StoreProfile,
        allowedRoles: ["seller"],
        navigation: {
            label: "Store Profile",
            icon: "fa-solid fa-store",
            end: false,
        },
    },
    {
        path: "inventory",
        component: SellerInventory,
        allowedRoles: ["seller"],
        navigation: {
            label: "Inventory",
            icon: "fa-solid fa-boxes-stacked",
            end: false,
        },
    },

    {
        path: "earnings",
        component: SellerEarnings,
        allowedRoles: ["seller"],
        navigation: {
            label: "Earnings",
            icon: "fa-solid fa-wallet",
            end: false,
        },
    },

    // ================== DELIVERY AGENT PANEL ==================

    {
        path: "tasks",
        component: AssignedTasks,
        allowedRoles: ["delivery"],
        navigation: {
            label: "Assigned Tasks",
            icon: "fa-solid fa-clipboard-list",
            end: false,
        },
    },
    {
        path: "tasks/:taskId",
        component: TaskDetails,
        allowedRoles: ["delivery"],
    },
    {
        path: "history",
        component: DeliveryHistory,
        allowedRoles: ["delivery"],
        navigation: {
            label: "Delivery History",
            icon: "fa-solid fa-clock-rotate-left",
            end: false,
        },
    },
];

/* ===== SIDEBAR MENU ===== */

export function getPanelNavigation(role) {
    const normalizedRole = normalizeRole(role);

    if (!getPanelRole(normalizedRole)) {
        return [];
    }

    const pageLinks = panelPages
        .filter((page) => page.navigation && page.allowedRoles.includes(normalizedRole))
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
