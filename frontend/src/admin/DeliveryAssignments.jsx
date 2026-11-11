import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Button,
    Checkbox,
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

// ================== DELIVERY CONFIGURATION ==================
const stageLabels = {
    ready_for_pickup: "Ready for Pickup",
    assigned: "Assigned",
    picked_up: "Picked Up",
    out_for_delivery: "Out for Delivery",
    failed: "Delivery Failed",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

// ================== HELPERS ==================
const canCover = (agent, task) =>
    agent.status === "Active" &&
    agent.availability === "Available" &&
    agent.activeTasks < agent.capacity &&
    agent.pincodes.includes(task.pickupPincode) &&
    agent.pincodes.includes(task.deliveryPincode);

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
          })
        : "—";

const assignable = (task) =>
    ["ready_for_pickup", "assigned", "picked_up", "out_for_delivery", "failed"].includes(
        task?.stage
    );

function StageBadge({ stage }) {
    const color =
        {
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
    const [recoveryNote, setRecoveryNote] = useState("");
    const navigate = useNavigate();

    const [state, setState] = useState({
        tasks: [],
        agents: [],
    });

    const { tasks, agents } = state;

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

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
        ? agents.filter(
              (agent) => agent.id !== assignmentTask.agentId && canCover(agent, assignmentTask)
          )
        : [];

    // ================== DATABASE DATA ==================
    const loadState = async () => {
        const [parcels, profiles] = await Promise.all([
            api.get("/delivery/admin/assignments"),
            api.get("/delivery/admin/agents"),
        ]);

        setState({
            tasks: parcels.data.tasks || [],
            agents: profiles.data.agents || [],
        });
    };

    useEffect(() => {
        loadState()
            .catch((error) => toast.error(error.message))
            .finally(() => setLoading(false));
    }, []);

    const recoverOtp = async () => {
        const reason = recoveryNote.trim();
        if (!reason || reason.trim().length < 5) return;
        try {
            await api.post(`/delivery/admin/assignments/${selectedTask.id}/recover-otp`, {
                reason,
            });
            await loadState();
            toast.success("Fresh code issued to its owner. Previous code invalidated.");
        } catch (error) {
            toast.error(error.message);
        }
    };

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
            value: tasks.filter((task) => task.stage === "ready_for_pickup" && !task.agentId)
                .length,
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
    const filtered = sortNewestFirst(
        tasks.filter((task) => {
            const query = search.trim().toLowerCase();

            const values = [
                task.id,
                task.parcelId,
                task.orderId,
                task.seller,
                task.product,
                task.pickupPincode,
                task.deliveryPincode,
                agentById(task.agentId)?.name,
            ];

            return (
                values.some((value) =>
                    String(value || "")
                        .toLowerCase()
                        .includes(query)
                ) &&
                (statusFilter === "All" || task.stage === statusFilter) &&
                (agentFilter === "All" ||
                    (agentFilter === "Unassigned" ? !task.agentId : task.agentId === agentFilter))
            );
        })
    );

    const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));

    const visible = filtered.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);

    const hasFilters = search.trim() || statusFilter !== "All" || agentFilter !== "All";

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setAgentFilter("All");
        setPage(0);
    };

    // ================== REFRESH / AUTO ASSIGN ==================
    const refresh = async () => {
        setBusy(true);

        try {
            await api.post("/delivery/admin/assignments/auto");

            await loadState();

            setPage(0);
            toast.info("Assignment queue refreshed.");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };

    // ================== MANUAL ASSIGNMENT ==================
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

    const handleAssign = async () => {
        if (!assignmentTask || !assignable(assignmentTask)) {
            setError("This parcel is not assignable.");
            return;
        }

        if (!eligibleAgents.some((agent) => agent.id === newAgentId)) {
            setError("Choose an available agent covering both pincodes with free capacity.");
            return;
        }

        if (requiresCustody && !custodyConfirmed) {
            setError("Confirm physical return to seller custody before reassignment.");
            return;
        }

        setBusy(true);

        try {
            await api.patch(`/delivery/admin/assignments/${assignmentId}`, {
                agentId: newAgentId,
                custodyConfirmed,
            });

            await loadState();

            toast.success(assignmentTask.agentId ? "Agent reassigned." : "Agent assigned.");

            closeAssignment();
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="manage-delivery-assignments">
            {/* ================== PAGE HEADER ================== */}
            <section className="dda-hero">
                <div>
                    <span className="zs-eyebrow">
                        <i className="fa-solid fa-truck-fast" />
                        DELIVERY ASSIGNMENTS
                    </span>

                    <p>
                        Automatic parcel allocation, delivery coverage, workload and safe agent
                        overrides.
                    </p>
                </div>

                <Button
                    className="dda-refresh"
                    variant="outlined"
                    onClick={refresh}
                    disabled={busy}
                    startIcon={<i className="fa-solid fa-arrows-rotate" />}
                >
                    Refresh
                </Button>
            </section>

            {/* ================== SUMMARY ================== */}
            <section className="dda-stats">
                {stats.map((item) => (
                    <article key={item.label} className={`dda-stat is-${item.color}`}>
                        <div className="dda-stat-heading">
                            <span>{item.label}</span>

                            <i className={`fa-solid ${item.icon}`} />
                        </div>

                        <strong>{item.value}</strong>
                        <p>{item.detail}</p>
                    </article>
                ))}
            </section>

            {!loading && !agents.length && (
                <Alert
                    severity="warning"
                    action={
                        <Button onClick={() => navigate("/manage/delivery-agents")}>
                            Manage Agents
                        </Button>
                    }
                >
                    No registered agents. Create an account in Delivery Agent Management before
                    assigning parcels.
                </Alert>
            )}

            {/* ================== PARCEL LIST ================== */}
            <section className="dda-card">
                <div className="dda-card-heading">
                    <div className="dda-title-row">
                        <span className="dda-title-icon">
                            <i className="fa-solid fa-route" />
                        </span>

                        <div>
                            <h2>Parcel Assignments</h2>

                            <p>
                                One task per parcel. Agent must cover pickup and delivery pincodes.
                            </p>
                        </div>
                    </div>

                    <span className="dda-records">{filtered.length} Records</span>
                </div>

                {/* ================== SEARCH AND FILTERS ================== */}
                <div className="dda-toolbar">
                    <TextField
                        size="small"
                        fullWidth
                        className="dda-search"
                        label="Search Assignments"
                        value={search}
                        placeholder="Order, parcel, seller, agent or pincode"
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
                        className="dda-filter"
                        label="Task Status"
                        value={statusFilter}
                        onChange={(event) => {
                            setStatusFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Statuses</MenuItem>

                        {Object.entries(stageLabels).map(([key, value]) => (
                            <MenuItem key={key} value={key}>
                                {value}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        size="small"
                        className="dda-filter"
                        label="Delivery Agent"
                        value={agentFilter}
                        onChange={(event) => {
                            setAgentFilter(event.target.value);
                            setPage(0);
                        }}
                    >
                        <MenuItem value="All">All Agents</MenuItem>

                        <MenuItem value="Unassigned">Unassigned</MenuItem>

                        {agents.map((agent) => (
                            <MenuItem value={agent.id} key={agent.id}>
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
                                {[
                                    "Parcel / Order",
                                    "Seller / Item",
                                    "Pickup → Delivery",
                                    "Assigned Agent",
                                    "Status",
                                    "Custody",
                                ].map((heading) => (
                                    <TableCell key={heading}>{heading}</TableCell>
                                ))}

                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {visible.map((task) => {
                                const agent = agentById(task.agentId);

                                return (
                                    <TableRow key={task.id} hover>
                                        <TableCell>
                                            <div className="dda-cell">
                                                <strong className="dda-code">
                                                    {task.parcelId}
                                                </strong>

                                                <small>{task.orderId}</small>
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
                                                <span>{task.pickupPincode}</span>

                                                <i className="fa-solid fa-arrow-right-long" />

                                                <span>{task.deliveryPincode}</span>
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
                                                            .map((x) => x[0])
                                                            .join("")}
                                                    </span>

                                                    <div>
                                                        <strong>{agent.name}</strong>

                                                        <small>{agent.id}</small>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="dda-unassigned">Not Assigned</span>
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

                                                {assignable(task) && (
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

                                            <h3>
                                                {loading
                                                    ? "Loading Assignments"
                                                    : "No Assignments Found"}
                                            </h3>

                                            <p>
                                                {hasFilters
                                                    ? "Try clearing your filters."
                                                    : "Ready for Pickup parcels will appear here."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ================== PAGINATION ================== */}
                <TablePagination
                    className="dda-pagination"
                    component="div"
                    count={filtered.length}
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

            {/* ================== TASK DETAILS ================== */}
            <Dialog
                open={Boolean(selectedTask)}
                onClose={() => setSelectedId(null)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: { className: "dda-dialog" },
                }}
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

                                <Detail
                                    label="Delivery Pincode"
                                    value={selectedTask.deliveryPincode}
                                />

                                <Detail
                                    label="Assigned Agent"
                                    value={agentById(selectedTask.agentId)?.name || "Not Assigned"}
                                />

                                <Detail
                                    label="Assignment Method"
                                    value={selectedTask.assignmentMode || "Not Assigned"}
                                />

                                <Detail label="Parcel Custody" value={selectedTask.custody} />

                                <Detail
                                    label="Created On"
                                    value={formatDate(selectedTask.createdAt)}
                                />
                            </dl>

                            {selectedTask.failureReason && (
                                <Alert severity="warning">
                                    Delivery failed: {selectedTask.failureReason}. Attempts:{" "}
                                    {selectedTask.attempts}.
                                </Alert>
                            )}

                            {selectedTask.events?.length > 0 && (
                                <div className="dda-history">
                                    <h3>Assignment History</h3>

                                    {selectedTask.events.map((event, index) => (
                                        <p key={index}>
                                            <i className="fa-regular fa-clock" />{" "}
                                            {formatDate(event.date)}
                                            {" — "}
                                            {event.note}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {selectedTask.stage === "ready_for_pickup" && !selectedTask.agentId && (
                                <Alert severity="info">
                                    An available agent must cover both pincodes and have free
                                    capacity.
                                </Alert>
                            )}
                        </DialogContent>

                        <DialogActions>
                            {["assigned", "out_for_delivery"].includes(selectedTask.stage) && (
                                <>
                                    <TextField
                                        size="small"
                                        label="OTP recovery reason"
                                        value={recoveryNote}
                                        onChange={(e) => setRecoveryNote(e.target.value)}
                                        slotProps={{ htmlInput: { maxLength: 200 } }}
                                    />
                                    <Button
                                        disabled={recoveryNote.trim().length < 5}
                                        onClick={recoverOtp}
                                    >
                                        Recover OTP
                                    </Button>
                                </>
                            )}

                            <Button onClick={() => setSelectedId(null)}>Close</Button>

                            {assignable(selectedTask) && (
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

            {/* ================== ADMIN ASSIGN / OVERRIDE ================== */}
            <Dialog
                open={Boolean(assignmentTask)}
                onClose={closeAssignment}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: { className: "dda-dialog" },
                }}
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
                                    Pickup {assignmentTask.pickupPincode}
                                    {" → "}
                                    Delivery {assignmentTask.deliveryPincode}
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
                                        {agent.name}
                                        {" — "}
                                        {agent.activeTasks}/{agent.capacity}
                                        {" tasks"}
                                    </MenuItem>
                                ))}
                            </TextField>

                            {!eligibleAgents.length && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    No eligible agent. Check status, availability, both pincodes and
                                    capacity in Delivery Agents.
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
                                        I confirm the parcel has been physically returned to the
                                        seller before reassignment.
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
                                disabled={busy || !eligibleAgents.length || !newAgentId}
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
