
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    TextField,
} from "@mui/material";

import { toast } from "react-toastify";

import {
    getReplacementStock,
    getSellerReplacement,
    inspectReturnedItem,
    readyReplacementForPickup,
    respondToReplacement,
    startReplacementPacking,
    syncSellerReplacementWorkflow,
} from "../services/replacementService";

// ================== HELPERS ==================
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
        });
}

function DetailItem({ label, value }) {
    return (
        <div className="sr-detail-item">
            <dt>{label}</dt>
            <dd>{value ?? "—"}</dd>
        </div>
    );
}

function SectionHeading({ icon, title, description }) {
    return (
        <div className="sr-card-heading">
            <span className="sr-heading-icon">
                <i
                    className={`fa-solid ${icon}`}
                    aria-hidden="true"
                />
            </span>

            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
        </div>
    );
}

function WorkflowItem({
    title,
    description,
    active,
    complete,
}) {
    const className = [
        "sr-step",
        complete ? "is-complete" : "",
        active ? "is-active" : "",
    ].filter(Boolean).join(" ");

    return (
        <li className={className}>
            <span className="sr-step-dot">
                <i
                    className={`fa-solid ${
                        complete ? "fa-check" : "fa-circle"
                    }`}
                    aria-hidden="true"
                />
            </span>

            <div>
                <strong>{title}</strong>
                <small>{description}</small>
            </div>
        </li>
    );
}

// ================== REPLACEMENT DETAILS ==================
function ReplacementDetails({ user }) {
    const { replacementId } = useParams();

    const [request, setRequest] = useState(() =>
        getSellerReplacement(user, replacementId)
    );

    const [decision, setDecision] = useState("Confirmed");
    const [sellerNote, setSellerNote] = useState("");

    const [condition, setCondition] = useState("");
    const [inspectionNote, setInspectionNote] = useState("");
    const [skuVerified, setSkuVerified] = useState(false);

    const [packingNote, setPackingNote] = useState("");
    const [saving, setSaving] = useState(false);

    // ================== DATA REFRESH ==================
    const refresh = () => {
        try {
            syncSellerReplacementWorkflow(user);

            setRequest(
                getSellerReplacement(user, replacementId)
            );
        } catch (error) {
            toast.error(
                error.message ||
                "Unable to refresh replacement details."
            );
        }
    };

    useEffect(() => {
        const sync = () => {
            try {
                syncSellerReplacementWorkflow(user);
            } catch {
                // Continue showing the saved request.
            }

            setRequest(
                getSellerReplacement(user, replacementId)
            );
        };

        sync();

        window.addEventListener("focus", sync);
        window.addEventListener("storage", sync);

        return () => {
            window.removeEventListener("focus", sync);
            window.removeEventListener("storage", sync);
        };
    }, [user?.id, user?.email, replacementId]);

    // ================== ACTION HANDLERS ==================
    const runAction = (callback, message) => {
        if (saving) return;

        setSaving(true);

        try {
            callback();
            refresh();

            toast.success(message);
        } catch (error) {
            toast.error(
                error.message ||
                "Unable to update replacement."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleResponse = () => {
        runAction(() => {
            respondToReplacement(
                user,
                replacementId,
                decision,
                sellerNote
            );

            setSellerNote("");
        }, "Seller response submitted for Admin review.");
    };

    const handleInspection = () => {
        runAction(() => {
            inspectReturnedItem(
                user,
                replacementId,
                condition,
                inspectionNote,
                skuVerified
            );
        }, "Return inspection recorded successfully.");
    };

    const handlePacking = () => {
        runAction(() => {
            startReplacementPacking(
                user,
                replacementId
            );
        }, "Replacement packing started.");
    };

    const handleReady = () => {
        runAction(() => {
            readyReplacementForPickup(
                user,
                replacementId,
                packingNote
            );
        }, "Replacement delivery task created successfully.");
    };

    // ================== NOT FOUND ==================
    if (!request) {
        return (
            <main className="seller-replacements">
                <section className="sr-card sr-not-found">
                    <h2>Replacement not available</h2>

                    <p>
                        This request is not linked to
                        your seller account.
                    </p>

                    <Button
                        component={Link}
                        to="/manage/replacements"
                        variant="outlined"
                    >
                        Back to Replacements
                    </Button>
                </section>
            </main>
        );
    }

    // ================== REQUEST STATUS ==================
    const stock = getReplacementStock(request);

    const isPending = request.status === "Pending";

    const awaitingSeller = isPending &&
        ["Awaiting", ""].includes(
            request.sellerDecision || "Awaiting"
        );

    const pickup = request.pickupTask;
    const delivery = request.deliveryTask;

    const receivedReturn = pickup?.stage === "delivered";

    const canInspect =
        request.status === "Inspection" &&
        receivedReturn &&
        !request.inspectedAt;

    const canPack =
        request.status === "Inspection" &&
        request.inspectedAt &&
        !request.packingAt;

    const canReady =
        request.status === "Inspection" &&
        request.inspectedAt &&
        request.packingAt;

    const rejected = request.status === "Rejected";
    const completed = request.status === "Completed";

    // ================== WORKFLOW TIMELINE ==================
    const steps = [
        {
            title: "Request & Seller Response",
            description: request.sellerDecision || "Awaiting response",
            complete: !awaitingSeller,
            active: isPending,
        },
        {
            title: "Admin Approval",
            description: request.reviewedAt
                ? formatDate(request.reviewedAt)
                : "Waiting for Admin",
            complete: Boolean(request.reviewedAt && !rejected),
            active: isPending &&
                request.sellerDecision === "Confirmed",
        },
        {
            title: "Reverse Pickup",
            description: pickup
                ? `Agent stage: ${pickup.stage}`
                : "Awaiting pickup task",
            complete: receivedReturn,
            active: Boolean(pickup && !receivedReturn),
        },
        {
            title: "Return Inspection",
            description: request.inspectedAt
                ? request.returnCondition
                : "Waiting for returned item",
            complete: Boolean(request.inspectedAt),
            active: canInspect,
        },
        {
            title: "Replacement Ready",
            description: delivery
                ? `Delivery task: ${delivery.id}`
                : "Packing not completed",
            complete: Boolean(delivery),
            active: Boolean(
                request.packingAt && !delivery
            ),
        },
        {
            title: "Replacement Delivered",
            description: completed
                ? "Delivered to customer"
                : "Delivery agent updates completion",
            complete: completed,
            active: Boolean(delivery && !completed),
        },
    ];

    return (
        <main className="seller-replacements">
            {/* ================== PAGE HEADER ================== */}
            <header className="sr-hero">
                <div>
                    <h1>
                        <i
                            className="fa-solid fa-arrow-right-arrow-left"
                            aria-hidden="true"
                        />
                        REPLACEMENT DETAILS
                    </h1>

                    <p>
                        Review the original item, seller response
                        and return-to-delivery workflow.
                    </p>
                </div>

                <div className="sr-header-actions">
                    <Button
                        component={Link}
                        to="/manage/replacements"
                        variant="outlined"
                    >
                        Back to Replacements
                    </Button>

                    <Button
                        onClick={refresh}
                        variant="outlined"
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            {/* ================== REQUEST SUMMARY ================== */}
            <section className="sr-card sr-request-summary">
                <div>
                    <span className="sr-subtitle">
                        REPLACEMENT REQUEST
                    </span>

                    <h2>{request.id}</h2>

                    <p>
                        Original Order: {request.orderId}
                    </p>
                </div>

                <div className="sr-summary-status">
                    <span className="sr-badge sr-badge-blue">
                        {request.status}
                    </span>

                    <small>
                        Requested {formatDate(request.requestedAt)}
                    </small>
                </div>
            </section>

            {/* ================== STOCK WARNING ================== */}
            {request.stockWarning && (
                <div className="sr-warning">
                    <i
                        className="fa-solid fa-triangle-exclamation"
                        aria-hidden="true"
                    />

                    <span>{request.stockWarning}</span>
                </div>
            )}

            {rejected && (
                <div className="sr-warning">
                    <i
                        className="fa-solid fa-circle-xmark"
                        aria-hidden="true"
                    />

                    <span>
                        Admin rejected this request.{" "}
                        {request.adminNote ||
                            "No further seller action is available."}
                    </span>
                </div>
            )}

            {/* ================== DETAILS AND TIMELINE ================== */}
            <div className="sr-detail-grid">
                <section className="sr-card">
                    <SectionHeading
                        icon="fa-box-open"
                        title="Product & Request Details"
                        description="Original delivered product and replacement reason."
                    />

                    <dl className="sr-fields">
                        <DetailItem
                            label="Product"
                            value={request.productName}
                        />

                        <DetailItem
                            label="Quantity"
                            value={request.quantity}
                        />

                        <DetailItem
                            label="Customer"
                            value={request.customerName}
                        />

                        <DetailItem
                            label="Reason"
                            value={request.reason}
                        />

                        <DetailItem
                            label="Category"
                            value={request.category}
                        />

                        <DetailItem
                            label="Delivered"
                            value={formatDate(request.deliveredAt)}
                        />

                        <DetailItem
                            label="Customer Pincode"
                            value={request.customerPincode}
                        />

                        <DetailItem
                            label="Seller Pincode"
                            value={request.sellerPincode}
                        />
                    </dl>

                    <div className="sr-description">
                        <strong>Customer Description</strong>

                        <p>
                            {request.description ||
                                "No additional details."}
                        </p>
                    </div>
                </section>

                <section className="sr-card">
                    <SectionHeading
                        icon="fa-route"
                        title="Replacement Progress"
                        description="Admin and delivery agent milestones."
                    />

                    <ol className="sr-steps">
                        {steps.map((step) => (
                            <WorkflowItem
                                key={step.title}
                                {...step}
                            />
                        ))}
                    </ol>
                </section>
            </div>

            {/* ================== SELLER CONFIRMATION ================== */}
            <section className="sr-card sr-section">
                <SectionHeading
                    icon="fa-circle-check"
                    title="Seller Confirmation"
                    description="Confirm matching replacement stock before Admin approval."
                />

                <dl className="sr-fields">
                    <DetailItem
                        label="Seller Decision"
                        value={request.sellerDecision || "Awaiting"}
                    />

                    <DetailItem
                        label="Available Stock"
                        value={stock.error || stock.available}
                    />

                    <DetailItem
                        label="Reserved Stock"
                        value={stock.reserved}
                    />

                    <DetailItem
                        label="Replacement Reservation"
                        value={
                            request.stockReservationApplied
                                ? "Reserved"
                                : "Not Reserved"
                        }
                    />
                </dl>

                {request.sellerNote && (
                    <div className="sr-description">
                        <strong>Seller Note</strong>
                        <p>{request.sellerNote}</p>
                    </div>
                )}

                {awaitingSeller && (
                    <div className="sr-action-form">
                        <div className="sr-action-fields">
                            <TextField
                                select
                                size="small"
                                label="Seller Decision"
                                value={decision}
                                onChange={(event) =>
                                    setDecision(event.target.value)
                                }
                            >
                                <MenuItem value="Confirmed">
                                    Confirm Stock Availability
                                </MenuItem>

                                <MenuItem value="Declined">
                                    Decline Request
                                </MenuItem>
                            </TextField>

                            <TextField
                                size="small"
                                label={
                                    decision === "Declined"
                                        ? "Decline Reason"
                                        : "Seller Note (Optional)"
                                }
                                value={sellerNote}
                                onChange={(event) =>
                                    setSellerNote(event.target.value)
                                }
                                multiline
                                minRows={2}
                                required={decision === "Declined"}
                                slotProps={{
                                    htmlInput: { maxLength: 300 },
                                }}
                            />
                        </div>

                        <Button
                            variant="contained"
                            onClick={handleResponse}
                            disabled={saving}
                        >
                            Submit Response
                        </Button>
                    </div>
                )}

                {isPending && !awaitingSeller && (
                    <p className="sr-help-text">
                        Seller response submitted. Admin will
                        review eligibility and approval.
                    </p>
                )}
            </section>

            {/* ================== RETURN INSPECTION ================== */}
            <section className="sr-card sr-section">
                <SectionHeading
                    icon="fa-magnifying-glass"
                    title="Returned Item Inspection"
                    description="Only returned and verified resellable items can be added back to stock."
                />

                <dl className="sr-fields">
                    <DetailItem
                        label="Reverse Pickup Task"
                        value={pickup?.id || "Not Assigned"}
                    />

                    <DetailItem
                        label="Reverse Pickup Status"
                        value={pickup?.stage || "Awaiting Approval"}
                    />

                    <DetailItem
                        label="Return Condition"
                        value={request.returnCondition || "Not Inspected"}
                    />

                    <DetailItem
                        label="Inspected At"
                        value={formatDate(request.inspectedAt)}
                    />
                </dl>

                {canInspect && (
                    <div className="sr-action-form">
                        <div className="sr-action-fields">
                            <TextField
                                select
                                size="small"
                                label="Received Item Condition"
                                value={condition}
                                onChange={(event) => {
                                    setCondition(event.target.value);
                                    setSkuVerified(false);
                                }}
                            >
                                <MenuItem value="Resellable">
                                    Resellable / Good Condition
                                </MenuItem>

                                <MenuItem value="Damaged / Defective">
                                    Damaged or Defective
                                </MenuItem>

                                <MenuItem value="Wrong Item">
                                    Wrong Product Returned
                                </MenuItem>
                            </TextField>

                            <TextField
                                size="small"
                                label="Inspection Notes"
                                value={inspectionNote}
                                onChange={(event) =>
                                    setInspectionNote(event.target.value)
                                }
                                multiline
                                minRows={2}
                                required
                                slotProps={{
                                    htmlInput: { maxLength: 300 },
                                }}
                            />
                        </div>

                        {condition === "Resellable" && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={skuVerified}
                                        onChange={(event) =>
                                            setSkuVerified(event.target.checked)
                                        }
                                    />
                                }
                                label="I verified the returned item matches the original SKU."
                            />
                        )}

                        <Button
                            variant="contained"
                            onClick={handleInspection}
                            disabled={
                                saving ||
                                !condition ||
                                inspectionNote.trim().length < 5
                            }
                        >
                            Save Inspection
                        </Button>
                    </div>
                )}

                {!canInspect && !request.inspectedAt && !rejected && (
                    <p className="sr-help-text">
                        Inspection becomes available when the
                        reverse pickup task is marked Delivered
                        to Seller by the assigned delivery agent.
                    </p>
                )}
            </section>

            {/* ================== REPLACEMENT DISPATCH ================== */}
            <section className="sr-card sr-section">
                <SectionHeading
                    icon="fa-truck-fast"
                    title="Replacement Dispatch"
                    description="Pack the same product and variant, then hand it to the assigned agent."
                />

                <dl className="sr-fields">
                    <DetailItem
                        label="Packing"
                        value={
                            request.packingAt
                                ? "Started"
                                : "Not Started"
                        }
                    />

                    <DetailItem
                        label="Delivery Task"
                        value={delivery?.id || "Not Created"}
                    />

                    <DetailItem
                        label="Delivery Stage"
                        value={delivery?.stage || "Awaiting Packing"}
                    />

                    <DetailItem
                        label="Parcel Custody"
                        value={delivery?.custody || "Seller"}
                    />

                    <DetailItem
                        label="Stock Dispatched"
                        value={formatDate(request.dispatchedAt)}
                    />
                </dl>

                {canPack && (
                    <div className="sr-action-form">
                        <Button
                            variant="contained"
                            onClick={handlePacking}
                            disabled={saving}
                        >
                            Start Replacement Packing
                        </Button>
                    </div>
                )}

                {canReady && (
                    <div className="sr-action-form">
                        <TextField
                            size="small"
                            label="Packing Note (Optional)"
                            value={packingNote}
                            onChange={(event) =>
                                setPackingNote(event.target.value)
                            }
                            multiline
                            minRows={2}
                            slotProps={{
                                htmlInput: { maxLength: 200 },
                            }}
                        />

                        <Button
                            variant="contained"
                            onClick={handleReady}
                            disabled={saving}
                        >
                            Mark Replacement Ready for Pickup
                        </Button>
                    </div>
                )}

                {delivery && (
                    <p className="sr-help-text">
                        Outbound task created. Delivery agent manages
                        pickup, OTP verification and final delivery.
                        Seller cannot mark this parcel Delivered.
                    </p>
                )}
            </section>

            {/* ================== REQUEST HISTORY ================== */}
            <section className="sr-card sr-section">
                <SectionHeading
                    icon="fa-clock-rotate-left"
                    title="Replacement History"
                    description="Audit trail of seller responses, Admin decisions and fulfilment updates."
                />

                <div className="sr-history">
                    {(request.history || []).length ? (
                        [...request.history]
                            .reverse()
                            .map((event, index) => (
                                <div
                                    className="sr-history-entry"
                                    key={`${event.date}-${index}`}
                                >
                                    <span className="sr-history-marker">
                                        <i
                                            className="fa-solid fa-check"
                                            aria-hidden="true"
                                        />
                                    </span>

                                    <div>
                                        <strong>{event.status}</strong>

                                        <small>
                                            {formatDate(event.date)}
                                        </small>

                                        <p>
                                            {event.note ||
                                                "Status updated."}
                                        </p>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <p className="sr-help-text">
                            No activity recorded for this request yet.
                        </p>
                    )}
                </div>
            </section>
        </main>
    );
}

export default ReplacementDetails;
