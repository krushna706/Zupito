

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    useMediaQuery,
} from "@mui/material";
import { toast } from "react-toastify";

import {
    deliveryStageLabel,
    formatDeliveryDate,
    getDeliveryAgent,
    getDeliveryTasks,
} from "../services/deliveryService";

// ================== FILTER CONFIGURATION ==================
const statusOptions = [
    { value: "All", label: "All Statuses" },
    { value: "ready_for_pickup", label: "Ready for Pickup" },
    { value: "assigned", label: "Assigned" },
    { value: "picked_up", label: "Picked Up" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "failed", label: "Delivery Failed" },
];

const typeOptions = [
    "All",
    "Customer Delivery",
    "Return Pickup",
    "Replacement Delivery",
];

const taskIcons = {
    "Customer Delivery": "fa-truck-fast",
    "Return Pickup": "fa-arrow-rotate-left",
    "Replacement Delivery": "fa-box-open",
};

// ================== DISPLAY HELPERS ==================
function formatAddress(address, pincode = "") {
    if (typeof address === "string" && address.trim()) {
        return address;
    }

    const parts = [
        address?.house,
        address?.street,
        address?.area,
        address?.locality,
        address?.city,
        address?.state,
        address?.pincode || pincode,
    ].filter(Boolean);

    return parts.length ? parts.join(", ") : "Address not provided";
}

function getTaskRoute(task) {
    const reverse = task.taskType === "Return Pickup";

    return {
        fromName: reverse ? task.customerName : task.sellerName,
        fromIcon: reverse ? "fa-user" : "fa-store",
        fromLabel: reverse ? "Customer Pickup" : "Seller Pickup",
        fromPincode: reverse ? task.deliveryPincode : task.pickupPincode,
        fromAddress: reverse ? task.customerAddress : task.pickupAddress,

        toName: reverse ? task.sellerName : task.customerName,
        toIcon: reverse ? "fa-store" : "fa-house",
        toLabel: reverse ? "Seller Return" : "Customer Delivery",
        toPincode: reverse ? task.pickupPincode : task.deliveryPincode,
        toAddress: reverse ? task.pickupAddress : task.customerAddress,
    };
}

function StatusBadge({ stage }) {
    const colors = {
        ready_for_pickup: "warning",
        assigned: "blue",
        picked_up: "purple",
        out_for_delivery: "purple",
        failed: "danger",
    };

    return (
        <span className={`dta-status is-${colors[stage] || "neutral"}`}>
            <i className="fa-solid fa-circle" aria-hidden="true" />
            {deliveryStageLabel(stage)}
        </span>
    );
}

function Detail({ label, value }) {
    return (
        <div className="dta-detail">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== MOBILE TASK CARD ==================
function MobileTaskCard({ task, onView }) {
    const route = getTaskRoute(task);

    return (
        <article className="dta-mobile-card">
            <div className="dta-mobile-card-top">
                <span className="dta-task-icon">
                    <i
                        className={`fa-solid ${taskIcons[task.taskType] || "fa-box"}`}
                        aria-hidden="true"
                    />
                </span>

                <div className="dta-mobile-identity">
                    <strong>{task.id}</strong>
                    <small>{task.parcelId || task.orderId || "Parcel"}</small>
                </div>

                <StatusBadge stage={task.stage} />
            </div>

            <div className="dta-mobile-type">
                <i className="fa-solid fa-layer-group" aria-hidden="true" />
                {task.taskType}
            </div>

            <div className="dta-mobile-route">
                <div className="dta-route-point">
                    <span className="dta-route-marker is-origin">
                        <i
                            className={`fa-solid ${route.fromIcon}`}
                            aria-hidden="true"
                        />
                    </span>

                    <div>
                        <small>{route.fromLabel}</small>
                        <strong>{route.fromName || "Pickup Point"}</strong>
                        <span>PIN: {route.fromPincode || "—"}</span>
                    </div>
                </div>

                <div className="dta-route-point">
                    <span className="dta-route-marker is-destination">
                        <i
                            className={`fa-solid ${route.toIcon}`}
                            aria-hidden="true"
                        />
                    </span>

                    <div>
                        <small>{route.toLabel}</small>
                        <strong>{route.toName || "Delivery Point"}</strong>
                        <span>PIN: {route.toPincode || "—"}</span>
                    </div>
                </div>
            </div>

            <div className="dta-mobile-product">
                <i className="fa-solid fa-box" aria-hidden="true" />
                <span>{task.product || "Order Parcel"}</span>
            </div>

            <div className="dta-mobile-footer">
                <span>
                    <i className="fa-regular fa-clock" aria-hidden="true" />
                    {formatDeliveryDate(task.assignedAt || task.createdAt)}
                </span>

                <Button
                    variant="contained"
                    onClick={() => onView(task.id)}
                    endIcon={
                        <i className="fa-solid fa-arrow-right" />
                    }
                >
                    View Task
                </Button>
            </div>
        </article>
    );
}

// ================== ASSIGNED TASKS ==================
function AssignedTasks({ user }) {
    const navigate = useNavigate();
    const isMobile = useMediaQuery("(max-width:600px)");

    const [agent, setAgent] = useState(() =>
        getDeliveryAgent(user)
    );

    const [tasks, setTasks] = useState(() =>
        getDeliveryTasks(user)
    );

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [taskType, setTaskType] = useState("All");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedId, setSelectedId] = useState(null);

    // ================== DATA REFRESH ==================
    const refresh = () => {
        setAgent(getDeliveryAgent(user));
        setTasks(getDeliveryTasks(user));
    };

    useEffect(() => {
        const sync = () => {
            setAgent(getDeliveryAgent(user));
            setTasks(getDeliveryTasks(user));
        };

        sync();

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [
        user?.id,
        user?.email,
        user?.agentId,
        user?.role,
    ]);

    const selected = tasks.find((task) =>
        task.id === selectedId
    );

    const selectedRoute = selected
        ? getTaskRoute(selected)
        : null;

    // ================== SUMMARY CARDS ==================
    const statistics = [
        {
            label: "Active Tasks",
            value: tasks.length,
            detail: "Assigned to your account",
            icon: "fa-clipboard-list",
            color: "blue",
        },
        {
            label: "Pickup Pending",
            value: tasks.filter((task) =>
                ["ready_for_pickup", "assigned"].includes(task.stage)
            ).length,
            detail: "Parcels to collect",
            icon: "fa-box-open",
            color: "orange",
        },
        {
            label: "In Delivery",
            value: tasks.filter((task) =>
                ["picked_up", "out_for_delivery"].includes(task.stage)
            ).length,
            detail: "Parcels in your custody",
            icon: "fa-truck-fast",
            color: "green",
        },
        {
            label: "Failed Tasks",
            value: tasks.filter((task) =>
                task.stage === "failed"
            ).length,
            detail: "Need retry or escalation",
            icon: "fa-triangle-exclamation",
            color: "red",
        },
    ];

    // ================== SEARCH AND FILTERS ==================
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const matchesSearch = [
                task.id,
                task.orderId,
                task.parcelId,
                task.product,
                task.sellerName,
                task.customerName,
                task.pickupPincode,
                task.deliveryPincode,
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            return matchesSearch &&
                (status === "All" || task.stage === status) &&
                (taskType === "All" || task.taskType === taskType);
        });
    }, [tasks, search, status, taskType]);

    const totalPages = Math.max(
        1,
        Math.ceil(filtered.length / rowsPerPage)
    );

    const currentPage = Math.min(page, totalPages - 1);

    const visible = filtered.slice(
        currentPage * rowsPerPage,
        (currentPage + 1) * rowsPerPage
    );

    const resetFilters = () => {
        setSearch("");
        setStatus("All");
        setTaskType("All");
        setPage(0);
    };

    return (
        <main className="delivery-tasks">
            {/* ================== PAGE HEADER ================== */}
            <header className="dta-hero">
                <div className="dta-hero-content">
                    <h1>
                        <i
                            className="fa-solid fa-clipboard-list"
                            aria-hidden="true"
                        />
                        ASSIGNED TASKS
                    </h1>

                    <p>
                        Manage your assigned pickups, customer deliveries
                        and replacement parcels in one place.
                    </p>
                </div>

                <Button
                    className="dta-refresh"
                    variant="outlined"
                    onClick={() => {
                        refresh();
                        toast.info("Assigned tasks refreshed.");
                    }}
                    startIcon={
                        <i className="fa-solid fa-arrows-rotate" />
                    }
                >
                    Refresh
                </Button>
            </header>

            {/* ================== ACCOUNT ALERTS ================== */}
            {!agent && (
                <Alert severity="warning" className="dta-alert">
                    Your login is not linked to a delivery agent record.
                    Ask Admin to register your email in Delivery Agents.
                </Alert>
            )}

            {agent && agent.status !== "Active" && (
                <Alert severity="error" className="dta-alert">
                    Your account is {String(agent.status).toLowerCase()}.
                    Tasks are unavailable until Admin reactivates it.
                </Alert>
            )}

            {/* ================== KPI CARDS ================== */}
            <section
                className="dta-stats"
                aria-label="Delivery task summary"
            >
                {statistics.map((item) => (
                    <article
                        className={`dta-stat is-${item.color}`}
                        key={item.label}
                    >
                        <div className="dta-stat-heading">
                            <span>{item.label}</span>

                            <span className="dta-stat-icon">
                                <i
                                    className={`fa-solid ${item.icon}`}
                                    aria-hidden="true"
                                />
                            </span>
                        </div>

                        <strong>
                            {item.value.toLocaleString("en-IN")}
                        </strong>

                        <p>{item.detail}</p>
                    </article>
                ))}
            </section>

            {/* ================== TASK LIST ================== */}
            <section className="dta-card">
                <div className="dta-card-heading">
                    <span className="dta-heading-icon">
                        <i
                            className="fa-solid fa-route"
                            aria-hidden="true"
                        />
                    </span>

                    <div>
                        <h2>My Assigned Parcels</h2>
                        <p>Active deliveries and pickups assigned to you.</p>
                    </div>

                    <span className="dta-record-count">
                        {filtered.length} Tasks
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="dta-toolbar">
                    <TextField
                        className="dta-search"
                        size="small"
                        label="Search Task / Order / Product"
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

                    <TextField
                        select
                        className="dta-filter"
                        size="small"
                        label="Task Type"
                        value={taskType}
                        onChange={(event) => {
                            setTaskType(event.target.value);
                            setPage(0);
                        }}
                    >
                        {typeOptions.map((value) => (
                            <MenuItem key={value} value={value}>
                                {value === "All"
                                    ? "All Task Types"
                                    : value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        className="dta-filter"
                        size="small"
                        label="Status"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(0);
                        }}
                    >
                        {statusOptions.map((option) => (
                            <MenuItem
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        className="dta-reset"
                        variant="outlined"
                        onClick={resetFilters}
                        startIcon={
                            <i className="fa-solid fa-rotate-left" />
                        }
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== DESKTOP TABLE ================== */}
                <TableContainer className="dta-table-scroll">
                    <Table
                        className="dta-table"
                        aria-label="Assigned delivery tasks"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Task / Parcel</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Pickup Location</TableCell>
                                <TableCell>Destination</TableCell>
                                <TableCell>Product</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((task) => {
                                const route = getTaskRoute(task);

                                return (
                                    <TableRow key={task.id} hover>
                                        <TableCell>
                                            <div className="dta-cell">
                                                <strong className="dta-task-code">
                                                    {task.id}
                                                </strong>

                                                <small>
                                                    {task.parcelId || "—"}
                                                </small>

                                                <small>
                                                    {formatDeliveryDate(
                                                        task.assignedAt ||
                                                        task.createdAt
                                                    )}
                                                </small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="dta-type">
                                                <i
                                                    className={`fa-solid ${
                                                        taskIcons[task.taskType] ||
                                                        "fa-box"
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                                {task.taskType}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <div className="dta-cell dta-location">
                                                <strong>
                                                    {route.fromName ||
                                                        "Pickup Point"}
                                                </strong>

                                                <small>
                                                    <i className="fa-solid fa-location-dot" />
                                                    {route.fromPincode || "—"}
                                                </small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="dta-cell dta-location">
                                                <strong>
                                                    {route.toName ||
                                                        "Delivery Point"}
                                                </strong>

                                                <small>
                                                    <i className="fa-solid fa-location-dot" />
                                                    {route.toPincode || "—"}
                                                </small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="dta-product">
                                                {task.product || "Order Parcel"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge stage={task.stage} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                className="dta-view-btn"
                                                variant="outlined"
                                                size="small"
                                                onClick={() =>
                                                    setSelectedId(task.id)
                                                }
                                                endIcon={
                                                    <i className="fa-solid fa-arrow-right" />
                                                }
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!visible.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="dta-empty">
                                            <span>
                                                <i className="fa-solid fa-box-open" />
                                            </span>

                                            <h3>No assigned tasks found</h3>

                                            <p>
                                                {tasks.length
                                                    ? "Try changing your search or filters."
                                                    : "Tasks will appear after Admin assigns a parcel to you."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ================== MOBILE TASK CARDS ================== */}
                <div className="dta-mobile-list">
                    {visible.map((task) => (
                        <MobileTaskCard
                            key={task.id}
                            task={task}
                            onView={setSelectedId}
                        />
                    ))}

                    {!visible.length && (
                        <div className="dta-empty">
                            <span>
                                <i className="fa-solid fa-box-open" />
                            </span>

                            <h3>No assigned tasks found</h3>

                            <p>
                                {tasks.length
                                    ? "Try changing your search or filters."
                                    : "Your assigned parcels will appear here."}
                            </p>
                        </div>
                    )}
                </div>

                {/* ================== PAGINATION ================== */}
                <TablePagination
                    className="dta-pagination"
                    component="div"
                    count={filtered.length}
                    page={currentPage}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20]}
                    onPageChange={(_, value) =>
                        setPage(value)
                    }
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />

                <div className="dta-mobile-pagination">
                    <span>
                        Page {currentPage + 1} of {totalPages}
                    </span>

                    <div>
                        <Button
                            variant="outlined"
                            disabled={currentPage === 0}
                            onClick={() =>
                                setPage(currentPage - 1)
                            }
                        >
                            Previous
                        </Button>

                        <Button
                            variant="outlined"
                            disabled={
                                currentPage >= totalPages - 1
                            }
                            onClick={() =>
                                setPage(currentPage + 1)
                            }
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </section>

            {/* ================== TASK DETAILS ================== */}
            <Dialog
                open={Boolean(selected)}
                onClose={() => setSelectedId(null)}
                fullWidth
                fullScreen={isMobile}
                maxWidth="sm"
                className="dta-dialog"
            >
                <DialogTitle className="dta-dialog-title">
                    <span>
                        <i
                            className="fa-solid fa-clipboard-list"
                            aria-hidden="true"
                        />
                        Task Details
                    </span>

                    <button
                        type="button"
                        className="dta-close"
                        aria-label="Close task details"
                        onClick={() => setSelectedId(null)}
                    >
                        <i
                            className="fa-solid fa-xmark"
                            aria-hidden="true"
                        />
                    </button>
                </DialogTitle>

                <DialogContent dividers>
                    {selected && (
                        <div className="dta-dialog-body">
                            <div className="dta-detail-banner">
                                <div>
                                    <small>{selected.taskType}</small>
                                    <strong>{selected.id}</strong>
                                    <span>{selected.parcelId || "—"}</span>
                                </div>

                                <StatusBadge stage={selected.stage} />
                            </div>

                            <div className="dta-detail-section">
                                <h3>
                                    <i
                                        className="fa-solid fa-route"
                                        aria-hidden="true"
                                    />
                                    Pickup & Destination
                                </h3>

                                <dl className="dta-details-grid">
                                    <Detail
                                        label="Pickup From"
                                        value={selectedRoute.fromName}
                                    />

                                    <Detail
                                        label="Pickup Pincode"
                                        value={selectedRoute.fromPincode}
                                    />

                                    <Detail
                                        label="Pickup Address"
                                        value={formatAddress(
                                            selectedRoute.fromAddress,
                                            selectedRoute.fromPincode
                                        )}
                                    />

                                    <Detail
                                        label="Deliver To"
                                        value={selectedRoute.toName}
                                    />

                                    <Detail
                                        label="Destination Pincode"
                                        value={selectedRoute.toPincode}
                                    />

                                    <Detail
                                        label="Destination Address"
                                        value={formatAddress(
                                            selectedRoute.toAddress,
                                            selectedRoute.toPincode
                                        )}
                                    />
                                </dl>
                            </div>

                            <div className="dta-detail-section">
                                <h3>
                                    <i
                                        className="fa-solid fa-box"
                                        aria-hidden="true"
                                    />
                                    Parcel Information
                                </h3>

                                <dl className="dta-details-grid">
                                    <Detail
                                        label="Order ID"
                                        value={selected.orderId}
                                    />

                                    <Detail
                                        label="Parcel ID"
                                        value={selected.parcelId}
                                    />

                                    <Detail
                                        label="Product"
                                        value={selected.product || "Parcel"}
                                    />

                                    <Detail
                                        label="Customer Contact"
                                        value={selected.customerPhone || "—"}
                                    />

                                    <Detail
                                        label="Current Custody"
                                        value={selected.custody || "—"}
                                    />

                                    <Detail
                                        label="Failed Attempts"
                                        value={selected.attempts ?? 0}
                                    />

                                    <Detail
                                        label="Assigned At"
                                        value={formatDeliveryDate(
                                            selected.assignedAt ||
                                            selected.createdAt
                                        )}
                                    />
                                </dl>
                            </div>

                            {selected.failureReason && (
                                <Alert severity="warning">
                                    Last failure: {selected.failureReason}
                                </Alert>
                            )}

                            <div className="dta-dialog-note">
                                <i
                                    className="fa-solid fa-circle-info"
                                    aria-hidden="true"
                                />
                                Pickup confirmation, delivery OTP and
                                failed-attempt actions will be added
                                to the Task Details workflow.
                            </div>
                        </div>
                    )}
                </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => setSelectedId(null)}
                >
                    Close
                </Button>

                <Button
                    variant="contained"
                    disabled={!selected}
                    onClick={() => {
                        navigate(
                            `/manage/tasks/${encodeURIComponent(selected.id)}`
                        );

                        setSelectedId(null);
                    }}
                    endIcon={
                        <i className="fa-solid fa-arrow-right" />
                    }
                >
                    Open Task Workflow
                </Button>
            </DialogActions>

            </Dialog>
        </main>
    );
}

export default AssignedTasks;
