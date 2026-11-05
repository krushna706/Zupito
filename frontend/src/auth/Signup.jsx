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
        description: "Discover products across your favorite categories."
    },
    {
        icon: "fa-box-open",
        title: "Manage your orders",
        description: "Keep track of your purchases in one place."
    },
    {
        icon: "fa-truck-fast",
        title: "Stay updated",
        description: "Follow your orders from checkout to delivery."
    }
];

function Signup() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

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

        if (password.length < 6) {
            toast.error("Password must contain at least 6 characters.");
            return;
        }

        if (new TextEncoder().encode(password).length > 72) {
            toast.error("Password cannot exceed 72 UTF-8 bytes.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Password and confirm password do not match.");
            return;
        }

        try {
            register({ name, email, phone, password });
            toast.success("Account created. Please sign in.");
            navigate("/manage");
        } catch (error) {
            toast.error(error.message);
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
                        <img
                            src="/images/about-story.jpg"
                            alt=""
                            className="auth-background"
                            decoding="async"
                        />

                        <div className="auth-introduction-content">
                            <p className="website-section-label">WELCOME TO ZUPITO</p>

                            <h2 className="website-section-title">
                                Your world of shopping,
                                <span> all in one place.</span>
                            </h2>

                            <p className="website-section-description">
                                Create your account to explore products, manage purchases and enjoy a
                                convenient shopping experience.
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

                        <p className="auth-introduction-note">Everyday essentials. Exceptional finds.</p>
                    </aside>

                    {/* Signup Form */}
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
                                <TextField
                                    label="Full Name"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="auth-text-field"
                                    autoComplete="name"
                                    slotProps={{
                                        htmlInput: { maxLength: 100 }
                                    }}
                                    fullWidth
                                    required
                                />

                                <TextField
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="auth-text-field"
                                    autoComplete="email"
                                    slotProps={{
                                        htmlInput: { maxLength: 254 }
                                    }}
                                    fullWidth
                                    required
                                />

                                <TextField
                                    label="Mobile Number"
                                    name="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    className="auth-text-field"
                                    autoComplete="tel-national"
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 10,
                                            inputMode: "numeric"
                                        }
                                    }}
                                    fullWidth
                                    required
                                />

                                <TextField
                                    label="Password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={handleChange}
                                    className="auth-text-field"
                                    autoComplete="new-password"
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        type="button"
                                                        className="auth-password-toggle"
                                                        onClick={() =>
                                                            setShowPassword((previous) => !previous)
                                                        }
                                                        aria-label={
                                                            showPassword ? "Hide password" : "Show password"
                                                        }
                                                        edge="end"
                                                    >
                                                        <i
                                                            className={`fa-solid ${
                                                                showPassword ? "fa-eye-slash" : "fa-eye"
                                                            }`}
                                                            aria-hidden="true"
                                                        />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }
                                    }}
                                    fullWidth
                                    required
                                />

                                <TextField
                                    label="Confirm Password"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    className="auth-text-field"
                                    autoComplete="new-password"
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        type="button"
                                                        className="auth-password-toggle"
                                                        onClick={() =>
                                                            setShowConfirmPassword((previous) => !previous)
                                                        }
                                                        aria-label={
                                                            showConfirmPassword
                                                                ? "Hide confirm password"
                                                                : "Show confirm password"
                                                        }
                                                        edge="end"
                                                    >
                                                        <i
                                                            className={`fa-solid ${
                                                                showConfirmPassword
                                                                    ? "fa-eye-slash"
                                                                    : "fa-eye"
                                                            }`}
                                                            aria-hidden="true"
                                                        />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }
                                    }}
                                    fullWidth
                                    required
                                />

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="auth-submit"
                                    disableElevation
                                    fullWidth
                                >
                                    Create Account
                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Button>
                            </form>

                            {/* Sign In Link */}
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
