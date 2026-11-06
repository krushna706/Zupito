
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, MenuItem, TextField } from "@mui/material";

const STORAGE_KEY = "zupito_admin_sellers";

const STATUS_INFO = {
    Pending: {
        icon: "fa-clock",
        title: "Your application is under review",
        description: "The Zupito team is reviewing your store details and registration information.",
        next: "Review the submitted details and keep your store information up to date.",
    },
    Approved: {
        icon: "fa-circle-check",
        title: "Your seller account is approved",
        description: "Your store is ready for product listings and seller operations.",
        next: "Complete your store profile, add products and manage your inventory.",
    },
    Rejected: {
        icon: "fa-circle-xmark",
        title: "Your application was not approved",
        description: "Review the admin remarks to understand the registration decision.",
        next: "Correct any missing store information before contacting the support team.",
    },
    Suspended: {
        icon: "fa-circle-exclamation",
        title: "Your seller account is suspended",
        description: "New selling activity is restricted until the account is reviewed.",
        next: "Review the reason and contact support for help with reactivation.",
    },
};

const dateLabel = (value) => {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Not available"
        : date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
};

function loadApplication(user) {
    try {
        const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const email = String(user?.email || "").toLowerCase();
        const mobile = String(user?.phone || "");

        const matched = Array.isArray(records) && records.find((item) =>
            (email && String(item.email || "").toLowerCase() === email) ||
            (mobile && String(item.mobile || "") === mobile)
        );

        if (matched) return { ...matched, isDemo: false };
    } catch {
        // Continue with preview data if local records are unavailable.
    }

    return {
        id: "PREVIEW-SELLER",
        name: user?.name || "Seller",
        email: user?.email || "",
        mobile: user?.phone || "",
        storeName: "Zupito Seller Store",
        city: "",
        state: "",
        appliedAt: "",
        status: "Pending",
        remarks: "",
        isDemo: true,
    };
}

function InfoItem({ icon, label, value }) {
    return (
        <div className="sa-info-item">
            <span className="sa-info-icon">
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
            </span>

            <div>
                <small>{label}</small>
                <strong>{value || "Not provided"}</strong>
            </div>
        </div>
    );
}

function ApprovalStatus({ user }) {
    const [application, setApplication] = useState(() => loadApplication(user));
    const [preview, setPreview] = useState("Actual");
    const [updated, setUpdated] = useState(() => new Date());

    const refresh = () => {
        setApplication(loadApplication(user));
        setPreview("Actual");
        setUpdated(new Date());
    };

    useEffect(() => {
        const handleRefresh = () => {
            setApplication(loadApplication(user));
            setUpdated(new Date());
        };

        window.addEventListener("focus", handleRefresh);
        window.addEventListener("storage", handleRefresh);

        return () => {
            window.removeEventListener("focus", handleRefresh);
            window.removeEventListener("storage", handleRefresh);
        };
    }, [user]);

    const currentStatus = preview === "Actual" ? application.status : preview;
    const info = STATUS_INFO[currentStatus] || STATUS_INFO.Pending;
    const isPreview = application.isDemo || preview !== "Actual";

    const remarks = preview !== "Actual"
        ? "Sample status selected for design preview. No admin record was changed."
        : application.remarks || "No remarks have been added by the admin.";

    const timeline = [
        {
            title: "Application submitted",
            text: application.isDemo
                ? "Sample application for UI review."
                : "Seller and store details received.",
        },
        {
            title: "Application verification",
            text: application.isDemo
                ? "Preview of the verification stage."
                : "Account and store information reviewed.",
        },
        {
            title: currentStatus === "Pending"
                ? "Awaiting decision"
                : `${currentStatus} status`,
            text: currentStatus === "Pending"
                ? "Admin decision is pending."
                : info.next,
        },
    ];

    return (
        <div className="seller-approval">
            {/* Page Header */}
            <header className="sa-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-clipboard-check" aria-hidden="true" />
                        APPROVAL STATUS
                    </h1>
                    <p>
                        Track your seller application, review the decision
                        and manage your next steps.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="sa-refresh"
                    onClick={refresh}
                    startIcon={<i className="fa-solid fa-arrows-rotate" aria-hidden="true" />}
                >
                    Refresh
                </Button>
            </header>

            {/* Status Preview */}
            <div className="sa-preview-bar">
                <span>
                    <i className="fa-solid fa-eye" aria-hidden="true" />
                    Frontend preview: all seller pages remain accessible.
                </span>

                <TextField
                    select
                    label="Preview Status"
                    size="small"
                    value={preview}
                    onChange={(event) => setPreview(event.target.value)}
                    className="sa-preview-select"
                >
                    <MenuItem value="Actual">Current Record</MenuItem>

                    {Object.keys(STATUS_INFO).map((value) => (
                        <MenuItem key={value} value={value}>
                            {value}
                        </MenuItem>
                    ))}
                </TextField>
            </div>

            {/* Application Status */}
            <section className={`sa-status-banner is-${currentStatus.toLowerCase()}`}>
                <span className="sa-status-icon">
                    <i className={`fa-solid ${info.icon}`} aria-hidden="true" />
                </span>

                <div className="sa-status-copy">
                    <span className="sa-status-eyebrow">
                        Seller Application {isPreview ? "· Demo Preview" : ""}
                    </span>

                    <h2>{info.title}</h2>
                    <p>{info.description}</p>

                    <span className={`sa-badge is-${currentStatus.toLowerCase()}`}>
                        <i className="fa-solid fa-circle" aria-hidden="true" />
                        {currentStatus}
                    </span>
                </div>

                <div className="sa-status-art" aria-hidden="true">
                    <i className={`fa-solid ${info.icon}`} />
                </div>
            </section>

            {/* Application and Progress */}
            <div className="sa-grid">
                <section className="sa-card">
                    <div className="sa-card-heading">
                        <span className="sa-card-icon">
                            <i className="fa-solid fa-store" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Application Details</h2>
                            <p>Your submitted store and contact information.</p>
                        </div>
                    </div>

                    <div className="sa-info-grid">
                        <InfoItem icon="fa-shop" label="Store Name" value={application.storeName} />
                        <InfoItem icon="fa-user" label="Applicant Name" value={application.name} />
                        <InfoItem icon="fa-hashtag" label="Application ID" value={application.id} />
                        <InfoItem icon="fa-calendar" label="Application Date" value={dateLabel(application.appliedAt)} />
                        <InfoItem icon="fa-envelope" label="Email Address" value={application.email} />
                        <InfoItem icon="fa-phone" label="Mobile Number" value={application.mobile} />
                        <InfoItem
                            icon="fa-location-dot"
                            label="Store Location"
                            value={[application.city, application.state].filter(Boolean).join(", ")}
                        />
                        <InfoItem
                            icon="fa-clock"
                            label="Last Refreshed"
                            value={updated.toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        />
                    </div>
                </section>

                <section className="sa-card">
                    <div className="sa-card-heading">
                        <span className="sa-card-icon">
                            <i className="fa-solid fa-list-check" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Application Progress</h2>
                            <p>Current review and decision timeline.</p>
                        </div>
                    </div>

                    <ol className="sa-timeline">
                        {timeline.map((step, index) => (
                            <li
                                key={step.title}
                                className={
                                    index === 2 && currentStatus === "Pending"
                                        ? "is-active"
                                        : "is-complete"
                                }
                            >
                                <span className="sa-step-marker">
                                    <i
                                        className={`fa-solid ${
                                            index < 2 || currentStatus !== "Pending"
                                                ? "fa-check"
                                                : "fa-clock"
                                        }`}
                                        aria-hidden="true"
                                    />
                                </span>

                                <div>
                                    <strong>{step.title}</strong>
                                    <p>{step.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>

            {/* Remarks and Next Steps */}
            <div className="sa-bottom-grid">
                <section className="sa-card sa-message">
                    <div className="sa-card-heading">
                        <span className="sa-card-icon">
                            <i className="fa-solid fa-message" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Admin Remarks</h2>
                            <p>Feedback regarding your seller application.</p>
                        </div>
                    </div>

                    <p className="sa-remarks">{remarks}</p>
                </section>

                <section className="sa-card sa-next">
                    <div className="sa-card-heading">
                        <span className="sa-card-icon">
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </span>

                        <div>
                            <h2>Next Steps</h2>
                            <p>{info.next}</p>
                        </div>
                    </div>

                    <div className="sa-links">
                        <Link to="/manage/store">
                            <i className="fa-solid fa-store" aria-hidden="true" />
                            Store Profile
                        </Link>

                        <Link to="/manage/products">
                            <i className="fa-solid fa-box-open" aria-hidden="true" />
                            Manage Products
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default ApprovalStatus;
