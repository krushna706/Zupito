/* ===== REGISTERED ROLES ===== */

export const panelRoles = {
    admin: {
        label: "Administrator",
        dashboard: "/manage/dashboard"
    },
    seller: {
        label: "Seller",
        dashboard: "/manage/dashboard"
    },
    delivery: {
        label: "Delivery Agent",
        dashboard: "/manage/dashboard"
    }
};

// Compatible with existing PanelLayout and PanelHeader.
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

    Frontend permissions control navigation visibility.
    Backend APIs must enforce authorization separately.
*/

const pageDefinitions = [
    {
        path: "sellers",
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Sellers",
            icon: "fa-solid fa-store"
        }
    },
    {
        path: "customers",
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Customers",
            icon: "fa-solid fa-users"
        }
    },
    {
        path: "delivery-agents",
        allowedRoles: ["admin"],
        navigation: {
            label: "Delivery Agents",
            icon: "fa-solid fa-motorcycle"
        }
    },
    {
        path: "categories",
        allowedRoles: ["admin"],
        navigation: {
            label: "Categories",
            icon: "fa-solid fa-layer-group"
        }
    },
    {
        path: "products",
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Products",
            icon: "fa-solid fa-box-open"
        }
    },
    {
        path: "orders",
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Orders",
            icon: "fa-solid fa-cart-shopping"
        }
    },
    {
        path: "delivery-assignments",
        allowedRoles: ["admin"],
        navigation: {
            label: "Delivery Assignments",
            icon: "fa-solid fa-truck-fast"
        }
    },
    {
        path: "payments",
        allowedRoles: ["admin"],
        navigation: {
            label: "Payments",
            icon: "fa-solid fa-credit-card"
        }
    },
    {
        path: "refunds",
        allowedRoles: ["admin"],
        navigation: {
            label: "Refunds",
            icon: "fa-solid fa-money-bill-transfer"
        }
    },
    {
        path: "replacements",
        allowedRoles: ["admin"],
        navigation: {
            label: "Replacements",
            icon: "fa-solid fa-arrow-right-arrow-left"
        }
    },
    {
        path: "settlements",
        allowedRoles: ["admin"],
        navigation: {
            label: "Settlements",
            icon: "fa-solid fa-wallet"
        }
    },
    {
        path: "coupons",
        allowedRoles: ["admin"],
        navigation: {
            label: "Coupons",
            icon: "fa-solid fa-ticket"
        }
    },
    {
        path: "reviews",
        allowedRoles: ["admin"],
        navigation: {
            label: "Reviews",
            icon: "fa-solid fa-star"
        }
    },
    {
        path: "complaints",
        allowedRoles: ["admin"],
        navigation: {
            label: "Complaints",
            icon: "fa-solid fa-headset"
        }
    },
    {
        path: "reports",
        allowedRoles: ["admin"],
        navigation: {
            label: "Reports",
            icon: "fa-solid fa-chart-column"
        }
    },

    {
        path: "approval-status",
        allowedRoles: ["seller"],
        navigation: {
            label: "Approval Status",
            icon: "fa-solid fa-circle-check"
        }
    },
    {
        path: "store",
        allowedRoles: ["seller"],
        navigation: {
            label: "Store Profile",
            icon: "fa-solid fa-store"
        }
    },
    {
        path: "products",
        allowedRoles: ["seller"],
        navigation: {
            label: "Manage Products",
            icon: "fa-solid fa-box-open"
        }
    },
    {
        path: "inventory",
        allowedRoles: ["seller"],
        navigation: {
            label: "Inventory",
            icon: "fa-solid fa-boxes-stacked"
        }
    },
    {
        path: "orders",
        allowedRoles: ["seller"],
        navigation: {
            label: "Orders",
            icon: "fa-solid fa-cart-shopping"
        }
    },
    {
        path: "replacements",
        allowedRoles: ["seller"],
        navigation: {
            label: "Replacements",
            icon: "fa-solid fa-arrow-right-arrow-left"
        }
    },
    {
        path: "earnings",
        allowedRoles: ["seller"],
        navigation: {
            label: "Earnings",
            icon: "fa-solid fa-wallet"
        }
    },
    {
        path: "reviews",
        allowedRoles: ["seller"],
        navigation: {
            label: "Reviews",
            icon: "fa-solid fa-star"
        }
    },

    {
        path: "tasks",
        allowedRoles: ["delivery"],
        navigation: {
            label: "Assigned Tasks",
            icon: "fa-solid fa-clipboard-list"
        }
    },
    {
        path: "history",
        allowedRoles: ["delivery"],
        navigation: {
            label: "Delivery History",
            icon: "fa-solid fa-clock-rotate-left"
        }
    }
];

export const panelPages = Object.values(
    pageDefinitions.reduce((pages, page) => {
        const existing = pages[page.path];
        pages[page.path] = existing
            ? { ...existing, allowedRoles: [...new Set([...existing.allowedRoles, ...page.allowedRoles])] }
            : page;
        return pages;
    }, {})
);

/* ===== SIDEBAR MENU ===== */

export function getPanelNavigation(role) {
    const normalizedRole = normalizeRole(role);
    const panelRole = getPanelRole(normalizedRole);

    if (!panelRole) {
        return [];
    }

    const pageLinks = panelPages
        .filter((page) => page.navigation && page.allowedRoles.includes(normalizedRole))
        .map((page) => ({
            path: `/manage/${page.path}`,
            ...page.navigation,
            end: page.navigation.end ?? false
        }));

    return [
        {
            label: "Dashboard",
            path: panelRole.dashboard,
            icon: "fa-solid fa-table-columns",
            end: true
        },
        ...pageLinks
    ];
}

/* ===== DASHBOARD REDIRECT ===== */

export function getPanelDashboardPath(role) {
    return getPanelRole(role)?.dashboard || "/manage";
}
