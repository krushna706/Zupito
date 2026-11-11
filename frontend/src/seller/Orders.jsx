import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
    Button,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
} from "@mui/material";

import { formatMoney } from "../services/sellerService";
import { useOrderResource } from "../services/orderService";

import { formatDateTime, getStatusLabel } from "../utils/orderStatus";

// ================== ORDER FILTERS ==================
const filters = [
    ["All", "All Orders"],
    ["New", "New Orders"],
    ["Packing", "Packing"],
    ["Ready", "Ready for Pickup"],
    ["Transit", "In Transit"],
    ["Delivered", "Delivered"],
    ["Cancelled", "Cancelled"],
];

function statusGroup(status) {
    if (["confirmed", "placed", "processing"].includes(status)) {
        return "New";
    }

    if (["packing", "packed"].includes(status)) {
        return "Packing";
    }

    if (status === "ready_for_pickup") {
        return "Ready";
    }

    if (status === "delivered") {
        return "Delivered";
    }

    if (status === "cancelled") {
        return "Cancelled";
    }

    return "Transit";
}

// ================== ORDER STATUS ==================
function OrderStatus({ status }) {
    const group = statusGroup(status);

    const theme =
        group === "Delivered"
            ? "success"
            : group === "Cancelled"
              ? "danger"
              : group === "Ready" || group === "Packing"
                ? "warning"
                : "blue";

    return (
        <span className={`so-status is-${theme}`}>
            <i className="fa-solid fa-circle" aria-hidden="true" />
            {getStatusLabel(status)}
        </span>
    );
}

// ================== SELLER ORDERS ==================
function Orders() {
    const { data, loading, error, refresh } = useOrderResource("staff-list");
    const orders = useMemo(() => data || [], [data]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== STATISTICS ==================
    const statistics = [
        ["Total Parcels", orders.length, "Seller fulfilment records", "fa-boxes-stacked", "blue"],
        [
            "New Orders",
            orders.filter((item) => statusGroup(item.status) === "New").length,
            "Paid orders awaiting packing",
            "fa-cart-shopping",
            "orange",
        ],
        [
            "Ready for Pickup",
            orders.filter((item) => statusGroup(item.status) === "Ready").length,
            "Awaiting delivery collection",
            "fa-box-open",
            "green",
        ],
        [
            "In Transit",
            orders.filter((item) => statusGroup(item.status) === "Transit").length,
            "Delivery agent in progress",
            "fa-truck-fast",
            "red",
        ],
    ];

    // ================== ORDER FILTERING ==================
    const filtered = useMemo(
        () =>
            orders.filter((order) => {
                const query = search.trim().toLowerCase();

                const matchesStatus = filter === "All" || statusGroup(order.status) === filter;

                const matchesSearch = [
                    order.orderId,
                    order.parcelId,
                    order.customerName,
                    ...order.items.map((item) => item.name),
                ].some((value) =>
                    String(value || "")
                        .toLowerCase()
                        .includes(query)
                );

                return matchesStatus && matchesSearch;
            }),
        [orders, search, filter]
    );

    const visible = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    return (
        <main className="seller-orders">
            {/* ================== PAGE HEADER ================== */}
            <header className="so-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
                        MANAGE ORDERS
                    </h1>

                    <p>Pack paid seller orders, prepare parcels and track delivery progress.</p>
                </div>

                <div className="so-header-actions">
                    <Button
                        variant="outlined"
                        onClick={refresh}
                        startIcon={<i className="fa-solid fa-arrows-rotate" />}
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            {loading && <p role="status">Loading orders…</p>}

            {error && (
                <p role="alert">
                    {error}
                    <Button onClick={refresh}>Retry</Button>
                </p>
            )}

            {/* ================== ORDER SUMMARY ================== */}
            <section className="so-stats">
                {statistics.map(([label, value, note, icon, color]) => (
                    <article className={`so-stat is-${color}`} key={label}>
                        <div className="so-stat-top">
                            <span>{label}</span>

                            <span className="so-stat-icon">
                                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong>{value.toLocaleString("en-IN")}</strong>

                        <small>{note}</small>
                    </article>
                ))}
            </section>

            {/* ================== SELLER ORDER LIST ================== */}
            <section className="so-card so-list">
                <div className="so-card-heading">
                    <span className="so-heading-icon">
                        <i className="fa-solid fa-list-check" />
                    </span>

                    <div>
                        <h2>Seller Fulfilment Queue</h2>
                        <p>Only your parcels from confirmed paid orders.</p>
                    </div>

                    <span className="so-record-count">{filtered.length} Records</span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="so-filters">
                    <TextField
                        size="small"
                        label="Search Order / Parcel / Product"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        label="Fulfilment Status"
                        value={filter}
                        onChange={(event) => {
                            setFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        {filters.map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                                {label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        onClick={() => {
                            setSearch("");
                            setFilter("All");
                            setPage(0);
                        }}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== ORDERS TABLE ================== */}
                <TableContainer className="so-table-wrap">
                    <Table className="so-table" aria-label="Seller orders">
                        <TableHead>
                            <TableRow>
                                <TableCell>Order / Parcel</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Products</TableCell>
                                <TableCell>Order Value</TableCell>
                                <TableCell>Payment</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((order) => (
                                <TableRow hover key={`${order.orderId}-${order.parcelId}`}>
                                    <TableCell>
                                        <div className="so-cell-stack">
                                            <strong className="so-order-id">{order.orderId}</strong>

                                            <small>{order.parcelId}</small>

                                            <small>{formatDateTime(order.createdAt)}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {order.customerName || order.address?.name || "Customer"}
                                    </TableCell>

                                    <TableCell>
                                        <div className="so-cell-stack so-products-cell">
                                            <strong>
                                                {order.items[0]?.name || "Seller Parcel"}
                                            </strong>

                                            <small>
                                                {order.items.reduce(
                                                    (sum, item) => sum + Number(item.quantity || 0),
                                                    0
                                                )}{" "}
                                                unit(s)
                                                {order.items.length > 1
                                                    ? ` · ${order.items.length} items`
                                                    : ""}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <strong className="so-amount">
                                            {formatMoney(order.amount)}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <span className="so-payment-label">
                                            {order.paymentStatus}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <OrderStatus status={order.status} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            component={Link}
                                            to={`/manage/orders/${encodeURIComponent(
                                                order.orderId
                                            )}/${encodeURIComponent(order.parcelId)}`}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visible.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="so-empty">
                                            <i className="fa-solid fa-box-open" />

                                            <h3>No orders found</h3>

                                            <p>
                                                {orders.length
                                                    ? "Try another filter or search term."
                                                    : "Paid orders will appear here after payment confirmation."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={filtered.length}
                    page={Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1))}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>
        </main>
    );
}

export default Orders;
