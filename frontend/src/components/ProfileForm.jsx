import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, TextField } from "@mui/material";
import { toast } from "react-toastify";

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const roleLabels = {
    admin: "Administrator",
    seller: "Seller",
    delivery: "Delivery Agent",
    delivery_agent: "Delivery Agent",
};

function getInitials(name) {
    return String(name || "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("") || "Z";
}

function ProfileForm({ user, onSave }) {
    const fileInputRef = useRef(null);

    const [name, setName] = useState(user?.name || "");
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [failedImage, setFailedImage] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const savedName = user?.name || "";
    const normalizedName = name.trim().replace(/\s+/g, " ");
    const displayName = normalizedName || savedName || "Staff Member";
    const currentImage = previewUrl || user?.avatar?.url || "";
    const role = roleLabels[user?.role] || "Staff Member";

    const changed =
        normalizedName !== savedName.trim().replace(/\s+/g, " ") ||
        Boolean(selectedImage);

    useEffect(() => {
        setName(user?.name || "");
    }, [user?.name]);

    useEffect(() => {
        if (!selectedImage) {
            setPreviewUrl("");
            return;
        }

        const url = URL.createObjectURL(selectedImage);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [selectedImage]);

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!IMAGE_TYPES.includes(file.type)) {
            toast.error("Upload a JPG, JPEG, PNG or WebP image.");
            return;
        }

        if (!file.size || file.size > MAX_IMAGE_SIZE) {
            toast.error("Image must be valid and 3 MB or smaller.");
            return;
        }

        setSelectedImage(file);
        setFailedImage("");
        setError("");
    };

    const resetForm = () => {
        setName(savedName);
        setSelectedImage(null);
        setFailedImage("");
        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (saving || !changed) return;

        if (normalizedName.length < 2 || normalizedName.length > 100) {
            setError("Full name must contain 2–100 characters.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            await onSave({
                name: normalizedName,
                pictureFile: selectedImage,
            });

            setSelectedImage(null);
            setName(normalizedName);
            toast.success("Profile updated successfully.");
        } catch (failure) {
            setError(failure.message || "Unable to update your profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="staff-profile">
            <section className="spf-hero">
                <div>
                    <span className="spf-eyebrow">
                        <i className="fa-solid fa-user-gear" aria-hidden="true" />
                        MY PROFILE
                    </span>
                    <p>Manage your profile information and account security.</p>
                </div>

                <span className="spf-hero-icon" aria-hidden="true">
                    <i className="fa-solid fa-id-card" />
                </span>
            </section>

            <div className="spf-grid">
                <aside className="spf-identity">
                    <div className="spf-identity-top">
                        <span className="spf-section-label">ACCOUNT IDENTITY</span>

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
                                <i className="fa-solid fa-camera" aria-hidden="true" />
                            </button>
                        </div>

                        <h2>{displayName}</h2>

                        <span className="spf-role">
                            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
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
                                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                <span title={selectedImage.name}>{selectedImage.name}</span>

                                <button
                                    type="button"
                                    aria-label="Remove selected image"
                                    onClick={() => setSelectedImage(null)}
                                    disabled={saving}
                                >
                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        <p className="spf-image-note">
                            JPG, JPEG, PNG or WebP
                            <span>Maximum image size: 3 MB</span>
                        </p>
                    </div>

                    <div className="spf-identity-bottom">
                        <i className="fa-solid fa-circle-info" aria-hidden="true" />
                        <p>Your saved name and picture appear across your account.</p>
                    </div>
                </aside>

                <section className="spf-details">
                    <div className="spf-card-header">
                        <span className="spf-card-icon">
                            <i className="fa-regular fa-id-card" aria-hidden="true" />
                        </span>
                        <div>
                            <h3>Personal Information</h3>
                            <p>Edit your name and review your registered contact details.</p>
                        </div>
                    </div>

                    <form className="spf-form" onSubmit={handleSubmit} noValidate>
                        <span className="spf-section-label">PROFILE DETAILS</span>

                        <div className="spf-fields">
                            <TextField
                                label="Full Name"
                                name="name"
                                value={name}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setError("");
                                }}
                                autoComplete="name"
                                size="small"
                                required
                                fullWidth
                                disabled={saving}
                                slotProps={{ htmlInput: { maxLength: 100 } }}
                            />

                            <TextField
                                label="Email Address"
                                value={user?.email || ""}
                                size="small"
                                fullWidth
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                        endAdornment: (
                                            <i className="fa-solid fa-lock spf-field-lock" aria-hidden="true" />
                                        ),
                                    },
                                }}
                            />

                            <TextField
                                label="Mobile Number"
                                value={user?.phone || ""}
                                size="small"
                                fullWidth
                                slotProps={{
                                    input: {
                                        readOnly: true,
                                        endAdornment: (
                                            <i className="fa-solid fa-lock spf-field-lock" aria-hidden="true" />
                                        ),
                                    },
                                }}
                            />
                        </div>

                        <div className="spf-readonly-note">
                            <i className="fa-solid fa-circle-info" aria-hidden="true" />
                            <p>Registered email and mobile number cannot be changed from this page.</p>
                        </div>

                        {error && (
                            <Alert severity="error" className="spf-error">
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
                                    <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"}`} />
                                }
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>

            <section className="spf-security">
                <span className="spf-security-icon">
                    <i className="fa-solid fa-lock" aria-hidden="true" />
                </span>

                <div>
                    <h3>Password & Security</h3>
                    <p>Use account recovery to verify your email and set a new password.</p>
                </div>

                <Button
                    component={Link}
                    to="/manage/forgot-password"
                    variant="outlined"
                    endIcon={<i className="fa-solid fa-arrow-right" />}
                >
                    Forgot Password
                </Button>
            </section>
        </div>
    );
}

export default ProfileForm;