import api from "../services/api";

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

import { sortNewestFirst } from "../utils/sortNewestFirst";

// ================== COMPLAINT CONFIGURATION ==================

const categories = [
    { value: "order", label: "Order & Delivery" },
    { value: "payment", label: "Payment Issue" },
    { value: "product", label: "Product Issue" },
    { value: "replacement", label: "Replacement Request" },
    { value: "account", label: "Account Issue" },
    { value: "other", label: "Other" },
];

const statuses = ["Open", "In Progress", "Resolved", "Closed"];

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
}

function getCategoryLabel(category) {
    return categories.find((item) => item.value === category)?.label || category;
}

function StatusBadge({ status }) {
    const theme =
        {
            Open: "danger",
            "In Progress": "warning",
            Resolved: "success",
            Closed: "neutral",
        }[status] || "neutral";

    return (
        <span className={`cp-badge cp-badge--${theme}`}>
            <i className="fa-solid fa-circle" aria-hidden="true" />
            {status}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="cp-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== COMPLAINT MANAGEMENT ==================
function Complaints() {
    const [complaints, setComplaints] = useState([]);

    // ================== SEARCH AND FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DETAILS AND ACTIONS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [replyId, setReplyId] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [replyError, setReplyError] = useState("");

    const [statusAction, setStatusAction] = useState(null);
    const [actionNote, setActionNote] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedComplaint = complaints.find((item) => item.id === selectedId);
    const replyComplaint = complaints.find((item) => item.id === replyId);
    const actionComplaint = complaints.find((item) => item.id === statusAction?.id);

    const loadComplaints = async () =>
        setComplaints((await api.get("/complaints")).data.complaints);
    useEffect(() => {
        loadComplaints().catch((error) => toast.error(error.message));
    }, []);

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Complaints",
            value: complaints.length,
            description: "Customer support requests",
            icon: "fa-headset",
            theme: "blue",
        },
        {
            label: "Open Tickets",
            value: complaints.filter((item) => item.status === "Open").length,
            description: "Waiting for initial review",
            icon: "fa-envelope-open-text",
            theme: "red",
        },
        {
            label: "In Progress",
            value: complaints.filter((item) => item.status === "In Progress").length,
            description: "Under administrative review",
            icon: "fa-clock",
            theme: "orange",
        },
        {
            label: "Resolved Tickets",
            value: complaints.filter((item) => ["Resolved", "Closed"].includes(item.status)).length,
            description: "Resolution recorded",
            icon: "fa-circle-check",
            theme: "green",
        },
    ];

    // ================== FILTERED COMPLAINTS ==================
    const filteredComplaints = sortNewestFirst(
        complaints.filter((item) => {
            const query = search.trim().toLowerCase();

            const matchesSearch = [
                item.id,
                item.orderId,
                item.customer,
                item.subject,
                item.description,
                getCategoryLabel(item.category),
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            return (
                matchesSearch &&
                (statusFilter === "All" || item.status === statusFilter) &&
                (categoryFilter === "All" || item.category === categoryFilter)
            );
        }),
        "createdAt"
    );

    const visibleComplaints = filteredComplaints.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search.trim()) || statusFilter !== "All" || categoryFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setCategoryFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        loadComplaints().catch((error) => toast.error(error.message));
        setPage(0);
        toast.info("Complaint records refreshed.");
    };

    // ================== ADMIN RESPONSE ==================
    const openReply = (complaint) => {
        setSelectedId(null);
        setReplyId(complaint.id);
        setReplyText("");
        setReplyError("");
    };

    const closeReply = () => {
        setReplyId(null);
        setReplyText("");
        setReplyError("");
    };

    const handleReply = async () => {
        if (!replyComplaint) return;
        try {
            await api.patch(`/complaints/${replyId}`, { message: replyText.trim() });
            await loadComplaints();
            closeReply();
        } catch (error) {
            setReplyError(error.message);
        }
    };

    // ================== STATUS MANAGEMENT ==================
    const statusTransitions = {
        start: "In Progress",
        resolve: "Resolved",
        close: "Closed",
        reopen: "In Progress",
    };

    const actionLabels = {
        start: "Start Review",
        resolve: "Resolve Complaint",
        close: "Close Complaint",
        reopen: "Reopen Complaint",
    };

    const openStatusAction = (complaint, type) => {
        setSelectedId(null);
        setStatusAction({
            id: complaint.id,
            type,
            previousStatus: complaint.status,
        });
        setActionNote("");
        setActionError("");
    };

    const closeStatusAction = () => {
        setStatusAction(null);
        setActionNote("");
        setActionError("");
    };

    const handleStatusUpdate = async () => {
        if (!actionComplaint) return;
        try {
            await api.patch(`/complaints/${actionComplaint.id}`, {
                status: statusTransitions[statusAction.type],
                note: actionNote.trim(),
            });
            await loadComplaints();
            closeStatusAction();
        } catch (error) {
            setActionError(error.message);
        }
    };

    return (
        <div className="manage-complaints">
            {/* ================== PAGE HEADER ================== */}
            <section className="cp-hero">
                <div>
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-headset" aria-hidden="true" />
                        COMPLAINT MANAGEMENT
                    </span>

                    <p>
                        Track support requests, respond to customer concerns and manage complaint
                        resolution history.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="cp-refresh"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="cp-stats" aria-label="Complaint overview">
                {statistics.map((item) => (
                    <article key={item.label} className={`cp-stat cp-stat--${item.theme}`}>
                        <div className="cp-stat-heading">
                            <span>{item.label}</span>

                            <span className="cp-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== COMPLAINT LIST ================== */}
            <section className="cp-card">
                <div className="cp-section-header">
                    <div className="cp-section-heading">
                        <span className="cp-section-icon">
                            <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Customer Complaints</h2>
                            <p>Manage support tickets, responses and resolution status.</p>
                        </div>
                    </div>

                    <span className="cp-record-count">{filteredComplaints.length} Records</span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="cp-toolbar">
                    <TextField
                        className="cp-search"
                        label="Search Complaints"
                        placeholder="Ticket ID, customer, order or subject"
                        size="small"
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
                            htmlInput: { maxLength: 100 },
                        }}
                        fullWidth
                    />

                    <TextField
                        select
                        className="cp-filter"
                        label="Complaint Status"
                        size="small"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Statuses</MenuItem>

                        {statuses.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        className="cp-filter cp-filter--category"
                        label="Category"
                        size="small"
                        value={categoryFilter}
                        onChange={(event) => {
                            setCategoryFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Categories</MenuItem>

                        {categories.map((category) => (
                            <MenuItem key={category.value} value={category.value}>
                                {category.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        className="cp-reset"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== COMPLAINTS TABLE ================== */}
                <TableContainer className="cp-table-scroll">
                    <Table className="cp-table" aria-label="Customer complaints">
                        <TableHead>
                            <TableRow>
                                <TableCell>Complaint / Order</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Subject / Description</TableCell>
                                <TableCell>Submitted On</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleComplaints.map((complaint) => (
                                <TableRow key={complaint.id} hover>
                                    <TableCell>
                                        <div className="cp-cell">
                                            <strong className="cp-code">{complaint.id}</strong>
                                            <small>{complaint.orderId || "General Enquiry"}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <strong className="cp-customer">
                                            {complaint.customer}
                                        </strong>
                                    </TableCell>

                                    <TableCell>
                                        <span className="cp-category">
                                            {getCategoryLabel(complaint.category)}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <div className="cp-subject">
                                            <strong>{complaint.subject}</strong>
                                            <p>{complaint.description}</p>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="cp-date">
                                            {formatDate(complaint.createdAt)}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <StatusBadge status={complaint.status} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            className="cp-view"
                                            onClick={() => setSelectedId(complaint.id)}
                                        >
                                            View Details
                                            <i className="fa-solid fa-arrow-up-right-from-square" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!visibleComplaints.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="cp-empty">
                                            <i className="fa-solid fa-headset" />
                                            <h3>No Complaints Found</h3>
                                            <p>Try adjusting your search or filters.</p>

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
                    className="cp-pagination"
                    count={filteredComplaints.length}
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

            {/* ================== COMPLAINT DETAILS ================== */}
            <Dialog
                open={Boolean(selectedComplaint)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "cp-dialog" } }}
            >
                {selectedComplaint && (
                    <>
                        <DialogTitle>Complaint Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="cp-detail-banner">
                                <div>
                                    <span>COMPLAINT REFERENCE</span>
                                    <h3>{selectedComplaint.id}</h3>
                                    <p>{formatDate(selectedComplaint.createdAt)}</p>
                                </div>

                                <StatusBadge status={selectedComplaint.status} />
                            </div>

                            <div className="cp-detail-section">
                                <h4>Complaint Information</h4>

                                <dl className="cp-detail-grid">
                                    <DetailItem
                                        label="Customer"
                                        value={selectedComplaint.customer}
                                    />
                                    <DetailItem
                                        label="Category"
                                        value={getCategoryLabel(selectedComplaint.category)}
                                    />
                                    <DetailItem
                                        label="Order Reference"
                                        value={selectedComplaint.orderId || "Not Applicable"}
                                    />
                                    <DetailItem
                                        label="Current Status"
                                        value={selectedComplaint.status}
                                    />
                                    <DetailItem
                                        label="Submitted On"
                                        value={formatDate(selectedComplaint.createdAt)}
                                    />
                                    <DetailItem
                                        label="Last Activity"
                                        value={formatDate(selectedComplaint.updatedAt)}
                                    />
                                </dl>
                            </div>

                            <div className="cp-detail-section">
                                <h4>Customer Complaint</h4>

                                <div className="cp-message">
                                    <strong>{selectedComplaint.subject}</strong>
                                    <p>{selectedComplaint.description}</p>
                                </div>
                            </div>

                            {selectedComplaint.resolution && (
                                <Alert severity="success" className="cp-alert">
                                    <strong>Resolution:</strong> {selectedComplaint.resolution}
                                </Alert>
                            )}

                            <div className="cp-detail-section">
                                <h4>
                                    Admin Responses ({(selectedComplaint.replies || []).length})
                                </h4>

                                {(selectedComplaint.replies || []).length ? (
                                    <div className="cp-replies">
                                        {[...selectedComplaint.replies].reverse().map((reply) => (
                                            <article key={reply.id}>
                                                <div>
                                                    <strong>{reply.author}</strong>
                                                    <small>{formatDate(reply.createdAt)}</small>
                                                </div>

                                                <p>{reply.message}</p>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="cp-no-replies">
                                        No Admin response has been recorded.
                                    </p>
                                )}
                            </div>

                            <div className="cp-detail-section">
                                <h4>Activity History</h4>

                                <div className="cp-history">
                                    {[...(selectedComplaint.history || [])]
                                        .reverse()
                                        .map((event, index) => (
                                            <div key={index}>
                                                <strong>{event.action}</strong>
                                                <small>{formatDate(event.date)}</small>
                                                <p>{event.note}</p>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <Alert severity="info" className="cp-alert">
                                Admin responses are visible to the customer. They are not yet
                                delivered to customer accounts.
                            </Alert>
                        </DialogContent>

                        <DialogActions className="cp-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            {selectedComplaint.status === "Open" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={() => openStatusAction(selectedComplaint, "start")}
                                    >
                                        Start Review
                                    </Button>

                                    <Button
                                        variant="contained"
                                        onClick={() => openReply(selectedComplaint)}
                                    >
                                        Add Response
                                    </Button>
                                </>
                            )}

                            {selectedComplaint.status === "In Progress" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={() => openReply(selectedComplaint)}
                                    >
                                        Add Response
                                    </Button>

                                    <Button
                                        variant="contained"
                                        onClick={() =>
                                            openStatusAction(selectedComplaint, "resolve")
                                        }
                                    >
                                        Resolve
                                    </Button>
                                </>
                            )}

                            {selectedComplaint.status === "Resolved" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={() =>
                                            openStatusAction(selectedComplaint, "reopen")
                                        }
                                    >
                                        Reopen
                                    </Button>

                                    <Button
                                        variant="contained"
                                        onClick={() => openStatusAction(selectedComplaint, "close")}
                                    >
                                        Close Ticket
                                    </Button>
                                </>
                            )}

                            {selectedComplaint.status === "Closed" && (
                                <Button
                                    variant="contained"
                                    onClick={() => openStatusAction(selectedComplaint, "reopen")}
                                >
                                    Reopen Ticket
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== ADMIN RESPONSE ================== */}
            <Dialog
                open={Boolean(replyComplaint)}
                onClose={closeReply}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "cp-dialog" } }}
            >
                <DialogTitle>Add Admin Response</DialogTitle>

                <DialogContent dividers>
                    <p className="cp-confirm-text">
                        Complaint: <strong>{replyComplaint?.id}</strong>
                    </p>

                    <Alert severity="info" className="cp-alert">
                        Response will be saved to this support ticket. Customer notification is not
                        connected.
                    </Alert>

                    <TextField
                        label="Admin Response"
                        value={replyText}
                        onChange={(event) => {
                            setReplyText(event.target.value);
                            setReplyError("");
                        }}
                        error={Boolean(replyError)}
                        helperText={replyError || "Enter 10–1,500 characters."}
                        slotProps={{ htmlInput: { maxLength: 1500 } }}
                        multiline
                        minRows={4}
                        fullWidth
                        required
                    />
                </DialogContent>

                <DialogActions className="cp-dialog-actions">
                    <Button color="inherit" onClick={closeReply}>
                        Cancel
                    </Button>

                    <Button variant="contained" onClick={handleReply}>
                        Save Response
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ================== STATUS CONFIRMATION ================== */}
            <Dialog
                open={Boolean(statusAction)}
                onClose={closeStatusAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "cp-dialog" } }}
            >
                <DialogTitle>{actionLabels[statusAction?.type] || "Update Complaint"}</DialogTitle>

                <DialogContent dividers>
                    <p className="cp-confirm-text">
                        Complaint: <strong>{actionComplaint?.id}</strong>
                    </p>

                    <Alert severity="info" className="cp-alert">
                        New status: <strong>{statusTransitions[statusAction?.type]}</strong>
                    </Alert>

                    <TextField
                        label={
                            statusAction?.type === "resolve"
                                ? "Resolution Summary"
                                : "Internal Note"
                        }
                        value={actionNote}
                        onChange={(event) => {
                            setActionNote(event.target.value);
                            setActionError("");
                        }}
                        error={Boolean(actionError)}
                        helperText={
                            actionError ||
                            (["resolve", "reopen"].includes(statusAction?.type)
                                ? "Required: 10–300 characters."
                                : "Optional internal note.")
                        }
                        slotProps={{ htmlInput: { maxLength: 300 } }}
                        multiline
                        minRows={3}
                        fullWidth
                    />
                </DialogContent>

                <DialogActions className="cp-dialog-actions">
                    <Button color="inherit" onClick={closeStatusAction}>
                        Cancel
                    </Button>

                    <Button variant="contained" onClick={handleStatusUpdate}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Complaints;
