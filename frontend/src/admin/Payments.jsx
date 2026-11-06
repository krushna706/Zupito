
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
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { demoOrders } from "../data/orderPreview";
import { getStatusLabel, normalizeStatus } from "../utils/orderStatus";

// ================== PAYMENT CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_payments";
const ORDER_KEY = "zupito_admin_orders";

const extraAttempts = [
    { id: "SIM-PAY-1008", amount: 1499, status: "Pending", createdAt: "2026-11-04T09:30:00+05:30" },
    { id: "SIM-PAY-1009", amount: 2499, status: "Failed", createdAt: "2026-11-04T11:15:00+05:30" },
    { id: "SIM-PAY-1010", amount: 899, status: "Cancelled", createdAt: "2026-11-04T15:40:00+05:30" },
    { id: "SIM-PAY-1011", amount: 4299, status: "Failed", createdAt: "2026-11-05T10:20:00+05:30" },
    { id: "SIM-PAY-1012", amount: 1999, status: "Pending", createdAt: "2026-11-05T12:10:00+05:30" },
];

const initialPayments = [
    ...demoOrders.map((order, index) => ({
        id: `SIM-PAY-${1001 + index}`,
        orderId: order._id,
        customerName: "Demo Customer",
        amount: order.totalAmount,
        status: "Successful",
        method: "Online Payment",
        gatewayOrderId: null,
        gatewayPaymentId: null,
        createdAt: `${order.createdAt}+05:30`,
        reviewStatus: order.orderStatus === "cancelled" ? "Flagged" : "Clear",
        reviewReason: order.orderStatus === "cancelled"
            ? "Cancelled order requires separate refund verification."
            : "",
        reviewHistory: [],
    })),
    ...extraAttempts.map((attempt) => ({
        ...attempt,
        orderId: null,
        customerName: "Preview Customer",
        method: "Online Payment",
        gatewayOrderId: null,
        gatewayPaymentId: null,
        reviewStatus: "Clear",
        reviewReason: "",
        reviewHistory: [],
    })),
];

// ================== HELPERS ==================
function readList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));

        return Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

function loadPayments() {
    return readList(STORAGE_KEY) || initialPayments;
}

function loadOrders() {
    return readList(ORDER_KEY) || demoOrders;
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
          }).format(date);
}

function PaymentBadge({ value, review = false }) {
    const theme = review
        ? { Clear: "neutral", Flagged: "danger", Closed: "success" }[value]
        : {
              Successful: "success",
              Pending: "warning",
              Failed: "danger",
              Cancelled: "neutral",
          }[value];

    return (
        <span className={`pay-badge pay-badge--${theme || "neutral"}`}>
            <span className="pay-badge-dot" />
            {value}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="pay-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== PAYMENT MANAGEMENT ==================
function Payments() {
    const [payments, setPayments] = useState(loadPayments);
    const [orders, setOrders] = useState(loadOrders);

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [reviewFilter, setReviewFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DETAILS AND REVIEW ==================
    const [selectedId, setSelectedId] = useState(null);
    const [reviewAction, setReviewAction] = useState(null);
    const [reviewNote, setReviewNote] = useState("");
    const [reviewError, setReviewError] = useState("");

    const selectedPayment = payments.find((payment) => payment.id === selectedId);
    const actionPayment = payments.find((payment) => payment.id === reviewAction?.paymentId);

    const getOrder = (orderId) => orders.find(
        (order) => String(order.id || order._id) === String(orderId)
    );

    // ================== SAVE RECORDS ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
        } catch {
            // Continue using current React state.
        }
    }, [payments]);

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Payment Attempts",
            value: payments.length,
            description: "Recorded transaction attempts",
            icon: "fa-credit-card",
            theme: "blue",
        },
        {
            label: "Successful Payments",
            value: payments.filter((item) => item.status === "Successful").length,
            description: "Successful preview attempts",
            icon: "fa-circle-check",
            theme: "green",
        },
        {
            label: "Pending Payments",
            value: payments.filter((item) => item.status === "Pending").length,
            description: "Awaiting payment confirmation",
            icon: "fa-clock",
            theme: "orange",
        },
        {
            label: "Failed / Cancelled",
            value: payments.filter((item) =>
                ["Failed", "Cancelled"].includes(item.status)
            ).length,
            description: "Unsuccessful payment attempts",
            icon: "fa-circle-xmark",
            theme: "red",
        },
    ];

    const totalSuccessful = payments
        .filter((item) => item.status === "Successful")
        .reduce((total, item) => total + Number(item.amount || 0), 0);

    const openReviews = payments.filter((item) =>
        item.reviewStatus === "Flagged"
    ).length;

    // ================== SEARCH RESULTS ==================
    const filteredPayments = payments.filter((payment) => {
        const query = search.trim().toLowerCase();

        const matchesSearch = [
            payment.id,
            payment.orderId,
            payment.customerName,
            payment.gatewayOrderId,
            payment.gatewayPaymentId,
        ].some((value) => String(value || "").toLowerCase().includes(query));

        return matchesSearch &&
            (statusFilter === "All" || payment.status === statusFilter) &&
            (reviewFilter === "All" || payment.reviewStatus === reviewFilter);
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const visiblePayments = filteredPayments.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search.trim()) ||
        statusFilter !== "All" ||
        reviewFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setReviewFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        setPayments(loadPayments());
        setOrders(loadOrders());
        setPage(0);
        toast.info("Payment records refreshed.");
    };

    // ================== REVIEW ACTIONS ==================
    const openReview = (payment, type) => {
        setSelectedId(null);
        setReviewAction({
            paymentId: payment.id,
            type,
            previousStatus: payment.reviewStatus,
        });
        setReviewNote("");
        setReviewError("");
    };

    const closeReview = () => {
        setReviewAction(null);
        setReviewNote("");
        setReviewError("");
    };

    const handleReview = () => {
        if (!actionPayment || !reviewAction ||
            actionPayment.reviewStatus !== reviewAction.previousStatus) {
            toast.error("Payment review record has changed. Please refresh.");
            closeReview();
            return;
        }

        const note = reviewNote.trim();

        if (note.length < 5 || note.length > 300) {
            setReviewError("Enter a review note containing 5–300 characters.");
            return;
        }

        const nextStatus = reviewAction.type === "flag" ? "Flagged" : "Closed";
        const now = new Date().toISOString();

        setPayments((previous) => previous.map((payment) =>
            payment.id === reviewAction.paymentId
                ? {
                      ...payment,
                      reviewStatus: nextStatus,
                      reviewReason: reviewAction.type === "flag"
                          ? note
                          : payment.reviewReason,
                      reviewHistory: [
                          ...(payment.reviewHistory || []),
                          {
                              status: nextStatus,
                              note,
                              date: now,
                          },
                      ],
                  }
                : payment
        ));

        toast.success(
            reviewAction.type === "flag"
                ? "Payment attempt flagged for review."
                : "Review note closed successfully."
        );

        closeReview();
    };

    return (
        <div className="manage-payments">
            {/* ================== PAGE HEADER ================== */}
            <section className="pay-hero">
                <div className="pay-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-credit-card" aria-hidden="true" />
                        PAYMENT MANAGEMENT
                    </span>

                    <p>
                        Monitor online payment attempts, transaction references,
                        payment statuses and reconciliation exceptions.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="pay-refresh-button"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="pay-stats" aria-label="Payment overview">
                {statistics.map((item) => (
                    <article key={item.label} className={`pay-stat pay-stat--${item.theme}`}>
                        <div className="pay-stat-heading">
                            <span>{item.label}</span>

                            <span className="pay-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong className="pay-stat-value">{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== PAYMENT SUMMARY ================== */}
            <section className="pay-summary">
                <div className="pay-summary-icon">
                    <i className="fa-solid fa-chart-line" aria-hidden="true" />
                </div>

                <div>
                    <span>Successful Payment Value</span>
                    <strong>{formatMoney(totalSuccessful)}</strong>
                    <p>Illustrative total from successful preview attempts.</p>
                </div>

                <div className="pay-summary-review">
                    <span>Open Reviews</span>
                    <strong>{openReviews}</strong>
                    <small>Require administrative follow-up</small>
                </div>
            </section>

            {/* ================== PAYMENT RECORDS ================== */}
            <section className="pay-card">
                <div className="pay-section-header">
                    <div className="pay-section-heading">
                        <span className="pay-section-icon">
                            <i className="fa-solid fa-receipt" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Payment Transactions</h2>
                            <p>Review payment attempts, order links and administrative notes.</p>
                        </div>
                    </div>

                    <span className="pay-record-count">
                        {filteredPayments.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="pay-toolbar">
                    <div className="pay-search">
                        <TextField
                            label="Search Payments"
                            placeholder="Payment reference, order ID or customer"
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
                                    htmlInput: { maxLength: 100 },
                                },
                            }}
                            fullWidth
                        />
                    </div>

                    <TextField
                        select
                        label="Payment Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        className="pay-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Successful">Successful</MenuItem>
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Failed">Failed</MenuItem>
                        <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </TextField>

                    <TextField
                        select
                        label="Review Status"
                        value={reviewFilter}
                        onChange={(event) => {
                            setReviewFilter(event.target.value);
                            setPage(0);
                        }}
                        className="pay-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Reviews</MenuItem>
                        <MenuItem value="Clear">No Flag</MenuItem>
                        <MenuItem value="Flagged">Flagged</MenuItem>
                        <MenuItem value="Closed">Closed</MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        className="pay-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== PREVIEW INFORMATION ================== */}
                <div className="pay-preview-note">
                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                    Payment records are frontend previews. Gateway references
                    and payment verification will be available after backend integration.
                </div>

                {/* ================== PAYMENTS TABLE ================== */}
                <TableContainer className="pay-table-container">
                    <Table className="pay-table" aria-label="Payment transactions">
                        <TableHead>
                            <TableRow>
                                <TableCell>Payment Reference</TableCell>
                                <TableCell>Order Reference</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Attempt Date</TableCell>
                                <TableCell>Payment Status</TableCell>
                                <TableCell>Review</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visiblePayments.map((payment) => (
                                <TableRow key={payment.id} hover>
                                    <TableCell>
                                        <div className="pay-cell">
                                            <strong className="pay-reference">{payment.id}</strong>
                                            <small>Preview reference</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="pay-cell">
                                            <strong>
                                                {payment.orderId || "No Order Created"}
                                            </strong>
                                            <small>
                                                {payment.orderId ? "Linked order" : "Payment attempt only"}
                                            </small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="pay-customer">
                                            {payment.customerName}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <strong className="pay-amount">
                                            {formatMoney(payment.amount)}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <span className="pay-date">
                                            {formatDate(payment.createdAt)}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <PaymentBadge value={payment.status} />
                                    </TableCell>

                                    <TableCell>
                                        <PaymentBadge value={payment.reviewStatus} review />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            className="pay-view-button"
                                            onClick={() => setSelectedId(payment.id)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visiblePayments.length && (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="pay-empty">
                                            <span>
                                                <i className="fa-solid fa-credit-card" />
                                            </span>

                                            <h3>No Payments Found</h3>
                                            <p>Try adjusting your search or payment filters.</p>

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

                {/* ================== PAGINATION ================== */}
                <TablePagination
                    component="div"
                    className="pay-pagination"
                    count={filteredPayments.length}
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

            {/* ================== PAYMENT DETAILS ================== */}
            <Dialog
                open={Boolean(selectedPayment)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "pay-dialog" } }}
            >
                {selectedPayment && (
                    <>
                        <DialogTitle>Payment Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="pay-detail-banner">
                                <div>
                                    <span>PAYMENT REFERENCE</span>
                                    <h3>{selectedPayment.id}</h3>
                                    <p>{formatDate(selectedPayment.createdAt)}</p>
                                </div>

                                <PaymentBadge value={selectedPayment.status} />
                            </div>

                            <div className="pay-detail-section">
                                <h4>Transaction Information</h4>

                                <dl className="pay-detail-grid">
                                    <DetailItem
                                        label="Payment Amount"
                                        value={formatMoney(selectedPayment.amount)}
                                    />
                                    <DetailItem
                                        label="Payment Method"
                                        value={selectedPayment.method}
                                    />
                                    <DetailItem
                                        label="Payment Status"
                                        value={`${selectedPayment.status} (Preview)`}
                                    />
                                    <DetailItem
                                        label="Customer"
                                        value={selectedPayment.customerName}
                                    />
                                    <DetailItem
                                        label="Order Reference"
                                        value={selectedPayment.orderId || "No order created"}
                                    />
                                    <DetailItem
                                        label="Gateway"
                                        value="Not connected"
                                    />
                                    <DetailItem
                                        label="Gateway Order ID"
                                        value={selectedPayment.gatewayOrderId || "Not available"}
                                    />
                                    <DetailItem
                                        label="Gateway Payment ID"
                                        value={selectedPayment.gatewayPaymentId || "Not available"}
                                    />
                                </dl>
                            </div>

                            {selectedPayment.orderId && (
                                <div className="pay-detail-section">
                                    <h4>Linked Order</h4>

                                    <div className="pay-linked-order">
                                        <div>
                                            <strong>{selectedPayment.orderId}</strong>
                                            <span>
                                                {getOrder(selectedPayment.orderId)
                                                    ? getStatusLabel(
                                                          normalizeStatus(
                                                              getOrder(selectedPayment.orderId).orderStatus
                                                          )
                                                      )
                                                    : "Order record unavailable"}
                                            </span>
                                        </div>

                                        <Button
                                            component={Link}
                                            to="/manage/orders"
                                            variant="outlined"
                                            size="small"
                                        >
                                            Manage Orders
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="pay-detail-section">
                                <h4>Administrative Review</h4>

                                <div className="pay-review-overview">
                                    <span>Current Review Status</span>
                                    <PaymentBadge value={selectedPayment.reviewStatus} review />
                                </div>

                                {selectedPayment.reviewReason && (
                                    <Alert severity="warning" className="pay-detail-alert">
                                        <strong>Review Reason:</strong>{" "}
                                        {selectedPayment.reviewReason}
                                    </Alert>
                                )}

                                {(selectedPayment.reviewHistory || []).length > 0 && (
                                    <div className="pay-review-history">
                                        {selectedPayment.reviewHistory.map((entry, index) => (
                                            <div key={index}>
                                                <strong>{entry.status}</strong>
                                                <small>{formatDate(entry.date)}</small>
                                                <p>{entry.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Alert severity="info" className="pay-detail-alert">
                                Payment status cannot be changed manually.
                                Gateway verification and refunds require separate backend workflows.
                            </Alert>
                        </DialogContent>

                        <DialogActions className="pay-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            <Button
                                variant="contained"
                                color={selectedPayment.reviewStatus === "Flagged" ? "primary" : "warning"}
                                onClick={() => openReview(
                                    selectedPayment,
                                    selectedPayment.reviewStatus === "Flagged" ? "close" : "flag"
                                )}
                            >
                                {selectedPayment.reviewStatus === "Flagged"
                                    ? "Close Review"
                                    : "Flag for Review"}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== REVIEW CONFIRMATION ================== */}
            <Dialog
                open={Boolean(reviewAction)}
                onClose={closeReview}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "pay-dialog" } }}
            >
                <DialogTitle>
                    {reviewAction?.type === "flag"
                        ? "Flag Payment for Review"
                        : "Close Payment Review"}
                </DialogTitle>

                <DialogContent dividers>
                    <p className="pay-confirm-text">
                        Payment Reference: <strong>{actionPayment?.id}</strong>
                    </p>

                    {reviewAction?.type === "close" && (
                        <Alert severity="info" className="pay-detail-alert">
                            Closing this review note does not verify a payment,
                            change its status or process a refund.
                        </Alert>
                    )}

                    <TextField
                        label={reviewAction?.type === "flag"
                            ? "Reason for Review"
                            : "Resolution Note"}
                        value={reviewNote}
                        onChange={(event) => {
                            setReviewNote(event.target.value);
                            setReviewError("");
                        }}
                        error={Boolean(reviewError)}
                        helperText={reviewError || "Enter 5–300 characters."}
                        slotProps={{ htmlInput: { maxLength: 300 } }}
                        multiline
                        minRows={3}
                        fullWidth
                        required
                    />
                </DialogContent>

                <DialogActions className="pay-dialog-actions">
                    <Button color="inherit" onClick={closeReview}>
                        Cancel
                    </Button>

                    <Button variant="contained" onClick={handleReview}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Payments;
