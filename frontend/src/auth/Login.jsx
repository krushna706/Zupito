import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button, IconButton, InputAdornment, TextField } from "@mui/material";
import { toast } from "react-toastify";

import { appConfig } from "../config/appConfig";
import { useAuth } from "../context/AuthContext";
import { getLoginDestination } from "../services/authService";

import "../css/auth.css";

const features = [
    {
        icon: "fa-bag-shopping",
        title: "Shop your favorites",
        description: "Discover quality products across everyday categories.",
    },
    {
        icon: "fa-box-open",
        title: "Everything in one place",
        description: "Manage your orders and stay updated with ease.",
    },
    {
        icon: "fa-truck-fast",
        title: "Reliable shopping experience",
        description: "Enjoy a simple and convenient shopping journey.",
    },
];

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (busy) return;

        const value = identifier.trim();

        if (!value || !password) {
            toast.error("Email or phone number and password are required.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/^[6-9]\d{9}$/.test(value)) {
            toast.error("Enter a valid email address or 10-digit phone number.");
            return;
        }

        setBusy(true);

        try {
            const user = await login(value, password);

            navigate(getLoginDestination(user, location.state?.returnTo), {
                replace: true,
            });
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
                                Discover everyday essentials, explore amazing products and enjoy a
                                better shopping experience.
                            </p>

                            <ul className="auth-features">
                                {features.map((feature) => (
                                    <li key={feature.title}>
                                        <span className="auth-feature-icon">
                                            <i
                                                className={`fa-solid ${feature.icon}`}
                                                aria-hidden="true"
                                            />
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

                    <section className="auth-form-panel" aria-labelledby="login-title">
                        <div className="auth-form-content">
                            <header className="auth-form-header">
                                <Link
                                    to="/"
                                    className="website-brand auth-brand"
                                    aria-label="Zupito Home"
                                >
                                    <img src={appConfig.logo} alt={appConfig.name} />
                                </Link>

                                <h1 id="login-title" className="website-section-title">
                                    Welcome <span>Back!</span>
                                </h1>
                                <p className="website-section-description">
                                    Sign in to your Zupito account to continue.
                                </p>
                            </header>

                            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                                <TextField
                                    label="Email or Phone Number"
                                    name="identifier"
                                    value={identifier}
                                    onChange={(event) => setIdentifier(event.target.value)}
                                    className="auth-text-field"
                                    autoComplete="username"
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 254,
                                            autoCapitalize: "none",
                                            spellCheck: false,
                                        },
                                    }}
                                    fullWidth
                                    required
                                />

                                <TextField
                                    label="Password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="auth-text-field"
                                    autoComplete="current-password"
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        type="button"
                                                        className="auth-password-toggle"
                                                        onClick={() =>
                                                            setShowPassword((value) => !value)
                                                        }
                                                        aria-label={
                                                            showPassword
                                                                ? "Hide password"
                                                                : "Show password"
                                                        }
                                                        edge="end"
                                                    >
                                                        <i
                                                            className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                                                            aria-hidden="true"
                                                        />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                    fullWidth
                                    required
                                />

                                <Button
                                    type="submit"
                                    variant="contained"
                                    className="auth-submit"
                                    disabled={busy}
                                    disableElevation
                                    fullWidth
                                >
                                    {busy ? "Signing In…" : "Sign In"}
                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Button>
                            </form>

                            <div className="auth-account-row">
                                <p className="auth-switch">
                                    Don't have an account?{" "}
                                    <Link to="/manage/signup">Create Account</Link>
                                </p>
                                <Link to="/manage/forgot-password" className="auth-forgot-link">
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Login;
