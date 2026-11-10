
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
    refreshDeliveryData,
} from "../services/deliveryService";

// ================== FILTERS ==================
const statuses = [
    ["All", "All Statuses"],
    ["ready_for_pickup", "Ready for Pickup"],
    ["assigned", "Assigned"],
    ["picked_up", "Picked Up"],
    ["out_for_delivery", "Out for Delivery"],
    ["failed", "Delivery Failed"],
];

const types = [
    "All",
    "Customer Delivery",
    "Return Pickup",
    "Replacement Delivery",
];

const icons = {
    "Customer Delivery": "fa-truck-fast",
    "Return Pickup": "fa-arrow-rotate-left",
    "Replacement Delivery": "fa-box-open",
};

// ================== HELPERS ==================
function addressText(address, pincode = "") {
    if (typeof address === "string") return address;

    return [
        address?.house,
        address?.street,
        address?.area,
        address?.locality,
        address?.city,
        address?.state,
        address?.pincode || pincode,
    ].filter(Boolean).join(", ") || "Address not available";
}

function routeOf(task) {
    const reverse = task.kind === "replacement_pickup";

    return {
        from: reverse
            ? task.customerName
            : task.sellerName,
        to: reverse
            ? task.sellerName
            : task.customerName,
        fromPin: reverse
            ? task.deliveryPincode
            : task.pickupPincode,
        toPin: reverse
            ? task.pickupPincode
            : task.deliveryPincode,
        fromAddress: reverse
            ? task.customerAddress
            : task.pickupAddress,
        toAddress: reverse
            ? task.sellerAddress
            : task.customerAddress,
        fromLabel: reverse
            ? "Customer Pickup"
            : "Seller Pickup",
        toLabel: reverse
            ? "Seller Return"
            : "Customer Delivery",
    };
}

function summaryText(task) {
    const items = task.items || [];
    const first = items[0];

    if (!first) {
        return task.product || "Order Parcel";
    }

    return [
        first.name,
        items.length > 1
            ? `+${items.length - 1} more`
            : null,
        `Qty ${task.totalQuantity || 0}`,
    ].filter(Boolean).join(" · ");
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
        <span className={`dta-status is-${
            colors[stage] || "neutral"
        }`}>
            <i className="fa-solid fa-circle" />
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

// ================== ORDERED ITEMS ==================
function OrderedItems({ task }) {
    const items = task.items || [];

    return (
        <div className="dta-detail-section">
            <h3>
                <i className="fa-solid fa-bag-shopping" />
                {" "}Ordered Items ({items.length})
            </h3>

            <p>
                Total ordered quantity:{" "}
                <strong>{task.totalQuantity || 0}</strong>
            </p>

            {items.map((item, index) => (
                <div
                    className="dta-detail"
                    key={`${item.id}-${index}`}
                >
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

                        <p>
                            {item.variantLabel ||
                                "Standard Variant"}
                        </p>

                        {item.brand && (
                            <small>Brand: {item.brand}</small>
                        )}

                        {item.sku && (
                            <small> SKU: {item.sku}</small>
                        )}

                        <strong> Qty: {item.quantity}</strong>
                    </dd>
                </div>
            ))}

            {!items.length && (
                <p>Order item details are unavailable.</p>
            )}
        </div>
    );
}

// ================== MOBILE TASK CARD ==================
function MobileTaskCard({ task, onView }) {
    const route = routeOf(task);

    return (
        <article className="dta-mobile-card">
            <div className="dta-mobile-card-top">
                <span className="dta-task-icon">
                    <i className={`fa-solid ${
                        icons[task.taskType] || "fa-box"
                    }`} />
                </span>

                <div className="dta-mobile-identity">
                    <strong>{task.id}</strong>
                    <small>{task.parcelId}</small>
                </div>

                <StatusBadge stage={task.stage} />
            </div>

            <div className="dta-mobile-type">
                <i className="fa-solid fa-layer-group" />
                {task.taskType}
            </div>

            <div className="dta-mobile-route">
                <div className="dta-route-point">
                    <span className="dta-route-marker is-origin">
                        <i className="fa-solid fa-store" />
                    </span>

                    <div>
                        <small>{route.fromLabel}</small>
                        <strong>{route.from}</strong>
                        <span>PIN: {route.fromPin}</span>
                    </div>
                </div>

                <div className="dta-route-point">
                    <span className="dta-route-marker is-destination">
                        <i className="fa-solid fa-house" />
                    </span>

                    <div>
                        <small>{route.toLabel}</small>
                        <strong>{route.to}</strong>
                        <span>PIN: {route.toPin}</span>
                    </div>
                </div>
            </div>

            <div className="dta-mobile-product">
                <i className="fa-solid fa-bag-shopping" />
                {summaryText(task)}
            </div>

            <div className="dta-mobile-footer">
                <span>
                    <i className="fa-regular fa-clock" />
                    {formatDeliveryDate(
                        task.assignedAt || task.createdAt
                    )}
                </span>

                <Button
                    variant="contained"
                    onClick={() => onView(task.id)}
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

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [type, setType] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedId, setSelectedId] = useState(null);

    // ================== INITIAL DATA ==================
    useEffect(() => {
        let active = true;

        const sync = () => {
            if (!active) return;

            setAgent(getDeliveryAgent(user));
            setTasks(getDeliveryTasks(user));
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

        window.addEventListener(
            "zupito:delivery-updated",
            sync
        );

        return () => {
            active = false;

            window.removeEventListener(
                "zupito:delivery-updated",
                sync
            );
        };
    }, [user?._id, user?.id, user?.role]);

    // ================== MANUAL REFRESH ==================
    const refresh = async () => {
        setLoading(true);
        setError("");

        try {
            await refreshDeliveryData(user);

            setAgent(getDeliveryAgent(user));
            setTasks(getDeliveryTasks(user));

            toast.success("Tasks refreshed.");
        } catch (failure) {
            setError(failure.message);
            toast.error(failure.message);
        } finally {
            setLoading(false);
        }
    };

    // ================== STATISTICS ==================
    const stats = [
        {
            title: "Active Tasks",
            value: tasks.length,
            note: "Assigned to your account",
            icon: "fa-clipboard-list",
            color: "blue",
        },
        {
            title: "Pickup Pending",
            value: tasks.filter((task) =>
                ["ready_for_pickup", "assigned"].includes(
                    task.stage
                )
            ).length,
            note: "Parcels to collect",
            icon: "fa-box-open",
            color: "orange",
        },
        {
            title: "In Delivery",
            value: tasks.filter((task) =>
                ["picked_up", "out_for_delivery"].includes(
                    task.stage
                )
            ).length,
            note: "Parcels in your custody",
            icon: "fa-truck-fast",
            color: "green",
        },
        {
            title: "Failed Tasks",
            value: tasks.filter(
                (task) => task.stage === "failed"
            ).length,
            note: "Need retry or escalation",
            icon: "fa-triangle-exclamation",
            color: "red",
        },
    ];

    // ================== FILTERED TASKS ==================
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const matchesSearch = [
                task.id,
                task.orderId,
                task.parcelId,
                task.seller,
                task.customerName,
                task.product,
                ...(task.items || []).flatMap((item) => [
                    item.name,
                    item.variantLabel,
                    item.sku,
                ]),
            ].some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(query)
            );

            return (
                matchesSearch &&
                (status === "All" || task.stage === status) &&
                (type === "All" || task.taskType === type)
            );
        });
    }, [tasks, search, status, type]);

    const pages = Math.max(
        1,
        Math.ceil(filtered.length / rowsPerPage)
    );

    const currentPage = Math.min(
        page,
        pages - 1
    );

    const visible = filtered.slice(
        currentPage * rowsPerPage,
        (currentPage + 1) * rowsPerPage
    );

    const selected = tasks.find(
        (task) => task.id === selectedId
    );

    const route = selected
        ? routeOf(selected)
        : null;

    const resetFilters = () => {
        setSearch("");
        setStatus("All");
        setType("All");
        setPage(0);
    };

    return (
        <main className="delivery-tasks">
            {/* ================== PAGE HEADER ================== */}
            <header className="dta-hero">
                <div className="dta-hero-content">
                    <h1>
                        <i className="fa-solid fa-clipboard-list" />
                        ASSIGNED TASKS
                    </h1>

                    <p>
                        Manage your assigned pickups, customer
                        deliveries and replacement parcels in one
                        place.
                    </p>
                </div>

                <Button
                    className="dta-refresh"
                    variant="outlined"
                    onClick={refresh}
                    disabled={loading}
                    startIcon={
                        <i className="fa-solid fa-arrows-rotate" />
                    }
                >
                    Refresh
                </Button>
            </header>

            {/* ================== ERRORS ================== */}
            {error && (
                <Alert severity="error" className="dta-alert">
                    {error}
                </Alert>
            )}

            {!loading && !error && !agent && (
                <Alert severity="warning" className="dta-alert">
                    Your login is not linked to a delivery
                    agent record. Contact Admin.
                </Alert>
            )}

            {/* ================== SUMMARY CARDS ================== */}
            <section className="dta-stats">
                {stats.map((item) => (
                    <article
                        key={item.title}
                        className={`dta-stat is-${item.color}`}
                    >
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

            {/* ================== TASK TABLE ================== */}
            <section className="dta-card">
                <div className="dta-card-heading">
                    <span className="dta-heading-icon">
                        <i className="fa-solid fa-route" />
                    </span>

                    <div>
                        <h2>My Assigned Parcels</h2>
                        <p>
                            Active deliveries and pickups assigned
                            to you.
                        </p>
                    </div>

                    <span className="dta-record-count">
                        {filtered.length} Tasks
                    </span>
                </div>

                {/* ================== FILTERS ================== */}
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
                        size="small"
                        className="dta-filter"
                        label="Task Type"
                        value={type}
                        onChange={(event) => {
                            setType(event.target.value);
                            setPage(0);
                        }}
                    >
                        {types.map((value) => (
                            <MenuItem key={value} value={value}>
                                {value === "All"
                                    ? "All Task Types"
                                    : value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        className="dta-filter"
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

                {/* ================== DESKTOP ================== */}
                <TableContainer className="dta-table-scroll">
                    <Table className="dta-table">
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
                                const path = routeOf(task);

                                return (
                                    <TableRow key={task.id} hover>
                                        <TableCell>
                                            <div className="dta-cell">
                                                <strong className="dta-task-code">
                                                    {task.id}
                                                </strong>

                                                <small>{task.parcelId}</small>

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
                                                <i className={`fa-solid ${
                                                    icons[task.taskType] ||
                                                    "fa-box"
                                                }`} />
                                                {task.taskType}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <div className="dta-cell dta-location">
                                                <strong>{path.from}</strong>
                                                <small>
                                                    <i className="fa-solid fa-location-dot" />
                                                    {path.fromPin}
                                                </small>
                                            </div>
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
                                            <span className="dta-product">
                                                {summaryText(task)}
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
                                            <i className="fa-solid fa-box-open" />
                                            <h3>
                                                {loading
                                                    ? "Loading assigned tasks..."
                                                    : "No assigned tasks found"}
                                            </h3>
                                            <p>
                                                {tasks.length
                                                    ? "Try changing your filters."
                                                    : "Tasks will appear after assignment."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ================== MOBILE ================== */}
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
                            <h3>No assigned tasks found</h3>
                        </div>
                    )}
                </div>

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

            {/* ================== TASK DIALOG ================== */}
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
                        <i className="fa-solid fa-clipboard-list" />
                        Task Details
                    </span>

                    <button
                        type="button"
                        className="dta-close"
                        aria-label="Close details"
                        onClick={() => setSelectedId(null)}
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

                                <StatusBadge stage={selected.stage} />
                            </div>

                            <OrderedItems task={selected} />

                            <div className="dta-detail-section">
                                <h3>
                                    <i className="fa-solid fa-route" />
                                    Pickup & Destination
                                </h3>

                                <dl className="dta-details-grid">
                                    <Detail
                                        label="Pickup From"
                                        value={route.from}
                                    />
                                    <Detail
                                        label="Pickup Pincode"
                                        value={route.fromPin}
                                    />
                                    <Detail
                                        label="Pickup Address"
                                        value={addressText(
                                            route.fromAddress,
                                            route.fromPin
                                        )}
                                    />
                                    <Detail
                                        label="Deliver To"
                                        value={route.to}
                                    />
                                    <Detail
                                        label="Destination Pincode"
                                        value={route.toPin}
                                    />
                                    <Detail
                                        label="Delivery Address"
                                        value={addressText(
                                            route.toAddress,
                                            route.toPin
                                        )}
                                    />
                                </dl>
                            </div>

                            <div className="dta-detail-section">
                                <h3>
                                    <i className="fa-solid fa-box" />
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
                                        label="Total Units"
                                        value={selected.totalQuantity || 0}
                                    />
                                    <Detail
                                        label="Customer Contact"
                                        value={selected.customerPhone}
                                    />
                                    <Detail
                                        label="Parcel Custody"
                                        value={selected.custody}
                                    />
                                    <Detail
                                        label="Assigned At"
                                        value={formatDeliveryDate(
                                            selected.assignedAt
                                        )}
                                    />
                                </dl>
                            </div>
                        </div>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setSelectedId(null)}>
                        Close
                    </Button>

                    <Button
                        variant="contained"
                        disabled={!selected}
                        onClick={() => {
                            navigate(
                                `/manage/tasks/${encodeURIComponent(
                                    selected.id
                                )}`
                            );

                            setSelectedId(null);
                        }}
                    >
                        Open Task Workflow
                    </Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}

export default AssignedTasks;
