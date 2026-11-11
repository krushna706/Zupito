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
import api from "../services/api";

// ================== AGENT CONFIGURATION ==================
const emptyForm = {
    name: "",
    email: "",
    mobile: "",
    pincodes: "",
    capacity: "5",
    availability: "Available",
};

// ================== HELPERS ==================
const initials = (name) =>
    String(name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase() || "ZA";

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "—";

const getAvailability = (agent) =>
    agent.status !== "Active" || agent.availability !== "Available"
        ? "Unavailable"
        : agent.activeTasks >= agent.capacity
          ? "At Capacity"
          : "Available";

function StatusBadge({ value }) {
    const theme =
        {
            Active: "success",
            Available: "success",
            Suspended: "danger",
            Unavailable: "neutral",
            "At Capacity": "warning",
        }[value] || "neutral";

    return (
        <span className={`da-badge da-badge--${theme}`}>
            <span className="da-badge-dot" />
            {value}
        </span>
    );
}

function DetailItem({ label, value }) {
    return (
        <div className="da-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== DELIVERY AGENTS ==================
function DeliveryAgents() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [availabilityFilter, setAvailabilityFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== FORM ==================
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState("");

    // ================== DETAILS AND STATUS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [statusAction, setStatusAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedAgent = agents.find((agent) => agent.id === selectedId);

    const editingAgent = agents.find((agent) => agent.id === editingId);

    const actionAgent = agents.find((agent) => agent.id === statusAction?.agentId);

    // ================== DATABASE DATA ==================
    const loadAgents = async () => {
        const { data } = await api.get("/delivery/admin/agents");

        setAgents(data.agents || []);
    };

    useEffect(() => {
        loadAgents()
            .catch((error) => toast.error(error.message))
            .finally(() => setLoading(false));
    }, []);

    // ================== STATISTICS ==================
    const statistics = [
        {
            label: "Total Agents",
            value: agents.length,
            description: "Registered delivery agents",
            icon: "fa-motorcycle",
            theme: "blue",
        },
        {
            label: "Available Agents",
            value: agents.filter((agent) => getAvailability(agent) === "Available").length,
            description: "Ready for new assignments",
            icon: "fa-user-check",
            theme: "green",
        },
        {
            label: "Active Deliveries",
            value: agents.reduce((total, agent) => total + agent.activeTasks, 0),
            description: "Currently assigned tasks",
            icon: "fa-box",
            theme: "orange",
        },
        {
            label: "Suspended Agents",
            value: agents.filter((agent) => agent.status === "Suspended").length,
            description: "Accounts with restricted access",
            icon: "fa-user-lock",
            theme: "red",
        },
    ];

    // ================== SEARCH RESULTS ==================
    const filteredAgents = sortNewestFirst(
        agents.filter((agent) => {
            const query = search.trim().toLowerCase();

            const matchesSearch = [
                agent.id,
                agent.name,
                agent.email,
                agent.mobile,
                ...(agent.pincodes || []),
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            return (
                matchesSearch &&
                (statusFilter === "All" || agent.status === statusFilter) &&
                (availabilityFilter === "All" || getAvailability(agent) === availabilityFilter)
            );
        })
    );

    const safePage = Math.min(
        page,
        Math.max(0, Math.ceil(filteredAgents.length / rowsPerPage) - 1)
    );

    const visibleAgents = filteredAgents.slice(
        safePage * rowsPerPage,
        (safePage + 1) * rowsPerPage
    );

    const hasFilters = search.trim() || statusFilter !== "All" || availabilityFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setAvailabilityFilter("All");
        setPage(0);
    };

    const refresh = async () => {
        try {
            await loadAgents();

            setPage(0);
            toast.info("Delivery agents refreshed.");
        } catch (error) {
            toast.error(error.message);
        }
    };

    // ================== ADD / EDIT AGENT ==================
    const openForm = (agent = null) => {
        setSelectedId(null);
        setEditingId(agent?.id || null);

        setForm(
            agent
                ? {
                      name: agent.name,
                      email: agent.email,
                      mobile: agent.mobile,
                      pincodes: agent.pincodes.join(", "),
                      capacity: String(agent.capacity),
                      availability: agent.availability,
                  }
                : { ...emptyForm }
        );

        setFormError("");
        setShowForm(true);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm });
        setFormError("");
    };

    const updateForm = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: name === "mobile" ? value.replace(/\D/g, "") : value,
        }));

        setFormError("");
    };

    const saveAgent = async (event) => {
        event.preventDefault();

        const body = {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            mobile: form.mobile.trim(),
            pincodes: [...new Set(form.pincodes.split(/[\s,]+/).filter(Boolean))],
            capacity: Number(form.capacity),
            availability: form.availability,
        };

        if (body.name.length < 2 || body.name.length > 100) {
            setFormError("Enter a name of 2–100 characters.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
            setFormError("Enter a valid email address.");
            return;
        }

        if (!/^[6-9]\d{9}$/.test(body.mobile)) {
            setFormError("Enter a valid 10-digit mobile number.");
            return;
        }

        if (
            !body.pincodes.length ||
            body.pincodes.length > 15 ||
            body.pincodes.some((pin) => !/^[1-9]\d{5}$/.test(pin))
        ) {
            setFormError("Enter 1–15 valid 6-digit pincodes.");
            return;
        }

        if (!Number.isInteger(body.capacity) || body.capacity < 1 || body.capacity > 20) {
            setFormError("Capacity must be between 1 and 20.");
            return;
        }

        if (editingAgent && body.capacity < editingAgent.activeTasks) {
            setFormError("Capacity cannot be lower than active workload.");
            return;
        }

        setBusy(true);

        try {
            if (editingId) {
                await api.patch(`/delivery/admin/agents/${editingId}`, body);
            } else {
                await api.post("/delivery/admin/agents", body);
            }

            await loadAgents();

            closeForm();
            setPage(0);

            toast.success(
                editingId
                    ? "Delivery agent updated."
                    : "Agent created. Ask them to set a password through Forgot Password."
            );
        } catch (error) {
            setFormError(error.message);
        } finally {
            setBusy(false);
        }
    };

    // ================== AVAILABILITY ==================
    const toggleAvailability = async (agent) => {
        if (agent.status !== "Active") {
            toast.error("Reactivate the agent first.");
            return;
        }

        setBusy(true);

        try {
            await api.patch(`/delivery/admin/agents/${agent.id}/status`, {
                availability: agent.availability === "Available" ? "Unavailable" : "Available",
            });

            await loadAgents();

            toast.success("Availability updated.");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };

    // ================== ACCOUNT STATUS ==================
    const openStatusAction = (agent) => {
        setSelectedId(null);

        setStatusAction({
            agentId: agent.id,
            previousStatus: agent.status,
            nextStatus: agent.status === "Active" ? "Suspended" : "Active",
        });

        setReason("");
        setActionError("");
    };

    const closeStatusAction = () => {
        setStatusAction(null);
        setReason("");
        setActionError("");
    };

    const updateStatus = async () => {
        if (!actionAgent || actionAgent.status !== statusAction.previousStatus) {
            toast.error("Agent status changed. Refresh the page.");
            closeStatusAction();
            return;
        }

        if (statusAction.nextStatus === "Suspended" && reason.trim().length < 5) {
            setActionError("Enter at least 5 characters.");
            return;
        }

        setBusy(true);

        try {
            await api.patch(`/delivery/admin/agents/${statusAction.agentId}/status`, {
                status: statusAction.nextStatus,
                reason: reason.trim(),
            });

            await loadAgents();

            toast.success(
                statusAction.nextStatus === "Suspended"
                    ? "Agent suspended and sessions revoked."
                    : "Agent reactivated."
            );

            closeStatusAction();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="manage-delivery-agents">
            {/* ================== PAGE HEADER ================== */}
            <section className="da-hero">
                <div className="da-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-motorcycle" />
                        DELIVERY AGENT MANAGEMENT
                    </span>

                    <p>
                        Manage delivery agent accounts, serviceable locations, availability and
                        active delivery workload.
                    </p>
                </div>

                <div className="da-hero-actions">
                    <Button
                        variant="outlined"
                        className="da-button da-button--outline"
                        onClick={refresh}
                        startIcon={<i className="fa-solid fa-arrows-rotate" />}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        className="da-button da-button--primary"
                        onClick={() => (showForm ? closeForm() : openForm())}
                        startIcon={
                            <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />
                        }
                    >
                        {showForm ? "Close Form" : "Add Agent"}
                    </Button>
                </div>
            </section>

            {/* ================== AGENT FORM ================== */}
            {showForm && (
                <section className="da-card da-form-card">
                    <div className="da-section-header">
                        <div className="da-section-heading">
                            <span className="da-section-icon">
                                <i className="fa-solid fa-user-plus" />
                            </span>

                            <div>
                                <h2>{editingId ? "Edit Delivery Agent" : "Add Delivery Agent"}</h2>

                                <p>Enter the agent account and serviceable locations.</p>
                            </div>
                        </div>
                    </div>

                    <form className="da-form" onSubmit={saveAgent} noValidate>
                        <div className="da-form-grid">
                            <TextField
                                required
                                fullWidth
                                name="name"
                                label="Full Name"
                                value={form.name}
                                onChange={updateForm}
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 100,
                                    },
                                }}
                            />

                            <TextField
                                required
                                fullWidth
                                type="email"
                                name="email"
                                label="Email Address"
                                value={form.email}
                                onChange={updateForm}
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 254,
                                    },
                                }}
                            />

                            <TextField
                                required
                                fullWidth
                                name="mobile"
                                label="Mobile Number"
                                value={form.mobile}
                                onChange={updateForm}
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 10,
                                        inputMode: "numeric",
                                    },
                                }}
                            />

                            <TextField
                                required
                                fullWidth
                                name="pincodes"
                                label="Serviceable Pincodes"
                                value={form.pincodes}
                                onChange={updateForm}
                                helperText="Separate pincodes using commas, e.g. 751024, 751013"
                            />

                            <TextField
                                required
                                fullWidth
                                type="number"
                                name="capacity"
                                label="Maximum Active Deliveries"
                                value={form.capacity}
                                onChange={updateForm}
                                helperText="Maximum active tasks: 1–20"
                                slotProps={{
                                    htmlInput: {
                                        min: 1,
                                        max: 20,
                                    },
                                }}
                            />

                            <TextField
                                fullWidth
                                select
                                name="availability"
                                label="Availability"
                                value={form.availability}
                                onChange={updateForm}
                            >
                                <MenuItem value="Available">Available</MenuItem>

                                <MenuItem value="Unavailable">Unavailable</MenuItem>
                            </TextField>

                            {formError && (
                                <div className="da-form-full">
                                    <Alert severity="error">{formError}</Alert>
                                </div>
                            )}
                        </div>

                        <div className="da-form-footer">
                            <span>
                                <i className="fa-solid fa-circle-info" /> New agents set their
                                password with Forgot Password OTP.
                            </span>

                            <div className="da-form-buttons">
                                <Button variant="outlined" color="inherit" onClick={closeForm}>
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="da-button--primary"
                                    disabled={busy}
                                >
                                    <i className="fa-solid fa-check" />{" "}
                                    {editingId ? "Save Changes" : "Add Agent"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </section>
            )}

            {/* ================== STATISTICS ================== */}
            <section className="da-stats" aria-label="Delivery agent overview">
                {statistics.map((item) => (
                    <article key={item.label} className={`da-stat da-stat--${item.theme}`}>
                        <div className="da-stat-heading">
                            <span>{item.label}</span>

                            <span className="da-stat-icon">
                                <i className={`fa-solid ${item.icon}`} />
                            </span>
                        </div>

                        <strong className="da-stat-value">{item.value}</strong>

                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== AGENT TABLE ================== */}
            <section className="da-card da-list-card">
                <div className="da-section-header">
                    <div className="da-section-heading">
                        <span className="da-section-icon">
                            <i className="fa-solid fa-users-gear" />
                        </span>

                        <div>
                            <h2>Delivery Agents</h2>
                            <p>Monitor availability, serviceability and workload.</p>
                        </div>
                    </div>

                    <span className="da-record-count">{filteredAgents.length} Records</span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="da-toolbar">
                    <div className="da-search">
                        <TextField
                            size="small"
                            fullWidth
                            label="Search Agents"
                            placeholder="Name, email, mobile, agent ID or pincode"
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
                        className="da-filter"
                        size="small"
                        label="Account Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        {["All", "Active", "Suspended"].map((value) => (
                            <MenuItem key={value} value={value}>
                                {value === "All" ? "All Statuses" : value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        className="da-filter"
                        size="small"
                        label="Availability"
                        value={availabilityFilter}
                        onChange={(event) => {
                            setAvailabilityFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        {["All", "Available", "Unavailable", "At Capacity"].map((value) => (
                            <MenuItem key={value} value={value}>
                                {value === "All" ? "All Availability" : value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="outlined"
                        className="da-button da-reset-button"
                        disabled={!hasFilters}
                        onClick={resetFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== TABLE ================== */}
                <TableContainer className="da-table-container">
                    <Table className="da-table" aria-label="Delivery agents">
                        <TableHead>
                            <TableRow>
                                {[
                                    "Delivery Agent",
                                    "Contact Details",
                                    "Serviceable Area",
                                    "Workload",
                                    "Availability",
                                    "Account Status",
                                ].map((heading) => (
                                    <TableCell key={heading}>{heading}</TableCell>
                                ))}

                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleAgents.map((agent) => {
                                const workload = Math.min(
                                    100,
                                    Math.round((100 * agent.activeTasks) / agent.capacity)
                                );

                                return (
                                    <TableRow key={agent.id} hover>
                                        <TableCell>
                                            <div className="da-agent">
                                                <span className="da-avatar">
                                                    {initials(agent.name)}
                                                </span>

                                                <div>
                                                    <strong>{agent.name}</strong>

                                                    <span>{agent.id}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="da-contact">
                                                <span>{agent.email}</span>

                                                <small>{agent.mobile}</small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="da-service-area">
                                                <i className="fa-solid fa-location-dot" />

                                                <span>{agent.pincodes.join(", ")}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="da-workload">
                                                <div className="da-workload-heading">
                                                    <strong>
                                                        {agent.activeTasks}/{agent.capacity}
                                                    </strong>

                                                    <small>{workload}%</small>
                                                </div>

                                                <div className="da-progress">
                                                    <span
                                                        className={workload >= 100 ? "is-full" : ""}
                                                        style={{
                                                            width: `${workload}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge value={getAvailability(agent)} />
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge value={agent.status} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                className="da-view-button"
                                                onClick={() => setSelectedId(agent.id)}
                                            >
                                                View Details{" "}
                                                <i className="fa-solid fa-arrow-up-right-from-square" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!visibleAgents.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="da-empty">
                                            <span>
                                                <i className="fa-solid fa-users-slash" />
                                            </span>

                                            <h3>
                                                {loading
                                                    ? "Loading Delivery Agents"
                                                    : "No Delivery Agents Found"}
                                            </h3>

                                            <p>
                                                {hasFilters
                                                    ? "Try adjusting your filters."
                                                    : "Create your first delivery agent using Add Agent."}
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
                    className="da-pagination"
                    component="div"
                    count={filteredAgents.length}
                    page={safePage}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== AGENT DETAILS ================== */}
            <Dialog
                open={Boolean(selectedAgent)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{
                    paper: {
                        className: "da-dialog-paper",
                    },
                }}
            >
                {selectedAgent && (
                    <>
                        <DialogTitle className="da-dialog-title">
                            Delivery Agent Details
                        </DialogTitle>

                        <DialogContent dividers className="da-dialog-content">
                            <div className="da-detail-profile">
                                <span className="da-avatar da-avatar--large">
                                    {initials(selectedAgent.name)}
                                </span>

                                <div>
                                    <h3>{selectedAgent.name}</h3>
                                    <p>{selectedAgent.id}</p>
                                </div>

                                <StatusBadge value={selectedAgent.status} />
                            </div>

                            <div className="da-detail-section">
                                <h4>Account Information</h4>

                                <dl className="da-detail-grid">
                                    <DetailItem label="Email Address" value={selectedAgent.email} />

                                    <DetailItem
                                        label="Mobile Number"
                                        value={selectedAgent.mobile}
                                    />

                                    <DetailItem
                                        label="Registered On"
                                        value={formatDate(selectedAgent.createdAt)}
                                    />

                                    <DetailItem
                                        label="Availability"
                                        value={getAvailability(selectedAgent)}
                                    />
                                </dl>
                            </div>

                            <div className="da-detail-section">
                                <h4>Delivery Information</h4>

                                <dl className="da-detail-grid">
                                    <DetailItem
                                        label="Serviceable Pincodes"
                                        value={selectedAgent.pincodes.join(", ")}
                                    />

                                    <DetailItem
                                        label="Maximum Capacity"
                                        value={selectedAgent.capacity}
                                    />

                                    <DetailItem
                                        label="Active Deliveries"
                                        value={selectedAgent.activeTasks}
                                    />

                                    <DetailItem
                                        label="Completed Deliveries"
                                        value={selectedAgent.completedTasks}
                                    />
                                </dl>
                            </div>

                            {selectedAgent.remarks && (
                                <Alert severity="warning" className="da-detail-alert">
                                    Admin Remarks: {selectedAgent.remarks}
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions className="da-dialog-actions">
                            <Button color="inherit" onClick={() => setSelectedId(null)}>
                                Close
                            </Button>

                            {selectedAgent.status === "Active" && (
                                <Button
                                    variant="outlined"
                                    disabled={busy}
                                    onClick={() => toggleAvailability(selectedAgent)}
                                >
                                    {selectedAgent.availability === "Available"
                                        ? "Mark Unavailable"
                                        : "Mark Available"}
                                </Button>
                            )}

                            <Button variant="outlined" onClick={() => openForm(selectedAgent)}>
                                Edit
                            </Button>

                            <Button
                                variant="contained"
                                disabled={busy}
                                color={selectedAgent.status === "Active" ? "error" : "primary"}
                                onClick={() => openStatusAction(selectedAgent)}
                            >
                                {selectedAgent.status === "Active" ? "Suspend" : "Reactivate"}
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
                slotProps={{
                    paper: {
                        className: "da-dialog-paper",
                    },
                }}
            >
                <DialogTitle className="da-dialog-title">
                    {statusAction?.nextStatus === "Suspended"
                        ? "Suspend Delivery Agent"
                        : "Reactivate Delivery Agent"}
                </DialogTitle>

                <DialogContent className="da-dialog-content">
                    <p className="da-confirm-text">
                        {statusAction?.nextStatus === "Suspended"
                            ? `Suspend ${actionAgent?.name || "this agent"}?`
                            : `Reactivate ${actionAgent?.name || "this agent"}?`}
                    </p>

                    {statusAction?.nextStatus === "Suspended" && (
                        <>
                            <Alert severity="warning" className="da-detail-alert">
                                Suspension revokes login sessions and blocks new assignments.
                                Existing deliveries remain assigned until Admin reassigns them.
                            </Alert>

                            <TextField
                                label="Suspension Reason"
                                value={reason}
                                multiline
                                minRows={3}
                                fullWidth
                                required
                                error={Boolean(actionError)}
                                helperText={actionError || "A reason is required."}
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 300,
                                    },
                                }}
                                onChange={(event) => {
                                    setReason(event.target.value);
                                    setActionError("");
                                }}
                            />
                        </>
                    )}

                    {actionError && statusAction?.nextStatus !== "Suspended" && (
                        <Alert severity="error">{actionError}</Alert>
                    )}
                </DialogContent>

                <DialogActions className="da-dialog-actions">
                    <Button color="inherit" onClick={closeStatusAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        disabled={busy}
                        color={statusAction?.nextStatus === "Suspended" ? "error" : "primary"}
                        onClick={updateStatus}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default DeliveryAgents;
