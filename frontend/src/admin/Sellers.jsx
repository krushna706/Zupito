
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

// ================== SELLER CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_sellers";

const initialSellers = [
    {
        id: "ZS1001",
        name: "Rahul Sharma",
        email: "rahul@example.com",
        mobile: "9876543210",
        storeName: "TechNova Electronics",
        storeEmail: "store@technova.example",
        storePhone: "9876543210",
        description: "Electronics, mobile accessories and computer peripherals.",
        address: "Patia Main Road",
        locality: "Patia",
        city: "Bhubaneswar",
        state: "Odisha",
        pincode: "751024",
        appliedAt: "2026-10-20",
        status: "Pending",
        remarks: "",
    },
    {
        id: "ZS1002",
        name: "Priya Das",
        email: "priya@example.com",
        mobile: "9865432101",
        storeName: "Urban Fashion",
        storeEmail: "store@urbanfashion.example",
        storePhone: "9865432101",
        description: "Clothing and lifestyle accessories.",
        address: "Saheed Nagar",
        locality: "Saheed Nagar",
        city: "Bhubaneswar",
        state: "Odisha",
        pincode: "751007",
        appliedAt: "2026-10-22",
        status: "Approved",
        remarks: "",
    },
    {
        id: "ZS1003",
        name: "Amit Kumar",
        email: "amit@example.com",
        mobile: "9854321098",
        storeName: "Fresh Basket",
        storeEmail: "store@freshbasket.example",
        storePhone: "9854321098",
        description: "Groceries and household essentials.",
        address: "Jaydev Vihar",
        locality: "Jaydev Vihar",
        city: "Bhubaneswar",
        state: "Odisha",
        pincode: "751013",
        appliedAt: "2026-10-24",
        status: "Approved",
        remarks: "",
    },
    {
        id: "ZS1004",
        name: "Sneha Patel",
        email: "sneha@example.com",
        mobile: "9843210987",
        storeName: "Style Avenue",
        storeEmail: "store@styleavenue.example",
        storePhone: "9843210987",
        description: "Women's fashion and accessories.",
        address: "Kharavel Nagar",
        locality: "Unit 3",
        city: "Bhubaneswar",
        state: "Odisha",
        pincode: "751001",
        appliedAt: "2026-10-26",
        status: "Pending",
        remarks: "",
    },
    {
        id: "ZS1005",
        name: "Rohit Sahu",
        email: "rohit@example.com",
        mobile: "9832109876",
        storeName: "Daily Essentials",
        storeEmail: "store@dailyessentials.example",
        storePhone: "9832109876",
        description: "Household products and daily essentials.",
        address: "Rasulgarh",
        locality: "Palasuni",
        city: "Bhubaneswar",
        state: "Odisha",
        pincode: "751010",
        appliedAt: "2026-10-27",
        status: "Suspended",
        remarks: "Store compliance review required.",
    },
    {
        id: "ZS1006",
        name: "Ananya Singh",
        email: "ananya@example.com",
        mobile: "9821098765",
        storeName: "Travel World",
        storeEmail: "store@travelworld.example",
        storePhone: "9821098765",
        description: "Bags, luggage and travel accessories.",
        address: "Chandrasekharpur",
        locality: "BDA Colony",
        city: "Bhubaneswar",
        state: "Odisha",
        pincode: "751016",
        appliedAt: "2026-10-29",
        status: "Rejected",
        remarks: "Incomplete business information.",
    },
];

const statusActions = {
    Pending: ["Approve", "Reject"],
    Approved: ["Suspend"],
    Suspended: ["Reactivate"],
    Rejected: [],
};

// ================== SELLER HELPERS ==================
function loadSellers() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (Array.isArray(saved)) return saved;
    } catch {
        // Fall back to sample records.
    }

    return initialSellers;
}

function getInitials(name) {
    return String(name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase() || "ZS";
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          });
}

function SellerStatus({ status }) {
    return (
        <span className={`zs-status is-${String(status).toLowerCase()}`}>
            <span className="zs-status-dot" />
            {status}
        </span>
    );
}

function SellerDetail({ label, value }) {
    return (
        <div className="zs-detail-item">
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
        </div>
    );
}

// ================== MANAGE SELLERS ==================
function Sellers() {
    const [sellers, setSellers] = useState(loadSellers);

    // ================== SEARCH AND FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DETAILS AND ACTIONS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    const selectedSeller = sellers.find((seller) => seller.id === selectedId);
    const actionSeller = sellers.find((seller) => seller.id === action?.sellerId);

    // ================== SAVE CHANGES ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sellers));
        } catch {
            // Continue with in-memory records if storage fails.
        }
    }, [sellers]);

    // ================== STATISTICS ==================
    const counts = {
        total: sellers.length,
        pending: sellers.filter((seller) => seller.status === "Pending").length,
        approved: sellers.filter((seller) => seller.status === "Approved").length,
        suspended: sellers.filter((seller) => seller.status === "Suspended").length,
    };

    const statistics = [
        {
            title: "Total Sellers",
            value: counts.total,
            description: "Registered applications",
            icon: "fa-store",
            theme: "total",
        },
        {
            title: "Pending Approval",
            value: counts.pending,
            description: "Awaiting your review",
            icon: "fa-clock",
            theme: "pending",
        },
        {
            title: "Approved Sellers",
            value: counts.approved,
            description: "Active selling accounts",
            icon: "fa-circle-check",
            theme: "approved",
        },
        {
            title: "Suspended Sellers",
            value: counts.suspended,
            description: "Selling access restricted",
            icon: "fa-ban",
            theme: "suspended",
        },
    ];

    // ================== FILTERED RECORDS ==================
    const filteredSellers = sellers.filter((seller) => {
        const query = search.trim().toLowerCase();

        const matchesSearch = [
            seller.id,
            seller.name,
            seller.email,
            seller.mobile,
            seller.storeName,
            seller.city,
        ].some((value) =>
            String(value || "").toLowerCase().includes(query)
        );

        return matchesSearch &&
            (statusFilter === "All" || seller.status === statusFilter);
    });

    const visibleSellers = filteredSellers.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search) || statusFilter !== "All";

    // ================== REFRESH RECORDS ==================
    const handleRefresh = () => {
        setSellers(loadSellers());
        toast.info("Seller records refreshed from local data.");
    };

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setPage(0);
    };

    // ================== STATUS ACTIONS ==================
    const openAction = (sellerId, type) => {
        setSelectedId(null);
        setAction({ sellerId, type });
        setReason("");
        setError("");
    };

    const closeAction = () => {
        setAction(null);
        setReason("");
        setError("");
    };

    const handleStatusUpdate = () => {
        if (
            !actionSeller ||
            !statusActions[actionSeller.status]?.includes(action.type)
        ) {
            toast.error("This seller status can no longer be updated.");
            closeAction();
            return;
        }

        const requiresReason = ["Reject", "Suspend"].includes(action.type);

        if (requiresReason && reason.trim().length < 5) {
            setError("Enter a reason containing at least 5 characters.");
            return;
        }

        const nextStatus = {
            Approve: "Approved",
            Reject: "Rejected",
            Suspend: "Suspended",
            Reactivate: "Approved",
        }[action.type];

        setSellers((previous) =>
            previous.map((seller) =>
                seller.id === action.sellerId
                    ? {
                          ...seller,
                          status: nextStatus,
                          remarks: requiresReason ? reason.trim() : "",
                          updatedAt: new Date().toISOString(),
                      }
                    : seller
            )
        );

        setPage(0);
        toast.success(`Seller ${nextStatus.toLowerCase()} successfully.`);
        closeAction();
    };

    return (
        <div className="manage-sellers">
            {/* ================== PAGE HEADER ================== */}
            <section className="zs-hero">
                <div className="zs-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                        SELLER MANAGEMENT
                    </span>

                    <h1>Manage Sellers</h1>

                    <p>
                        Review applications, verify store information and
                        manage seller access across Zupito.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outlined"
                    className="zs-refresh-button"
                    onClick={handleRefresh}
                    startIcon={
                        <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
                    }
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="zs-stats-grid" aria-label="Seller overview">
                {statistics.map((item) => (
                    <article
                        key={item.title}
                        className={`zs-stat-card is-${item.theme}`}
                    >
                        <div className="zs-stat-top">
                            <span className="zs-stat-label">{item.title}</span>

                            <span className="zs-stat-icon">
                                <i
                                    className={`fa-solid ${item.icon}`}
                                    aria-hidden="true"
                                />
                            </span>
                        </div>

                        <strong className="zs-stat-value">{item.value}</strong>

                        <span className="zs-stat-description">
                            {item.description}
                        </span>
                    </article>
                ))}
            </section>

            {/* ================== SELLER APPLICATIONS ================== */}
            <section className="zs-content-card">
                <div className="zs-content-header">
                    <div className="zs-content-heading">
                        <span className="zs-content-icon">
                            <i className="fa-solid fa-users-gear" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Seller Applications</h2>
                            <p>Manage seller verification and account status.</p>
                        </div>
                    </div>

                    <span className="zs-record-count">
                        {filteredSellers.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="zs-toolbar">
                    <div className="zs-toolbar-search">
                        <TextField
                            label="Search Sellers"
                            placeholder="Search by store, seller, email or mobile"
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

                    <div className="zs-toolbar-filter">
                        <TextField
                            select
                            label="Application Status"
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(0);
                            }}
                            size="small"
                            fullWidth
                        >
                            {["All", "Pending", "Approved", "Rejected", "Suspended"].map(
                                (status) => (
                                    <MenuItem key={status} value={status}>
                                        {status === "All" ? "All Statuses" : status}
                                    </MenuItem>
                                )
                            )}
                        </TextField>
                    </div>

                    <Button
                        type="button"
                        variant="outlined"
                        className="zs-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                    >
                        <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                        Reset
                    </Button>
                </div>

                {/* ================== SELLERS TABLE ================== */}
                <TableContainer className="zs-table-container">
                    <Table className="zs-table" aria-label="Seller applications">
                        <TableHead>
                            <TableRow>
                                <TableCell>Store / Seller</TableCell>
                                <TableCell>Contact Details</TableCell>
                                <TableCell>Pickup Location</TableCell>
                                <TableCell>Applied On</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleSellers.map((seller) => (
                                <TableRow key={seller.id} hover>
                                    <TableCell>
                                        <div className="zs-store-info">
                                            <span className="zs-store-avatar">
                                                {getInitials(seller.storeName)}
                                            </span>

                                            <div className="zs-store-copy">
                                                <strong>{seller.storeName}</strong>
                                                <span>{seller.name}</span>
                                                <small>{seller.id}</small>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="zs-contact-info">
                                            <strong>{seller.email}</strong>
                                            <span>{seller.mobile}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="zs-location">
                                            <i
                                                className="fa-solid fa-location-dot"
                                                aria-hidden="true"
                                            />

                                            <span>
                                                {seller.city}
                                                <small>{seller.state}</small>
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="zs-date">
                                            {formatDate(seller.appliedAt)}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <SellerStatus status={seller.status} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            className="zs-view-button"
                                            onClick={() => setSelectedId(seller.id)}
                                        >
                                            View Details
                                            <i
                                                className="fa-solid fa-arrow-up-right-from-square"
                                                aria-hidden="true"
                                            />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {visibleSellers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <div className="zs-empty-state">
                                            <span>
                                                <i className="fa-solid fa-store-slash" />
                                            </span>

                                            <h3>No Sellers Found</h3>
                                            <p>Try another search or application status.</p>

                                            {hasFilters && (
                                                <Button
                                                    variant="outlined"
                                                    onClick={resetFilters}
                                                >
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
                    className="zs-pagination"
                    count={filteredSellers.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    labelRowsPerPage="Rows per page:"
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== SELLER DETAILS ================== */}
            <Dialog
                open={Boolean(selectedSeller)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{
                    paper: { className: "zs-dialog" },
                }}
            >
                {selectedSeller && (
                    <>
                        <DialogTitle className="zs-dialog-title">
                            Seller Details
                        </DialogTitle>

                        <DialogContent dividers>
                            <div className="zs-dialog-store">
                                <span className="zs-dialog-avatar">
                                    {getInitials(selectedSeller.storeName)}
                                </span>

                                <div>
                                    <h3>{selectedSeller.storeName}</h3>
                                    <p>{selectedSeller.id}</p>
                                </div>

                                <SellerStatus status={selectedSeller.status} />
                            </div>

                            <div className="zs-detail-section">
                                <h4>Account Information</h4>

                                <dl className="zs-detail-grid">
                                    <SellerDetail
                                        label="Seller Name"
                                        value={selectedSeller.name}
                                    />
                                    <SellerDetail
                                        label="Email Address"
                                        value={selectedSeller.email}
                                    />
                                    <SellerDetail
                                        label="Mobile Number"
                                        value={selectedSeller.mobile}
                                    />
                                    <SellerDetail
                                        label="Applied On"
                                        value={formatDate(selectedSeller.appliedAt)}
                                    />
                                </dl>
                            </div>

                            <div className="zs-detail-section">
                                <h4>Store Information</h4>

                                <dl className="zs-detail-grid">
                                    <SellerDetail
                                        label="Store Name"
                                        value={selectedSeller.storeName}
                                    />
                                    <SellerDetail
                                        label="Store Email"
                                        value={selectedSeller.storeEmail}
                                    />
                                    <SellerDetail
                                        label="Store Contact"
                                        value={selectedSeller.storePhone}
                                    />
                                    <SellerDetail
                                        label="Description"
                                        value={selectedSeller.description}
                                    />
                                </dl>
                            </div>

                            <div className="zs-detail-section">
                                <h4>Pickup Address</h4>

                                <p className="zs-address">
                                    <i
                                        className="fa-solid fa-location-dot"
                                        aria-hidden="true"
                                    />

                                    {[
                                        selectedSeller.address,
                                        selectedSeller.locality,
                                        selectedSeller.city,
                                        selectedSeller.state,
                                        selectedSeller.pincode,
                                    ].filter(Boolean).join(", ")}
                                </p>
                            </div>

                            {selectedSeller.remarks && (
                                <Alert severity="info">
                                    <strong>Admin Remarks:</strong>{" "}
                                    {selectedSeller.remarks}
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions className="zs-dialog-actions">
                            <Button
                                color="inherit"
                                onClick={() => setSelectedId(null)}
                            >
                                Close
                            </Button>

                            {statusActions[selectedSeller.status]?.map((type) => (
                                <Button
                                    key={type}
                                    variant={
                                        ["Approve", "Reactivate"].includes(type)
                                            ? "contained"
                                            : "outlined"
                                    }
                                    color={
                                        ["Reject", "Suspend"].includes(type)
                                            ? "error"
                                            : "primary"
                                    }
                                    onClick={() => openAction(selectedSeller.id, type)}
                                >
                                    {type}
                                </Button>
                            ))}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== STATUS CONFIRMATION ================== */}
            <Dialog
                open={Boolean(action)}
                onClose={closeAction}
                fullWidth
                maxWidth="xs"
                slotProps={{
                    paper: { className: "zs-dialog" },
                }}
            >
                <DialogTitle className="zs-dialog-title">
                    {action?.type} Seller
                </DialogTitle>

                <DialogContent>
                    <p className="zs-confirm-text">
                        Are you sure you want to{" "}
                        <strong>{action?.type?.toLowerCase()}</strong>{" "}
                        <strong>{actionSeller?.storeName}</strong>?
                    </p>

                    {action?.type === "Suspend" && (
                        <Alert severity="warning" className="zs-confirm-alert">
                            New sales will be restricted. Existing orders
                            and obligations must still be completed.
                        </Alert>
                    )}

                    {["Reject", "Suspend"].includes(action?.type) && (
                        <TextField
                            label="Reason"
                            placeholder="Enter the reason for this decision"
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                setError("");
                            }}
                            error={Boolean(error)}
                            helperText={
                                error || "This reason will be recorded for the seller."
                            }
                            multiline
                            minRows={3}
                            slotProps={{
                                htmlInput: { maxLength: 300 },
                            }}
                            fullWidth
                            required
                        />
                    )}
                </DialogContent>

                <DialogActions className="zs-dialog-actions">
                    <Button color="inherit" onClick={closeAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={
                            ["Reject", "Suspend"].includes(action?.type)
                                ? "error"
                                : "primary"
                        }
                        onClick={handleStatusUpdate}
                    >
                        Confirm {action?.type}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Sellers;
