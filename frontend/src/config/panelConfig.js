
import LoadingState from "../components/LoadingState";

// Admin panel
import AdminDashboard from "../admin/Dashboard";
import Sellers from "../admin/Sellers";
import Customers from "../admin/Customers";
import DeliveryAgents from "../admin/DeliveryAgents";
import Categories from "../admin/Categories";
import Products from "../admin/Products";
import Orders from "../admin/Orders";
import DeliveryAssignments from "../admin/DeliveryAssignments";
import Payments from "../admin/Payments";
import Refunds from "../admin/Refunds";
import Replacements from "../admin/Replacements";
import Settlements from "../admin/Settlements";
import Coupons from "../admin/Coupons";
import Reviews from "../admin/Reviews";
import Complaints from "../admin/Complaints";
import Reports from "../admin/Reports";
import ReuseProfile from "../admin/Profile";

// Seller panel
import SellerDashboard from "../seller/Dashboard";
import SellerApprovalStatus from "../seller/ApprovalStatus";
import StoreProfile from "../seller/StoreProfile";
import SellerProducts from "../seller/Products";
import SellerProductForm from "../seller/ProductForm";
import SellerInventory from "../seller/Inventory";
import SellerOrders from "../seller/Orders";
import SellerOrderDetails from "../seller/OrderDetails";
import SellerReplacements from "../seller/Replacements";
import SellerReplacementDetails from "../seller/ReplacementDetails";
import SellerEarnings from "../seller/Earnings";
import SellerReviews from "../seller/Reviews";



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
        profile: ReuseProfile,
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
