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

import api from "../services/api";

// ================== FORMAT HELPERS ==================
const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(amount || 0));

const date = (value) =>
    value
        ? new Date(value).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
          })
        : "—";

// ================== STATUS BADGE ==================
function RefundBadge({ value }) {
    const theme =
        {
            Queued: "warning",
            Pending: "warning",
            Completed: "success",
            Failed: "danger",
            Review: "danger",
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
    const [retryNote, setRetryNote] = useState("");
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [reviewFilter, setReviewFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DIALOGS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [reviewId, setReviewId] = useState(null);
    const [reviewNote, setReviewNote] = useState("");

    // ================== FETCH REFUNDS ==================
    const refresh = async () => {
        setError("");

        try {
            const all = [];

            for (let next = 1; ; next++) {
                const { data } = await api.get("/refunds/admin", {
                    params: { page: next },
                });

                all.push(...data.refunds);

                if (!data.hasMore) break;
            }

            setRefunds(all);
        } catch (failure) {
            setError(failure.message || "Unable to load refunds.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const selected = refunds.find((row) => row.id === selectedId);

    const reviewing = refunds.find((row) => row.id === reviewId);

    const reviewAction = reviewing?.reviewStatus === "Open" ? "Closed" : "Open";

    const retryRefund = async () => {
        const note = retryNote.trim();
        if (!note || note.trim().length < 5) return;
        try {
            await api.post(`/refunds/admin/${selected.id}/retry`, { note });
            await refresh();
            toast.success("Refund reconciliation queued.");
        } catch (error) {
            toast.error(error.message);
        }
    };

    // ================== STATISTICS ==================
    const statistics = [
        [
            "Total Refunds",
            refunds.length,
            "Cancellation refund records",
            "blue",
            "fa-money-bill-transfer",
        ],
        [
            "Pending Refunds",
            refunds.filter((row) => ["Queued", "Pending"].includes(row.status)).length,
            "Awaiting gateway confirmation",
            "orange",
            "fa-clock",
        ],
        [
            "Completed Refunds",
            refunds.filter((row) => row.status === "Completed").length,
            "Provider-confirmed outcomes",
            "green",
            "fa-circle-check",
        ],
        [
            "Needs Review",
            refunds.filter((row) => row.status === "Review").length,
            "Gateway exception cases",
            "red",
            "fa-circle-exclamation",
        ],
    ];

    const pendingAmount = refunds
        .filter((row) => ["Queued", "Pending"].includes(row.status))
        .reduce((total, row) => total + row.amount, 0);

    // ================== TABLE FILTERS ==================
    const filtered = refunds
        .filter((row) => {
            const query = search.trim().toLowerCase();

            const matchesSearch = [
                row.id,
                row.orderId,
                row.parcelId,
                row.customerName,
                row.reason,
                row.reference,
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            return (
                matchesSearch &&
                (statusFilter === "All" || row.status === statusFilter) &&
                (reviewFilter === "All" || row.reviewStatus === reviewFilter)
            );
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));

    const visible = filtered.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);

    const hasFilters = search.trim() || statusFilter !== "All" || reviewFilter !== "All";

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setReviewFilter("All");
        setPage(0);
    };

    // ================== EXCEPTION REVIEW ==================
    const saveReview = async () => {
        if (!reviewing || reviewNote.trim().length < 5) {
            toast.error("Enter a review note of at least 5 characters.");
            return;
        }

        setBusy(true);

        try {
            await api.patch(`/refunds/admin/${reviewing.id}/review`, {
                status: reviewAction,
                note: reviewNote.trim(),
            });

            setReviewId(null);
            setReviewNote("");

            await refresh();

            toast.success("Refund exception note updated.");
        } catch (failure) {
            toast.error(failure.message || "Unable to save review.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="manage-refunds">
            {/* ================== PAGE HEADER ================== */}
            <section className="rf-hero">
                <div className="rf-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-money-bill-transfer" />
                        REFUND MANAGEMENT
                    </span>

                    <p>
                        Monitor cancellation refunds, gateway outcomes and administrative
                        exceptions.
                    </p>
                </div>

                <Button
                    className="rf-refresh-button"
                    variant="outlined"
                    onClick={refresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {error && (
                <Alert severity="error" className="rf-alert">
                    {error}
                </Alert>
            )}

            {/* ================== OVERVIEW ================== */}
            <section className="rf-stats" aria-label="Refund overview">
                {statistics.map(([label, value, description, theme, icon]) => (
                    <article key={label} className={`rf-stat rf-stat--${theme}`}>
                        <div className="rf-stat-heading">
                            <span>{label}</span>

                            <span className="rf-stat-icon">
                                <i className={`fa-solid ${icon}`} />
                            </span>
                        </div>

                        <strong className="rf-stat-value">{value}</strong>

                        <p>{description}</p>
                    </article>
                ))}
            </section>

            {/* ================== REFUND SUMMARY ================== */}
            <section className="rf-summary">
                <span className="rf-summary-icon">
                    <i className="fa-solid fa-wallet" />
                </span>

                <div className="rf-summary-main">
                    <span>Pending Refund Value</span>

                    <strong>{money(pendingAmount)}</strong>

                    <small>Provider confirmation pending; not yet refunded.</small>
                </div>

                <div className="rf-summary-review">
                    <span>Open Exceptions</span>

                    <strong>{refunds.filter((row) => row.reviewStatus === "Open").length}</strong>

                    <small>Require administrative attention</small>
                </div>
            </section>

            {/* ================== REFUND TABLE ================== */}
            <section className="rf-card">
                <div className="rf-section-header">
                    <div className="rf-section-heading">
                        <span className="rf-section-icon">
                            <i className="fa-solid fa-receipt" />
                        </span>

                        <div>
                            <h2>Cancellation Refunds</h2>

                            <p>Customer cancellation and Razorpay refund records.</p>
                        </div>
                    </div>

                    <span className="rf-record-count">{filtered.length} Records</span>
                </div>

                {/* ================== SEARCH / FILTERS ================== */}
                <div className="rf-toolbar">
                    <div className="rf-search">
                        <TextField
                            size="small"
                            fullWidth
                            label="Search Refunds"
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
                        />
                    </div>

                    <TextField
                        select
                        size="small"
                        className="rf-filter"
                        label="Refund Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        {["All", "Queued", "Pending", "Completed", "Review"].map((value) => (
                            <MenuItem key={value} value={value}>
                                {value === "All" ? "All Statuses" : value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        className="rf-filter"
                        label="Review Status"
                        value={reviewFilter}
                        onChange={(event) => {
                            setReviewFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        {["All", "Clear", "Open", "Closed"].map((value) => (
                            <MenuItem key={value} value={value}>
                                {value === "All" ? "All Reviews" : value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        disabled={!hasFilters}
                        onClick={resetFilters}
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
                            {visible.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <div className="rf-cell">
                                            <strong className="rf-ref">
                                                {row.reference || row.id}
                                            </strong>

                                            <small>Parcel: {row.parcelId}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="rf-cell">
                                            <strong>{row.orderId}</strong>

                                            <small>{row.customerName}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <strong className="rf-amount">{money(row.amount)}</strong>
                                    </TableCell>

                                    <TableCell>
                                        <span className="rf-date">{date(row.cancelledAt)}</span>
                                    </TableCell>

                                    <TableCell>
                                        <RefundBadge value={row.status} />
                                    </TableCell>

                                    <TableCell>
                                        <RefundBadge value={row.reviewStatus} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            className="rf-view-button"
                                            onClick={() => setSelectedId(row.id)}
                                        >
                                            View Details{" "}
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visible.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="rf-empty">
                                            <span>
                                                <i className="fa-solid fa-money-bill-transfer" />
                                            </span>

                                            <h3>
                                                {loading ? "Loading Refunds" : "No Refunds Found"}
                                            </h3>

                                            <p>Cancelled paid parcels will appear here.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    className="rf-pagination"
                    count={filtered.length}
                    page={safePage}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, value) => setPage(value)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== REFUND DETAILS ================== */}
            <Dialog
                open={Boolean(selected)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{
                    paper: {
                        className: "rf-dialog",
                    },
                }}
            >
                {selected && (
                    <>
                        <DialogTitle>Refund Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="rf-detail-banner">
                                <div>
                                    <span>REFUND REFERENCE</span>

                                    <h3>{selected.reference || selected.id}</h3>

                                    <p>{date(selected.createdAt)}</p>
                                </div>

                                <RefundBadge value={selected.status} />
                            </div>

                            {/* ================== DETAILS ================== */}
                            <div className="rf-detail-section">
                                <h4>Refund Information</h4>

                                <dl className="rf-detail-grid">
                                    <DetailItem label="Order ID" value={selected.orderId} />

                                    <DetailItem label="Parcel ID" value={selected.parcelId} />

                                    <DetailItem label="Customer" value={selected.customerName} />

                                    <DetailItem
                                        label="Refund Amount"
                                        value={money(selected.amount)}
                                    />

                                    <DetailItem
                                        label="Gateway Refund ID"
                                        value={selected.reference || "Pending"}
                                    />

                                    <DetailItem label="Refund Status" value={selected.status} />

                                    <DetailItem label="Created" value={date(selected.createdAt)} />

                                    <DetailItem
                                        label="Processed"
                                        value={date(selected.completedAt)}
                                    />

                                    <DetailItem label="Retry Attempts" value={selected.attempts} />
                                </dl>
                            </div>

                            {/* ================== CANCELLATION ================== */}
                            <div className="rf-detail-section">
                                <h4>Cancellation & Adjustments</h4>

                                <div className="rf-reason">
                                    <strong>Cancellation Reason</strong>

                                    <p>
                                        {selected.reason}

                                        {selected.details ? ` — ${selected.details}` : ""}
                                    </p>
                                </div>

                                <div className="rf-adjustments">
                                    <div>
                                        <i className="fa-solid fa-boxes-stacked" />
                                        <span>Paid-order inventory</span>
                                        <strong>Restored once</strong>
                                    </div>

                                    <div>
                                        <i className="fa-solid fa-wallet" />
                                        <span>Refund Amount</span>
                                        <strong>{money(selected.amount)}</strong>
                                    </div>
                                </div>

                                <dl className="rf-detail-grid">
                                    <DetailItem
                                        label="Product Subtotal"
                                        value={money(selected.breakdown.products)}
                                    />

                                    <DetailItem
                                        label="Allocated Coupon"
                                        value={money(selected.breakdown.coupon)}
                                    />

                                    <DetailItem
                                        label="Allocated Delivery"
                                        value={money(selected.breakdown.shipping)}
                                    />
                                </dl>
                            </div>

                            {selected.failureReason && (
                                <Alert severity="warning" className="rf-alert">
                                    {selected.failureReason}
                                </Alert>
                            )}

                            {/* ================== EXCEPTION REVIEW ================== */}
                            <div className="rf-detail-section">
                                <h4>Exception Review</h4>

                                <div className="rf-review-status">
                                    <span>Current Review</span>

                                    <RefundBadge value={selected.reviewStatus} />
                                </div>

                                {selected.reviewReason && (
                                    <Alert severity="info">{selected.reviewReason}</Alert>
                                )}

                                {(selected.reviewHistory || []).map((event, index) => (
                                    <div className="rf-history" key={index}>
                                        <strong>{event.status}</strong>

                                        <small>{date(event.date)}</small>

                                        <p>{event.note}</p>
                                    </div>
                                ))}
                            </div>

                            <Alert severity="info" className="rf-alert">
                                Review notes do not change gateway refund status. Only confirmed
                                provider results mark a refund Completed.
                            </Alert>
                        </DialogContent>

                        <DialogActions className="rf-dialog-actions">
                            {selected.status === "Review" && (
                                <>
                                    <TextField
                                        size="small"
                                        label="Reconciliation reason"
                                        value={retryNote}
                                        onChange={(e) => setRetryNote(e.target.value)}
                                        slotProps={{ htmlInput: { maxLength: 300 } }}
                                    />
                                    <Button
                                        disabled={retryNote.trim().length < 5}
                                        onClick={retryRefund}
                                    >
                                        Retry confirmation
                                    </Button>
                                </>
                            )}

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
                                onClick={() => {
                                    setReviewId(selected.id);
                                    setSelectedId(null);
                                }}
                            >
                                {selected.reviewStatus === "Open"
                                    ? "Close Exception"
                                    : "Flag Exception"}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== REVIEW NOTE ================== */}
            <Dialog
                open={Boolean(reviewing)}
                onClose={() => setReviewId(null)}
                fullWidth
                maxWidth="xs"
                slotProps={{
                    paper: {
                        className: "rf-dialog",
                    },
                }}
            >
                <DialogTitle>
                    {reviewAction === "Open" ? "Flag Exception" : "Close Exception"}
                </DialogTitle>

                <DialogContent dividers>
                    <p>
                        Refund: <strong>{reviewing?.reference || reviewing?.id}</strong>
                    </p>

                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        required
                        label="Review Note"
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        slotProps={{
                            htmlInput: {
                                maxLength: 300,
                            },
                        }}
                        helperText="Enter 5–300 characters"
                    />
                </DialogContent>

                <DialogActions className="rf-dialog-actions">
                    <Button color="inherit" onClick={() => setReviewId(null)}>
                        Cancel
                    </Button>

                    <Button variant="contained" disabled={busy} onClick={saveReview}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Refunds;
