import api from "../services/api";
import { toast } from "react-toastify";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const KEYS = {
    sellers: "zupito_admin_sellers",
    customers: "zupito_admin_customers",
    users: "zupito_admin_users",
    agents: "zupito_admin_delivery_agents",
    categories: "zupito_admin_categories",
    products: "zupito_admin_products",
    orders: "zupito_admin_orders",
    assignments: "zupito_admin_delivery_assignments",
    payments: "zupito_admin_payments",
    refunds: "zupito_admin_refunds",
    replacements: "zupito_admin_replacements",
    settlements: "zupito_admin_settlements",
    coupons: "zupito_admin_coupons",
    reviews: "zupito_admin_reviews",
    complaints: "zupito_admin_complaints",
};

const PERIODS = {
    7: "7 Days",
    30: "30 Days",
    90: "90 Days",
    365: "12 Months",
};

const COLORS = ["#f59e0b", "#2563eb", "#8b5cf6", "#16a34a", "#ef4444", "#94a3b8"];

const format = (value) => Number(value || 0).toLocaleString("en-IN");
const money = (value) => `₹${format(Math.round(value || 0))}`;

const compact = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return money(value);
};

const field = (item, ...keys) =>
    keys
        .map((key) => key.split(".").reduce((obj, part) => obj?.[part], item))
        .find((value) => value !== undefined && value !== null && value !== "");

const number = (value) => Number(String(value ?? 0).replace(/[₹,\s]/g, "")) || 0;
const clean = (value) =>
    String(value ?? "")
        .toLowerCase()
        .replace(/[\s_-]/g, "");
const status = (item) => clean(field(item, "orderStatus", "status", "state"));

const date = (value) => {
    const result = value ? new Date(value) : null;
    return result && !Number.isNaN(result.getTime()) ? result : null;
};

const itemDate = (item) =>
    date(field(item, "paidAt", "createdAt", "orderDate", "placedAt", "date", "updatedAt"));

const total = (item) =>
    number(
        field(
            item,
            "totalAmount",
            "grandTotal",
            "finalAmount",
            "paidAmount",
            "total",
            "amount",
            "pricing.total"
        )
    );

const isPaid = (item) =>
    ["paid", "successful", "success", "captured", "completed", "verified", "settled"].includes(
        clean(field(item, "payment.status", "paymentStatus", "status"))
    );

const pending = (item) =>
    ["pending", "pendingapproval", "submitted", "underreview", "requested", "inreview"].includes(
        status(item)
    );

const empty = () => Object.fromEntries(Object.keys(KEYS).map((key) => [key, []]));
const load = async () => ({ ...empty(), ...(await api.get("/reports")).data.snapshot });

const orderType = (item) => {
    const value = status(item);

    if (value.includes("cancel") || value === "failed") return 4;
    if (value === "delivered") return 3;

    if (["shipped", "intransit", "outfordelivery", "dispatched", "pickedup"].includes(value)) {
        return 2;
    }

    if (
        ["confirmed", "accepted", "processing", "packing", "packed", "readyforpickup"].includes(
            value
        )
    ) {
        return 1;
    }

    return ["placed", "pending", "submitted"].includes(value) ? 0 : 5;
};

const stockOf = (item) => {
    const direct = field(item, "stock", "stockQuantity", "quantity", "inventory.stock");

    if (direct !== undefined && typeof direct !== "object") {
        return number(direct);
    }

    const stocks = (Array.isArray(item.variants) ? item.variants : [])
        .map((variant) => field(variant, "stock", "stockQuantity", "quantity"))
        .filter((value) => value !== undefined);

    return stocks.length ? stocks.reduce((sum, value) => sum + number(value), 0) : null;
};

const periodMatch = (value, days, now) => {
    const stamp = date(value);
    if (!stamp) return false;

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);

    return stamp >= start && stamp <= now;
};

const buildTrend = (sales, days, now) => {
    const count = days === 7 ? 7 : days === 365 ? 12 : 6;
    const step = Math.ceil(days / count);
    const first = new Date(now);

    first.setHours(0, 0, 0, 0);
    first.setDate(first.getDate() - days + 1);

    return Array.from({ length: count }, (_, index) => {
        const start = new Date(first);
        start.setDate(start.getDate() + index * step);

        const end = new Date(start);
        end.setDate(end.getDate() + step);

        return {
            label: start.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
            }),
            value: sales
                .filter((sale) => sale.date >= start && sale.date < end)
                .reduce((sum, sale) => sum + sale.amount, 0),
        };
    });
};

function Icon({ name }) {
    return <i className={`fa-solid ${name}`} aria-hidden="true" />;
}

function Heading({ icon, title, subtitle, action }) {
    return (
        <div className="zd-heading">
            <div className="zd-heading-text">
                <h2>
                    <Icon name={icon} /> {title}
                </h2>
                <p>{subtitle}</p>
            </div>
            {action}
        </div>
    );
}

function SalesChart({ points }) {
    const width = 680;
    const height = 240;
    const left = 52;
    const bottom = 208;
    const max = Math.max(...points.map((point) => point.value), 0);
    const ceiling = max || 1;

    const coords = points.map((point, index) => ({
        ...point,
        x: left + (index * (width - left - 15)) / Math.max(points.length - 1, 1),
        y: bottom - (point.value / ceiling) * 174,
    }));

    const line = coords
        .map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`)
        .join(" ");

    const area = coords.length
        ? `${line} L${coords.at(-1).x},${bottom} L${coords[0].x},${bottom} Z`
        : "";

    return (
        <div className="zd-chart-wrap">
            {!max && <span className="zd-chart-empty">No paid sales in this period</span>}

            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Paid revenue trend">
                <defs>
                    <linearGradient id="zd-sales-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity=".25" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                    <g key={tick}>
                        <line
                            x1={left}
                            x2={width - 10}
                            y1={bottom - tick * 174}
                            y2={bottom - tick * 174}
                            className="zd-grid-line"
                        />

                        <text
                            x="46"
                            y={bottom - tick * 174 + 4}
                            textAnchor="end"
                            className="zd-axis-text"
                        >
                            {compact(ceiling * tick)}
                        </text>
                    </g>
                ))}

                <path d={area} fill="url(#zd-sales-fill)" />

                <path
                    d={line}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    pathLength="100"
                    className="zd-sales-line"
                />

                {coords.map((point, index) => (
                    <g key={index}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#fff"
                            stroke="#2563eb"
                            strokeWidth="2"
                        >
                            <title>{`${point.label}: ${money(point.value)}`}</title>
                        </circle>

                        <text x={point.x} y="231" textAnchor="middle" className="zd-axis-text">
                            {point.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

function Donut({ segments, totalValue, label, value }) {
    const perimeter = 2 * Math.PI * 43;

    return (
        <div className="zd-donut">
            <svg viewBox="0 0 120 120" role="img" aria-label={`${label}: ${value}`}>
                <circle cx="60" cy="60" r="43" stroke="#eef2f7" strokeWidth="12" fill="none" />

                {segments.map((item, index) => {
                    const length = totalValue ? (item.value / totalValue) * perimeter : 0;

                    const start = totalValue
                        ? (segments.slice(0, index).reduce((sum, entry) => sum + entry.value, 0) /
                              totalValue) *
                          perimeter
                        : 0;

                    return (
                        <circle
                            key={index}
                            cx="60"
                            cy="60"
                            r="43"
                            stroke={item.color}
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${length} ${perimeter - length}`}
                            strokeDashoffset={-start}
                            transform="rotate(-90 60 60)"
                            className="zd-donut-slice"
                        >
                            <title>{`${item.name}: ${format(item.value)}`}</title>
                        </circle>
                    );
                })}
            </svg>

            <div className="zd-donut-label">
                <strong>{value}</strong>
                <span>{label}</span>
            </div>
        </div>
    );
}

function RingCard({ icon, title, value, percent, detail, color }) {
    return (
        <div className="zd-ring-card">
            <div>
                <span className="zd-ring-icon">
                    <Icon name={icon} />
                </span>
                <strong>{title}</strong>
                <small>{detail}</small>
            </div>

            <div className="zd-mini-ring">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#eef2f7" strokeWidth="9" />

                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={color}
                        strokeWidth="9"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray={`${percent} ${100 - percent}`}
                        transform="rotate(-90 50 50)"
                        className="zd-ring-progress"
                    />
                </svg>

                <b>{value}</b>
            </div>
        </div>
    );
}

function Dashboard({ user }) {
    const fullName = field(user, "name", "fullName", "displayName") || "Admin";
    const firstName = String(fullName).trim().split(/\s+/)[0];

    const [data, setData] = useState(empty);
    const [period, setPeriod] = useState(30);
    const [updated, setUpdated] = useState(() => new Date());

    const refresh = async () => {
        try {
            setData(await load());
            setUpdated(new Date());
        } catch (error) {
            toast.error(error.message);
        }
    };
    useEffect(() => {
        void refresh();
    }, []);

    const summary = useMemo(() => {
        const {
            orders,
            payments,
            sellers,
            products,
            customers,
            assignments,
            refunds,
            replacements,
            settlements,
            agents,
            reviews,
            complaints,
            coupons,
            categories,
        } = data;

        const periodOrders = orders.filter((order) =>
            periodMatch(itemDate(order), period, updated)
        );

        const paidRecords = payments.length ? payments.filter(isPaid) : orders.filter(isPaid);

        const sales = paidRecords
            .map((item) => ({ amount: total(item), date: itemDate(item) }))
            .filter((item) => item.date);

        const periodSales = sales.filter((item) => periodMatch(item.date, period, updated));

        const revenue = periodSales.reduce((sum, item) => sum + item.amount, 0);

        const groups = [
            "Pending",
            "Processing",
            "In Transit",
            "Delivered",
            "Cancelled",
            "Other",
        ].map((name, index) => ({
            name,
            color: COLORS[index],
            value: periodOrders.filter((order) => orderType(order) === index).length,
        }));

        const delivered = groups[3].value;

        const assignedIds = new Set(
            assignments.map((item) => String(field(item, "orderId", "order.id") ?? ""))
        );

        const unassigned = assignments.filter(
            (item) =>
                !field(item, "agentId", "deliveryAgentId", "agent.id") &&
                !["completed", "delivered", "cancelled"].includes(status(item))
        ).length;

        const readyOrders = orders.filter(
            (order) =>
                status(order) === "readyforpickup" &&
                !assignedIds.has(String(field(order, "id", "_id", "orderId") ?? ""))
        ).length;

        const stockAlerts = products.filter((item) => {
            const stock = stockOf(item);

            return stock !== null && stock <= number(field(item, "lowStockThreshold") ?? 5);
        }).length;

        const ratingValues = reviews
            .map((item) => number(field(item, "rating", "stars", "score")))
            .filter((value) => value >= 1 && value <= 5);

        const rating = ratingValues.length
            ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
            : 0;

        const actions = [
            ["Seller Approvals", "fa-store", sellers.filter(pending).length, "sellers"],
            ["Product Approvals", "fa-box-open", products.filter(pending).length, "products"],
            ["Delivery Assignments", "fa-truck-fast", unassigned + readyOrders, "assignments"],
            ["Inventory Alerts", "fa-boxes-stacked", stockAlerts, "products"],
            [
                "Replacement Requests",
                "fa-rotate",
                replacements.filter(pending).length,
                "replacements",
            ],
            [
                "Refund Requests",
                "fa-money-bill-transfer",
                refunds.filter(pending).length,
                "refunds",
            ],
            ["Seller Settlements", "fa-wallet", settlements.filter(pending).length, "settlements"],
            [
                "Open Complaints",
                "fa-headset",
                complaints.filter(
                    (item) =>
                        !["resolved", "closed", "completed", "rejected"].includes(status(item))
                ).length,
                "complaints",
            ],
            [
                "Failed Deliveries",
                "fa-triangle-exclamation",
                assignments.filter((item) =>
                    ["failed", "deliveryfailed", "retry"].includes(status(item))
                ).length,
                "assignments",
            ],
        ];

        const modules = [
            ["Categories", "fa-layer-group", categories.length, "categories"],
            ["Delivery Agents", "fa-motorcycle", agents.length, "delivery-agents"],
            ["Payments", "fa-credit-card", payments.length, "payments"],
            ["Refunds", "fa-money-bill-transfer", refunds.length, "refunds"],
            ["Replacements", "fa-rotate", replacements.length, "replacements"],
            ["Settlements", "fa-wallet", settlements.length, "settlements"],
            ["Coupons", "fa-ticket", coupons.length, "coupons"],
            ["Reviews", "fa-star", reviews.length, "reviews"],
            ["Complaints", "fa-headset", complaints.length, "complaints"],
        ];

        return {
            revenue,
            periodOrders: periodOrders.length,
            delivered,
            groups,
            actions,
            modules,
            rating,
            salesTrend: buildTrend(periodSales, period, updated),
            paidCount: paidRecords.length,
            paymentCount: payments.length,
            pendingOrders: orders.filter((item) => [0, 1].includes(orderType(item))).length,
            attention: actions.reduce((sum, item) => sum + item[2], 0),
            sellers: sellers.length,
            customers: customers.length,
            products: products.length,
            recent: [...orders]
                .sort((a, b) => (itemDate(b)?.getTime() || 0) - (itemDate(a)?.getTime() || 0))
                .slice(0, 6),
        };
    }, [data, period, updated]);

    const cards = [
        [
            "Paid Revenue",
            compact(summary.revenue),
            "Selected period",
            "fa-indian-rupee-sign",
            "payments",
        ],
        ["Orders", format(summary.periodOrders), "Selected period", "fa-bag-shopping", "orders"],
        ["Customers", format(summary.customers), "Registered customers", "fa-users", "customers"],
        ["Sellers", format(summary.sellers), "Registered sellers", "fa-store", "sellers"],
        ["Products", format(summary.products), "All listed products", "fa-box", "products"],
        ["Delivered", format(summary.delivered), "Selected period", "fa-circle-check", "orders"],
        [
            "Pending Orders",
            format(summary.pendingOrders),
            "Current open orders",
            "fa-clock",
            "orders",
        ],
        [
            "Need Attention",
            format(summary.attention),
            "Open operational actions",
            "fa-bell",
            "reports",
        ],
    ];

    const deliveryRate = summary.periodOrders
        ? Math.round((summary.delivered / summary.periodOrders) * 100)
        : 0;

    const paymentRate = summary.paymentCount
        ? Math.round((summary.paidCount / summary.paymentCount) * 100)
        : 0;

    const ratingRate = Math.round((summary.rating / 5) * 100);

    return (
        <main className="zd-dashboard">
            <header className="zd-topbar">
                <div>
                    <h1 className="zd-page-title">
                        <Icon name="fa-gauge-high" /> DASHBOARD
                    </h1>
                    <p>Your complete Zupito marketplace overview, all in one place.</p>
                </div>

                <div className="zd-tools">
                    <label className="zd-period">
                        <Icon name="fa-calendar-days" />
                        <select
                            value={period}
                            onChange={(event) => setPeriod(Number(event.target.value))}
                            aria-label="Dashboard period"
                        >
                            {Object.entries(PERIODS).map(([days, label]) => (
                                <option value={days} key={days}>
                                    Last {label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button type="button" className="zd-refresh" onClick={refresh}>
                        <Icon name="fa-arrows-rotate" /> Refresh
                    </button>
                </div>
            </header>

            <section className="zd-welcome">
                <div className="zd-welcome-copy">
                    <span className="zd-welcome-eyebrow">
                        <Icon name="fa-chart-line" /> Marketplace Overview
                    </span>

                    <h2>
                        Welcome back, <span>{firstName}.</span>
                    </h2>
                    <p>
                        Monitor sales, manage sellers and orders, and stay on top of daily
                        operations.
                    </p>

                    <a href="#zd-actions" className="zd-welcome-link">
                        Review operations <Icon name="fa-arrow-right" />
                    </a>
                </div>

                <div className="zd-welcome-stat">
                    <span>
                        <Icon name="fa-bell" /> Pending Actions
                    </span>
                    <strong>{format(summary.attention)}</strong>
                    <small>Items that need your attention</small>
                </div>
            </section>

            <section className="zd-cards" aria-label="Key dashboard metrics">
                {cards.map(([label, value, detail, icon, path], index) => (
                    <Link to={`/manage/${path}`} className={`zd-kpi zd-kpi-${index}`} key={label}>
                        <div className="zd-kpi-head">
                            <span className="zd-kpi-label">{label}</span>
                            <span className="zd-kpi-icon">
                                <Icon name={icon} />
                            </span>
                        </div>
                        <strong title={value}>{value}</strong>
                        <small>{detail}</small>
                    </Link>
                ))}
            </section>

            <section className="zd-chart-layout">
                <article className="zd-panel">
                    <Heading
                        icon="fa-chart-line"
                        title="Sales Performance"
                        subtitle={`Successful payments · Last ${PERIODS[period]}`}
                    />

                    <div className="zd-revenue">
                        <strong>{money(summary.revenue)}</strong>
                        <span>Gross paid revenue</span>
                    </div>

                    <SalesChart points={summary.salesTrend} />
                </article>

                <article className="zd-panel">
                    <Heading
                        icon="fa-chart-pie"
                        title="Order Distribution"
                        subtitle="Order status breakdown"
                    />

                    <Donut
                        segments={summary.groups}
                        totalValue={summary.periodOrders}
                        value={format(summary.periodOrders)}
                        label="Orders"
                    />

                    <div className="zd-legend">
                        {summary.groups.map((group, index) => (
                            <div key={group.name}>
                                <span>
                                    <i className={`zd-dot zd-dot-${index}`} />
                                    {group.name}
                                </span>
                                <strong>{format(group.value)}</strong>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            <section className="zd-section">
                <Heading
                    icon="fa-chart-simple"
                    title="Performance Indicators"
                    subtitle="Payments, fulfilment and customer feedback"
                />

                <div className="zd-rings">
                    <RingCard
                        icon="fa-credit-card"
                        title="Payment Success"
                        detail="All recorded payments"
                        value={`${paymentRate}%`}
                        percent={paymentRate}
                        color="#16a34a"
                    />

                    <RingCard
                        icon="fa-truck-fast"
                        title="Order Fulfilment"
                        detail="Delivered in selected period"
                        value={`${deliveryRate}%`}
                        percent={deliveryRate}
                        color="#2563eb"
                    />

                    <RingCard
                        icon="fa-star"
                        title="Customer Rating"
                        detail={`${format(data.reviews.length)} review records`}
                        value={`${summary.rating.toFixed(1)}/5`}
                        percent={ratingRate}
                        color="#ff6a00"
                    />
                </div>
            </section>

            <section className="zd-lists" id="zd-actions">
                <article className="zd-panel">
                    <Heading
                        icon="fa-list-check"
                        title="Action Required"
                        subtitle={`${format(summary.attention)} items need attention`}
                    />

                    <div className="zd-action-list">
                        {summary.actions.map(([label, icon, value, path]) => (
                            <Link to={`/manage/${path}`} key={label} className="zd-list-row">
                                <span className="zd-row-icon">
                                    <Icon name={icon} />
                                </span>
                                <span>{label}</span>
                                <strong className={value ? "zd-count-active" : ""}>
                                    {format(value)}
                                </strong>
                                <Icon name="fa-chevron-right" />
                            </Link>
                        ))}
                    </div>
                </article>

                <article className="zd-panel">
                    <Heading
                        icon="fa-border-all"
                        title="Module Overview"
                        subtitle="Quick access to all management areas"
                    />

                    <div className="zd-action-list">
                        {summary.modules.map(([label, icon, value, path]) => (
                            <Link to={`/manage/${path}`} key={label} className="zd-list-row">
                                <span className="zd-row-icon">
                                    <Icon name={icon} />
                                </span>
                                <span>{label}</span>
                                <strong>{format(value)}</strong>
                                <Icon name="fa-chevron-right" />
                            </Link>
                        ))}
                    </div>
                </article>
            </section>

            <section className="zd-panel zd-orders-panel">
                <Heading
                    icon="fa-clock-rotate-left"
                    title="Recent Orders"
                    subtitle="Latest marketplace activity"
                    action={
                        <Link to="/manage/orders" className="zd-view-all">
                            View All <Icon name="fa-arrow-right" />
                        </Link>
                    }
                />

                <div className="zd-table-wrap">
                    <table className="zd-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {summary.recent.map((order, index) => (
                                <tr key={field(order, "id", "_id", "orderId") ?? index}>
                                    <td className="zd-order-id">
                                        #{field(order, "orderId", "id", "_id") ?? "—"}
                                    </td>
                                    <td>
                                        {field(
                                            order,
                                            "customerName",
                                            "customer.name",
                                            "user.name",
                                            "shippingAddress.name",
                                            "deliveryAddress.name"
                                        ) ?? "Customer"}
                                    </td>
                                    <td>
                                        {itemDate(order)?.toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        }) ?? "—"}
                                    </td>
                                    <td>
                                        <strong>{money(total(order))}</strong>
                                    </td>
                                    <td>
                                        <span
                                            className={`zd-order-status zd-order-status-${orderType(order)}`}
                                        >
                                            {field(order, "orderStatus", "status") ?? "Unknown"}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {!summary.recent.length && (
                                <tr>
                                    <td colSpan="5" className="zd-empty-row">
                                        No orders available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

export default Dashboard;
