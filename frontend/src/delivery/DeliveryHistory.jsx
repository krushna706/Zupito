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
    refreshDeliveryData,
} from "../services/deliveryService";

// ================== FILTERS ==================
const types = ["All", "Customer Delivery", "Return Pickup", "Replacement Delivery"];

const statuses = [
    ["All", "All History"],
    ["delivered", "Completed"],
    ["cancelled", "Cancelled"],
    ["failed", "Currently Failed"],
    ["attempted", "Has Failed Attempts"],
];

const periods = [
    ["All", "All Time"],
    ["7", "Last 7 Days"],
    ["30", "Last 30 Days"],
    ["90", "Last 90 Days"],
];

const icons = {
    "Customer Delivery": "fa-truck-fast",
    "Return Pickup": "fa-arrow-rotate-left",
    "Replacement Delivery": "fa-box-open",
};

// ================== HELPERS ==================
function attempts(task) {
    return Math.max(0, Number(task.attempts || 0));
}

function isHistory(task) {
    return ["delivered", "cancelled", "failed"].includes(task.stage) || attempts(task) > 0;
}

function lastActivity(task) {
    const events = task.events || [];

    return (
        task.deliveredAt ||
        task.lastFailedAt ||
        task.updatedAt ||
        events.at(-1)?.date ||
        task.assignedAt ||
        task.createdAt
    );
}

function withinPeriod(value, days) {
    if (days === "All") return true;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Number(days) + 1);

    return date >= start && date <= new Date();
}

function routeOf(task) {
    const reverse = task.kind === "replacement_pickup";

    return {
        from: reverse ? task.customerName : task.sellerName,
        to: reverse ? task.sellerName : task.customerName,
        fromPin: reverse ? task.deliveryPincode : task.pickupPincode,
        toPin: reverse ? task.pickupPincode : task.deliveryPincode,
    };
}

function taskStatus(task) {
    if (task.stage === "delivered") {
        return {
            text: "Delivered",
            color: "success",
        };
    }

    if (task.stage === "cancelled") {
        return {
            text: "Cancelled",
            color: "neutral",
        };
    }

    if (task.stage === "failed") {
        return {
            text: "Failed · Action Needed",
            color: "danger",
        };
    }

    return {
        text: `${deliveryStageLabel(task.stage)} · Retried`,
        color: "warning",
    };
}

function StatusBadge({ task }) {
    const status = taskStatus(task);

    return (
        <span className={`dta-status is-${status.color}`}>
            <i className="fa-solid fa-circle" />
            {status.text}
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

// ================== ORDERED ITEMS ==================
function OrderedItems({ task }) {
    const items = task.items || [];

    return (
        <div className="dta-detail-section">
            <h3>
                <i className="fa-solid fa-bag-shopping" /> Ordered Items ({items.length})
            </h3>

            <p>
                Total ordered quantity: <strong>{task.totalQuantity || 0}</strong>
            </p>

            {items.map((item, index) => (
                <div className="dta-detail" key={`${item.id}-${index}`}>
                    <dt>
                        {item.image ? (
                            <img
                                src={item.image}
                                alt={item.name}
                                width="52"
                                height="52"
                                loading="lazy"
                            />
                        ) : (
                            <i className="fa-solid fa-box" />
                        )}
                    </dt>

                    <dd>
                        <strong>{item.name}</strong>

                        <p>{item.variantLabel || "Standard Variant"}</p>

                        {item.brand && <small>Brand: {item.brand}</small>}

                        {item.sku && <small> SKU: {item.sku}</small>}

                        <strong> Qty: {item.quantity}</strong>
                    </dd>
                </div>
            ))}

            {!items.length && <p>Order item snapshot unavailable.</p>}
        </div>
    );
}

// ================== MOBILE CARD ==================
function HistoryCard({ task, onView }) {
    const route = routeOf(task);

    return (
        <article className="dta-mobile-card dh-mobile-card">
            <div className="dta-mobile-card-top">
                <span className="dta-task-icon">
                    <i className={`fa-solid ${icons[task.taskType] || "fa-box"}`} />
                </span>

                <div className="dta-mobile-identity">
                    <strong>{task.id}</strong>
                    <small>{task.parcelId}</small>
                </div>
            </div>

            <div className="dh-mobile-status">
                <StatusBadge task={task} />
            </div>

            <div className="dta-mobile-type">
                <i className="fa-solid fa-layer-group" />
                {task.taskType}
            </div>

            <div className="dta-mobile-route">
                <div className="dta-route-point">
                    <span className="dta-route-marker is-origin">
                        <i className="fa-solid fa-location-dot" />
                    </span>

                    <div>
                        <small>Pickup</small>
                        <strong>{route.from}</strong>
                        <span>PIN: {route.fromPin}</span>
                    </div>
                </div>

                <div className="dta-route-point">
                    <span className="dta-route-marker is-destination">
                        <i className="fa-solid fa-flag-checkered" />
                    </span>

                    <div>
                        <small>Destination</small>
                        <strong>{route.to}</strong>
                        <span>PIN: {route.toPin}</span>
                    </div>
                </div>
            </div>

            <div className="dta-mobile-product">
                <i className="fa-solid fa-bag-shopping" />
                {task.items?.[0]?.name || task.product || "Order Parcel"}
                {(task.items?.length || 0) > 1 && ` +${task.items.length - 1} more`}
                {` · Qty ${task.totalQuantity || 0}`}
            </div>

            <div className="dh-mobile-meta">
                <span>
                    <i className="fa-regular fa-calendar" />
                    {formatDeliveryDate(lastActivity(task))}
                </span>

                <span>
                    <i className="fa-solid fa-rotate" />
                    {attempts(task)} failed attempt(s)
                </span>
            </div>

            <Button className="dh-mobile-view" variant="contained" onClick={() => onView(task.id)}>
                View History
            </Button>
        </article>
    );
}

// ================== DELIVERY HISTORY ==================
function DeliveryHistory({ user }) {
    const isMobile = useMediaQuery("(max-width:600px)");

    const [agent, setAgent] = useState(() => getDeliveryAgent(user));

    const [tasks, setTasks] = useState(() => getDeliveryTasks(user, true));

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [type, setType] = useState("All");
    const [period, setPeriod] = useState("All");

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedId, setSelectedId] = useState(null);

    // ================== INITIAL DATA ==================
    useEffect(() => {
        let active = true;

        const sync = () => {
            if (!active) return;

            setAgent(getDeliveryAgent(user));
            setTasks(getDeliveryTasks(user, true));
        };

        const load = async () => {
            try {
                await refreshDeliveryData(user);
                sync();
            } catch (failure) {
                if (active) setError(failure.message);
            } finally {
                if (active) setLoading(false);
            }
        };

        load();

        window.addEventListener("zupito:delivery-updated", sync);

        return () => {
            active = false;

            window.removeEventListener("zupito:delivery-updated", sync);
        };
    }, [user]);

    // ================== MANUAL REFRESH ==================
    const refresh = async () => {
        setLoading(true);
        setError("");

        try {
            await refreshDeliveryData(user);

            setAgent(getDeliveryAgent(user));
            setTasks(getDeliveryTasks(user, true));
        } catch (failure) {
            setError(failure.message);
        } finally {
            setLoading(false);
        }
    };

    // ================== HISTORY RECORDS ==================
    const history = useMemo(() => {
        return tasks
            .filter(isHistory)
            .sort(
                (first, second) =>
                    new Date(lastActivity(second) || 0) - new Date(lastActivity(first) || 0)
            );
    }, [tasks]);

    // ================== SUMMARY ==================
    const stats = [
        {
            title: "Completed Tasks",
            value: history.filter((task) => task.stage === "delivered").length,
            icon: "fa-circle-check",
            color: "green",
            note: "All completed handovers",
        },
        {
            title: "Customer Deliveries",
            value: history.filter((task) => task.stage === "delivered" && task.kind === "original")
                .length,
            icon: "fa-truck-fast",
            color: "blue",
            note: "Delivered to customers",
        },
        {
            title: "Replacement Tasks",
            value: history.filter((task) => task.stage === "delivered" && task.kind !== "original")
                .length,
            icon: "fa-arrow-right-arrow-left",
            color: "orange",
            note: "Completed replacements",
        },
        {
            title: "Failed Attempts",
            value: history.reduce((sum, task) => sum + attempts(task), 0),
            icon: "fa-triangle-exclamation",
            color: "red",
            note: "Recorded failed attempts",
        },
    ];

    // ================== FILTERS ==================
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return history.filter((task) => {
            const matches = [
                task.id,
                task.parcelId,
                task.orderId,
                task.product,
                task.customerName,
                ...(task.items || []).flatMap((item) => [item.name, item.variantLabel, item.sku]),
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            const matchesStatus =
                status === "All" ||
                (status === "attempted" ? attempts(task) > 0 : task.stage === status);

            return (
                matches &&
                matchesStatus &&
                (type === "All" || task.taskType === type) &&
                withinPeriod(lastActivity(task), period)
            );
        });
    }, [history, search, status, type, period]);

    const pages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

    const currentPage = Math.min(page, pages - 1);

    const visible = filtered.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);

    const selected = history.find((task) => task.id === selectedId);

    const route = selected ? routeOf(selected) : null;

    const resetFilters = () => {
        setSearch("");
        setStatus("All");
        setType("All");
        setPeriod("All");
        setPage(0);
    };

    return (
        <main className="delivery-tasks delivery-history">
            {/* ================== HEADER ================== */}
            <header className="dta-hero">
                <div className="dta-hero-content">
                    <h1>
                        <i className="fa-solid fa-clock-rotate-left" />
                        DELIVERY HISTORY
                    </h1>

                    <p>Review completed deliveries, handovers and recorded failed attempts.</p>
                </div>

                <Button
                    className="dta-refresh"
                    variant="outlined"
                    disabled={loading}
                    onClick={refresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </header>

            {error && (
                <Alert severity="error" className="dta-alert">
                    {error}
                </Alert>
            )}

            {!loading && !error && !agent && (
                <Alert severity="warning" className="dta-alert">
                    No delivery account is linked to this login.
                </Alert>
            )}

            {/* ================== STATISTICS ================== */}
            <section className="dta-stats">
                {stats.map((item) => (
                    <article key={item.title} className={`dta-stat is-${item.color}`}>
                        <div className="dta-stat-heading">
                            <span>{item.title}</span>

                            <span className="dta-stat-icon">
                                <i className={`fa-solid ${item.icon}`} />
                            </span>
                        </div>

                        <strong>{item.value}</strong>
                        <p>{item.note}</p>
                    </article>
                ))}
            </section>

            {/* ================== HISTORY TABLE ================== */}
            <section className="dta-card">
                <div className="dta-card-heading">
                    <span className="dta-heading-icon">
                        <i className="fa-solid fa-box-archive" />
                    </span>

                    <div>
                        <h2>My Delivery Records</h2>
                        <p>Completed tasks and documented delivery issues.</p>
                    </div>

                    <span className="dta-record-count">{filtered.length} Records</span>
                </div>

                {/* ================== FILTER BAR ================== */}
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
                        value={type}
                        onChange={(event) => {
                            setType(event.target.value);
                            setPage(0);
                        }}
                    >
                        {types.map((value) => (
                            <MenuItem key={value} value={value}>
                                {value === "All" ? "All Task Types" : value}
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
                        {statuses.map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                                {label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        className="dta-filter"
                        size="small"
                        label="Period"
                        value={period}
                        onChange={(event) => {
                            setPeriod(event.target.value);
                            setPage(0);
                        }}
                    >
                        {periods.map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                                {label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        className="dta-reset"
                        variant="outlined"
                        onClick={resetFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== DESKTOP TABLE ================== */}
                <TableContainer className="dta-table-scroll">
                    <Table className="dta-table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Task / Parcel</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Destination</TableCell>
                                <TableCell>Last Activity</TableCell>
                                <TableCell>Attempts</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((task) => {
                                const path = routeOf(task);

                                return (
                                    <TableRow key={task.id} hover>
                                        <TableCell>
                                            <div className="dta-cell">
                                                <strong className="dta-task-code">{task.id}</strong>

                                                <small>{task.parcelId}</small>

                                                <small>
                                                    {task.items?.[0]?.name || task.product}
                                                    {" · "}
                                                    Qty {task.totalQuantity || 0}
                                                </small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="dta-type">
                                                <i
                                                    className={`fa-solid ${
                                                        icons[task.taskType] || "fa-box"
                                                    }`}
                                                />
                                                {task.taskType}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <div className="dta-cell dta-location">
                                                <strong>{path.to}</strong>
                                                <small>
                                                    <i className="fa-solid fa-location-dot" />
                                                    {path.toPin}
                                                </small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {formatDeliveryDate(lastActivity(task))}
                                        </TableCell>

                                        <TableCell>{attempts(task)}</TableCell>

                                        <TableCell>
                                            <StatusBadge task={task} />
                                        </TableCell>

                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => setSelectedId(task.id)}
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
                                            <i className="fa-solid fa-box-open" />
                                            <h3>No history records found</h3>
                                            <p>Completed and failed deliveries appear here.</p>
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
                        <HistoryCard key={task.id} task={task} onView={setSelectedId} />
                    ))}

                    {!visible.length && (
                        <div className="dta-empty">
                            <h3>No history records found</h3>
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
                    onPageChange={(_, next) => setPage(next)}
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
                            onClick={() => setPage(currentPage - 1)}
                        >
                            Previous
                        </Button>

                        <Button
                            variant="outlined"
                            disabled={currentPage === pages - 1}
                            onClick={() => setPage(currentPage + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </section>

            {/* ================== HISTORY DIALOG ================== */}
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
                        <i className="fa-solid fa-clock-rotate-left" />
                        Delivery Activity
                    </span>

                    <button
                        type="button"
                        className="dta-close"
                        onClick={() => setSelectedId(null)}
                        aria-label="Close history"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </DialogTitle>

                <DialogContent dividers>
                    {selected && route && (
                        <div className="dta-dialog-body">
                            <div className="dta-detail-banner">
                                <div>
                                    <small>{selected.taskType}</small>
                                    <strong>{selected.id}</strong>
                                    <span>{selected.parcelId}</span>
                                </div>

                                <StatusBadge task={selected} />
                            </div>

                            {/* ================== ORDER ITEMS ================== */}
                            <OrderedItems task={selected} />

                            {/* ================== RECORD DETAILS ================== */}
                            <div className="dta-detail-section">
                                <h3>
                                    <i className="fa-solid fa-box" />
                                    Task Summary
                                </h3>

                                <dl className="dta-details-grid">
                                    <Detail label="Order ID" value={selected.orderId} />
                                    <Detail label="Pickup From" value={route.from} />
                                    <Detail label="Destination" value={route.to} />
                                    <Detail label="Pickup Pincode" value={route.fromPin} />
                                    <Detail label="Delivery Pincode" value={route.toPin} />
                                    <Detail label="Current Custody" value={selected.custody} />
                                    <Detail label="Failed Attempts" value={attempts(selected)} />
                                    <Detail
                                        label="Last Activity"
                                        value={formatDeliveryDate(lastActivity(selected))}
                                    />
                                    <Detail
                                        label="Failure Reason"
                                        value={selected.failureReason || "—"}
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
                                    {[...(selected.events || [])].reverse().map((event, index) => (
                                        <div
                                            key={`${event.date}-${index}`}
                                            className="dh-timeline-item"
                                        >
                                            <span className="dh-timeline-dot" />

                                            <div>
                                                <strong>{event.note}</strong>
                                                <small>{formatDeliveryDate(event.date)}</small>
                                            </div>
                                        </div>
                                    ))}

                                    {!selected.events?.length && (
                                        <p className="dh-timeline-empty">
                                            No detailed activity recorded yet.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {selected.stage === "failed" && (
                                <Alert severity="warning">
                                    This task needs another attempt or Admin review.
                                </Alert>
                            )}
                        </div>
                    )}
                </DialogContent>

                <DialogActions className="dta-dialog-actions">
                    <Button onClick={() => setSelectedId(null)}>Close</Button>

                    {selected && !["delivered", "cancelled"].includes(selected.stage) && (
                        <Button
                            component={Link}
                            to={`/manage/tasks/${encodeURIComponent(selected.id)}`}
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
