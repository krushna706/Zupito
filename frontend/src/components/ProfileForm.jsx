
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, TextField } from "@mui/material";
import { toast } from "react-toastify";

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

// ================== PROFILE HELPERS ==================
function getInitials(name) {
    const words = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("") || "Z";
}

function getRoleLabel(role) {
    const labels = {
        admin: "Administrator",
        seller: "Seller",
        delivery: "Delivery Agent",
        delivery_agent: "Delivery Agent",
    };

    return labels[role] || "Staff Member";
}

function getImage(user) {
    return (
        user?.avatarUrl ||
        user?.profilePicture?.url ||
        (typeof user?.profilePicture === "string"
            ? user.profilePicture
            : "") ||
        ""
    );
}

// ================== SHARED PROFILE FORM ==================
function ProfileForm({ user, onSave }) {
    const fileInputRef = useRef(null);

    // ================== FORM STATE ==================
    const [name, setName] = useState(user?.name || user?.fullName || "");
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [failedImage, setFailedImage] = useState("");

    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    // ================== CURRENT ACCOUNT ==================
    const accountName = user?.name || user?.fullName || "";
    const displayName = name.trim() || accountName || "Staff Member";
    const normalizedName = name.trim().replace(/\s+/g, " ");

    const email = user?.email || "";
    const phone = user?.mobile || user?.phone || "";
    const role = getRoleLabel(user?.role);

    const savedImage = getImage(user);
    const currentImage = previewUrl || savedImage;

    const changed = (
        normalizedName !== accountName.trim().replace(/\s+/g, " ") ||
        Boolean(selectedImage)
    );

    // ================== SYNC PROFILE ==================
    useEffect(() => {
        setName(user?.name || user?.fullName || "");
    }, [user?.name, user?.fullName]);

    // ================== PREVIEW CLEANUP ==================
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // ================== IMAGE HANDLING ==================
    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            toast.error("Upload a JPG, JPEG, PNG or WebP image.");
            return;
        }

        if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
            toast.error("Image must be valid and 3 MB or smaller.");
            return;
        }

        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setFailedImage("");
        setError("");
    };

    const removeSelectedImage = () => {
        setSelectedImage(null);
        setPreviewUrl("");
        setFailedImage("");
    };

    const resetForm = () => {
        setName(accountName);
        removeSelectedImage();
        setError("");
    };

    // ================== SAVE PROFILE ==================
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) return;

        if (normalizedName.length < 2 || normalizedName.length > 80) {
            setError("Full name must contain 2–80 characters.");
            return;
        }

        if (!changed) {
            toast.info("No profile changes to save.");
            return;
        }

        if (typeof onSave !== "function") {
            toast.error("Profile update is not available.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const result = await onSave({
                name: normalizedName,
                pictureFile: selectedImage,
            });

            if (result === false || result?.success === false) {
                throw new Error(
                    result?.message || "Unable to update your profile."
                );
            }

            setSelectedImage(null);
            setPreviewUrl("");
            setName(normalizedName);

            toast.success("Profile updated in your preview session.");
        } catch (saveError) {
            setError(
                saveError?.message ||
                "Unable to update your profile. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="staff-profile">
            {/* ================== PAGE HEADER ================== */}
            <section className="spf-hero">
                <div>
                    <span className="spf-eyebrow">
                        <i className="fa-solid fa-user-gear" aria-hidden="true" />
                        MY PROFILE
                    </span>

                    <p>
                        Manage your profile information and review
                        your account security settings.
                    </p>
                </div>

                <span className="spf-hero-icon" aria-hidden="true">
                    <i className="fa-solid fa-id-card" />
                </span>
            </section>

            {/* ================== PROFILE CONTENT ================== */}
            <div className="spf-grid">
                {/* ================== IDENTITY CARD ================== */}
                <aside className="spf-identity">
                    <div className="spf-identity-top">
                        <span className="spf-section-label">
                            ACCOUNT IDENTITY
                        </span>

                        <div className="spf-avatar-container">
                            <div className="spf-avatar">
                                {currentImage && failedImage !== currentImage ? (
                                    <img
                                        src={currentImage}
                                        alt={`${displayName} profile`}
                                        onError={() => setFailedImage(currentImage)}
                                    />
                                ) : (
                                    <span>{getInitials(displayName)}</span>
                                )}
                            </div>

                            <button
                                type="button"
                                className="spf-camera"
                                aria-label="Change profile picture"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={saving}
                            >
                                <i className="fa-solid fa-camera" />
                            </button>
                        </div>

                        <h2>{displayName}</h2>

                        <span className="spf-role">
                            <i className="fa-solid fa-shield-halved" />
                            {role}
                        </span>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
                            className="spf-file-input"
                            aria-label="Select profile picture"
                            onChange={handleImageChange}
                            disabled={saving}
                        />

                        <Button
                            variant="outlined"
                            className="spf-upload-button"
                            startIcon={<i className="fa-solid fa-camera" />}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={saving}
                        >
                            Change Picture
                        </Button>

                        {selectedImage && (
                            <div className="spf-selected-file">
                                <i className="fa-solid fa-circle-check" />

                                <span title={selectedImage.name}>
                                    {selectedImage.name}
                                </span>

                                <button
                                    type="button"
                                    aria-label="Remove selected image"
                                    onClick={removeSelectedImage}
                                    disabled={saving}
                                >
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>
                        )}

                        <p className="spf-image-note">
                            JPG, JPEG, PNG or WebP
                            <span>Maximum image size: 3 MB</span>
                        </p>
                    </div>

                    <div className="spf-identity-bottom">
                        <i className="fa-solid fa-circle-info" />

                        <p>
                            Profile changes currently apply to your
                            frontend preview session.
                        </p>
                    </div>
                </aside>

                {/* ================== PERSONAL DETAILS ================== */}
                <section className="spf-details">
                    <div className="spf-card-header">
                        <span className="spf-card-icon">
                            <i className="fa-regular fa-id-card" />
                        </span>

                        <div>
                            <h3>Personal Information</h3>

                            <p>
                                Edit your full name and review
                                your registered contact details.
                            </p>
                        </div>
                    </div>

                    <form
                        className="spf-form"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <span className="spf-section-label">
                            PROFILE DETAILS
                        </span>

                        <div className="spf-fields">
                            <TextField
                                label="Full Name"
                                name="name"
                                value={name}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setError("");
                                }}
                                error={Boolean(error)}
                                autoComplete="name"
                                size="small"
                                required
                                fullWidth
                                disabled={saving}
                                slotProps={{
                                    htmlInput: {
                                        maxLength: 80,
                                    },
                                }}
                            />

                            <TextField
                                label="Email Address"
                                name="email"
                                value={email}
                                size="small"
                                fullWidth
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                        endAdornment: (
                                            <i
                                                className="fa-solid fa-lock spf-field-lock"
                                                aria-hidden="true"
                                            />
                                        ),
                                    },
                                }}
                            />

                            <TextField
                                label="Mobile Number"
                                name="mobile"
                                value={phone}
                                size="small"
                                fullWidth
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                        endAdornment: (
                                            <i
                                                className="fa-solid fa-lock spf-field-lock"
                                                aria-hidden="true"
                                            />
                                        ),
                                    },
                                }}
                            />
                        </div>

                        <div className="spf-readonly-note">
                            <i className="fa-solid fa-circle-info" />

                            <p>
                                Registered email and mobile number
                                cannot be changed from this page.
                            </p>
                        </div>

                        {error && (
                            <Alert
                                severity="error"
                                className="spf-error"
                            >
                                {error}
                            </Alert>
                        )}

                        <div className="spf-form-actions">
                            <Button
                                type="button"
                                variant="outlined"
                                color="inherit"
                                onClick={resetForm}
                                disabled={saving || !changed}
                            >
                                Reset
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={saving || !changed}
                                startIcon={
                                    <i
                                        className={`fa-solid ${
                                            saving
                                                ? "fa-spinner fa-spin"
                                                : "fa-check"
                                        }`}
                                    />
                                }
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>

            {/* ================== ACCOUNT SECURITY ================== */}
            <section className="spf-security">
                <span className="spf-security-icon">
                    <i className="fa-solid fa-lock" />
                </span>

                <div>
                    <h3>Password & Security</h3>

                    <p>
                        Need to change your password?
                        Open the account recovery page.
                        Password reset is currently a frontend preview.
                    </p>
                </div>

                <Button
                    component={Link}
                    to="/manage/forgot-password"
                    variant="outlined"
                    endIcon={
                        <i className="fa-solid fa-arrow-right" />
                    }
                >
                    Forgot Password
                </Button>
            </section>

        </div>
    );
}

export default ProfileForm;
