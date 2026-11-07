import { useEffect, useState } from "react";
import {
    Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    InputAdornment, MenuItem, Table, TableBody, TableCell,
    TableContainer, TableHead, TablePagination, TableRow, TextField,
} from "@mui/material";
import { toast } from "react-toastify";

import * as adminService from "../services/adminService";

const statusActions = {
    Pending: ["Approve", "Reject"],
    Approved: ["Suspend"],
    Suspended: ["Reactivate"],
    Rejected: [],
};

const emptyStats = {
    total: 0,
    pending: 0,
    approved: 0,
    suspended: 0,
};

function getInitials(name) {
    return String(name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("") || "ZS";
}

function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
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

function Sellers() {
    const [sellers, setSellers] = useState([]);
    const [statistics, setStatistics] = useState(emptyStats);
    const [total, setTotal] = useState(0);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [revision, setRevision] = useState(0);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [busy, setBusy] = useState(false);

    const [selected, setSelected] = useState(null);
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        setLoading(true);
        setLoadError("");

        const timer = setTimeout(async () => {
            try {
                const result = await adminService.getSellers(
                    {
                        search: search.trim(),
                        status: statusFilter,
                        page: page + 1,
                        limit: rowsPerPage,
                    },
                    controller.signal
                );

                if (!active) return;

                setSellers(result.sellers);
                setStatistics(result.statistics);
                setTotal(result.total);

                const lastPage = Math.max(
                    0,
                    Math.ceil(result.total / rowsPerPage) - 1
                );

                if (page > lastPage) setPage(lastPage);
            } catch (error) {
                if (!active) return;

                setSellers([]);
                setStatistics(emptyStats);
                setTotal(0);
                setLoadError(error.message);
            } finally {
                if (active) setLoading(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
            controller.abort();
        };
    }, [search, statusFilter, page, rowsPerPage, revision]);

    const refresh = () => setRevision((value) => value + 1);
    const hasFilters = Boolean(search.trim()) || statusFilter !== "All";

    const stats = [
        ["Total Sellers", statistics.total, "Registered applications", "fa-store", "total"],
        ["Pending Approval", statistics.pending, "Awaiting your review", "fa-clock", "pending"],
        ["Approved Sellers", statistics.approved, "Approved applications", "fa-circle-check", "approved"],
        ["Suspended Sellers", statistics.suspended, "Selling access restricted", "fa-ban", "suspended"],
    ];

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setPage(0);
    };

    const openAction = (seller, type) => {
        setSelected(null);
        setAction({ seller, type });
        setReason("");
        setActionError("");
    };

    const closeAction = () => {
        if (busy) return;
        setAction(null);
        setReason("");
        setActionError("");
    };

    const handleStatusUpdate = async () => {
        if (busy || !action) return;

        const requiresReason = ["Reject", "Suspend"].includes(action.type);

        if (requiresReason && reason.trim().length < 5) {
            setActionError("Enter a reason containing at least 5 characters.");
            return;
        }

        setBusy(true);
        setActionError("");

        try {
            const result = await adminService.updateSellerStatus(
                action.seller._id,
                {
                    action: action.type,
                    reason: requiresReason ? reason.trim() : "",
                    version: action.seller.version,
                }
            );

            toast.success(result.message);
            setAction(null);
            refresh();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="manage-sellers">
            <section className="zs-hero">
                <div className="zs-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                        SELLER MANAGEMENT
                    </span>
                    <p>Review applications, verify store information and manage seller access across Zupito.</p>
                </div>

                <Button
                    variant="outlined"
                    className="zs-refresh-button"
                    onClick={refresh}
                    disabled={loading || busy}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {loadError && (
                <Alert
                    severity="error"
                    action={<Button color="inherit" onClick={refresh}>Retry</Button>}
                >
                    {loadError}
                </Alert>
            )}

            <section className="zs-stats-grid" aria-label="Seller overview">
                {stats.map(([title, value, description, icon, theme]) => (
                    <article key={title} className={`zs-stat-card is-${theme}`}>
                        <div className="zs-stat-top">
                            <span className="zs-stat-label">{title}</span>
                            <span className="zs-stat-icon">
                                <i className={`fa-solid ${icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong className="zs-stat-value">
                            {loading || loadError ? "—" : value}
                        </strong>

                        <span className="zs-stat-description">{description}</span>
                    </article>
                ))}
            </section>

            <section className="zs-content-card">
                <div className="zs-content-header">
                    <div className="zs-content-heading">
                        <span className="zs-content-icon">
                            <i className="fa-solid fa-users-gear" aria-hidden="true" />
                        </span>
                        <div>
                            <h2>Seller Applications</h2>
                            <p>Manage seller verification and selling status.</p>
                        </div>
                    </div>

                    <span className="zs-record-count">{total} Records</span>
                </div>

                <div className="zs-toolbar">
                    <div className="zs-toolbar-search">
                        <TextField
                            label="Search Sellers"
                            placeholder="Store, seller, email, mobile or city"
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
                            {["All", "Pending", "Approved", "Rejected", "Suspended"].map((status) => (
                                <MenuItem key={status} value={status}>
                                    {status === "All" ? "All Statuses" : status}
                                </MenuItem>
                            ))}
                        </TextField>
                    </div>

                    <Button
                        variant="outlined"
                        className="zs-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                    >
                        <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                        Reset
                    </Button>
                </div>

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
                            {!loading && !loadError && sellers.map((seller) => (
                                <TableRow key={seller._id} hover>
                                    <TableCell>
                                        <div className="zs-store-info">
                                            <span className="zs-store-avatar">
                                                {getInitials(seller.storeName)}
                                            </span>
                                            <div className="zs-store-copy">
                                                <strong>{seller.storeName}</strong>
                                                <span>{seller.name}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="zs-contact-info">
                                            <strong>{seller.email}</strong>
                                            <span>{seller.phone}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="zs-location">
                                            <i className="fa-solid fa-location-dot" aria-hidden="true" />
                                            <span>
                                                {seller.pickupAddress?.city || "—"}
                                                <small>{seller.pickupAddress?.state}</small>
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <span className="zs-date">
                                            {formatDate(seller.createdAt)}
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
                                            onClick={() => setSelected(seller)}
                                            disabled={busy}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {(loading || loadError || !sellers.length) && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <p role="status">
                                            {loading
                                                ? "Loading seller applications..."
                                                : loadError
                                                    ? "Unable to load sellers. Please retry."
                                                    : "No seller applications found."}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={total}
                    page={Math.min(page, Math.max(0, Math.ceil(total / rowsPerPage) - 1))}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            <Dialog
                open={Boolean(selected)}
                onClose={() => setSelected(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "zs-dialog" } }}
            >
                {selected && (
                    <>
                        <DialogTitle className="zs-dialog-title">
                            Seller Details
                        </DialogTitle>

                        <DialogContent dividers>
                            <div className="zs-dialog-store">
                                <span className="zs-dialog-avatar">
                                    {getInitials(selected.storeName)}
                                </span>
                                <div>
                                    <h3>{selected.storeName}</h3>
                                    <p>{selected.name}</p>
                                </div>
                                <SellerStatus status={selected.status} />
                            </div>

                            <div className="zs-detail-section">
                                <h4>Account Information</h4>
                                <dl className="zs-detail-grid">
                                    <SellerDetail label="Seller Name" value={selected.name} />
                                    <SellerDetail label="Email Address" value={selected.email} />
                                    <SellerDetail label="Mobile Number" value={selected.phone} />
                                    <SellerDetail label="User Account Status" value={selected.accountStatus} />
                                    <SellerDetail label="User Account ID" value={selected.userId} />
                                    <SellerDetail label="Seller Profile ID" value={selected._id} />
                                    <SellerDetail label="Applied On" value={formatDate(selected.createdAt)} />
                                    <SellerDetail label="Last Reviewed On" value={formatDate(selected.reviewedAt)} />
                                </dl>
                            </div>

                            <div className="zs-detail-section">
                                <h4>Store Information</h4>
                                <dl className="zs-detail-grid">
                                    <SellerDetail label="Store Name" value={selected.storeName} />
                                    <SellerDetail label="Store Email" value={selected.storeEmail} />
                                    <SellerDetail label="Store Contact" value={selected.storePhone} />
                                    <SellerDetail label="Description" value={selected.description} />
                                </dl>
                            </div>

                            <div className="zs-detail-section">
                                <h4>Pickup Address</h4>
                                <p className="zs-address">
                                    <i className="fa-solid fa-location-dot" aria-hidden="true" />
                                    {[
                                        selected.pickupAddress?.street,
                                        selected.pickupAddress?.locality,
                                        selected.pickupAddress?.city,
                                        selected.pickupAddress?.state,
                                        selected.pickupAddress?.pincode,
                                    ].filter(Boolean).join(", ")}
                                </p>
                            </div>

                            {selected.remarks && (
                                <Alert severity="info">
                                    <strong>Admin Remarks:</strong> {selected.remarks}
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions className="zs-dialog-actions">
                            <Button color="inherit" onClick={() => setSelected(null)}>
                                Close
                            </Button>

                            {statusActions[selected.status]?.map((type) => (
                                <Button
                                    key={type}
                                    variant={["Approve", "Reactivate"].includes(type) ? "contained" : "outlined"}
                                    color={["Reject", "Suspend"].includes(type) ? "error" : "primary"}
                                    onClick={() => openAction(selected, type)}
                                    disabled={
                                        busy ||
                                        (
                                            ["Approve", "Reactivate"].includes(type) &&
                                            selected.accountStatus !== "Active"
                                        )
                                    }
                                >
                                    {type}
                                </Button>
                            ))}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Dialog
                open={Boolean(action)}
                onClose={closeAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "zs-dialog" } }}
            >
                <DialogTitle className="zs-dialog-title">
                    {action?.type} Seller
                </DialogTitle>

                <DialogContent>
                    <p className="zs-confirm-text">
                        Are you sure you want to{" "}
                        <strong>{action?.type.toLowerCase()}</strong>{" "}
                        <strong>{action?.seller.storeName}</strong>?
                    </p>

                    {action?.type === "Suspend" && (
                        <Alert severity="warning" className="zs-confirm-alert">
                            Selling access will be restricted. Account access
                            and existing records will be preserved.
                        </Alert>
                    )}

                    {["Reject", "Suspend"].includes(action?.type) && (
                        <TextField
                            label="Reason"
                            placeholder="Enter the reason for this decision"
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                setActionError("");
                            }}
                            helperText="This reason will be visible to the seller."
                            multiline
                            minRows={3}
                            slotProps={{ htmlInput: { maxLength: 300 } }}
                            disabled={busy}
                            fullWidth
                            required
                        />
                    )}

                    {actionError && (
                        <Alert severity="error">{actionError}</Alert>
                    )}
                </DialogContent>

                <DialogActions className="zs-dialog-actions">
                    <Button color="inherit" onClick={closeAction} disabled={busy}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color={["Reject", "Suspend"].includes(action?.type) ? "error" : "primary"}
                        onClick={handleStatusUpdate}
                        disabled={busy}
                    >
                        {busy ? "Saving..." : `Confirm ${action?.type || ""}`}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Sellers;