
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

// ================== AGENT CONFIGURATION ==================
const STORAGE_KEY = "zupito_admin_delivery_agents";

const emptyForm = {
    name: "",
    email: "",
    mobile: "",
    pincodes: "",
    capacity: "5",
    availability: "Available",
};

const initialAgents = [
    { id: "ZA1001", name: "Rajesh Sahu", email: "rajesh@example.com", mobile: "9876501001", pincodes: ["751024", "751013"], capacity: 5, activeTasks: 2, completedTasks: 48, availability: "Available", status: "Active", createdAt: "2026-10-12" },
    { id: "ZA1002", name: "Amit Das", email: "amit.agent@example.com", mobile: "9876501002", pincodes: ["751001", "751007"], capacity: 5, activeTasks: 3, completedTasks: 35, availability: "Available", status: "Active", createdAt: "2026-10-14" },
    { id: "ZA1003", name: "Rohit Kumar", email: "rohit.agent@example.com", mobile: "9876501003", pincodes: ["751016", "751021"], capacity: 4, activeTasks: 4, completedTasks: 62, availability: "Available", status: "Active", createdAt: "2026-10-16" },
    { id: "ZA1004", name: "Sanjay Behera", email: "sanjay@example.com", mobile: "9876501004", pincodes: ["751010", "751006"], capacity: 5, activeTasks: 1, completedTasks: 29, availability: "Unavailable", status: "Active", createdAt: "2026-10-18" },
    { id: "ZA1005", name: "Deepak Nayak", email: "deepak@example.com", mobile: "9876501005", pincodes: ["751003", "751002"], capacity: 5, activeTasks: 0, completedTasks: 51, availability: "Available", status: "Active", createdAt: "2026-10-20" },
    { id: "ZA1006", name: "Manoj Singh", email: "manoj@example.com", mobile: "9876501006", pincodes: ["751017", "751020"], capacity: 4, activeTasks: 2, completedTasks: 24, availability: "Available", status: "Active", createdAt: "2026-10-22" },
    { id: "ZA1007", name: "Kiran Patra", email: "kiran@example.com", mobile: "9876501007", pincodes: ["751015", "751008"], capacity: 5, activeTasks: 0, completedTasks: 17, availability: "Unavailable", status: "Suspended", createdAt: "2026-10-24", remarks: "Account verification required." },
    { id: "ZA1008", name: "Sourav Mishra", email: "sourav@example.com", mobile: "9876501008", pincodes: ["751019", "751023"], capacity: 5, activeTasks: 3, completedTasks: 42, availability: "Available", status: "Active", createdAt: "2026-10-25" },
    { id: "ZA1009", name: "Prakash Rout", email: "prakash@example.com", mobile: "9876501009", pincodes: ["751022", "751014"], capacity: 4, activeTasks: 1, completedTasks: 31, availability: "Available", status: "Active", createdAt: "2026-10-27" },
    { id: "ZA1010", name: "Bikash Jena", email: "bikash@example.com", mobile: "9876501010", pincodes: ["751018", "751012"], capacity: 5, activeTasks: 0, completedTasks: 15, availability: "Unavailable", status: "Active", createdAt: "2026-10-29" },
    { id: "ZA1011", name: "Arjun Mohanty", email: "arjun.agent@example.com", mobile: "9876501011", pincodes: ["751009", "751011"], capacity: 5, activeTasks: 2, completedTasks: 26, availability: "Available", status: "Active", createdAt: "2026-11-01" },
    { id: "ZA1012", name: "Nitin Pradhan", email: "nitin@example.com", mobile: "9876501012", pincodes: ["751025", "751030"], capacity: 5, activeTasks: 0, completedTasks: 12, availability: "Unavailable", status: "Suspended", createdAt: "2026-11-02", remarks: "Temporary administrative restriction." },
];

// ================== HELPERS ==================
function loadAgents() {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (Array.isArray(stored)) {
            return stored;
        }
    } catch {
        // Fall back to initial records.
    }

    return initialAgents;
}

function getInitials(name) {
    return String(name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase() || "ZA";
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

function getAvailability(agent) {
    if (agent.availability === "Unavailable") return "Unavailable";

    return agent.activeTasks >= agent.capacity
        ? "At Capacity"
        : "Available";
}

function StatusBadge({ value }) {
    const theme = {
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
    const [agents, setAgents] = useState(loadAgents);

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

    // ================== DETAILS AND ACTIONS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [statusAction, setStatusAction] = useState(null);
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");

    const selectedAgent = agents.find((agent) => agent.id === selectedId);
    const editingAgent = agents.find((agent) => agent.id === editingId);
    const actionAgent = agents.find((agent) => agent.id === statusAction?.agentId);

    // ================== LOCAL STORAGE ==================
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
        } catch {
            // Keep using current React state.
        }
    }, [agents]);

    // ================== STATISTICS ==================
    const totalAgents = agents.length;
    const availableAgents = agents.filter((agent) =>
        agent.status === "Active" &&
        agent.availability === "Available" &&
        agent.activeTasks < agent.capacity
    ).length;
    const activeTasks = agents.reduce((total, agent) => total + agent.activeTasks, 0);
    const suspendedAgents = agents.filter((agent) => agent.status === "Suspended").length;

    const statistics = [
        { label: "Total Agents", value: totalAgents, description: "Registered delivery agents", icon: "fa-motorcycle", theme: "blue" },
        { label: "Available Agents", value: availableAgents, description: "Ready for new assignments", icon: "fa-user-check", theme: "green" },
        { label: "Active Deliveries", value: activeTasks, description: "Currently assigned tasks", icon: "fa-box", theme: "orange" },
        { label: "Suspended Agents", value: suspendedAgents, description: "Accounts with restricted access", icon: "fa-user-lock", theme: "red" },
    ];

    // ================== SEARCH RESULTS ==================
    const filteredAgents = agents.filter((agent) => {
        const query = search.trim().toLowerCase();

        const matchesSearch = [
            agent.id,
            agent.name,
            agent.email,
            agent.mobile,
            ...(Array.isArray(agent.pincodes) ? agent.pincodes : []),
        ].some((value) => String(value || "").toLowerCase().includes(query));

        const matchesStatus = statusFilter === "All" || agent.status === statusFilter;
        const matchesAvailability = availabilityFilter === "All" ||
            getAvailability(agent) === availabilityFilter;

        return matchesSearch && matchesStatus && matchesAvailability;
    });

    const sortedAgents = sortNewestFirst(filteredAgents);

    const visibleAgents = sortedAgents.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = Boolean(search.trim()) ||
        statusFilter !== "All" ||
        availabilityFilter !== "All";

    // ================== FILTER ACTIONS ==================
    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setAvailabilityFilter("All");
        setPage(0);
    };

    const handleRefresh = () => {
        setAgents(loadAgents());
        setPage(0);
        toast.info("Delivery agent records refreshed.");
    };

    // ================== AGENT FORM ==================
    const openForm = (agent = null) => {
        setSelectedId(null);
        setEditingId(agent?.id || null);

        setForm(agent ? {
            name: agent.name,
            email: agent.email,
            mobile: agent.mobile,
            pincodes: agent.pincodes.join(", "),
            capacity: String(agent.capacity),
            availability: agent.availability,
        } : { ...emptyForm });

        setFormError("");
        setShowForm(true);

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm });
        setFormError("");
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: name === "mobile" ? value.replace(/\D/g, "") : value,
        }));

        setFormError("");
    };

    const handleSave = (event) => {
        event.preventDefault();

        const name = form.name.trim();
        const email = form.email.trim().toLowerCase();
        const mobile = form.mobile.trim();
        const pincodes = [...new Set(form.pincodes.split(/[\s,]+/).filter(Boolean))];
        const capacity = Number(form.capacity);

        if (name.length < 2 || name.length > 100) {
            setFormError("Full name must contain 2 to 100 characters.");
            return;
        }

        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setFormError("Enter a valid email address.");
            return;
        }

        if (!/^[6-9]\d{9}$/.test(mobile)) {
            setFormError("Enter a valid 10-digit mobile number.");
            return;
        }

        if (
            pincodes.length < 1 ||
            pincodes.length > 15 ||
            pincodes.some((pin) => !/^[1-9]\d{5}$/.test(pin))
        ) {
            setFormError("Enter 1 to 15 valid 6-digit serviceable pincodes.");
            return;
        }

        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
            setFormError("Maximum active deliveries must be between 1 and 20.");
            return;
        }

        if (editingAgent && capacity < editingAgent.activeTasks) {
            setFormError("Capacity cannot be lower than the agent's active workload.");
            return;
        }

        if (!["Available", "Unavailable"].includes(form.availability)) {
            setFormError("Select a valid availability status.");
            return;
        }

        const duplicate = agents.some((agent) =>
            agent.id !== editingId &&
            (agent.email.toLowerCase() === email || agent.mobile === mobile)
        );

        if (duplicate) {
            setFormError("Email address or mobile number is already registered.");
            return;
        }

        if (editingId && !editingAgent) {
            setFormError("Agent record was not found.");
            return;
        }

        const updatedData = {
            name,
            email,
            mobile,
            pincodes,
            capacity,
            availability: form.availability,
        };

        if (editingId) {
            setAgents((previous) =>
                previous.map((agent) =>
                    agent.id === editingId
                        ? { ...agent, ...updatedData, updatedAt: new Date().toISOString() }
                        : agent
                )
            );

            toast.success("Delivery agent updated successfully.");
        } else {
            const nextNumber = Math.max(
                1000,
                ...agents.map((agent) => Number(agent.id.replace(/^ZA/, "")) || 0)
            ) + 1;

            setAgents((previous) => [
                {
                    id: `ZA${nextNumber}`,
                    ...updatedData,
                    status: "Active",
                    activeTasks: 0,
                    completedTasks: 0,
                    createdAt: new Date().toISOString(),
                    remarks: "",
                },
                ...previous,
            ]);

            toast.success("Delivery agent added successfully.");
        }

        setPage(0);
        closeForm();
    };

    // ================== AVAILABILITY ACTION ==================
    const toggleAvailability = (agent) => {
        if (agent.status !== "Active") {
            toast.error("Reactivate this agent before changing availability.");
            return;
        }

        const nextAvailability = agent.availability === "Available"
            ? "Unavailable"
            : "Available";

        setAgents((previous) =>
            previous.map((item) =>
                item.id === agent.id
                    ? {
                          ...item,
                          availability: nextAvailability,
                          updatedAt: new Date().toISOString(),
                      }
                    : item
            )
        );

        toast.success(`Agent marked as ${nextAvailability.toLowerCase()}.`);
    };

    // ================== STATUS ACTION ==================
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

    const handleStatusUpdate = () => {
        if (!actionAgent || actionAgent.status !== statusAction.previousStatus) {
            toast.error("Agent status has changed. Please refresh.");
            closeStatusAction();
            return;
        }

        if (statusAction.nextStatus === "Suspended" && reason.trim().length < 5) {
            setActionError("Please enter at least 5 characters.");
            return;
        }

        setAgents((previous) =>
            previous.map((agent) =>
                agent.id === statusAction.agentId
                    ? {
                          ...agent,
                          status: statusAction.nextStatus,
                          remarks: statusAction.nextStatus === "Suspended" ? reason.trim() : "",
                          updatedAt: new Date().toISOString(),
                      }
                    : agent
            )
        );

        setPage(0);

        toast.success(
            statusAction.nextStatus === "Active"
                ? "Agent account reactivated successfully."
                : "Agent account suspended successfully."
        );

        closeStatusAction();
    };

    return (
        <div className="manage-delivery-agents">
            {/* ================== PAGE HEADER ================== */}
            <section className="da-hero">
                <div className="da-hero-content">
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-motorcycle" aria-hidden="true" />
                        DELIVERY AGENT MANAGEMENT
                    </span>

                    <p>
                        Manage delivery agent accounts, serviceable locations,
                        availability and active delivery workload.
                    </p>
                </div>

                <div className="da-hero-actions">
                    <Button
                        variant="outlined"
                        className="da-button da-button--outline"
                        onClick={handleRefresh}
                        startIcon={<i className="fa-solid fa-arrows-rotate" />}
                    >
                        Refresh
                    </Button>

                    <Button
                        variant="contained"
                        className="da-button da-button--primary"
                        onClick={() => showForm ? closeForm() : openForm()}
                        startIcon={<i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />}
                    >
                        {showForm ? "Close Form" : "Add Agent"}
                    </Button>
                </div>
            </section>

            {/* ================== ADD / EDIT FORM ================== */}
            {showForm && (
                <section className="da-card da-form-card">
                    <div className="da-section-header">
                        <div className="da-section-heading">
                            <span className="da-section-icon">
                                <i className="fa-solid fa-user-plus" aria-hidden="true" />
                            </span>

                            <div>
                                <h2>{editingId ? "Edit Delivery Agent" : "Add Delivery Agent"}</h2>
                                <p>
                                    {editingId
                                        ? "Update account information and delivery coverage."
                                        : "Enter the agent's account and serviceability details."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="da-form" noValidate>
                        <div className="da-form-grid">
                            <TextField
                                label="Full Name"
                                name="name"
                                value={form.name}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { maxLength: 100 } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Email Address"
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { maxLength: 254 } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Mobile Number"
                                name="mobile"
                                value={form.mobile}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { maxLength: 10, inputMode: "numeric" } }}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Serviceable Pincodes"
                                name="pincodes"
                                value={form.pincodes}
                                onChange={handleFormChange}
                                helperText="Separate pincodes using commas, e.g. 751024, 751013"
                                fullWidth
                                required
                            />

                            <TextField
                                label="Maximum Active Deliveries"
                                name="capacity"
                                type="number"
                                value={form.capacity}
                                onChange={handleFormChange}
                                slotProps={{ htmlInput: { min: 1, max: 20 } }}
                                helperText="Maximum number of active tasks: 1–20"
                                fullWidth
                                required
                            />

                            <TextField
                                select
                                label="Availability"
                                name="availability"
                                value={form.availability}
                                onChange={handleFormChange}
                                fullWidth
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
                                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                Fields marked * are required.
                            </span>

                            <div className="da-form-buttons">
                                <Button variant="outlined" color="inherit" onClick={closeForm}>
                                    Cancel
                                </Button>

                                <Button type="submit" variant="contained" className="da-button--primary">
                                    <i className="fa-solid fa-check" />
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
                                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                            </span>
                        </div>

                        <strong className="da-stat-value">{item.value}</strong>
                        <p>{item.description}</p>
                    </article>
                ))}
            </section>

            {/* ================== DELIVERY AGENTS TABLE ================== */}
            <section className="da-card da-list-card">
                <div className="da-section-header">
                    <div className="da-section-heading">
                        <span className="da-section-icon">
                            <i className="fa-solid fa-users-gear" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Delivery Agents</h2>
                            <p>Monitor agent availability, serviceability and workload.</p>
                        </div>
                    </div>

                    <span className="da-record-count">
                        {filteredAgents.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="da-toolbar">
                    <div className="da-search">
                        <TextField
                            label="Search Agents"
                            placeholder="Name, email, mobile, agent ID or pincode"
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
                        label="Account Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                        className="da-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Suspended">Suspended</MenuItem>
                    </TextField>

                    <TextField
                        select
                        label="Availability"
                        value={availabilityFilter}
                        onChange={(event) => {
                            setAvailabilityFilter(event.target.value);
                            setPage(0);
                        }}
                        className="da-filter"
                        size="small"
                    >
                        <MenuItem value="All">All Availability</MenuItem>
                        <MenuItem value="Available">Available</MenuItem>
                        <MenuItem value="Unavailable">Unavailable</MenuItem>
                        <MenuItem value="At Capacity">At Capacity</MenuItem>
                    </TextField>

                    <Button
                        variant="outlined"
                        className="da-button da-reset-button"
                        onClick={resetFilters}
                        disabled={!hasFilters}
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
                                <TableCell>Delivery Agent</TableCell>
                                <TableCell>Contact Details</TableCell>
                                <TableCell>Serviceable Area</TableCell>
                                <TableCell>Workload</TableCell>
                                <TableCell>Availability</TableCell>
                                <TableCell>Account Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visibleAgents.map((agent) => {
                                const workload = Math.min(
                                    100,
                                    Math.round((agent.activeTasks / agent.capacity) * 100)
                                );

                                return (
                                    <TableRow key={agent.id} hover>
                                        <TableCell>
                                            <div className="da-agent">
                                                <span className="da-avatar">
                                                    {getInitials(agent.name)}
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
                                                    <strong>{agent.activeTasks}/{agent.capacity}</strong>
                                                    <small>{workload}%</small>
                                                </div>

                                                <div className="da-progress">
                                                    <span
                                                        className={workload >= 100 ? "is-full" : ""}
                                                        style={{ width: `${workload}%` }}
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
                                                View Details
                                                <i className="fa-solid fa-arrow-up-right-from-square" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {visibleAgents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="da-empty">
                                            <span>
                                                <i className="fa-solid fa-users-slash" />
                                            </span>

                                            <h3>No Delivery Agents Found</h3>
                                            <p>Try adjusting the search or filter options.</p>

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
                    className="da-pagination"
                    count={filteredAgents.length}
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

            {/* ================== AGENT DETAILS ================== */}
            <Dialog
                open={Boolean(selectedAgent)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{ paper: { className: "da-dialog-paper" } }}
            >
                {selectedAgent && (
                    <>
                        <DialogTitle className="da-dialog-title">
                            Delivery Agent Details
                        </DialogTitle>

                        <DialogContent dividers className="da-dialog-content">
                            <div className="da-detail-profile">
                                <span className="da-avatar da-avatar--large">
                                    {getInitials(selectedAgent.name)}
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
                                    <DetailItem label="Mobile Number" value={selectedAgent.mobile} />
                                    <DetailItem label="Registered On" value={formatDate(selectedAgent.createdAt)} />
                                    <DetailItem label="Availability" value={getAvailability(selectedAgent)} />
                                </dl>
                            </div>

                            <div className="da-detail-section">
                                <h4>Delivery Information</h4>

                                <dl className="da-detail-grid">
                                    <DetailItem label="Serviceable Pincodes" value={selectedAgent.pincodes.join(", ")} />
                                    <DetailItem label="Maximum Capacity" value={selectedAgent.capacity} />
                                    <DetailItem label="Active Deliveries" value={selectedAgent.activeTasks} />
                                    <DetailItem label="Completed Deliveries" value={selectedAgent.completedTasks} />
                                </dl>
                            </div>

                            {selectedAgent.remarks && (
                                <Alert severity="warning" className="da-detail-alert">
                                    <strong>Admin Remarks:</strong> {selectedAgent.remarks}
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
                slotProps={{ paper: { className: "da-dialog-paper" } }}
            >
                <DialogTitle className="da-dialog-title">
                    {statusAction?.nextStatus === "Suspended"
                        ? "Suspend Delivery Agent"
                        : "Reactivate Delivery Agent"}
                </DialogTitle>

                <DialogContent className="da-dialog-content">
                    <p className="da-confirm-text">
                        {statusAction?.nextStatus === "Suspended"
                            ? `Are you sure you want to suspend ${actionAgent?.name || "this agent"}?`
                            : `Reactivate ${actionAgent?.name || "this agent"}?`}
                    </p>

                    {statusAction?.nextStatus === "Suspended" && (
                        <>
                            <Alert severity="warning" className="da-detail-alert">
                                Existing assigned deliveries remain unchanged.
                                Account suspension prevents new assignments,
                                but does not transfer parcel custody.
                            </Alert>

                            <TextField
                                label="Suspension Reason"
                                value={reason}
                                onChange={(event) => {
                                    setReason(event.target.value);
                                    setActionError("");
                                }}
                                error={Boolean(actionError)}
                                helperText={actionError || "A reason is required."}
                                slotProps={{ htmlInput: { maxLength: 300 } }}
                                multiline
                                minRows={3}
                                fullWidth
                                required
                            />
                        </>
                    )}
                </DialogContent>

                <DialogActions className="da-dialog-actions">
                    <Button color="inherit" onClick={closeStatusAction}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color={statusAction?.nextStatus === "Suspended" ? "error" : "primary"}
                        onClick={handleStatusUpdate}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default DeliveryAgents;
