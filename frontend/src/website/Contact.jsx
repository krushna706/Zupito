
import { useState } from "react";
import { Link } from "react-router-dom";
import { MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";

import { appConfig } from "../config/appConfig";

const initialForm = {
    name: "",
    email: "",
    phone: "",
    subject: "",
    orderId: "",
    message: "",
};

const subjects = [
    "Orders & Delivery",
    "Payment & Checkout",
    "Offers & Coupons",
    "Account & Addresses",
    "Replacement Request",
    "Seller Enquiry",
    "Other Enquiry",
];

const contactMethods = [
    {
        title: "Call us",
        value: "+91 7064341545",
        icon: "fa-phone",
        action: "Call Now",
        href: "tel:+917064341545",
    },
    {
        title: "Email us",
        value: "krushna@gmail.com",
        icon: "fa-envelope",
        action: "Send Email",
        href: "mailto:krushna@gmail.com",
    },
    {
        title: "Our location",
        value: "253R+8V3, Kakatpur-Astaranga Rd, Kakatpur, Odisha 752108",
        icon: "fa-location-dot",
        action: "Get Directions",
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            "253R+8V3, Kakatpur-Astaranga Rd, Kakatpur, Odisha 752108"
        )}`,
        external: true,
    },
];

const faqs = [
    {
        question: "How can I manage multiple delivery addresses?",
        answer: "During checkout, you can select a saved delivery address, edit an existing one, delete an address you no longer use, or add a new location. Your selected address is displayed before you continue to payment.",
    },
    {
        question: "How are delivery charges calculated?",
        answer: "The current checkout preview offers free delivery on orders of ₹499 or more. Orders below ₹499 have a ₹40 delivery charge. The applicable charge and final total appear in your Order Summary before payment.",
    },
    {
        question: "Where can I apply a coupon code?",
        answer: "Open your cart and proceed to checkout. In the Order Summary, enter your coupon in the Apply Coupon field and click Apply. If the coupon meets the offer conditions, the discount will be reflected in your payable total.",
    },
    {
        question: "What if my coupon code is not working?",
        answer: "Check the coupon spelling, minimum order amount and offer conditions. If your cart does not meet the requirements, the coupon will not apply. You can remove an applied coupon and try another eligible offer.",
    },
    {
        question: "What happens if my payment fails or is cancelled?",
        answer: "You can return to checkout and review your details before trying again. Your cart items remain available during the current frontend payment simulation. Live payment processing will be connected during backend integration.",
    },
    {
        question: "Can I change my address before payment?",
        answer: "Yes. On the payment review step, use Change Address or Edit to update the delivery location. You can also add a new address and select it without entering your previous address details again.",
    },
    {
        question: "How can I ask a question about an order?",
        answer: "You can call or email us using the contact details above. Include your order reference when available, along with a short explanation of your question. The enquiry form will support direct submissions after backend integration.",
    },
    {
        question: "How can I enquire about a replacement?",
        answer: "Select Replacement Request in the enquiry form or contact us by phone or email. Include your order reference and describe the product issue. Replacement eligibility and the applicable process will follow Zupito's policies.",
    },
];

const faqColumns = [
    faqs.slice(0, 4),
    faqs.slice(4),
];

// ================== CONTACT VALIDATION ==================
function validateContact(form) {
    const value = (key) => String(form[key] ?? "").trim();

    return {
        name: value("name").length >= 2
            ? ""
            : "Enter a valid full name.",

        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))
            ? ""
            : "Enter a valid email address.",

        phone: !value("phone") || /^[6-9]\d{9}$/.test(value("phone"))
            ? ""
            : "Enter a valid 10-digit mobile number.",

        subject: subjects.includes(value("subject"))
            ? ""
            : "Please select an enquiry type.",

        message: value("message").length >= 15
            ? ""
            : "Please enter at least 15 characters.",
    };
}

// ================== CONTACT PAGE ==================
function Contact() {
    const [form, setForm] = useState(initialForm);
    const [submitted, setSubmitted] = useState(false);

    const errors = validateContact(form);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: name === "phone"
                ? value.replace(/\D/g, "")
                : value,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setSubmitted(true);

        const invalidField = Object.keys(errors).find(
            (key) => errors[key]
        );

        if (invalidField) {
            toast.error("Please complete the required contact details.");

            event.currentTarget
                .querySelector(`[name="${invalidField}"]`)
                ?.focus();

            return;
        }

        // Connect the enquiry API during backend implementation.
        toast.info("Enquiry submissions will be available soon.");
    };

    return (
        <main className="contact-page">

            {/* Contact Hero */}
            <section className="website-story-hero contact-hero">
                <div className="container-fluid website-shell website-story-hero-content">
                    <nav className="products-breadcrumb" aria-label="Breadcrumb">
                        <Link to="/">Home</Link>
                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        <span aria-current="page">Contact Us</span>
                    </nav>

                    <div className="contact-hero-text">
                        <span className="contact-hero-eyebrow">
                            WE'RE HERE TO HELP
                        </span>

                        <h1>
                            Let's make shopping
                            <span> easier together.</span>
                        </h1>

                        <p>
                            Have questions about products, orders or delivery?
                            Connect with {appConfig.name} using the option
                            that's most convenient for you.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Form & Information */}
            <section className="contact-content-section">
                <div className="container-fluid website-shell">

                    <div className="contact-section-heading">
                        <div>
                            <span className="contact-section-label">
                                GET IN TOUCH
                            </span>

                            <h2>
                                We'd love to <span>hear from you.</span>
                            </h2>
                        </div>
                    </div>

                    <div className="contact-main-grid">

                        {/* Enquiry Form */}
                        <section
                            id="contact-form"
                            className="contact-form-card"
                            aria-labelledby="contact-form-title"
                        >
                            <div className="contact-form-header">
                                <span className="contact-form-header-icon">
                                    <i className="fa-regular fa-envelope" aria-hidden="true" />
                                </span>

                                <div>
                                    <h2 id="contact-form-title">Send an Enquiry</h2>
                                    <p>
                                        Share your question and contact details.
                                    </p>
                                </div>
                            </div>

                            <form
                                className="contact-form"
                                onSubmit={handleSubmit}
                                noValidate
                            >
                                <div className="contact-fields-grid">

                                    <TextField
                                        name="name"
                                        label="Full Name"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        required
                                        value={form.name}
                                        onChange={handleChange}
                                        autoComplete="name"
                                        error={submitted && Boolean(errors.name)}
                                        helperText={submitted ? errors.name : ""}
                                        slotProps={{
                                            htmlInput: { maxLength: 80 },
                                        }}
                                    />

                                    <TextField
                                        name="email"
                                        label="Email Address"
                                        type="email"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        required
                                        value={form.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                        error={submitted && Boolean(errors.email)}
                                        helperText={submitted ? errors.email : ""}
                                        slotProps={{
                                            htmlInput: { maxLength: 120 },
                                        }}
                                    />

                                    <TextField
                                        name="phone"
                                        label="Mobile Number (Optional)"
                                        type="tel"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        value={form.phone}
                                        onChange={handleChange}
                                        autoComplete="tel"
                                        error={submitted && Boolean(errors.phone)}
                                        helperText={submitted ? errors.phone : ""}
                                        slotProps={{
                                            htmlInput: {
                                                inputMode: "numeric",
                                                maxLength: 10,
                                            },
                                        }}
                                    />

                                    <TextField
                                        select
                                        name="subject"
                                        label="Enquiry Type"
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        required
                                        value={form.subject}
                                        onChange={handleChange}
                                        error={submitted && Boolean(errors.subject)}
                                        helperText={submitted ? errors.subject : ""}
                                    >
                                        {subjects.map((subject) => (
                                            <MenuItem key={subject} value={subject}>
                                                {subject}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <div className="contact-field-full">
                                        <TextField
                                            name="orderId"
                                            label="Order ID (Optional)"
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            value={form.orderId}
                                            onChange={handleChange}
                                            slotProps={{
                                                htmlInput: { maxLength: 50 },
                                            }}
                                        />
                                    </div>

                                    <div className="contact-field-full">
                                        <TextField
                                            name="message"
                                            label="Your Message"
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            required
                                            multiline
                                            minRows={5}
                                            value={form.message}
                                            onChange={handleChange}
                                            error={submitted && Boolean(errors.message)}
                                            helperText={submitted ? errors.message : ""}
                                            slotProps={{
                                                htmlInput: { maxLength: 1500 },
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="contact-form-bottom">
                                    <p>
                                        <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                                        Please avoid sharing passwords or sensitive
                                        payment information in your message.
                                    </p>

                                    <button
                                        type="submit"
                                        className="contact-submit-button"
                                    >
                                        Submit Enquiry
                                        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                    </button>
                                </div>
                            </form>
                        </section>

                        {/* Direct Contact Details */}
                        <aside
                            className="contact-connect-panel"
                            aria-labelledby="contact-connect-title"
                        >
                            <div className="contact-connect-header">
                                <span className="contact-section-label">
                                    LET'S CONNECT
                                </span>

                                <h2 id="contact-connect-title">
                                    A question? <span>We're listening.</span>
                                </h2>

                                <p>
                                    Reach us by phone, email or the enquiry form.
                                    Choose the way that works best for you.
                                </p>
                            </div>

                            <div className="contact-connect-list">
                                {contactMethods.map((method) => (
                                    <a
                                        key={method.title}
                                        href={method.href}
                                        className="contact-connect-card"
                                        target={method.external ? "_blank" : undefined}
                                        rel={method.external ? "noopener noreferrer" : undefined}
                                    >
                                        <span className="contact-connect-icon">
                                            <i
                                                className={`fa-solid ${method.icon}`}
                                                aria-hidden="true"
                                            />
                                        </span>

                                        <span className="contact-connect-details">
                                            <strong>{method.title}</strong>
                                            <span>{method.value}</span>
                                            <small>
                                                {method.action}
                                                <i
                                                    className="fa-solid fa-arrow-up-right-from-square"
                                                    aria-hidden="true"
                                                />
                                            </small>
                                        </span>
                                    </a>
                                ))}
                            </div>

                            <div className="contact-connect-footer">
                                <i className="fa-solid fa-circle-info" aria-hidden="true" />

                                <p>
                                    For order-related questions, please include
                                    your Order ID when available.
                                </p>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section
                id="contact-faq"
                className="contact-faq-section"
                aria-labelledby="contact-faq-title"
            >
                <div className="container-fluid website-shell">
                    <div className="contact-faq-heading">
                        <span className="contact-section-label">
                            HELP & ANSWERS
                        </span>

                        <h2 id="contact-faq-title">
                            Frequently Asked <span>Questions</span>
                        </h2>

                        <p>
                            Find answers about delivery addresses, checkout,
                            coupons, payments and order enquiries.
                        </p>
                    </div>

                    <div className="contact-faq-grid">
                        {faqColumns.map((column, columnIndex) => (
                            <div className="contact-faq-column" key={columnIndex}>
                                {column.map((faq, index) => (
                                    <details
                                        className="contact-faq-item"
                                        key={faq.question}
                                    >
                                        <summary>
                                            <span className="contact-faq-number">
                                                {String(columnIndex * 4 + index + 1).padStart(2, "0")}
                                            </span>

                                            <strong>{faq.question}</strong>

                                            <i
                                                className="fa-solid fa-plus"
                                                aria-hidden="true"
                                            />
                                        </summary>

                                        <div className="contact-faq-answer">
                                            <p>{faq.answer}</p>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Shopping CTA */}
            <section className="contact-bottom-section">
                <div className="container-fluid website-shell">
                    <div className="contact-bottom-banner">
                        <div>
                            <span>DISCOVER MORE WITH ZUPITO</span>

                            <h2>Ready to explore something new?</h2>

                            <p>
                                Browse products across categories and find
                                your everyday essentials in one place.
                            </p>
                        </div>

                        <Link to="/products">
                            Explore Products
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Contact;
