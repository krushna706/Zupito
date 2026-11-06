
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
const STORAGE_KEY = "zupito_admin_complaints";

const categories = [
    { value: "order", label: "Order & Delivery" },
    { value: "payment", label: "Payment Issue" },
    { value: "product", label: "Product Issue" },
    { value: "replacement", label: "Replacement Request" },
    { value: "account", label: "Account Issue" },
    { value: "other", label: "Other" },
];

const statuses = ["Open", "In Progress", "Resolved", "Closed"];

const sampleTickets = [
    {
        id: "ZCT1010",
        customer: "Preview Customer 10",
        orderId: "ZUP-20261103-1001",
        category: "order",
        subject: "Parcel delivery update required",
        description: "The order contains multiple parcels. I need an update regarding the second parcel delivery.",
        status: "Open",
        createdAt: "2026-11-05T16:40:00+05:30",
    },
    {
        id: "ZCT1009",
        customer: "Preview Customer 09",
        orderId: "ZUP-20261102-1002",
        category: "product",
        subject: "Received a different product size",
        description: "The product delivered to me has a different size from the variant selected during checkout.",
        status: "Open",
        createdAt: "2026-11-05T10:15:00+05:30",
    },
    {
        id: "ZCT1008",
        customer: "Preview Customer 08",
        orderId: null,
        category: "account",
        subject: "Unable to update account information",
        description: "I would like to update my profile details but I am unable to save my changes.",
        status: "In Progress",
        createdAt: "2026-11-04T17:30:00+05:30",
    },
    {
        id: "ZCT1007",
        customer: "Preview Customer 07",
        orderId: "ZUP-20261028-1004",
        category: "payment",
        subject: "Refund status clarification",
        description: "My order was cancelled and I need clarification about the current refund status.",
        status: "Open",
        createdAt: "2026-11-04T12:20:00+05:30",
    },
    {
        id: "ZCT1006",
        customer: "Preview Customer 06",
        orderId: "ZUP-20261024-1005",
        category: "replacement",
        subject: "Replacement pickup information",
        description: "My replacement request is under review. Please provide information about the pickup process.",
        status: "In Progress",
        createdAt: "2026-11-03T15:50:00+05:30",
    },
    {
        id: "ZCT1005",
        customer: "Preview Customer 05",
        orderId: "ZUP-20261020-1006",
        category: "order",
        subject: "Unable to find delivery details",
        description: "The delivery timeline is not showing the full parcel tracking information.",
        status: "Resolved",
        createdAt: "2026-11-02T14:10:00+05:30",
    },
    {
        id: "ZCT1004",
        customer: "Preview Customer 04",
        orderId: "ZUP-20261015-1007",
        category: "product",
        subject: "Product packaging concern",
        description: "The original item packaging was damaged. I wanted to confirm what information was required.",
        status: "Closed",
        createdAt: "2026-10-30T11:40:00+05:30",
    },
    {
        id: "ZCT1003",
        customer: "Preview Customer 03",
        orderId: null,
        category: "other",
        subject: "Need help finding product information",
        description: "I need some clarification about the available product specifications before placing an order.",
        status: "Resolved",
        createdAt: "2026-10-28T13:15:00+05:30",
    },
    {
        id: "ZCT1002",
        customer: "Preview Customer 02",
        orderId: "ZUP-20261020-1006",
        category: "payment",
        subject: "Payment confirmation question",
        description: "I would like to understand how the payment confirmation appears after checkout.",
        status: "Closed",
        createdAt: "2026-10-25T10:25:00+05:30",
    },
    {
        id: "ZCT1001",
        customer: "Preview Customer 01",
        orderId: null,
        category: "account",
        subject: "Help with account access",
        description: "I needed assistance locating the password recovery option in my account.",
        status: "Resolved",
        createdAt: "2026-10-21T09:40:00+05:30",
    },
];

const initialComplaints = sampleTickets.map((ticket) => ({
    ...ticket,
    replies: ["Resolved", "Closed"].includes(ticket.status)
        ? [{
              id: `REPLY-${ticket.id}`,
              message: "We have reviewed your request and recorded the relevant support information.",
              createdAt: ticket.createdAt,
              author: "Admin Support (Preview)",
          }]
        : [],
    history: [
        {
            action: "Complaint Created",
            date: ticket.createdAt,
            note: "Support request recorded in preview data.",
        },
    ],
    resolution: ["Resolved", "Closed"].includes(ticket.status)
        ? "Support information reviewed and provided."
        : "",
    updatedAt: ticket.createdAt,
    source: "Preview",
}));

// ================== HELPERS ==================
function loadComplaints() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (Array.isArray(saved)) return saved;
    } catch {
        // Use preview records.
    }

    return initialComplaints;
}

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
    const theme = {
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
    const [complaints, setComplaints] = useState(loadComplaints);

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

    // ================== PERSIST RECORDS ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
        } catch {
            // Continue with React state.
        }
    }, [complaints]);

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
            value: complaints.filter((item) =>
                ["Resolved", "Closed"].includes(item.status)
            ).length,
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
                String(value || "").toLowerCase().includes(query)
            );

            return matchesSearch &&
                (statusFilter === "All" || item.status === statusFilter) &&
                (categoryFilter === "All" || item.category === categoryFilter);
        }),
        "createdAt"
    );

    const visibleComplaints = filteredComplaints.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search.trim()) ||
        statusFilter !== "All" ||
        categoryFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setCategoryFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        setComplaints(loadComplaints());
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

    const handleReply = () => {
        if (!replyComplaint ||
            !["Open", "In Progress"].includes(replyComplaint.status)) {
            setReplyError("This complaint is not open for new responses.");
            return;
        }

        const message = replyText.trim();

        if (message.length < 10 || message.length > 1500) {
            setReplyError("Response must contain 10–1,500 characters.");
            return;
        }

        const now = new Date().toISOString();

        setComplaints((previous) => previous.map((complaint) =>
            complaint.id === replyId
                ? {
                      ...complaint,
                      status: "In Progress",
                      updatedAt: now,
                      replies: [
                          ...(complaint.replies || []),
                          {
                              id: `REPLY-${crypto.randomUUID()}`,
                              author: "Admin Support (Preview)",
                              message,
                              createdAt: now,
                          },
                      ],
                      history: [
                          ...(complaint.history || []),
                          {
                              action: "Admin Response Recorded",
                              date: now,
                              note: "A support response was saved in preview records.",
                          },
                      ],
                  }
                : complaint
        ));

        toast.success("Admin response saved to preview records.");
        closeReply();
    };

    // ================== STATUS MANAGEMENT ==================
    const allowedActions = {
        Open: ["start"],
        "In Progress": ["resolve"],
        Resolved: ["close", "reopen"],
        Closed: ["reopen"],
    };

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

    const handleStatusUpdate = () => {
        if (!statusAction || !actionComplaint ||
            actionComplaint.status !== statusAction.previousStatus) {
            toast.error("Complaint status has changed. Please refresh.");
            closeStatusAction();
            return;
        }

        if (!allowedActions[actionComplaint.status]?.includes(statusAction.type)) {
            setActionError("This status change is not available.");
            return;
        }

        if (statusAction.type === "resolve" &&
            !(actionComplaint.replies || []).length) {
            setActionError("Record an Admin response before resolving the complaint.");
            return;
        }

        const note = actionNote.trim();
        const noteRequired = ["resolve", "reopen"].includes(statusAction.type);

        if (noteRequired && (note.length < 10 || note.length > 300)) {
            setActionError("Enter a reason or resolution containing 10–300 characters.");
            return;
        }

        if (note.length > 300) {
            setActionError("Internal note cannot exceed 300 characters.");
            return;
        }

        const nextStatus = statusTransitions[statusAction.type];
        const now = new Date().toISOString();

        setComplaints((previous) => previous.map((complaint) =>
            complaint.id === statusAction.id
                ? {
                      ...complaint,
                      status: nextStatus,
                      updatedAt: now,
                      resolution: statusAction.type === "resolve"
                          ? note
                          : statusAction.type === "reopen"
                              ? ""
                              : complaint.resolution,
                      history: [
                          ...(complaint.history || []),
                          {
                              action: actionLabels[statusAction.type],
                              date: now,
                              note: note || `Complaint moved to ${nextStatus}.`,
                          },
                      ],
                  }
                : complaint
        ));

        toast.success(`Complaint moved to ${nextStatus}.`);
        closeStatusAction();
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
                        Track support requests, respond to customer concerns
                        and manage complaint resolution history.
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
                            <p>
                                Manage support tickets, responses and resolution status.
                            </p>
                        </div>
                    </div>

                    <span className="cp-record-count">
                        {filteredComplaints.length} Records
                    </span>
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
                                    <strong>Resolution:</strong>{" "}
                                    {selectedComplaint.resolution}
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
                                Admin responses are saved only in frontend preview records.
                                They are not yet delivered to customer accounts.
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
                                        onClick={() => openStatusAction(selectedComplaint, "resolve")}
                                    >
                                        Resolve
                                    </Button>
                                </>
                            )}

                            {selectedComplaint.status === "Resolved" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={() => openStatusAction(selectedComplaint, "reopen")}
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
                        Response will be saved to this preview ticket.
                        Customer notification is not connected.
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
                <DialogTitle>
                    {actionLabels[statusAction?.type] || "Update Complaint"}
                </DialogTitle>

                <DialogContent dividers>
                    <p className="cp-confirm-text">
                        Complaint: <strong>{actionComplaint?.id}</strong>
                    </p>

                    <Alert severity="info" className="cp-alert">
                        New status: <strong>
                            {statusTransitions[statusAction?.type]}
                        </strong>
                    </Alert>

                    <TextField
                        label={statusAction?.type === "resolve"
                            ? "Resolution Summary"
                            : "Internal Note"}
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
