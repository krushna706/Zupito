
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
} from "@mui/material";
import { toast } from "react-toastify";

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const complaintCategories = [
    { value: "order", label: "Order & Delivery" },
    { value: "payment", label: "Payment Issue" },
    { value: "product", label: "Product Issue" },
    { value: "replacement", label: "Replacement Request" },
    { value: "account", label: "Account Issue" },
    { value: "other", label: "Other" },
];

const supportTopics = [
    {
        icon: "fa-box",
        title: "Orders & Delivery",
        description: "Delivery delays, tracking or order concerns.",
    },
    {
        icon: "fa-credit-card",
        title: "Payments",
        description: "Payment failures or transaction-related issues.",
    },
    {
        icon: "fa-rotate",
        title: "Replacements",
        description: "Questions about eligible replacement requests.",
    },
    {
        icon: "fa-user-shield",
        title: "Account Support",
        description: "Help with your account or personal information.",
    },
];

const initialForm = {
    category: "",
    orderId: "",
    subject: "",
    description: "",
};

// ================== COMPLAINT VALIDATION ==================
function validateComplaint(form) {
    const errors = {};

    if (!form.category) {
        errors.category = "Please select a complaint category.";
    }

    if (form.orderId.trim().length > 60) {
        errors.orderId = "Order ID must not exceed 60 characters.";
    }

    const subject = form.subject.trim();

    if (subject.length < 5 || subject.length > 100) {
        errors.subject = "Subject must contain 5 to 100 characters.";
    }

    const description = form.description.trim();

    if (description.length < 20 || description.length > 1500) {
        errors.description = "Description must contain 20 to 1500 characters.";
    }

    return errors;
}

// ================== MY COMPLAINTS ==================
function Complaints() {
    const fileInputRef = useRef(null);
    const [searchParams] = useSearchParams();
    const prefillOrderId = String(searchParams.get("orderId") || "").trim().slice(0, 60);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState(initialForm);
    const [formErrors, setFormErrors] = useState({});
    const [attachment, setAttachment] = useState(null);

    // Open the existing complaint form with the selected order prefilled.
    useEffect(() => {
        if (!prefillOrderId) return;
        setFormData({ ...initialForm, category: "order", orderId: prefillOrderId });
        setFormErrors({});
        setAttachment(null);
        setDialogOpen(true);
    }, [prefillOrderId]);

    // ================== DIALOG CONTROLS ==================
    const openDialog = () => {
        setFormData({ ...initialForm });
        setFormErrors({});
        setAttachment(null);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setFormData({ ...initialForm });
        setFormErrors({});
        setAttachment(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // ================== FORM INPUT ==================
    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (formErrors[name]) {
            setFormErrors((previous) => ({
                ...previous,
                [name]: "",
            }));
        }
    };

    // ================== ATTACHMENT ==================
    const handleAttachmentChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            toast.error("Upload a JPG, JPEG, PNG or WebP image.");
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            toast.error("Attachment must be 3 MB or smaller.");
            return;
        }

        setAttachment(file);
    };

    // ================== SUBMIT COMPLAINT ==================
    const handleSubmit = (event) => {
        event.preventDefault();

        const errors = validateComplaint(formData);

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        // Complaint creation will connect to the backend later.
        toast.info(
            "Complaint submissions will be available after account integration."
        );
    };

    return (
        <div className="customer-complaints-page">

            {/* Page Heading */}
            <div className="customer-complaints-heading">
                <div>
                    <span className="customer-complaints-eyebrow">
                        CUSTOMER SUPPORT
                    </span>

                    <h2>My Complaints</h2>

                    <p>
                        Submit your concerns and keep track of
                        your support requests in one place.
                    </p>
                </div>

                <button
                    type="button"
                    className="customer-complaints-add-button"
                    onClick={openDialog}
                >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    Raise a Complaint
                </button>
            </div>

            {/* Support Banner */}
            <div className="customer-complaints-banner">
                <div className="customer-complaints-banner-content">
                    <span>
                        <i
                            className="fa-solid fa-headset"
                            aria-hidden="true"
                        />
                        ZUPITO SUPPORT
                    </span>

                    <h3>Need help with something?</h3>

                    <p>
                        We're here to help with shopping, delivery,
                        payment and account-related concerns.
                    </p>

                    <button type="button" onClick={openDialog}>
                        Create Support Request

                        <i
                            className="fa-solid fa-arrow-right"
                            aria-hidden="true"
                        />
                    </button>
                </div>

                <span className="customer-complaints-banner-art">
                    <i
                        className="fa-solid fa-comments"
                        aria-hidden="true"
                    />
                </span>
            </div>

            {/* Main Content */}
            <div className="customer-complaints-grid">

                {/* Complaint History */}
                <section className="customer-complaints-history">
                    <div className="customer-complaints-history-header">
                        <div>
                            <h3>Support Requests</h3>

                            <p>
                                View your submitted complaints
                                and their current status.
                            </p>
                        </div>

                        <span className="customer-complaints-count">
                            0 Requests
                        </span>
                    </div>

                    {/* Empty State */}
                    <div className="customer-complaints-empty">
                        <div className="customer-complaints-empty-art">
                            <span>
                                <i
                                    className="fa-regular fa-clipboard"
                                    aria-hidden="true"
                                />
                            </span>

                            <i
                                className="fa-solid fa-circle-check"
                                aria-hidden="true"
                            />
                        </div>

                        <h4>No complaints yet</h4>

                        <p>
                            Your support requests will appear here
                            once you've submitted a complaint.
                        </p>

                        <button type="button" onClick={openDialog}>
                            <i
                                className="fa-solid fa-plus"
                                aria-hidden="true"
                            />
                            Raise Your First Complaint
                        </button>
                    </div>
                </section>

                {/* Support Information */}
                <aside className="customer-complaints-support">
                    <div className="customer-complaints-support-heading">
                        <span>
                            <i
                                className="fa-solid fa-circle-question"
                                aria-hidden="true"
                            />
                        </span>

                        <div>
                            <h3>How can we help?</h3>

                            <p>Common support topics</p>
                        </div>
                    </div>

                    <div className="customer-complaints-topics">
                        {supportTopics.map((topic) => (
                            <div
                                className="customer-complaints-topic"
                                key={topic.title}
                            >
                                <span>
                                    <i
                                        className={`fa-solid ${topic.icon}`}
                                        aria-hidden="true"
                                    />
                                </span>

                                <div>
                                    <strong>{topic.title}</strong>

                                    <p>{topic.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="customer-complaints-support-note">
                        <i
                            className="fa-solid fa-lightbulb"
                            aria-hidden="true"
                        />

                        <p>
                            For order-related issues, include your
                            Order ID and a clear description.
                        </p>
                    </div>
                </aside>
            </div>

            {/* Information Note */}
            <div className="customer-complaints-info">
                <i
                    className="fa-solid fa-shield-halved"
                    aria-hidden="true"
                />

                <p>
                    Please avoid sharing passwords, OTPs or
                    sensitive payment details in support requests.
                </p>
            </div>

            {/* New Complaint Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={closeDialog}
                fullWidth
                maxWidth="sm"
                className="customer-complaint-dialog"
                aria-labelledby="customer-complaint-dialog-title"
            >
                <DialogTitle id="customer-complaint-dialog-title">
                    <span className="customer-complaint-dialog-heading">
                        <span>
                            <i
                                className="fa-solid fa-headset"
                                aria-hidden="true"
                            />
                        </span>

                        <span>
                            <strong>Raise a Complaint</strong>

                            <small>
                                Tell us about your concern.
                            </small>
                        </span>
                    </span>
                </DialogTitle>

                <DialogContent dividers>
                    <form
                        id="customer-complaint-form"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <div className="customer-complaint-form">
                            <TextField
                                select
                                name="category"
                                label="Complaint Category"
                                value={formData.category}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.category)}
                                helperText={formErrors.category}
                                size="small"
                                fullWidth
                                required
                            >
                                {complaintCategories.map((category) => (
                                    <MenuItem
                                        key={category.value}
                                        value={category.value}
                                    >
                                        {category.label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                name="orderId"
                                label="Order ID (Optional)"
                                placeholder="Enter Order ID if applicable"
                                value={formData.orderId}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.orderId)}
                                helperText={
                                    formErrors.orderId ||
                                    "Recommended for order-related complaints."
                                }
                                size="small"
                                fullWidth
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 60,
                                    },
                                }}
                            />

                            <TextField
                                name="subject"
                                label="Subject"
                                placeholder="Briefly describe your issue"
                                value={formData.subject}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.subject)}
                                helperText={formErrors.subject}
                                size="small"
                                fullWidth
                                required
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 100,
                                    },
                                }}
                            />

                            <TextField
                                name="description"
                                label="Description"
                                placeholder="Explain what happened and how we can help..."
                                value={formData.description}
                                onChange={handleInputChange}
                                error={Boolean(formErrors.description)}
                                helperText={formErrors.description}
                                size="small"
                                fullWidth
                                multiline
                                minRows={4}
                                required
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 1500,
                                    },
                                }}
                            />

                            {/* Attachment */}
                            <div className="customer-complaint-upload">
                                <div className="customer-complaint-upload-heading">
                                    <strong>Supporting Image</strong>
                                    <span>Optional</span>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp"
                                    onChange={handleAttachmentChange}
                                    className="d-none"
                                    aria-label="Upload supporting image"
                                />

                                <button
                                    type="button"
                                    className="customer-complaint-upload-button"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <i
                                        className="fa-solid fa-cloud-arrow-up"
                                        aria-hidden="true"
                                    />

                                    <span>
                                        {attachment
                                            ? "Change Attachment"
                                            : "Choose Image"}
                                    </span>
                                </button>

                                {attachment && (
                                    <div className="customer-complaint-file">
                                        <i
                                            className="fa-solid fa-image"
                                            aria-hidden="true"
                                        />

                                        <span title={attachment.name}>
                                            {attachment.name}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => setAttachment(null)}
                                            aria-label="Remove attachment"
                                        >
                                            <i
                                                className="fa-solid fa-xmark"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                )}

                                <p>
                                    JPG, PNG or WebP • Maximum 3 MB
                                </p>
                            </div>
                        </div>
                    </form>
                </DialogContent>

                <DialogActions className="customer-complaint-dialog-actions">
                    <button
                        type="button"
                        className="customer-complaint-cancel"
                        onClick={closeDialog}
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        form="customer-complaint-form"
                        className="customer-complaint-submit"
                    >
                        <i
                            className="fa-solid fa-paper-plane"
                            aria-hidden="true"
                        />

                        Submit Complaint
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Complaints;
