import { useState } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../services/api";

// ================== CONFIGURATION ==================
const cancellableStatuses = new Set([
    "placed",
    "confirmed",
    "processing",
    "packing",
    "packed",
    "ready_for_pickup",
]);
const cancellationReasons = [
    "Ordered by mistake",
    "Changed my mind",
    "Delivery taking too long",
    "Found a better option",
    "Other",
];

// ================== HELPERS ==================
function normalizeStatus(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}
function getParcelId(parcel) {
    return String(parcel?._id || parcel?.parcelId || parcel?.id || "");
}
function getParcelStatus(parcel) {
    return normalizeStatus(parcel?.deliveryStatus || parcel?.status || parcel?.orderStatus);
}
function formatAmount(value) {
    const amount = Number(value);
    if (value == null || !Number.isFinite(amount)) {
        return "Unavailable";
    }
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
    }).format(amount);
}
function formatDateTime(value) {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    }).format(date);
}
function statusLabel(status) {
    const labels = {
        queued: "Pending",
        pending: "Pending",
        processing: "Processing",
        completed: "Completed",
        refunded: "Completed",
        failed: "Failed",
        review: "Requires Review",
        cancelled: "Cancelled",
    };
    return labels[status] || (status ? status.replace(/_/g, " ") : "Awaiting update");
}

// ================== CANCELLATION DIALOG ==================
function OrderCancellationContent({ order, parcels = [], onCancel }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const eligibleParcels = parcels.filter((parcel) =>
        cancellableStatuses.has(getParcelStatus(parcel))
    );
    const eligibleIds = eligibleParcels.map(getParcelId);
    if (!order || eligibleParcels.length === 0) {
        return null;
    }
    const openForm = () => {
        setSelectedIds(eligibleIds);
        setReason("");
        setDetails("");
        setError("");
        setOpen(true);
    };
    const toggleParcel = (id) => {
        setSelectedIds((previous) =>
            previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]
        );
        setError("");
    };

    // ================== SUBMIT CANCELLATION ==================
    const submit = async () => {
        if (!selectedIds.length) {
            setError("Select at least one eligible package.");
            return;
        }
        if (!reason) {
            setError("Please select a cancellation reason.");
            return;
        }
        if (reason === "Other" && details.trim().length < 5) {
            setError("Please enter at least 5 characters for the reason.");
            return;
        }
        const chosen = eligibleParcels.filter((parcel) =>
            selectedIds.includes(getParcelId(parcel))
        );
        const parcelIds = chosen.map(getParcelId);

        // Real cancellation requires actual seller parcel IDs.
        if (
            chosen.some((parcel) => parcel.isFallback) ||
            parcelIds.some((id) => !/^[a-f0-9]{24}$/i.test(id))
        ) {
            setError("Parcel details are not ready. Refresh the order and try again.");
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            const payload = {
                parcelIds,
                reason,
                details: details.trim(),
            };
            const result =
                typeof onCancel === "function"
                    ? await onCancel(order, payload)
                    : (
                          await api.post(
                              `/refunds/orders/${encodeURIComponent(order._id || order.id)}/cancel`,
                              payload
                          )
                      ).data;
            if (result?.success !== true) {
                setError(result?.message || "Cancellation could not be confirmed.");
                return;
            }
            setOpen(false);
            window.dispatchEvent(new Event("zupito:orders-updated"));
            toast.success(result.message || "Parcel cancelled. Refund queued.");
        } catch (failure) {
            setError(
                failure?.response?.data?.message ||
                    failure?.message ||
                    "Unable to process cancellation."
            );
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <>
            <button type="button" className="customer-detail-cancel-button" onClick={openForm}>
                <i className="fa-solid fa-ban" aria-hidden="true" />

                {eligibleParcels.length < parcels.length
                    ? "Cancel Eligible Package"
                    : "Cancel Order"}
            </button>

            <Dialog
                open={open}
                onClose={submitting ? undefined : () => setOpen(false)}
                fullWidth
                maxWidth="xs"
                className="customer-detail-cancel-dialog"
                aria-labelledby="zupito-cancellation-title"
            >
                <DialogTitle id="zupito-cancellation-title">Cancel Order</DialogTitle>

                <DialogContent>
                    <div className="customer-cancel-form">
                        <p>
                            Only packages that have not been picked up are eligible for normal
                            cancellation.
                        </p>

                        {/* ================== SELECT PARCELS ================== */}
                        {parcels.length > 1 && (
                            <div className="customer-cancel-packages">
                                <strong>Choose packages</strong>

                                {parcels.map((parcel, index) => {
                                    const id = getParcelId(parcel);
                                    const eligible = eligibleIds.includes(id);
                                    return (
                                        <label
                                            key={id || index}
                                            className="customer-cancel-package"
                                        >
                                            <input
                                                type="checkbox"
                                                disabled={!eligible || submitting}
                                                checked={eligible && selectedIds.includes(id)}
                                                onChange={() => toggleParcel(id)}
                                            />

                                            <span>Package {index + 1}</span>

                                            <small>{eligible ? "Eligible" : "Not eligible"}</small>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* ================== CANCELLATION REASON ================== */}
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Cancellation Reason"
                            required
                            value={reason}
                            disabled={submitting}
                            onChange={(event) => {
                                setReason(event.target.value);
                                setError("");
                            }}
                        >
                            {cancellationReasons.map((value) => (
                                <MenuItem key={value} value={value}>
                                    {value}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={4}
                            size="small"
                            label={
                                reason === "Other"
                                    ? "Explanation (Required)"
                                    : "Additional Details (Optional)"
                            }
                            value={details}
                            disabled={submitting}
                            onChange={(event) => {
                                setDetails(event.target.value.slice(0, 300));
                                setError("");
                            }}
                            helperText={`${details.length}/300`}
                        />

                        {error && (
                            <p className="customer-cancel-error" role="alert">
                                {error}
                            </p>
                        )}

                        <p className="customer-cancel-note">
                            An eligible cancellation starts a separate refund process. The refund
                            will be marked complete only after gateway confirmation.
                        </p>
                    </div>
                </DialogContent>

                <DialogActions>
                    <button
                        type="button"
                        className="customer-detail-dialog-back"
                        disabled={submitting}
                        onClick={() => setOpen(false)}
                    >
                        Keep Order
                    </button>

                    <button
                        type="button"
                        className="customer-detail-dialog-confirm"
                        disabled={submitting}
                        onClick={submit}
                    >
                        {submitting ? "Processing..." : "Confirm Cancellation"}
                    </button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// ================== REFUND TRACKING ==================
export function RefundStatus({ order, parcels = [] }) {
    if (!order) return null;
    const orderStatus = normalizeStatus(order.orderStatus || order.status);
    const refundedParcels = parcels.filter(
        (parcel) =>
            getParcelStatus(parcel).includes("cancel") || parcel.refund || parcel.refundStatus
    );
    const records = parcels.flatMap((parcel, index) => {
        const refund =
            parcel.refund ||
            (parcel.refundStatus
                ? {
                      status: parcel.refundStatus,
                      amount: parcel.refundAmount,
                      reference: parcel.refundReference,
                      completedAt: parcel.refundedAt,
                  }
                : null);
        return refund
            ? [
                  {
                      key: getParcelId(parcel),
                      label: `Package ${index + 1}`,
                      items: parcel.items || [],
                      refund,
                  },
              ]
            : [];
    });
    const orderRefund =
        order.refund ||
        (order.refundStatus
            ? {
                  status: order.refundStatus,
                  amount: order.refundAmount,
                  reference: order.refundReference,
                  completedAt: order.refundedAt,
              }
            : null);
    if (!records.length && orderRefund) {
        records.push({
            key: "order",
            label: "Order Refund",
            refund: orderRefund,
        });
    }

    // Keep existing preview records separate from real refunds.

    if (!records.length && !orderStatus.includes("cancel") && !refundedParcels.length) {
        return null;
    }
    return (
        <section className="customer-detail-card">
            <div className="customer-detail-card-heading">
                <span className="customer-detail-card-icon">
                    <i className="fa-solid fa-money-bill-transfer" aria-hidden="true" />
                </span>

                <div>
                    <h3>Cancellation Refund Status</h3>
                    <p>Updates for eligible cancelled packages</p>
                </div>
            </div>

            <div className="customer-refund-content">
                {records.length ? (
                    records.map(({ key, label, items = [], refund }) => {
                        const status = normalizeStatus(refund.status);
                        const style =
                            status === "queued"
                                ? "pending"
                                : status === "review"
                                  ? "failed"
                                  : [
                                          "pending",
                                          "processing",
                                          "completed",
                                          "refunded",
                                          "failed",
                                      ].includes(status)
                                    ? status
                                    : "unknown";
                        return (
                            <div key={key} className="customer-refund-row">
                                <div>
                                    <strong>{label}</strong>
                                    {items.map((item, index) => (
                                        <p key={item._id || index}>
                                            {item.name || item.productSnapshot?.name || "Product"} ·{" "}
                                            {item.variantLabel ||
                                                item.productSnapshot?.variantLabel}{" "}
                                            · Quantity: {item.quantity}
                                        </p>
                                    ))}

                                    <span>Amount: {formatAmount(refund.amount)}</span>

                                    {refund.reference && <span>Reference: {refund.reference}</span>}

                                    {refund.completedAt && (
                                        <span>Completed: {formatDateTime(refund.completedAt)}</span>
                                    )}
                                </div>

                                <span className={`customer-refund-status is-${style}`}>
                                    {statusLabel(status)}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <p className="customer-refund-unavailable">
                        {
                            "No refund record is available yet. A cancellation does not imply a completed refund."
                        }
                    </p>
                )}
            </div>
        </section>
    );
}
export default function OrderCancellation(props) {
    return <OrderCancellationContent key={props.order?._id || props.order?.id} {...props} />;
}
