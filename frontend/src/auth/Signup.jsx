import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, IconButton, InputAdornment, TextField } from "@mui/material";
import { toast } from "react-toastify";

import { register } from "../services/authService";
import { appConfig } from "../config/appConfig";

import "../css/auth.css";

const features = [
    {
        icon: "fa-bag-shopping",
        title: "Explore more",
        description: "Discover products across your favorite categories.",
    },
    {
        icon: "fa-box-open",
        title: "Manage your orders",
        description: "Keep track of your purchases in one place.",
    },
    {
        icon: "fa-truck-fast",
        title: "Stay updated",
        description: "Follow your orders from checkout to delivery.",
    },
];

const fields = [
    { name: "name", label: "Full Name", autoComplete: "name", maxLength: 100 },
    { name: "email", label: "Email Address", type: "email", autoComplete: "email", maxLength: 254 },
    { name: "phone", label: "Mobile Number", type: "tel", autoComplete: "tel-national", maxLength: 10 },
    { name: "password", label: "Password", password: true },
    { name: "confirmPassword", label: "Confirm Password", password: true },
];

function Signup() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [visible, setVisible] = useState({});
    const [busy, setBusy] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (busy) return;

        const name = form.name.trim();
        const email = form.email.trim().toLowerCase();
        const phone = form.phone.trim();
        const { password, confirmPassword } = form;

        if (name.length < 2 || name.length > 100) {
            toast.error("Full name must contain between 2 and 100 characters.");
            return;
        }
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("Enter a valid email address.");
            return;
        }
        if (!/^[6-9]\d{9}$/.test(phone)) {
            toast.error("Enter a valid 10-digit mobile number.");
            return;
        }
        if (password.length < 6 || new TextEncoder().encode(password).length > 72) {
            toast.error("Password must contain at least 6 characters and cannot exceed 72 UTF-8 bytes.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Password and confirm password do not match.");
            return;
        }

        setBusy(true);

        try {
            await register({ name, email, phone, password, confirmPassword });
            toast.success("Account created. Please sign in.");
            navigate("/manage");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy(false);
        }
    };

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
                            <p className="website-section-label">WELCOME TO ZUPITO</p>
                            <h2 className="website-section-title">
                                Your world of shopping,
                                <span> all in one place.</span>
                            </h2>
                            <p className="website-section-description">
                                Create your account to explore products, manage purchases
                                and enjoy a convenient shopping experience.
                            </p>

                            <ul className="auth-features">
                                {features.map((feature) => (
                                    <li key={feature.title}>
                                        <span className="auth-feature-icon">
                                            <i className={`fa-solid ${feature.icon}`} aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h3>{feature.title}</h3>
                                            <p>{feature.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="auth-introduction-note">
                            Everyday essentials. Exceptional finds.
                        </p>
                    </aside>

                    <section className="auth-form-panel" aria-labelledby="signup-title">
                        <div className="auth-form-content">
                            <header className="auth-form-header">
                                <Link to="/" className="website-brand auth-brand" aria-label="Zupito Home">
                                    <img src={appConfig.logo} alt={appConfig.name} />
                                </Link>
                                <h1 id="signup-title" className="website-section-title">
                                    Create <span>Account</span>
                                </h1>
                                <p className="website-section-description">
                                    Join Zupito and start your shopping journey.
                                </p>
                            </header>

                            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                                {fields.map((field) => (
                                    <TextField
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        type={field.password ? (visible[field.name] ? "text" : "password") : field.type || "text"}
                                        value={form[field.name]}
                                        onChange={handleChange}
                                        className="auth-text-field"
                                        autoComplete={field.password ? "new-password" : field.autoComplete}
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: field.maxLength,
                                                inputMode: field.name === "phone" ? "numeric" : undefined,
                                            },
                                            input: field.password
                                                ? {
                                                      endAdornment: (
                                                          <InputAdornment position="end">
                                                              <IconButton
                                                                  type="button"
                                                                  className="auth-password-toggle"
                                                                  onClick={() => setVisible((previous) => ({
                                                                      ...previous,
                                                                      [field.name]: !previous[field.name],
                                                                  }))}
                                                                  aria-label={`${visible[field.name] ? "Hide" : "Show"} ${field.label}`}
                                                                  edge="end"
                                                              >
                                                                  <i
                                                                      className={`fa-solid ${visible[field.name] ? "fa-eye-slash" : "fa-eye"}`}
                                                                      aria-hidden="true"
                                                                  />
                                                              </IconButton>
                                                          </InputAdornment>
                                                      ),
                                                  }
                                                : undefined,
                                        }}
                                        fullWidth
                                        required
                                    />
                                ))}

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="auth-submit"
                                    disabled={busy}
                                    disableElevation
                                    fullWidth
                                >
                                    {busy ? "Creating Account…" : "Create Account"}
                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Button>
                            </form>

                            <div className="auth-account-row">
                                <p className="auth-switch">
                                    Already have an account? <Link to="/manage">Sign In</Link>
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Signup;