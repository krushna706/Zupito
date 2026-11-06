
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

import { demoOrders } from "../data/orderPreview";
import { normalizeStatus } from "../utils/orderStatus";

// ================== REFUND CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_refunds";
const ORDER_KEY = "zupito_admin_orders";
const PAYMENT_KEY = "zupito_admin_payments";

const HISTORICAL_DEMO_ORDER = "ZUP-20261028-1004";

// ================== DATA HELPERS ==================
function readList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

function loadOrders() {
    return readList(ORDER_KEY) || demoOrders;
}

function getOrderId(order) {
    return String(order.id || order._id || "");
}

function getRefundOutcome(order) {
    const value = String(order.refundStatus || "").toLowerCase();

    if (value.startsWith("refunded") || value.startsWith("completed")) {
        return "Completed (Demo)";
    }

    if (value.startsWith("failed")) return "Failed";

    return "Pending";
}

function reconcileRefunds(previous, orders) {
    const records = [...previous];
    const existing = new Set(records.map((record) => record.orderId));

    for (const order of orders) {
        const orderId = getOrderId(order);

        if (!orderId || normalizeStatus(order.orderStatus) !== "cancelled") {
            continue;
        }

        const index = records.findIndex((record) => record.orderId === orderId);
        const outcome = getRefundOutcome(order);

        if (index >= 0) {
            const record = records[index];

            if (record.status === "Pending" && outcome !== "Pending") {
                records[index] = {
                    ...record,
                    status: outcome,
                    processedAt: order.refundedAt || record.processedAt,
                    failureReason: order.refundFailureReason || "",
                };
            }

            continue;
        }

        if (existing.has(orderId)) continue;

        const isHistoricalDemo = orderId === HISTORICAL_DEMO_ORDER &&
            !order.refundStatus;

        records.push({
            id: `RF-${orderId}`,
            orderId,
            customerName: order.customerName || order.address?.name || "Demo Customer",
            amount: Number(order.totalAmount ?? order.total ?? 0),
            reason: order.cancellationReason || "Order cancelled before pickup.",
            status: isHistoricalDemo ? "Completed (Demo)" : outcome,
            createdAt: order.cancelledAt || order.createdAt || new Date().toISOString(),
            processedAt: isHistoricalDemo
                ? "2026-10-28T11:30:00+05:30"
                : order.refundedAt || null,
            internalReference: isHistoricalDemo ? "SIM-REF-1004" : null,
            failureReason: order.refundFailureReason || "",
            reviewStatus: "Clear",
            reviewReason: "",
            reviewHistory: [],
        });

        existing.add(orderId);
    }

    return records;
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

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function RefundBadge({ value }) {
    const theme = {
        Pending: "warning",
        "Completed (Demo)": "success",
        Failed: "danger",
        Clear: "neutral",
        Open: "danger",
        Closed: "success",
    }[value] || "neutral";

    return (
        <span className={`rf-badge rf-badge--${theme}`}>
            <span className="rf-badge-dot" />
            {value}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="rf-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== REFUND MANAGEMENT ==================
function Refunds() {
    const [refunds, setRefunds] = useState(() =>
        reconcileRefunds(readList(STORAGE_KEY) || [], loadOrders())
    );
    const [payments, setPayments] = useState(() => readList(PAYMENT_KEY) || []);

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

    const selectedRefund = refunds.find((record) => record.id === selectedId);
    const actionRefund = refunds.find((record) => record.id === reviewAction?.refundId);

    const findPayment = (orderId) =>
        payments.find((payment) => payment.orderId === orderId);

    // ================== SAVE REFUND RECORDS ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(refunds));
        } catch {
            // Preserve React state if browser storage is unavailable.
        }
    }, [refunds]);

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Refunds",
            value: refunds.length,
            description: "Cancellation refund records",
            theme: "blue",
            icon: "fa-money-bill-transfer",
        },
        {
            label: "Pending Refunds",
            value: refunds.filter((item) => item.status === "Pending").length,
            description: "Awaiting payment verification",
            theme: "orange",
            icon: "fa-clock",
        },
        {
            label: "Completed Refunds",
            value: refunds.filter((item) => item.status === "Completed (Demo)").length,
            description: "Completed demo outcomes",
            theme: "green",
            icon: "fa-circle-check",
        },
        {
            label: "Failed Refunds",
            value: refunds.filter((item) => item.status === "Failed").length,
            description: "Requires refund follow-up",
            theme: "red",
            icon: "fa-circle-exclamation",
        },
    ];

    const pendingAmount = refunds
        .filter((record) => record.status === "Pending")
        .reduce((total, record) => total + record.amount, 0);

    const openReviews = refunds.filter((record) =>
        record.reviewStatus === "Open"
    ).length;

    // ================== SEARCH AND FILTERS ==================
    const filteredRefunds = refunds.filter((record) => {
        const query = search.trim().toLowerCase();
        const payment = findPayment(record.orderId);

        const matchesSearch = [
            record.id,
            record.orderId,
            record.customerName,
            record.reason,
            record.internalReference,
            payment?.id,
        ].some((value) => String(value || "").toLowerCase().includes(query));

        return matchesSearch &&
            (statusFilter === "All" || record.status === statusFilter) &&
            (reviewFilter === "All" || record.reviewStatus === reviewFilter);
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const visibleRefunds = filteredRefunds.slice(
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
        setRefunds((previous) =>
            reconcileRefunds(previous, loadOrders())
        );
        setPayments(readList(PAYMENT_KEY) || []);
        setPage(0);
        toast.info("Cancellation refund records refreshed.");
    };

    // ================== REFUND EXCEPTION ACTIONS ==================
    const openReview = (record) => {
        setSelectedId(null);

        setReviewAction({
            refundId: record.id,
            previousStatus: record.reviewStatus,
            nextStatus: record.reviewStatus === "Open" ? "Closed" : "Open",
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
        if (!actionRefund || actionRefund.reviewStatus !== reviewAction.previousStatus) {
            toast.error("Refund review record has changed. Please refresh.");
            closeReview();
            return;
        }

        const note = reviewNote.trim();

        if (note.length < 5 || note.length > 300) {
            setReviewError("Enter a note containing 5–300 characters.");
            return;
        }

        const now = new Date().toISOString();

        setRefunds((previous) =>
            previous.map((record) =>
                record.id === reviewAction.refundId
                    ? {
                          ...record,
                          reviewStatus: reviewAction.nextStatus,
                          reviewReason: reviewAction.nextStatus === "Open"
                              ? note
                              : record.reviewReason,
                          reviewHistory: [
                              ...(record.reviewHistory || []),
                              {
                                  status: reviewAction.nextStatus,
                                  note,
                                  date: now,
                              },
                          ],
                      }
                    : record
            )
        );

        toast.success(
            reviewAction.nextStatus === "Open"
                ? "Refund exception recorded."
                : "Refund review closed. Refund outcome remains unchanged."
        );

        closeReview();
    };

    return (
        <div className="manage-refunds">
            {/* ================== PAGE HEADER ================== */}
            <section className="rf-hero">
                <div className="rf-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-money-bill-transfer" aria-hidden="true" />
                        REFUND MANAGEMENT
                    </span>

                    <p>
                        Track cancellation refunds, payment verification,
                        adjustment status and unresolved refund exceptions.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="rf-refresh-button"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="rf-stats" aria-label="Refund overview">
                {statistics.map((item) => (
                    <article key={item.label} className={`rf-stat rf-stat--${item.theme}`}>
                        <div className="rf-stat-heading">
                            <span>{item.label}</span>

                            <span className="rf-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong className="rf-stat-value">{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== REFUND SUMMARY ================== */}
            <section className="rf-summary">
                <span className="rf-summary-icon">
                    <i className="fa-solid fa-wallet" aria-hidden="true" />
                </span>

                <div className="rf-summary-main">
                    <span>Pending Refund Value</span>
                    <strong>{formatMoney(pendingAmount)}</strong>
                    <small>Cancellation amounts awaiting confirmation.</small>
                </div>

                <div className="rf-summary-review">
                    <span>Open Exceptions</span>
                    <strong>{openReviews}</strong>
                    <small>Require administrative attention</small>
                </div>
            </section>

            {/* ================== REFUNDS TABLE ================== */}
            <section className="rf-card">
                <div className="rf-section-header">
                    <div className="rf-section-heading">
                        <span className="rf-section-icon">
                            <i className="fa-solid fa-receipt" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Cancellation Refunds</h2>
                            <p>Review refund outcomes, order references and exceptions.</p>
                        </div>
                    </div>

                    <span className="rf-record-count">
                        {filteredRefunds.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="rf-toolbar">
                    <div className="rf-search">
                        <TextField
                            label="Search Refunds"
                            placeholder="Refund ID, order ID, customer or payment reference"
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
                        label="Refund Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        className="rf-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Completed (Demo)">Completed (Demo)</MenuItem>
                        <MenuItem value="Failed">Failed</MenuItem>
                    </TextField>

                    <TextField
                        select
                        label="Review Status"
                        value={reviewFilter}
                        onChange={(event) => {
                            setReviewFilter(event.target.value);
                            setPage(0);
                        }}
                        className="rf-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Reviews</MenuItem>
                        <MenuItem value="Clear">No Exception</MenuItem>
                        <MenuItem value="Open">Open</MenuItem>
                        <MenuItem value="Closed">Closed</MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        className="rf-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== RECORDS ================== */}
                <TableContainer className="rf-table-container">
                    <Table className="rf-table" aria-label="Cancellation refunds">
                        <TableHead>
                            <TableRow>
                                <TableCell>Refund Reference</TableCell>
                                <TableCell>Order / Customer</TableCell>
                                <TableCell>Refund Amount</TableCell>
                                <TableCell>Cancellation Date</TableCell>
                                <TableCell>Refund Status</TableCell>
                                <TableCell>Review Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleRefunds.map((record) => (
                                <TableRow key={record.id} hover>
                                    <TableCell>
                                        <div className="rf-cell">
                                            <strong className="rf-ref">{record.id}</strong>
                                            <small>Cancellation refund</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="rf-cell">
                                            <strong>{record.orderId}</strong>
                                            <small>{record.customerName}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <strong className="rf-amount">
                                            {formatMoney(record.amount)}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <span className="rf-date">
                                            {formatDate(record.createdAt)}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <RefundBadge value={record.status} />
                                    </TableCell>

                                    <TableCell>
                                        <RefundBadge value={record.reviewStatus} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            className="rf-view-button"
                                            onClick={() => setSelectedId(record.id)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {visibleRefunds.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="rf-empty">
                                            <span>
                                                <i className="fa-solid fa-money-bill-transfer" />
                                            </span>
                                            <h3>No Refunds Found</h3>
                                            <p>
                                                Refund records appear when an order is cancelled.
                                            </p>

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
                    className="rf-pagination"
                    count={filteredRefunds.length}
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

            {/* ================== REFUND DETAILS ================== */}
            <Dialog
                open={Boolean(selectedRefund)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "rf-dialog" } }}
            >
                {selectedRefund && (
                    <>
                        <DialogTitle>Refund Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="rf-detail-banner">
                                <div>
                                    <span>REFUND REFERENCE</span>
                                    <h3>{selectedRefund.id}</h3>
                                    <p>{formatDate(selectedRefund.createdAt)}</p>
                                </div>

                                <RefundBadge value={selectedRefund.status} />
                            </div>

                            <div className="rf-detail-section">
                                <h4>Refund Information</h4>

                                <dl className="rf-detail-grid">
                                    <DetailItem label="Order Reference" value={selectedRefund.orderId} />
                                    <DetailItem label="Customer" value={selectedRefund.customerName} />
                                    <DetailItem label="Refund Amount" value={formatMoney(selectedRefund.amount)} />
                                    <DetailItem label="Refund Outcome" value={selectedRefund.status} />
                                    <DetailItem label="Payment Attempt" value={findPayment(selectedRefund.orderId)?.id || "Not linked"} />
                                    <DetailItem label="Payment Status" value={findPayment(selectedRefund.orderId)?.status ? `${findPayment(selectedRefund.orderId).status} (Preview)` : "Not verified"} />
                                    <DetailItem label="Internal Refund Reference" value={selectedRefund.internalReference || "Not available"} />
                                    <DetailItem label="Gateway Refund ID" value="Not available" />
                                    <DetailItem label="Processed On" value={formatDate(selectedRefund.processedAt)} />
                                    <DetailItem label="Payment Method" value="Online Payment" />
                                </dl>
                            </div>

                            <div className="rf-detail-section">
                                <h4>Cancellation & Adjustments</h4>

                                <div className="rf-reason">
                                    <strong>Cancellation Reason</strong>
                                    <p>{selectedRefund.reason}</p>
                                </div>

                                <div className="rf-adjustments">
                                    <div>
                                        <i className="fa-solid fa-boxes-stacked" />
                                        <span>Inventory Release</span>
                                        <strong>Pending Integration</strong>
                                    </div>

                                    <div>
                                        <i className="fa-solid fa-wallet" />
                                        <span>Seller Earnings Adjustment</span>
                                        <strong>Pending Integration</strong>
                                    </div>
                                </div>
                            </div>

                            {selectedRefund.failureReason && (
                                <Alert severity="error" className="rf-alert">
                                    {selectedRefund.failureReason}
                                </Alert>
                            )}

                            <div className="rf-detail-section">
                                <h4>Exception Review</h4>

                                <div className="rf-review-status">
                                    <span>Current Review</span>
                                    <RefundBadge value={selectedRefund.reviewStatus} />
                                </div>

                                {selectedRefund.reviewReason && (
                                    <Alert severity="warning" className="rf-alert">
                                        <strong>Reason:</strong> {selectedRefund.reviewReason}
                                    </Alert>
                                )}

                                {(selectedRefund.reviewHistory || []).length > 0 && (
                                    <div className="rf-history">
                                        {selectedRefund.reviewHistory.map((event, index) => (
                                            <div key={index}>
                                                <strong>{event.status}</strong>
                                                <small>{formatDate(event.date)}</small>
                                                <p>{event.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Alert severity="info" className="rf-alert">
                                Refund outcomes are read-only. Closing an exception
                                does not verify payment, transfer money or complete
                                inventory and seller earnings adjustments.
                            </Alert>
                        </DialogContent>

                        <DialogActions className="rf-dialog-actions">
                            <Button
                                component={Link}
                                to="/manage/orders"
                                onClick={() => setSelectedId(null)}
                            >
                                Manage Orders
                            </Button>

                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            <Button
                                variant="contained"
                                onClick={() => openReview(selectedRefund)}
                            >
                                {selectedRefund.reviewStatus === "Open"
                                    ? "Close Exception"
                                    : "Flag Exception"}
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
                slotProps={{ paper: { className: "rf-dialog" } }}
            >
                <DialogTitle>
                    {reviewAction?.nextStatus === "Open"
                        ? "Flag Refund Exception"
                        : "Close Refund Exception"}
                </DialogTitle>

                <DialogContent dividers>
                    <p className="rf-confirm-text">
                        Refund: <strong>{actionRefund?.id}</strong>
                    </p>

                    {reviewAction?.nextStatus === "Closed" && (
                        <Alert severity="warning" className="rf-alert">
                            Closing an exception records an admin note only.
                            Refund processing status will remain unchanged.
                        </Alert>
                    )}

                    <TextField
                        label={reviewAction?.nextStatus === "Open"
                            ? "Exception Reason"
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

                <DialogActions className="rf-dialog-actions">
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

export default Refunds;
