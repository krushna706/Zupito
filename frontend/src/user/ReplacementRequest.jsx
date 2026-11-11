import api from "../services/api";
import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES = 3;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const reasons = [
    "Damaged item",
    "Defective or not working",
    "Wrong item received",
    "Missing parts or accessories",
    "Other",
];
function getItemId(item) {
    return String(item?.orderItemId || item?._id || item?.id || "");
}
function getProductName(item) {
    return (
        item?.productSnapshot?.name ||
        item?.product?.name ||
        item?.productName ||
        item?.name ||
        "Product"
    );
}
function getItemQuantity(item) {
    const quantity = Number(item?.quantity);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
}
function formatDateTime(value) {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
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
function formatAddress(address) {
    if (!address) return "Unavailable";
    return [
        address.name,
        [address.house, address.area, address.landmark].filter(Boolean).join(", "),
        [address.city, address.state, address.pincode].filter(Boolean).join(", "),
    ]
        .filter(Boolean)
        .join(" · ");
}
function ReplacementRequestContent({
    open = false,
    onClose,
    order,
    items = [],
    address = null,
    onSubmit,
}) {
    const [itemId, setItemId] = useState(() => {
        const item = items.find(
            (entry) => entry?.replacementEligible !== false && getItemId(entry)
        );
        return item ? getItemId(item) : "";
    });
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState("");
    const [description, setDescription] = useState("");
    const [images, setImages] = useState([]);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const eligibleItems = useMemo(
        () =>
            items.filter((item) => item?.replacementEligible !== false && Boolean(getItemId(item))),
        [items]
    );
    const selectedItem = eligibleItems.find((item) => getItemId(item) === itemId);
    const maxQuantity = selectedItem ? getItemQuantity(selectedItem) : 1;
    const close = () => {
        if (!submitting) onClose?.();
    };
    const selectImages = (event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        if (!files.length) return;
        if (images.length + files.length > MAX_IMAGES) {
            setError(`Upload a maximum of ${MAX_IMAGES} images.`);
            return;
        }
        for (const file of files) {
            if (!IMAGE_TYPES.has(file.type)) {
                setError("Upload JPG, PNG or WebP images only.");
                return;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                setError("Each image must be 3 MB or smaller.");
                return;
            }
        }
        setImages((previous) => [...previous, ...files]);
        setError("");
    };
    const submit = async (event) => {
        event.preventDefault();
        if (!selectedItem) {
            setError("Choose an eligible delivered product.");
            return;
        }
        const count = Number(quantity);
        if (!Number.isSafeInteger(count) || count < 1 || count > maxQuantity) {
            setError(`Quantity must be between 1 and ${maxQuantity}.`);
            return;
        }
        if (!reason || (reason === "Other" && description.trim().length < 10)) {
            setError(
                reason === "Other"
                    ? "Please describe the issue in at least 10 characters."
                    : "Select a reason."
            );
            return;
        }
        if (description.trim().length > 1000) {
            setError("Description cannot exceed 1000 characters.");
            return;
        }
        // API must verify item ownership, delivered status, category window and stock.
        try {
            setSubmitting(true);
            const payload = {
                orderItemId: getItemId(selectedItem),
                quantity: count,
                reason,
                description: description.trim(),
                images,
            };
            let result;
            if (onSubmit) result = await onSubmit(order, payload);
            else {
                const body = new FormData();
                body.append("orderId", order._id || order.id);
                for (const key of ["orderItemId", "quantity", "reason", "description"])
                    body.append(key, payload[key]);
                images.forEach((image) => body.append("images", image));
                result = (await api.post("/replacements", body)).data;
            }
            if (result?.success !== true) {
                toast.error(result?.message || "Replacement request could not be confirmed.");
                return;
            }
            toast.success(result?.message || "Replacement request submitted for review.");
            window.dispatchEvent(new Event("zupito:replacements-updated"));
            onClose?.();
        } catch (err) {
            toast.error(err.message || "Unable to request replacement.");
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Dialog
            open={open}
            onClose={close}
            fullWidth
            maxWidth="sm"
            className="customer-replacement-dialog"
            aria-labelledby="zupito-replacement-title"
        >
            <DialogTitle id="zupito-replacement-title">Request Product Replacement</DialogTitle>
            <DialogContent dividers>
                <form
                    id="customer-replacement-form"
                    onSubmit={submit}
                    className="customer-replacement-form"
                >
                    <p>
                        Choose a delivered product. Replacement is for the same product and variant,
                        subject to category rules, approval and stock verification.
                    </p>
                    {eligibleItems.length ? (
                        <>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                required
                                label="Delivered Product"
                                value={itemId}
                                disabled={submitting}
                                onChange={(event) => {
                                    setItemId(event.target.value);
                                    setQuantity(1);
                                    setError("");
                                }}
                            >
                                {eligibleItems.map((item) => (
                                    <MenuItem key={getItemId(item)} value={getItemId(item)}>
                                        {getProductName(item)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                fullWidth
                                type="number"
                                size="small"
                                label="Quantity"
                                required
                                value={quantity}
                                disabled={submitting}
                                onChange={(event) => {
                                    setQuantity(event.target.value);
                                    setError("");
                                }}
                                slotProps={{
                                    htmlInput: {
                                        min: 1,
                                        max: maxQuantity,
                                        step: 1,
                                    },
                                }}
                                helperText={`Purchased quantity: ${maxQuantity}`}
                            />
                            <TextField
                                select
                                fullWidth
                                size="small"
                                required
                                label="Reason"
                                value={reason}
                                disabled={submitting}
                                onChange={(event) => {
                                    setReason(event.target.value);
                                    setError("");
                                }}
                            >
                                {reasons.map((value) => (
                                    <MenuItem key={value} value={value}>
                                        {value}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                maxRows={6}
                                size="small"
                                label={
                                    reason === "Other"
                                        ? "Issue Details (Required)"
                                        : "Issue Details (Optional)"
                                }
                                value={description}
                                disabled={submitting}
                                onChange={(event) => {
                                    setDescription(event.target.value.slice(0, 1000));
                                    setError("");
                                }}
                                helperText={`${description.length}/1000`}
                            />
                            <div className="customer-replacement-upload">
                                <span>Supporting Images (Optional)</span>
                                <label>
                                    <i className="fa-solid fa-image" aria-hidden="true" />
                                    Add Images
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        multiple
                                        disabled={submitting}
                                        onChange={selectImages}
                                    />
                                </label>
                                <small>Up to 3 images, 3 MB each · JPG, PNG or WebP</small>
                                {images.length > 0 && (
                                    <div className="customer-replacement-files">
                                        {images.map((file, index) => (
                                            <div key={`${file.name}-${index}`}>
                                                <span title={file.name}>{file.name}</span>
                                                <button
                                                    type="button"
                                                    disabled={submitting}
                                                    aria-label={`Remove ${file.name}`}
                                                    onClick={() =>
                                                        setImages((previous) =>
                                                            previous.filter((_, i) => i !== index)
                                                        )
                                                    }
                                                >
                                                    <i
                                                        className="fa-solid fa-xmark"
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="customer-replacement-address">
                                <strong>Original Delivery Address</strong>
                                <p>{formatAddress(address)}</p>
                                <small>
                                    Replacement pickup and delivery will use the original address by
                                    default.
                                </small>
                            </div>
                        </>
                    ) : (
                        <p>No eligible delivered product is available for this request.</p>
                    )}
                    {error && (
                        <p className="customer-replacement-error" role="alert">
                            {error}
                        </p>
                    )}
                    <p className="customer-replacement-note">
                        This is a replacement request, not a return-for-refund. Approval, pickup and
                        inspection are handled after submission.
                    </p>
                </form>
            </DialogContent>
            <DialogActions>
                <button
                    type="button"
                    className="customer-detail-dialog-back"
                    disabled={submitting}
                    onClick={close}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    form="customer-replacement-form"
                    className="customer-detail-replace-button"
                    disabled={submitting || !eligibleItems.length}
                >
                    {submitting ? "Submitting..." : "Submit Request"}
                </button>
            </DialogActions>
        </Dialog>
    );
}
export function ReplacementStatus({ order }) {
    const [rows, setRows] = useState([]);
    const [code, setCode] = useState(null);
    const [loadError, setLoadError] = useState("");
    const id = order?._id || order?.id;
    useEffect(() => {
        if (!id) return;
        let active = true;
        const refresh = () =>
            api
                .get("/replacements", {
                    params: {
                        orderId: id,
                    },
                })
                .then(({ data }) => {
                    if (active) {
                        setRows(data.replacements);
                        setLoadError("");
                    }
                })
                .catch((error) => {
                    if (active) setLoadError(error.message);
                });
        void refresh();
        window.addEventListener("focus", refresh);
        window.addEventListener("zupito:replacements-updated", refresh);
        const timer = setInterval(refresh, 30000);
        return () => {
            active = false;
            clearInterval(timer);
            window.removeEventListener("focus", refresh);
            window.removeEventListener("zupito:replacements-updated", refresh);
        };
    }, [id]);
    const showCode = async (row) => {
        try {
            const { data } = await api.get(`/replacements/${row.id}/code`);
            setCode({
                ...data,
                id: row.id,
            });
        } catch (error) {
            toast.error(error.message);
        }
    };
    if (loadError)
        return (
            <p className="customer-replacement-error" role="alert">
                Replacement tracking: {loadError}
            </p>
        );
    if (!rows.length) return null;
    return (
        <section className="customer-replacement-tracking">
            <h3>Replacement Tracking</h3>
            {rows.map((row) => (
                <div className="customer-replacement-status-row" key={row.id}>
                    <div>
                        {row.item.image && (
                            <img
                                src={row.item.image}
                                alt=""
                                className="customer-replacement-thumbnail"
                            />
                        )}
                        <strong>{row.item.name}</strong>
                        <p>
                            {row.item.variantLabel} · Quantity: {row.quantity}
                        </p>
                        <p>{row.status}</p>
                        <p>{row.reason}</p>
                        <p>{row.description}</p>
                        <ol className="customer-replacement-history">
                            {(row.history || []).map((entry, index) => (
                                <li key={`${entry.date}-${index}`}>
                                    <strong>{entry.status}</strong>
                                    <p>{entry.note}</p>
                                    <small>{formatDateTime(entry.date)}</small>
                                </li>
                            ))}
                        </ol>
                        <small>Requested: {formatDateTime(row.createdAt)}</small>
                        {!["Rejected", "Completed"].includes(row.status) && (
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => showCode(row)}
                            >
                                View My Handover OTP
                            </button>
                        )}
                        {code?.id === row.id && (
                            <p role="status">
                                <strong>{code.otp}</strong> · Expires{" "}
                                {formatDateTime(code.expiresAt)}. Share only during handover.
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </section>
    );
}
export default function ReplacementRequest(props) {
    if (!props.open) return null;
    return <ReplacementRequestContent key={props.order?._id || props.order?.id} {...props} />;
}
