import { Link } from "react-router-dom";
import { appConfig } from "../config/appConfig";

const policyNavigation = [
    {
        id: "shipping-delivery",
        title: "Shipping & Delivery",
        icon: "fa-truck-fast"
    },
    {
        id: "order-cancellation",
        title: "Order Cancellation",
        icon: "fa-ban"
    },
    {
        id: "cancellation-refunds",
        title: "Cancellation Refunds",
        icon: "fa-money-bill-transfer"
    },
    {
        id: "product-replacements",
        title: "Product Replacements",
        icon: "fa-rotate"
    },
    {
        id: "online-payments",
        title: "Online Payments",
        icon: "fa-credit-card"
    },
    {
        id: "account-privacy",
        title: "Account & Privacy",
        icon: "fa-shield-halved"
    }
];

const policyHighlights = [
    {
        icon: "fa-credit-card",
        title: "Secure Checkout",
        description: "Online payments only"
    },
    {
        icon: "fa-box",
        title: "Order Cancellation",
        description: "Eligible before pickup"
    },
    {
        icon: "fa-rotate",
        title: "Product Replacement",
        description: "Subject to eligibility"
    }
];

const deliveryFeatures = [
    {
        icon: "fa-location-dot",
        title: "Delivery Address",
        description: "Select an accurate delivery location before placing your order."
    },
    {
        icon: "fa-boxes-stacked",
        title: "Multiple Parcels",
        description: "Products from different sellers may be delivered separately."
    },
    {
        icon: "fa-shield-halved",
        title: "Delivery Verification",
        description: "Eligible deliveries are completed using customer OTP verification."
    }
];

const refundSteps = [
    {
        number: "01",
        title: "Cancellation Confirmed",
        description: "The eligible order or parcel cancellation is approved."
    },
    {
        number: "02",
        title: "Refund Processing",
        description: "The applicable refund is submitted for processing."
    },
    {
        number: "03",
        title: "Refund Confirmation",
        description: "The status is updated after payment-provider confirmation."
    }
];

const replacementSteps = [
    {
        number: "01",
        icon: "fa-file-lines",
        title: "Submit Request",
        description: "Choose the eligible item, reason and supporting images."
    },
    {
        number: "02",
        icon: "fa-clipboard-check",
        title: "Request Review",
        description: "The request is reviewed for eligibility and stock availability."
    },
    {
        number: "03",
        icon: "fa-truck-ramp-box",
        title: "Return Pickup",
        description: "An approved request proceeds to pickup and seller inspection."
    },
    {
        number: "04",
        icon: "fa-box-open",
        title: "Replacement Delivery",
        description: "An approved replacement is delivered with a fresh delivery OTP."
    }
];

const supportedCategories = ["Electronics", "Fashion", "Groceries", "Bags & Travel"];

function Policies() {
    return (
        <main className="policies-page">
            {/* Shared Website Hero */}
            <section className="website-story-hero policies-hero">
                <div className="container-fluid website-shell website-story-hero-content">
                    <nav className="products-breadcrumb" aria-label="Breadcrumb">
                        <Link to="/">Home</Link>
                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        <span aria-current="page">Shopping Policies</span>
                    </nav>

                    <div className="policies-hero-content">
                        <span className="policies-hero-label">SHOP WITH CLARITY</span>

                        <h1>
                            Shopping made clear.
                            <span> Every step of the way.</span>
                        </h1>

                        <p>
                            Understand how delivery, cancellation, refunds, replacements and online payments
                            work at {appConfig.name}.
                        </p>
                    </div>
                </div>
            </section>

            {/* Policy Highlights */}
            <div className="container-fluid website-shell">
                <div className="policies-highlight-grid">
                    {policyHighlights.map((highlight) => (
                        <div className="policies-highlight-card" key={highlight.title}>
                            <span className="policies-highlight-icon">
                                <i className={`fa-solid ${highlight.icon}`} aria-hidden="true" />
                            </span>

                            <div>
                                <strong>{highlight.title}</strong>
                                <p>{highlight.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Policy Content */}
            <section className="policies-content-section">
                <div className="container-fluid website-shell">
                    <div className="policies-intro">
                        <div>
                            <span className="policies-section-label">IMPORTANT INFORMATION</span>

                            <h2>
                                Know your <span>shopping policies.</span>
                            </h2>

                            <p>
                                We've organized the key shopping terms into simple sections so you can find
                                the information you need.
                            </p>
                        </div>

                        <span className="policies-intro-icon">
                            <i className="fa-solid fa-file-shield" aria-hidden="true" />
                        </span>
                    </div>

                    <div className="policies-layout">
                        {/* Policy Navigation */}
                        <aside className="policies-sidebar">
                            <div className="policies-sidebar-card">
                                <div className="policies-sidebar-header">
                                    <span>
                                        <i className="fa-solid fa-list-ul" aria-hidden="true" />
                                    </span>

                                    <div>
                                        <strong>Policy Guide</strong>
                                        <small>Browse by topic</small>
                                    </div>
                                </div>

                                <nav className="policies-navigation" aria-label="Shopping policy sections">
                                    {policyNavigation.map((item) => (
                                        <a href={`#${item.id}`} key={item.id}>
                                            <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                                            <span>{item.title}</span>
                                            <i
                                                className="fa-solid fa-chevron-right policies-navigation-arrow"
                                                aria-hidden="true"
                                            />
                                        </a>
                                    ))}
                                </nav>

                                <div className="policies-sidebar-help">
                                    <span>
                                        <i className="fa-solid fa-headset" aria-hidden="true" />
                                    </span>

                                    <strong>Need assistance?</strong>

                                    <p>Have a question about a policy or an order? Contact our team.</p>

                                    <Link to="/contact">
                                        Contact Us
                                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        </aside>

                        {/* Policy Sections */}
                        <div className="policies-sections">
                            {/* Shipping & Delivery */}
                            <section
                                id="shipping-delivery"
                                className="policies-card"
                                aria-labelledby="policies-delivery-title"
                            >
                                <div className="policies-card-heading">
                                    <span className="policies-card-icon">
                                        <i className="fa-solid fa-truck-fast" aria-hidden="true" />
                                    </span>

                                    <div>
                                        <span>01 / SHOPPING POLICIES</span>
                                        <h2 id="policies-delivery-title">Shipping & Delivery</h2>
                                    </div>
                                </div>

                                <p className="policies-card-lead">
                                    Delivery availability and applicable charges depend on your order and
                                    delivery location. Review the details during checkout before completing
                                    your purchase.
                                </p>

                                <div className="policies-mini-grid">
                                    {deliveryFeatures.map((feature) => (
                                        <div className="policies-mini-card" key={feature.title}>
                                            <span>
                                                <i
                                                    className={`fa-solid ${feature.icon}`}
                                                    aria-hidden="true"
                                                />
                                            </span>

                                            <strong>{feature.title}</strong>
                                            <p>{feature.description}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="policies-detail-list">
                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        Delivery charges and the payable total are shown in the checkout
                                        summary.
                                    </p>

                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        Delivery progress may differ for parcels fulfilled by different
                                        sellers.
                                    </p>

                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        The delivery address saved with an order remains part of that order's
                                        details.
                                    </p>
                                </div>

                                <div className="policies-note">
                                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                    <p>
                                        Delivery estimates and serviceability will depend on the destination
                                        and fulfilment availability.
                                    </p>
                                </div>
                            </section>

                            {/* Cancellation */}
                            <section
                                id="order-cancellation"
                                className="policies-card"
                                aria-labelledby="policies-cancellation-title"
                            >
                                <div className="policies-card-heading">
                                    <span className="policies-card-icon">
                                        <i className="fa-solid fa-ban" aria-hidden="true" />
                                    </span>

                                    <div>
                                        <span>02 / SHOPPING POLICIES</span>
                                        <h2 id="policies-cancellation-title">Order Cancellation</h2>
                                    </div>
                                </div>

                                <p className="policies-card-lead">
                                    Cancellation is available for eligible orders or seller parcels before
                                    they have been picked up for delivery.
                                </p>

                                <div className="policies-status-grid">
                                    <div className="policies-status-card policies-status-allowed">
                                        <span className="policies-status-icon">
                                            <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                        </span>

                                        <div>
                                            <strong>Before Pickup</strong>

                                            <p>
                                                You may request cancellation while the relevant order or
                                                parcel remains eligible.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="policies-status-card policies-status-limited">
                                        <span className="policies-status-icon">
                                            <i
                                                className="fa-solid fa-circle-exclamation"
                                                aria-hidden="true"
                                            />
                                        </span>

                                        <div>
                                            <strong>After Pickup</strong>

                                            <p>
                                                Normal pre-pickup cancellation is no longer available once the
                                                parcel has been collected.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="policies-detail-list">
                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        Cancellation eligibility is checked against the current fulfilment
                                        status.
                                    </p>

                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        If only one eligible seller parcel is cancelled, other parcels can
                                        continue through delivery.
                                    </p>

                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        An eligible confirmed cancellation starts the applicable refund
                                        process.
                                    </p>
                                </div>
                            </section>

                            {/* Cancellation Refunds */}
                            <section
                                id="cancellation-refunds"
                                className="policies-card"
                                aria-labelledby="policies-refund-title"
                            >
                                <div className="policies-card-heading">
                                    <span className="policies-card-icon">
                                        <i className="fa-solid fa-money-bill-transfer" aria-hidden="true" />
                                    </span>

                                    <div>
                                        <span>03 / SHOPPING POLICIES</span>
                                        <h2 id="policies-refund-title">Cancellation Refunds</h2>
                                    </div>
                                </div>

                                <p className="policies-card-lead">
                                    Refunds apply to confirmed eligible cancellations. A cancellation refund
                                    is different from a return-for-refund request after delivery.
                                </p>

                                <div className="policies-refund-steps">
                                    {refundSteps.map((step) => (
                                        <div className="policies-refund-step" key={step.number}>
                                            <span className="policies-step-number">{step.number}</span>

                                            <div>
                                                <strong>{step.title}</strong>
                                                <p>{step.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="policies-detail-list">
                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        The refund amount is calculated from the original cancelled
                                        allocation, including its applicable delivery charge.
                                    </p>

                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        Refund status is tracked as pending, completed or failed based on its
                                        actual processing outcome.
                                    </p>

                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />A refund
                                        is considered completed only after payment-provider confirmation.
                                    </p>
                                </div>

                                <div className="policies-note">
                                    <i className="fa-solid fa-clock" aria-hidden="true" />
                                    <p>
                                        Refund processing time may vary by payment provider and payment
                                        method. No fixed completion time is specified.
                                    </p>
                                </div>
                            </section>

                            {/* Product Replacements */}
                            <section
                                id="product-replacements"
                                className="policies-card"
                                aria-labelledby="policies-replacement-title"
                            >
                                <div className="policies-card-heading">
                                    <span className="policies-card-icon">
                                        <i className="fa-solid fa-rotate" aria-hidden="true" />
                                    </span>

                                    <div>
                                        <span>04 / SHOPPING POLICIES</span>
                                        <h2 id="policies-replacement-title">Product Replacements</h2>
                                    </div>
                                </div>

                                <p className="policies-card-lead">
                                    Eligible delivered products may qualify for replacement with the same
                                    product and variant, subject to category rules, request conditions and
                                    approval.
                                </p>

                                <div className="policies-category-panel">
                                    <div className="policies-category-heading">
                                        <span>
                                            <i className="fa-solid fa-layer-group" aria-hidden="true" />
                                        </span>

                                        <div>
                                            <strong>Category-Specific Eligibility</strong>
                                            <p>
                                                Replacement availability and request windows can differ by
                                                product category.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="policies-category-tags">
                                        {supportedCategories.map((category) => (
                                            <span key={category}>{category}</span>
                                        ))}
                                    </div>

                                    <p className="policies-category-footnote">
                                        Category listing here does not guarantee replacement eligibility.
                                        Always check the product's applicable conditions.
                                    </p>
                                </div>

                                <div className="policies-subheading">
                                    <h3>How replacements work</h3>
                                    <p>A straightforward process for eligible requests.</p>
                                </div>

                                <div className="policies-replacement-grid">
                                    {replacementSteps.map((step) => (
                                        <div className="policies-replacement-step" key={step.number}>
                                            <div className="policies-replacement-step-top">
                                                <span>
                                                    <i
                                                        className={`fa-solid ${step.icon}`}
                                                        aria-hidden="true"
                                                    />
                                                </span>

                                                <small>{step.number}</small>
                                            </div>

                                            <strong>{step.title}</strong>
                                            <p>{step.description}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="policies-note">
                                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                    <p>
                                        General return-for-refund requests are not part of the planned
                                        shopping flow. Replacements require eligibility, approval and the
                                        required inspection.
                                    </p>
                                </div>
                            </section>

                            {/* Online Payments */}
                            <section
                                id="online-payments"
                                className="policies-card"
                                aria-labelledby="policies-payments-title"
                            >
                                <div className="policies-card-heading">
                                    <span className="policies-card-icon">
                                        <i className="fa-solid fa-credit-card" aria-hidden="true" />
                                    </span>

                                    <div>
                                        <span>05 / SHOPPING POLICIES</span>
                                        <h2 id="policies-payments-title">Online Payments</h2>
                                    </div>
                                </div>

                                <p className="policies-card-lead">
                                    {appConfig.name} uses an online-payment checkout flow. Cash on Delivery is
                                    not available.
                                </p>

                                <div className="policies-payment-banner">
                                    <span>
                                        <i className="fa-solid fa-lock" aria-hidden="true" />
                                    </span>

                                    <div>
                                        <strong>Online Payment Only</strong>
                                        <p>Review the final order amount before proceeding to payment.</p>
                                    </div>
                                </div>

                                <div className="policies-detail-list">
                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        The checkout summary includes product totals, eligible offers,
                                        delivery charges and the final amount.
                                    </p>

                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        Payment status must be verified before an order is treated as
                                        successfully paid.
                                    </p>

                                    <p>
                                        <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                        Pending, failed and cancelled payments must be shown accurately. A
                                        retry should not create a duplicate order.
                                    </p>
                                </div>
                            </section>

                            {/* Account & Privacy */}
                            <section
                                id="account-privacy"
                                className="policies-card"
                                aria-labelledby="policies-privacy-title"
                            >
                                <div className="policies-card-heading">
                                    <span className="policies-card-icon">
                                        <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                                    </span>

                                    <div>
                                        <span>06 / SHOPPING POLICIES</span>
                                        <h2 id="policies-privacy-title">Account & Privacy</h2>
                                    </div>
                                </div>

                                <p className="policies-card-lead">
                                    Customer accounts, delivery details and order information are intended to
                                    be accessible only through the appropriate authorized account.
                                </p>

                                <div className="policies-privacy-grid">
                                    <div>
                                        <span>
                                            <i className="fa-solid fa-user-lock" aria-hidden="true" />
                                        </span>

                                        <strong>Account Access</strong>
                                        <p>
                                            Private profile information and order history require appropriate
                                            customer authentication.
                                        </p>
                                    </div>

                                    <div>
                                        <span>
                                            <i className="fa-solid fa-address-book" aria-hidden="true" />
                                        </span>

                                        <strong>Saved Addresses</strong>
                                        <p>
                                            Customers can manage saved addresses without changing the delivery
                                            snapshot of an existing order.
                                        </p>
                                    </div>
                                </div>

                                <div className="policies-note">
                                    <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                                    <p>
                                        Never share passwords, verification codes or sensitive payment
                                        information through general support messages.
                                    </p>
                                </div>
                            </section>

                            {/* Final Help */}
                            <div className="policies-help-banner">
                                <div className="policies-help-icon">
                                    <i className="fa-solid fa-headset" aria-hidden="true" />
                                </div>

                                <div>
                                    <span>STILL HAVE QUESTIONS?</span>
                                    <h2>We're here to help.</h2>
                                    <p>
                                        Need clarification about an order, cancellation or replacement? Reach
                                        out through Contact Us.
                                    </p>
                                </div>

                                <Link to="/contact">
                                    Contact Us
                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Policies;
