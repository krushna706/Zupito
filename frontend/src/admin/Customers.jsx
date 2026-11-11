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

import api from "../services/api";

function getInitials(name) {
    return (
        String(name || "")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase() || "ZC"
    );
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

function CustomerStatus({ status }) {
    return (
        <span className={`mc-status is-${String(status).toLowerCase()}`}>
            <span className="mc-status-dot" />
            {status}
        </span>
    );
}

function CustomerDetail({ label, value }) {
    return (
        <div className="mc-detail-item">
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
        </div>
    );
}

// ================== MANAGE CUSTOMERS ==================
function Customers() {
    const [customers, setCustomers] = useState([]);

    // ================== SEARCH AND FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DETAILS AND STATUS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [statusAction, setStatusAction] = useState(null);
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    const selectedCustomer = customers.find((customer) => customer.id === selectedId);
    const actionCustomer = customers.find((customer) => customer.id === statusAction?.customerId);

    const loadCustomers = async () => {
        const { data } = await api.get("/admin/customers");
        setCustomers(data.customers);
    };
    useEffect(() => {
        loadCustomers().catch((error) => toast.error(error.message));
    }, []);
    const [now] = useState(() => Date.now());

    // ================== CUSTOMER STATISTICS ==================
    const counts = {
        total: customers.length,
        active: customers.filter((customer) => customer.status === "Active").length,
        restricted: customers.filter((customer) => customer.status === "Restricted").length,
        recent: customers.filter((customer) => {
            const joined = new Date(customer.joinedAt).getTime();
            const days = now - joined;

            return days >= 0 && days <= 30 * 24 * 60 * 60 * 1000;
        }).length,
    };

    const statistics = [
        {
            title: "Total Customers",
            value: counts.total,
            description: "Registered accounts",
            icon: "fa-users",
            theme: "total",
        },
        {
            title: "Active Accounts",
            value: counts.active,
            description: "Customer access enabled",
            icon: "fa-user-check",
            theme: "active",
        },
        {
            title: "Restricted Accounts",
            value: counts.restricted,
            description: "Access currently restricted",
            icon: "fa-user-lock",
            theme: "restricted",
        },
        {
            title: "New Customers",
            value: counts.recent,
            description: "Joined in the last 30 days",
            icon: "fa-user-plus",
            theme: "recent",
        },
    ];

    // ================== FILTERED RECORDS ==================
    const filteredCustomers = customers.filter((customer) => {
        const query = search.trim().toLowerCase();

        const matchesSearch = [
            customer.id,
            customer.name,
            customer.email,
            customer.phone,
            customer.city,
        ].some((value) =>
            String(value || "")
                .toLowerCase()
                .includes(query)
        );

        return matchesSearch && (statusFilter === "All" || customer.status === statusFilter);
    });

    const visibleCustomers = filteredCustomers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    const hasFilters = Boolean(search) || statusFilter !== "All";

    // ================== REFRESH AND FILTERS ==================
    const handleRefresh = () => loadCustomers().catch((error) => toast.error(error.message));

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setPage(0);
    };

    // ================== STATUS MANAGEMENT ==================
    const openStatusAction = (customer) => {
        setSelectedId(null);

        setStatusAction({
            customerId: customer.id,
            expectedStatus: customer.status,
            nextStatus: customer.status === "Active" ? "Restricted" : "Active",
        });

        setReason("");
        setError("");
    };

    const closeStatusAction = () => {
        setStatusAction(null);
        setReason("");
        setError("");
    };

    const handleStatusUpdate = async () => {
        if (!actionCustomer) return;
        if (statusAction.nextStatus !== "Active" && reason.trim().length < 5) {
            setError("Enter a restriction reason of at least 5 characters.");
            return;
        }
        try {
            await api.patch(`/admin/customers/${actionCustomer.id}/status`, {
                status: statusAction.nextStatus,
                reason: reason.trim() || "Customer access restored by administrator.",
            });
            await loadCustomers();
            closeStatusAction();
            toast.success("Customer status updated.");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="manage-customers">
            {/* ================== PAGE HEADER ================== */}
            <section className="mc-hero">
                <div>
                    <span className="mc-eyebrow">
                        <i className="fa-solid fa-users-gear" aria-hidden="true" />
                        CUSTOMER MANAGEMENT
                    </span>

                    <p>
                        View registered customers, review account details and manage access
                        securely.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outlined"
                    className="mc-refresh-button"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" aria-hidden="true" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== STATISTICS ================== */}
            <section className="mc-stats-grid" aria-label="Customer overview">
                {statistics.map((item) => (
                    <article key={item.title} className={`mc-stat-card is-${item.theme}`}>
                        <div className="mc-stat-top">
                            <span>{item.title}</span>

                            <span className="mc-stat-icon">
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <small>{item.description}</small>
                    </article>
                ))}
            </section>

            {/* ================== CUSTOMER LIST ================== */}
            <section className="panel-card mc-list">
                <div className="panel-card-header">
                    <div className="mc-list-heading">
                        <span className="mc-list-icon">
                            <i className="fa-solid fa-address-book" aria-hidden="true" />
                        </span>

                        <div>
                            <h2 className="panel-card-title">Registered Customers</h2>
                            <p className="panel-card-description">
                                View accounts and manage customer access.
                            </p>
                        </div>
                    </div>

                    <span className="mc-record-count">{filteredCustomers.length} Records</span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="mc-toolbar">
                    <TextField
                        label="Search Customers"
                        placeholder="Search by name, email, phone or customer ID"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        className="mc-search"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <i
                                            className="fa-solid fa-magnifying-glass"
                                            aria-hidden="true"
                                        />
                                    </InputAdornment>
                                ),
                            },
                            htmlInput: { maxLength: 100 },
                        }}
                        fullWidth
                    />

                    <TextField
                        select
                        label="Account Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        size="small"
                        className="mc-filter"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Restricted">Restricted</MenuItem>
                    </TextField>

                    <Button
                        type="button"
                        variant="outlined"
                        className="mc-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters}
                    >
                        <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                        Reset
                    </Button>
                </div>

                {/* ================== CUSTOMERS TABLE ================== */}
                <TableContainer className="mc-table-container">
                    <Table className="mc-table" aria-label="Registered customers">
                        <TableHead>
                            <TableRow>
                                <TableCell>Customer</TableCell>
                                <TableCell>Contact Details</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>Registered On</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleCustomers.map((customer) => (
                                <TableRow key={customer.id} hover>
                                    <TableCell>
                                        <div className="mc-customer-info">
                                            <span className="mc-avatar">
                                                {getInitials(customer.name)}
                                            </span>

                                            <div>
                                                <strong>{customer.name}</strong>
                                                <small>{customer.id}</small>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mc-contact">
                                            <span>{customer.email}</span>
                                            <small>{customer.phone}</small>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="mc-location">
                                            <i
                                                className="fa-solid fa-location-dot"
                                                aria-hidden="true"
                                            />

                                            <span>
                                                {customer.city}
                                                <small>{customer.state}</small>
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>{formatDate(customer.joinedAt)}</TableCell>

                                    <TableCell>
                                        <CustomerStatus status={customer.status} />
                                    </TableCell>

                                    <TableCell align="right">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            className="mc-view-button"
                                            onClick={() => setSelectedId(customer.id)}
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

                            {visibleCustomers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <div className="panel-empty-state">
                                            <i
                                                className="fa-solid fa-user-slash"
                                                aria-hidden="true"
                                            />
                                            <h3>No Customers Found</h3>
                                            <p>Try another search or account status.</p>

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
                    className="mc-pagination"
                    count={filteredCustomers.length}
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

            {/* ================== CUSTOMER DETAILS ================== */}
            <Dialog
                open={Boolean(selectedCustomer)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "mc-dialog" } }}
            >
                {selectedCustomer && (
                    <>
                        <DialogTitle>Customer Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="mc-dialog-customer">
                                <span className="mc-avatar">
                                    {getInitials(selectedCustomer.name)}
                                </span>

                                <div>
                                    <h3>{selectedCustomer.name}</h3>
                                    <p>{selectedCustomer.id}</p>
                                </div>

                                <CustomerStatus status={selectedCustomer.status} />
                            </div>

                            <h4 className="mc-detail-heading">Account Information</h4>

                            <dl className="mc-details">
                                <CustomerDetail label="Full Name" value={selectedCustomer.name} />
                                <CustomerDetail
                                    label="Email Address"
                                    value={selectedCustomer.email}
                                />
                                <CustomerDetail
                                    label="Mobile Number"
                                    value={selectedCustomer.phone}
                                />
                                <CustomerDetail
                                    label="Registered On"
                                    value={formatDate(selectedCustomer.joinedAt)}
                                />
                                <CustomerDetail label="City" value={selectedCustomer.city} />
                                <CustomerDetail label="State" value={selectedCustomer.state} />
                            </dl>

                            {selectedCustomer.remarks && (
                                <Alert severity="warning" className="mc-detail-alert">
                                    <strong>Restriction Reason:</strong> {selectedCustomer.remarks}
                                </Alert>
                            )}

                            {selectedCustomer.updatedAt && (
                                <p className="mc-updated-at">
                                    Last status update: {formatDate(selectedCustomer.updatedAt)}
                                </p>
                            )}
                        </DialogContent>

                        <DialogActions className="mc-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            <Button
                                variant="contained"
                                color={selectedCustomer.status === "Active" ? "error" : "primary"}
                                onClick={() => openStatusAction(selectedCustomer)}
                            >
                                {selectedCustomer.status === "Active"
                                    ? "Restrict Access"
                                    : "Restore Access"}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== STATUS CONFIRMATION ================== */}
            <Dialog
                open={Boolean(statusAction)}
                onClose={closeStatusAction}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { className: "mc-dialog" } }}
            >
                <DialogTitle>
                    {statusAction?.nextStatus === "Restricted"
                        ? "Restrict Customer"
                        : "Restore Customer Access"}
                </DialogTitle>

                <DialogContent>
                    <p className="mc-confirm-text">
                        {statusAction?.nextStatus === "Restricted"
                            ? `Restrict access for ${actionCustomer?.name || "this customer"}?`
                            : `Restore access for ${actionCustomer?.name || "this customer"}?`}
                    </p>

                    {statusAction?.nextStatus === "Restricted" ? (
                        <>
                            <Alert severity="warning" className="mc-detail-alert">
                                Existing orders and customer history will remain preserved.
                            </Alert>

                            <TextField
                                label="Reason"
                                value={reason}
                                onChange={(event) => {
                                    setReason(event.target.value);
                                    setError("");
                                }}
                                error={Boolean(error)}
                                helperText={
                                    error || "Explain why this account is being restricted."
                                }
                                slotProps={{ htmlInput: { maxLength: 300 } }}
                                multiline
                                minRows={3}
                                fullWidth
                                required
                            />
                        </>
                    ) : (
                        <Alert severity="info">
                            The customer account will return to Active status.
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions className="mc-dialog-actions">
                    <Button color="inherit" onClick={closeStatusAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={statusAction?.nextStatus === "Restricted" ? "error" : "primary"}
                        onClick={handleStatusUpdate}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Customers;
