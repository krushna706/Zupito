import { useState } from "react";

import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
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

import { useOrderResource } from "../services/orderService";
import { normalizeStatus, getStatusLabel, formatDateTime } from "../utils/orderStatus";

// ================== ORDER HELPERS ==================
function getSeller(item) {
    return item.sellerName || "Seller";
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

function getOrderGroup(order) {
    const status = normalizeStatus(order.orderStatus);

    if (status === "cancelled") return "Cancelled";
    if (status === "delivered") return "Delivered";

    if (
        ["picked_up", "shipped", "in_transit", "out_for_delivery", "partially_delivered"].includes(
            status
        )
    ) {
        return "In Transit";
    }

    return "Processing";
}

function OrderBadge({ value }) {
    const status = normalizeStatus(value);

    const theme =
        status === "delivered" || status === "resolved"
            ? "success"
            : status === "cancelled" || status === "open"
              ? "danger"
              : ["out_for_delivery", "shipped", "in_transit"].includes(status)
                ? "blue"
                : "warning";

    return (
        <span className={`mo-badge mo-badge--${theme}`}>
            <span className="mo-badge-dot" />
            {getStatusLabel(status)}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="mo-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== MANAGE ORDERS ==================
function Orders() {
    const { data, loading, error, refresh } = useOrderResource("staff-list");

    const orders = data || [];

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sellerFilter, setSellerFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== ORDER DETAILS ==================
    const [selectedId, setSelectedId] = useState(null);

    const selectedOrder = orders.find((order) => order.id === selectedId);

    // ================== SELLER AND PARCEL HELPERS ==================
    const getOrderSellers = (order) => [...new Set(order.items.map(getSeller))];

    const getParcelItems = (order, parcel) =>
        parcel.itemIndexes.map((index) => order.items[index]).filter(Boolean);

    const getParcelSeller = (order, parcel) => {
        const sellers = [...new Set(getParcelItems(order, parcel).map(getSeller))];

        return sellers.join(", ") || "Marketplace Seller";
    };

    const sellerOptions = [...new Set(orders.flatMap((order) => getOrderSellers(order)))].sort();

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Orders",
            value: orders.length,
            description: "Customer order records",
            icon: "fa-cart-shopping",
            theme: "blue",
        },
        {
            label: "In Progress",
            value: orders.filter((order) =>
                ["Processing", "In Transit"].includes(getOrderGroup(order))
            ).length,
            description: "Awaiting fulfilment or delivery",
            icon: "fa-truck-fast",
            theme: "orange",
        },
        {
            label: "Delivered Orders",
            value: orders.filter((order) => getOrderGroup(order) === "Delivered").length,
            description: "Completed customer deliveries",
            icon: "fa-circle-check",
            theme: "green",
        },
        {
            label: "Open Exceptions",
            value: orders.filter((order) => order.exception?.status === "Open").length,
            description: "Require admin attention",
            icon: "fa-triangle-exclamation",
            theme: "red",
        },
    ];

    // ================== FILTERED ORDERS ==================
    const filteredOrders = orders
        .filter((order) => {
            const query = search.trim().toLowerCase();

            const matchesSearch = [
                order.id,
                order.customerName,
                order.address?.phone,
                order.address?.pincode,
                ...order.items.map((item) => item.name),
                ...getOrderSellers(order),
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            const matchesStatus =
                statusFilter === "All" ||
                (statusFilter === "Exception"
                    ? order.exception?.status === "Open"
                    : getOrderGroup(order) === statusFilter);

            const matchesSeller =
                sellerFilter === "All" || getOrderSellers(order).includes(sellerFilter);

            return matchesSearch && matchesStatus && matchesSeller;
        })
        .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));

    const visibleOrders = filteredOrders.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    const hasFilters = Boolean(search.trim()) || statusFilter !== "All" || sellerFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setSellerFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        refresh();
        setPage(0);
    };

    const getOrderTimeline = (order) => [
        {
            key: "placed",
            label: "Order Placed",
            date: order.createdAt,
        },
        ...(order.confirmedAt
            ? [
                  {
                      key: "confirmed",
                      label: "Payment Confirmed",
                      date: order.confirmedAt,
                  },
              ]
            : []),
    ];

    return (
        <div className="manage-orders">
            {loading && <p role="status">Loading orders…</p>}

            {error && (
                <Alert severity="error" action={<Button onClick={refresh}>Retry</Button>}>
                    {error}
                </Alert>
            )}

            {/* ================== PAGE HEADER ================== */}
            <section className="mo-hero">
                <div className="mo-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
                        ORDER MANAGEMENT
                    </span>

                    <p>
                        Monitor customer orders, seller fulfilment, parcel delivery and operational
                        exceptions.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="mo-refresh-button"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="mo-stats" aria-label="Order overview">
                {statistics.map((item) => (
                    <article key={item.label} className={`mo-stat mo-stat--${item.theme}`}>
                        <div className="mo-stat-heading">
                            <span>{item.label}</span>

                            <span className="mo-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong className="mo-stat-value">{item.value}</strong>

                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== ORDER LIST ================== */}
            <section className="mo-card">
                <div className="mo-section-header">
                    <div className="mo-section-heading">
                        <span className="mo-section-icon">
                            <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Customer Orders</h2>
                            <p>View order records, payment references and parcel progress.</p>
                        </div>
                    </div>

                    <span className="mo-record-count">{filteredOrders.length} Records</span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="mo-toolbar">
                    <div className="mo-search">
                        <TextField
                            label="Search Orders"
                            placeholder="Order ID, customer, product, seller or pincode"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(0);
                            }}
                            size="small"
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <i className="fa-solid fa-magnifying-glass" />
                                        </InputAdornment>
                                    ),
                                },
                                htmlInput: { maxLength: 100 },
                            }}
                            fullWidth
                        />
                    </div>

                    <TextField
                        select
                        label="Order Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        className="mo-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Processing">Processing</MenuItem>
                        <MenuItem value="In Transit">In Transit</MenuItem>
                        <MenuItem value="Delivered">Delivered</MenuItem>
                        <MenuItem value="Cancelled">Cancelled</MenuItem>
                        <MenuItem value="Exception">Open Exceptions</MenuItem>
                    </TextField>

                    <TextField
                        select
                        label="Seller"
                        value={sellerFilter}
                        onChange={(event) => {
                            setSellerFilter(event.target.value);
                            setPage(0);
                        }}
                        className="mo-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Sellers</MenuItem>

                        {sellerOptions.map((seller) => (
                            <MenuItem key={seller} value={seller}>
                                {seller}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        className="mo-reset-button"
                        disabled={!hasFilters}
                        onClick={resetFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== ORDERS TABLE ================== */}
                <TableContainer className="mo-table-container">
                    <Table className="mo-table" aria-label="Customer orders">
                        <TableHead>
                            <TableRow>
                                <TableCell>Order Details</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Seller / Parcels</TableCell>
                                <TableCell>Order Amount</TableCell>
                                <TableCell>Order Status</TableCell>
                                <TableCell>Attention</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleOrders.map((order) => (
                                <TableRow key={order.id} hover>
                                    <TableCell>
                                        <div className="mo-cell-stack">
                                            <strong className="mo-order-id">{order.id}</strong>

                                            <small>{formatDateTime(order.createdAt, true)}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mo-cell-stack">
                                            <strong>{order.customerName}</strong>

                                            <small>
                                                {order.address?.city}, {order.address?.state}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mo-cell-stack">
                                            <strong>{getOrderSellers(order).join(", ")}</strong>

                                            <small>
                                                {order.items.length} item(s) ·{" "}
                                                {order.parcels.length} parcel(s)
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <strong className="mo-amount">
                                            {formatMoney(order.totalAmount)}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <OrderBadge value={order.orderStatus} />
                                    </TableCell>

                                    <TableCell>
                                        {order.exception?.status === "Open" ? (
                                            <span className="mo-attention">
                                                <i className="fa-solid fa-triangle-exclamation" />
                                                Exception
                                            </span>
                                        ) : (
                                            <span className="mo-muted">—</span>
                                        )}
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            className="mo-view-button"
                                            onClick={() => setSelectedId(order.id)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {visibleOrders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="mo-empty">
                                            <span>
                                                <i className="fa-solid fa-cart-shopping" />
                                            </span>

                                            <h3>No Orders Found</h3>
                                            <p>Try adjusting the search or filters.</p>

                                            {hasFilters && (
                                                <Button variant="outlined" onClick={resetFilters}>
                                                    Clear Filters
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
                    className="mo-pagination"
                    count={filteredOrders.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== ORDER DETAILS ================== */}
            <Dialog
                open={Boolean(selectedOrder)}
                onClose={() => setSelectedId(null)}
                maxWidth="md"
                fullWidth
                slotProps={{
                    paper: { className: "mo-dialog-paper" },
                }}
            >
                {selectedOrder && (
                    <>
                        <DialogTitle className="mo-dialog-title">Order Details</DialogTitle>

                        <DialogContent dividers className="mo-dialog-content">
                            <div className="mo-detail-banner">
                                <div>
                                    <span>ORDER NUMBER</span>
                                    <h3>{selectedOrder.id}</h3>

                                    <p>{formatDateTime(selectedOrder.createdAt, true)}</p>
                                </div>

                                <div className="mo-detail-summary">
                                    <OrderBadge value={selectedOrder.orderStatus} />

                                    <strong>{formatMoney(selectedOrder.totalAmount)}</strong>
                                </div>
                            </div>

                            {/* ================== CUSTOMER AND PAYMENT ================== */}
                            <div className="mo-detail-section">
                                <h4>Customer & Payment</h4>

                                <dl className="mo-detail-grid">
                                    <DetailItem
                                        label="Customer"
                                        value={selectedOrder.customerName}
                                    />

                                    <DetailItem
                                        label="Mobile Number"
                                        value={selectedOrder.address?.phone}
                                    />

                                    <DetailItem
                                        label="Payment Method"
                                        value={selectedOrder.paymentMethod}
                                    />

                                    <DetailItem
                                        label="Payment Status"
                                        value={selectedOrder.paymentStatus}
                                    />

                                    <DetailItem
                                        label="Order Amount"
                                        value={formatMoney(selectedOrder.totalAmount)}
                                    />

                                    <DetailItem
                                        label="Refund Status"
                                        value={selectedOrder.refundStatus || "Not Applicable"}
                                    />
                                </dl>
                            </div>

                            {/* ================== DELIVERY ADDRESS ================== */}
                            <div className="mo-detail-section">
                                <h4>Delivery Address Snapshot</h4>

                                <div className="mo-address">
                                    <i className="fa-solid fa-location-dot" aria-hidden="true" />

                                    <div>
                                        <strong>{selectedOrder.address?.name}</strong>

                                        <p>
                                            {[
                                                selectedOrder.address?.house,
                                                selectedOrder.address?.area,
                                                selectedOrder.address?.landmark,
                                                selectedOrder.address?.city,
                                                selectedOrder.address?.state,
                                                selectedOrder.address?.pincode,
                                            ]
                                                .filter(Boolean)
                                                .join(", ")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ================== SELLER PARCELS ================== */}
                            <div className="mo-detail-section">
                                <h4>Seller Fulfilment & Parcels</h4>

                                <div className="mo-parcel-list">
                                    {selectedOrder.parcels.map((parcel) => (
                                        <article key={parcel.id} className="mo-parcel">
                                            <div className="mo-parcel-header">
                                                <div>
                                                    <strong>
                                                        {getParcelSeller(selectedOrder, parcel)}
                                                    </strong>

                                                    <small>{parcel.id}</small>
                                                </div>

                                                <OrderBadge value={parcel.status} />
                                            </div>

                                            <div className="mo-parcel-items">
                                                {getParcelItems(selectedOrder, parcel).map(
                                                    (item, index) => (
                                                        <div
                                                            className="mo-parcel-item"
                                                            key={`${parcel.id}-${index}`}
                                                        >
                                                            <span className="mo-product-image">
                                                                {item.image ? (
                                                                    <img
                                                                        src={item.image}
                                                                        alt={item.name || ""}
                                                                        loading="lazy"
                                                                    />
                                                                ) : (
                                                                    <i className="fa-solid fa-box-open" />
                                                                )}
                                                            </span>

                                                            <div>
                                                                <strong>{item.name}</strong>
                                                                <small>
                                                                    Quantity: {item.quantity}
                                                                </small>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            {parcel.expectedDeliveryAt && (
                                                <p className="mo-parcel-eta">
                                                    <i className="fa-regular fa-calendar" />
                                                    Expected: {parcel.expectedDeliveryAt}
                                                </p>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </div>

                            {/* ================== ORDER TIMELINE ================== */}
                            <div className="mo-detail-section">
                                <h4>Order Timeline</h4>

                                <div className="mo-timeline">
                                    {getOrderTimeline(selectedOrder).map((event) => (
                                        <div className="mo-timeline-event" key={event.key}>
                                            <span className="mo-timeline-dot" />

                                            <div>
                                                <strong>{event.label}</strong>

                                                <small>{formatDateTime(event.date, true)}</small>
                                            </div>
                                        </div>
                                    ))}

                                    {(selectedOrder.activity || [])
                                        .filter((event) => event.type !== "cancel")
                                        .map((event, index) => (
                                            <div
                                                className="mo-timeline-event"
                                                key={`activity-${index}`}
                                            >
                                                <span className="mo-timeline-dot" />

                                                <div>
                                                    <strong>{getStatusLabel(event.type)}</strong>

                                                    <small>{formatDateTime(event.date)}</small>

                                                    <p>
                                                        {event.parcelId} · {event.note}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {selectedOrder.exception && (
                                <Alert
                                    severity={
                                        selectedOrder.exception.status === "Open"
                                            ? "warning"
                                            : "success"
                                    }
                                    className="mo-detail-alert"
                                >
                                    <strong>{selectedOrder.exception.status} Exception:</strong>{" "}
                                    {selectedOrder.exception.reason}
                                    {selectedOrder.exception.resolution && (
                                        <p>Resolution: {selectedOrder.exception.resolution}</p>
                                    )}
                                </Alert>
                            )}

                            {selectedOrder.cancellationReason && (
                                <Alert severity="info" className="mo-detail-alert">
                                    <strong>Cancellation Reason:</strong>{" "}
                                    {selectedOrder.cancellationReason}
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions className="mo-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </div>
    );
}

export default Orders;
