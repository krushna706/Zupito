import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, IconButton, InputAdornment, TextField } from "@mui/material";

import { appConfig } from "../config/appConfig";
import { useAuth } from "../context/AuthContext";
import * as authService from "../services/authService";

import "../css/auth.css";

const recoverySteps = [
    {
        title: "Find your account",
        description: "Enter your registered email address or mobile number.",
    },
    { title: "Verify email OTP", description: "Enter the 6-digit verification code." },
    { title: "Set a new password", description: "Create a new password and return to Sign In." },
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
                    className={`fa-solid ${visible ? "fa-eye-slash" : "fa-eye"}`}
                    aria-hidden="true"
                />
            </IconButton>
        </InputAdornment>
    );
}

function ForgotPassword() {
    const { refreshUser } = useAuth();

    const [step, setStep] = useState(0);
    const [identifier, setIdentifier] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [expiresAt, setExpiresAt] = useState(0);
    const [resendAt, setResendAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [requestId, setRequestId] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        if (step !== 1) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [step]);

    const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
    const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));

    const requestOtp = async () => {
        const result = await authService.requestPasswordReset(identifier.trim().toLowerCase());
        const time = Date.now();

        setRequestId(result.requestId);
        setResetToken("");
        setOtp("");
        setExpiresAt(time + result.expiresIn * 1000);
        setResendAt(time + result.resendAfter * 1000);
        setNow(time);
        setStep(1);
    };

    const run = async (action) => {
        if (busy) return;
        setBusy(true);
        setError("");

        try {
            await action();
        } catch (failure) {
            setError(failure.message);
            if (failure.retryAfter) {
                setResendAt(Date.now() + failure.retryAfter * 1000);
            }
        } finally {
            setBusy(false);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        run(async () => {
            if (step === 0) return requestOtp();

            if (step === 1) {
                const result = await authService.verifyPasswordReset(requestId, otp);
                setResetToken(result.resetToken);
                setOtp("");
                setStep(2);
                return;
            }

            await authService.resetPassword(resetToken, newPassword, confirmPassword);
            setResetToken("");
            setNewPassword("");
            setConfirmPassword("");
            setCompleted(true);
            await refreshUser().catch(() => {});
        });
    };

    const handleRestart = () => {
        if (busy) return;
        setStep(0);
        setIdentifier("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setRequestId("");
        setResetToken("");
        setExpiresAt(0);
        setResendAt(0);
        setError("");
        setCompleted(false);
    };

    const currentContent = stepContent[step];

    return (
        <div className="website-layout auth-layout">
            <main className="auth-main">
                <div className="auth-topbar">
                    <Link to="/manage" className="auth-back-link">
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        Back to Sign In
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
                            <p className="website-section-label">ACCOUNT RECOVERY</p>
                            <h2 className="website-section-title">
                                Your account security,
                                <span> our priority.</span>
                            </h2>
                            <p className="website-section-description">
                                Follow these simple steps to recover access to your Zupito account.
                            </p>

                            <ol className="auth-features auth-recovery-steps">
                                {recoverySteps.map((item, index) => (
                                    <li
                                        key={item.title}
                                        className={index <= step ? "is-active" : ""}
                                        aria-current={
                                            index === step && !completed ? "step" : undefined
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

                    <section className="auth-form-panel" aria-labelledby="recovery-title">
                        <div className="auth-form-content">
                            <header className="auth-form-header">
                                <Link
                                    to="/"
                                    className="website-brand auth-brand"
                                    aria-label="Zupito Home"
                                >
                                    <img src={appConfig.logo} alt={appConfig.name} />
                                </Link>

                                <p className="website-section-label">
                                    {completed ? "RECOVERY COMPLETE" : `STEP ${step + 1} OF 3`}
                                </p>

                                <h1 id="recovery-title" className="website-section-title">
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
                                        ? "Your password has been updated successfully."
                                        : currentContent.description}
                                </p>
                            </header>

                            {completed ? (
                                <div className="auth-form">
                                    <Alert severity="success">
                                        Password updated successfully. Please sign in with your new
                                        password.
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
                                    <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
                                                slotProps={{ htmlInput: { maxLength: 254 } }}
                                                fullWidth
                                                required
                                            />
                                        )}

                                        {step === 1 && (
                                            <>
                                                <Alert severity="info">
                                                    If an active account matches, a code has been
                                                    sent to its registered email. Code expires in 10
                                                    minutes.
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
                                                    onClick={() => {
                                                        if (resendSeconds === 0) run(requestOtp);
                                                    }}
                                                    disabled={busy || resendSeconds > 0}
                                                >
                                                    {resendSeconds > 0
                                                        ? `Resend OTP in ${resendSeconds}s`
                                                        : "Resend OTP"}
                                                </Button>
                                            </>
                                        )}

                                        {step === 2 && (
                                            <>
                                                <Alert severity="success">
                                                    OTP verified successfully. Create your new
                                                    password.
                                                </Alert>

                                                <TextField
                                                    label="New Password"
                                                    name="newPassword"
                                                    type={showPassword ? "text" : "password"}
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
                                                                            (value) => !value
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
                                                    type={showConfirmPassword ? "text" : "password"}
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
                                                                            (value) => !value
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

                                        {error && <Alert severity="error">{error}</Alert>}

                                        <Button
                                            type="submit"
                                            variant="contained"
                                            className="auth-submit"
                                            disabled={busy}
                                            disableElevation
                                            fullWidth
                                        >
                                            {busy ? "Please wait…" : currentContent.button}
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
                                                disabled={busy}
                                            >
                                                Start Again
                                            </Button>
                                        )}
                                    </form>

                                    <div className="auth-account-row">
                                        <p className="auth-switch">
                                            Remember your password?{" "}
                                            <Link to="/manage">Sign In</Link>
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
