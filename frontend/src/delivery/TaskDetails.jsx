
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    Alert,
    Avatar,
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

import {
    deliveryStageLabel,
    fetchDeliveryTask,
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
    "Customer refused delivery",
    "Other",
];

const steps = [
    ["assigned", "Assigned", "fa-clipboard-check"],
    ["picked_up", "Picked Up", "fa-box"],
    ["out_for_delivery", "In Transit", "fa-truck-fast"],
    ["delivered", "Completed", "fa-circle-check"],
];

// ================== HELPERS ==================
function addressText(address, pincode) {
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
            <i className={`fa-solid ${icon}`} />

            <div>
                <span>{label}</span>
                <strong>{value ?? "—"}</strong>
            </div>
        </div>
    );
}

// ================== ORDERED PRODUCTS ==================
function OrderedItems({ task }) {
    const items = task.items || [];

    return (
        <section className="dtd-card">
            <div className="dtd-card-title">
                <i className="fa-solid fa-bag-shopping" />
                <h3>
                    Ordered Items ({items.length})
                </h3>
            </div>

            <p>
                Total quantity:{" "}
                <strong>{task.totalQuantity || 0} units</strong>
            </p>

            <div className="dtd-info-grid">
                {items.map((item, index) => (
                    <div
                        className="dtd-info"
                        key={`${item.id}-${index}`}
                    >
                        {item.image ? (
                            <Avatar
                                variant="rounded"
                                src={item.image}
                                alt={item.name}
                            />
                        ) : (
                            <i className="fa-solid fa-box" />
                        )}

                        <div>
                            <strong>{item.name}</strong>

                            <span>
                                {item.variantLabel ||
                                    "Standard Variant"}
                            </span>

                            {item.brand && (
                                <span>
                                    Brand: {item.brand}
                                </span>
                            )}

                            {item.sku && (
                                <span>SKU: {item.sku}</span>
                            )}

                            <strong>
                                Quantity: {item.quantity}
                            </strong>
                        </div>
                    </div>
                ))}
            </div>

            {!items.length && (
                <p className="dtd-muted">
                    Order item snapshot unavailable.
                </p>
            )}
        </section>
    );
}

// ================== TASK DETAILS ==================
function TaskDetails({ user }) {
    const { taskId } = useParams();

    const [task, setTask] = useState(() =>
        getDeliveryTask(user, taskId)
    );

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const [confirmed, setConfirmed] = useState(false);
    const [otp, setOtp] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [showFailure, setShowFailure] = useState(false);

    // ================== INITIAL FETCH ==================
    useEffect(() => {
        let active = true;

        setTask(getDeliveryTask(user, taskId));
        setLoading(true);
        setError("");

        fetchDeliveryTask(user, taskId)
            .then((result) => {
                if (active) setTask(result);
            })
            .catch((failure) => {
                if (active) {
                    setError(failure.message);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [
        user?._id,
        user?.id,
        user?.role,
        taskId,
    ]);

    // ================== MANUAL REFRESH ==================
    const refresh = async () => {
        try {
            const result = await fetchDeliveryTask(
                user,
                taskId
            );

            setTask(result);
            setError("");
        } catch (failure) {
            setError(failure.message);
        }
    };

    // ================== ACTIONS ==================
    const submit = async (action) => {
        if (busy) return;

        setBusy(true);
        setError("");

        try {
            const updated = await updateDeliveryTask(
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

            setTask(updated);
            setConfirmed(false);
            setOtp("");
            setReason("");
            setNote("");
            setShowFailure(false);

            const messages = {
                pickup: "Pickup OTP verified. Parcel collected.",
                start_delivery: "Out for Delivery started.",
                regenerate_otp: "New delivery OTP generated.",
                deliver: "Parcel delivered successfully.",
                failed: "Failed delivery recorded.",
                retry: "Delivery retry started.",
            };

            toast.success(
                messages[action] || "Task updated."
            );
        } catch (failure) {
            // Wrong OTP attempts are persisted on the backend.
            await refresh();

            setError(
                failure.message ||
                "Unable to update this task."
            );
        } finally {
            setBusy(false);
        }
    };

    // ================== LOADING / NOT FOUND ==================
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
                    <i className="fa-solid fa-shield-halved" />

                    <h1>
                        {loading
                            ? "Loading task..."
                            : "Task not available"}
                    </h1>

                    <p>
                        {loading
                            ? "Loading your assigned parcel."
                            : error ||
                                "This task is not assigned to your account."}
                    </p>

                    {!loading && (
                        <Button
                            component={Link}
                            to="/manage/tasks"
                            variant="contained"
                        >
                            Back to Assigned Tasks
                        </Button>
                    )}
                </section>
            </main>
        );
    }

    // ================== TASK DETAILS ==================
    const reverse = task.kind === "replacement_pickup";

    const closed = [
        "delivered",
        "cancelled",
    ].includes(task.stage);

    const canFail = [
        "assigned",
        "out_for_delivery",
    ].includes(task.stage);

    const canRetry =
        task.stage === "failed" &&
        Number(task.attempts || 0) < 3 &&
        !task.escalatedToAdmin;

    const origin = {
        name: reverse
            ? task.customerName
            : task.sellerName,
        address: reverse
            ? task.customerAddress
            : task.pickupAddress,
        pincode: reverse
            ? task.deliveryPincode
            : task.pickupPincode,
        label: reverse
            ? "Customer Pickup"
            : "Seller Pickup",
        icon: reverse
            ? "fa-user"
            : "fa-store",
    };

    const destination = {
        name: reverse
            ? task.sellerName
            : task.customerName,
        address: reverse
            ? task.sellerAddress
            : task.customerAddress,
        pincode: reverse
            ? task.pickupPincode
            : task.deliveryPincode,
        label: reverse
            ? "Return to Seller"
            : "Deliver to Customer",
        icon: reverse
            ? "fa-store"
            : "fa-house",
    };

    const activeIndex = steps.findIndex(
        ([stage]) => stage === task.stage
    );

    return (
        <main className="delivery-task-detail">
            {/* ================== HEADER ================== */}
            <Link
                className="dtd-back"
                to="/manage/tasks"
            >
                <i className="fa-solid fa-arrow-left" />
                Assigned Tasks
            </Link>

            <header className="dtd-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-route" />
                        TASK DETAILS
                    </h1>

                    <p>
                        Review parcel items, confirm handovers
                        and track delivery activity.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    disabled={busy}
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
                        <i className="fa-solid fa-truck-fast" />
                    </span>

                    <div>
                        <span className="dtd-kicker">
                            {task.taskType}
                        </span>

                        <h2>{task.id}</h2>
                        <p>Parcel: {task.parcelId}</p>
                    </div>
                </div>

                <span className={`dtd-badge is-${
                    statusTone(task.stage)
                }`}>
                    <i className="fa-solid fa-circle" />
                    {deliveryStageLabel(task.stage)}
                </span>
            </section>

            {/* ================== DELIVERY PROGRESS ================== */}
            <section className="dtd-card">
                <div className="dtd-card-title">
                    <i className="fa-solid fa-list-check" />
                    <h3>Delivery Progress</h3>
                </div>

                <div className="dtd-steps">
                    {steps.map(([stage, label, icon], index) => (
                        <div
                            key={stage}
                            className={`dtd-step ${
                                activeIndex >= index
                                    ? "is-done"
                                    : ""
                            }`}
                        >
                            <span>
                                <i className={`fa-solid ${icon}`} />
                            </span>
                            <small>{label}</small>
                        </div>
                    ))}
                </div>

                {task.stage === "failed" && (
                    <Alert severity="warning">
                        Failed attempt {task.attempts || 0} of 3.
                        {task.escalatedToAdmin &&
                            " Admin review required."}
                    </Alert>
                )}
            </section>

            <div className="dtd-columns">
                <div className="dtd-primary">
                    {/* ================== ADDRESS ================== */}
                    <section className="dtd-card">
                        <div className="dtd-card-title">
                            <i className="fa-solid fa-location-dot" />
                            <h3>Pickup & Destination</h3>
                        </div>

                        <div className="dtd-route">
                            {[origin, destination].map(
                                (point, index) => (
                                    <div
                                        className="dtd-place"
                                        key={point.label}
                                    >
                                        <span className={`dtd-place-icon ${
                                            index ? "is-end" : ""
                                        }`}>
                                            <i className={`fa-solid ${
                                                point.icon
                                            }`} />
                                        </span>

                                        <div>
                                            <small>{point.label}</small>
                                            <strong>{point.name}</strong>
                                            <p>
                                                {addressText(
                                                    point.address,
                                                    point.pincode
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </section>

                    {/* ================== PRODUCTS ================== */}
                    <OrderedItems task={task} />

                    {/* ================== PARCEL INFORMATION ================== */}
                    <section className="dtd-card">
                        <div className="dtd-card-title">
                            <i className="fa-solid fa-box" />
                            <h3>Parcel Information</h3>
                        </div>

                        <div className="dtd-info-grid">
                            <Info
                                label="Order ID"
                                value={task.orderId}
                                icon="fa-hashtag"
                            />
                            <Info
                                label="Total Product Types"
                                value={task.productCount || 0}
                                icon="fa-bag-shopping"
                            />
                            <Info
                                label="Total Units"
                                value={task.totalQuantity || 0}
                                icon="fa-boxes-stacked"
                            />
                            <Info
                                label="Customer Phone"
                                value={task.customerPhone}
                                icon="fa-phone"
                            />
                            <Info
                                label="Current Custody"
                                value={task.custody}
                                icon="fa-hand-holding"
                            />
                            <Info
                                label="Assigned On"
                                value={formatDeliveryDate(
                                    task.assignedAt
                                )}
                                icon="fa-calendar"
                            />
                            <Info
                                label="Failed Attempts"
                                value={task.attempts || 0}
                                icon="fa-rotate"
                            />
                        </div>
                    </section>

                    {/* ================== ACTIVITY HISTORY ================== */}
                    <section className="dtd-card">
                        <div className="dtd-card-title">
                            <i className="fa-solid fa-clock-rotate-left" />
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
                                            <strong>{event.note}</strong>
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

                {/* ================== ACTIONS ================== */}
                <aside className="dtd-card dtd-actions">
                    <div className="dtd-card-title">
                        <i className="fa-solid fa-bolt" />
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

                    {/* ================== SELLER PICKUP OTP ================== */}
                    {task.stage === "assigned" && (
                        <div className="dtd-action-form">
                            <p>
                                Collect the parcel from the seller
                                and verify their Pickup OTP.
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
                                label="I physically received the parcel from the seller"
                            />

                            <TextField
                                fullWidth
                                label="Seller Pickup OTP"
                                value={otp}
                                disabled={busy || task.otpLocked}
                                onChange={(event) =>
                                    setOtp(
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6)
                                    )
                                }
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 6,
                                        inputMode: "numeric",
                                        autoComplete: "off",
                                    },
                                }}
                            />

                            <small>
                                {Math.max(
                                    0,
                                    5 - Number(task.otpAttempts || 0)
                                )} OTP attempts remaining
                            </small>

                            <Button
                                variant="contained"
                                disabled={
                                    busy ||
                                    !confirmed ||
                                    otp.length !== 6 ||
                                    task.otpLocked
                                }
                                onClick={() => submit("pickup")}
                            >
                                Verify OTP & Confirm Pickup
                            </Button>
                        </div>
                    )}

                    {/* ================== OUT FOR DELIVERY ================== */}
                    {task.stage === "picked_up" && (
                        <div className="dtd-action-form">
                            <p>
                                Parcel custody is with you.
                                Start delivery when leaving
                                for the destination.
                            </p>

                            <Button
                                variant="contained"
                                disabled={busy}
                                onClick={() =>
                                    submit("start_delivery")
                                }
                            >
                                Out for Delivery
                            </Button>
                        </div>
                    )}

                    {/* ================== CUSTOMER OTP ================== */}
                    {task.stage === "out_for_delivery" && (
                        <div className="dtd-action-form">
                            <p>
                                Ask the customer for their
                                delivery OTP at the doorstep.
                            </p>

                            <TextField
                                fullWidth
                                label="Customer Delivery OTP"
                                value={otp}
                                disabled={busy || task.otpLocked}
                                onChange={(event) =>
                                    setOtp(
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6)
                                    )
                                }
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 6,
                                        inputMode: "numeric",
                                        autoComplete: "one-time-code",
                                    },
                                }}
                            />

                            <small>
                                {Math.max(
                                    0,
                                    5 - Number(task.otpAttempts || 0)
                                )} OTP attempts remaining
                            </small>

                            <Button
                                variant="contained"
                                disabled={
                                    busy ||
                                    otp.length !== 6 ||
                                    task.otpLocked
                                }
                                onClick={() => submit("deliver")}
                            >
                                Verify OTP & Deliver
                            </Button>

                            <Button
                                variant="outlined"
                                disabled={busy}
                                onClick={() =>
                                    submit("regenerate_otp")
                                }
                            >
                                Regenerate Delivery OTP
                            </Button>
                        </div>
                    )}

                    {/* ================== FAILED DELIVERY ================== */}
                    {task.stage === "failed" && (
                        <div className="dtd-action-form">
                            <Alert severity="warning">
                                {task.failureReason ||
                                    "Delivery failed"}
                            </Alert>

                            {canRetry ? (
                                <Button
                                    variant="contained"
                                    disabled={busy}
                                    onClick={() => submit("retry")}
                                >
                                    Retry Task
                                </Button>
                            ) : (
                                <p>
                                    Contact Admin for review.
                                </p>
                            )}
                        </div>
                    )}

                    {/* ================== COMPLETED ================== */}
                    {closed && (
                        <div className="dtd-action-form">
                            <Alert severity="success">
                                This task is closed.
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

                    {/* ================== REPORT FAILURE ================== */}
                    {canFail && !showFailure && (
                        <Button
                            className="dtd-failure-toggle"
                            variant="outlined"
                            color="error"
                            disabled={busy}
                            onClick={() => setShowFailure(true)}
                        >
                            Report Failed Attempt
                        </Button>
                    )}

                    {canFail && showFailure && (
                        <div className="dtd-failure-form">
                            <h4>Record Failed Attempt</h4>

                            <TextField
                                select
                                fullWidth
                                label="Failure Reason"
                                value={reason}
                                onChange={(event) =>
                                    setReason(event.target.value)
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
                                        event.target.value.slice(0, 200)
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
                                    variant="contained"
                                    color="error"
                                    disabled={busy || !reason}
                                    onClick={() => submit("failed")}
                                >
                                    Save Failure
                                </Button>
                            </div>
                        </div>
                    )}

                    <p className="dtd-demo-note">
                        <i className="fa-solid fa-circle-info" />
                        OTP verification is handled by the backend.
                    </p>
                </aside>
            </div>
        </main>
    );
}

export default TaskDetails;
