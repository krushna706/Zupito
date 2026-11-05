
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Alert,
    Button,
    IconButton,
    InputAdornment,
    TextField,
} from "@mui/material";

import { appConfig } from "../config/appConfig";

import "../css/auth.css";

// ================== RECOVERY CONFIGURATION ==================
const DEMO_OTP = "123456";
const OTP_VALIDITY = 10 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS = 10;
const REQUEST_WINDOW = 60 * 60 * 1000;

// ================== RECOVERY STEPS ==================
const recoverySteps = [
    {
        title: "Find your account",
        description: "Enter your registered email address or mobile number.",
    },
    {
        title: "Verify email OTP",
        description: "Enter the 6-digit verification code.",
    },
    {
        title: "Set a new password",
        description: "Create a new password and return to Sign In.",
    },
];

const stepContent = [
    {
        title: "Forgot your",
        accent: "password?",
        description: "Enter your email or phone number to begin account recovery.",
        button: "Send Verification Code",
    },
    {
        title: "Verify your",
        accent: "email OTP.",
        description: "Enter the 6-digit verification code to continue.",
        button: "Verify OTP",
    },
    {
        title: "Create a new",
        accent: "password.",
        description: "Choose a secure password for your account.",
        button: "Reset Password",
    },
];

// ================== PASSWORD VISIBILITY ==================
function PasswordVisibility({ visible, onToggle, label }) {
    return (
        <InputAdornment position="end">
            <IconButton
                type="button"
                className="auth-password-toggle"
                onClick={onToggle}
                onMouseDown={(event) => event.preventDefault()}
                aria-label={`${visible ? "Hide" : "Show"} ${label}`}
                edge="end"
            >
                <i
                    className={`fa-solid ${
                        visible ? "fa-eye-slash" : "fa-eye"
                    }`}
                    aria-hidden="true"
                />
            </IconButton>
        </InputAdornment>
    );
}

// ================== FORGOT PASSWORD ==================
function ForgotPassword() {
    const [step, setStep] = useState(0);

    const [identifier, setIdentifier] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [expiresAt, setExpiresAt] = useState(0);
    const [resendAt, setResendAt] = useState(0);
    const [requests, setRequests] = useState([]);
    const [attempts, setAttempts] = useState(0);
    const [now, setNow] = useState(Date.now());

    const [error, setError] = useState("");
    const [completed, setCompleted] = useState(false);

    // ================== COUNTDOWN ==================
    useEffect(() => {
        if (step !== 1) return undefined;

        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(timer);
    }, [step]);

    const resendSeconds = Math.max(
        0,
        Math.ceil((resendAt - now) / 1000)
    );

    const remainingSeconds = Math.max(
        0,
        Math.ceil((expiresAt - now) / 1000)
    );

    // ================== REQUEST DEMO OTP ==================
    const requestOtp = () => {
        const value = identifier.trim().toLowerCase();

        const validEmail =
            value.length <= 254 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

        const validPhone = /^[6-9]\d{9}$/.test(value);

        if (!validEmail && !validPhone) {
            setError("Enter a valid email or 10-digit mobile number.");
            return;
        }

        const currentTime = Date.now();

        const recentRequests = requests.filter(
            (time) => currentTime - time < REQUEST_WINDOW
        );

        if (recentRequests.length >= MAX_REQUESTS) {
            setError("Demo request limit reached. Try again later.");
            return;
        }

        setRequests([...recentRequests, currentTime]);
        setIdentifier(value);
        setOtp("");
        setAttempts(0);
        setExpiresAt(currentTime + OTP_VALIDITY);
        setResendAt(currentTime + RESEND_COOLDOWN);
        setNow(currentTime);
        setError("");
        setStep(1);
    };

    // ================== VERIFY DEMO OTP ==================
    const verifyOtp = () => {
        if (!/^\d{6}$/.test(otp)) {
            setError("Enter the complete 6-digit OTP.");
            return;
        }

        if (Date.now() >= expiresAt) {
            setError("OTP has expired. Please resend the code.");
            return;
        }

        if (attempts >= MAX_ATTEMPTS) {
            setError("Too many incorrect attempts. Please resend OTP.");
            return;
        }

        if (otp !== DEMO_OTP) {
            const nextAttempts = attempts + 1;
            setAttempts(nextAttempts);

            setError(
                nextAttempts >= MAX_ATTEMPTS
                    ? "Maximum attempts reached. Please resend OTP."
                    : `Incorrect OTP. ${MAX_ATTEMPTS - nextAttempts} attempts remaining.`
            );

            return;
        }

        setOtp("");
        setError("");
        setStep(2);
    };

    // ================== RESET PASSWORD DEMO ==================
    const resetPassword = () => {
        if (
            newPassword.length < 6 ||
            new TextEncoder().encode(newPassword).length > 72
        ) {
            setError(
                "Password must be at least 6 characters and at most 72 UTF-8 bytes."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New password and confirm password do not match.");
            return;
        }

        // Frontend preview only. No password is stored or changed.
        setNewPassword("");
        setConfirmPassword("");
        setError("");
        setCompleted(true);
    };

    // ================== FORM SUBMISSION ==================
    const handleSubmit = (event) => {
        event.preventDefault();
        setError("");

        if (step === 0) requestOtp();
        else if (step === 1) verifyOtp();
        else resetPassword();
    };

    // ================== RESEND OTP ==================
    const handleResend = () => {
        if (resendSeconds > 0) return;
        requestOtp();
    };

    // ================== START AGAIN ==================
    const handleRestart = () => {
        setStep(0);
        setIdentifier("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setExpiresAt(0);
        setResendAt(0);
        setAttempts(0);
        setError("");
        setCompleted(false);
    };

    const currentContent = stepContent[step];

    return (
        <div className="website-layout auth-layout">
            <main className="auth-main">
                {/* Back Navigation */}
                <div className="auth-topbar">
                    <Link to="/manage" className="auth-back-link">
                        <i
                            className="fa-solid fa-arrow-left"
                            aria-hidden="true"
                        />
                        Back to Sign In
                    </Link>
                </div>

                <div className="auth-card">
                    {/* Recovery Introduction */}
                    <aside className="auth-introduction">
                        <img
                            src="/images/about-story.jpg"
                            alt=""
                            className="auth-background"
                            decoding="async"
                        />

                        <div className="auth-introduction-content">
                            <p className="website-section-label">
                                ACCOUNT RECOVERY
                            </p>

                            <h2 className="website-section-title">
                                Your account security,
                                <span> our priority.</span>
                            </h2>

                            <p className="website-section-description">
                                Follow these simple steps to recover
                                access to your Zupito account.
                            </p>

                            {/* RMS Style Recovery Steps */}
                            <ol className="auth-features auth-recovery-steps">
                                {recoverySteps.map((item, index) => (
                                    <li
                                        key={item.title}
                                        className={
                                            index <= step ? "is-active" : ""
                                        }
                                        aria-current={
                                            index === step && !completed
                                                ? "step"
                                                : undefined
                                        }
                                    >
                                        <span className="auth-feature-icon">
                                            {index < step || completed ? (
                                                <i
                                                    className="fa-solid fa-check"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <span>{index + 1}</span>
                                            )}
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

                    {/* Recovery Form */}
                    <section
                        className="auth-form-panel"
                        aria-labelledby="recovery-title"
                    >
                        <div className="auth-form-content">
                            <header className="auth-form-header">
                                <Link
                                    to="/"
                                    className="website-brand auth-brand"
                                    aria-label="Zupito Home"
                                >
                                    <img
                                        src={appConfig.logo}
                                        alt={appConfig.name}
                                    />
                                </Link>

                                <p className="website-section-label">
                                    {completed
                                        ? "RECOVERY COMPLETE"
                                        : `STEP ${step + 1} OF 3`}
                                </p>

                                <h1
                                    id="recovery-title"
                                    className="website-section-title"
                                >
                                    {completed ? (
                                        <>
                                            Recovery <span>Complete!</span>
                                        </>
                                    ) : (
                                        <>
                                            {currentContent.title}{" "}
                                            <span>{currentContent.accent}</span>
                                        </>
                                    )}
                                </h1>

                                <p className="website-section-description">
                                    {completed
                                        ? "Your password reset preview is complete."
                                        : currentContent.description}
                                </p>
                            </header>

                            {completed ? (
                                <div className="auth-form">
                                    <Alert severity="success">
                                        Demo password reset completed successfully.
                                        No real account password was changed.
                                    </Alert>

                                    <Button
                                        component={Link}
                                        to="/manage"
                                        variant="contained"
                                        className="auth-submit"
                                        disableElevation
                                        fullWidth
                                    >
                                        Back to Sign In
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <form
                                        className="auth-form"
                                        onSubmit={handleSubmit}
                                        noValidate
                                    >
                                        {/* Step 1: Find Account */}
                                        {step === 0 && (
                                            <TextField
                                                label="Email or Phone Number"
                                                name="identifier"
                                                value={identifier}
                                                onChange={(event) => {
                                                    setIdentifier(event.target.value);
                                                    setError("");
                                                }}
                                                className="auth-text-field"
                                                autoComplete="username"
                                                slotProps={{
                                                    htmlInput: {
                                                        maxLength: 254,
                                                    },
                                                }}
                                                fullWidth
                                                required
                                            />
                                        )}

                                        {/* Step 2: Verify OTP */}
                                        {step === 1 && (
                                            <>
                                                <Alert severity="info">
                                                    Frontend Demo OTP:{" "}
                                                    <strong>{DEMO_OTP}</strong>
                                                    <br />
                                                    No email or SMS is sent.
                                                    Code expires in 10 minutes.
                                                </Alert>

                                                <TextField
                                                    label="6-Digit Email OTP"
                                                    name="otp"
                                                    value={otp}
                                                    onChange={(event) => {
                                                        setOtp(
                                                            event.target.value
                                                                .replace(/\D/g, "")
                                                                .slice(0, 6)
                                                        );
                                                        setError("");
                                                    }}
                                                    className="auth-text-field"
                                                    autoComplete="one-time-code"
                                                    helperText={
                                                        remainingSeconds > 0
                                                            ? `Code expires in ${Math.ceil(remainingSeconds / 60)} minute(s).`
                                                            : "Code expired. Please resend OTP."
                                                    }
                                                    slotProps={{
                                                        htmlInput: {
                                                            maxLength: 6,
                                                            inputMode: "numeric",
                                                        },
                                                    }}
                                                    fullWidth
                                                    required
                                                />

                                                <Button
                                                    type="button"
                                                    variant="text"
                                                    onClick={handleResend}
                                                    disabled={resendSeconds > 0}
                                                >
                                                    {resendSeconds > 0
                                                        ? `Resend OTP in ${resendSeconds}s`
                                                        : "Resend OTP"}
                                                </Button>
                                            </>
                                        )}

                                        {/* Step 3: New Password */}
                                        {step === 2 && (
                                            <>
                                                <Alert severity="success">
                                                    OTP verified successfully.
                                                    Create your new password.
                                                </Alert>

                                                <TextField
                                                    label="New Password"
                                                    name="newPassword"
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    value={newPassword}
                                                    onChange={(event) => {
                                                        setNewPassword(event.target.value);
                                                        setError("");
                                                    }}
                                                    className="auth-text-field"
                                                    autoComplete="new-password"
                                                    slotProps={{
                                                        input: {
                                                            endAdornment: (
                                                                <PasswordVisibility
                                                                    visible={showPassword}
                                                                    onToggle={() =>
                                                                        setShowPassword(
                                                                            (previous) => !previous
                                                                        )
                                                                    }
                                                                    label="new password"
                                                                />
                                                            ),
                                                        },
                                                    }}
                                                    fullWidth
                                                    required
                                                />

                                                <TextField
                                                    label="Confirm New Password"
                                                    name="confirmPassword"
                                                    type={
                                                        showConfirmPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    value={confirmPassword}
                                                    onChange={(event) => {
                                                        setConfirmPassword(event.target.value);
                                                        setError("");
                                                    }}
                                                    className="auth-text-field"
                                                    autoComplete="new-password"
                                                    slotProps={{
                                                        input: {
                                                            endAdornment: (
                                                                <PasswordVisibility
                                                                    visible={showConfirmPassword}
                                                                    onToggle={() =>
                                                                        setShowConfirmPassword(
                                                                            (previous) => !previous
                                                                        )
                                                                    }
                                                                    label="confirm password"
                                                                />
                                                            ),
                                                        },
                                                    }}
                                                    fullWidth
                                                    required
                                                />
                                            </>
                                        )}

                                        {/* Validation Error */}
                                        {error && (
                                            <Alert severity="error">
                                                {error}
                                            </Alert>
                                        )}

                                        <Button
                                            type="submit"
                                            variant="contained"
                                            className="auth-submit"
                                            disableElevation
                                            fullWidth
                                        >
                                            {currentContent.button}

                                            <i
                                                className="fa-solid fa-arrow-right"
                                                aria-hidden="true"
                                            />
                                        </Button>

                                        {step > 0 && (
                                            <Button
                                                type="button"
                                                variant="text"
                                                onClick={handleRestart}
                                            >
                                                Start Again
                                            </Button>
                                        )}
                                    </form>

                                    <div className="auth-account-row">
                                        <p className="auth-switch">
                                            Remember your password?{" "}
                                            <Link to="/manage">
                                                Sign In
                                            </Link>
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

export default ForgotPassword;
