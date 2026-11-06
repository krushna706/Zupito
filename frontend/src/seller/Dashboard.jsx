import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
    formatMoney,
    getStoreName,
    inventoryRows,
    ownProducts,
    readRows,
    sellerKey,
} from "../services/sellerService";

import { getSellerOrders } from "../services/orderService";
import { getSellerReplacements } from "../services/replacementService";

// ================== CONFIGURATION ==================
const SETTLEMENT_KEY = "zupito_admin_settlements";
const REVIEW_KEY = "zupito_admin_reviews";
const PROFILE_KEY = "zupito_seller_store_profiles";
const SELLERS_KEY = "zupito_admin_sellers";

const PERIODS = [7, 30, 90];

const ORDER_GROUPS = [
    { key: "new", label: "New", color: "#f59e0b" },
    { key: "packing", label: "Packing", color: "#2563eb" },
    { key: "ready", label: "Ready for Pickup", color: "#8b5cf6" },
    { key: "transit", label: "In Transit", color: "#06a6a6" },
    { key: "delivered", label: "Delivered", color: "#16a34a" },
    { key: "issue", label: "Delivery Issue", color: "#ef4444" },
    { key: "cancelled", label: "Cancelled", color: "#94a3b8" },
];

const STORE_FIELDS = [
    "storeName", "storeEmail", "storePhone", "address",
    "locality", "city", "state", "pincode",
];

// ================== DATA HELPERS ==================
function readObject(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key));

        return data && !Array.isArray(data) && typeof data === "object"
            ? data
            : {};
    } catch {
        return {};
    }
}

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function formatCount(value) {
    return Number(value || 0).toLocaleString("en-IN");
}

function formatDate(value) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
}

function formatCompact(value) {
    const amount = Number(value) || 0;

    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;

    return formatMoney(amount);
}

function matchesSeller(record, user, storeNames) {
    if (record.sellerId || record.sellerEmail) {
        const sameId = user?.id &&
            String(record.sellerId) === String(user.id);

        const sameEmail = user?.email &&
            normalize(record.sellerEmail) === normalize(user.email);

        return Boolean(sameId || sameEmail);
    }

    return storeNames.has(normalize(record.seller));
}

function loadDashboard(user) {
    const products = ownProducts(user);
    const inventory = inventoryRows(user);
    const orders = getSellerOrders(user);
    const replacements = getSellerReplacements(user);
    const storeName = getStoreName(user);
    const stores = readObject(PROFILE_KEY);
    const savedStore = stores[sellerKey(user)] || {};

    const seller = readRows(SELLERS_KEY).find((item) =>
        (user?.id && String(item.id) === String(user.id)) ||
        (user?.email && normalize(item.email) === normalize(user.email))
    );

    const storeProfile = {
        ...(seller || {}),
        ...savedStore,
    };

    const storeComplete = STORE_FIELDS.filter((field) =>
        String(storeProfile[field] || "").trim().length > 0
    ).length;

    const storeCompletion = Math.round(
        (storeComplete / STORE_FIELDS.length) * 100
    );

    const productIds = new Set(
        products.map((product) => String(product.id || product._id))
    );

    const reviews = readRows(REVIEW_KEY).filter((review) =>
        productIds.has(String(review.productId)) &&
        review.status === "Published"
    );

    const settlementData = readObject(SETTLEMENT_KEY);
    const storeNames = new Set([
        normalize(storeName),
        normalize(user?.storeName),
        normalize(seller?.storeName),
    ].filter(Boolean));

    const batches = (settlementData.batches || []).filter((batch) =>
        matchesSeller(batch, user, storeNames)
    );

    const allocations = (settlementData.ledger || []).filter((line) =>
        matchesSeller(line, user, storeNames)
    );

    const savedThreshold = Number(
        localStorage.getItem(
            `zupito_seller_stock_alert_${sellerKey(user)}`
        )
    );

    const threshold = Number.isInteger(savedThreshold) &&
        savedThreshold >= 1 && savedThreshold <= 100
        ? savedThreshold
        : 5;

    return {
        products,
        inventory,
        orders,
        replacements,
        reviews,
        batches,
        allocations,
        threshold,
        storeName,
        storeCompletion,
        refreshedAt: new Date(),
    };
}

// ================== ORDER HELPERS ==================
function orderGroup(status) {
    const value = normalize(status);

    if (["confirmed", "placed", "processing"].includes(value)) {
        return "new";
    }

    if (["packing", "packed"].includes(value)) {
        return "packing";
    }

    if (["ready_for_pickup", "assigned"].includes(value)) {
        return "ready";
    }

    if (value === "delivered") {
        return "delivered";
    }

    if (["failed", "delivery_failed", "retry"].includes(value)) {
        return "issue";
    }

    if (["cancelled", "canceled"].includes(value)) {
        return "cancelled";
    }

    return "transit";
}

function inPeriod(value, days, now) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return false;

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);

    return date >= start && date <= now;
}

function buildTrend(orders, days, now) {
    const count = days === 7 ? 7 : 6;
    const step = Math.ceil(days / count);
    const start = new Date(now);

    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);

    return Array.from({ length: count }, (_, index) => {
        const from = new Date(start);
        from.setDate(from.getDate() + index * step);

        const to = new Date(from);
        to.setDate(to.getDate() + step);

        const amount = orders.reduce((total, order) => {
            const date = new Date(order.createdAt);

            return date >= from && date < to
                ? total + Number(order.amount || 0)
                : total;
        }, 0);

        return {
            label: from.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
            }),
            amount,
        };
    });
}

function getSummary(data, period) {
    const {
        products, inventory, orders, replacements, reviews,
        batches, allocations, threshold, refreshedAt,
    } = data;

    const selectedOrders = orders.filter((order) =>
        inPeriod(order.createdAt, period, refreshedAt)
    );

    const grossValue = selectedOrders.reduce((total, order) =>
        total + Number(order.amount || 0),
    0);

    const deliveredOrders = selectedOrders.filter((order) =>
        orderGroup(order.status) === "delivered"
    );


    const openOrders = orders.filter((order) =>
        ["new", "packing", "ready", "issue"].includes(
            orderGroup(order.status)
        )
    );

    const stockAlerts = inventory.filter((item) =>
        item.available <= threshold
    );

    const pendingApproval = products.filter((product) =>
        product.status === "Pending"
    );

    const approvedProducts = products.filter((product) =>
        product.status === "Approved"
    );

    const needsReply = reviews.filter((review) =>
        !(typeof review.sellerReply === "string"
            ? review.sellerReply.trim()
            : review.sellerReply?.text?.trim())
    );

    const replacementActions = replacements.filter((request) =>
        (
            request.status === "Pending" &&
            (request.sellerDecision || "Awaiting") === "Awaiting"
        ) || (
            request.status === "Inspection" &&
            request.pickupTask?.stage === "delivered" &&
            !request.inspectedAt
        ) || (
            request.status === "Inspection" &&
            request.inspectedAt &&
            !request.deliveryTask
        )
    );

    const preparedBatches = batches.filter((batch) =>
        batch.status === "Prepared"
    );

    const confirmedBatches = batches.filter((batch) =>
        batch.status === "Confirmed (Demo)"
    );

    const preparedAmount = preparedBatches.reduce((total, batch) =>
        total + Number(batch.payable || 0),
    0) / 100;

    const confirmedAmount = confirmedBatches.reduce((total, batch) =>
        total + Number(batch.payable || 0),
    0) / 100;

    const averageRating = reviews.length
        ? reviews.reduce((total, review) =>
            total + Number(review.rating || 0),
        0) / reviews.length
        : null;

    const orderDistribution = ORDER_GROUPS.map((group) => ({
        ...group,
        count: selectedOrders.filter((order) =>
            orderGroup(order.status) === group.key
        ).length,
    }));

    const totalOnHand = inventory.reduce((total, item) =>
        total + Number(item.onHand || 0),
    0);

    const totalReserved = inventory.reduce((total, item) =>
        total + Number(item.reserved || 0),
    0);

    const attention = openOrders.length + stockAlerts.length +
        pendingApproval.length + replacementActions.length + needsReply.length;

    return {
        selectedOrders,
        grossValue,
        deliveredOrders,
        openOrders,
        stockAlerts,
        pendingApproval,
        approvedProducts,
        needsReply,
        replacementActions,
        preparedBatches,
        confirmedBatches,
        preparedAmount,
        confirmedAmount,
        averageRating,
        orderDistribution,
        totalOnHand,
        totalReserved,
        attention,
        totalAllocations: allocations.length,
        trend: buildTrend(selectedOrders, period, refreshedAt),
        recentOrders: [...orders]
            .sort((first, second) =>
                new Date(second.createdAt) - new Date(first.createdAt)
            )
            .slice(0, 5),
        stockWatch: [...inventory]
            .sort((first, second) => first.available - second.available)
            .slice(0, 5),
    };
}

// ================== SHARED COMPONENTS ==================
function Icon({ name }) {
    return <i className={`fa-solid ${name}`} aria-hidden="true" />;
}

function SectionHeading({ icon, title, subtitle, to, linkText = "View All" }) {
    return (
        <div className="zd-heading">
            <div>
                <h2><Icon name={icon} /> {title}</h2>
                <p>{subtitle}</p>
            </div>

            {to && (
                <Link to={to} className="zd-view-all">
                    {linkText} <Icon name="fa-arrow-right" />
                </Link>
            )}
        </div>
    );
}

function TrendChart({ points }) {
    const width = 680;
    const height = 240;
    const left = 62;
    const right = 20;
    const bottom = 204;
    const top = 24;
    const max = Math.max(0, ...points.map((point) => point.amount));
    const ceiling = max || 1;

    const positions = points.map((point, index) => ({
        ...point,
        x: left + index * (width - left - right) /
            Math.max(points.length - 1, 1),
        y: bottom - point.amount / ceiling * (bottom - top),
    }));

    const line = positions.map((point, index) =>
        `${index ? "L" : "M"}${point.x},${point.y}`
    ).join(" ");

    const area = positions.length
        ? `${line} L${positions.at(-1).x},${bottom} ` +
          `L${positions[0].x},${bottom} Z`
        : "";

    return (
        <div className="zd-chart-wrap">
            {!max && <span className="zd-chart-empty">No parcel value in this period</span>}

            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Paid parcel value by order date">
                <defs>
                    <linearGradient id="sdb-trend-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#285cf5" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="#285cf5" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                    <g key={tick}>
                        <line
                            x1={left}
                            x2={width - right}
                            y1={bottom - tick * (bottom - top)}
                            y2={bottom - tick * (bottom - top)}
                            className="zd-grid-line"
                        />

                        <text
                            x={left - 9}
                            y={bottom - tick * (bottom - top) + 4}
                            className="zd-axis-text"
                            textAnchor="end"
                        >
                            {formatCompact(ceiling * tick)}
                        </text>
                    </g>
                ))}

                <path d={area} fill="url(#sdb-trend-gradient)" />
                <path
                    d={line}
                    className="zd-sales-line"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength="100"
                />

                {positions.map((point, index) => (
                    <g key={index}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#fff"
                            stroke="#2563eb"
                            strokeWidth="2"
                        >
                            <title>{`${point.label}: ${formatMoney(point.amount)}`}</title>
                        </circle>

                        <text
                            x={point.x}
                            y="231"
                            textAnchor="middle"
                            className="zd-axis-text"
                        >
                            {point.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

function OrderDonut({ segments, total }) {
    const radius = 44;
    const length = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="zd-donut">
            <svg viewBox="0 0 128 128" role="img" aria-label="Parcel status distribution">
                <circle cx="64" cy="64" r={radius} fill="none" stroke="#eef2f7" strokeWidth="13" />

                {segments.map((segment) => {
                    const amount = total
                        ? segment.count / total * length
                        : 0;

                    const start = offset;
                    offset += amount;

                    return (
                        <circle
                            key={segment.key}
                            cx="64"
                            cy="64"
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="13"
                            strokeDasharray={`${amount} ${length - amount}`}
                            strokeDashoffset={-start}
                            transform="rotate(-90 64 64)"
                        >
                            <title>{`${segment.label}: ${segment.count}`}</title>
                        </circle>
                    );
                })}
            </svg>

            <div className="zd-donut-label">
                <strong>{formatCount(total)}</strong>
                <small>Parcels</small>
            </div>
        </div>
    );
}

function ProgressRing({ label, value, detail, icon, color, hasData }) {
    const progress = Math.max(0, Math.min(100, Number(value) || 0));

    return (
        <div className="zd-ring-card">
            <div>
                <span className="zd-ring-icon"><Icon name={icon} /></span>
                <strong>{label}</strong>
                <small>{detail}</small>
            </div>

            <div className="zd-mini-ring">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#edf1f7" strokeWidth="9" />
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={color}
                        strokeWidth="9"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray={`${progress} ${100 - progress}`}
                        className="zd-ring-progress"
                        transform="rotate(-90 50 50)"
                    />
                </svg>

                <b>{hasData ? `${Math.round(progress)}%` : "—"}</b>
            </div>
        </div>
    );
}

function OrderBadge({ status }) {
    const group = orderGroup(status);
    const label = ORDER_GROUPS.find((item) => item.key === group)?.label || "In Transit";

    return (
        <span className={`zd-order-status sd-order-status-${group}`}>
            {label}
        </span>
    );
}

// ================== SELLER DASHBOARD ==================
function Dashboard({ user }) {
    const [data, setData] = useState(() => loadDashboard(user));
    const [period, setPeriod] = useState(30);

    const refresh = () => setData(loadDashboard(user));

    useEffect(() => {
        const sync = () => setData(loadDashboard(user));

        sync();
        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user?.id, user?.email]);

    const summary = useMemo(() =>
        getSummary(data, period),
    [data, period]);

    const firstName = String(
        user?.name || user?.fullName || "Seller"
    ).trim().split(/\s+/)[0];

    const kpis = [
        {
            label: "Listed Products",
            value: data.products.length,
            note: "All your product listings",
            icon: "fa-box-open",
            path: "products",
        },
        {
            label: "Paid Parcels",
            value: summary.selectedOrders.length,
            note: `Orders placed in last ${period} days`,
            icon: "fa-bag-shopping",
            path: "orders",
        },
        {
            label: "Parcel Value",
            value: formatCompact(summary.grossValue),
            note: "Gross paid parcel value · not earnings",
            icon: "fa-chart-line",
            path: "orders",
        },
        {
            label: "Delivered",
            value: summary.deliveredOrders.length,
            note: "Period orders currently delivered",
            icon: "fa-circle-check",
            path: "orders",
        },
        {
            label: "Stock Alerts",
            value: summary.stockAlerts.length,
            note: "Low and out-of-stock SKUs",
            icon: "fa-boxes-stacked",
            path: "inventory",
        },
        {
            label: "Prepared Payout",
            value: formatCompact(summary.preparedAmount),
            note: "Awaiting Admin confirmation · demo",
            icon: "fa-wallet",
            path: "earnings",
        },
        {
            label: "Replacement Actions",
            value: summary.replacementActions.length,
            note: "Requests needing seller action",
            icon: "fa-arrow-right-arrow-left",
            path: "replacements",
        },
        {
            label: "Customer Rating",
            value: summary.averageRating === null
                ? "—"
                : `${summary.averageRating.toFixed(1)}/5`,
            note: `${data.reviews.length} genuine published review(s)`,
            icon: "fa-star",
            path: "reviews",
        },
    ];

    const actions = [
        {
            label: "Orders to Pack",
            count: data.orders.filter((item) =>
                orderGroup(item.status) === "new"
            ).length,
            icon: "fa-box",
            path: "orders",
        },
        {
            label: "Packing in Progress",
            count: data.orders.filter((item) =>
                orderGroup(item.status) === "packing"
            ).length,
            icon: "fa-box-open",
            path: "orders",
        },
        {
            label: "Ready for Pickup",
            count: data.orders.filter((item) =>
                orderGroup(item.status) === "ready"
            ).length,
            icon: "fa-truck-ramp-box",
            path: "orders",
        },
        {
            label: "Delivery Issues",
            count: data.orders.filter((item) =>
                orderGroup(item.status) === "issue"
            ).length,
            icon: "fa-triangle-exclamation",
            path: "orders",
        },
        {
            label: "Product Approvals",
            count: summary.pendingApproval.length,
            icon: "fa-clock",
            path: "approval-status",
        },
        {
            label: "Stock Alerts",
            count: summary.stockAlerts.length,
            icon: "fa-triangle-exclamation",
            path: "inventory",
        },
        {
            label: "Replacement Actions",
            count: summary.replacementActions.length,
            icon: "fa-arrow-right-arrow-left",
            path: "replacements",
        },
        {
            label: "Reviews Awaiting Reply",
            count: summary.needsReply.length,
            icon: "fa-reply",
            path: "reviews",
        },
    ];

    const moduleOverview = [
        {
            label: "Manage Products",
            value: formatCount(data.products.length),
            icon: "fa-box-open",
            path: "products",
        },
        {
            label: "Approval Status",
            value: formatCount(summary.pendingApproval.length),
            icon: "fa-circle-check",
            path: "approval-status",
        },
        {
            label: "Store Profile",
            value: `${data.storeCompletion}%`,
            icon: "fa-store",
            path: "store",
        },
        {
            label: "Inventory",
            value: formatCount(data.inventory.length),
            icon: "fa-boxes-stacked",
            path: "inventory",
        },
        {
            label: "Manage Orders",
            value: formatCount(data.orders.length),
            icon: "fa-cart-shopping",
            path: "orders",
        },
        {
            label: "Replacements",
            value: formatCount(data.replacements.length),
            icon: "fa-arrow-right-arrow-left",
            path: "replacements",
        },
        {
            label: "Earnings",
            value: formatCount(summary.preparedBatches.length),
            icon: "fa-wallet",
            path: "earnings",
        },
        {
            label: "Reviews",
            value: formatCount(data.reviews.length),
            icon: "fa-star",
            path: "reviews",
        },
        {
            label: "My Profile",
            value: "Account",
            icon: "fa-user",
            path: "profile",
        },
    ];

    const deliveryRate = summary.selectedOrders.length
        ? summary.deliveredOrders.length / summary.selectedOrders.length * 100
        : 0;

    const approvalRate = data.products.length
        ? summary.approvedProducts.length / data.products.length * 100
        : 0;

    const replyRate = data.reviews.length
        ? (data.reviews.length - summary.needsReply.length) / data.reviews.length * 100
        : 0;

    return (
        <main className="zd-dashboard seller-dashboard">
            {/* ================== PAGE HEADER ================== */}
            <header className="zd-topbar">
                <div>
                    <h1 className="zd-page-title"><Icon name="fa-gauge-high" /> DASHBOARD</h1>
                    <p>Your store performance and daily operations in one place.</p>
                </div>

                <div className="zd-tools">
                    <label className="zd-period">
                        <Icon name="fa-calendar-days" />
                        <select
                            value={period}
                            onChange={(event) => setPeriod(Number(event.target.value))}
                            aria-label="Dashboard reporting period"
                        >
                            {PERIODS.map((days) => (
                                <option value={days} key={days}>Last {days} Days</option>
                            ))}
                        </select>
                    </label>

                    <button type="button" onClick={refresh} className="zd-refresh">
                        <Icon name="fa-arrows-rotate" /> Refresh
                    </button>
                </div>
            </header>

            {/* ================== WELCOME BANNER ================== */}
            <section className="zd-welcome">
                <div className="zd-welcome-copy">

                    <h2>Welcome back, <span>{firstName}.</span></h2>
                    <p>
                        Manage {data.storeName}, stay ahead of new orders,
                        monitor inventory and follow your store's growth.
                    </p>

                    <a href="#sdb-actions" className="zd-welcome-link">
                        Review seller actions <Icon name="fa-arrow-right" />
                    </a>
                </div>

                <div className="zd-welcome-stat">
                    <span><Icon name="fa-bell" /> Pending Actions</span>
                    <strong>{formatCount(summary.attention)}</strong>
                    <small>Items needing your attention</small>
                </div>
            </section>

            {/* ================== KPI OVERVIEW ================== */}
            <section className="zd-cards" aria-label="Seller dashboard statistics">
                {kpis.map(({ label, value, note, icon, path }, index) => (
                    <Link
                        key={label}
                        to={`/manage/${path}`}
                        className={`zd-kpi zd-kpi-${index}`}
                    >
                        <div className="zd-kpi-head">
                            <span>{label}</span>
                            <span className="zd-kpi-icon"><Icon name={icon} /></span>
                        </div>

                        <strong title={String(value)}>{typeof value === "number" ? formatCount(value) : value}</strong>
                        <small>{note}</small>
                    </Link>
                ))}
            </section>

            {/* ================== GRAPHS ================== */}
            <div className="zd-chart-layout">
                <section className="zd-panel">
                    <SectionHeading
                        icon="fa-chart-line"
                        title="Paid Order Trend"
                        subtitle={`Gross paid parcel value by order date · Last ${period} days`}
                    />

                    <div className="zd-revenue">
                        <strong>{formatMoney(summary.grossValue)}</strong>
                        <span>Not seller earnings or settled payout</span>
                    </div>

                    <TrendChart points={summary.trend} />
                </section>

                <section className="zd-panel">
                    <SectionHeading
                        icon="fa-chart-pie"
                        title="Order Distribution"
                        subtitle={`Current parcel stages · Orders placed in last ${period} days`}
                    />

                    <OrderDonut
                        segments={summary.orderDistribution}
                        total={summary.selectedOrders.length}
                    />

                    <div className="zd-legend">
                        {summary.orderDistribution.map((group) => (
                            <div key={group.key}>
                                <span>
                                    <i className={`zd-dot sd-legend-${group.key}`} />
                                    {group.label}
                                </span>
                                <strong>{formatCount(group.count)}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* ================== PERFORMANCE INDICATORS ================== */}
            <section className="zd-section">
                <SectionHeading
                    icon="fa-chart-simple"
                    title="Store Performance Indicators"
                    subtitle="Fulfilment, listing approval and customer response performance"
                />

                <div className="zd-rings">
                    <ProgressRing
                        label="Order Fulfilment"
                        value={deliveryRate}
                        detail="Period orders currently delivered"
                        icon="fa-truck-fast"
                        color="#16a34a"
                        hasData={summary.selectedOrders.length > 0}
                    />

                    <ProgressRing
                        label="Approved Listings"
                        value={approvalRate}
                        detail={`${summary.approvedProducts.length} approved of ${data.products.length} listings`}
                        icon="fa-circle-check"
                        color="#285cf5"
                        hasData={data.products.length > 0}
                    />

                    <ProgressRing
                        label="Review Response"
                        value={replyRate}
                        detail={`${summary.needsReply.length} published review(s) need replies`}
                        icon="fa-comments"
                        color="#ff6a00"
                        hasData={data.reviews.length > 0}
                    />
                </div>
            </section>

            {/* ================== ACTIONS AND MODULE OVERVIEW ================== */}
            <div className="zd-lists" id="sdb-actions">
                <section className="zd-panel">
                    <SectionHeading
                        icon="fa-list-check"
                        title="Action Required"
                        subtitle="Operational tasks waiting for your attention"
                    />

                    <div className="zd-action-list">
                        {actions.map(({ label, count, icon, path }) => (
                            <Link
                                key={label}
                                to={`/manage/${path}`}
                                className="zd-list-row"
                            >
                                <span className="zd-row-icon"><Icon name={icon} /></span>
                                <span>{label}</span>
                                <strong className={count ? "zd-count-active" : ""}>{formatCount(count)}</strong>
                                <Icon name="fa-chevron-right" />
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="zd-panel">
                    <SectionHeading
                        icon="fa-border-all"
                        title="Module Overview"
                        subtitle="Quick access to every Seller sidebar section"
                    />

                    <div className="zd-action-list">
                        {moduleOverview.map(({ label, value, icon, path }) => (
                            <Link
                                key={path}
                                to={`/manage/${path}`}
                                className="zd-list-row"
                            >
                                <span className="zd-row-icon"><Icon name={icon} /></span>
                                <span>{label}</span>
                                <strong>{value}</strong>
                                <Icon name="fa-chevron-right" />
                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            {/* ================== INVENTORY AND EARNINGS ================== */}
            <div className="zd-lists">
                <section className="zd-panel">
                    <SectionHeading
                        icon="fa-boxes-stacked"
                        title="Inventory Watchlist"
                        subtitle={`Lowest available stock · Alert at ${data.threshold} units`}
                        to="/manage/inventory"
                        linkText="Manage Stock"
                    />

                    <div className="sd-stock-list">
                        {summary.stockWatch.map((item) => (
                            <Link
                                key={item.key}
                                to="/manage/inventory"
                                className="sd-stock-row"
                            >
                                {item.image ? (
                                    <img src={item.image} alt="" />
                                ) : (
                                    <span className="sd-stock-placeholder"><Icon name="fa-image" /></span>
                                )}

                                <div>
                                    <strong>{item.name}</strong>
                                    <small>{item.sku} · {item.variant}</small>
                                </div>

                                <span className={item.available <= data.threshold ? "is-low" : ""}>
                                    {formatCount(item.available)} available
                                </span>
                            </Link>
                        ))}

                        {!summary.stockWatch.length && (
                            <p className="zd-empty-row">No stock records available.</p>
                        )}
                    </div>

                    <div className="sd-stock-summary">
                        <span>On Hand: <strong>{formatCount(summary.totalOnHand)}</strong></span>
                        <span>Reserved: <strong>{formatCount(summary.totalReserved)}</strong></span>
                    </div>
                </section>

                <section className="zd-panel">
                    <SectionHeading
                        icon="fa-wallet"
                        title="Earnings & Settlements"
                        subtitle="Admin-managed financial allocations · Frontend demo"
                        to="/manage/earnings"
                        linkText="View Earnings"
                    />

                    <div className="sd-finance-grid">
                        <div>
                            <span>Prepared Payout</span>
                            <strong>{formatMoney(summary.preparedAmount)}</strong>
                            <small>{summary.preparedBatches.length} batch(es) awaiting confirmation</small>
                        </div>

                        <div>
                            <span>Confirmed (Demo)</span>
                            <strong>{formatMoney(summary.confirmedAmount)}</strong>
                            <small>{summary.confirmedBatches.length} recorded settlement(s)</small>
                        </div>
                    </div>

                    <div className="sd-finance-footer">
                        <span><Icon name="fa-receipt" /> {formatCount(summary.totalAllocations)} financial allocation(s)</span>
                        <span>Confirmed (Demo) is not a real transfer.</span>
                    </div>
                </section>
            </div>

            {/* ================== RECENT ORDERS ================== */}
            <section className="zd-panel zd-orders-panel">
                <SectionHeading
                    icon="fa-clock-rotate-left"
                    title="Recent Seller Orders"
                    subtitle="Latest paid parcels assigned to your store"
                    to="/manage/orders"
                />

                <div className="zd-table-wrap">
                    <table className="zd-table">
                        <thead>
                            <tr>
                                <th>Order / Parcel</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Value</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {summary.recentOrders.map((order) => (
                                <tr key={`${order.orderId}-${order.parcelId}`}>
                                    <td>
                                        <strong className="zd-order-id">{order.orderId}</strong>
                                        <small>{order.parcelId}</small>
                                    </td>

                                    <td>{order.customerName || "Customer"}</td>
                                    <td>{formatDate(order.createdAt)}</td>
                                    <td><strong>{formatMoney(order.amount)}</strong></td>
                                    <td><OrderBadge status={order.status} /></td>
                                    <td>
                                        <Link
                                            className="zd-view-all"
                                            to={`/manage/orders/${encodeURIComponent(order.orderId)}/${encodeURIComponent(order.parcelId)}`}
                                        >
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}

                            {!summary.recentOrders.length && (
                                <tr>
                                    <td colSpan="6" className="zd-empty-row">
                                        No paid seller orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <p className="sd-footnote">
                Figures use existing frontend records. Demo orders and settlements are
                simulations, not real payments. Last refreshed: {data.refreshedAt.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                })}.
            </p>
        </main>
    );
}

export default Dashboard;
