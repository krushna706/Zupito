
import { useMemo, useState } from "react";
import {
    Alert, Button, InputAdornment, MenuItem, Table, TableBody, TableCell,
    TableContainer, TableHead, TablePagination, TableRow, TextField,
} from "@mui/material";
import { toast } from "react-toastify";

import { demoOrders } from "../data/orderPreview";
import { productCatalog } from "../data/productCatalog";
import { sortNewestFirst } from "../utils/sortNewestFirst";

// ================== DATA SOURCES ==================
const KEYS = {
    sellers: ["zupito_admin_sellers"],
    customers: ["zupito_admin_customers", "zupito_admin_users"],
    agents: ["zupito_admin_delivery_agents"],
    categories: ["zupito_admin_categories"],
    products: ["zupito_admin_products"],
    orders: ["zupito_admin_orders"],
    tasks: ["zupito_admin_delivery_assignments"],
    payments: ["zupito_admin_payments"],
    refunds: ["zupito_admin_refunds"],
    replacements: ["zupito_admin_replacements"],
    settlements: ["zupito_admin_settlements"],
    coupons: ["zupito_admin_coupons"],
    reviews: ["zupito_admin_reviews"],
    complaints: ["zupito_admin_complaints"],
};

const rupees = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("en-IN");

const amount = (value) =>
    rupees.format(Number.isFinite(Number(value)) ? Number(value) : 0);

const count = (value) =>
    number.format(Number(value) || 0);

const raw = (value) =>
    String(value ?? "").trim();

const lower = (value) =>
    raw(value).toLowerCase();

const numberOf = (value) =>
    Number.isFinite(Number(value)) ? Number(value) : 0;

const label = (value) =>
    raw(value)
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (s) => s.toUpperCase()) || "Unknown";

const idOf = (item, fallback = "—") =>
    raw(item?.id || item?._id || fallback);

const first = (item, keys, fallback = "") =>
    keys.map((key) => item?.[key]).find((value) =>
        value !== undefined &&
        value !== null &&
        raw(value) !== ""
    ) ?? fallback;

function readArray(keys) {
    for (const key of keys) {
        try {
            const json = localStorage.getItem(key);
            if (json === null) continue;

            const data = JSON.parse(json);

            if (Array.isArray(data)) {
                return {
                    rows: data,
                    source: "Saved preview",
                };
            }
        } catch {
            // Skip unavailable or invalid storage.
        }
    }

    return {
        rows: [],
        source: "Not initialized",
    };
}

function readSettlements() {
    try {
        const data = JSON.parse(
            localStorage.getItem(KEYS.settlements[0])
        );

        if (
            data &&
            Array.isArray(data.batches) &&
            Array.isArray(data.ledger)
        ) {
            return {
                batches: data.batches,
                ledger: data.ledger,
                source: "Saved preview",
            };
        }
    } catch {
        // No valid settlement snapshot.
    }

    return {
        batches: [],
        ledger: [],
        source: "Not initialized",
    };
}

function loadSnapshot() {
    const result = {};

    for (const key of Object.keys(KEYS)) {
        if (key === "settlements") continue;
        result[key] = readArray(KEYS[key]);
    }

    if (result.orders.source === "Not initialized") {
        result.orders = {
            rows: demoOrders,
            source: "Catalog demo",
        };
    }

    if (result.products.source === "Not initialized") {
        result.products = {
            rows: productCatalog,
            source: "Catalog demo",
        };
    }

    result.settlements = readSettlements();

    return result;
}

// ================== DATE HELPERS ==================
// Dates are compared in IST.
function istDay(value) {
    if (!value) return "";

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return value;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(parsed);

    const get = (type) =>
        parts.find((part) => part.type === type)?.value || "";

    return `${get("year")}-${get("month")}-${get("day")}`;
}

function todayIST() {
    return istDay(new Date());
}

function monthStart(day) {
    return `${day.slice(0, 7)}-01`;
}

function lastMonthBounds(day) {
    const [year, month] = day.split("-").map(Number);
    const lastEnd = new Date(Date.UTC(year, month - 1, 0));
    const end = lastEnd.toISOString().slice(0, 10);

    return [monthStart(end), end];
}

function relativeDay(days) {
    const timestamp = Date.now() - days * 86400000;
    return istDay(new Date(timestamp));
}

function dateOf(item) {
    return first(item, [
        "createdAt",
        "registeredAt",
        "joinedAt",
        "submittedAt",
        "appliedAt",
        "requestedAt",
        "earnedAt",
    ]);
}

function within(value, start, end) {
    const day = istDay(value);
    return Boolean(day) && day >= start && day <= end;
}

function rangeFor(period, from, to) {
    const today = todayIST();

    if (period === "all") {
        return {
            start: "0001-01-01",
            end: "9999-12-31",
            valid: true,
        };
    }

    if (period === "month") {
        return {
            start: monthStart(today),
            end: today,
            valid: true,
        };
    }

    if (period === "lastMonth") {
        const [start, end] = lastMonthBounds(today);
        return { start, end, valid: true };
    }

    if (period === "7") {
        return {
            start: relativeDay(6),
            end: today,
            valid: true,
        };
    }

    if (period === "30") {
        return {
            start: relativeDay(29),
            end: today,
            valid: true,
        };
    }

    return {
        start: from,
        end: to,
        valid: Boolean(from && to && from <= to),
    };
}

function showDate(value) {
    const day = istDay(value);
    if (!day) return "—";

    const [year, month, date] = day.split("-").map(Number);

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(year, month - 1, date));
}

function statusOf(item, fields = ["status"]) {
    return label(first(item, fields, "Unknown"));
}

function stateOf(item, fields = ["status"]) {
    return lower(first(item, fields));
}

function stockOf(product) {
    if (
        Array.isArray(product.variants) &&
        product.variants.length
    ) {
        return product.variants.reduce(
            (sum, variant) =>
                sum + Math.max(0, numberOf(variant.stock)),
            0
        );
    }

    return Math.max(0, numberOf(product.stock));
}

function stockLabel(stock) {
    if (stock === 0) return "Out of Stock";
    if (stock <= 5) return "Low Stock";
    return "In Stock";
}

function salesAmounts(line) {
    const gross = Math.round(
        numberOf(line.grossAmount) * 100
    );

    const commission = Math.round(
        gross * numberOf(line.commissionRate) / 100
    );

    const adjustments = Math.round(
        numberOf(line.adjustment) * 100
    );

    return {
        gross: gross / 100,
        commission: commission / 100,
        adjustments: adjustments / 100,
        payable: Math.max(
            0,
            gross - commission + adjustments
        ) / 100,
    };
}

function isListed(product) {
    const state = stateOf(product, [
        "listingStatus",
        "moderationStatus",
        "approvalStatus",
        "status",
    ]);

    return (
        !state ||
        ["active", "approved", "published", "live", "listed"]
            .includes(state)
    );
}

function isRemoved(product) {
    return ["removed", "deleted", "unlisted", "archived"]
        .includes(
            stateOf(product, [
                "listingStatus",
                "moderationStatus",
                "status",
            ])
        );
}

// ================== PRODUCT HISTORY ==================
function productEvents(products) {
    const events = [];
    const unique = new Set();

    const add = (product, action, at, detail = "") => {
        if (!istDay(at)) return;

        const key = [
            idOf(product),
            lower(action),
            istDay(at),
        ].join("|");

        if (unique.has(key)) return;
        unique.add(key);

        events.push({
            id: key,
            product: first(
                product,
                ["name", "title"],
                "Unnamed Product"
            ),
            productId: idOf(product),
            action: label(action),
            detail,
            createdAt: at,
            status: label(action),
        });
    };

    for (const product of products) {
        const created = first(product, [
            "createdAt",
            "submittedAt",
        ]);

        if (created) {
            add(
                product,
                "Listed / Submitted",
                created,
                "Record creation"
            );
        }

        const removed = first(product, [
            "deletedAt",
            "removedAt",
            "unlistedAt",
            "archivedAt",
        ]);

        if (removed) {
            add(
                product,
                "Removed",
                removed,
                "Recorded removal date"
            );
        }

        for (const historyKey of [
            "history",
            "auditHistory",
            "activityHistory",
            "moderationHistory",
        ]) {
            const changes = Array.isArray(product[historyKey])
                ? product[historyKey]
                : [];

            for (const change of changes) {
                const action = first(change, [
                    "action",
                    "type",
                    "status",
                    "event",
                ]);

                const at = first(change, [
                    "date",
                    "at",
                    "createdAt",
                    "timestamp",
                ]);

                if (action && at) {
                    add(
                        product,
                        action,
                        at,
                        first(change, ["reason", "note"], "")
                    );
                }
            }
        }
    }

    return events;
}

// ================== ENTITY HELPERS ==================
function customerName(item) {
    return first(
        item,
        ["name", "fullName", "customerName", "displayName"],
        "Customer"
    );
}

function sellerName(item) {
    return first(
        item,
        [
            "storeName",
            "businessName",
            "shopName",
            "sellerName",
            "name",
        ],
        "Seller"
    );
}

function agentName(item) {
    return first(
        item,
        ["name", "fullName", "agentName"],
        "Delivery Agent"
    );
}

function productName(item) {
    return first(
        item,
        ["name", "title"],
        "Unnamed Product"
    );
}

function categoryName(item) {
    return first(
        item,
        ["name", "title", "label", "slug"],
        "Category"
    );
}

function productCategory(item) {
    return first(
        item,
        ["categoryName", "category", "group"],
        "Uncategorized"
    );
}

function itemStatus(item) {
    return statusOf(item, ["orderStatus", "status"]);
}

function orderAmount(item) {
    return numberOf(
        first(
            item,
            ["totalAmount", "grandTotal", "total", "amount"],
            0
        )
    );
}

function batchAmount(value) {
    return numberOf(value) / 100;
}

function datedCount(rows, bounds) {
    const tracked = rows.filter((row) =>
        istDay(dateOf(row))
    );

    return {
        value: tracked.filter((row) =>
            within(
                dateOf(row),
                bounds.start,
                bounds.end
            )
        ).length,
        tracked: tracked.length,
        total: rows.length,
    };
}

function numberOrNA(value, tracked) {
    return tracked ? count(value) : "—";
}

// ================== REPORT DEFINITIONS ==================
const C = (key, title, type = "text") => ({
    key,
    title,
    type,
});

const REPORTS = {
    orders: {
        title: "Orders",
        mode: "events",
        columns: [
            C("id", "Order ID"),
            C("customer", "Customer"),
            C("items", "Items", "number"),
            C("total", "Order Value", "money"),
            C("status", "Status", "status"),
            C("createdAt", "Order Date", "date"),
        ],
    },

    payments: {
        title: "Payments",
        mode: "events",
        columns: [
            C("id", "Payment ID"),
            C("orderId", "Order ID"),
            C("amount", "Amount", "money"),
            C("status", "Status", "status"),
            C("gatewayId", "Gateway ID"),
            C("createdAt", "Attempt Date", "date"),
        ],
    },

    refunds: {
        title: "Refunds",
        mode: "events",
        columns: [
            C("id", "Refund ID"),
            C("orderId", "Order ID"),
            C("amount", "Amount", "money"),
            C("status", "Status", "status"),
            C("reason", "Reason"),
            C("createdAt", "Requested On", "date"),
        ],
    },

    products: {
        title: "Products / Listings",
        mode: "snapshot",
        columns: [
            C("id", "Product ID"),
            C("name", "Product Name"),
            C("category", "Category"),
            C("seller", "Seller"),
            C("variants", "Variants", "number"),
            C("stock", "Total Stock", "number"),
            C("price", "Price", "money"),
            C("status", "Listing Status", "status"),
            C("createdAt", "Added On", "date"),
        ],
    },

    stock: {
        title: "Product Variants & Stock",
        mode: "snapshot",
        columns: [
            C("id", "Product / SKU"),
            C("product", "Product"),
            C("variant", "Variant"),
            C("stock", "Stock", "number"),
            C("price", "Price", "money"),
            C("status", "Stock Status", "status"),
        ],
    },

    changes: {
        title: "Product Listing Activity",
        mode: "events",
        columns: [
            C("productId", "Product ID"),
            C("product", "Product"),
            C("action", "Action"),
            C("detail", "Details"),
            C("createdAt", "Activity Date", "date"),
        ],
    },

    categories: {
        title: "Categories",
        mode: "snapshot",
        columns: [
            C("id", "Category ID"),
            C("name", "Category"),
            C("parent", "Parent"),
            C("products", "Products", "number"),
            C("status", "Status", "status"),
            C("createdAt", "Created On", "date"),
        ],
    },

    sellers: {
        title: "Sellers",
        mode: "snapshot",
        columns: [
            C("id", "Seller ID"),
            C("name", "Store / Seller"),
            C("products", "Listed Products", "number"),
            C("status", "Approval Status", "status"),
            C("city", "City"),
            C("createdAt", "Registered On", "date"),
        ],
    },

    customers: {
        title: "Customers / Users",
        mode: "snapshot",
        columns: [
            C("id", "Customer ID"),
            C("name", "Customer"),
            C("email", "Email"),
            C("status", "Account Status", "status"),
            C("createdAt", "Registered On", "date"),
        ],
    },

    agents: {
        title: "Delivery Agents",
        mode: "snapshot",
        columns: [
            C("id", "Agent ID"),
            C("name", "Agent"),
            C("status", "Status", "status"),
            C("availability", "Availability", "status"),
            C("assigned", "Active Tasks", "number"),
            C("capacity", "Capacity", "number"),
            C("createdAt", "Added On", "date"),
        ],
    },

    delivery: {
        title: "Delivery Assignments",
        mode: "events",
        columns: [
            C("id", "Task ID"),
            C("orderId", "Order ID"),
            C("type", "Task Type"),
            C("agent", "Agent ID"),
            C("attempts", "Attempts", "number"),
            C("status", "Status", "status"),
            C("createdAt", "Created On", "date"),
        ],
    },

    replacements: {
        title: "Replacements",
        mode: "events",
        columns: [
            C("id", "Request ID"),
            C("orderId", "Order ID"),
            C("product", "Product"),
            C("seller", "Seller"),
            C("sellerDecision", "Seller Response", "status"),
            C("status", "Status", "status"),
            C("createdAt", "Requested On", "date"),
        ],
    },

    batches: {
        title: "Settlement Batches",
        mode: "events",
        columns: [
            C("id", "Batch ID"),
            C("seller", "Seller"),
            C("sales", "Sales", "number"),
            C("gross", "Gross", "money"),
            C("commission", "Commission", "money"),
            C("adjustment", "Adjustments", "money"),
            C("payable", "Payable", "money"),
            C("status", "Status", "status"),
            C("createdAt", "Prepared On", "date"),
        ],
    },

    earnings: {
        title: "Seller Earnings Ledger",
        mode: "events",
        columns: [
            C("id", "Allocation ID"),
            C("orderId", "Order ID"),
            C("seller", "Seller"),
            C("gross", "Gross", "money"),
            C("commission", "Commission", "money"),
            C("adjustment", "Adjustments", "money"),
            C("payable", "Projected Payable", "money"),
            C("status", "Status", "status"),
            C("createdAt", "Earned On", "date"),
        ],
    },

    coupons: {
        title: "Coupons",
        mode: "snapshot",
        columns: [
            C("id", "Coupon ID"),
            C("code", "Code"),
            C("type", "Discount Type"),
            C("discount", "Discount"),
            C("used", "Used", "number"),
            C("limit", "Limit", "number"),
            C("status", "Status", "status"),
            C("createdAt", "Created On", "date"),
        ],
    },

    reviews: {
        title: "Reviews",
        mode: "events",
        columns: [
            C("id", "Review ID"),
            C("product", "Product"),
            C("customer", "Customer"),
            C("rating", "Rating", "rating"),
            C("title", "Review"),
            C("status", "Moderation", "status"),
            C("createdAt", "Submitted On", "date"),
        ],
    },

    complaints: {
        title: "Complaints",
        mode: "events",
        columns: [
            C("id", "Ticket ID"),
            C("customer", "Customer"),
            C("orderId", "Order ID"),
            C("category", "Category"),
            C("subject", "Subject"),
            C("replies", "Admin Replies", "number"),
            C("status", "Status", "status"),
            C("createdAt", "Submitted On", "date"),
        ],
    },
};

function couponStatus(coupon) {
    const today = todayIST();

    if (
        coupon.validUntil &&
        coupon.validUntil < today
    ) {
        return "Expired";
    }

    if (
        numberOf(coupon.usageLimit) > 0 &&
        numberOf(coupon.usageCount) >=
        numberOf(coupon.usageLimit)
    ) {
        return "Exhausted";
    }

    if (coupon.enabled === false) {
        return "Paused";
    }

    if (
        coupon.validFrom &&
        coupon.validFrom > today
    ) {
        return "Scheduled";
    }

    return "Active";
}

// ================== NORMALIZE REPORT DATA ==================
function buildTables(data) {
    const products = data.products.rows;

    const productNames = new Map(
        products.map((item) => [
            idOf(item),
            productName(item),
        ])
    );

    const categoryProductCount = new Map();
    const sellerProductCount = new Map();

    for (const product of products) {
        const category = lower(productCategory(product));

        categoryProductCount.set(
            category,
            (categoryProductCount.get(category) || 0) + 1
        );

        const seller = lower(
            first(product, [
                "sellerName",
                "storeName",
                "seller",
            ])
        );

        if (seller) {
            sellerProductCount.set(
                seller,
                (sellerProductCount.get(seller) || 0) + 1
            );
        }
    }

    return {
        orders: data.orders.rows.map((item) => ({
            id: idOf(item),
            customer: first(
                item,
                ["customerName", "userName", "customer"],
                "—"
            ),
            items: Array.isArray(item.items)
                ? item.items.reduce(
                    (sum, row) =>
                        sum + numberOf(row.quantity || 1),
                    0
                )
                : 0,
            total: orderAmount(item),
            status: itemStatus(item),
            createdAt: dateOf(item),
        })),

        payments: data.payments.rows.map((item) => ({
            id: idOf(item),
            orderId: item.orderId || "—",
            amount: numberOf(item.amount),
            status: statusOf(item),
            gatewayId: first(
                item,
                ["gatewayPaymentId", "razorpayPaymentId"],
                "—"
            ),
            createdAt: dateOf(item),
        })),

        refunds: data.refunds.rows.map((item) => ({
            id: idOf(item),
            orderId: item.orderId || "—",
            amount: numberOf(item.amount),
            status: statusOf(item),
            reason: item.reason || "—",
            createdAt: dateOf(item),
        })),

        products: products.map((item) => ({
            id: idOf(item),
            name: productName(item),
            category: productCategory(item),
            seller: first(
                item,
                ["sellerName", "storeName", "seller"],
                "—"
            ),
            variants: Array.isArray(item.variants)
                ? item.variants.length
                : 0,
            stock: stockOf(item),
            price: numberOf(
                first(
                    item,
                    ["price", "sellingPrice"],
                    0
                )
            ),
            status: statusOf(item, [
                "listingStatus",
                "moderationStatus",
                "approvalStatus",
                "status",
            ]).replace(
                /^Unknown$/,
                "Listed (Preview)"
            ),
            createdAt: first(item, [
                "createdAt",
                "submittedAt",
            ]),
        })),

        stock: products.flatMap((item) => {
            const variants =
                Array.isArray(item.variants) &&
                item.variants.length
                    ? item.variants
                    : [item];

            return variants.map((variant, index) => {
                const stock = Math.max(
                    0,
                    numberOf(variant.stock)
                );

                const options =
                    variant.options &&
                    typeof variant.options === "object"
                        ? Object.values(variant.options).join(" / ")
                        : first(
                            variant,
                            ["name", "sku", "variantLabel"],
                            "Default"
                        );

                return {
                    id: `${idOf(item)} / ${first(
                        variant,
                        ["sku", "id"],
                        index + 1
                    )}`,
                    product: productName(item),
                    variant: options || "Default",
                    stock,
                    price: numberOf(
                        first(
                            variant,
                            ["price"],
                            item.price
                        )
                    ),
                    status: stockLabel(stock),
                    createdAt: first(item, [
                        "createdAt",
                        "submittedAt",
                    ]),
                };
            });
        }),

        changes: productEvents(products),

        categories: data.categories.rows.map((item) => ({
            id: idOf(
                item,
                first(item, ["slug", "name"])
            ),
            name: categoryName(item),
            parent: first(
                item,
                ["parentName", "parentId"],
                "Root"
            ),
            products:
                categoryProductCount.get(
                    lower(
                        first(item, [
                            "slug",
                            "name",
                        ])
                    )
                ) || 0,
            status: statusOf(item, [
                "status",
                "approvalStatus",
            ]),
            createdAt: dateOf(item),
        })),

        sellers: data.sellers.rows.map((item) => ({
            id: idOf(item),
            name: sellerName(item),
            products:
                sellerProductCount.get(
                    lower(sellerName(item))
                ) || 0,
            status: statusOf(item, [
                "approvalStatus",
                "status",
            ]),
            city: first(
                item,
                ["city", "storeCity"],
                "—"
            ),
            createdAt: dateOf(item),
        })),

        customers: data.customers.rows.map((item) => ({
            id: idOf(item),
            name: customerName(item),
            email: item.email || "—",
            status: statusOf(item, [
                "status",
                "accountStatus",
            ]),
            createdAt: dateOf(item),
        })),

        agents: data.agents.rows.map((item) => ({
            id: idOf(item),
            name: agentName(item),
            status: statusOf(item),
            availability: statusOf(
                item,
                ["availability"]
            ),
            assigned: numberOf(item.activeTasks),
            capacity: numberOf(item.capacity),
            createdAt: dateOf(item),
        })),

        delivery: data.tasks.rows.map((item) => ({
            id: idOf(item),
            orderId: item.orderId || "—",
            type: label(
                first(
                    item,
                    ["kind", "type"],
                    "Original Delivery"
                )
            ),
            agent: item.agentId || "Unassigned",
            attempts: numberOf(item.attempts),
            status: statusOf(item, [
                "stage",
                "status",
            ]),
            createdAt: dateOf(item),
        })),

        replacements: data.replacements.rows.map(
            (item) => ({
                id: idOf(item),
                orderId: item.orderId || "—",
                product: first(
                    item,
                    ["productName"],
                    productNames.get(item.productId) || "—"
                ),
                seller: item.seller || "—",
                sellerDecision:
                    item.sellerDecision || "Awaiting",
                status: statusOf(item),
                createdAt: dateOf(item),
            })
        ),

        batches: data.settlements.batches.map(
            (item) => ({
                id: idOf(item),
                seller: item.seller || "—",
                sales: Array.isArray(item.lineIds)
                    ? item.lineIds.length
                    : 0,
                gross: batchAmount(item.gross),
                commission: batchAmount(
                    item.commission
                ),
                adjustment: batchAmount(
                    item.adjustments
                ),
                payable: batchAmount(item.payable),
                status: statusOf(item),
                createdAt:
                    item.preparedAt || dateOf(item),
            })
        ),

        earnings: data.settlements.ledger.map(
            (item) => ({
                id: idOf(item),
                orderId: item.orderId || "—",
                seller: item.seller || "—",
                ...salesAmounts(item),
                adjustment: salesAmounts(item).adjustments,
                status: statusOf(item),
                createdAt:
                    item.earnedAt || dateOf(item),
            })
        ),

        coupons: data.coupons.rows.map((item) => ({
            id: idOf(item),
            code: item.code || "—",
            type: item.type || "—",
            discount:
                item.type === "Percentage"
                    ? `${item.value}% (cap ${amount(
                        item.maxDiscount
                    )})`
                    : amount(item.value),
            used: numberOf(item.usageCount),
            limit: numberOf(item.usageLimit),
            status: couponStatus(item),
            createdAt: dateOf(item),
        })),

        reviews: data.reviews.rows.map((item) => ({
            id: idOf(item),
            product: first(
                item,
                ["productName"],
                productNames.get(item.productId) || "—"
            ),
            customer: item.customerName || "—",
            rating: numberOf(item.rating),
            title: first(
                item,
                ["title", "comment"],
                "—"
            ),
            status: statusOf(item),
            createdAt: dateOf(item),
        })),

        complaints: data.complaints.rows.map(
            (item) => ({
                id: idOf(item),
                customer: item.customer || "—",
                orderId: item.orderId || "—",
                category: label(item.category),
                subject: item.subject || "—",
                replies: Array.isArray(item.replies)
                    ? item.replies.length
                    : 0,
                status: statusOf(item),
                createdAt: dateOf(item),
            })
        ),
    };
}

// ================== CSV EXPORT ==================
function downloadCsv(rows, columns, reportName) {
    const escape = (value) => {
        let string = raw(value);

        if (/^\s*[=+\-@\t\r]/.test(string)) {
            string = `'${string}`;
        }

        return `"${string.replace(/"/g, '""')}"`;
    };

    const lines = [
        columns.map(
            (column) => escape(column.title)
        ).join(","),
    ];

    for (const row of rows) {
        lines.push(
            columns.map((column) => escape(
                column.type === "money"
                    ? amount(row[column.key])
                    : column.type === "date"
                        ? showDate(row[column.key])
                        : row[column.key]
            )).join(",")
        );
    }

    const blob = new Blob(
        ["\uFEFF", lines.join("\r\n")],
        { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
        `Zupito_${reportName}_${todayIST()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(
        () => URL.revokeObjectURL(url),
        1000
    );
}

// ================== MODULE OVERVIEW ==================
const MODULES = [
    ["sellers", "Sellers", "fa-store", "Seller onboarding and approval"],
    ["customers", "Customers / Users", "fa-users", "Registrations and account status"],
    ["agents", "Delivery Agents", "fa-motorcycle", "Agent registration and workload"],
    ["categories", "Categories", "fa-layer-group", "Category and parent listings"],
    ["products", "Products", "fa-box-open", "Listings and stock availability"],
    ["orders", "Orders", "fa-cart-shopping", "Purchases and fulfilment"],
    ["delivery", "Delivery Assignments", "fa-truck-fast", "Pickup and delivery activities"],
    ["payments", "Payments", "fa-credit-card", "Attempt results and references"],
    ["refunds", "Refunds", "fa-money-bill-transfer", "Cancellation refund records"],
    ["replacements", "Replacements", "fa-rotate", "Replacement request outcomes"],
    ["batches", "Settlements", "fa-wallet", "Prepared and confirmed batches"],
    ["coupons", "Coupons", "fa-ticket", "Campaigns and usage"],
    ["reviews", "Reviews", "fa-star", "Customer feedback and moderation"],
    ["complaints", "Complaints", "fa-headset", "Support tickets and replies"],
];

function Badge({ value }) {
    const text = label(value);
    const key = lower(text);

    const color = [
        "delivered",
        "published",
        "active",
        "approved",
        "successful",
        "confirmed (demo)",
        "completed",
        "resolved",
        "in stock",
        "eligible",
    ].includes(key)
        ? "green"
        : [
            "failed",
            "rejected",
            "cancelled",
            "hidden",
            "expired",
            "out of stock",
            "removed",
            "suspended",
        ].includes(key)
            ? "red"
            : [
                "pending",
                "flagged",
                "low stock",
                "held",
                "prepared",
                "paused",
                "open",
                "awaiting",
            ].includes(key)
                ? "orange"
                : [
                    "assigned",
                    "shipped",
                    "in progress",
                    "out for delivery",
                    "scheduled",
                ].includes(key)
                    ? "blue"
                    : "gray";

    return (
        <span className={`rpt-badge rpt-badge--${color}`}>
            <i className="fa-solid fa-circle" />
            {text}
        </span>
    );
}

// ================== ADMIN REPORTS ==================
function Reports() {
    const [snapshot, setSnapshot] = useState(loadSnapshot);

    // ================== FILTER STATE ==================
    const [period, setPeriod] = useState("month");
    const [fromDate, setFromDate] = useState(
        monthStart(todayIST())
    );
    const [toDate, setToDate] = useState(todayIST());
    const [reportType, setReportType] = useState("orders");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortMode, setSortMode] = useState("newest");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== REPORT DATA ==================
    const bounds = rangeFor(
        period,
        fromDate,
        toDate
    );

    const monthBounds = rangeFor(
        "month",
        fromDate,
        toDate
    );

    const tables = useMemo(
        () => buildTables(snapshot),
        [snapshot]
    );

    const report = REPORTS[reportType];
    const baseRows = tables[reportType];
    const isSnapshot = report.mode === "snapshot";

    const sourceMap = {
        orders: "orders",
        payments: "payments",
        refunds: "refunds",
        products: "products",
        stock: "products",
        changes: "products",
        categories: "categories",
        sellers: "sellers",
        customers: "customers",
        agents: "agents",
        delivery: "tasks",
        replacements: "replacements",
        batches: "settlements",
        earnings: "settlements",
        coupons: "coupons",
        reviews: "reviews",
        complaints: "complaints",
    };

    const source =
        snapshot[sourceMap[reportType]]?.source ||
        "Not initialized";

    const periodRows = (key, range = bounds) =>
        tables[key].filter((row) =>
            range.valid &&
            within(
                row.createdAt,
                range.start,
                range.end
            )
        );

    const periodOrders = periodRows("orders");
    const periodPayments = periodRows("payments");
    const periodRefunds = periodRows("refunds");
    const periodDelivery = periodRows("delivery");
    const periodReplacements = periodRows("replacements");
    const periodComplaints = periodRows("complaints");

    // ================== MONTHLY COUNTS ==================
    const inMonth = (rows) =>
        datedCount(rows, monthBounds);

    const monthCustomers = inMonth(tables.customers);
    const monthSellers = inMonth(tables.sellers);
    const monthProducts = inMonth(tables.products);
    const monthAgents = inMonth(tables.agents);
    const monthCoupons = inMonth(tables.coupons);

    const monthChanges = tables.changes.filter((row) =>
        within(
            row.createdAt,
            monthBounds.start,
            monthBounds.end
        )
    );

    const removedMonth = monthChanges.filter((row) =>
        /removed|deleted|unlisted|archived/i.test(
            row.action
        )
    );

    const removalTracked = tables.changes.some((row) =>
        /removed|deleted|unlisted|archived/i.test(
            row.action
        )
    );

    // ================== GENERAL METRICS ==================
    const listed = snapshot.products.rows.filter(
        isListed
    ).length;

    const unlisted = snapshot.products.rows.filter(
        isRemoved
    ).length;

    const lowStock = tables.products.filter(
        (row) => row.stock <= 5
    ).length;

    const valueOfOrders = periodOrders
        .filter((row) =>
            lower(row.status) !== "cancelled"
        )
        .reduce(
            (sum, row) => sum + row.total,
            0
        );

    const deliveredOrders = periodOrders.filter(
        (row) =>
            lower(row.status) === "delivered"
    ).length;

    const cancelledOrders = periodOrders.filter(
        (row) =>
            lower(row.status) === "cancelled"
    ).length;

    const paymentSuccess = periodPayments.filter(
        (row) =>
            lower(row.status) === "successful"
    ).length;

    const paymentFailed = periodPayments.filter(
        (row) =>
            lower(row.status) === "failed"
    ).length;

    const refundPending = periodRefunds.filter(
        (row) =>
            lower(row.status).includes("pending")
    ).length;

    const deliveryUnassigned = periodDelivery.filter(
        (row) =>
            row.agent === "Unassigned"
    ).length;

    const openComplaints = periodComplaints.filter(
        (row) =>
            ["open", "in progress"].includes(
                lower(row.status)
            )
    ).length;

    const overview = [
        {
            label: "Total Orders",
            value: count(periodOrders.length),
            subtitle:
                `${count(deliveredOrders)} delivered · ` +
                `${count(cancelledOrders)} cancelled`,
            icon: "fa-cart-shopping",
            theme: "blue",
        },
        {
            label: "Preview Order Value",
            value: amount(valueOfOrders),
            subtitle:
                "Not verified revenue · excludes cancellations",
            icon: "fa-indian-rupee-sign",
            theme: "green",
        },
        {
            label: "Currently Listed",
            value: count(listed),
            subtitle:
                `${count(unlisted)} unlisted / removed records ` +
                "· current snapshot",
            icon: "fa-box-open",
            theme: "orange",
        },
        {
            label: "Total Customers",
            value:
                snapshot.customers.source ===
                "Not initialized"
                    ? "—"
                    : count(tables.customers.length),
            subtitle:
                "New this month: " +
                numberOrNA(
                    monthCustomers.value,
                    monthCustomers.tracked
                ),
            icon: "fa-users",
            theme: "red",
        },
    ];

    // ================== MONTHLY OVERVIEW ==================
    const monthly = [
        ["New Customers", monthCustomers, "fa-user-plus"],
        ["New Sellers", monthSellers, "fa-store"],
        ["New Products", monthProducts, "fa-box-open"],
        [
            "Removed Products",
            {
                value: removedMonth.length,
                tracked: removalTracked ? 1 : 0,
            },
            "fa-box-archive",
        ],
        ["New Delivery Agents", monthAgents, "fa-motorcycle"],
        ["New Coupons", monthCoupons, "fa-ticket"],
        [
            "Complaints This Month",
            {
                value: periodRows(
                    "complaints",
                    monthBounds
                ).length,
                tracked: tables.complaints.some(
                    (row) => istDay(row.createdAt)
                ) ? 1 : 0,
            },
            "fa-headset",
        ],
        [
            "Reviews This Month",
            {
                value: periodRows(
                    "reviews",
                    monthBounds
                ).length,
                tracked: tables.reviews.some(
                    (row) => istDay(row.createdAt)
                ) ? 1 : 0,
            },
            "fa-star",
        ],
    ];

    // ================== MODULE METRICS ==================
    const moduleExtras = {
        sellers:
            `${numberOrNA(monthSellers.value, monthSellers.tracked)} ` +
            "joined this month",

        customers:
            `${numberOrNA(monthCustomers.value, monthCustomers.tracked)} ` +
            "joined this month",

        agents:
            `${numberOrNA(monthAgents.value, monthAgents.tracked)} ` +
            "added this month",

        categories:
            `${count(tables.categories.filter(
                (r) => lower(r.status) === "active"
            ).length)} active recorded`,

        products:
            `${count(lowStock)} low / out of stock`,

        orders:
            `${count(deliveredOrders)} delivered in period`,

        delivery:
            `${count(deliveryUnassigned)} unassigned in period`,

        payments:
            `${count(paymentSuccess)} successful previews · ` +
            `${count(paymentFailed)} failed`,

        refunds:
            `${count(refundPending)} pending in period`,

        replacements:
            `${count(periodReplacements.filter(
                (r) => lower(r.status) === "pending"
            ).length)} pending in period`,

        batches:
            `${count(tables.batches.filter(
                (r) => lower(r.status) === "prepared"
            ).length)} prepared`,

        coupons:
            `${count(tables.coupons.filter(
                (r) => lower(r.status) === "active"
            ).length)} active`,

        reviews:
            `${count(tables.reviews.filter(
                (r) => lower(r.status) === "flagged"
            ).length)} flagged`,

        complaints:
            `${count(openComplaints)} open / in progress in period`,
    };

    // ================== TABLE FILTERS ==================
    const statusOptions = [
        ...new Set(
            baseRows.map((row) =>
                raw(row.status)
            ).filter(Boolean)
        ),
    ].sort();

    const matching = baseRows.filter((row) => {
        if (
            !isSnapshot &&
            (
                !bounds.valid ||
                !within(
                    row.createdAt,
                    bounds.start,
                    bounds.end
                )
            )
        ) {
            return false;
        }

        if (
            statusFilter !== "All" &&
            raw(row.status) !== statusFilter
        ) {
            return false;
        }

        const term = lower(search);

        return !term || Object.values(row).some(
            (value) =>
                lower(value).includes(term)
        );
    });

    let rows = sortNewestFirst(
        matching,
        "createdAt"
    );

    if (sortMode === "oldest") {
        rows = [...rows].reverse();
    }

    if (
        sortMode === "az" ||
        sortMode === "za"
    ) {
        const key = [
            "customers",
            "sellers",
            "agents",
            "categories",
            "products",
        ].includes(reportType)
            ? "name"
            : reportType === "coupons"
                ? "code"
                : reportType === "stock"
                    ? "product"
                    : "id";

        rows = [...rows].sort(
            (a, b) =>
                lower(a[key]).localeCompare(
                    lower(b[key])
                ) * (sortMode === "az" ? 1 : -1)
        );
    }

    const visibleRows = rows.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    // ================== CHART DATA ==================
    const trendMap = new Map();

    for (const row of periodOrders) {
        const day = istDay(row.createdAt);

        if (day) {
            trendMap.set(
                day,
                (trendMap.get(day) || 0) + 1
            );
        }
    }

    const trend = [...trendMap]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-8);

    const trendMax = Math.max(
        1,
        ...trend.map(([, value]) => value)
    );

    const statusCounts = new Map();

    for (const row of periodOrders) {
        statusCounts.set(
            row.status,
            (statusCounts.get(row.status) || 0) + 1
        );
    }

    const distribution = [...statusCounts].sort(
        (a, b) => b[1] - a[1]
    );

    // ================== ACTIONS ==================
    const changeReport = (name) => {
        setReportType(name);
        setSearch("");
        setStatusFilter("All");
        setSortMode("newest");
        setPage(0);
    };

    const reset = () => {
        setPeriod("month");
        setFromDate(monthStart(todayIST()));
        setToDate(todayIST());
        setSearch("");
        setStatusFilter("All");
        setSortMode("newest");
        setReportType("orders");
        setPage(0);
    };

    const exportReport = () => {
        if (!rows.length) {
            toast.info(
                "No records available for export."
            );
            return;
        }

        downloadCsv(
            rows,
            report.columns,
            reportType
        );

        toast.success(
            "Filtered CSV exported."
        );
    };

    const formatCell = (row, column) => {
        const value = row[column.key];

        if (column.type === "money") {
            return amount(value);
        }

        if (column.type === "date") {
            return showDate(value);
        }

        if (column.type === "number") {
            return count(value);
        }

        if (column.type === "rating") {
            return `${numberOf(value)}/5`;
        }

        if (column.type === "status") {
            return <Badge value={value} />;
        }

        return raw(value) || "—";
    };

    return (
        <div className="manage-reports">
            {/* ================== HEADER ================== */}
            <section className="rpt-hero">
                <div>
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-chart-column" />
                        REPORTS & ANALYTICS
                    </span>

                    <p>
                        Complete operational reports across
                        every Zupito management module.
                    </p>
                </div>

                <Button
                    className="rpt-refresh"
                    variant="outlined"
                    startIcon={
                        <i className="fa-solid fa-arrows-rotate" />
                    }
                    onClick={() => {
                        setSnapshot(loadSnapshot());
                        setPage(0);
                        toast.info(
                            "Reports refreshed from saved preview data."
                        );
                    }}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== DATE FILTERS ================== */}
            <section className="rpt-card">
                <div className="rpt-filter-heading">
                    <div>
                        <h2>Reporting Period</h2>
                        <p>
                            Selected dates apply to activity reports;
                            current inventory and account lists
                            remain complete.
                        </p>
                    </div>

                    <Button
                        onClick={reset}
                        startIcon={
                            <i className="fa-solid fa-rotate-left" />
                        }
                    >
                        Reset
                    </Button>
                </div>

                <div className="rpt-date-filters">
                    <TextField
                        select
                        size="small"
                        label="Date Range"
                        value={period}
                        onChange={(event) => {
                            setPeriod(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="month">
                            This Month
                        </MenuItem>
                        <MenuItem value="lastMonth">
                            Last Month
                        </MenuItem>
                        <MenuItem value="7">
                            Last 7 Days
                        </MenuItem>
                        <MenuItem value="30">
                            Last 30 Days
                        </MenuItem>
                        <MenuItem value="all">
                            All Time
                        </MenuItem>
                        <MenuItem value="custom">
                            Custom Range
                        </MenuItem>
                    </TextField>

                    {period === "custom" && (
                        <>
                            <TextField
                                label="From Date"
                                size="small"
                                type="date"
                                value={fromDate}
                                onChange={(event) => {
                                    setFromDate(
                                        event.target.value
                                    );
                                    setPage(0);
                                }}
                                slotProps={{
                                    inputLabel: {
                                        shrink: true,
                                    },
                                }}
                            />

                            <TextField
                                label="To Date"
                                size="small"
                                type="date"
                                value={toDate}
                                onChange={(event) => {
                                    setToDate(
                                        event.target.value
                                    );
                                    setPage(0);
                                }}
                                slotProps={{
                                    inputLabel: {
                                        shrink: true,
                                    },
                                }}
                            />
                        </>
                    )}
                </div>

                {!bounds.valid && (
                    <Alert
                        severity="error"
                        className="rpt-inline-alert"
                    >
                        Select valid From and To dates.
                    </Alert>
                )}
            </section>

            {/* ================== MAIN STATISTICS ================== */}
            <section className="rpt-stats">
                {overview.map((item) => (
                    <article
                        className={`rpt-stat rpt-stat--${item.theme}`}
                        key={item.label}
                    >
                        <div className="rpt-stat-top">
                            <span>{item.label}</span>

                            <span className="rpt-stat-icon">
                                <i
                                    className={`fa-solid ${item.icon}`}
                                />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <p>{item.subtitle}</p>
                    </article>
                ))}
            </section>

            {/* ================== MONTHLY GROWTH ================== */}
            <section className="rpt-card">
                <div className="rpt-section-header">
                    <div className="rpt-card-title">
                        <span className="rpt-title-icon">
                            <i className="fa-solid fa-calendar-days" />
                        </span>

                        <div>
                            <h2>
                                This Month — Growth & Changes
                            </h2>
                            <p>
                                Registrations, new listings,
                                removals and support activity.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rpt-month-grid">
                    {monthly.map(([name, metric, icon]) => (
                        <div
                            className="rpt-month-item"
                            key={name}
                        >
                            <span className="rpt-month-icon">
                                <i
                                    className={`fa-solid ${icon}`}
                                />
                            </span>

                            <div>
                                <span>{name}</span>

                                <strong>
                                    {numberOrNA(
                                        metric.value,
                                        metric.tracked
                                    )}
                                </strong>

                                <small>
                                    {metric.tracked
                                        ? metric.total > metric.tracked
                                            ? "Partial timestamp coverage"
                                            : "Recorded activity"
                                        : "Not tracked in preview data"}
                                </small>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ================== ALL MODULES ================== */}
            <section className="rpt-card">
                <div className="rpt-section-header">
                    <div className="rpt-card-title">
                        <span className="rpt-title-icon">
                            <i className="fa-solid fa-layer-group" />
                        </span>

                        <div>
                            <h2>All Module Reports</h2>
                            <p>
                                Select any module for detailed records
                                and CSV export below.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rpt-module-grid">
                    {MODULES.map(([
                        key,
                        name,
                        icon,
                        description,
                    ]) => {
                        const store =
                            snapshot[sourceMap[key]];

                        const exists =
                            store?.source !== "Not initialized";

                        const total = exists
                            ? count(tables[key].length)
                            : "—";

                        return (
                            <button
                                className={
                                    `rpt-module-item ${
                                        reportType === key
                                            ? "is-selected"
                                            : ""
                                    }`
                                }
                                type="button"
                                key={key}
                                onClick={() => changeReport(key)}
                            >
                                <span className="rpt-module-icon">
                                    <i
                                        className={`fa-solid ${icon}`}
                                    />
                                </span>

                                <div>
                                    <strong>{name}</strong>
                                    <span>{description}</span>
                                    <small>
                                        {moduleExtras[key]}
                                    </small>
                                </div>

                                <span className="rpt-module-count">
                                    {total}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ================== ORDER CHARTS ================== */}
            <section className="rpt-chart-grid">
                <article className="rpt-card">
                    <div className="rpt-card-title">
                        <span className="rpt-title-icon">
                            <i className="fa-solid fa-chart-line" />
                        </span>

                        <div>
                            <h2>Order Activity</h2>
                            <p>
                                Latest 8 order dates in
                                the selected period.
                            </p>
                        </div>
                    </div>

                    {trend.length ? (
                        <div className="rpt-trend">
                            {trend.map(([day, value]) => (
                                <div
                                    className="rpt-trend-row"
                                    key={day}
                                >
                                    <span>
                                        {showDate(day)}
                                    </span>

                                    <progress
                                        value={value}
                                        max={trendMax}
                                        aria-label={
                                            `${value} orders on ${day}`
                                        }
                                    />

                                    <strong>
                                        {value}
                                    </strong>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="rpt-chart-empty">
                            No dated orders found
                            in this period.
                        </p>
                    )}
                </article>

                <article className="rpt-card">
                    <div className="rpt-card-title">
                        <span className="rpt-title-icon">
                            <i className="fa-solid fa-chart-pie" />
                        </span>

                        <div>
                            <h2>
                                Order Status Distribution
                            </h2>
                            <p>
                                Selected-period fulfilment outcomes.
                            </p>
                        </div>
                    </div>

                    {distribution.length ? (
                        <div className="rpt-status-chart">
                            {distribution.map(
                                ([status, value]) => (
                                    <div key={status}>
                                        <div className="rpt-status-label">
                                            <span>
                                                {status}
                                            </span>
                                            <strong>
                                                {value}
                                            </strong>
                                        </div>

                                        <progress
                                            value={value}
                                            max={
                                                periodOrders.length || 1
                                            }
                                            aria-label={
                                                `${status}: ${value}`
                                            }
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        <p className="rpt-chart-empty">
                            No status data for this period.
                        </p>
                    )}
                </article>
            </section>

            {/* ================== OPERATIONAL OVERVIEW ================== */}
            <section className="rpt-card">
                <div className="rpt-section-header">
                    <div className="rpt-card-title">
                        <span className="rpt-title-icon">
                            <i className="fa-solid fa-gauge-high" />
                        </span>

                        <div>
                            <h2>
                                Operational Overview
                            </h2>
                            <p>
                                Cross-module operational counts
                                for the selected period.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rpt-operations">
                    <div>
                        <span>Payment Attempts</span>
                        <strong>
                            {count(periodPayments.length)}
                        </strong>
                        <small>
                            {paymentSuccess} successful preview ·{" "}
                            {paymentFailed} failed
                        </small>
                    </div>

                    <div>
                        <span>Refund Records</span>
                        <strong>
                            {count(periodRefunds.length)}
                        </strong>
                        <small>
                            {refundPending} pending
                        </small>
                    </div>

                    <div>
                        <span>Delivery Tasks</span>
                        <strong>
                            {count(periodDelivery.length)}
                        </strong>
                        <small>
                            {deliveryUnassigned} unassigned
                        </small>
                    </div>

                    <div>
                        <span>Stock Alerts</span>
                        <strong>
                            {count(lowStock)}
                        </strong>
                        <small>
                            Current product stock ≤ 5
                        </small>
                    </div>

                    <div>
                        <span>Replacements</span>
                        <strong>
                            {count(periodReplacements.length)}
                        </strong>
                        <small>
                            Requests in period
                        </small>
                    </div>

                    <div>
                        <span>Complaints</span>
                        <strong>
                            {count(periodComplaints.length)}
                        </strong>
                        <small>
                            {openComplaints} open / in progress
                        </small>
                    </div>

                    <div>
                        <span>Coupon Redemptions</span>
                        <strong>
                            {count(
                                tables.coupons.reduce(
                                    (sum, coupon) =>
                                        sum + coupon.used,
                                    0
                                )
                            )}
                        </strong>
                        <small>
                            All-time preview usage total
                        </small>
                    </div>

                    <div>
                        <span>Settlement Batches</span>
                        <strong>
                            {count(tables.batches.length)}
                        </strong>
                        <small>
                            All-time preview batches
                        </small>
                    </div>
                </div>
            </section>

            {/* ================== DETAILED REPORTS ================== */}
            <section className="rpt-card">
                <div className="rpt-section-header">
                    <div className="rpt-card-title">
                        <span className="rpt-title-icon">
                            <i className="fa-solid fa-file-lines" />
                        </span>

                        <div>
                            <h2>Detailed Reports</h2>
                            <p>
                                Filter, inspect and export data
                                across all management sections.
                            </p>
                        </div>
                    </div>

                    <span className="rpt-record-count">
                        {rows.length} Records
                    </span>
                </div>

                {/* ================== TABLE FILTERS ================== */}
                <div className="rpt-table-toolbar rpt-table-toolbar--expanded">
                    <TextField
                        className="rpt-report-select"
                        select
                        size="small"
                        label="Report Type"
                        value={reportType}
                        onChange={(event) =>
                            changeReport(
                                event.target.value
                            )
                        }
                    >
                        {Object.entries(REPORTS).map(
                            ([key, config]) => (
                                <MenuItem
                                    key={key}
                                    value={key}
                                >
                                    {config.title}
                                </MenuItem>
                            )
                        )}
                    </TextField>

                    <TextField
                        className="rpt-search"
                        label="Search Records"
                        size="small"
                        placeholder="Search this report"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <i className="fa-solid fa-magnifying-glass" />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        fullWidth
                    />

                    <TextField
                        className="rpt-extra-filter"
                        select
                        size="small"
                        label="Record Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(
                                event.target.value
                            );
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">
                            All Statuses
                        </MenuItem>

                        {statusOptions.map((status) => (
                            <MenuItem
                                value={status}
                                key={status}
                            >
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        className="rpt-extra-filter"
                        select
                        size="small"
                        label="Sort By"
                        value={sortMode}
                        onChange={(event) => {
                            setSortMode(
                                event.target.value
                            );
                            setPage(0);
                        }}
                    >
                        <MenuItem value="newest">
                            Newest First
                        </MenuItem>

                        <MenuItem value="oldest">
                            Oldest First
                        </MenuItem>

                        <MenuItem value="az">
                            A – Z
                        </MenuItem>

                        <MenuItem value="za">
                            Z – A
                        </MenuItem>
                    </TextField>

                    <Button
                        className="rpt-export"
                        variant="contained"
                        startIcon={
                            <i className="fa-solid fa-file-csv" />
                        }
                        disabled={!rows.length}
                        onClick={exportReport}
                    >
                        Export CSV
                    </Button>
                </div>

                {/* ================== DATA SOURCE ================== */}
                <div className="rpt-source-info">
                    <i className="fa-solid fa-circle-info" />

                    {isSnapshot
                        ? "Current snapshot: date filter does not hide existing records. Use the monthly section for new registrations/listings."
                        : "Activity records are filtered by their date; this report uses saved frontend preview data."}

                    {` · Source: ${source}.`}
                </div>

                {/* ================== REPORT TABLE ================== */}
                <TableContainer className="rpt-table-scroll">
                    <Table
                        className="rpt-table"
                        aria-label={report.title}
                    >
                        <TableHead>
                            <TableRow>
                                {report.columns.map((column) => (
                                    <TableCell key={column.key}>
                                        {column.title}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleRows.map((row, index) => (
                                <TableRow
                                    key={`${row.id}-${index}`}
                                    hover
                                >
                                    {report.columns.map(
                                        (column) => (
                                            <TableCell
                                                key={column.key}
                                            >
                                                {[
                                                    "id",
                                                    "name",
                                                    "code",
                                                ].includes(
                                                    column.key
                                                ) ? (
                                                    <strong className="rpt-cell-primary">
                                                        {formatCell(
                                                            row,
                                                            column
                                                        )}
                                                    </strong>
                                                ) : (
                                                    formatCell(
                                                        row,
                                                        column
                                                    )
                                                )}
                                            </TableCell>
                                        )
                                    )}
                                </TableRow>
                            ))}

                            {!visibleRows.length && (
                                <TableRow>
                                    <TableCell
                                        colSpan={
                                            report.columns.length
                                        }
                                    >
                                        <div className="rpt-empty">
                                            <i className="fa-solid fa-chart-column" />

                                            <h3>
                                                No Records Found
                                            </h3>

                                            <p>
                                                {source ===
                                                "Not initialized"
                                                    ? "Open the corresponding Admin page to initialize its demo records."
                                                    : "Try another date range or search filter."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ================== PAGINATION ================== */}
                <TablePagination
                    className="rpt-pagination"
                    component="div"
                    count={rows.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 25, 50]}
                    onPageChange={(_, nextPage) =>
                        setPage(nextPage)
                    }
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(
                            Number(event.target.value)
                        );
                        setPage(0);
                    }}
                />
            </section>

            <Alert
                severity="info"
                className="rpt-bottom-note"
            >
                Preview reports cannot prove successful payments,
                actual bank settlements, customer notifications
                or historical deletions. Real monthly deletions
                and accurate revenue need backend audit logs,
                immutable payment records and database timestamps.
            </Alert>
        </div>
    );
}

export default Reports;
