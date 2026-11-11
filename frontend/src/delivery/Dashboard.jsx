import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "@mui/material";
import { toast } from "react-toastify";

import {
    deliveryStageLabel,
    formatDeliveryDate,
    getDeliveryAgent,
    getDeliveryTasks,
    refreshDeliveryData,
    setDeliveryAvailability,
} from "../services/deliveryService";

// ================== CONFIGURATION ==================
const PERIODS = [7, 30];

const STATUS_GROUPS = [
    { key: "pickup", label: "Awaiting Pickup", color: "#f59e0b" },
    { key: "transit", label: "In Transit", color: "#2563eb" },
    { key: "failed", label: "Delivery Failed", color: "#ef4444" },
    { key: "delivered", label: "Completed", color: "#16a34a" },
    { key: "cancelled", label: "Cancelled", color: "#94a3b8" },
];

// ================== DATA HELPERS ==================
function readDashboard(user) {
    return {
        agent: getDeliveryAgent(user),
        tasks: getDeliveryTasks(user, true),
        refreshedAt: new Date(),
    };
}

function count(value) {
    return Number(value || 0).toLocaleString("en-IN");
}

function getGroup(stage) {
    if (["ready_for_pickup", "assigned"].includes(stage)) {
        return "pickup";
    }

    if (["picked_up", "out_for_delivery"].includes(stage)) {
        return "transit";
    }

    if (stage === "failed") return "failed";
    if (stage === "delivered") return "delivered";
    if (stage === "cancelled") return "cancelled";

    return "pickup";
}

function completedDate(task) {
    if (task.stage !== "delivered") return null;

    const value = task.deliveredAt || task.eventTimestamps?.deliveredAt;

    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime()) ? date : null;
}

function activityDate(task) {
    const events = Array.isArray(task.events) ? task.events : [];

    const value =
        task.updatedAt ||
        task.deliveredAt ||
        task.lastFailedAt ||
        events.at(-1)?.date ||
        task.assignedAt ||
        task.createdAt;

    const date = value ? new Date(value) : null;

    return date && !Number.isNaN(date.getTime()) ? date : null;
}

function isWithin(date, days, now) {
    if (!date) return false;

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);

    return date >= start && date <= now;
}

function buildTrend(tasks, days, now) {
    const buckets = days === 7 ? 7 : 6;
    const span = days / buckets;
    const start = new Date(now);

    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);

    return Array.from({ length: buckets }, (_, index) => {
        const from = new Date(start);
        from.setDate(from.getDate() + index * span);

        const to = new Date(from);
        to.setDate(to.getDate() + span);

        return {
            label: from.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
            }),
            value: tasks.filter((task) => {
                const date = completedDate(task);

                return date && date >= from && date < to && date <= now;
            }).length,
        };
    });
}

function getAvailability(agent) {
    if (!agent) return "Not Linked";

    if (agent.status !== "Active") {
        return agent.status || "Inactive";
    }

    if (agent.availability === "Unavailable") {
        return "Unavailable";
    }

    if (
        Number(agent.capacity || 0) > 0 &&
        Number(agent.activeTasks || 0) >= Number(agent.capacity)
    ) {
        return "At Capacity";
    }

    return "Available";
}

function getRoute(task) {
    const reverse = task.taskType === "Return Pickup";

    return {
        from: reverse ? task.customerName : task.sellerName,
        to: reverse ? task.sellerName : task.customerName,
        fromPin: reverse ? task.deliveryPincode : task.pickupPincode,
        toPin: reverse ? task.pickupPincode : task.deliveryPincode,
    };
}

// ================== REUSABLE COMPONENTS ==================
function Icon({ name }) {
    return <i className={`fa-solid ${name}`} aria-hidden="true" />;
}

function Heading({ icon, title, subtitle, action }) {
    return (
        <div className="zd-heading">
            <div className="zd-heading-text">
                <h2>
                    <Icon name={icon} /> {title}
                </h2>
                <p>{subtitle}</p>
            </div>
            {action}
        </div>
    );
}

function TaskBadge({ stage }) {
    return (
        <span className={`dd-badge is-${getGroup(stage)}`}>
            <Icon name="fa-circle" />
            {deliveryStageLabel(stage)}
        </span>
    );
}

// ================== DELIVERY PERFORMANCE CHART ==================
function CompletionChart({ points }) {
    const width = 650;
    const bottom = 154;
    const top = 18;

    const max = Math.max(...points.map((point) => point.value), 0);

    const ceiling = Math.max(1, max);
    const slot = 560 / Math.max(1, points.length);

    return (
        <div className="dd-chart-wrap">
            {!max && <p className="dd-chart-empty">No dated completions in this period.</p>}

            <svg
                viewBox={`0 0 ${width} 194`}
                role="img"
                aria-label="Completed deliveries by reporting period"
            >
                {[0, 0.5, 1].map((tick) => {
                    const y = bottom - tick * (bottom - top);

                    return (
                        <g key={tick}>
                            <line x1="58" x2="628" y1={y} y2={y} className="dd-grid-line" />
                            <text x="45" y={y + 4} textAnchor="end" className="dd-axis">
                                {count(Math.round(ceiling * tick))}
                            </text>
                        </g>
                    );
                })}

                {points.map((point, index) => {
                    const x = 68 + index * slot + slot / 2;

                    const barHeight = (point.value / ceiling) * (bottom - top);

                    return (
                        <g key={`${point.label}-${index}`}>
                            <rect
                                x={x - 15}
                                y={bottom - barHeight}
                                width="30"
                                height={barHeight}
                                rx="6"
                                className="dd-bar"
                            >
                                <title>{`${point.label}: ${point.value} completed`}</title>
                            </rect>

                            <text x={x} y="178" textAnchor="middle" className="dd-axis">
                                {point.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ================== TASK DISTRIBUTION CHART ==================
function DistributionChart({ groups, total }) {
    return (
        <div className="dd-distribution">
            <div className="dd-donut">
                <svg
                    viewBox="0 0 200 200"
                    role="img"
                    aria-label="Assigned task status distribution"
                >
                    <circle cx="100" cy="100" r="70" className="dd-donut-track" />

                    {groups.map((group, index) => {
                        const percent = total ? (group.value / total) * 100 : 0;

                        const currentOffset = total
                            ? (groups.slice(0, index).reduce((sum, entry) => sum + entry.value, 0) /
                                  total) *
                              100
                            : 0;

                        return (
                            percent > 0 && (
                                <circle
                                    key={group.key}
                                    cx="100"
                                    cy="100"
                                    r="70"
                                    pathLength="100"
                                    stroke={group.color}
                                    strokeDasharray={`${percent} ${100 - percent}`}
                                    strokeDashoffset={-currentOffset}
                                    className="dd-donut-segment"
                                />
                            )
                        );
                    })}
                </svg>

                <div className="dd-donut-center">
                    <strong>{count(total)}</strong>
                    <small>Assigned Tasks</small>
                </div>
            </div>

            <div className="dd-legend">
                {groups.map((group) => (
                    <div key={group.key}>
                        <span>
                            <i className={`dd-legend-dot is-${group.key}`} />
                            {group.label}
                        </span>
                        <strong>{count(group.value)}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ================== DELIVERY DASHBOARD ==================
function Dashboard({ user }) {
    const [data, setData] = useState(() => readDashboard(user));

    const [period, setPeriod] = useState(7);
    const [updating, setUpdating] = useState(false);

    // ================== DATA REFRESH ==================
    const refresh = async () => {
        try {
            await refreshDeliveryData(user);
            setData(readDashboard(user));
        } catch (error) {
            toast.error(error.message || "Unable to refresh delivery dashboard.");
        }
    };

    useEffect(() => {
        let active = true;

        const sync = () => {
            if (active) setData(readDashboard(user));
        };

        const load = async () => {
            try {
                await refreshDeliveryData(user);
                sync();
            } catch (error) {
                if (active) {
                    toast.error(error.message);
                }
            }
        };

        load();

        window.addEventListener("focus", load);
        window.addEventListener("zupito:delivery-updated", sync);

        return () => {
            active = false;

            window.removeEventListener("focus", load);
            window.removeEventListener("zupito:delivery-updated", sync);
        };
    }, [user]);

    // ================== AGENT AVAILABILITY ==================
    const changeAvailability = async (nextStatus) => {
        if (!["Available", "Unavailable"].includes(nextStatus)) {
            return;
        }

        setUpdating(true);

        try {
            const agent = getDeliveryAgent(user);

            if (!agent || agent.status !== "Active") {
                throw new Error("Your delivery agent account is not active.");
            }

            if (agent.availability === nextStatus) {
                return;
            }

            await setDeliveryAvailability(user, nextStatus);
            setData(readDashboard(user));

            toast.success(`You are now ${nextStatus.toLowerCase()}.`);
        } catch (error) {
            toast.error(error.message || "Unable to update availability.");
        } finally {
            setUpdating(false);
        }
    };

    // ================== DASHBOARD METRICS ==================
    const summary = useMemo(() => {
        const { tasks, refreshedAt } = data;

        const active = tasks.filter((task) => !["delivered", "cancelled"].includes(task.stage));

        const pickup = active.filter((task) => getGroup(task.stage) === "pickup");

        const transit = active.filter((task) => getGroup(task.stage) === "transit");

        const issues = active.filter((task) => task.stage === "failed");

        const completed = tasks.filter((task) => task.stage === "delivered");

        const completedInPeriod = completed.filter((task) =>
            isWithin(completedDate(task), period, refreshedAt)
        );

        const today = completed.filter((task) => isWithin(completedDate(task), 1, refreshedAt));

        const replacements = active.filter((task) =>
            ["Return Pickup", "Replacement Delivery"].includes(task.taskType)
        );

        const attempts = tasks.reduce(
            (total, task) => total + Math.max(0, Number(task.attempts || 0)),
            0
        );

        const groups = STATUS_GROUPS.map((group) => ({
            ...group,
            value: tasks.filter((task) => getGroup(task.stage) === group.key).length,
        }));

        const priorityOrder = {
            failed: 0,
            out_for_delivery: 1,
            picked_up: 2,
            assigned: 3,
            ready_for_pickup: 4,
        };

        const priority = [...active]
            .sort(
                (first, second) =>
                    (priorityOrder[first.stage] ?? 5) - (priorityOrder[second.stage] ?? 5) ||
                    (activityDate(second)?.getTime() || 0) - (activityDate(first)?.getTime() || 0)
            )
            .slice(0, 4);

        const recent = [...tasks]
            .sort(
                (first, second) =>
                    (activityDate(second)?.getTime() || 0) - (activityDate(first)?.getTime() || 0)
            )
            .slice(0, 5);

        return {
            active,
            pickup,
            transit,
            issues,
            completed,
            completedInPeriod,
            today,
            replacements,
            attempts,
            groups,
            priority,
            recent,
            trend: buildTrend(completed, period, refreshedAt),
        };
    }, [data, period]);

    // ================== AGENT INFORMATION ==================
    const agent = data.agent;
    const availability = getAvailability(agent);

    const workStatus = agent?.availability === "Unavailable" ? "Unavailable" : "Available";

    const canChangeStatus = Boolean(agent && agent.status === "Active");

    const firstName = String(agent?.name || user?.name || "Agent")
        .trim()
        .split(/\s+/)[0];

    const capacity = Number(agent?.capacity || 0);
    const allocated = Number(agent?.activeTasks || 0);

    const attention = summary.pickup.length + summary.transit.length + summary.issues.length;

    // ================== KPI CONFIGURATION ==================
    const cards = [
        [
            "Active Tasks",
            summary.active.length,
            "Tasks currently assigned",
            "fa-clipboard-list",
            "tasks",
        ],
        ["Pickup Pending", summary.pickup.length, "Ready for collection", "fa-box-open", "tasks"],
        ["In Transit", summary.transit.length, "Parcels in your custody", "fa-truck-fast", "tasks"],
        [
            "Completed",
            summary.completedInPeriod.length,
            `Last ${period} days`,
            "fa-circle-check",
            "history",
        ],
        [
            "Delivery Issues",
            summary.issues.length,
            "Currently failed tasks",
            "fa-triangle-exclamation",
            "tasks",
        ],
        ["Failed Attempts", summary.attempts, "All recorded attempts", "fa-rotate", "history"],
        [
            "Replacement Tasks",
            summary.replacements.length,
            "Active return and replacement",
            "fa-arrow-right-arrow-left",
            "tasks",
        ],
        [
            "Completed Today",
            summary.today.length,
            "Successful handovers today",
            "fa-calendar-check",
            "history",
        ],
    ];

    const modules = [
        ["Assigned Tasks", "fa-clipboard-list", summary.active.length, "tasks"],
        [
            "Delivery History",
            "fa-clock-rotate-left",
            data.tasks.filter(
                (task) =>
                    ["delivered", "cancelled", "failed"].includes(task.stage) ||
                    Number(task.attempts || 0) > 0
            ).length,
            "history",
        ],
        ["My Profile", "fa-user", agent?.id || "View", "profile"],
    ];

    return (
        <main className="zd-dashboard delivery-dashboard">
            {/* ================== PAGE HEADER ================== */}
            <header className="zd-topbar">
                <div>
                    <h1 className="zd-page-title">
                        <Icon name="fa-gauge-high" />
                        DASHBOARD
                    </h1>
                    <p>Your daily pickups, deliveries and task performance.</p>
                </div>

                <div className="zd-tools">
                    <label className="zd-period">
                        <Icon name="fa-calendar-days" />
                        <select
                            value={period}
                            onChange={(event) => setPeriod(Number(event.target.value))}
                            aria-label="Reporting period"
                        >
                            {PERIODS.map((days) => (
                                <option key={days} value={days}>
                                    Last {days} Days
                                </option>
                            ))}
                        </select>
                    </label>

                    <button type="button" className="zd-refresh" onClick={refresh}>
                        <Icon name="fa-arrows-rotate" />
                        Refresh
                    </button>
                </div>
            </header>

            {/* ================== WELCOME ================== */}
            <section className="zd-welcome">
                <div className="zd-welcome-copy">
                    <span className="zd-welcome-eyebrow">
                        <Icon name="fa-motorcycle" />
                        Delivery Partner Overview
                    </span>

                    <h2>
                        Welcome back, <span>{firstName}.</span>
                    </h2>

                    <p>
                        Stay on top of your assigned routes, manage deliveries and complete
                        handovers safely.
                    </p>

                    <Link to="/manage/tasks" className="zd-welcome-link">
                        Open Assigned Tasks
                        <Icon name="fa-arrow-right" />
                    </Link>
                </div>

                <div className="zd-welcome-stat">
                    <span>
                        <Icon name="fa-bell" />
                        Tasks Need Attention
                    </span>
                    <strong>{count(attention)}</strong>
                    <small>Active pickups, routes and delivery issues</small>
                </div>
            </section>

            {/* ================== ACCOUNT ALERTS ================== */}
            {!agent && (
                <Alert severity="warning" className="dd-alert">
                    Your login is not linked to an Admin delivery-agent record.
                </Alert>
            )}

            {agent && agent.status !== "Active" && (
                <Alert severity="error" className="dd-alert">
                    Your agent account is {agent.status}. Contact Admin for reactivation.
                </Alert>
            )}

            {/* ================== KPI CARDS ================== */}
            <section className="zd-cards" aria-label="Delivery dashboard statistics">
                {cards.map(([label, value, note, icon, path], index) => (
                    <Link key={label} to={`/manage/${path}`} className={`zd-kpi zd-kpi-${index}`}>
                        <div className="zd-kpi-head">
                            <span className="zd-kpi-label">{label}</span>
                            <span className="zd-kpi-icon">
                                <Icon name={icon} />
                            </span>
                        </div>
                        <strong>{count(value)}</strong>
                        <small>{note}</small>
                    </Link>
                ))}
            </section>

            {/* ================== PRIORITY / AVAILABILITY ================== */}
            <section className="dd-action-layout" id="dd-priority">
                <article className="zd-panel">
                    <Heading
                        icon="fa-list-check"
                        title="Priority Tasks"
                        subtitle="Your next pickups, routes and failed deliveries"
                        action={
                            <Link to="/manage/tasks" className="zd-view-all">
                                View All
                                <Icon name="fa-arrow-right" />
                            </Link>
                        }
                    />

                    <div className="dd-priority-list">
                        {summary.priority.map((task) => {
                            const route = getRoute(task);

                            return (
                                <Link
                                    key={task.id}
                                    to={`/manage/tasks/${encodeURIComponent(task.id)}`}
                                    className="dd-task-row"
                                >
                                    <span className="dd-task-icon">
                                        <Icon
                                            name={
                                                task.stage === "failed"
                                                    ? "fa-triangle-exclamation"
                                                    : "fa-box"
                                            }
                                        />
                                    </span>

                                    <div className="dd-task-info">
                                        <strong>
                                            {task.id}
                                            <span> · {task.taskType}</span>
                                        </strong>
                                        <small>
                                            {route.from || "Pickup"}
                                            {" → "}
                                            {route.to || "Destination"}
                                        </small>
                                        <span>{task.product || "Parcel"}</span>
                                    </div>

                                    <div className="dd-task-end">
                                        <TaskBadge stage={task.stage} />
                                        <Icon name="fa-chevron-right" />
                                    </div>
                                </Link>
                            );
                        })}

                        {!summary.priority.length && (
                            <p className="dd-empty">No active tasks assigned right now.</p>
                        )}
                    </div>
                </article>

                {/* ================== AGENT AVAILABILITY ================== */}
                <article className="zd-panel dd-agent-panel">
                    <Heading
                        icon="fa-user-check"
                        title="Agent Availability"
                        subtitle="Manage your shift and assignment capacity"
                    />

                    <div className="dd-agent-card">
                        <span className="dd-agent-avatar">
                            <Icon name="fa-motorcycle" />
                        </span>

                        <div>
                            <strong>{agent?.name || "Delivery Agent"}</strong>
                            <small>{agent?.id || "Account not linked"}</small>
                        </div>

                        <span
                            className={`dd-availability is-${availability
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`}
                        >
                            {availability}
                        </span>
                    </div>

                    {/* ================== SHIFT CONTROL ================== */}
                    <div className="dd-shift-control">
                        <div className="dd-shift-heading">
                            <div>
                                <strong>Work Availability</strong>
                                <small>Choose whether you can receive new tasks</small>
                            </div>

                            <span className={`dd-shift-indicator is-${workStatus.toLowerCase()}`}>
                                <Icon name="fa-circle" />
                                {agent ? workStatus : "Not Linked"}
                            </span>
                        </div>

                        <div
                            className="dd-shift-options"
                            role="group"
                            aria-label="Set delivery work availability"
                        >
                            <button
                                type="button"
                                className={`dd-shift-option is-available ${
                                    agent && workStatus === "Available" ? "is-selected" : ""
                                }`}
                                aria-pressed={Boolean(agent && workStatus === "Available")}
                                disabled={!canChangeStatus || updating}
                                onClick={() => changeAvailability("Available")}
                            >
                                <Icon name="fa-circle-check" />
                                Available
                            </button>

                            <button
                                type="button"
                                className={`dd-shift-option is-unavailable ${
                                    agent && workStatus === "Unavailable" ? "is-selected" : ""
                                }`}
                                aria-pressed={Boolean(agent && workStatus === "Unavailable")}
                                disabled={!canChangeStatus || updating}
                                onClick={() => changeAvailability("Unavailable")}
                            >
                                <Icon name="fa-circle-pause" />
                                Unavailable
                            </button>
                        </div>
                    </div>

                    {/* ================== AGENT CAPACITY ================== */}
                    <div className="dd-capacity-head">
                        <span>Assigned Capacity</span>
                        <strong>
                            {count(allocated)} / {count(capacity)}
                        </strong>
                    </div>

                    <progress
                        className="dd-capacity-bar"
                        value={Math.min(Math.max(0, allocated), Math.max(1, capacity))}
                        max={Math.max(1, capacity)}
                    />

                    <p className="dd-availability-note">
                        Your availability is saved to the agent record. Existing assigned tasks
                        remain your responsibility.
                    </p>
                </article>
            </section>

            {/* ================== PERFORMANCE CHARTS ================== */}
            <section className="zd-chart-layout dd-chart-layout">
                <article className="zd-panel">
                    <Heading
                        icon="fa-chart-column"
                        title="Delivery Performance"
                        subtitle={`Completed deliveries · Last ${period} days`}
                    />

                    <div className="dd-chart-total">
                        <strong>{count(summary.completedInPeriod.length)}</strong>
                        <span>Completed tasks with recorded delivery dates</span>
                    </div>

                    <CompletionChart points={summary.trend} />
                </article>

                <article className="zd-panel">
                    <Heading
                        icon="fa-chart-pie"
                        title="Task Distribution"
                        subtitle="All assigned tasks by current status"
                    />

                    <DistributionChart groups={summary.groups} total={data.tasks.length} />
                </article>
            </section>

            {/* ================== ACTIVITY / OVERVIEW ================== */}
            <section className="zd-lists dd-lists">
                <article className="zd-panel">
                    <Heading
                        icon="fa-clock-rotate-left"
                        title="Recent Task Activity"
                        subtitle="Latest changes across assigned deliveries"
                        action={
                            <Link to="/manage/history" className="zd-view-all">
                                History
                                <Icon name="fa-arrow-right" />
                            </Link>
                        }
                    />

                    <div className="dd-activity-list">
                        {summary.recent.map((task) => {
                            const closed = ["delivered", "cancelled"].includes(task.stage);

                            return (
                                <Link
                                    key={task.id}
                                    to={
                                        closed
                                            ? "/manage/history"
                                            : `/manage/tasks/${encodeURIComponent(task.id)}`
                                    }
                                    className="dd-activity-row"
                                >
                                    <span className="dd-activity-icon">
                                        <Icon name={closed ? "fa-circle-check" : "fa-truck-fast"} />
                                    </span>

                                    <div>
                                        <strong>
                                            {task.id}
                                            {" · "}
                                            {deliveryStageLabel(task.stage)}
                                        </strong>
                                        <small>{formatDeliveryDate(activityDate(task))}</small>
                                    </div>

                                    <Icon name="fa-chevron-right" />
                                </Link>
                            );
                        })}

                        {!summary.recent.length && (
                            <p className="dd-empty">No recorded delivery activity yet.</p>
                        )}
                    </div>
                </article>

                <article className="zd-panel">
                    <Heading
                        icon="fa-border-all"
                        title="Panel Overview"
                        subtitle="Quick access to your delivery workspace"
                    />

                    <div className="zd-action-list">
                        {modules.map(([label, icon, value, path]) => (
                            <Link key={label} to={`/manage/${path}`} className="zd-list-row">
                                <span className="zd-row-icon">
                                    <Icon name={icon} />
                                </span>
                                <span>{label}</span>
                                <strong>{typeof value === "number" ? count(value) : value}</strong>
                                <Icon name="fa-chevron-right" />
                            </Link>
                        ))}
                    </div>
                </article>
            </section>
        </main>
    );
}

export default Dashboard;
