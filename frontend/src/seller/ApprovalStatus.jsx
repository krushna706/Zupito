import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@mui/material";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

const STATUS_INFO = {
    Pending: {
        icon: "fa-clock",
        title: "Your application is under review",
        description:
            "The Zupito team is reviewing your store details and registration information.",
        next: "Keep your contact information available while the application is reviewed.",
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
        next: "Contact support if you need clarification about the decision.",
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
    const { refreshUser } = useAuth();
    const [updated, setUpdated] = useState(() => new Date());
    const [busy, setBusy] = useState(false);

    const seller = user?.seller;
    const currentStatus = seller?.status || "Pending";
    const info = STATUS_INFO[currentStatus] || STATUS_INFO.Pending;
    const approved = currentStatus === "Approved";

    const refresh = async () => {
        if (busy) return;
        setBusy(true);

        try {
            await refreshUser();
            setUpdated(new Date());
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };

    const timeline = [
        {
            title: "Application submitted",
            text: "Seller and store details received.",
            complete: true,
        },
        {
            title: "Application verification",
            text:
                currentStatus === "Pending"
                    ? "Account and store verification is pending."
                    : "Account and store information reviewed.",
            complete: currentStatus !== "Pending",
        },
        {
            title: currentStatus === "Pending" ? "Awaiting decision" : `${currentStatus} status`,
            text: currentStatus === "Pending" ? "Admin decision is pending." : info.next,
            complete: currentStatus !== "Pending",
        },
    ];

    return (
        <div className="seller-approval">
            <header className="sa-hero">
                <div>
                    <h1>
                        <i className="fa-solid fa-clipboard-check" aria-hidden="true" />
                        APPROVAL STATUS
                    </h1>
                    <p>
                        Track your seller application, review the decision and manage your next
                        steps.
                    </p>
                </div>

                <Button
                    variant="outlined"
                    className="sa-refresh"
                    onClick={refresh}
                    disabled={busy}
                    startIcon={<i className="fa-solid fa-arrows-rotate" aria-hidden="true" />}
                >
                    {busy ? "Refreshing…" : "Refresh"}
                </Button>
            </header>

            <section className={`sa-status-banner is-${currentStatus.toLowerCase()}`}>
                <span className="sa-status-icon">
                    <i className={`fa-solid ${info.icon}`} aria-hidden="true" />
                </span>
                <div className="sa-status-copy">
                    <span className="sa-status-eyebrow">Seller Application</span>
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
                        <InfoItem icon="fa-shop" label="Store Name" value={seller?.storeName} />
                        <InfoItem icon="fa-user" label="Applicant Name" value={user?.name} />
                        <InfoItem icon="fa-hashtag" label="Application ID" value={seller?.id} />
                        <InfoItem
                            icon="fa-calendar"
                            label="Application Date"
                            value={dateLabel(seller?.createdAt)}
                        />
                        <InfoItem icon="fa-envelope" label="Email Address" value={user?.email} />
                        <InfoItem icon="fa-phone" label="Mobile Number" value={user?.phone} />
                        <InfoItem
                            icon="fa-location-dot"
                            label="Store Location"
                            value={[seller?.pickupAddress?.city, seller?.pickupAddress?.state]
                                .filter(Boolean)
                                .join(", ")}
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
                        {timeline.map((item) => (
                            <li
                                key={item.title}
                                className={item.complete ? "is-complete" : "is-active"}
                            >
                                <span className="sa-step-marker">
                                    <i
                                        className={`fa-solid ${item.complete ? "fa-check" : "fa-clock"}`}
                                        aria-hidden="true"
                                    />
                                </span>
                                <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>

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
                    <p className="sa-remarks">
                        {seller?.remarks || "No remarks have been added by the admin."}
                    </p>
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
                        {approved ? (
                            <>
                                <Link to="/manage/store">
                                    <i className="fa-solid fa-store" aria-hidden="true" />
                                    Store Profile
                                </Link>
                                <Link to="/manage/products">
                                    <i className="fa-solid fa-box-open" aria-hidden="true" />
                                    Manage Products
                                </Link>
                            </>
                        ) : (
                            <Link to="/contact">
                                <i className="fa-solid fa-headset" aria-hidden="true" />
                                Contact Support
                            </Link>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default ApprovalStatus;
