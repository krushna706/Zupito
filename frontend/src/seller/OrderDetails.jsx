
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from "@mui/material";

import { toast } from "react-toastify";

import { formatMoney } from "../services/sellerService";

import {
    getSellerOrder,
    reportSellerIssue,
    updateSellerOrder,
} from "../services/orderService";

import {
    formatDateTime,
    getStatusLabel,
} from "../utils/orderStatus";

// ================== FULFILMENT STEPS ==================
const steps = [
    ["confirmed", "Order Confirmed", "fa-circle-check"],
    ["packing", "Packing", "fa-box"],
    ["ready_for_pickup", "Ready for Pickup", "fa-box-open"],
    ["picked_up", "Picked Up", "fa-truck-ramp-box"],
    ["out_for_delivery", "Out for Delivery", "fa-truck-fast"],
    ["delivered", "Delivered", "fa-house-circle-check"],
];

function progressIndex(status) {
    const aliases = {
        placed: 0,
        processing: 0,
        packed: 1,
        assigned: 2,
        shipped: 3,
        in_transit: 3,
        failed: 4,
    };

    const exact = steps.findIndex(([value]) =>
        value === status
    );

    return exact >= 0
        ? exact
        : (aliases[status] ?? 0);
}

function DetailField({ label, value }) {
    return (
        <div className="sod-field">
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
        </div>
    );
}

// ================== ORDER DETAILS ==================
function OrderDetails({ user }) {
    const { orderId, parcelId } = useParams();

    const [order, setOrder] = useState(() =>
        getSellerOrder(user, orderId, parcelId)
    );

    const [note, setNote] = useState("");
    const [issueOpen, setIssueOpen] = useState(false);
    const [issueText, setIssueText] = useState("");

    // ================== DATA REFRESH ==================
    const refresh = () => {
        setOrder(getSellerOrder(user, orderId, parcelId));
    };

    useEffect(() => {
        const sync = () => {
            setOrder(getSellerOrder(user, orderId, parcelId));
        };

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user?.id, user?.email, orderId, parcelId]);

    // ================== SELLER ACTIONS ==================
    const handleStage = (stage) => {
        try {
            updateSellerOrder(
                user,
                orderId,
                parcelId,
                stage,
                note
            );

            setNote("");
            refresh();

            toast.success(
                stage === "packing"
                    ? "Order moved to Packing."
                    : "Parcel marked Ready for Pickup."
            );
        } catch (error) {
            toast.error(error.message);
        }
    };

    const submitIssue = () => {
        try {
            reportSellerIssue(
                user,
                orderId,
                parcelId,
                issueText
            );

            setIssueOpen(false);
            setIssueText("");
            refresh();

            toast.success(
                "Issue sent to Admin Order Management."
            );
        } catch (error) {
            toast.error(error.message);
        }
    };

    // ================== NOT FOUND ==================
    if (!order) {
        return (
            <main className="seller-order-details">
                <section className="sod-card sod-not-found">
                    <h2>Order not available</h2>

                    <p>
                        This parcel is not available
                        under your seller account.
                    </p>

                    <Button
                        component={Link}
                        to="/manage/orders"
                        variant="outlined"
                    >
                        Back to Orders
                    </Button>
                </section>
            </main>
        );
    }

    // ================== ORDER INFORMATION ==================
    const canPack = [
        "confirmed",
        "placed",
        "processing",
    ].includes(order.status);

    const canReady = order.status === "packing";

    const delivery = order.task;
    const agent = order.agent;
    const address = order.address || {};
    const progress = progressIndex(order.status);
    const isCancelled = order.status === "cancelled";

    const activity = (order.activity || [])
        .filter((item) =>
            !item.parcelId ||
            item.parcelId === parcelId
        )
        .slice()
        .reverse();

    return (
        <main className="seller-order-details">
            {/* ================== PAGE HEADER ================== */}
            <header className="sod-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-receipt"
                            aria-hidden="true"
                        />
                        ORDER DETAILS
                    </h1>

                    <p>
                        Review items, pack the parcel
                        and monitor delivery updates.
                    </p>
                </div>

                <div className="sod-hero-actions">
                    <Button
                        component={Link}
                        to="/manage/orders"
                        variant="outlined"
                        startIcon={
                            <i className="fa-solid fa-arrow-left" />
                        }
                    >
                        Back to Orders
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={refresh}
                        startIcon={
                            <i className="fa-solid fa-arrows-rotate" />
                        }
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            {/* ================== ORDER SUMMARY ================== */}
            <section className="sod-summary sod-card">
                <div>
                    <span className="sod-eyebrow">
                        SELLER PARCEL
                    </span>

                    <h2>{order.orderId}</h2>

                    <p>
                        Parcel: {order.parcelId} ·{" "}
                        {formatDateTime(
                            order.createdAt,
                            order.demoPayment
                        )}
                    </p>
                </div>

                <div className="sod-summary-right">
                    <span className="sod-status">
                        {getStatusLabel(order.status)}
                    </span>

                    <strong>
                        {formatMoney(order.amount)}
                    </strong>

                    <small>{order.paymentStatus}</small>
                </div>
            </section>

            {order.demoPayment && (
                <div className="sod-notice">
                    <i
                        className="fa-solid fa-flask"
                        aria-hidden="true"
                    />
                    Sample paid order. No actual payment
                    or customer transaction was made.
                </div>
            )}

            {/* ================== FULFILMENT AND ACTIONS ================== */}
            <div className="sod-grid">
                <section className="sod-card">
                    <div className="sod-card-heading">
                        <span className="sod-heading-icon">
                            <i className="fa-solid fa-list-check" />
                        </span>

                        <div>
                            <h2>Fulfilment Progress</h2>
                            <p>
                                Seller packing and delivery milestones.
                            </p>
                        </div>
                    </div>

                    {isCancelled ? (
                        <div className="sod-cancelled">
                            This parcel has been cancelled.
                        </div>
                    ) : (
                        <ol className="sod-timeline">
                            {steps.map(([key, label, icon], index) => (
                                <li
                                    className={
                                        index <= progress
                                            ? "is-complete"
                                            : ""
                                    }
                                    key={key}
                                >
                                    <span>
                                        <i
                                            className={`fa-solid ${icon}`}
                                            aria-hidden="true"
                                        />
                                    </span>

                                    <div>
                                        <strong>{label}</strong>

                                        <small>
                                            {index === progress
                                                ? "Current stage"
                                                : index < progress
                                                    ? "Completed"
                                                    : "Upcoming"}
                                        </small>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                <section className="sod-card">
                    <div className="sod-card-heading">
                        <span className="sod-heading-icon">
                            <i className="fa-solid fa-box" />
                        </span>

                        <div>
                            <h2>Seller Actions</h2>
                            <p>
                                Prepare the parcel for assigned
                                delivery pickup.
                            </p>
                        </div>
                    </div>

                    <div className="sod-actions">
                        <TextField
                            multiline
                            minRows={3}
                            fullWidth
                            size="small"
                            label="Packing Note (Optional)"
                            value={note}
                            onChange={(event) =>
                                setNote(event.target.value)
                            }
                            disabled={!canPack && !canReady}
                            slotProps={{
                                htmlInput: { maxLength: 200 },
                            }}
                        />

                        {canPack && (
                            <Button
                                variant="contained"
                                onClick={() =>
                                    handleStage("packing")
                                }
                                startIcon={
                                    <i className="fa-solid fa-box" />
                                }
                            >
                                Start Packing
                            </Button>
                        )}

                        {canReady && (
                            <Button
                                variant="contained"
                                onClick={() =>
                                    handleStage("ready_for_pickup")
                                }
                                startIcon={
                                    <i className="fa-solid fa-box-open" />
                                }
                            >
                                Mark Ready for Pickup
                            </Button>
                        )}

                        {!canPack && !canReady && (
                            <div className="sod-info">
                                <i className="fa-solid fa-circle-info" />
                                Delivery stages are updated
                                by the assigned delivery agent.
                            </div>
                        )}

                        <Button
                            variant="outlined"
                            color="error"
                            disabled={
                                order.exception?.status === "Open"
                            }
                            onClick={() => setIssueOpen(true)}
                            startIcon={
                                <i className="fa-solid fa-triangle-exclamation" />
                            }
                        >
                            {order.exception?.status === "Open"
                                ? "Issue Already Reported"
                                : "Report Issue"}
                        </Button>
                    </div>
                </section>
            </div>

            {/* ================== PARCEL ITEMS ================== */}
            <section className="sod-card sod-items-card">
                <div className="sod-card-heading">
                    <span className="sod-heading-icon">
                        <i className="fa-solid fa-bag-shopping" />
                    </span>

                    <div>
                        <h2>Parcel Items</h2>
                        <p>
                            Purchased product snapshots
                            for your seller parcel.
                        </p>
                    </div>
                </div>

                <div className="sod-items">
                    {order.items.map((item, index) => (
                        <article
                            className="sod-item"
                            key={`${item.sku || item.name}-${index}`}
                        >
                            {item.image ? (
                                <img src={item.image} alt="" />
                            ) : (
                                <span className="sod-image-placeholder">
                                    <i className="fa-solid fa-image" />
                                </span>
                            )}

                            <div className="sod-item-name">
                                <strong>{item.name}</strong>

                                <small>
                                    {[
                                        item.variant,
                                        item.sku,
                                    ].filter(Boolean).join(" · ")}
                                </small>
                            </div>

                            <div className="sod-item-quantity">
                                Qty: {item.quantity || 1}
                            </div>

                            <strong>
                                {formatMoney(
                                    Number(
                                        item.price ??
                                        item.unitPrice ??
                                        0
                                    ) * Number(item.quantity || 1)
                                )}
                            </strong>
                        </article>
                    ))}
                </div>
            </section>

            {/* ================== CUSTOMER AND DELIVERY ================== */}
            <div className="sod-grid">
                <section className="sod-card">
                    <div className="sod-card-heading">
                        <span className="sod-heading-icon">
                            <i className="fa-solid fa-location-dot" />
                        </span>

                        <div>
                            <h2>Delivery Address</h2>
                            <p>
                                Address snapshot captured with the order.
                            </p>
                        </div>
                    </div>

                    <dl className="sod-details-grid">
                        <DetailField
                            label="Recipient"
                            value={address.name || order.customerName}
                        />

                        <DetailField
                            label="Mobile Number"
                            value={address.phone}
                        />

                        <DetailField
                            label="City / State"
                            value={[
                                address.city,
                                address.state,
                            ].filter(Boolean).join(", ")}
                        />

                        <DetailField
                            label="Pincode"
                            value={address.pincode}
                        />
                    </dl>

                    <p className="sod-address">
                        {[
                            address.house,
                            address.area,
                            address.locality,
                        ].filter(Boolean).join(", ")}
                    </p>
                </section>

                <section className="sod-card">
                    <div className="sod-card-heading">
                        <span className="sod-heading-icon">
                            <i className="fa-solid fa-truck-fast" />
                        </span>

                        <div>
                            <h2>Delivery Assignment</h2>
                            <p>
                                Agent and parcel custody information.
                            </p>
                        </div>
                    </div>

                    <dl className="sod-details-grid">
                        <DetailField
                            label="Assigned Agent"
                            value={agent?.name || "Awaiting assignment"}
                        />

                        <DetailField
                            label="Delivery Stage"
                            value={delivery?.stage
                                ? getStatusLabel(delivery.stage)
                                : "Awaiting pickup workflow"}
                        />

                        <DetailField
                            label="Parcel Custody"
                            value={delivery?.custody || "Seller"}
                        />

                        <DetailField
                            label="Pickup Pincode"
                            value={
                                order.parcel.pickupPincode ||
                                "Add in Store Profile"
                            }
                        />
                    </dl>

                    <div className="sod-info">
                        <i className="fa-solid fa-circle-info" />
                        Ready parcels enter the Admin Delivery
                        Assignment queue. OTP verification and Delivered
                        status belong to the delivery agent.
                    </div>
                </section>
            </div>

            {/* ================== ORDER ACTIVITY ================== */}
            <section className="sod-card sod-activity-card">
                <div className="sod-card-heading">
                    <span className="sod-heading-icon">
                        <i className="fa-solid fa-clock-rotate-left" />
                    </span>

                    <div>
                        <h2>Order Activity</h2>
                        <p>
                            Recorded seller updates and
                            operational events.
                        </p>
                    </div>
                </div>

                {activity.length ? (
                    <ul className="sod-activity">
                        {activity.map((item, index) => (
                            <li key={`${item.date}-${index}`}>
                                <span>
                                    <i className="fa-solid fa-check" />
                                </span>

                                <div>
                                    <strong>
                                        {getStatusLabel(item.type)}
                                    </strong>

                                    <p>{item.note}</p>

                                    <small>
                                        {formatDateTime(item.date)}
                                    </small>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="sod-muted">
                        No activity recorded for this parcel yet.
                    </p>
                )}
            </section>

            {/* ================== REPORT ISSUE DIALOG ================== */}
            <Dialog
                open={issueOpen}
                onClose={() => setIssueOpen(false)}
                fullWidth
                maxWidth="sm"
                className="so-dialog"
            >
                <DialogTitle>
                    Report Fulfilment Issue
                </DialogTitle>

                <DialogContent dividers>
                    <p className="sod-issue-intro">
                        Describe the stock, packing or pickup
                        issue for Admin review.
                    </p>

                    <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        size="small"
                        label="Issue Details"
                        value={issueText}
                        onChange={(event) =>
                            setIssueText(event.target.value)
                        }
                        slotProps={{
                            htmlInput: {
                                maxLength: 300,
                            },
                        }}
                        helperText={
                            `${issueText.trim().length}/300 characters (minimum 5)`
                        }
                    />
                </DialogContent>

                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={() => setIssueOpen(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={submitIssue}
                        disabled={issueText.trim().length < 5}
                    >
                        Submit Issue
                    </Button>
                </DialogActions>
            </Dialog>
        </main>
    );
}

export default OrderDetails;
