
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
    Alert,
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    TextField,
} from "@mui/material";

import { toast } from "react-toastify";

import {
    deliveryStageLabel,
    formatDeliveryDate,
    getDeliveryTask,
    updateDeliveryTask,
} from "../services/deliveryService";

// ================== CONFIGURATION ==================
const failureReasons = [
    "Customer unavailable",
    "Incorrect address",
    "Customer requested reschedule",
    "Pickup location unavailable",
    "Vehicle issue",
    "Other",
];

const steps = [
    {
        stage: "assigned",
        label: "Assigned",
        icon: "fa-clipboard-check",
    },
    {
        stage: "picked_up",
        label: "Picked Up",
        icon: "fa-box",
    },
    {
        stage: "out_for_delivery",
        label: "In Transit",
        icon: "fa-truck-fast",
    },
    {
        stage: "delivered",
        label: "Completed",
        icon: "fa-circle-check",
    },
];

// ================== DISPLAY HELPERS ==================
function formatAddress(address, pincode) {
    if (
        typeof address === "string" &&
        address.trim()
    ) {
        return address;
    }

    const text = [
        address?.house,
        address?.street,
        address?.area,
        address?.locality,
        address?.city,
        address?.state,
        address?.pincode || pincode,
    ].filter(Boolean).join(", ");

    return text ||
        (
            pincode
                ? `Pincode: ${pincode}`
                : "Address not available"
        );
}

function statusTone(stage) {
    if (stage === "delivered") return "success";
    if (stage === "failed") return "danger";
    if (stage === "out_for_delivery") return "purple";
    if (stage === "picked_up") return "blue";

    return "warning";
}

function Info({ label, value, icon }) {
    return (
        <div className="dtd-info">
            <i
                className={`fa-solid ${icon}`}
                aria-hidden="true"
            />

            <div>
                <span>{label}</span>
                <strong>{value || "—"}</strong>
            </div>
        </div>
    );
}

// ================== TASK DETAILS ==================
function TaskDetails({ user }) {
    const { taskId } = useParams();

    const [task, setTask] = useState(() =>
        getDeliveryTask(user, taskId)
    );

    const [confirmed, setConfirmed] = useState(false);
    const [otp, setOtp] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [showFailure, setShowFailure] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // ================== DATA REFRESH ==================
    const refresh = () => {
        setTask(getDeliveryTask(user, taskId));
    };

    useEffect(() => {
        const sync = () => {
            setTask(getDeliveryTask(user, taskId));
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
        user?.role,
        taskId,
    ]);

    // ================== TASK ACTIONS ==================
    const submit = (action) => {
        setError("");
        setBusy(true);

        try {
            const updated = updateDeliveryTask(
                user,
                taskId,
                action,
                {
                    confirmed,
                    otp,
                    reason,
                    note,
                }
            );

            setTask(getDeliveryTask(user, taskId));

            setConfirmed(false);
            setOtp("");
            setReason("");
            setNote("");
            setShowFailure(false);

            toast.success(
                action === "failed"
                    ? "Delivery failure recorded."
                    : action === "retry"
                        ? "Another attempt started."
                        : updated.stage === "delivered"
                            ? "Parcel handover completed."
                            : "Task status updated successfully."
            );
        } catch (failure) {
            setError(
                failure.message ||
                "Unable to update the task."
            );

            refresh();
        } finally {
            setBusy(false);
        }
    };

    // ================== ACCESS / EMPTY STATE ==================
    if (!task) {
        return (
            <main className="delivery-task-detail">
                <Link
                    className="dtd-back"
                    to="/manage/tasks"
                >
                    <i className="fa-solid fa-arrow-left" />
                    Assigned Tasks
                </Link>

                <section className="dtd-empty">
                    <i
                        className="fa-solid fa-shield-halved"
                        aria-hidden="true"
                    />

                    <h1>Task not available</h1>

                    <p>
                        This task is not assigned to your active
                        delivery account, or its record no longer
                        exists.
                    </p>

                    <Button
                        component={Link}
                        to="/manage/tasks"
                        variant="contained"
                    >
                        Back to Assigned Tasks
                    </Button>
                </section>
            </main>
        );
    }

    // ================== TASK DETAILS ==================
    const reverse = task.kind === "replacement_pickup";

    const replacementDelivery =
        task.kind === "replacement_delivery";

    const closed = [
        "delivered",
        "cancelled",
    ].includes(task.stage);

    const allowedFailure = [
        "assigned",
        "out_for_delivery",
    ].includes(task.stage);

    const canRetry =
        task.stage === "failed" &&
        Number(task.attempts || 0) < 3 &&
        !task.escalatedToAdmin;

    const origin = {
        title: reverse
            ? "Customer Pickup"
            : "Seller Pickup",

        name: reverse
            ? task.customerName
            : task.sellerName,

        pincode: task.pickupPincode,

        address: reverse
            ? task.customerAddress
            : task.pickupAddress,

        icon: reverse
            ? "fa-user"
            : "fa-store",
    };

    const destination = {
        title: reverse
            ? "Return to Seller"
            : "Deliver to Customer",

        name: reverse
            ? task.sellerName
            : task.customerName,

        pincode: task.deliveryPincode,

        address: reverse
            ? task.sellerAddress
            : task.customerAddress,

        icon: reverse
            ? "fa-store"
            : "fa-house",
    };

    const activeIndex = steps.findIndex((step) =>
        step.stage === task.stage
    );

    return (
        <main className="delivery-task-detail">
            {/* ================== HEADER ================== */}
            <Link
                className="dtd-back"
                to="/manage/tasks"
            >
                <i
                    className="fa-solid fa-arrow-left"
                    aria-hidden="true"
                />
                Assigned Tasks
            </Link>

            <header className="dtd-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-route"
                            aria-hidden="true"
                        />
                        TASK DETAILS
                    </h1>

                    <p>
                        Track parcel custody, confirm handover
                        and record delivery attempts.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    onClick={refresh}
                    startIcon={
                        <i className="fa-solid fa-arrows-rotate" />
                    }
                >
                    Refresh
                </Button>
            </header>

            {/* ================== TASK SUMMARY ================== */}
            <section className="dtd-summary">
                <div className="dtd-summary-main">
                    <span className="dtd-summary-icon">
                        <i
                            className={`fa-solid ${
                                reverse
                                    ? "fa-arrow-rotate-left"
                                    : replacementDelivery
                                        ? "fa-box-open"
                                        : "fa-truck-fast"
                            }`}
                        />
                    </span>

                    <div>
                        <span className="dtd-kicker">
                            {task.taskType}
                        </span>

                        <h2>{task.id}</h2>

                        <p>
                            Parcel: {task.parcelId || "—"}
                        </p>
                    </div>
                </div>

                <span
                    className={`dtd-badge is-${
                        statusTone(task.stage)
                    }`}
                >
                    <i className="fa-solid fa-circle" />
                    {deliveryStageLabel(task.stage)}
                </span>
            </section>

            {/* ================== DELIVERY PROGRESS ================== */}
            <section className="dtd-card">
                <div className="dtd-card-title">
                    <i
                        className="fa-solid fa-list-check"
                        aria-hidden="true"
                    />

                    <h3>Delivery Progress</h3>
                </div>

                <div className="dtd-steps">
                    {steps.map((step, index) => (
                        <div
                            key={step.stage}
                            className={`dtd-step ${
                                activeIndex >= index
                                    ? "is-done"
                                    : ""
                            }`}
                        >
                            <span>
                                <i
                                    className={`fa-solid ${step.icon}`}
                                    aria-hidden="true"
                                />
                            </span>

                            <small>{step.label}</small>
                        </div>
                    ))}
                </div>

                {task.stage === "failed" && (
                    <Alert severity="warning">
                        Attempt {task.attempts || 0} of 3 failed.

                        {task.escalatedToAdmin
                            ? " Escalated for Admin review."
                            : " You can retry after reviewing the reason."}
                    </Alert>
                )}
            </section>

            <div className="dtd-columns">
                <div className="dtd-primary">
                    {/* ================== PICKUP AND DESTINATION ================== */}
                    <section className="dtd-card">
                        <div className="dtd-card-title">
                            <i
                                className="fa-solid fa-location-dot"
                                aria-hidden="true"
                            />

                            <h3>Pickup & Destination</h3>
                        </div>

                        <div className="dtd-route">
                            {[origin, destination].map((point, index) => (
                                <div
                                    className="dtd-place"
                                    key={point.title}
                                >
                                    <span
                                        className={`dtd-place-icon ${
                                            index ? "is-end" : ""
                                        }`}
                                    >
                                        <i
                                            className={`fa-solid ${point.icon}`}
                                            aria-hidden="true"
                                        />
                                    </span>

                                    <div>
                                        <small>{point.title}</small>

                                        <strong>
                                            {point.name ||
                                                "Location unavailable"}
                                        </strong>

                                        <p>
                                            {formatAddress(
                                                point.address,
                                                point.pincode
                                            )}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ================== PARCEL INFORMATION ================== */}
                    <section className="dtd-card">
                        <div className="dtd-card-title">
                            <i
                                className="fa-solid fa-box"
                                aria-hidden="true"
                            />

                            <h3>Parcel Information</h3>
                        </div>

                        <div className="dtd-info-grid">
                            <Info
                                icon="fa-hashtag"
                                label="Order ID"
                                value={task.orderId}
                            />

                            <Info
                                icon="fa-box-open"
                                label="Product"
                                value={
                                    task.product ||
                                    "Order Parcel"
                                }
                            />

                            <Info
                                icon="fa-phone"
                                label="Customer Phone"
                                value={task.customerPhone}
                            />

                            <Info
                                icon="fa-hand-holding"
                                label="Current Custody"
                                value={task.custody}
                            />

                            <Info
                                icon="fa-calendar"
                                label="Assigned On"
                                value={formatDeliveryDate(
                                    task.assignedAt ||
                                    task.createdAt
                                )}
                            />

                            <Info
                                icon="fa-rotate"
                                label="Failed Attempts"
                                value={String(
                                    task.attempts || 0
                                )}
                            />
                        </div>
                    </section>

                    {/* ================== ACTIVITY HISTORY ================== */}
                    <section className="dtd-card">
                        <div className="dtd-card-title">
                            <i
                                className="fa-solid fa-clock-rotate-left"
                                aria-hidden="true"
                            />

                            <h3>Activity History</h3>
                        </div>

                        <div className="dtd-activity">
                            {[...(task.events || [])]
                                .reverse()
                                .map((event, index) => (
                                    <div
                                        className="dtd-event"
                                        key={`${event.date}-${index}`}
                                    >
                                        <span className="dtd-event-dot" />

                                        <div>
                                            <strong>
                                                {event.note}
                                            </strong>

                                            <small>
                                                {formatDeliveryDate(
                                                    event.date
                                                )}
                                            </small>
                                        </div>
                                    </div>
                                ))}

                            {!task.events?.length && (
                                <p className="dtd-muted">
                                    No activity recorded yet.
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                {/* ================== DELIVERY ACTIONS ================== */}
                <aside className="dtd-card dtd-actions">
                    <div className="dtd-card-title">
                        <i
                            className="fa-solid fa-bolt"
                            aria-hidden="true"
                        />

                        <h3>Next Action</h3>
                    </div>

                    {error && (
                        <Alert
                            severity="error"
                            onClose={() => setError("")}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* ================== CONFIRM PICKUP ================== */}
                    {task.stage === "assigned" && (
                        <div className="dtd-action-form">
                            <p>
                                Collect the parcel from the pickup
                                location before updating custody.
                            </p>

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={confirmed}
                                        onChange={(event) =>
                                            setConfirmed(
                                                event.target.checked
                                            )
                                        }
                                    />
                                }
                                label={
                                    reverse
                                        ? "I collected the original item from the customer"
                                        : "I received the parcel from the seller"
                                }
                            />

                            <Button
                                variant="contained"
                                disabled={busy || !confirmed}
                                onClick={() => submit("pickup")}
                                startIcon={
                                    <i className="fa-solid fa-box" />
                                }
                            >
                                Confirm Pickup
                            </Button>
                        </div>
                    )}

                    {/* ================== START DELIVERY ================== */}
                    {task.stage === "picked_up" && (
                        <div className="dtd-action-form">
                            <p>
                                Parcel custody is with you. Start
                                the route when leaving for the
                                destination.
                            </p>

                            <Button
                                variant="contained"
                                disabled={busy}
                                onClick={() =>
                                    submit("start_delivery")
                                }
                                startIcon={
                                    <i className="fa-solid fa-truck-fast" />
                                }
                            >
                                {reverse
                                    ? "Start Return to Seller"
                                    : "Out for Delivery"}
                            </Button>
                        </div>
                    )}

                    {/* ================== COMPLETE DELIVERY ================== */}
                    {task.stage === "out_for_delivery" && (
                        <div className="dtd-action-form">
                            {reverse ? (
                                <>
                                    <p>
                                        Hand the returned item to the
                                        seller. Confirm only after
                                        physical receipt.
                                    </p>

                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={confirmed}
                                                onChange={(event) =>
                                                    setConfirmed(
                                                        event.target.checked
                                                    )
                                                }
                                            />
                                        }
                                        label="Seller has physically received the returned item"
                                    />

                                    <Button
                                        variant="contained"
                                        disabled={busy || !confirmed}
                                        onClick={() =>
                                            submit("deliver")
                                        }
                                        startIcon={
                                            <i className="fa-solid fa-circle-check" />
                                        }
                                    >
                                        Confirm Seller Handover
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Ask the customer for the OTP
                                        shown in their order details.
                                        Never request it before
                                        reaching the doorstep.
                                    </p>

                                    <TextField
                                        fullWidth
                                        label="Customer Delivery OTP"
                                        value={otp}
                                        onChange={(event) =>
                                            setOtp(
                                                event.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 6)
                                            )
                                        }
                                        slotProps={{
                                            htmlInput: {
                                                inputMode: "numeric",
                                                maxLength: 6,
                                                autoComplete: "one-time-code",
                                            },
                                        }}
                                        disabled={
                                            busy ||
                                            task.otpLocked
                                        }
                                    />

                                    <small>
                                        {Math.max(
                                            0,
                                            5 - Number(
                                                task.otpAttempts || 0
                                            )
                                        )} OTP attempt(s) remaining
                                    </small>

                                    <Button
                                        variant="contained"
                                        disabled={
                                            busy ||
                                            otp.length !== 6 ||
                                            task.otpLocked
                                        }
                                        onClick={() =>
                                            submit("deliver")
                                        }
                                        startIcon={
                                            <i className="fa-solid fa-shield-halved" />
                                        }
                                    >
                                        Verify OTP & Deliver
                                    </Button>

                                    {(
                                        !task.hasLinkedOrder &&
                                        !task.hasLinkedReplacement
                                    ) && (
                                        <Alert severity="warning">
                                            This preview task has no
                                            linked customer order.
                                            OTP completion is unavailable
                                            until order data is connected.
                                        </Alert>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ================== FAILED TASK RETRY ================== */}
                    {task.stage === "failed" && (
                        <div className="dtd-action-form">
                            <Alert
                                severity={
                                    canRetry
                                        ? "warning"
                                        : "error"
                                }
                            >
                                {task.failureReason ||
                                    "Delivery failed"}

                                {task.failureNote
                                    ? `: ${task.failureNote}`
                                    : ""}
                            </Alert>

                            {canRetry ? (
                                <Button
                                    variant="contained"
                                    disabled={busy}
                                    onClick={() =>
                                        submit("retry")
                                    }
                                    startIcon={
                                        <i className="fa-solid fa-arrow-rotate-right" />
                                    }
                                >
                                    Retry Task
                                </Button>
                            ) : (
                                <p>
                                    Retry limit reached. Admin must
                                    review the assignment and
                                    parcel custody.
                                </p>
                            )}
                        </div>
                    )}

                    {/* ================== CLOSED TASK ================== */}
                    {closed && (
                        <div className="dtd-action-form">
                            <Alert severity="success">
                                This task is closed. No further
                                agent actions are available.
                            </Alert>

                            <Button
                                component={Link}
                                to="/manage/history"
                                variant="outlined"
                            >
                                Delivery History
                            </Button>
                        </div>
                    )}

                    {task.stage === "ready_for_pickup" && (
                        <Alert severity="info">
                            Await Admin assignment confirmation
                            before pickup.
                        </Alert>
                    )}

                    {/* ================== REPORT FAILED ATTEMPT ================== */}
                    {allowedFailure && !showFailure && (
                        <Button
                            className="dtd-failure-toggle"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                                setShowFailure(true)
                            }
                            startIcon={
                                <i className="fa-solid fa-triangle-exclamation" />
                            }
                        >
                            Report Failed Attempt
                        </Button>
                    )}

                    {allowedFailure && showFailure && (
                        <div className="dtd-failure-form">
                            <h4>Record Failed Attempt</h4>

                            <TextField
                                select
                                fullWidth
                                label="Failure Reason"
                                value={reason}
                                onChange={(event) =>
                                    setReason(
                                        event.target.value
                                    )
                                }
                            >
                                {failureReasons.map((value) => (
                                    <MenuItem
                                        key={value}
                                        value={value}
                                    >
                                        {value}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                label="Additional Notes"
                                value={note}
                                onChange={(event) =>
                                    setNote(
                                        event.target.value.slice(
                                            0,
                                            200
                                        )
                                    )
                                }
                            />

                            <div className="dtd-form-buttons">
                                <Button
                                    variant="outlined"
                                    onClick={() =>
                                        setShowFailure(false)
                                    }
                                >
                                    Cancel
                                </Button>

                                <Button
                                    color="error"
                                    variant="contained"
                                    disabled={busy || !reason}
                                    onClick={() =>
                                        submit("failed")
                                    }
                                >
                                    Save Failure
                                </Button>
                            </div>
                        </div>
                    )}

                    <p className="dtd-demo-note">
                        <i
                            className="fa-solid fa-circle-info"
                            aria-hidden="true"
                        />

                        Preview workflow. Real OTP validation,
                        authorization and retry automation must
                        run on the backend.
                    </p>
                </aside>
            </div>
        </main>
    );
}

export default TaskDetails;
