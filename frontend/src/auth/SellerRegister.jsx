import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Alert,
    Button,
    Divider,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    TextField,
} from "@mui/material";

import { appConfig } from "../config/appConfig";
import { registerSeller } from "../services/authService";

import "../css/auth.css";

const steps = [
    {
        title: "Account Details",
        description: "Enter your personal and login information.",
        heading: "Account",
        accent: "Details",
    },
    {
        title: "Store Information",
        description: "Tell us about your business and store.",
        heading: "Store",
        accent: "Information",
    },
    {
        title: "Pickup Address",
        description: "Provide your product pickup location.",
        heading: "Pickup",
        accent: "Address",
    },
    {
        title: "Review & Submit",
        description: "Verify your details before submitting.",
        heading: "Review Your",
        accent: "Application",
    },
];

const initialForm = {
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    storeName: "",
    storeEmail: "",
    storePhone: "",
    description: "",
    street: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
};

const accountFields = [
    { name: "fullName", label: "Full Name", maxLength: 100, autoComplete: "name" },
    { name: "email", label: "Email Address", type: "email", maxLength: 254, autoComplete: "email" },
    { name: "mobile", label: "Mobile Number", type: "tel", maxLength: 10, autoComplete: "tel-national" },
];

const storeFields = [
    { name: "storeName", label: "Store Name", maxLength: 100 },
    { name: "storeEmail", label: "Store Email", type: "email", maxLength: 254 },
    { name: "storePhone", label: "Store Contact Number", type: "tel", maxLength: 10 },
];

const addressFields = [
    { name: "street", label: "Pickup Address", maxLength: 200 },
    { name: "locality", label: "Locality / Area", maxLength: 100 },
    { name: "city", label: "City", maxLength: 100 },
    { name: "state", label: "State", maxLength: 100 },
    { name: "pincode", label: "Pincode", maxLength: 6 },
];

function PasswordField({ label, name, value, onChange }) {
    const [visible, setVisible] = useState(false);

    return (
        <TextField
            label={label}
            name={name}
            type={visible ? "text" : "password"}
            value={value}
            onChange={onChange}
            className="auth-text-field"
            autoComplete="new-password"
            slotProps={{
                input: {
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                type="button"
                                className="auth-password-toggle"
                                onClick={() => setVisible((previous) => !previous)}
                                onMouseDown={(event) => event.preventDefault()}
                                aria-label={`${visible ? "Hide" : "Show"} ${label}`}
                                edge="end"
                            >
                                <i className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
                            </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
            fullWidth
            required
        />
    );
}

function SellerRegister() {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState(initialForm);
    const [application, setApplication] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        const nextValue = ["mobile", "storePhone", "pincode"].includes(name)
            ? value.replace(/\D/g, "")
            : value;

        setForm((previous) => ({ ...previous, [name]: nextValue }));
        setError("");
    };

    const validateStep = (currentStep) => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phonePattern = /^[6-9]\d{9}$/;

        if (currentStep === 0) {
            if (form.fullName.trim().length < 2) return "Enter a valid full name.";
            if (!emailPattern.test(form.email.trim())) return "Enter a valid email address.";
            if (!phonePattern.test(form.mobile)) return "Enter a valid 10-digit mobile number.";
            if (form.password.length < 6 || new TextEncoder().encode(form.password).length > 72) {
                return "Password must contain at least 6 characters and at most 72 UTF-8 bytes.";
            }
            if (form.password !== form.confirmPassword) return "Passwords do not match.";
        }

        if (currentStep === 1) {
            if (form.storeName.trim().length < 3) return "Store name must contain at least 3 characters.";
            if (!emailPattern.test(form.storeEmail.trim())) return "Enter a valid store email address.";
            if (!phonePattern.test(form.storePhone)) return "Enter a valid store contact number.";
            if (form.description.trim().length > 500) return "Store description cannot exceed 500 characters.";
        }

        if (currentStep === 2) {
            if (!form.street.trim() || !form.locality.trim() || !form.city.trim() || !form.state.trim()) {
                return "Complete all pickup address fields.";
            }
            if (!/^[1-9]\d{5}$/.test(form.pincode)) return "Enter a valid 6-digit pincode.";
        }

        return "";
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (busy) return;

        const validationError = validateStep(step);
        if (validationError) {
            setError(validationError);
            return;
        }

        setError("");

        if (step < 3) {
            setStep((previous) => previous + 1);
            return;
        }

        for (let index = 0; index < 3; index++) {
            const previousError = validateStep(index);
            if (previousError) {
                setStep(index);
                setError(previousError);
                return;
            }
        }

        setBusy(true);

        try {
            await registerSeller(form);
            setApplication({
                applicant: form.fullName.trim(),
                storeName: form.storeName.trim(),
                location: `${form.city.trim()}, ${form.state.trim()}`,
                status: "Pending Approval",
            });
            setForm((previous) => ({ ...previous, password: "", confirmPassword: "" }));
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    };

    const handleRestart = () => {
        setStep(0);
        setForm(initialForm);
        setApplication(null);
        setError("");
    };

    const renderFields = (fields) =>
        fields.map((field) => (
            <TextField
                key={field.name}
                label={field.label}
                name={field.name}
                type={field.type || "text"}
                value={form[field.name]}
                onChange={handleChange}
                className="auth-text-field"
                autoComplete={field.autoComplete}
                slotProps={{
                    htmlInput: {
                        maxLength: field.maxLength,
                        inputMode: ["mobile", "storePhone", "pincode"].includes(field.name)
                            ? "numeric"
                            : undefined,
                    },
                }}
                fullWidth
                required
            />
        ));

    const reviewDetails = [
        { label: "Account Details", details: `${form.fullName} | ${form.email} | ${form.mobile}` },
        { label: "Store Information", details: `${form.storeName} | ${form.storeEmail} | ${form.storePhone}` },
        {
            label: "Pickup Address",
            details: [form.street, form.locality, form.city, form.state, form.pincode].filter(Boolean).join(", "),
        },
    ];

    return (
        <div className="website-layout auth-layout">
            <main className="auth-main">
                <div className="auth-topbar">
                    <Link to="/" className="auth-back-link">
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        Back to Home
                    </Link>
                </div>

                <div className="auth-card">
                    <aside className="auth-introduction">
                        <img src="/images/about-story.jpg" alt="" className="auth-background" decoding="async" />

                        <div className="auth-introduction-content">
                            <p className="website-section-label">SELL WITH ZUPITO</p>
                            <h2 className="website-section-title">
                                Grow your business,
                                <span> reach more customers.</span>
                            </h2>
                            <p className="website-section-description">
                                Complete four simple steps to become a seller on Zupito.
                            </p>

                            <ol className="auth-features auth-recovery-steps">
                                {steps.map((item, index) => (
                                    <li
                                        key={item.title}
                                        className={index <= step || application ? "is-active" : ""}
                                        aria-current={index === step && !application ? "step" : undefined}
                                    >
                                        <span className="auth-feature-icon">
                                            {index < step || application
                                                ? <i className="fa-solid fa-check" aria-hidden="true" />
                                                : <span>{index + 1}</span>}
                                        </span>
                                        <div>
                                            <h3>{item.title}</h3>
                                            <p>{item.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <p className="auth-introduction-note">
                            Everyday essentials. Exceptional finds.
                        </p>
                    </aside>

                    <section className="auth-form-panel" aria-labelledby="seller-register-title">
                        <div className="auth-form-content">
                            <header className="auth-form-header">
                                <Link to="/" className="website-brand auth-brand" aria-label="Zupito Home">
                                    <img src={appConfig.logo} alt={appConfig.name} />
                                </Link>

                                <p className="website-section-label">
                                    {application ? "APPLICATION SUBMITTED" : `STEP ${step + 1} OF ${steps.length}`}
                                </p>

                                <h1 id="seller-register-title" className="website-section-title">
                                    {application
                                        ? <>Application <span>Submitted!</span></>
                                        : <>{steps[step].heading} <span>{steps[step].accent}</span></>}
                                </h1>

                                <p className="website-section-description">
                                    {application
                                        ? "Your application has been received for review."
                                        : steps[step].description}
                                </p>
                            </header>

                            {application ? (
                                <div className="auth-form">
                                    <Alert severity="success">
                                        Application submitted successfully. Sign in to track your approval.
                                    </Alert>
                                    <Alert severity="warning">
                                        <strong>{application.status}</strong>
                                        <div>Awaiting admin review.</div>
                                    </Alert>

                                    <List disablePadding>
                                        <ListItem>
                                            <ListItemText primary="Applicant" secondary={application.applicant} />
                                        </ListItem>
                                        <Divider component="li" />
                                        <ListItem>
                                            <ListItemText primary="Store" secondary={application.storeName} />
                                        </ListItem>
                                        <Divider component="li" />
                                        <ListItem>
                                            <ListItemText primary="Pickup Location" secondary={application.location} />
                                        </ListItem>
                                    </List>

                                    <Button component={Link} to="/manage" variant="contained" className="auth-submit" fullWidth>
                                        Back to Sign In
                                    </Button>
                                    <Button type="button" variant="text" onClick={handleRestart}>
                                        Start New Application
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <form className="auth-form" onSubmit={handleSubmit} noValidate>
                                        {step === 0 && (
                                            <>
                                                {renderFields(accountFields)}
                                                <PasswordField label="Password" name="password" value={form.password} onChange={handleChange} />
                                                <PasswordField label="Confirm Password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} />
                                            </>
                                        )}

                                        {step === 1 && (
                                            <>
                                                {renderFields(storeFields)}
                                                <TextField
                                                    label="Store Description (Optional)"
                                                    name="description"
                                                    value={form.description}
                                                    onChange={handleChange}
                                                    className="auth-text-field"
                                                    multiline
                                                    minRows={2}
                                                    slotProps={{ htmlInput: { maxLength: 500 } }}
                                                    fullWidth
                                                />
                                            </>
                                        )}

                                        {step === 2 && renderFields(addressFields)}

                                        {step === 3 && (
                                            <>
                                                <Alert severity="info">
                                                    Check your information before submitting.
                                                </Alert>
                                                <List disablePadding>
                                                    {reviewDetails.map((item, index) => (
                                                        <div key={item.label}>
                                                            {index > 0 && <Divider />}
                                                            <ListItem>
                                                                <ListItemText
                                                                    primary={item.label}
                                                                    secondary={item.details}
                                                                    slotProps={{ primary: { fontWeight: 600 } }}
                                                                />
                                                            </ListItem>
                                                        </div>
                                                    ))}
                                                </List>
                                            </>
                                        )}

                                        {error && <Alert severity="error">{error}</Alert>}

                                        <Button type="submit" variant="contained" className="auth-submit" disabled={busy} disableElevation fullWidth>
                                            {busy ? "Submitting…" : step === 3 ? "Submit Application" : "Continue"}
                                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                        </Button>

                                        {step > 0 && (
                                            <Button
                                                type="button"
                                                variant="text"
                                                disabled={busy}
                                                onClick={() => { setStep((previous) => previous - 1); setError(""); }}
                                            >
                                                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                                                Back
                                            </Button>
                                        )}
                                    </form>

                                    <div className="auth-account-row">
                                        <p className="auth-switch">
                                            Already registered? <Link to="/manage">Sign In</Link>
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default SellerRegister;