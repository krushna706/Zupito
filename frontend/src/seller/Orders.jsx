
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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

import { toast } from "react-toastify";

import {
    formatMoney,
    inventoryRows,
} from "../services/sellerService";

import {
    createDemoSellerOrder,
    getSellerOrders,
} from "../services/orderService";

import {
    formatDateTime,
    getStatusLabel,
} from "../utils/orderStatus";

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

    const theme = group === "Delivered"
        ? "success"
        : group === "Cancelled"
            ? "danger"
            : group === "Ready" || group === "Packing"
                ? "warning"
                : "blue";

    return (
        <span className={`so-status is-${theme}`}>
            <i
                className="fa-solid fa-circle"
                aria-hidden="true"
            />
            {getStatusLabel(status)}
        </span>
    );
}

// ================== SELLER ORDERS ==================
function Orders({ user }) {
    const [orders, setOrders] = useState(() => getSellerOrders(user));
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [demoOpen, setDemoOpen] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState("");
    const [quantity, setQuantity] = useState("1");

    const variants = useMemo(
        () => inventoryRows(user),
        [user?.id, user?.email, orders]
    );

    const availableVariants = variants.filter((item) =>
        item.available > 0
    );

    const selected = availableVariants.find((item) =>
        item.key === selectedVariant
    );

    // ================== DATA REFRESH ==================
    const refresh = () => {
        setOrders(getSellerOrders(user));
    };

    useEffect(() => {
        const sync = () => setOrders(getSellerOrders(user));

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user?.id, user?.email]);

    // ================== STATISTICS ==================
    const statistics = [
        [
            "Total Parcels",
            orders.length,
            "Seller fulfilment records",
            "fa-boxes-stacked",
            "blue",
        ],
        [
            "New Orders",
            orders.filter((item) =>
                statusGroup(item.status) === "New"
            ).length,
            "Paid orders awaiting packing",
            "fa-cart-shopping",
            "orange",
        ],
        [
            "Ready for Pickup",
            orders.filter((item) =>
                statusGroup(item.status) === "Ready"
            ).length,
            "Awaiting delivery collection",
            "fa-box-open",
            "green",
        ],
        [
            "In Transit",
            orders.filter((item) =>
                statusGroup(item.status) === "Transit"
            ).length,
            "Delivery agent in progress",
            "fa-truck-fast",
            "red",
        ],
    ];

    // ================== ORDER FILTERING ==================
    const filtered = useMemo(() => orders.filter((order) => {
        const query = search.trim().toLowerCase();

        const matchesStatus = filter === "All" ||
            statusGroup(order.status) === filter;

        const matchesSearch = [
            order.orderId,
            order.parcelId,
            order.customerName,
            ...order.items.map((item) => item.name),
        ].some((value) =>
            String(value || "").toLowerCase().includes(query)
        );

        return matchesStatus && matchesSearch;
    }), [orders, search, filter]);

    const visible = filtered.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    // ================== DEMO ORDER ==================
    const openDemo = () => {
        setSelectedVariant(availableVariants[0]?.key || "");
        setQuantity("1");
        setDemoOpen(true);
    };

    const createDemo = () => {
        try {
            const orderId = createDemoSellerOrder(
                user,
                selectedVariant,
                quantity
            );

            setDemoOpen(false);
            setPage(0);
            refresh();

            toast.success(`Sample paid order ${orderId} created.`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <main className="seller-orders">
            {/* ================== PAGE HEADER ================== */}
            <header className="so-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-cart-shopping"
                            aria-hidden="true"
                        />
                        MANAGE ORDERS
                    </h1>

                    <p>
                        Pack paid seller orders, prepare parcels
                        and track delivery progress.
                    </p>
                </div>

                <div className="so-header-actions">
                    <Button
                        variant="outlined"
                        onClick={refresh}
                        startIcon={
                            <i className="fa-solid fa-arrows-rotate" />
                        }
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        onClick={openDemo}
                        startIcon={
                            <i className="fa-solid fa-flask" />
                        }
                    >
                        Create Demo Order
                    </Button>
                </div>
            </header>

            {/* ================== ORDER SUMMARY ================== */}
            <section className="so-stats">
                {statistics.map(([label, value, note, icon, color]) => (
                    <article
                        className={`so-stat is-${color}`}
                        key={label}
                    >
                        <div className="so-stat-top">
                            <span>{label}</span>

                            <span className="so-stat-icon">
                                <i
                                    className={`fa-solid ${icon}`}
                                    aria-hidden="true"
                                />
                            </span>
                        </div>

                        <strong>
                            {value.toLocaleString("en-IN")}
                        </strong>

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
                        <p>
                            Only your parcels from paid or clearly
                            labeled demo-paid orders.
                        </p>
                    </div>

                    <span className="so-record-count">
                        {filtered.length} Records
                    </span>
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
                            <MenuItem
                                key={value}
                                value={value}
                            >
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
                    <Table
                        className="so-table"
                        aria-label="Seller orders"
                    >
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
                                <TableRow
                                    hover
                                    key={`${order.orderId}-${order.parcelId}`}
                                >
                                    <TableCell>
                                        <div className="so-cell-stack">
                                            <strong className="so-order-id">
                                                {order.orderId}
                                            </strong>

                                            <small>{order.parcelId}</small>

                                            <small>
                                                {formatDateTime(
                                                    order.createdAt,
                                                    order.demoPayment
                                                )}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {order.customerName ||
                                            order.address?.name ||
                                            "Customer"}
                                    </TableCell>

                                    <TableCell>
                                        <div className="so-cell-stack so-products-cell">
                                            <strong>
                                                {order.items[0]?.name ||
                                                    "Seller Parcel"}
                                            </strong>

                                            <small>
                                                {order.items.reduce(
                                                    (sum, item) =>
                                                        sum + Number(
                                                            item.quantity || 0
                                                        ),
                                                    0
                                                )} unit(s)

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
                                        <span
                                            className={
                                                order.demoPayment
                                                    ? "so-demo-label"
                                                    : "so-payment-label"
                                            }
                                        >
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
                                            to={`/manage/orders/${
                                                encodeURIComponent(order.orderId)
                                            }/${encodeURIComponent(order.parcelId)}`}
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
                                                    : "Create a demo order from your product stock to preview fulfilment."}
                                            </p>

                                            {!orders.length && (
                                                <Button
                                                    variant="outlined"
                                                    onClick={openDemo}
                                                >
                                                    Create Demo Order
                                                </Button>
                                            )}
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
                    page={Math.min(
                        page,
                        Math.max(
                            0,
                            Math.ceil(filtered.length / rowsPerPage) - 1
                        )
                    )}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, nextPage) =>
                        setPage(nextPage)
                    }
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== DEMO ORDER DIALOG ================== */}
            <Dialog
                open={demoOpen}
                onClose={() => setDemoOpen(false)}
                maxWidth="sm"
                fullWidth
                className="so-dialog"
            >
                <DialogTitle>Create Paid Demo Order</DialogTitle>

                <DialogContent dividers>
                    <div className="so-demo-form">
                        <p>
                            This is a frontend-only sample. No payment
                            is processed. Stock will be reserved, not
                            deducted, until the delivery workflow advances.
                        </p>

                        {availableVariants.length ? (
                            <>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Product Variant"
                                    value={selectedVariant}
                                    onChange={(event) =>
                                        setSelectedVariant(event.target.value)
                                    }
                                >
                                    {availableVariants.map((item) => (
                                        <MenuItem
                                            key={item.key}
                                            value={item.key}
                                        >
                                            {item.name} · {item.variant} (
                                            {item.available} available)
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    fullWidth
                                    size="small"
                                    type="number"
                                    label="Quantity"
                                    value={quantity}
                                    onChange={(event) =>
                                        setQuantity(event.target.value)
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            min: 1,
                                            max: selected?.available || 1,
                                            step: 1,
                                        },
                                    }}
                                />

                                <div className="so-demo-summary">
                                    <span>Sample Parcel Value</span>

                                    <strong>
                                        {formatMoney(
                                            (selected?.price || 0) *
                                            (Number(quantity) || 0)
                                        )}
                                    </strong>
                                </div>
                            </>
                        ) : (
                            <p>
                                No available variants. Add a product
                                or restock inventory first.
                            </p>
                        )}
                    </div>
                </DialogContent>

                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={() => setDemoOpen(false)}
                    >
                        Cancel
                    </Button>

                    {!availableVariants.length ? (
                        <Button
                            component={Link}
                            to="/manage/products/new"
                            onClick={() => setDemoOpen(false)}
                        >
                            Add Product
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={createDemo}
                            disabled={
                                !selected ||
                                !Number.isSafeInteger(Number(quantity)) ||
                                Number(quantity) < 1 ||
                                Number(quantity) > selected.available
                            }
                        >
                            Create Order
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </main>
    );
}

export default Orders;
