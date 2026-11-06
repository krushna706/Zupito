
import { useEffect, useMemo, useState } from "react";
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
    useMediaQuery,
} from "@mui/material";

import {
    deliveryStageLabel,
    formatDeliveryDate,
    getDeliveryAgent,
    getDeliveryTasks,
} from "../services/deliveryService";

// ================== FILTER OPTIONS ==================
const typeOptions = [
    "All",
    "Customer Delivery",
    "Return Pickup",
    "Replacement Delivery",
];

const statusOptions = [
    { value: "All", label: "All History" },
    { value: "delivered", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "failed", label: "Currently Failed" },
    { value: "attempted", label: "Has Failed Attempts" },
];

const periodOptions = [
    { value: "All", label: "All Time" },
    { value: "7", label: "Last 7 Days" },
    { value: "30", label: "Last 30 Days" },
    { value: "90", label: "Last 90 Days" },
];

const typeIcons = {
    "Customer Delivery": "fa-truck-fast",
    "Return Pickup": "fa-arrow-rotate-left",
    "Replacement Delivery": "fa-box-open",
};

// ================== HISTORY HELPERS ==================
function failedAttempts(task) {
    const value = Number(task.attempts || 0);

    return Number.isFinite(value)
        ? Math.max(0, value)
        : 0;
}

function isHistoryTask(task) {
    return ["delivered", "cancelled", "failed"].includes(task.stage) ||
        failedAttempts(task) > 0;
}

function taskDate(task) {
    const events = Array.isArray(task.events)
        ? task.events
        : [];

    if (task.stage === "delivered") {
        return task.deliveredAt ||
            task.updatedAt ||
            events.at(-1)?.date ||
            task.assignedAt ||
            task.createdAt;
    }

    if (task.stage === "cancelled") {
        return task.cancelledAt ||
            task.updatedAt ||
            events.at(-1)?.date ||
            task.assignedAt ||
            task.createdAt;
    }

    return task.lastFailedAt ||
        task.updatedAt ||
        events.at(-1)?.date ||
        task.assignedAt ||
        task.createdAt;
}

function withinPeriod(value, period) {
    if (period === "All") return true;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    const start = new Date();

    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Number(period) + 1);

    return date >= start && date <= new Date();
}

function getRoute(task) {
    const reverse = task.taskType === "Return Pickup";

    return {
        from: reverse
            ? task.customerName
            : task.sellerName,

        to: reverse
            ? task.sellerName
            : task.customerName,

        fromLabel: reverse
            ? "Customer Pickup"
            : "Seller Pickup",

        toLabel: reverse
            ? "Return to Seller"
            : "Customer Delivery",

        fromPin: reverse
            ? task.deliveryPincode
            : task.pickupPincode,

        toPin: reverse
            ? task.pickupPincode
            : task.deliveryPincode,
    };
}

function getStatus(task) {
    if (task.stage === "delivered") {
        return {
            label: task.taskType === "Return Pickup"
                ? "Handover Completed"
                : "Delivered",
            tone: "success",
        };
    }

    if (task.stage === "cancelled") {
        return {
            label: "Cancelled",
            tone: "neutral",
        };
    }

    if (task.stage === "failed") {
        return {
            label: "Failed · Action Needed",
            tone: "danger",
        };
    }

    return {
        label: `${deliveryStageLabel(task.stage)} · Retried`,
        tone: "warning",
    };
}

// ================== STATUS BADGE ==================
function StatusBadge({ task }) {
    const status = getStatus(task);

    return (
        <span className={`dta-status is-${status.tone}`}>
            <i
                className="fa-solid fa-circle"
                aria-hidden="true"
            />

            {status.label}
        </span>
    );
}

// ================== DETAIL ITEM ==================
function Detail({ label, value }) {
    return (
        <div className="dta-detail">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

// ================== MOBILE HISTORY CARD ==================
function HistoryCard({ task, onView }) {
    const route = getRoute(task);

    return (
        <article className="dta-mobile-card dh-mobile-card">
            <div className="dta-mobile-card-top">
                <span className="dta-task-icon">
                    <i
                        className={`fa-solid ${
                            typeIcons[task.taskType] || "fa-box"
                        }`}
                        aria-hidden="true"
                    />
                </span>

                <div className="dta-mobile-identity">
                    <strong>{task.id}</strong>

                    <small>
                        {task.parcelId || task.orderId || "Parcel"}
                    </small>
                </div>
            </div>

            <div className="dh-mobile-status">
                <StatusBadge task={task} />
            </div>

            <div className="dta-mobile-type">
                <i
                    className="fa-solid fa-layer-group"
                    aria-hidden="true"
                />

                {task.taskType}
            </div>

            <div className="dta-mobile-route">
                <div className="dta-route-point">
                    <span className="dta-route-marker is-origin">
                        <i
                            className="fa-solid fa-location-dot"
                            aria-hidden="true"
                        />
                    </span>

                    <div>
                        <small>{route.fromLabel}</small>
                        <strong>{route.from || "Pickup Point"}</strong>
                        <span>PIN: {route.fromPin || "—"}</span>
                    </div>
                </div>

                <div className="dta-route-point">
                    <span className="dta-route-marker is-destination">
                        <i
                            className="fa-solid fa-flag-checkered"
                            aria-hidden="true"
                        />
                    </span>

                    <div>
                        <small>{route.toLabel}</small>
                        <strong>{route.to || "Destination"}</strong>
                        <span>PIN: {route.toPin || "—"}</span>
                    </div>
                </div>
            </div>

            <div className="dh-mobile-meta">
                <span>
                    <i
                        className="fa-regular fa-calendar"
                        aria-hidden="true"
                    />

                    {formatDeliveryDate(taskDate(task))}
                </span>

                <span>
                    <i
                        className="fa-solid fa-rotate"
                        aria-hidden="true"
                    />

                    {failedAttempts(task)} failed attempt(s)
                </span>
            </div>

            <Button
                className="dh-mobile-view"
                variant="contained"
                onClick={() => onView(task.id)}
                endIcon={
                    <i className="fa-solid fa-arrow-right" />
                }
            >
                View History
            </Button>
        </article>
    );
}

// ================== DELIVERY HISTORY ==================
function DeliveryHistory({ user }) {
    const isMobile = useMediaQuery("(max-width:600px)");

    const [agent, setAgent] = useState(() =>
        getDeliveryAgent(user)
    );

    const [tasks, setTasks] = useState(() =>
        getDeliveryTasks(user, true)
    );

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [taskType, setTaskType] = useState("All");
    const [period, setPeriod] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedId, setSelectedId] = useState(null);

    // ================== DATA REFRESH ==================
    const refresh = () => {
        setAgent(getDeliveryAgent(user));
        setTasks(getDeliveryTasks(user, true));
    };

    useEffect(() => {
        const sync = () => {
            setAgent(getDeliveryAgent(user));
            setTasks(getDeliveryTasks(user, true));
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

    // ================== HISTORY RECORDS ==================
    const history = useMemo(() => {
        return tasks
            .filter(isHistoryTask)
            .sort((first, second) =>
                new Date(taskDate(second) || 0) -
                new Date(taskDate(first) || 0)
            );
    }, [tasks]);

    // ================== STATISTICS ==================
    const stats = [
        {
            label: "Completed Tasks",
            value: history.filter((task) =>
                task.stage === "delivered"
            ).length,
            note: "All completed handovers",
            icon: "fa-circle-check",
            tone: "green",
        },
        {
            label: "Customer Deliveries",
            value: history.filter((task) =>
                task.stage === "delivered" &&
                task.taskType === "Customer Delivery"
            ).length,
            note: "Delivered to customers",
            icon: "fa-truck-fast",
            tone: "blue",
        },
        {
            label: "Replacement Tasks",
            value: history.filter((task) =>
                task.stage === "delivered" &&
                task.taskType !== "Customer Delivery"
            ).length,
            note: "Completed return / replacement",
            icon: "fa-arrow-right-arrow-left",
            tone: "orange",
        },
        {
            label: "Failed Attempts",
            value: history.reduce((total, task) =>
                total + failedAttempts(task),
                0
            ),
            note: "Recorded attempts, including retries",
            icon: "fa-triangle-exclamation",
            tone: "red",
        },
    ];

    // ================== SEARCH AND FILTERS ==================
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return history.filter((task) => {
            const matchesSearch = [
                task.id,
                task.orderId,
                task.parcelId,
                task.product,
                task.sellerName,
                task.customerName,
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            const matchesStatus = status === "All" ||
                (
                    status === "attempted"
                        ? failedAttempts(task) > 0
                        : task.stage === status
                );

            const matchesType = taskType === "All" ||
                task.taskType === taskType;

            return matchesSearch &&
                matchesStatus &&
                matchesType &&
                withinPeriod(taskDate(task), period);
        });
    }, [
        history,
        search,
        status,
        taskType,
        period,
    ]);

    // ================== PAGINATION ==================
    const pages = Math.max(
        1,
        Math.ceil(filtered.length / rowsPerPage)
    );

    const currentPage = Math.min(page, pages - 1);

    const visible = filtered.slice(
        currentPage * rowsPerPage,
        (currentPage + 1) * rowsPerPage
    );

    const selected = history.find((task) =>
        task.id === selectedId
    );

    const selectedRoute = selected
        ? getRoute(selected)
        : null;

    const resetFilters = () => {
        setSearch("");
        setStatus("All");
        setTaskType("All");
        setPeriod("All");
        setPage(0);
    };

    return (
        <main className="delivery-tasks delivery-history">
            {/* ================== PAGE HEADER ================== */}
            <header className="dta-hero">
                <div className="dta-hero-content">
                    <h1>
                        <i
                            className="fa-solid fa-clock-rotate-left"
                            aria-hidden="true"
                        />
                        DELIVERY HISTORY
                    </h1>

                    <p>
                        Review completed deliveries, replacement handovers,
                        cancellations and recorded failed attempts.
                    </p>
                </div>

                <Button
                    className="dta-refresh"
                    variant="outlined"
                    onClick={refresh}
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
                    No delivery-agent account is linked to this login.
                    History is shown only for the signed-in agent.
                </Alert>
            )}

            {agent && agent.status !== "Active" && (
                <Alert severity="warning" className="dta-alert">
                    Your delivery account is inactive. History is
                    unavailable under the current frontend account-access rules.
                </Alert>
            )}

            {/* ================== HISTORY METRICS ================== */}
            <section
                className="dta-stats"
                aria-label="Delivery history summary"
            >
                {stats.map((item) => (
                    <article
                        className={`dta-stat is-${item.tone}`}
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

                        <p>{item.note}</p>
                    </article>
                ))}
            </section>

            {/* ================== HISTORY LIST ================== */}
            <section className="dta-card">
                <div className="dta-card-heading">
                    <span className="dta-heading-icon">
                        <i
                            className="fa-solid fa-box-archive"
                            aria-hidden="true"
                        />
                    </span>

                    <div>
                        <h2>My Delivery Records</h2>
                        <p>
                            Completed tasks and documented delivery issues.
                        </p>
                    </div>

                    <span className="dta-record-count">
                        {filtered.length} Records
                    </span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="dta-toolbar">
                    <TextField
                        className="dta-search"
                        size="small"
                        label="Search Task / Order / Parcel"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
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
                        }}
                    />

                    <TextField
                        className="dta-filter"
                        select
                        size="small"
                        label="Task Type"
                        value={taskType}
                        onChange={(event) => {
                            setTaskType(event.target.value);
                            setPage(0);
                        }}
                    >
                        {typeOptions.map((value) => (
                            <MenuItem
                                key={value}
                                value={value}
                            >
                                {value === "All"
                                    ? "All Task Types"
                                    : value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        className="dta-filter"
                        select
                        size="small"
                        label="Status"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(0);
                        }}
                    >
                        {statusOptions.map((item) => (
                            <MenuItem
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        className="dta-filter"
                        select
                        size="small"
                        label="Period"
                        value={period}
                        onChange={(event) => {
                            setPeriod(event.target.value);
                            setPage(0);
                        }}
                    >
                        {periodOptions.map((item) => (
                            <MenuItem
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
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
                        aria-label="Delivery history records"
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>Task / Parcel</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Destination</TableCell>
                                <TableCell>Last Activity</TableCell>
                                <TableCell>Attempts</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((task) => {
                                const route = getRoute(task);

                                return (
                                    <TableRow
                                        key={task.id}
                                        hover
                                    >
                                        <TableCell>
                                            <div className="dta-cell">
                                                <strong className="dta-task-code">
                                                    {task.id}
                                                </strong>

                                                <small>
                                                    {task.parcelId || "—"}
                                                </small>

                                                <small>
                                                    {task.orderId || "—"}
                                                </small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="dta-type">
                                                <i
                                                    className={`fa-solid ${
                                                        typeIcons[task.taskType] ||
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
                                                    {route.to || "Destination"}
                                                </strong>

                                                <small>
                                                    <i
                                                        className="fa-solid fa-location-dot"
                                                        aria-hidden="true"
                                                    />

                                                    {route.toPin || "—"}
                                                </small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {formatDeliveryDate(
                                                taskDate(task)
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            {failedAttempts(task)}
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge task={task} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() =>
                                                    setSelectedId(task.id)
                                                }
                                            >
                                                View History
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

                                            <h3>No history records found</h3>

                                            <p>
                                                {history.length
                                                    ? "Try changing the filters or search."
                                                    : "Completed and failed task records will appear here."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ================== MOBILE CARDS ================== */}
                <div className="dta-mobile-list">
                    {visible.map((task) => (
                        <HistoryCard
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

                            <h3>No history records found</h3>

                            <p>
                                {history.length
                                    ? "Try changing the search or filters."
                                    : "Your completed and failed deliveries will appear here."}
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
                        Page {currentPage + 1} of {pages}
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
                                currentPage === pages - 1
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

            {/* ================== HISTORY DETAILS ================== */}
            <Dialog
                open={Boolean(selected)}
                onClose={() => setSelectedId(null)}
                fullWidth
                fullScreen={isMobile}
                maxWidth="sm"
                className="dta-dialog delivery-history-dialog"
            >
                <DialogTitle className="dta-dialog-title">
                    <span>
                        <i
                            className="fa-solid fa-clock-rotate-left"
                            aria-hidden="true"
                        />
                        Delivery Activity
                    </span>

                    <button
                        type="button"
                        className="dta-close"
                        aria-label="Close delivery activity"
                        onClick={() => setSelectedId(null)}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </DialogTitle>

                <DialogContent dividers>
                    {selected && (
                        <div className="dta-dialog-body">
                            <div className="dta-detail-banner">
                                <div>
                                    <small>{selected.taskType}</small>
                                    <strong>{selected.id}</strong>
                                    <span>
                                        {selected.parcelId || "—"}
                                    </span>
                                </div>

                                <StatusBadge task={selected} />
                            </div>

                            {/* ================== TASK SUMMARY ================== */}
                            <div className="dta-detail-section">
                                <h3>
                                    <i className="fa-solid fa-box" />
                                    Task Summary
                                </h3>

                                <dl className="dta-details-grid">
                                    <Detail
                                        label="Order ID"
                                        value={selected.orderId}
                                    />

                                    <Detail
                                        label="Product"
                                        value={selected.product}
                                    />

                                    <Detail
                                        label="Pickup From"
                                        value={selectedRoute?.from}
                                    />

                                    <Detail
                                        label="Deliver To"
                                        value={selectedRoute?.to}
                                    />

                                    <Detail
                                        label="Pickup PIN"
                                        value={selectedRoute?.fromPin}
                                    />

                                    <Detail
                                        label="Destination PIN"
                                        value={selectedRoute?.toPin}
                                    />

                                    <Detail
                                        label="Current Custody"
                                        value={selected.custody}
                                    />

                                    <Detail
                                        label="Failed Attempts"
                                        value={failedAttempts(selected)}
                                    />

                                    <Detail
                                        label="Last Activity"
                                        value={formatDeliveryDate(
                                            taskDate(selected)
                                        )}
                                    />

                                    <Detail
                                        label="Failure Reason"
                                        value={
                                            selected.failureReason || "—"
                                        }
                                    />
                                </dl>
                            </div>

                            {/* ================== ACTIVITY TIMELINE ================== */}
                            <div className="dta-detail-section">
                                <h3>
                                    <i className="fa-solid fa-list-check" />
                                    Activity Timeline
                                </h3>

                                <div className="dh-timeline">
                                    {(
                                        Array.isArray(selected.events)
                                            ? [...selected.events].reverse()
                                            : []
                                    ).map((event, index) => (
                                        <div
                                            className="dh-timeline-item"
                                            key={`${event.date}-${index}`}
                                        >
                                            <span className="dh-timeline-dot" />

                                            <div>
                                                <strong>
                                                    {event.note ||
                                                        "Task updated"}
                                                </strong>

                                                <small>
                                                    {formatDeliveryDate(
                                                        event.date
                                                    )}
                                                </small>
                                            </div>
                                        </div>
                                    ))}

                                    {!selected.events?.length && (
                                        <p className="dh-timeline-empty">
                                            No detailed activity events are
                                            stored for this record.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {selected.stage === "failed" && (
                                <Alert severity="warning">
                                    This task still needs action. Open
                                    Task Details to retry, or contact
                                    Admin if escalated.
                                </Alert>
                            )}
                        </div>
                    )}
                </DialogContent>

                <DialogActions className="dta-dialog-actions">
                    <Button
                        onClick={() => setSelectedId(null)}
                    >
                        Close
                    </Button>

                    {selected &&
                        !["delivered", "cancelled"].includes(
                            selected.stage
                        ) && (
                            <Button
                                component={Link}
                                to={`/manage/tasks/${
                                    encodeURIComponent(selected.id)
                                }`}
                                variant="contained"
                            >
                                Open Task
                            </Button>
                        )}
                </DialogActions>
            </Dialog>
        </main>
    );
}

export default DeliveryHistory;
