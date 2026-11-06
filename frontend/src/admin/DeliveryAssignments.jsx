
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
    InputAdornment, MenuItem, Table, TableBody, TableCell, TableContainer,
    TableHead, TablePagination, TableRow, TextField,
} from "@mui/material";
import { toast } from "react-toastify";

// ================== DELIVERY CONFIGURATION ==================
const TASK_KEY = "zupito_admin_delivery_assignments";
const AGENT_KEY = "zupito_admin_delivery_agents";
const ORDER_KEY = "zupito_admin_orders";

const previewTasks = [
    { id: "DT1001", orderId: "DEMO-2001", parcelId: "PKG-D2001", product: "Wireless Headphones", seller: "TechNova Electronics", pickupPincode: "751001", deliveryPincode: "751007" },
    { id: "DT1002", orderId: "DEMO-2002", parcelId: "PKG-D2002", product: "Everyday Smartphone", seller: "TechNova Electronics", pickupPincode: "751001", deliveryPincode: "751007" },
    { id: "DT1003", orderId: "DEMO-2003", parcelId: "PKG-D2003", product: "Men's Casual Shirt", seller: "Urban Fashion", pickupPincode: "751024", deliveryPincode: "751013" },
    { id: "DT1004", orderId: "DEMO-2004", parcelId: "PKG-D2004", product: "Travel Backpack", seller: "TravelMate Store", pickupPincode: "751024", deliveryPincode: "751013" },
    { id: "DT1005", orderId: "DEMO-2005", parcelId: "PKG-D2005", product: "Women's Everyday Dress", seller: "Urban Fashion", pickupPincode: "751024", deliveryPincode: "751013" },
    { id: "DT1006", orderId: "DEMO-2006", parcelId: "PKG-D2006", product: "Everyday Laptop", seller: "TechNova Electronics", pickupPincode: "751016", deliveryPincode: "751021" },
    { id: "DT1007", orderId: "DEMO-2007", parcelId: "PKG-D2007", product: "Daily Essentials", seller: "Fresh Basket", pickupPincode: "751001", deliveryPincode: "751020" },
    { id: "DT1008", orderId: "DEMO-2008", parcelId: "PKG-D2008", product: "Kitchen Storage Set", seller: "HomeCraft Living", pickupPincode: "751010", deliveryPincode: "751006" },
    { id: "DT1009", orderId: "DEMO-2009", parcelId: "PKG-D2009", product: "Travel Accessories", seller: "TravelMate Store", pickupPincode: "751017", deliveryPincode: "751020" },
    { id: "DT1010", orderId: "DEMO-2010", parcelId: "PKG-D2010", product: "Personal Care Kit", seller: "GlowCare Store", pickupPincode: "751003", deliveryPincode: "751002" },
    { id: "DT1011", orderId: "DEMO-2011", parcelId: "PKG-D2011", product: "Wireless Mouse", seller: "TechNova Electronics", pickupPincode: "751001", deliveryPincode: "751007", stage: "picked_up", agentId: "ZA1002", custody: "Agent", assignmentMode: "Auto" },
    { id: "DT1012", orderId: "DEMO-2012", parcelId: "PKG-D2012", product: "Fashion Watch", seller: "Urban Fashion", pickupPincode: "751024", deliveryPincode: "751013", stage: "failed", agentId: "ZA1001", custody: "Agent", assignmentMode: "Auto", failureReason: "Customer unavailable", attempts: 2 },
].map((task) => ({
    ...task,
    source: "Demo",
    stage: task.stage || "ready_for_pickup",
    agentId: task.agentId || null,
    custody: task.custody || "Seller",
    assignmentMode: task.assignmentMode || null,
    attempts: task.attempts || 0,
    events: [],
    createdAt: "2026-11-05T10:00:00+05:30",
}));

const stageLabels = {
    ready_for_pickup: "Ready for Pickup",
    assigned: "Assigned",
    picked_up: "Picked Up",
    out_for_delivery: "Out for Delivery",
    failed: "Delivery Failed",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

// ================== DATA HELPERS ==================
function readList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

function normalizeStatus(value) {
    return String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
}

function addReadyOrderTasks(tasks, orders) {
    const existing = new Set(tasks.map((task) => task.parcelId));
    const added = [...tasks];

    for (const order of orders || []) {
        if (!Array.isArray(order.parcels)) continue;

        for (const parcel of order.parcels) {
            const parcelId = String(parcel.id || parcel._id || "");

            if (!parcelId || existing.has(parcelId)) continue;
            if (normalizeStatus(parcel.status) !== "ready_for_pickup") continue;

            added.push({
                id: `TASK-${parcelId}`,
                orderId: order.id || order._id,
                parcelId,
                product: (parcel.itemIndexes || [])
                    .map((index) => order.items?.[index]?.name)
                    .filter(Boolean)
                    .join(", ") || "Order Parcel",
                seller: parcel.sellerName || "Seller Fulfilment",
                pickupPincode: parcel.pickupPincode || order.pickupPincode || "",
                deliveryPincode: order.address?.pincode || "",
                stage: "ready_for_pickup",
                agentId: null,
                custody: "Seller",
                assignmentMode: null,
                attempts: 0,
                events: [],
                source: "Order",
                createdAt: order.createdAt || new Date().toISOString(),
            });

            existing.add(parcelId);
        }
    }

    return added;
}

function canCover(agent, task) {
    const pins = Array.isArray(agent.pincodes) ? agent.pincodes : [];

    return agent.status === "Active" &&
        agent.availability === "Available" &&
        Number(agent.activeTasks) < Number(agent.capacity) &&
        Boolean(task.pickupPincode && task.deliveryPincode) &&
        pins.includes(task.pickupPincode) &&
        pins.includes(task.deliveryPincode);
}

function assignReadyTasks(tasks, agents) {
    const nextAgents = agents.map((agent) => ({ ...agent }));
    let assignedCount = 0;

    const nextTasks = tasks.map((task) => {
        if (task.stage !== "ready_for_pickup" || task.agentId) return task;

        const candidate = nextAgents
            .filter((agent) => canCover(agent, task))
            .sort((a, b) =>
                Number(a.activeTasks) - Number(b.activeTasks) ||
                a.id.localeCompare(b.id)
            )[0];

        if (!candidate) return task;

        candidate.activeTasks = Number(candidate.activeTasks) + 1;
        assignedCount++;

        const now = new Date().toISOString();

        return {
            ...task,
            agentId: candidate.id,
            stage: "assigned",
            assignmentMode: "Auto",
            assignedAt: now,
            events: [
                ...(task.events || []),
                {
                    date: now,
                    note: `Automatically assigned to ${candidate.name}.`,
                },
            ],
        };
    });

    return { tasks: nextTasks, agents: nextAgents, assignedCount };
}

function loadState() {
    const tasks = readList(TASK_KEY) || previewTasks;
    const agents = readList(AGENT_KEY) || [];
    const orders = readList(ORDER_KEY) || [];

    return assignReadyTasks(addReadyOrderTasks(tasks, orders), agents);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
          });
}

function StageBadge({ stage }) {
    const color = {
        ready_for_pickup: "warning",
        assigned: "blue",
        picked_up: "blue",
        out_for_delivery: "blue",
        failed: "danger",
        delivered: "success",
        cancelled: "neutral",
    }[stage] || "neutral";

    return (
        <span className={`dda-badge is-${color}`}>
            <i className="fa-solid fa-circle" />
            {stageLabels[stage] || stage}
        </span>
    );
}

function Detail({ label, value }) {
    return (
        <div className="dda-detail">
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
        </div>
    );
}

// ================== DELIVERY ASSIGNMENTS ==================
function DeliveryAssignments() {
    const navigate = useNavigate();
    const [state, setState] = useState(loadState);
    const { tasks, agents } = state;

    // ================== FILTERS ==================
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [agentFilter, setAgentFilter] = useState("All");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // ================== DETAILS AND ACTIONS ==================
    const [selectedId, setSelectedId] = useState(null);
    const [assignmentId, setAssignmentId] = useState(null);
    const [newAgentId, setNewAgentId] = useState("");
    const [custodyConfirmed, setCustodyConfirmed] = useState(false);
    const [error, setError] = useState("");

    const selectedTask = tasks.find((task) => task.id === selectedId);
    const assignmentTask = tasks.find((task) => task.id === assignmentId);

    const agentById = (id) => agents.find((agent) => agent.id === id);
    const requiresCustody = assignmentTask?.custody === "Agent";

    const eligibleAgents = assignmentTask
        ? agents.filter((agent) =>
              agent.id !== assignmentTask.agentId && canCover(agent, assignmentTask)
          )
        : [];

    // ================== SAVE PREVIEW CHANGES ==================
    useEffect(() => {
        try {
            localStorage.setItem(TASK_KEY, JSON.stringify(tasks));

            if (agents.length) {
                localStorage.setItem(AGENT_KEY, JSON.stringify(agents));
            }
        } catch {
            // Keep React state available if storage fails.
        }
    }, [tasks, agents]);

    // ================== STATISTICS ==================
    const stats = [
        {
            label: "Total Tasks",
            value: tasks.length,
            icon: "fa-boxes-stacked",
            color: "blue",
            detail: "Parcel-level delivery tasks",
        },
        {
            label: "Auto Assigned",
            value: tasks.filter((task) => task.assignmentMode === "Auto").length,
            icon: "fa-wand-magic-sparkles",
            color: "green",
            detail: "Matched by coverage and workload",
        },
        {
            label: "Awaiting Agent",
            value: tasks.filter((task) =>
                task.stage === "ready_for_pickup" && !task.agentId
            ).length,
            icon: "fa-user-clock",
            color: "orange",
            detail: "No eligible agent available",
        },
        {
            label: "Failed Deliveries",
            value: tasks.filter((task) => task.stage === "failed").length,
            icon: "fa-triangle-exclamation",
            color: "red",
            detail: "Requires follow-up or retry",
        },
    ];

    // ================== TABLE FILTERS ==================
    const filtered = tasks.filter((task) => {
        const query = search.trim().toLowerCase();
        const agentName = agentById(task.agentId)?.name || "";

        const matchesSearch = [
            task.id,
            task.orderId,
            task.parcelId,
            task.product,
            task.seller,
            task.pickupPincode,
            task.deliveryPincode,
            agentName,
        ].some((value) => String(value || "").toLowerCase().includes(query));

        return matchesSearch &&
            (statusFilter === "All" || task.stage === statusFilter) &&
            (agentFilter === "All" ||
                (agentFilter === "Unassigned"
                    ? !task.agentId
                    : task.agentId === agentFilter));
    });

    const visible = filtered.slice(
        page * rowsPerPage,
        (page + 1) * rowsPerPage
    );

    const hasFilters = search.trim() ||
        statusFilter !== "All" ||
        agentFilter !== "All";

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setAgentFilter("All");
        setPage(0);
    };

    // ================== REFRESH / AUTO-ASSIGN ==================
    const handleRefresh = () => {
        const next = loadState();

        setState(next);
        setPage(0);

        toast.info(
            next.assignedCount
                ? `${next.assignedCount} ready parcel(s) automatically assigned.`
                : "Assignments and agent availability refreshed."
        );
    };

    // ================== ADMIN OVERRIDE ==================
    const openAssignment = (task) => {
        setSelectedId(null);
        setAssignmentId(task.id);
        setNewAgentId("");
        setCustodyConfirmed(false);
        setError("");
    };

    const closeAssignment = () => {
        setAssignmentId(null);
        setNewAgentId("");
        setCustodyConfirmed(false);
        setError("");
    };

    const handleAssign = () => {
        if (
            !assignmentTask ||
            !["ready_for_pickup", "assigned", "picked_up", "out_for_delivery", "failed"]
                .includes(assignmentTask.stage)
        ) {
            setError("This parcel is not eligible for assignment.");
            return;
        }

        const nextAgent = eligibleAgents.find((agent) => agent.id === newAgentId);

        if (!nextAgent) {
            setError("Choose an available agent with matching pickup and delivery pincodes.");
            return;
        }

        if (requiresCustody && !custodyConfirmed) {
            setError("Confirm physical parcel custody before changing the assigned agent.");
            return;
        }

        const now = new Date().toISOString();
        const oldAgentId = assignmentTask.agentId;

        setState((previous) => ({
            ...previous,
            agents: previous.agents.map((agent) => {
                if (agent.id === nextAgent.id) {
                    return { ...agent, activeTasks: Number(agent.activeTasks) + 1 };
                }

                if (oldAgentId && agent.id === oldAgentId) {
                    return {
                        ...agent,
                        activeTasks: Math.max(0, Number(agent.activeTasks) - 1),
                    };
                }

                return agent;
            }),
            tasks: previous.tasks.map((task) =>
                task.id === assignmentId
                    ? {
                          ...task,
                          agentId: nextAgent.id,
                          stage: "assigned",
                          custody: requiresCustody ? "Hub" : task.custody,
                          assignmentMode: oldAgentId ? "Override" : "Manual",
                          assignedAt: now,
                          events: [
                              ...(task.events || []),
                              {
                                  date: now,
                                  note: `${oldAgentId ? "Reassigned" : "Assigned"} to ${nextAgent.name}${requiresCustody ? " after custody confirmation" : ""}.`,
                              },
                          ],
                      }
                    : task
            ),
        }));

        toast.success(
            oldAgentId
                ? "Agent reassigned successfully."
                : "Agent assigned successfully."
        );

        closeAssignment();
    };

    return (
        <div className="manage-delivery-assignments">
            {/* ================== PAGE HEADER ================== */}
            <section className="dda-hero">
                <div>
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-truck-fast" aria-hidden="true" />
                        DELIVERY ASSIGNMENTS
                    </span>

                    <p>
                        Automatic parcel allocation, delivery coverage,
                        workload and safe agent overrides.
                    </p>
                </div>

                <Button
                    className="dda-refresh"
                    variant="outlined"
                    onClick={handleRefresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== SUMMARY ================== */}
            <section className="dda-stats">
                {stats.map((stat) => (
                    <article className={`dda-stat is-${stat.color}`} key={stat.label}>
                        <div className="dda-stat-heading">
                            <span>{stat.label}</span>
                            <i className={`fa-solid ${stat.icon}`} />
                        </div>

                        <strong>{stat.value}</strong>
                        <p>{stat.detail}</p>
                    </article>
                ))}
            </section>

            {!agents.length && (
                <Alert
                    severity="warning"
                    action={
                        <Button onClick={() => navigate("/manage/delivery-agents")}>
                            Manage Agents
                        </Button>
                    }
                >
                    No delivery agents found. Add or initialize agents
                    before automatic assignment can run.
                </Alert>
            )}

            {/* ================== PARCEL ASSIGNMENTS ================== */}
            <section className="dda-card">
                <div className="dda-card-heading">
                    <div className="dda-title-row">
                        <span className="dda-title-icon">
                            <i className="fa-solid fa-route" />
                        </span>

                        <div>
                            <h2>Parcel Assignments</h2>
                            <p>
                                One task per parcel. Agents must cover
                                both pickup and delivery pincodes.
                            </p>
                        </div>
                    </div>

                    <span className="dda-records">{filtered.length} Records</span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="dda-toolbar">
                    <TextField
                        className="dda-search"
                        size="small"
                        fullWidth
                        label="Search Assignments"
                        placeholder="Order, parcel, seller, agent or pincode"
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
                        label="Task Status"
                        className="dda-filter"
                        size="small"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Statuses</MenuItem>

                        {Object.entries(stageLabels).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Delivery Agent"
                        className="dda-filter"
                        size="small"
                        value={agentFilter}
                        onChange={(event) => {
                            setAgentFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Agents</MenuItem>
                        <MenuItem value="Unassigned">Unassigned</MenuItem>

                        {agents.map((agent) => (
                            <MenuItem key={agent.id} value={agent.id}>
                                {agent.name}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Button
                        className="dda-reset"
                        variant="outlined"
                        disabled={!hasFilters}
                        onClick={resetFilters}
                        startIcon={<i className="fa-solid fa-rotate-left" />}
                    >
                        Reset
                    </Button>
                </div>

                {/* ================== TABLE ================== */}
                <TableContainer className="dda-table-scroll">
                    <Table className="dda-table" aria-label="Delivery assignments">
                        <TableHead>
                            <TableRow>
                                <TableCell>Parcel / Order</TableCell>
                                <TableCell>Seller / Item</TableCell>
                                <TableCell>Pickup → Delivery</TableCell>
                                <TableCell>Assigned Agent</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Custody</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((task) => {
                                const agent = agentById(task.agentId);
                                const editable = [
                                    "ready_for_pickup",
                                    "assigned",
                                    "picked_up",
                                    "out_for_delivery",
                                    "failed",
                                ].includes(task.stage);

                                return (
                                    <TableRow key={task.id} hover>
                                        <TableCell>
                                            <div className="dda-cell">
                                                <strong className="dda-code">{task.parcelId}</strong>
                                                <small>{task.orderId}</small>
                                                {task.source === "Demo" && <small>Demo task</small>}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="dda-cell">
                                                <strong>{task.seller}</strong>
                                                <small>{task.product}</small>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="dda-route">
                                                <span>{task.pickupPincode || "Not provided"}</span>
                                                <i className="fa-solid fa-arrow-right-long" />
                                                <span>{task.deliveryPincode || "Not provided"}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {agent ? (
                                                <div className="dda-agent">
                                                    <span>
                                                        {agent.name
                                                            .trim()
                                                            .split(/\s+/)
                                                            .slice(0, 2)
                                                            .map((part) => part[0])
                                                            .join("")}
                                                    </span>

                                                    <div>
                                                        <strong>{agent.name}</strong>
                                                        <small>{agent.id}</small>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="dda-unassigned">
                                                    Not Assigned
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <StageBadge stage={task.stage} />
                                        </TableCell>

                                        <TableCell>
                                            <span className="dda-custody">{task.custody}</span>
                                        </TableCell>

                                        <TableCell align="right">
                                            <div className="dda-actions">
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => setSelectedId(task.id)}
                                                >
                                                    Details
                                                </Button>

                                                {editable && (
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => openAssignment(task)}
                                                    >
                                                        {task.agentId ? "Reassign" : "Assign"}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!visible.length && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <div className="dda-empty">
                                            <i className="fa-solid fa-box-open" />
                                            <h3>No Assignments Found</h3>
                                            <p>Try clearing your search and filters.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    className="dda-pagination"
                    component="div"
                    count={filtered.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                    onPageChange={(_, value) => setPage(value)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(Number(event.target.value));
                        setPage(0);
                    }}
                />
            </section>

            {/* ================== PARCEL DETAILS ================== */}
            <Dialog
                open={Boolean(selectedTask)}
                onClose={() => setSelectedId(null)}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { className: "dda-dialog" } }}
            >
                {selectedTask && (
                    <>
                        <DialogTitle>Assignment Details</DialogTitle>

                        <DialogContent dividers>
                            <div className="dda-detail-banner">
                                <div>
                                    <strong>{selectedTask.parcelId}</strong>
                                    <p>{selectedTask.orderId}</p>
                                </div>

                                <StageBadge stage={selectedTask.stage} />
                            </div>

                            <dl className="dda-detail-grid">
                                <Detail label="Seller" value={selectedTask.seller} />
                                <Detail label="Product" value={selectedTask.product} />
                                <Detail label="Pickup Pincode" value={selectedTask.pickupPincode} />
                                <Detail label="Delivery Pincode" value={selectedTask.deliveryPincode} />
                                <Detail label="Assigned Agent" value={agentById(selectedTask.agentId)?.name || "Not Assigned"} />
                                <Detail label="Assignment Method" value={selectedTask.assignmentMode || "Not Assigned"} />
                                <Detail label="Parcel Custody" value={selectedTask.custody} />
                                <Detail label="Created On" value={formatDate(selectedTask.createdAt)} />
                            </dl>

                            {selectedTask.failureReason && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    Delivery attempt failed: {selectedTask.failureReason}.
                                    Attempts: {selectedTask.attempts}.
                                </Alert>
                            )}

                            {(selectedTask.events || []).length > 0 && (
                                <div className="dda-history">
                                    <h3>Assignment History</h3>

                                    {selectedTask.events.map((event, index) => (
                                        <p key={index}>
                                            <i className="fa-regular fa-clock" />
                                            {formatDate(event.date)} — {event.note}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {selectedTask.stage === "ready_for_pickup" && !selectedTask.agentId && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    Auto-assignment requires an active, available
                                    agent with remaining capacity and matching
                                    pickup and delivery pincodes.
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions>
                            <Button onClick={() => setSelectedId(null)}>Close</Button>

                            {["ready_for_pickup", "assigned", "picked_up", "out_for_delivery", "failed"].includes(selectedTask.stage) && (
                                <Button
                                    variant="contained"
                                    onClick={() => openAssignment(selectedTask)}
                                >
                                    {selectedTask.agentId ? "Reassign Agent" : "Assign Agent"}
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ================== MANUAL ASSIGNMENT / OVERRIDE ================== */}
            <Dialog
                open={Boolean(assignmentTask)}
                onClose={closeAssignment}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { className: "dda-dialog" } }}
            >
                {assignmentTask && (
                    <>
                        <DialogTitle>
                            {assignmentTask.agentId
                                ? "Reassign Delivery Agent"
                                : "Assign Delivery Agent"}
                        </DialogTitle>

                        <DialogContent dividers>
                            <div className="dda-assignment-intro">
                                <strong>{assignmentTask.parcelId}</strong>
                                <p>
                                    Pickup {assignmentTask.pickupPincode || "Unknown"}
                                    {" → "}
                                    Delivery {assignmentTask.deliveryPincode || "Unknown"}
                                </p>
                            </div>

                            <TextField
                                select
                                fullWidth
                                label="Eligible Delivery Agent"
                                value={newAgentId}
                                onChange={(event) => {
                                    setNewAgentId(event.target.value);
                                    setError("");
                                }}
                                sx={{ mt: 2 }}
                            >
                                <MenuItem value="">Select an Agent</MenuItem>

                                {eligibleAgents.map((agent) => (
                                    <MenuItem key={agent.id} value={agent.id}>
                                        {agent.name} — {agent.activeTasks}/{agent.capacity} tasks
                                    </MenuItem>
                                ))}
                            </TextField>

                            {!eligibleAgents.length && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    No alternative eligible agent. Check the
                                    pickup/delivery pincode coverage,
                                    availability and capacity in Delivery Agents.
                                </Alert>
                            )}

                            {requiresCustody && (
                                <div className="dda-custody-confirm">
                                    <Checkbox
                                        checked={custodyConfirmed}
                                        onChange={(event) => {
                                            setCustodyConfirmed(event.target.checked);
                                            setError("");
                                        }}
                                    />

                                    <span>
                                        I confirm the parcel has been physically
                                        returned to hub custody before reassignment.
                                    </span>
                                </div>
                            )}

                            {error && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {error}
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions>
                            <Button onClick={closeAssignment}>Cancel</Button>

                            <Button
                                variant="contained"
                                disabled={!eligibleAgents.length}
                                onClick={handleAssign}
                            >
                                Confirm Assignment
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </div>
    );
}

export default DeliveryAssignments;
