
import { useEffect, useState } from "react";
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
import { toast } from "react-toastify";

import {
    demoOrders,
    demoParcels,
    demoAddress,
    demoEventTimestamps,
} from "../data/orderPreview";
import {
    normalizeStatus,
    getStatusLabel,
    formatDateTime,
} from "../utils/orderStatus";

// ================== ORDER CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_orders";

const prePickupStatuses = [
    "placed",
    "confirmed",
    "processing",
    "packing",
    "packed",
    "ready_for_pickup",
];

const sellerNames = {
    electronics: "TechNova Electronics",
    fashion: "Urban Fashion",
    grocery: "Fresh Basket",
    beauty: "GlowCare Store",
    home: "HomeCraft Living",
    travel: "TravelMate Store",
};

const trackingEvents = [
    ["createdAt", "Order Placed"],
    ["confirmedAt", "Order Confirmed"],
    ["packedAt", "Packed"],
    ["shippedAt", "Shipped"],
    ["outForDeliveryAt", "Out for Delivery"],
    ["deliveredAt", "Delivered"],
    ["cancelledAt", "Cancelled"],
];

function getSeller(item) {
    const name = String(item.name || "").toLowerCase();

    if (/smartphone|headphone|laptop/.test(name)) return sellerNames.electronics;
    if (/shirt|dress|sneaker|watch|outfit/.test(name)) return sellerNames.fashion;
    if (/grocery|snack|drink|rice|oil/.test(name)) return sellerNames.grocery;
    if (/beauty|skin|care/.test(name)) return sellerNames.beauty;
    if (/kitchen|home/.test(name)) return sellerNames.home;
    if (/backpack|travel|trolley/.test(name)) return sellerNames.travel;

    return "Marketplace Seller";
}

function createPreviewOrders() {
    return demoOrders.map((order) => {
        const previews = demoParcels[order._id];
        const parcels = Array.isArray(previews) && previews.length
            ? previews.map((parcel) => ({
                  id: parcel.id,
                  status: parcel.status,
                  itemIndexes: [...parcel.itemIndexes],
                  expectedDeliveryAt: parcel.expectedDeliveryAt || null,
                  eventTimestamps: parcel.eventTimestamps || {},
              }))
            : [{
                  id: `${order._id}-P1`,
                  status: order.orderStatus,
                  itemIndexes: order.items.map((_, index) => index),
                  expectedDeliveryAt: order.expectedDeliveryAt || null,
                  eventTimestamps: demoEventTimestamps[order._id] || {},
              }];

        return {
            ...order,
            id: order._id,
            customerName: demoAddress.name,
            address: { ...demoAddress },
            paymentMethod: "Online Payment",
            paymentStatus: "Not Verified (Demo)",
            refundStatus: order.orderStatus === "cancelled"
                ? "Not Available (Preview)"
                : null,
            parcels,
            exception: null,
            activity: [],
        };
    });
}

function loadOrders() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (Array.isArray(saved)) return saved;
    } catch {
        // Fall back to preview orders.
    }

    return createPreviewOrders();
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

    if (["picked_up", "shipped", "in_transit", "out_for_delivery", "partially_delivered"].includes(status)) {
        return "In Transit";
    }

    return "Processing";
}

function canCancelOrder(order) {
    return order.parcels.length > 0 &&
        order.parcels.every((parcel) =>
            prePickupStatuses.includes(normalizeStatus(parcel.status))
        );
}

function OrderBadge({ value }) {
    const status = normalizeStatus(value);

    const theme = status === "delivered" || status === "resolved"
        ? "success"
        : status === "cancelled" || status === "open"
            ? "danger"
            : status === "out_for_delivery" || status === "shipped" || status === "in_transit"
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
    const [orders, setOrders] = useState(loadOrders);

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sellerFilter, setSellerFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DETAILS AND ACTIONS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedOrder = orders.find((order) => order.id === selectedId);
    const actionOrder = orders.find((order) => order.id === action?.orderId);

    // ================== SAVE RECORDS ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        } catch {
            // Continue with React state.
        }
    }, [orders]);

    // ================== SELLER AND PARCEL HELPERS ==================
    const getOrderSellers = (order) =>
        [...new Set(order.items.map((item) => getSeller(item)))];

    const getParcelItems = (order, parcel) =>
        parcel.itemIndexes.map((index) => order.items[index]).filter(Boolean);

    const getParcelSeller = (order, parcel) => {
        const sellers = [...new Set(getParcelItems(order, parcel).map(getSeller))];
        return sellers.join(", ") || "Marketplace Seller";
    };

    const sellerOptions = [...new Set(
        orders.flatMap((order) => getOrderSellers(order))
    )].sort();

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
    const filteredOrders = orders.filter((order) => {
        const query = search.trim().toLowerCase();

        const matchesSearch = [
            order.id,
            order.customerName,
            order.address?.phone,
            order.address?.pincode,
            ...order.items.map((item) => item.name),
            ...getOrderSellers(order),
        ].some((value) => String(value || "").toLowerCase().includes(query));

        const matchesStatus = statusFilter === "All" ||
            (statusFilter === "Exception"
                ? order.exception?.status === "Open"
                : getOrderGroup(order) === statusFilter);

        const matchesSeller = sellerFilter === "All" ||
            getOrderSellers(order).includes(sellerFilter);

        return matchesSearch && matchesStatus && matchesSeller;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const visibleOrders = filteredOrders.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search.trim()) ||
        statusFilter !== "All" ||
        sellerFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setSellerFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        setOrders(loadOrders());
        setPage(0);
        toast.info("Order records refreshed.");
    };

    // ================== ORDER ACTIONS ==================
    const openAction = (type, order) => {
        setSelectedId(null);
        setAction({ type, orderId: order.id });
        setReason("");
        setActionError("");
    };

    const closeAction = () => {
        setAction(null);
        setReason("");
        setActionError("");
    };

    const handleConfirm = () => {
        if (!actionOrder || !action) {
            closeAction();
            return;
        }

        if (reason.trim().length < 5 || reason.trim().length > 300) {
            setActionError("Enter a reason or resolution note containing 5–300 characters.");
            return;
        }

        if (action.type === "cancel" && !canCancelOrder(actionOrder)) {
            setActionError("Cancellation is no longer eligible after parcel pickup.");
            return;
        }

        if (action.type === "flag" && actionOrder.exception?.status === "Open") {
            setActionError("This order already has an open exception.");
            return;
        }

        if (action.type === "resolve" && actionOrder.exception?.status !== "Open") {
            setActionError("No open exception is available to resolve.");
            return;
        }

        const now = new Date().toISOString();
        const note = reason.trim();

        setOrders((previous) => previous.map((order) => {
            if (order.id !== action.orderId) return order;

            const activity = [
                ...(order.activity || []),
                {
                    type: action.type,
                    note,
                    date: now,
                },
            ];

            if (action.type === "cancel") {
                return {
                    ...order,
                    orderStatus: "cancelled",
                    parcels: order.parcels.map((parcel) => ({
                        ...parcel,
                        status: "cancelled",
                    })),
                    cancelledAt: now,
                    cancellationReason: note,
                    refundStatus: "Awaiting Payment Verification",
                    activity,
                };
            }

            return {
                ...order,
                exception: action.type === "flag"
                    ? { status: "Open", reason: note, openedAt: now }
                    : {
                          ...order.exception,
                          status: "Resolved",
                          resolution: note,
                          resolvedAt: now,
                      },
                activity,
            };
        }));

        const messages = {
            cancel: "Preview order cancelled. Payment verification is required before any refund.",
            flag: "Fulfilment exception recorded.",
            resolve: "Fulfilment exception resolved.",
        };

        toast.success(messages[action.type]);
        closeAction();
    };

    // ================== ORDER TIMELINE ==================
    const getOrderTimeline = (order) => {
        const timestamps = demoEventTimestamps[order.id] || {};

        const events = trackingEvents
            .filter(([key]) => key === "createdAt" || timestamps[key])
            .map(([key, label]) => ({
                key,
                label,
                date: key === "createdAt" ? order.createdAt : timestamps[key],
            }));

        if (order.cancelledAt && !timestamps.cancelledAt) {
            events.push({
                key: "cancelled",
                label: "Cancelled by Admin (Demo)",
                date: order.cancelledAt,
            });
        }

        return events;
    };

    return (
        <div className="manage-orders">
            {/* ================== PAGE HEADER ================== */}
            <section className="mo-hero">
                <div className="mo-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
                        ORDER MANAGEMENT
                    </span>

                    <p>
                        Monitor customer orders, seller fulfilment, parcel delivery
                        and operational exceptions.
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

                    <span className="mo-record-count">
                        {filteredOrders.length} Records
                    </span>
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
                                            <small>{order.address?.city}, {order.address?.state}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mo-cell-stack">
                                            <strong>{getOrderSellers(order).join(", ")}</strong>
                                            <small>
                                                {order.items.length} item(s) · {order.parcels.length} parcel(s)
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
                                            <span><i className="fa-solid fa-cart-shopping" /></span>
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
                slotProps={{ paper: { className: "mo-dialog-paper" } }}
            >
                {selectedOrder && (
                    <>
                        <DialogTitle className="mo-dialog-title">
                            Order Details
                        </DialogTitle>

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
                                    <DetailItem label="Customer" value={selectedOrder.customerName} />
                                    <DetailItem label="Mobile Number" value={selectedOrder.address?.phone} />
                                    <DetailItem label="Payment Method" value={selectedOrder.paymentMethod} />
                                    <DetailItem label="Payment Status" value={selectedOrder.paymentStatus} />
                                    <DetailItem label="Order Amount" value={formatMoney(selectedOrder.totalAmount)} />
                                    <DetailItem label="Refund Status" value={selectedOrder.refundStatus || "Not Applicable"} />
                                </dl>
                            </div>

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
                                                selectedOrder.address?.city,
                                                selectedOrder.address?.state,
                                                selectedOrder.address?.pincode,
                                            ].filter(Boolean).join(", ")}
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
                                                    <strong>{getParcelSeller(selectedOrder, parcel)}</strong>
                                                    <small>{parcel.id}</small>
                                                </div>

                                                <OrderBadge value={parcel.status} />
                                            </div>

                                            <div className="mo-parcel-items">
                                                {getParcelItems(selectedOrder, parcel).map((item, index) => (
                                                    <div className="mo-parcel-item" key={`${parcel.id}-${index}`}>
                                                        <span className="mo-product-image">
                                                            {item.image ? (
                                                                <img src={item.image} alt="" loading="lazy" />
                                                            ) : (
                                                                <i className="fa-solid fa-box-open" />
                                                            )}
                                                        </span>

                                                        <div>
                                                            <strong>{item.name}</strong>
                                                            <small>Quantity: {item.quantity}</small>
                                                        </div>
                                                    </div>
                                                ))}
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

                                    {(selectedOrder.activity || []).filter((event) =>
                                        event.type !== "cancel"
                                    ).map((event, index) => (
                                        <div className="mo-timeline-event" key={`activity-${index}`}>
                                            <span className="mo-timeline-dot" />

                                            <div>
                                                <strong>
                                                    {event.type === "flag"
                                                        ? "Fulfilment Exception Opened"
                                                        : "Fulfilment Exception Resolved"}
                                                </strong>
                                                <small>{formatDateTime(event.date)}</small>
                                                <p>{event.note}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedOrder.exception && (
                                <Alert
                                    severity={selectedOrder.exception.status === "Open" ? "warning" : "success"}
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

                            {selectedOrder.exception?.status === "Open" ? (
                                <Button
                                    variant="outlined"
                                    onClick={() => openAction("resolve", selectedOrder)}
                                >
                                    Resolve Exception
                                </Button>
                            ) : (
                                <Button
                                    variant="outlined"
                                    onClick={() => openAction("flag", selectedOrder)}
                                    disabled={getOrderGroup(selectedOrder) === "Cancelled"}
                                >
                                    Report Exception
                                </Button>
                            )}

                            {canCancelOrder(selectedOrder) && (
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={() => openAction("cancel", selectedOrder)}
                                >
                                    Cancel Order (Demo)
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== ACTION CONFIRMATION ================== */}
            <Dialog
                open={Boolean(action)}
                onClose={closeAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "mo-dialog-paper" } }}
            >
                <DialogTitle className="mo-dialog-title">
                    {action?.type === "cancel"
                        ? "Cancel Order"
                        : action?.type === "flag"
                            ? "Report Fulfilment Exception"
                            : "Resolve Fulfilment Exception"}
                </DialogTitle>

                <DialogContent className="mo-dialog-content">
                    <p className="mo-confirm-text">
                        Order: <strong>{actionOrder?.id}</strong>
                    </p>

                    {action?.type === "cancel" && (
                        <Alert severity="warning" className="mo-detail-alert">
                            This cancels the demo order record only. No payment refund,
                            inventory release or seller settlement is executed.
                        </Alert>
                    )}

                    <TextField
                        label={action?.type === "resolve" ? "Resolution Note" : "Reason"}
                        value={reason}
                        onChange={(event) => {
                            setReason(event.target.value);
                            setActionError("");
                        }}
                        multiline
                        minRows={3}
                        slotProps={{ htmlInput: { maxLength: 300 } }}
                        fullWidth
                        required
                        error={Boolean(actionError)}
                        helperText={actionError || "Enter at least 5 characters."}
                    />
                </DialogContent>

                <DialogActions className="mo-dialog-actions">
                    <Button color="inherit" onClick={closeAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={action?.type === "cancel" ? "error" : "primary"}
                        onClick={handleConfirm}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Orders;
